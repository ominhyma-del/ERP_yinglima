import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { TenantContext } from '../../core/decorators/tenant.decorator';
import { RecordStatus } from '@prisma/client';

@Injectable()
export class MastersService {
  constructor(private readonly prisma: PrismaService) {}

  // Product Categories
  async createCategory(name: string, tenant: TenantContext) {
    return this.prisma.productCategory.create({
      data: {
        name,
        company_id: tenant.companyId,
        branch_id: tenant.branchId,
        created_by: tenant.userId,
      },
    });
  }

  async getCategories(tenant: TenantContext) {
    return this.prisma.productCategory.findMany({
      where: {
        company_id: tenant.companyId,
        deleted_at: null,
      },
      orderBy: { name: 'asc' },
    });
  }

  // Product SubCategories
  async createSubCategory(categoryId: string, name: string, tenant: TenantContext) {
    return this.prisma.productSubCategory.create({
      data: {
        category_id: categoryId,
        name,
        company_id: tenant.companyId,
        branch_id: tenant.branchId,
        created_by: tenant.userId,
      },
      include: {
        category: true,
      },
    });
  }

  async getSubCategories(tenant: TenantContext, categoryId?: string) {
    const where: any = {
      company_id: tenant.companyId,
      deleted_at: null,
    };
    if (categoryId) where.category_id = categoryId;

    return this.prisma.productSubCategory.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { category: true },
    });
  }

  // Brands
  async createBrand(name: string, description: string | undefined, tenant: TenantContext) {
    return this.prisma.brand.create({
      data: {
        name,
        description,
        company_id: tenant.companyId,
        branch_id: tenant.branchId,
        created_by: tenant.userId,
      },
    });
  }

  async getBrands(tenant: TenantContext) {
    return this.prisma.brand.findMany({
      where: {
        company_id: tenant.companyId,
        deleted_at: null,
      },
      orderBy: { name: 'asc' },
    });
  }

  // HSN Master
  async getHsnCodes() {
    return this.prisma.hsnMaster.findMany({
      orderBy: { hsn_code: 'asc' },
    });
  }

  // Location Masters
  async getCountries() {
    return this.prisma.countryMaster.findMany({
      orderBy: { name: 'asc' },
    });
  }
}
