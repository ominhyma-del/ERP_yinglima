import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { TransactionService } from '../../core/database/transaction.service';
import { TenantContext } from '../../core/decorators/tenant.decorator';
import { CreateBuyerDto } from './dto/create-buyer.dto';
import { PartyStatus, PotentialStatus, RecordStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class BuyerService {
  private readonly logger = new Logger(BuyerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly txService: TransactionService,
  ) { }

  async create(dto: CreateBuyerDto, tenant: TenantContext) {
    // Backend Duplication Check: Company Name or Primary Contact Phone
    const primaryContact = dto.contacts && dto.contacts[0];
    const existing = await this.prisma.buyer.findFirst({
      where: {
        company_id: tenant.companyId,
        deleted_at: null,
        OR: [
          { name: { equals: dto.name, mode: 'insensitive' } },
          ...(primaryContact?.calling_number
            ? [{ contacts: { some: { calling_number: primaryContact.calling_number } } }]
            : []),
          ...(primaryContact?.whatsapp_number
            ? [{ contacts: { some: { whatsapp_number: primaryContact.whatsapp_number } } }]
            : []),
        ],

      },
    });

    if (existing) {
      throw new BadRequestException(
        `Buyer company "${dto.name}" or matching contact phone already exists in Supabase DB.`,
      );
    }

    const { contacts, ...buyerData } = dto;

    const created = await this.prisma.buyer.create({
      data: {
        ...buyerData,
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
        entity: 'Buyer',
        entityId: created.id,
        after: created,
        description: `Created buyer "${created.name}"`,
      },
      tenant,
    );

    return created;
  }

  async findAll(tenant: TenantContext, query: any) {
    const {
      search,
      subTab,
      buyerType,
      currentStatus,
      status,
      productCategory,
      potentialSubcategory,
      country,
      city,
      potential,
      clientGrade,
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
        { product_range_supplied: { contains: term, mode: 'insensitive' } },
        { currently_buying_from: { contains: term, mode: 'insensitive' } },
        { city: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (buyerType && buyerType !== 'All') {
      where.buyer_type = buyerType.toUpperCase() === 'TRADER' ? 'TRADER' : 'MANUFACTURER';
    }
    if (currentStatus && currentStatus !== 'All') where.current_status = currentStatus;
    if (status && status !== 'All') where.status = status;
    if (country && country !== 'All') where.country = country;
    if (city && city !== 'All') where.city = city;
    if (potential && potential !== 'All') where.potential = potential;
    if (clientGrade && clientGrade !== 'All') where.client_grade = clientGrade;

    if (productCategory && productCategory !== 'All') {
      where.product_categories = { has: productCategory };
    }

    if (potentialSubcategory && potentialSubcategory !== 'All') {
      where.potential_subcategories = { has: potentialSubcategory };
    }

    if (onlyDuplicates === 'true' || onlyDuplicates === true) {
      where.id = { in: duplicateInfo.duplicateIds };
    }

    // Dynamic OrderBy
    let orderBy: any = { created_at: sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc' };
    if (sortBy === 'name') orderBy = { name: sortOrder };
    else if (sortBy === 'country') orderBy = { country: sortOrder };
    else if (sortBy === 'city') orderBy = { city: sortOrder };
    else if (sortBy === 'clientGrade') orderBy = { client_grade: sortOrder };
    else if (sortBy === 'currentStatus') orderBy = { current_status: sortOrder };

    const takeVal = Number(limit) > 0 ? Number(limit) : 100;
    const pageVal = Number(page) > 0 ? Number(page) : 1;
    const skip = (pageVal - 1) * takeVal;

    const [data, total] = await Promise.all([
      this.prisma.buyer.findMany({
        where,
        skip,
        take: takeVal,
        orderBy,
        include: {
          contacts: true,
        },
      }),
      this.prisma.buyer.count({ where }),
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
    const buyers = await this.prisma.buyer.findMany({
      where: { company_id: tenant.companyId, deleted_at: null },
      select: { id: true, name: true, tax_id: true, country: true, city: true }
    });

    const nameMap = new Map<string, string[]>();
    const taxMap = new Map<string, string[]>();

    for (const b of buyers) {
      const normName = b.name.trim().toLowerCase();
      if (!nameMap.has(normName)) nameMap.set(normName, []);
      nameMap.get(normName)!.push(b.id);

      if (b.tax_id && b.tax_id.trim()) {
        const normTax = b.tax_id.trim().toLowerCase();
        if (!taxMap.has(normTax)) taxMap.set(normTax, []);
        taxMap.get(normTax)!.push(b.id);
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

  async mergeBuyers(tenant: TenantContext, dto: { targetId: string; sourceIds: string[] }) {
    const { targetId, sourceIds } = dto;
    if (!targetId || !sourceIds || sourceIds.length === 0) {
      throw new BadRequestException('Target ID and at least one Source ID are required.');
    }

    const validSourceIds = Array.from(new Set(sourceIds.filter((id) => id !== targetId)));
    if (validSourceIds.length === 0) {
      throw new BadRequestException('No valid source IDs to merge.');
    }

    return this.txService.run(async (tx) => {
      const target = await tx.buyer.findFirst({
        where: { id: targetId, company_id: tenant.companyId, deleted_at: null },
        include: { contacts: true },
      });
      if (!target) throw new NotFoundException(`Target buyer ${targetId} not found.`);

      const sources = await tx.buyer.findMany({
        where: { id: { in: validSourceIds }, company_id: tenant.companyId, deleted_at: null },
        include: { contacts: true },
      });

      const allCategories = Array.from(
        new Set([...(target.product_categories || []), ...sources.flatMap((s) => s.product_categories || [])]),
      );
      const allSubcategories = Array.from(
        new Set([
          ...(target.potential_subcategories || []),
          ...sources.flatMap((s) => s.potential_subcategories || []),
        ]),
      );
      const allEmails = Array.from(
        new Set([...((target as any).emails || []), ...sources.flatMap((s: any) => s.emails || [])]),
      );

      for (const source of sources) {
        if (source.contacts && source.contacts.length > 0) {
          await tx.buyerContact.updateMany({
            where: { buyer_id: source.id },
            data: { buyer_id: targetId },
          });
        }
        await tx.buyer.update({
          where: { id: source.id },
          data: { deleted_at: new Date(), updated_by: tenant.userId },
        });
      }

      const updatedTarget = await tx.buyer.update({
        where: { id: targetId },
        data: {
          product_categories: allCategories,
          potential_subcategories: allSubcategories,
          emails: allEmails,
          updated_by: tenant.userId,
        } as any,
        include: { contacts: true },
      });



      await this.audit.record(
        {
          action: 'MERGE',
          entity: 'Buyer',
          entityId: targetId,
          before: target,
          after: updatedTarget,
          description: `Merged ${sources.length} buyer(s) into "${target.name}"`,
        },
        tenant,
        tx,
      );

      return updatedTarget;
    });
  }

  async findOne(id: string, tenant: TenantContext) {
    const buyer = await this.prisma.buyer.findFirst({
      where: {
        id,
        company_id: tenant.companyId,
        deleted_at: null,
      },
      include: {
        contacts: true,
      },
    });

    if (!buyer) {
      throw new NotFoundException(`Buyer with ID ${id} not found.`);
    }

    return buyer;
  }

  async update(id: string, dto: CreateBuyerDto, tenant: TenantContext) {
    const existing = await this.findOne(id, tenant);

    // Business Rule Enforcement: Status can ONLY transition ONE-WAY from NEW -> EXISTING
    if (existing.current_status === PartyStatus.EXISTING && dto.current_status === PartyStatus.NEW) {
      throw new BadRequestException(
        'Invalid Status Transition: Buyer status cannot be changed back from "EXISTING" to "NEW". (One-way rule enforced)',
      );
    }

    // Delete existing contacts and recreate with updated payload if provided
    if (dto.contacts && dto.contacts.length > 0) {
      await this.prisma.buyerContact.deleteMany({
        where: { buyer_id: id },
      });
    }

    const updated = await this.prisma.buyer.update({
      where: { id },
      data: {
        name: dto.name,
        buyer_type: dto.buyer_type,
        country: dto.country,
        city: dto.city,
        address: dto.address,
        tax_id: dto.tax_id,
        website: dto.website,
        emails: (dto as any).emails,
        client_grade: dto.client_grade,
        current_status: dto.current_status,
        product_range_supplied: dto.product_range_supplied,
        potential: dto.potential,
        potential_reason: dto.potential_reason,
        currently_buying_from: dto.currently_buying_from,
        overall_remarks: dto.overall_remarks,
        product_categories: dto.product_categories,
        potential_subcategories: dto.potential_subcategories,
        updated_by: tenant.userId,
        contacts: dto.contacts && dto.contacts.length > 0 ? {
          create: dto.contacts.map((c) => ({
            salutation: c.salutation,
            full_name: c.full_name,
            designation: c.designation,
            country: c.country || dto.country || 'Uganda',
            calling_number: c.calling_number,
            whatsapp_number: c.whatsapp_number,
            email: c.email,
          })),
        } : undefined,
      } as any,
      include: {

        contacts: true,
      },
    });

    await this.audit.record(
      {
        action: 'UPDATE',
        entity: 'Buyer',
        entityId: id,
        before: existing,
        after: updated,
        description: `Updated buyer "${updated.name}"`,
      },
      tenant,
    );

    return updated;
  }

  async updateStatus(id: string, newStatus: PartyStatus, tenant: TenantContext) {
    const buyer = await this.findOne(id, tenant);

    // Business Rule Enforcement: Status can ONLY transition ONE-WAY from NEW -> EXISTING
    if (buyer.current_status === PartyStatus.EXISTING && newStatus === PartyStatus.NEW) {
      throw new BadRequestException(
        'Invalid Status Transition: Buyer status cannot be changed back from "EXISTING" to "NEW". (One-way rule enforced)',
      );
    }

    const updated = await this.prisma.buyer.update({
      where: { id },
      data: {
        current_status: newStatus,
        updated_by: tenant.userId,
      },
    });

    await this.audit.record(
      {
        action: 'STATUS_CHANGE',
        entity: 'Buyer',
        entityId: id,
        before: { current_status: buyer.current_status },
        after: { current_status: updated.current_status },
        description: `Changed buyer "${updated.name}" status from ${buyer.current_status} to ${updated.current_status}`,
      },
      tenant,
    );

    return updated;
  }

  /**
   * Evaluates whether a buyer meets the mandatory deletion conditions
   * (Current Status = NEW, Potential = NO/unselected). Returns the list of
   * human-readable blocking reasons — empty array means deletable.
   * Shared by both `remove()` and `bulkRemove()` so the rule never drifts
   * between the single-row and bulk delete paths.
   */
  private getDeleteBlockingReasons(buyer: { current_status: PartyStatus; potential: PotentialStatus }): string[] {
    const isStatusNewOrUnselected = buyer.current_status === PartyStatus.NEW;
    const isPotentialNoOrUnselected = buyer.potential === PotentialStatus.NO || buyer.potential === PotentialStatus.UNSELECTED;

    const blockingReasons: string[] = [];
    if (!isStatusNewOrUnselected) {
      blockingReasons.push(`Current Status is "${buyer.current_status}" (Deletion requires status to be "NEW").`);
    }
    if (!isPotentialNoOrUnselected) {
      blockingReasons.push(`Potential is set to "${buyer.potential}" (Deletion requires Potential to be "NO" or unselected).`);
    }
    return blockingReasons;
  }

  async remove(id: string, tenant: TenantContext) {
    const buyer = await this.findOne(id, tenant);
    const blockingReasons = this.getDeleteBlockingReasons(buyer);

    if (blockingReasons.length > 0) {
      throw new BadRequestException(
        `Cannot delete Buyer "${buyer.name}". Mandatory conditions required to delete:\n• ` +
        blockingReasons.join('\n• ') +
        '\n\nRecommended Action: Set Current Status to "INACTIVE" to prevent new transactions.',
      );
    }

    const deleted = await this.prisma.buyer.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        updated_by: tenant.userId,
      },
    });

    await this.audit.record(
      {
        action: 'DELETE',
        entity: 'Buyer',
        entityId: id,
        before: buyer,
        description: `Deleted buyer "${buyer.name}"`,
      },
      tenant,
    );

    return deleted;
  }

  /**
   * Bulk delete for the "Delete Selected" list action. Mirrors
   * SupplierService.bulkRemove: every id goes through the same rule as
   * the single-row delete; failures are reported back instead of
   * silently skipped or silently allowed. `force`/`forceIds` lets the
   * frontend re-submit an explicit user-confirmed override for specific
   * blocked records (see the "Skip Blocked / Force Delete" popup).
   */
  async bulkRemove(
    ids: string[],
    tenant: TenantContext,
    options?: { force?: boolean; forceIds?: string[] },
  ) {
    const uniqueIds = Array.from(new Set(ids));
    const buyers = await this.prisma.buyer.findMany({
      where: {
        id: { in: uniqueIds },
        company_id: tenant.companyId,
        deleted_at: null,
      },
    });

    const foundIds = new Set(buyers.map((b) => b.id));
    const forceSet = new Set(options?.forceIds || []);

    const deleted: { id: string; name: string }[] = [];
    const blocked: { id: string; name: string; reasons: string[] }[] = [];
    const notFound = uniqueIds.filter((id) => !foundIds.has(id));

    return this.txService.run(async (tx) => {
      for (const buyer of buyers) {
        const blockingReasons = this.getDeleteBlockingReasons(buyer);
        const isForced = options?.force && forceSet.has(buyer.id);

        if (blockingReasons.length > 0 && !isForced) {
          blocked.push({ id: buyer.id, name: buyer.name, reasons: blockingReasons });
          continue;
        }

        await tx.buyer.update({
          where: { id: buyer.id },
          data: { deleted_at: new Date(), updated_by: tenant.userId },
        });

        await this.audit.record(
          {
            action: 'DELETE',
            entity: 'Buyer',
            entityId: buyer.id,
            before: buyer,
            description: isForced
              ? `Force-deleted buyer "${buyer.name}" (bulk delete, rule override confirmed by user)`
              : `Deleted buyer "${buyer.name}" (bulk delete)`,
          },
          tenant,
          tx,
        );

        deleted.push({ id: buyer.id, name: buyer.name });
      }

      return { deleted, blocked, notFound };
    });
  }
}