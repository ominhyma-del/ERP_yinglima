import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { TransactionService } from '../../core/database/transaction.service';
import { TenantContext } from '../../core/decorators/tenant.decorator';
import { CreateInquiryItemDto, BulkShiftItemsDto, BulkTallyPostDto } from './dto/create-inquiry-item.dto';
import { InquiryItemStatus, InquiryStatus, TallyPostStatus, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class InquiryService {
  private readonly logger = new Logger(InquiryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly txService: TransactionService,
    private readonly audit: AuditService,
  ) { }

  // =========================================================================
  // LAYER 1: Company & Consignment Summary Overview
  // =========================================================================
  async getLayer1Summary(tenant: TenantContext) {
    const consignments = await this.prisma.inquiryConsignment.findMany({
      where: {
        company_id: tenant.companyId,
        deleted_at: null,
      },
      orderBy: { consignment_code: 'asc' },
      include: {
        company: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { items: true },
        },
      },
    });

    return consignments;
  }

  // =========================================================================
  // LAYER 2: Consignment Item Grid (Excel-like planning view)
  // =========================================================================
  async getLayer2Grid(consignmentCode: string, tenant: TenantContext) {
    const consignment = await this.prisma.inquiryConsignment.findFirst({
      where: {
        company_id: tenant.companyId,
        consignment_code: consignmentCode,
        deleted_at: null,
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
                subcategory: true,
                brand: true,
              },
            },
          },
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!consignment) {
      throw new NotFoundException(`Consignment code "${consignmentCode}" not found.`);
    }

    return consignment;
  }

  async addItem(dto: CreateInquiryItemDto, tenant: TenantContext) {
    // 1. Resolve Product from DB (by ID, Code, Name, or Fallback for Tenant)
    let product: any = null;

    if (dto.product_id) {
      product = await this.prisma.product.findFirst({
        where: { id: dto.product_id, company_id: tenant.companyId, deleted_at: null },
      });
    }

    if (!product && dto.product_code) {
      product = await this.prisma.product.findFirst({
        where: { product_code: dto.product_code, company_id: tenant.companyId, deleted_at: null },
      });
    }

    if (!product && dto.product_name) {
      product = await this.prisma.product.findFirst({
        where: {
          name_tally: { contains: dto.product_name, mode: 'insensitive' },
          company_id: tenant.companyId,
          deleted_at: null,
        },
      });
    }

    if (!product) {
      product = await this.prisma.product.findFirst({
        where: { company_id: tenant.companyId, deleted_at: null },
      });
    }

    if (!product) {
      let defaultCategory = await this.prisma.productCategory.findFirst({
        where: { company_id: tenant.companyId },
      });
      if (!defaultCategory) {
        defaultCategory = await this.prisma.productCategory.create({
          data: {
            company_id: tenant.companyId,
            name: 'General',
            created_by: tenant.userId,
          },
        });
      }

      let defaultSubCategory = await this.prisma.productSubCategory.findFirst({
        where: { category_id: defaultCategory.id },
      });
      if (!defaultSubCategory) {
        defaultSubCategory = await this.prisma.productSubCategory.create({
          data: {
            company_id: tenant.companyId,
            category_id: defaultCategory.id,
            name: 'General',
            created_by: tenant.userId,
          },
        });
      }

      product = await this.prisma.product.create({
        data: {
          company_id: tenant.companyId,
          branch_id: tenant.branchId || undefined,
          category_id: defaultCategory.id,
          subcategory_id: defaultSubCategory.id,
          name_tally: dto.product_name || 'Standard Inquiry Product',
          name_invoice: dto.product_name || 'Standard Inquiry Product',
          product_code: dto.product_code || `PRD-${Date.now().toString().slice(-6)}`,
          uom: 'PCS',
          hsn_code: '84223000',
          created_by: tenant.userId,
        },
      });
    }

    // 2. License Required Highlight Detection
    const hasLicenseWarning = !!(product.license_required_info && product.license_required_info.trim().length > 0);

    // 3. Find or Create Consignment Header
    let consignment = await this.prisma.inquiryConsignment.findFirst({
      where: {
        company_id: tenant.companyId,
        consignment_code: dto.consignment_code,
        deleted_at: null,
      },
    });

    if (!consignment) {
      consignment = await this.prisma.inquiryConsignment.create({
        data: {
          company_id: tenant.companyId,
          branch_id: tenant.branchId,
          consignment_code: dto.consignment_code,
          created_by: tenant.userId,
        },
      });
    }

    // 3.5. Backend Duplication Check (Item product in same consignment)
    const existingItem = await this.prisma.inquiryItem.findFirst({
      where: {
        consignment_id: consignment.id,
        product_id: product.id,
      },
    });

    if (existingItem) {
      throw new BadRequestException(
        `Inquiry item "${product.name_tally}" already exists under consignment "${dto.consignment_code}" in Supabase DB.`,
      );
    }

    // 4. Create Inquiry Line Item
    const item = await this.prisma.inquiryItem.create({
      data: {
        consignment_id: consignment.id,
        product_id: product.id,
        quantity: dto.quantity,
        uom: product.uom,
        brand_preference: dto.brand_preference,
        product_specs: dto.product_specs,
        procurement_remarks: dto.procurement_remarks,
        license_warning_flag: hasLicenseWarning,
        proposed_by: tenant.userId,
        proposed_at: new Date(),
      },
    });

    // 5. Recalculate Consignment Totals
    await this.recalculateConsignmentTotals(consignment.id);

    await this.audit.record(
      {
        action: 'CREATE',
        entity: 'InquiryItem',
        entityId: item.id,
        after: item,
        description: `Added item (qty ${item.quantity}) to consignment "${consignment.consignment_code}"`,
      },
      tenant,
    );

    return item;
  }

  async updateItemQuantity(itemId: string, quantity: number, tenant: TenantContext) {
    const item = await this.prisma.inquiryItem.findUnique({
      where: { id: itemId },
      include: { consignment: true },
    });

    if (!item || item.consignment.company_id !== tenant.companyId) {
      throw new NotFoundException(`Inquiry item ${itemId} not found.`);
    }

    const updated = await this.prisma.inquiryItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    await this.recalculateConsignmentTotals(item.consignment_id);

    await this.audit.record(
      {
        action: 'UPDATE',
        entity: 'InquiryItem',
        entityId: itemId,
        before: { quantity: item.quantity },
        after: { quantity: updated.quantity },
        description: `Changed inquiry item quantity from ${item.quantity} to ${updated.quantity}`,
      },
      tenant,
    );

    return updated;
  }

  async bulkShiftItems(dto: BulkShiftItemsDto, tenant: TenantContext) {
    // Target Consignment Header
    let targetConsignment = await this.prisma.inquiryConsignment.findFirst({
      where: {
        company_id: tenant.companyId,
        consignment_code: dto.target_consignment_code,
        deleted_at: null,
      },
    });

    if (!targetConsignment) {
      targetConsignment = await this.prisma.inquiryConsignment.create({
        data: {
          company_id: tenant.companyId,
          branch_id: tenant.branchId,
          consignment_code: dto.target_consignment_code,
          created_by: tenant.userId,
        },
      });
    }

    // Shift items (scoped to tenant company)
    await this.prisma.inquiryItem.updateMany({
      where: {
        id: { in: dto.item_ids },
        consignment: {
          company_id: tenant.companyId,
        },
      },
      data: {
        consignment_id: targetConsignment.id,
      },
    });

    await this.recalculateConsignmentTotals(targetConsignment.id);

    await this.audit.record(
      {
        action: 'BULK_SHIFT',
        entity: 'InquiryItem',
        entityId: targetConsignment.id,
        after: { item_ids: dto.item_ids, target_consignment_code: dto.target_consignment_code },
        description: `Shifted ${dto.item_ids.length} item(s) to consignment "${dto.target_consignment_code}"`,
      },
      tenant,
    );

    return { message: `Shifted ${dto.item_ids.length} items to consignment ${dto.target_consignment_code}` };
  }

  async bulkTallyPost(dto: BulkTallyPostDto, tenant: TenantContext) {
    await this.prisma.inquiryItem.updateMany({
      where: {
        id: { in: dto.item_ids },
        consignment: {
          company_id: tenant.companyId,
        },
      },
      data: {
        tally_post_status: TallyPostStatus.POSTED,
      },
    });

    await this.audit.record(
      {
        action: 'BULK_TALLY_POST',
        entity: 'InquiryItem',
        entityId: dto.item_ids[0] || '00000000-0000-0000-0000-000000000000',
        after: { item_ids: dto.item_ids, tally_post_status: 'POSTED' },
        description: `Marked ${dto.item_ids.length} item(s) as Tally Posted`,
      },
      tenant,
    );

    return { message: `Successfully updated Tally Post Status to POSTED for ${dto.item_ids.length} items.` };
  }

  async approveItem(itemId: string, tenant: TenantContext) {
    const existing = await this.prisma.inquiryItem.findFirst({
      where: {
        id: itemId,
        consignment: {
          company_id: tenant.companyId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Inquiry item ${itemId} not found.`);
    }

    const item = await this.prisma.inquiryItem.update({
      where: { id: itemId },
      data: {
        item_status: InquiryItemStatus.APPROVED,
        approved_by: tenant.userId,
        approved_at: new Date(),
      },
    });

    await this.updateConsignmentAggregateStatus(item.consignment_id);

    await this.audit.record(
      {
        action: 'APPROVE',
        entity: 'InquiryItem',
        entityId: itemId,
        before: { item_status: existing.item_status },
        after: { item_status: item.item_status },
        description: `Approved inquiry item ${itemId}`,
      },
      tenant,
    );

    return item;
  }

  /**
   * Delete-eligibility rule for a single inquiry item: an item that has
   * already been Approved or posted to Tally represents committed
   * business data (it may already be reflected in accounting), so it is
   * NOT safe to silently delete like a still-Proposed line. Returns the
   * blocking reasons — empty means deletable.
   */
  private getItemDeleteBlockingReasons(item: { item_status: InquiryItemStatus; tally_post_status: TallyPostStatus }): string[] {
    const reasons: string[] = [];
    if (item.item_status === InquiryItemStatus.APPROVED) {
      reasons.push('Item Status is "APPROVED" (deleting an approved item can desync it from downstream records).');
    }
    if (item.tally_post_status === TallyPostStatus.POSTED) {
      reasons.push('Tally Entry is already "POSTED" for this item (deleting it will not reverse the Tally entry).');
    }
    return reasons;
  }

  async deleteItem(itemId: string, tenant: TenantContext, options?: { force?: boolean }) {
    const existing = await this.prisma.inquiryItem.findFirst({
      where: {
        id: itemId,
        consignment: {
          company_id: tenant.companyId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Inquiry item ${itemId} not found.`);
    }

    const blockingReasons = this.getItemDeleteBlockingReasons(existing);
    if (blockingReasons.length > 0 && !options?.force) {
      throw new BadRequestException(
        `Cannot delete this inquiry item. Mandatory conditions required to delete:\n• ` +
        blockingReasons.join('\n• ') +
        '\n\nIf you understand the consequences, you can force-delete this item.',
      );
    }

    const consignmentId = existing.consignment_id;

    return this.txService.run(async (tx) => {
      await tx.inquiryItem.delete({
        where: { id: itemId },
      });

      await this.recalculateConsignmentTotals(consignmentId, tx);
      await this.updateConsignmentAggregateStatus(consignmentId, tx);

      // This is a HARD delete (row is permanently gone from the DB), so the
      // audit log's `before` snapshot is the only surviving record of what
      // this item was — capture the full row, not just an id.
      await this.audit.record(
        {
          action: 'DELETE',
          entity: 'InquiryItem',
          entityId: itemId,
          before: existing,
          description: options?.force && blockingReasons.length > 0
            ? `Force-deleted inquiry item ${itemId} (qty ${existing.quantity}) despite: ${blockingReasons.join('; ')}`
            : `Deleted inquiry item ${itemId} (qty ${existing.quantity}) from consignment`,
        },
        tenant,
        tx,
      );

      return { message: 'Inquiry item deleted successfully.' };
    });
  }

  /**
   * Delete-eligibility rule for a whole consignment: blocked if ANY of its
   * items are Approved or already Tally-posted — same reasoning as
   * getItemDeleteBlockingReasons, applied at the consignment level.
   */
  private getConsignmentDeleteBlockingReasons(items: { item_status: InquiryItemStatus; tally_post_status: TallyPostStatus }[]): string[] {
    const reasons: string[] = [];
    const approvedCount = items.filter((i) => i.item_status === InquiryItemStatus.APPROVED).length;
    const postedCount = items.filter((i) => i.tally_post_status === TallyPostStatus.POSTED).length;

    if (approvedCount > 0) {
      reasons.push(`Contains ${approvedCount} item(s) with Status "APPROVED".`);
    }
    if (postedCount > 0) {
      reasons.push(`Contains ${postedCount} item(s) already "POSTED" to Tally.`);
    }
    return reasons;
  }

  async deleteConsignment(consignmentId: string, tenant: TenantContext, options?: { force?: boolean }) {
    const existing = await this.prisma.inquiryConsignment.findFirst({
      where: {
        id: consignmentId,
        company_id: tenant.companyId,
      },
      include: { items: true },
    });

    if (!existing) {
      throw new NotFoundException(`Consignment ${consignmentId} not found.`);
    }

    const blockingReasons = this.getConsignmentDeleteBlockingReasons(existing.items);
    if (blockingReasons.length > 0 && !options?.force) {
      throw new BadRequestException(
        `Cannot delete consignment "${existing.consignment_code}". Mandatory conditions required to delete:\n• ` +
        blockingReasons.join('\n• ') +
        '\n\nIf you understand the consequences, you can force-delete this consignment.',
      );
    }

    // Wrapped in a transaction: this is a cascading hard delete (consignment +
    // all its items) followed by an audit write. Without a transaction, a
    // crash partway through could delete the items but leave the consignment
    // row behind, or complete the deletes but lose the audit record — either
    // way, an inconsistent, hard-to-diagnose state with no clean recovery.
    // Wrapping it means it's all-or-nothing: either the full delete AND its
    // audit trail commit together, or nothing changes at all.
    return this.txService.run(async (tx) => {
      // Capture every item that's about to be permanently deleted BEFORE the
      // cascade runs. This is the only place this data will ever exist once
      // the delete completes — a hard delete of a whole consignment with its
      // items and no snapshot taken first would be unrecoverable and
      // untraceable.
      const itemsBeingDeleted = await tx.inquiryItem.findMany({
        where: { consignment_id: consignmentId },
      });

      // Delete items first then consignment
      await tx.inquiryItem.deleteMany({
        where: { consignment_id: consignmentId },
      });

      await tx.inquiryConsignment.delete({
        where: { id: consignmentId },
      });

      await this.audit.record(
        {
          action: 'DELETE',
          entity: 'InquiryConsignment',
          entityId: consignmentId,
          before: { consignment: existing, items: itemsBeingDeleted },
          description: options?.force && blockingReasons.length > 0
            ? `Force-deleted consignment "${existing.consignment_code}" and its ${itemsBeingDeleted.length} item(s) despite: ${blockingReasons.join('; ')}`
            : `Deleted consignment "${existing.consignment_code}" and its ${itemsBeingDeleted.length} item(s)`,
        },
        tenant,
        tx,
      );

      return { message: 'Consignment deleted successfully.' };
    });
  }

  /**
   * Bulk delete for the Layer-1 "Delete Selected" consignment list action.
   * Mirrors SupplierService.bulkRemove / BuyerService.bulkRemove: every id
   * is checked with getConsignmentDeleteBlockingReasons; failures are
   * reported back instead of silently skipped or silently allowed.
   * force/forceIds lets the frontend re-submit an explicit user-confirmed
   * override for specific blocked consignments.
   */
  async bulkDeleteConsignments(
    ids: string[],
    tenant: TenantContext,
    options?: { force?: boolean; forceIds?: string[] },
  ) {
    const uniqueIds = Array.from(new Set(ids));
    const consignments = await this.prisma.inquiryConsignment.findMany({
      where: {
        id: { in: uniqueIds },
        company_id: tenant.companyId,
      },
      include: { items: true },
    });

    const foundIds = new Set(consignments.map((c) => c.id));
    const forceSet = new Set(options?.forceIds || []);

    const deleted: { id: string; name: string }[] = [];
    const blocked: { id: string; name: string; reasons: string[] }[] = [];
    const notFound = uniqueIds.filter((id) => !foundIds.has(id));

    return this.txService.run(async (tx) => {
      for (const consignment of consignments) {
        const blockingReasons = this.getConsignmentDeleteBlockingReasons(consignment.items);
        const isForced = options?.force && forceSet.has(consignment.id);

        if (blockingReasons.length > 0 && !isForced) {
          blocked.push({ id: consignment.id, name: consignment.consignment_code, reasons: blockingReasons });
          continue;
        }

        await tx.inquiryItem.deleteMany({ where: { consignment_id: consignment.id } });
        await tx.inquiryConsignment.delete({ where: { id: consignment.id } });

        await this.audit.record(
          {
            action: 'DELETE',
            entity: 'InquiryConsignment',
            entityId: consignment.id,
            before: consignment,
            description: isForced
              ? `Force-deleted consignment "${consignment.consignment_code}" and its ${consignment.items.length} item(s) (bulk delete, rule override confirmed by user)`
              : `Deleted consignment "${consignment.consignment_code}" and its ${consignment.items.length} item(s) (bulk delete)`,
          },
          tenant,
          tx,
        );

        deleted.push({ id: consignment.id, name: consignment.consignment_code });
      }

      return { deleted, blocked, notFound };
    });
  }

  // Accepts an optional `db` client (either the pooled PrismaService, or an
  // active Prisma.TransactionClient). When called from inside a
  // `txService.run()` block, the caller MUST pass the active `tx` here —
  // otherwise this would reach for a second pooled connection while the
  // outer transaction still holds a lock on the same consignment row, which
  // is exactly the cross-connection self-deadlock pattern fixed in
  // AuthService.login() (see account-protection.service.ts for the full
  // writeup of why this matters under Supabase's pgbouncer pooler).
  private async recalculateConsignmentTotals(consignmentId: string, db: PrismaService | Prisma.TransactionClient = this.prisma) {
    const items = await db.inquiryItem.findMany({
      where: { consignment_id: consignmentId },
      include: { product: true },
    });

    let totalCbm = 0;
    let totalWeight = 0;

    for (const item of items) {
      const qty = Number(item.quantity);
      const unitCbm = Number(item.product.unit_cbm);
      const unitGrossWeight = Number(item.product.gross_weight);

      totalCbm += qty * unitCbm;
      totalWeight += qty * unitGrossWeight;
    }

    await db.inquiryConsignment.update({
      where: { id: consignmentId },
      data: {
        total_cbm: totalCbm,
        total_weight: totalWeight,
      },
    });
  }

  private async updateConsignmentAggregateStatus(consignmentId: string, db: PrismaService | Prisma.TransactionClient = this.prisma) {
    const items = await db.inquiryItem.findMany({
      where: { consignment_id: consignmentId },
    });

    if (items.length === 0) return;

    const approvedCount = items.filter((i) => i.item_status === InquiryItemStatus.APPROVED).length;

    let overallStatus: InquiryStatus = InquiryStatus.PROPOSED;
    if (approvedCount === items.length) {
      overallStatus = InquiryStatus.FULLY_APPROVED;
    } else if (approvedCount > 0) {
      overallStatus = InquiryStatus.PARTIALLY_APPROVED;
    }

    await db.inquiryConsignment.update({
      where: { id: consignmentId },
      data: { status: overallStatus },
    });
  }
}