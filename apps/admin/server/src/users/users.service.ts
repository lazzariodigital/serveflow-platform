import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  assignUserRoles,
  createFusionAuthUser,
  deactivateFusionAuthUser,
  deleteFusionAuthUser,
  getFusionAuthUser,
  reactivateFusionAuthUser,
  removeUserRoles,
  searchFusionAuthUsers,
  updateFusionAuthUser,
} from '@serveflow/auth';
import { GlobalUser } from '@serveflow/db';
import type { FusionAuthUser } from '@serveflow/auth';

// ════════════════════════════════════════════════════════════════
// DTOs
// ════════════════════════════════════════════════════════════════

export interface CreateAdminUserDto {
  email: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  roles?: string[];
  sendSetPasswordEmail?: boolean;
}

export interface UpdateAdminUserDto {
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  mobilePhone?: string;
}

export interface ListUsersQuery {
  tenantId?: string;
  query?: string;
  limit?: number;
  offset?: number;
}

export interface UpdateUserRolesDto {
  roles: string[];
}

// ════════════════════════════════════════════════════════════════
// Service
// ════════════════════════════════════════════════════════════════

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(GlobalUser.name) private globalUserModel: Model<GlobalUser>
  ) {}

  // Admin tenant/app IDs from environment
  private get adminTenantId(): string {
    const id = process.env['NEXT_PUBLIC_FUSIONAUTH_ADMIN_TENANT_ID'] ||
               process.env['FUSIONAUTH_ADMIN_TENANT_ID'];
    if (!id) {
      throw new BadRequestException('Admin tenant ID not configured');
    }
    return id;
  }

  private get adminApplicationId(): string {
    const id = process.env['NEXT_PUBLIC_FUSIONAUTH_ADMIN_APPLICATION_ID'] ||
               process.env['FUSIONAUTH_ADMIN_APPLICATION_ID'];
    if (!id) {
      throw new BadRequestException('Admin application ID not configured');
    }
    return id;
  }

  /**
   * List admin users (from MongoDB global_users)
   */
  async listAdminUsers(query: ListUsersQuery = {}): Promise<{
    users: GlobalUser[];
    total: number;
  }> {
    const filter: Record<string, unknown> = {};

    if (query.query) {
      filter['$or'] = [
        { email: { $regex: query.query, $options: 'i' } },
        { firstName: { $regex: query.query, $options: 'i' } },
        { lastName: { $regex: query.query, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.globalUserModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.offset || 0)
        .limit(query.limit || 25)
        .lean(),
      this.globalUserModel.countDocuments(filter),
    ]);

    return { users: users as GlobalUser[], total };
  }

  /**
   * List users for a specific tenant (from FusionAuth)
   */
  async listTenantUsers(
    tenantId: string,
    query: ListUsersQuery = {}
  ): Promise<{
    users: FusionAuthUser[];
    total: number;
  }> {
    const users = await searchFusionAuthUsers({
      tenantId,
      queryString: query.query || '*',
      numberOfResults: query.limit || 25,
      startRow: query.offset || 0,
    });

    return {
      users,
      total: users.length,
    };
  }

  /**
   * Get an admin user by ID (from MongoDB)
   */
  async getById(userId: string): Promise<GlobalUser> {
    const user = await this.globalUserModel.findOne({ fusionauthUserId: userId }).lean();
    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }
    return user as GlobalUser;
  }

  /**
   * Get an admin user by email (from MongoDB)
   */
  async getByEmail(email: string): Promise<GlobalUser> {
    const user = await this.globalUserModel.findOne({ email: email.toLowerCase() }).lean();
    if (!user) {
      throw new NotFoundException(`User with email '${email}' not found`);
    }
    return user as GlobalUser;
  }

  /**
   * Create a new admin user (in FusionAuth + MongoDB)
   */
  async createAdminUser(dto: CreateAdminUserDto): Promise<GlobalUser> {
    const tenantId = this.adminTenantId;
    const applicationId = this.adminApplicationId;

    console.log(`[UsersService] Creating admin user: ${dto.email}`);
    console.log(`[UsersService] Using tenantId: ${tenantId}`);
    console.log(`[UsersService] Using applicationId: ${applicationId}`);

    // Check if user already exists in MongoDB
    const existing = await this.globalUserModel.findOne({
      email: dto.email.toLowerCase()
    });
    if (existing) {
      throw new BadRequestException(`User with email '${dto.email}' already exists`);
    }

    // 1. Create user in FusionAuth
    const faUser = await createFusionAuthUser({
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      password: dto.password,
      tenantId,
      applicationId,
      roles: dto.roles || ['admin'],
      sendSetPasswordEmail: dto.sendSetPasswordEmail ?? !dto.password,
    });

    // 2. Create GlobalUser in MongoDB
    const globalUser = await this.globalUserModel.create({
      fusionauthUserId: faUser.id,
      email: dto.email.toLowerCase(),
      firstName: dto.firstName || '',
      lastName: dto.lastName || '',
      status: 'active',
      accessibleTenants: [], // Admin can access all tenants
    });

    console.log(`[UsersService] Admin user created: ${globalUser.email} (FA: ${faUser.id}, Mongo: ${globalUser._id})`);

    return globalUser.toObject() as GlobalUser;
  }

  /**
   * Update an admin user (FusionAuth + MongoDB)
   */
  async update(userId: string, dto: UpdateAdminUserDto): Promise<GlobalUser> {
    // Verify user exists in MongoDB
    const existing = await this.globalUserModel.findOne({ fusionauthUserId: userId });
    if (!existing) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    // Update FusionAuth
    await updateFusionAuthUser(userId, dto);

    // Update MongoDB
    const updates: Record<string, unknown> = {};
    if (dto.firstName) updates['firstName'] = dto.firstName;
    if (dto.lastName) updates['lastName'] = dto.lastName;
    if (dto.imageUrl) updates['imageUrl'] = dto.imageUrl;

    const user = await this.globalUserModel.findOneAndUpdate(
      { fusionauthUserId: userId },
      { $set: updates },
      { new: true }
    ).lean();

    console.log(`[UsersService] User updated: ${userId}`);
    return user as GlobalUser;
  }

  /**
   * Deactivate an admin user (soft delete)
   */
  async deactivate(userId: string): Promise<void> {
    // Verify user exists
    const existing = await this.globalUserModel.findOne({ fusionauthUserId: userId });
    if (!existing) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    // Deactivate in FusionAuth
    await deactivateFusionAuthUser(userId);

    // Update status in MongoDB
    await this.globalUserModel.updateOne(
      { fusionauthUserId: userId },
      { $set: { status: 'inactive' } }
    );

    console.log(`[UsersService] User deactivated: ${userId}`);
  }

  /**
   * Reactivate an admin user
   */
  async reactivate(userId: string): Promise<void> {
    // Verify user exists
    const existing = await this.globalUserModel.findOne({ fusionauthUserId: userId });
    if (!existing) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    // Reactivate in FusionAuth
    await reactivateFusionAuthUser(userId);

    // Update status in MongoDB
    await this.globalUserModel.updateOne(
      { fusionauthUserId: userId },
      { $set: { status: 'active' } }
    );

    console.log(`[UsersService] User reactivated: ${userId}`);
  }

  /**
   * Delete an admin user permanently (FusionAuth + MongoDB)
   */
  async delete(userId: string): Promise<void> {
    // Verify user exists
    const existing = await this.globalUserModel.findOne({ fusionauthUserId: userId });
    if (!existing) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    // Delete from FusionAuth
    await deleteFusionAuthUser(userId);

    // Delete from MongoDB
    await this.globalUserModel.deleteOne({ fusionauthUserId: userId });

    console.log(`[UsersService] User deleted: ${userId}`);
  }

  /**
   * Update user roles for an application (FusionAuth only)
   */
  async updateRoles(
    userId: string,
    applicationId: string,
    roles: string[]
  ): Promise<void> {
    // Get current user from FusionAuth to verify
    const user = await getFusionAuthUser(userId);
    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' not found in FusionAuth`);
    }

    // Find current registration
    const registration = user.registrations?.find(
      (r) => r.applicationId === applicationId
    );

    if (!registration) {
      throw new BadRequestException(
        `User is not registered for application ${applicationId}`
      );
    }

    // Calculate roles to add and remove
    const currentRoles = registration.roles || [];
    const rolesToAdd = roles.filter((r) => !currentRoles.includes(r));
    const rolesToRemove = currentRoles.filter((r) => !roles.includes(r));

    // Apply changes
    if (rolesToRemove.length > 0) {
      await removeUserRoles(userId, applicationId, rolesToRemove);
    }
    if (rolesToAdd.length > 0) {
      await assignUserRoles(userId, applicationId, rolesToAdd);
    }

    console.log(`[UsersService] User roles updated: ${userId} -> [${roles.join(', ')}]`);
  }
}
