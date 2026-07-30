import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.company.findMany({
      where: { deleted_at: null },
      include: {
        branches: true,
      },
      orderBy: { code: 'asc' },
    });
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findFirst({
      where: { id, deleted_at: null },
      include: { branches: true },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found.`);
    }

    return company;
  }
}
