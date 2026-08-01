import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../core/database/prisma.service';
import { TransactionService } from '../../core/database/transaction.service';

// The one seed Super Admin account that must always exist so the tenant can
// never be locked out of its own system. It can be edited (name/phone/dept/
// password) like any other account, but it can never be deleted, deactivated,
// or demoted out of an admin role. This is enforced here, server-side, so it
// cannot be bypassed by calling the API directly — a UI-only guard is not a
// real guard.
const PROTECTED_ADMIN_EMAIL = (process.env.PROTECTED_ADMIN_EMAIL || 'admin@yinglima.com').toLowerCase();

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly txService: TransactionService,
  ) { }

  /** Strips ALL password material from anything sent back to a client. */
  private sanitizeUser(user: any) {
    if (!user) return user;
    const { password_hash, ...safe } = user;
    return safe;
  }

  private isProtectedAdmin(user: any): boolean {
    return !!user && user.email?.toLowerCase() === PROTECTED_ADMIN_EMAIL;
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

    if (this.isProtectedAdmin(user)) {
      throw new ForbiddenException(
        `Action Blocked: "${user.full_name}" is the system's protected default administrator account and can never be ${actionName}d.`,
      );
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
    if (!data?.email || !data?.name) {
      throw new BadRequestException('Name and email are required to create a team member.');
    }
    if (!data?.password || String(data.password).length < 6) {
      throw new BadRequestException('A password of at least 6 characters is required.');
    }

    const existing = await this.prisma.user.findFirst({
      where: { email: data.email.trim().toLowerCase(), deleted_at: null },
    });
    if (existing) {
      throw new BadRequestException(`A team member with email ${data.email} already exists.`);
    }

    const passwordHash = await bcrypt.hash(String(data.password), 12);

    const created = await this.prisma.user.create({
      data: {
        email: data.email.trim().toLowerCase(),
        password_hash: passwordHash,
        full_name: data.name,
        phone: data.phone || null,
        avatar_url: data.avatar_url || null,
        role: data.accountType || 'EMPLOYEE',
        status: data.status || 'ACTIVE',
        department: data.department || null,
        branch: data.branch || null,
        permissions: data.permissions || {},
        password_changed_at: new Date(),
      },
    });

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

    const protectedAccount = this.isProtectedAdmin(user);

    // The protected default admin can have its name/phone/password/department
    // updated, but never its role (demoted) or its status (deactivated).
    if (protectedAccount) {
      if (data.accountType !== undefined && data.accountType !== 'ADMIN' && data.accountType !== 'SUPER_ADMIN') {
        throw new ForbiddenException('Action Blocked: The default administrator account cannot be demoted.');
      }
      if (data.status !== undefined && data.status !== 'ACTIVE') {
        throw new ForbiddenException('Action Blocked: The default administrator account cannot be deactivated.');
      }
    }

    // Minimum 1 Admin Check if deactivating an Admin or demoting one out of ADMIN/SUPER_ADMIN
    if (data.status === 'INACTIVE' && user.status === 'ACTIVE') {
      await this.validateMinAdminRule(id, 'deactivate');
    }
    if (
      data.accountType !== undefined &&
      data.accountType !== user.role &&
      (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') &&
      data.accountType !== 'ADMIN' &&
      data.accountType !== 'SUPER_ADMIN'
    ) {
      await this.validateMinAdminRule(id, 'demote');
    }

    let newPasswordHash: string | undefined;
    if (data.password !== undefined && data.password !== '') {
      if (String(data.password).length < 6) {
        throw new BadRequestException('A password of at least 6 characters is required.');
      }
      newPasswordHash = await bcrypt.hash(String(data.password), 12);
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        email: data.email !== undefined ? data.email.trim().toLowerCase() : undefined,
        password_hash: newPasswordHash,
        password_changed_at: newPasswordHash ? new Date() : undefined,
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
   * Preview endpoint for the delete-and-transfer flow: shows exactly what data
   * is owned by a user BEFORE any deletion happens, so an admin can make an
   * informed choice of transfer target instead of picking one blind. Counts
   * mirror exactly what `remove()` below actually reassigns (Suppliers,
   * Buyers, Products, Inquiry Consignments created_by this user) — kept in
   * sync deliberately so the preview can never promise something the delete
   * step doesn't also do.
   */
  async getOwnedDataSummary(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deleted_at: null },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    const [supplierCount, buyerCount, productCount, inquiryCount] = await Promise.all([
      this.prisma.supplier.count({ where: { created_by: id, deleted_at: null } }),
      this.prisma.buyer.count({ where: { created_by: id, deleted_at: null } }),
      this.prisma.product.count({ where: { created_by: id, deleted_at: null } }),
      this.prisma.inquiryConsignment.count({ where: { created_by: id, deleted_at: null } }),
    ]);

    // Every other active user is a valid transfer target — admin or not, per
    // the requirement that the recipient "can be admin or any other user too".
    // The protected default admin and the user being deleted are excluded:
    // the former to keep it simple/predictable as the fallback owner of last
    // resort, the latter because transferring data to the account you're
    // about to delete is meaningless.
    const eligibleTransferTargets = await this.prisma.user.findMany({
      where: {
        id: { not: id },
        deleted_at: null,
        status: 'ACTIVE',
      },
      select: { id: true, full_name: true, email: true, role: true, department: true },
      orderBy: { full_name: 'asc' },
    });

    return {
      user: { id: user.id, name: user.full_name, email: user.email, role: user.role },
      ownedRecords: {
        suppliers: supplierCount,
        buyers: buyerCount,
        products: productCount,
        inquiries: inquiryCount,
        total: supplierCount + buyerCount + productCount + inquiryCount,
      },
      eligibleTransferTargets,
    };
  }

  /**
   * Delete User Account with Mandatory Data Re-assignment & Audit Trail Preservation
   */
  async remove(id: string, targetUserId?: string, operatorUser?: any) {
    // Throws ForbiddenException if this is the protected default admin, or
    // BadRequestException if it's the last remaining active admin.
    const userToDelete = await this.validateMinAdminRule(id, 'delete');

    if (!targetUserId) {
      throw new BadRequestException(
        `User Data Re-assignment Required: Please select an active user or admin to transfer all records owned by ${userToDelete.full_name} before deleting this account.`,
      );
    }

    if (targetUserId === id) {
      throw new BadRequestException('The data-transfer target must be a different, active team member.');
    }

    const targetUser = await this.prisma.user.findFirst({
      where: { id: targetUserId, deleted_at: null, status: 'ACTIVE' },
    });

    if (!targetUser) {
      throw new NotFoundException(`Target transfer user with ID ${targetUserId} not found or inactive.`);
    }

    return await this.txService.run(async (tx) => {
      const updatedSuppliers = await tx.supplier.updateMany({
        where: { created_by: id },
        data: { created_by: targetUserId },
      });

      const updatedBuyers = await tx.buyer.updateMany({
        where: { created_by: id },
        data: { created_by: targetUserId },
      });

      const updatedProducts = await tx.product.updateMany({
        where: { created_by: id },
        data: { created_by: targetUserId },
      });

      const updatedInquiries = await tx.inquiryConsignment.updateMany({
        where: { created_by: id },
        data: { created_by: targetUserId },
      });

      await tx.auditLog.create({
        data: {
          company_id: '11111111-1111-1111-1111-111111111111',
          user_id: targetUser.id,
          user_name: targetUser.full_name,
          entity_name: 'USER_DATA_TRANSFER',
          entity_id: targetUser.id,
          action: 'DATA_REASSIGNMENT_INHERITED',
          after_state: {
            description: `Received ${updatedSuppliers.count + updatedBuyers.count + updatedProducts.count + updatedInquiries.count} record(s) transferred from deleted user "${userToDelete.full_name}" (${updatedSuppliers.count} supplier(s), ${updatedBuyers.count} buyer(s), ${updatedProducts.count} product(s), ${updatedInquiries.count} inquiry consignment(s))`,
            transferredFrom: userToDelete.full_name,
            transferredFromUserId: userToDelete.id,
            suppliersTransferred: updatedSuppliers.count,
            buyersTransferred: updatedBuyers.count,
            productsTransferred: updatedProducts.count,
            inquiriesTransferred: updatedInquiries.count,
          },
        },
      });

      await tx.auditLog.create({
        data: {
          company_id: '11111111-1111-1111-1111-111111111111',
          user_id: userToDelete.id,
          user_name: userToDelete.full_name,
          entity_name: 'USER',
          entity_id: userToDelete.id,
          action: 'USER_ACCOUNT_DELETED_DATA_TRANSFERRED',
          after_state: {
            description: `Account "${userToDelete.full_name}" deleted by ${operatorUser?.full_name || 'Administrator'}. All owned records transferred to "${targetUser.full_name}".`,
            transferredTo: targetUser.full_name,
            transferredToUserId: targetUser.id,
            operator: operatorUser?.full_name || 'Administrator',
          },
        },
      });

      // Revoke every active session belonging to the deleted user immediately,
      // so any access/refresh token they're still holding stops working the
      // instant they're removed (belt-and-braces alongside JwtStrategy's
      // deleted_at / status checks on every request).
      await tx.userSession.updateMany({
        where: { user_id: userToDelete.id },
        data: { is_active: false },
      });

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