import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { TransactionService } from '../../core/database/transaction.service';
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
    private readonly txService: TransactionService,
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
      onlyDuplicates,
      sortBy = 'name_tally',
      sortOrder = 'asc',
      page = 1,
      limit = 100,
    } = query;

    const duplicateInfo = await this.findDuplicates(tenant);

    const where: any = {
      company_id: tenant.companyId,
      deleted_at: null,
    };

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { name_tally: { contains: term, mode: 'insensitive' } },
        { name_invoice: { contains: term, mode: 'insensitive' } },
        { product_code: { contains: term, mode: 'insensitive' } },
        { hsn_code: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (categoryId && categoryId !== 'All') where.category_id = categoryId;
    if (subcategoryId && subcategoryId !== 'All') where.subcategory_id = subcategoryId;
    if (brandId && brandId !== 'All') where.brand_id = brandId;
    if (status && status !== 'All') where.status = status;

    if (onlyDuplicates === 'true' || onlyDuplicates === true) {
      where.id = { in: duplicateInfo.duplicateIds };
    }

    let orderBy: any = { name_tally: sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc' };
    if (sortBy === 'product_code') orderBy = { product_code: sortOrder };
    else if (sortBy === 'name_invoice') orderBy = { name_invoice: sortOrder };
    else if (sortBy === 'unit_cbm') orderBy = { unit_cbm: sortOrder };
    else if (sortBy === 'current_stock') orderBy = { current_stock: sortOrder };
    else if (sortBy === 'created_at') orderBy = { created_at: sortOrder };

    const takeVal = Number(limit) > 0 ? Number(limit) : 100;
    const pageVal = Number(page) > 0 ? Number(page) : 1;
    const skip = (pageVal - 1) * takeVal;

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: takeVal,
        orderBy,
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
    const products = await this.prisma.product.findMany({
      where: { company_id: tenant.companyId, deleted_at: null },
      select: { id: true, product_code: true, name_tally: true }
    });

    const codeMap = new Map<string, string[]>();
    const nameMap = new Map<string, string[]>();

    for (const p of products) {
      const normCode = p.product_code.trim().toLowerCase();
      if (!codeMap.has(normCode)) codeMap.set(normCode, []);
      codeMap.get(normCode)!.push(p.id);

      const normName = p.name_tally.trim().toLowerCase();
      if (!nameMap.has(normName)) nameMap.set(normName, []);
      nameMap.get(normName)!.push(p.id);
    }

    const duplicateGroups: { reason: string; key: string; ids: string[] }[] = [];
    const allDuplicateIds = new Set<string>();

    for (const [code, ids] of codeMap.entries()) {
      if (ids.length > 1) {
        duplicateGroups.push({ reason: 'Duplicate Product Code', key: code, ids });
        ids.forEach(id => allDuplicateIds.add(id));
      }
    }

    for (const [name, ids] of nameMap.entries()) {
      if (ids.length > 1) {
        duplicateGroups.push({ reason: 'Duplicate Product Name', key: name, ids });
        ids.forEach(id => allDuplicateIds.add(id));
      }
    }

    return {
      totalDuplicates: allDuplicateIds.size,
      duplicateGroups,
      duplicateIds: Array.from(allDuplicateIds),
    };
  }

  async mergeProducts(tenant: TenantContext, dto: { targetId: string; sourceIds: string[] }) {
    const { targetId, sourceIds } = dto;
    if (!targetId || !sourceIds || sourceIds.length === 0) {
      throw new BadRequestException('Target ID and at least one Source ID are required.');
    }

    const validSourceIds = Array.from(new Set(sourceIds.filter((id) => id !== targetId)));
    if (validSourceIds.length === 0) {
      throw new BadRequestException('No valid source IDs to merge.');
    }

    return this.txService.run(async (tx) => {
      const target = await tx.product.findFirst({
        where: { id: targetId, company_id: tenant.companyId, deleted_at: null },
      });
      if (!target) throw new NotFoundException(`Target product ${targetId} not found.`);

      const sources = await tx.product.findMany({
        where: { id: { in: validSourceIds }, company_id: tenant.companyId, deleted_at: null },
      });

      for (const source of sources) {
        await tx.inquiryItem.updateMany({
          where: { product_id: source.id },
          data: { product_id: targetId }
        });

        await tx.product.update({
          where: { id: source.id },
          data: { deleted_at: new Date(), updated_by: tenant.userId },
        });
      }

      await this.audit.record(
        {
          action: 'MERGE',
          entity: 'Product',
          entityId: targetId,
          before: target,
          description: `Merged ${sources.length} product(s) into "${target.name_tally}"`,
        },
        tenant,
        tx,
      );

      return target;
    });
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