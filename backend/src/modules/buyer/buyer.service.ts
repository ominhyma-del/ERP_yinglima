import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { TenantContext } from '../../core/decorators/tenant.decorator';
import { CreateBuyerDto } from './dto/create-buyer.dto';
import { PartyStatus, PotentialStatus, RecordStatus } from '@prisma/client';

@Injectable()
export class BuyerService {
  private readonly logger = new Logger(BuyerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBuyerDto, tenant: TenantContext) {
    // Duplicate Detection: Check if matches Company Name AND Calling/WhatsApp
    const primaryContact = dto.contacts && dto.contacts[0];
    if (primaryContact?.calling_number || primaryContact?.whatsapp_number) {
      const existing = await this.prisma.buyer.findFirst({
        where: {
          company_id: tenant.companyId,
          name: { equals: dto.name, mode: 'insensitive' },
          deleted_at: null,
          contacts: {
            some: {
              OR: [
                primaryContact.calling_number ? { calling_number: primaryContact.calling_number } : undefined,
                primaryContact.whatsapp_number ? { whatsapp_number: primaryContact.whatsapp_number } : undefined,
              ].filter(Boolean) as any,
            },
          },
        },
      });

      if (existing) {
        throw new BadRequestException(
          `Buyer "${dto.name}" with matching phone/WhatsApp number already exists in database.`,
        );
      }
    }

    const { contacts, ...buyerData } = dto;

    return this.prisma.buyer.create({
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
      limit = 20,
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

    return this.prisma.buyer.update({
      where: { id },
      data: {
        name: dto.name,
        buyer_type: dto.buyer_type,
        country: dto.country,
        city: dto.city,
        address: dto.address,
        tax_id: dto.tax_id,
        website: dto.website,
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
  }

  async updateStatus(id: string, newStatus: PartyStatus, tenant: TenantContext) {
    const buyer = await this.findOne(id, tenant);

    // Business Rule Enforcement: Status can ONLY transition ONE-WAY from NEW -> EXISTING
    if (buyer.current_status === PartyStatus.EXISTING && newStatus === PartyStatus.NEW) {
      throw new BadRequestException(
        'Invalid Status Transition: Buyer status cannot be changed back from "EXISTING" to "NEW". (One-way rule enforced)',
      );
    }

    return this.prisma.buyer.update({
      where: { id },
      data: {
        current_status: newStatus,
        updated_by: tenant.userId,
      },
    });
  }

  async remove(id: string, tenant: TenantContext) {
    const buyer = await this.findOne(id, tenant);

    // Deletion Rule Enforcement:
    // Delete ALLOWED ONLY IF Current Status is "NEW"/"UNSELECTED" AND Potential is "NO"/"UNSELECTED".
    // If Current Status is "EXISTING" OR Potential is "YES", DELETE IS BLOCKED. Can only make "INACTIVE".
    const isStatusNewOrUnselected = buyer.current_status === PartyStatus.NEW;
    const isPotentialNoOrUnselected = buyer.potential === PotentialStatus.NO || buyer.potential === PotentialStatus.UNSELECTED;

    if (!isStatusNewOrUnselected || !isPotentialNoOrUnselected) {
      throw new BadRequestException(
        `Deletion Blocked: Buyer cannot be deleted because Current Status is "${buyer.current_status}" or Potential is "${buyer.potential}". You may only mark this record as "INACTIVE".`,
      );
    }

    return this.prisma.buyer.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        updated_by: tenant.userId,
      },
    });
  }
}
