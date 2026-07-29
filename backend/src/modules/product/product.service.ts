import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { TenantContext } from '../../core/decorators/tenant.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { RecordStatus } from '@prisma/client';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto, tenant: TenantContext) {
    // Unique check on Product Code
    const existingCode = await this.prisma.product.findFirst({
      where: {
        company_id: tenant.companyId,
        product_code: dto.product_code,
        deleted_at: null,
      },
    });

    if (existingCode) {
      throw new BadRequestException(
        `Product with Code "${dto.product_code}" already exists in the master catalog.`,
      );
    }

    // Auto-calculate Packaging Unit CBM from L x W x H in CM
    const lengthCm = dto.length_cm || 0;
    const widthCm = dto.width_cm || 0;
    const heightCm = dto.height_cm || 0;
    const unitCbm = (lengthCm * widthCm * heightCm) / 1000000;

    return this.prisma.product.create({
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
  }

  async findAll(tenant: TenantContext, query: any) {
    const {
      search,
      categoryId,
      subcategoryId,
      brandId,
      status,
      page = 1,
      limit = 20,
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

    return this.prisma.product.update({
      where: { id },
      data: {
        status: newStatus,
        updated_by: tenant.userId,
      },
    });
  }

  async remove(id: string, tenant: TenantContext) {
    const product = await this.findOne(id, tenant);

    // Business Rule Enforcement:
    // 1. Delete option ONLY if status is INACTIVE
    // 2. Inactive status requires stock == 0
    if (product.status !== RecordStatus.INACTIVE) {
      throw new BadRequestException(
        'Deletion Blocked: Product can only be deleted if its status is set to "INACTIVE" first.',
      );
    }

    const stockNumber = Number(product.current_stock);
    if (stockNumber !== 0) {
      throw new BadRequestException(
        `Deletion Blocked: Cannot delete product while stock is ${stockNumber}. Stock must be 0.`,
      );
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        updated_by: tenant.userId,
      },
    });
  }
}
