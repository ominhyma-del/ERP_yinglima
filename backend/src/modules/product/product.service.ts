import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { TenantContext } from '../../core/decorators/tenant.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { RecordStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) { }

  async create(dto: CreateProductDto, tenant: TenantContext) {
    // Backend Duplication Check: Product Code or Tally Product Name
    const existing = await this.prisma.product.findFirst({
      where: {
        company_id: tenant.companyId,
        deleted_at: null,
        OR: [
          { product_code: { equals: dto.product_code, mode: 'insensitive' } },
          { name_tally: { equals: dto.name_tally, mode: 'insensitive' } },
        ],
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Product with Code "${dto.product_code}" or Name "${dto.name_tally}" already exists in Supabase DB.`,
      );
    }

    // Auto-calculate Packaging Unit CBM from L x W x H in CM
    const lengthCm = dto.length_cm || 0;
    const widthCm = dto.width_cm || 0;
    const heightCm = dto.height_cm || 0;
    const unitCbm = (lengthCm * widthCm * heightCm) / 1000000;

    const created = await this.prisma.product.create({
      data: {
        ...dto,
        unit_cbm: unitCbm,
        company_id: tenant.companyId,
        branch_id: tenant.branchId,
        created_by: tenant.userId,
      },
      include: {
        category: true,
        subcategory: true,
        brand: true,
      },
    });

    await this.audit.record(
      {
        action: 'CREATE',
        entity: 'Product',
        entityId: created.id,
        after: created,
        description: `Created product "${created.name_tally}" (${created.product_code})`,
      },
      tenant,
    );

    return created;
  }

  async findAll(tenant: TenantContext, query: any) {
    const {
      search,
      categoryId,
      subcategoryId,
      brandId,
      status,
      page = 1,
      limit = 1000000,
    } = query;

    const where: any = {
      company_id: tenant.companyId,
      deleted_at: null,
    };

    if (search) {
      where.OR = [
        { name_tally: { contains: search, mode: 'insensitive' } },
        { name_invoice: { contains: search, mode: 'insensitive' } },
        { product_code: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) where.category_id = categoryId;
    if (subcategoryId) where.subcategory_id = subcategoryId;
    if (brandId) where.brand_id = brandId;
    if (status) where.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { name_tally: 'asc' },
        include: {
          category: true,
          subcategory: true,
          brand: true,
        },
      }),
      this.prisma.product.count({ where }),
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
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        company_id: tenant.companyId,
        deleted_at: null,
      },
      include: {
        category: true,
        subcategory: true,
        brand: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found.`);
    }

    return product;
  }

  async toggleActiveStatus(id: string, tenant: TenantContext) {
    const product = await this.findOne(id, tenant);

    // Business Rule Enforcement: Inactive status can ONLY be set if Stock is ZERO.
    const stockNumber = Number(product.current_stock);
    if (stockNumber !== 0) {
      throw new BadRequestException(
        `Action Blocked: Product status cannot be changed to Inactive because current stock is ${stockNumber} (Stock must be exactly 0).`,
      );
    }

    const newStatus = product.status === RecordStatus.ACTIVE ? RecordStatus.INACTIVE : RecordStatus.ACTIVE;

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        status: newStatus,
        updated_by: tenant.userId,
      },
    });

    await this.audit.record(
      {
        action: 'STATUS_CHANGE',
        entity: 'Product',
        entityId: id,
        before: { status: product.status },
        after: { status: updated.status },
        description: `Toggled active status for product "${product.name_tally}" from ${product.status} to ${updated.status}`,
      },
      tenant,
    );

    return updated;
  }

  async remove(id: string, tenant: TenantContext) {
    const product = await this.findOne(id, tenant);

    const stockNumber = Number(product.current_stock);
    const linkedInquiryCount = await this.prisma.inquiryItem.count({
      where: { product_id: id },
    });

    const blockingReasons: string[] = [];

    if (product.status !== RecordStatus.INACTIVE) {
      blockingReasons.push(`Product status is currently "${product.status}" (Deletion requires status to be "INACTIVE").`);
    }

    if (stockNumber !== 0) {
      blockingReasons.push(`Current stock is ${stockNumber} (Stock must be exactly 0).`);
    }

    if (linkedInquiryCount > 0) {
      blockingReasons.push(`Product is referenced in ${linkedInquiryCount} active Inquiry Item(s).`);
    }

    if (blockingReasons.length > 0) {
      throw new BadRequestException(
        `Cannot delete Product "${product.name_tally}". Mandatory conditions required to delete:\n• ` +
        blockingReasons.join('\n• ') +
        '\n\nRecommended Action: Deactivate product status, clear stock to 0, or unlink inquiry references.',
      );
    }

    const deleted = await this.prisma.product.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        updated_by: tenant.userId,
      },
    });

    await this.audit.record(
      {
        action: 'DELETE',
        entity: 'Product',
        entityId: id,
        before: product,
        description: `Deleted product "${product.name_tally}" (${product.product_code})`,
      },
      tenant,
    );

    return deleted;
  }
}