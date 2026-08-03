import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { TransactionService } from '../../core/database/transaction.service';
import { TenantContext } from '../../core/decorators/tenant.decorator';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { PartyStatus, PotentialStatus, RecordStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class SupplierService {
  private readonly logger = new Logger(SupplierService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly txService: TransactionService,
  ) { }

  async create(dto: CreateSupplierDto, tenant: TenantContext) {
    // Backend Duplication Check (Company Name + Optional City)
    const existing = await this.prisma.supplier.findFirst({
      where: {
        company_id: tenant.companyId,
        name: { equals: dto.name, mode: 'insensitive' },
        ...(dto.city ? { city: { equals: dto.city, mode: 'insensitive' } } : {}),
        deleted_at: null,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Supplier "${dto.name}"${dto.city ? ` in city "${dto.city}"` : ''} already exists in Supabase DB.`,
      );
    }

    const { contacts, ...supplierData } = dto;

    const created = await this.prisma.supplier.create({
      data: {
        ...supplierData,
        company_id: tenant.companyId,
        branch_id: tenant.branchId,
        created_by: tenant.userId,
        contacts: contacts && contacts.length > 0 ? {
          create: contacts,
        } : undefined,
      },
      include: {
        contacts: true,
      },
    });

    await this.audit.record(
      {
        action: 'CREATE',
        entity: 'Supplier',
        entityId: created.id,
        after: created,
        description: `Created supplier "${created.name}"`,
      },
      tenant,
    );

    return created;
  }

  async findAll(tenant: TenantContext, query: any) {
    const {
      search,
      subTab,
      productCategory,
      keyStrengthSubcategory,
      country,
      province,
      city,
      supplierType,
      grade,
      currentStatus,
      status,
      potential,
      visitedFactory,
      onlyDuplicates,
      sortBy = 'created_at',
      sortOrder = 'desc',
      page = 1,
      limit = 100,
    } = query;

    const duplicateInfo = await this.findDuplicates(tenant);

    const where: any = {
      company_id: tenant.companyId,
      deleted_at: null,
    };

    if (subTab === 'Active') {
      where.status = RecordStatus.ACTIVE;
    } else if (subTab === 'Inactive') {
      where.status = RecordStatus.INACTIVE;
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { brand_description: { contains: term, mode: 'insensitive' } },
        { secondary_products_desc: { contains: term, mode: 'insensitive' } },
        { city: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (productCategory && productCategory !== 'All') {
      where.product_categories = { has: productCategory };
    }

    if (keyStrengthSubcategory && keyStrengthSubcategory !== 'All') {
      where.key_strength_subcategories = { has: keyStrengthSubcategory };
    }

    if (country && country !== 'All') where.country = country;
    if (province && province !== 'All') where.province = province;
    if (city && city !== 'All') where.city = city;
    if (supplierType && supplierType !== 'All') {
      where.supplier_type = supplierType.toUpperCase() === 'TRADER' ? 'TRADER' : 'MANUFACTURER';
    }
    if (grade && grade !== 'All') where.grade = grade;
    if (currentStatus && currentStatus !== 'All') where.current_status = currentStatus;
    if (status && status !== 'All') where.status = status;
    if (potential && potential !== 'All') where.potential = potential;
    if (visitedFactory !== undefined && visitedFactory !== 'All') {
      where.visited_factory = String(visitedFactory).toLowerCase() === 'true' || String(visitedFactory).toLowerCase() === 'yes';
    }

    if (onlyDuplicates === 'true' || onlyDuplicates === true) {
      where.id = { in: duplicateInfo.duplicateIds };
    }

    // Dynamic OrderBy
    let orderBy: any = { created_at: sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc' };
    if (sortBy === 'name') orderBy = { name: sortOrder };
    else if (sortBy === 'country') orderBy = { country: sortOrder };
    else if (sortBy === 'province') orderBy = { province: sortOrder };
    else if (sortBy === 'city') orderBy = { city: sortOrder };
    else if (sortBy === 'grade') orderBy = { grade: sortOrder };
    else if (sortBy === 'current_status') orderBy = { current_status: sortOrder };

    const takeVal = Number(limit) > 0 ? Number(limit) : 100;
    const pageVal = Number(page) > 0 ? Number(page) : 1;
    const skip = (pageVal - 1) * takeVal;

    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip,
        take: takeVal,
        orderBy,
        include: {
          contacts: true,
        },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return {
      data,
      total,
      page: pageVal,
      limit: takeVal,
      totalPages: Math.ceil(total / takeVal),
      totalDuplicates: duplicateInfo.totalDuplicates,
      duplicateIds: duplicateInfo.duplicateIds,
      duplicateGroups: duplicateInfo.duplicateGroups,
    };
  }

  async findDuplicates(tenant: TenantContext) {
    const suppliers = await this.prisma.supplier.findMany({
      where: { company_id: tenant.companyId, deleted_at: null },
      select: { id: true, name: true, tax_id: true, country: true, city: true }
    });

    const nameMap = new Map<string, string[]>();
    const taxMap = new Map<string, string[]>();

    for (const s of suppliers) {
      const normName = s.name.trim().toLowerCase();
      if (!nameMap.has(normName)) nameMap.set(normName, []);
      nameMap.get(normName)!.push(s.id);

      if (s.tax_id && s.tax_id.trim()) {
        const normTax = s.tax_id.trim().toLowerCase();
        if (!taxMap.has(normTax)) taxMap.set(normTax, []);
        taxMap.get(normTax)!.push(s.id);
      }
    }

    const duplicateGroups: { reason: string; key: string; ids: string[] }[] = [];
    const allDuplicateIds = new Set<string>();

    for (const [name, ids] of nameMap.entries()) {
      if (ids.length > 1) {
        duplicateGroups.push({ reason: 'Duplicate Name', key: name, ids });
        ids.forEach(id => allDuplicateIds.add(id));
      }
    }

    for (const [taxId, ids] of taxMap.entries()) {
      if (ids.length > 1) {
        duplicateGroups.push({ reason: 'Duplicate Tax ID', key: taxId, ids });
        ids.forEach(id => allDuplicateIds.add(id));
      }
    }

    return {
      totalDuplicates: allDuplicateIds.size,
      duplicateGroups,
      duplicateIds: Array.from(allDuplicateIds),
    };
  }

  async mergeSuppliers(tenant: TenantContext, dto: { targetId: string; sourceIds: string[] }) {
    const { targetId, sourceIds } = dto;
    if (!targetId || !sourceIds || sourceIds.length === 0) {
      throw new BadRequestException('Target ID and at least one Source ID are required.');
    }

    const validSourceIds = Array.from(new Set(sourceIds.filter((id) => id !== targetId)));
    if (validSourceIds.length === 0) {
      throw new BadRequestException('No valid source IDs to merge.');
    }

    return this.txService.run(async (tx) => {
      const target = await tx.supplier.findFirst({
        where: { id: targetId, company_id: tenant.companyId, deleted_at: null },
        include: { contacts: true },
      });
      if (!target) throw new NotFoundException(`Target supplier ${targetId} not found.`);

      const sources = await tx.supplier.findMany({
        where: { id: { in: validSourceIds }, company_id: tenant.companyId, deleted_at: null },
        include: { contacts: true },
      });

      const allCategories = Array.from(
        new Set([...(target.product_categories || []), ...sources.flatMap((s) => s.product_categories || [])]),
      );
      const allSubcategories = Array.from(
        new Set([
          ...(target.key_strength_subcategories || []),
          ...sources.flatMap((s) => s.key_strength_subcategories || []),
        ]),
      );
      const allEmails = Array.from(
        new Set([...(target.emails || []), ...sources.flatMap((s) => s.emails || [])]),
      );

      for (const source of sources) {
        if (source.contacts && source.contacts.length > 0) {
          await tx.supplierContact.updateMany({
            where: { supplier_id: source.id },
            data: { supplier_id: targetId },
          });
        }
        await tx.supplier.update({
          where: { id: source.id },
          data: { deleted_at: new Date(), updated_by: tenant.userId },
        });
      }

      const updatedTarget = await tx.supplier.update({
        where: { id: targetId },
        data: {
          product_categories: allCategories,
          key_strength_subcategories: allSubcategories,
          emails: allEmails,
          updated_by: tenant.userId,
        },
        include: { contacts: true },
      });

      await this.audit.record(
        {
          action: 'MERGE',
          entity: 'Supplier',
          entityId: targetId,
          before: target,
          after: updatedTarget,
          description: `Merged ${sources.length} supplier(s) into "${target.name}"`,
        },
        tenant,
        tx,
      );

      return updatedTarget;
    });
  }

  async findOne(id: string, tenant: TenantContext) {
    const supplier = await this.prisma.supplier.findFirst({
      where: {
        id,
        company_id: tenant.companyId,
        deleted_at: null,
      },
      include: {
        contacts: true,
      },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found.`);
    }

    return supplier;
  }

  async updateStatus(id: string, newStatus: PartyStatus, tenant: TenantContext) {
    const supplier = await this.findOne(id, tenant);

    // Business Rule Enforcement: Status can ONLY transition ONE-WAY from NEW -> EXISTING
    if (supplier.current_status === PartyStatus.EXISTING && newStatus === PartyStatus.NEW) {
      throw new BadRequestException(
        'Invalid Status Transition: Supplier status cannot be changed back from "EXISTING" to "NEW". (One-way rule enforced)',
      );
    }

    const updated = await this.prisma.supplier.update({
      where: { id },
      data: {
        current_status: newStatus,
        updated_by: tenant.userId,
      },
    });

    await this.audit.record(
      {
        action: 'STATUS_CHANGE',
        entity: 'Supplier',
        entityId: id,
        before: { current_status: supplier.current_status },
        after: { current_status: updated.current_status },
        description: `Changed supplier "${updated.name}" status from ${supplier.current_status} to ${updated.current_status}`,
      },
      tenant,
    );

    return updated;
  }

  async updateGradeOrPotential(id: string, dto: { grade?: any; potential?: any }, tenant: TenantContext) {
    const existing = await this.findOne(id, tenant);

    const updated = await this.prisma.supplier.update({
      where: { id },
      data: {
        ...dto,
        updated_by: tenant.userId,
      },
    });

    await this.audit.record(
      {
        action: 'UPDATE',
        entity: 'Supplier',
        entityId: id,
        before: { grade: existing.grade, potential: existing.potential },
        after: { grade: updated.grade, potential: updated.potential },
        description: `Updated grade/potential for supplier "${updated.name}"`,
      },
      tenant,
    );

    return updated;
  }

  /**
   * Evaluates whether a supplier meets the mandatory deletion conditions
   * (Current Status = NEW, Potential = NO/unselected). Returns the list of
   * human-readable blocking reasons — empty array means deletable.
   * Shared by both the single `remove()` and `bulkRemove()` paths so the
   * rule can never drift between them.
   */
  private getDeleteBlockingReasons(supplier: { current_status: PartyStatus; potential: PotentialStatus }): string[] {
    const isStatusNew = supplier.current_status === PartyStatus.NEW;
    const isPotentialNo = supplier.potential === PotentialStatus.NO || supplier.potential === PotentialStatus.UNSELECTED;

    const blockingReasons: string[] = [];

    if (!isStatusNew) {
      blockingReasons.push(`Current Status is "${supplier.current_status}" (Deletion requires status to be "NEW").`);
    }

    if (!isPotentialNo) {
      blockingReasons.push(`Potential is set to "${supplier.potential}" (Deletion requires Potential to be "NO" or unselected).`);
    }

    return blockingReasons;
  }

  async remove(id: string, tenant: TenantContext) {
    const supplier = await this.findOne(id, tenant);
    const blockingReasons = this.getDeleteBlockingReasons(supplier);

    if (blockingReasons.length > 0) {
      throw new BadRequestException(
        `Cannot delete Supplier "${supplier.name}". Mandatory conditions required to delete:\n• ` +
        blockingReasons.join('\n• ') +
        '\n\nRecommended Action: Set Current Status to "INACTIVE" to prevent new transactions.',
      );
    }

    // Perform Soft Delete
    const deleted = await this.prisma.supplier.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        updated_by: tenant.userId,
      },
    });

    await this.audit.record(
      {
        action: 'DELETE',
        entity: 'Supplier',
        entityId: id,
        before: supplier,
        description: `Deleted supplier "${supplier.name}"`,
      },
      tenant,
    );

    return deleted;
  }

  /**
   * Bulk delete for the "Delete Selected" list action.
   *
   * Every id is evaluated against the exact same rule as the single-row
   * delete (`getDeleteBlockingReasons`) — bulk delete must never be a way
   * to bypass a rule the single-row Delete button enforces.
   *
   * - Without `force`: only records that pass the rule are soft-deleted.
   *   Every record that fails is reported back (not deleted) so the
   *   frontend can show the person exactly which ones were skipped and why.
   * - With `force: true`, the ids in `forceIds` (a subset of the original
   *   selection — normally "the ones that were blocked") are deleted
   *   anyway, after the person has explicitly confirmed that override in
   *   the UI. Ids not in `forceIds` still go through the normal rule.
   */
  async bulkRemove(
    ids: string[],
    tenant: TenantContext,
    options?: { force?: boolean; forceIds?: string[] },
  ) {
    const uniqueIds = Array.from(new Set(ids));
    const suppliers = await this.prisma.supplier.findMany({
      where: {
        id: { in: uniqueIds },
        company_id: tenant.companyId,
        deleted_at: null,
      },
    });

    const foundIds = new Set(suppliers.map((s) => s.id));
    const forceSet = new Set(options?.forceIds || []);

    const deleted: { id: string; name: string }[] = [];
    const blocked: { id: string; name: string; reasons: string[] }[] = [];
    const notFound = uniqueIds.filter((id) => !foundIds.has(id));

    return this.txService.run(async (tx) => {
      for (const supplier of suppliers) {
        const blockingReasons = this.getDeleteBlockingReasons(supplier);
        const isForced = options?.force && forceSet.has(supplier.id);

        if (blockingReasons.length > 0 && !isForced) {
          blocked.push({ id: supplier.id, name: supplier.name, reasons: blockingReasons });
          continue;
        }

        await tx.supplier.update({
          where: { id: supplier.id },
          data: { deleted_at: new Date(), updated_by: tenant.userId },
        });

        await this.audit.record(
          {
            action: 'DELETE',
            entity: 'Supplier',
            entityId: supplier.id,
            before: supplier,
            description: isForced
              ? `Force-deleted supplier "${supplier.name}" (bulk delete, rule override confirmed by user)`
              : `Deleted supplier "${supplier.name}" (bulk delete)`,
          },
          tenant,
          tx,
        );

        deleted.push({ id: supplier.id, name: supplier.name });
      }

      return { deleted, blocked, notFound };
    });
  }

  async toggleActiveStatus(id: string, tenant: TenantContext) {
    const supplier = await this.findOne(id, tenant);
    const newStatus = supplier.status === RecordStatus.ACTIVE ? RecordStatus.INACTIVE : RecordStatus.ACTIVE;

    const updated = await this.prisma.supplier.update({
      where: { id },
      data: {
        status: newStatus,
        updated_by: tenant.userId,
      },
    });

    await this.audit.record(
      {
        action: 'STATUS_CHANGE',
        entity: 'Supplier',
        entityId: id,
        before: { status: supplier.status },
        after: { status: updated.status },
        description: `Toggled active status for supplier "${updated.name}" from ${supplier.status} to ${updated.status}`,
      },
      tenant,
    );

    return updated;
  }
}