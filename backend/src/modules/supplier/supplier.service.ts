import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { TenantContext } from '../../core/decorators/tenant.decorator';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { PartyStatus, PotentialStatus, RecordStatus } from '@prisma/client';

@Injectable()
export class SupplierService {
  private readonly logger = new Logger(SupplierService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSupplierDto, tenant: TenantContext) {
    // Duplication Check (Company Name + City)
    if (dto.city) {
      const existing = await this.prisma.supplier.findFirst({
        where: {
          company_id: tenant.companyId,
          name: { equals: dto.name, mode: 'insensitive' },
          city: { equals: dto.city, mode: 'insensitive' },
          deleted_at: null,
        },
      });

      if (existing) {
        throw new BadRequestException(
          `Supplier with company name "${dto.name}" in city "${dto.city}" already exists in the system.`,
        );
      }
    }

    const { contacts, ...supplierData } = dto;

    return this.prisma.supplier.create({
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
  }

  async findAll(tenant: TenantContext, query: any) {
    const {
      search,
      productCategory,
      keyStrengthSubcategory,
      country,
      province,
      city,
      supplierType,
      grade,
      currentStatus,
      potential,
      visitedFactory,
      page = 1,
      limit = 20,
    } = query;

    const where: any = {
      company_id: tenant.companyId,
      deleted_at: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { brand_description: { contains: search, mode: 'insensitive' } },
        { secondary_products_desc: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (productCategory) {
      where.product_categories = { has: productCategory };
    }

    if (keyStrengthSubcategory) {
      where.key_strength_subcategories = { has: keyStrengthSubcategory };
    }

    if (country) where.country = country;
    if (province) where.province = province;
    if (city) where.city = city;
    if (supplierType) where.supplier_type = supplierType;
    if (grade) where.grade = grade;
    if (currentStatus) where.current_status = currentStatus;
    if (potential) where.potential = potential;
    if (visitedFactory !== undefined) where.visited_factory = visitedFactory === 'true';

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
        include: {
          contacts: true,
        },
      }),
      this.prisma.supplier.count({ where }),
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

    return this.prisma.supplier.update({
      where: { id },
      data: {
        current_status: newStatus,
        updated_by: tenant.userId,
      },
    });
  }

  async updateGradeOrPotential(id: string, dto: { grade?: any; potential?: any }, tenant: TenantContext) {
    await this.findOne(id, tenant);

    return this.prisma.supplier.update({
      where: { id },
      data: {
        ...dto,
        updated_by: tenant.userId,
      },
    });
  }

  async remove(id: string, tenant: TenantContext) {
    const supplier = await this.findOne(id, tenant);

    // Business Deletion Rule Enforcement:
    // Deletion is ALLOWED ONLY IF Current Status is "NEW" or "UNSELECTED" AND Potential is "NO" or "UNSELECTED".
    // If Current Status is "EXISTING" OR Potential is "YES" (any one), DELETE IS BLOCKED. Can only make "INACTIVE".
    const isStatusNewOrUnselected = supplier.current_status === PartyStatus.NEW;
    const isPotentialNoOrUnselected = supplier.potential === PotentialStatus.NO || supplier.potential === PotentialStatus.UNSELECTED;

    if (!isStatusNewOrUnselected || !isPotentialNoOrUnselected) {
      throw new BadRequestException(
        `Deletion Blocked: Supplier cannot be deleted because Current Status is "${supplier.current_status}" or Potential is "${supplier.potential}". You may only set this supplier status to "INACTIVE".`,
      );
    }

    // Perform Soft Delete
    return this.prisma.supplier.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        updated_by: tenant.userId,
      },
    });
  }

  async toggleActiveStatus(id: string, tenant: TenantContext) {
    const supplier = await this.findOne(id, tenant);
    const newStatus = supplier.status === RecordStatus.ACTIVE ? RecordStatus.INACTIVE : RecordStatus.ACTIVE;

    return this.prisma.supplier.update({
      where: { id },
      data: {
        status: newStatus,
        updated_by: tenant.userId,
      },
    });
  }
}
