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
      buyerType,
      currentStatus,
      productCategory,
      potentialSubcategory,
      country,
      potential,
      clientGrade,
      page = 1,
      limit = 1000000,
    } = query;

    const where: any = {
      company_id: tenant.companyId,
      deleted_at: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { product_range_supplied: { contains: search, mode: 'insensitive' } },
        { currently_buying_from: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (buyerType) where.buyer_type = buyerType;
    if (currentStatus) where.current_status = currentStatus;
    if (country) where.country = country;
    if (potential) where.potential = potential;
    if (clientGrade) where.client_grade = clientGrade;

    if (productCategory) {
      where.product_categories = { has: productCategory };
    }

    if (potentialSubcategory) {
      where.potential_subcategories = { has: potentialSubcategory };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [data, total] = await Promise.all([
      this.prisma.buyer.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
        include: {
          contacts: true,
        },
      }),
      this.prisma.buyer.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / take),
      },
    };
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
        emails: dto.emails,
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
      },
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