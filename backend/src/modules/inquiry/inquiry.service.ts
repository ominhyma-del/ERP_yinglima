import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { TenantContext } from '../../core/decorators/tenant.decorator';
import { CreateInquiryItemDto, BulkShiftItemsDto, BulkTallyPostDto } from './dto/create-inquiry-item.dto';
import { InquiryItemStatus, InquiryStatus, TallyPostStatus } from '@prisma/client';

@Injectable()
export class InquiryService {
  private readonly logger = new Logger(InquiryService.name);

  constructor(private readonly prisma: PrismaService) {}

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

    return item;
  }

  private async recalculateConsignmentTotals(consignmentId: string) {
    const items = await this.prisma.inquiryItem.findMany({
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

    await this.prisma.inquiryConsignment.update({
      where: { id: consignmentId },
      data: {
        total_cbm: totalCbm,
        total_weight: totalWeight,
      },
    });
  }

  private async updateConsignmentAggregateStatus(consignmentId: string) {
    const items = await this.prisma.inquiryItem.findMany({
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

    await this.prisma.inquiryConsignment.update({
      where: { id: consignmentId },
      data: { status: overallStatus },
    });
  }
}
