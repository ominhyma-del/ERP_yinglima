import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  private sanitizeUser(user: any) {
    if (!user) return user;
    const { password_hash, ...rest } = user;
    return rest;
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: 'desc' },
    });
    return users.map((u) => this.sanitizeUser(u));
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deleted_at: null },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }
    return this.sanitizeUser(user);
  }

  async create(data: any) {
    const created = await this.prisma.user.create({
      data: {
        email: data.email.trim().toLowerCase(),
        password_hash: data.password || 'default123',
        full_name: data.name,
        phone: data.phone || null,
        avatar_url: data.avatar_url || null,
        role: data.accountType || 'EMPLOYEE',
        status: data.status || 'ACTIVE',
        department: data.department || null,
        branch: data.branch || null,
        permissions: data.permissions || {},
      },
    });
    return this.sanitizeUser(created);
  }

  async update(id: string, data: any) {
    const user = await this.prisma.user.findFirst({
      where: { id, deleted_at: null },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        email: data.email !== undefined ? data.email.trim().toLowerCase() : undefined,
        password_hash: data.password !== undefined ? data.password : undefined,
        full_name: data.name !== undefined ? data.name : undefined,
        phone: data.phone !== undefined ? data.phone : undefined,
        avatar_url: data.avatar_url !== undefined ? data.avatar_url : undefined,
        role: data.accountType !== undefined ? data.accountType : undefined,
        status: data.status !== undefined ? data.status : undefined,
        department: data.department !== undefined ? data.department : undefined,
        branch: data.branch !== undefined ? data.branch : undefined,
        permissions: data.permissions !== undefined ? data.permissions : undefined,
      },
    });
    return this.sanitizeUser(updated);
  }

  async remove(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deleted_at: null },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }
    const removed = await this.prisma.user.update({
      where: { id: user.id },
      data: { deleted_at: new Date() },
    });
    return this.sanitizeUser(removed);
  }
}
