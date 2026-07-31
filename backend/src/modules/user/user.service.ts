import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { TransactionService } from '../../core/database/transaction.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly txService: TransactionService,
  ) {}

  private sanitizeUser(user: any) {
    if (!user) return user;
    const password = user.password_hash || '';
    return {
      ...user,
      password,
    };
  }

  /**
   * Minimum 1 Active Admin Rule Validation
   */
  private async validateMinAdminRule(userId: string, actionName: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deleted_at: null },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      const activeAdminCount = await this.prisma.user.count({
        where: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] },
          status: 'ACTIVE',
          deleted_at: null,
        },
      });

      if (activeAdminCount <= 1) {
        throw new BadRequestException(
          `Action Blocked: System requires a minimum of 1 active Administrator. You cannot ${actionName} the last remaining Admin account (${user.full_name}).`,
        );
      }
    }

    return user;
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

  async create(data: any, operatorUser?: any) {
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

    // Write Mandatory Immutable Audit Trace Log
    await this.prisma.auditLog.create({
      data: {
        company_id: '11111111-1111-1111-1111-111111111111',
        user_id: operatorUser?.id || created.id,
        user_name: operatorUser?.full_name || created.full_name,
        entity_name: 'USER',
        entity_id: created.id,
        action: 'USER_CREATED',
        after_state: { email: created.email, name: created.full_name, role: created.role },
      },
    });

    return this.sanitizeUser(created);
  }

  async update(id: string, data: any, operatorUser?: any) {
    const user = await this.prisma.user.findFirst({
      where: { id, deleted_at: null },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    // Minimum 1 Admin Check if deactivating an Admin
    if (data.status === 'INACTIVE' && user.status === 'ACTIVE') {
      await this.validateMinAdminRule(id, 'deactivate');
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

    // Write Mandatory Immutable Audit Trace Log
    await this.prisma.auditLog.create({
      data: {
        company_id: '11111111-1111-1111-1111-111111111111',
        user_id: operatorUser?.id || user.id,
        user_name: operatorUser?.full_name || user.full_name,
        entity_name: 'USER',
        entity_id: user.id,
        action: 'USER_UPDATED',
        before_state: { role: user.role, status: user.status },
        after_state: { role: updated.role, status: updated.status },
      },
    });

    return this.sanitizeUser(updated);
  }

  /**
   * Delete User Account with Mandatory Data Re-assignment & Audit Trail Preservation
   */
  async remove(id: string, targetUserId?: string, operatorUser?: any) {
    const userToDelete = await this.validateMinAdminRule(id, 'delete');

    if (!targetUserId) {
      throw new BadRequestException(
        `User Data Re-assignment Required: Please select an active user or admin to transfer all records owned by ${userToDelete.full_name} before deleting this account.`,
      );
    }

    const targetUser = await this.prisma.user.findFirst({
      where: { id: targetUserId, deleted_at: null },
    });

    if (!targetUser) {
      throw new NotFoundException(`Target transfer user with ID ${targetUserId} not found.`);
    }

    return await this.txService.run(async (tx) => {
      // 1. Re-assign Suppliers owned by userToDelete
      const updatedSuppliers = await tx.supplier.updateMany({
        where: { created_by: id },
        data: { created_by: targetUserId },
      });

      // 2. Re-assign Buyers owned by userToDelete
      const updatedBuyers = await tx.buyer.updateMany({
        where: { created_by: id },
        data: { created_by: targetUserId },
      });

      // 3. Re-assign Products owned by userToDelete
      const updatedProducts = await tx.product.updateMany({
        where: { created_by: id },
        data: { created_by: targetUserId },
      });

      // 4. Re-assign Inquiries owned by userToDelete
      const updatedInquiries = await tx.inquiryConsignment.updateMany({
        where: { created_by: id },
        data: { created_by: targetUserId },
      });

      // 5. Create Target User Inheritance Audit Trace Log
      await tx.auditLog.create({
        data: {
          company_id: '11111111-1111-1111-1111-111111111111',
          user_id: targetUser.id,
          user_name: targetUser.full_name,
          entity_name: 'USER_DATA_TRANSFER',
          entity_id: targetUser.id,
          action: 'DATA_REASSIGNMENT_INHERITED',
          after_state: {
            transferredFrom: userToDelete.full_name,
            suppliersTransferred: updatedSuppliers.count,
            buyersTransferred: updatedBuyers.count,
            productsTransferred: updatedProducts.count,
            inquiriesTransferred: updatedInquiries.count,
          },
        },
      });

      // 6. Create Deleted User Final Audit Trace Log (Preserved in DB with user_name)
      await tx.auditLog.create({
        data: {
          company_id: '11111111-1111-1111-1111-111111111111',
          user_id: userToDelete.id,
          user_name: userToDelete.full_name,
          entity_name: 'USER',
          entity_id: userToDelete.id,
          action: 'USER_ACCOUNT_DELETED_DATA_TRANSFERRED',
          after_state: {
            transferredTo: targetUser.full_name,
            transferredToUserId: targetUser.id,
            operator: operatorUser?.full_name || 'Administrator',
          },
        },
      });

      // 7. Delete User Account safely (AuditLog records remain preserved via SetNull)
      await tx.user.delete({
        where: { id: userToDelete.id },
      });

      this.logger.log(
        `User ${userToDelete.full_name} (${userToDelete.email}) deleted. Reassigned records to ${targetUser.full_name}.`,
      );

      return {
        success: true,
        message: `User account "${userToDelete.full_name}" deleted. All owned records were successfully transferred to "${targetUser.full_name}".`,
        transferredRecords: {
          suppliers: updatedSuppliers.count,
          buyers: updatedBuyers.count,
          products: updatedProducts.count,
          inquiries: updatedInquiries.count,
        },
      };
    });
  }
}
