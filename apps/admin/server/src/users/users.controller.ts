import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import type { AuthenticatedUser } from '@serveflow/auth';
import { CurrentUser, Public, Roles } from '@serveflow/auth/server';
import {
  CreateAdminUserDto,
  ListUsersQuery,
  UpdateAdminUserDto,
  UpdateUserRolesDto,
  UsersService,
} from './users.service';

// ════════════════════════════════════════════════════════════════
// Users Controller (Admin API)
// ════════════════════════════════════════════════════════════════
// Manages admin users and can view users from any tenant
// ════════════════════════════════════════════════════════════════

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ════════════════════════════════════════════════════════════════
  // Admin Users (serveflow-admin tenant)
  // ════════════════════════════════════════════════════════════════

  /**
   * GET /api/users/admin
   * List all admin users
   */
  @Get('admin')
  async listAdminUsers(@Query() query: ListUsersQuery) {
    const { users, total } = await this.usersService.listAdminUsers({
      query: query.query,
      limit: query.limit ? Number(query.limit) : 25,
      offset: query.offset ? Number(query.offset) : 0,
    });

    return {
      data: users,
      meta: {
        total,
        limit: query.limit || 25,
        offset: query.offset || 0,
      },
    };
  }

  /**
   * POST /api/users/admin
   * Create a new admin user
   *
   * NOTE: Temporarily @Public() for initial setup.
   * TODO: Re-enable @Roles('admin') after first admin is created.
   */
  @Post('admin')
  @Public()
  // @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  async createAdminUser(@Body() dto: CreateAdminUserDto) {
    console.log(`[UsersController] Creating admin user: ${dto.email}`);

    const user = await this.usersService.createAdminUser(dto);

    return {
      data: user,
      message: 'Admin user created successfully',
    };
  }

  // ════════════════════════════════════════════════════════════════
  // Tenant Users (view users from any tenant)
  // ════════════════════════════════════════════════════════════════

  /**
   * GET /api/users/tenant/:tenantId
   * List users from a specific tenant
   */
  @Get('tenant/:tenantId')
  async listTenantUsers(
    @Param('tenantId') tenantId: string,
    @Query() query: ListUsersQuery
  ) {
    const { users, total } = await this.usersService.listTenantUsers(tenantId, {
      query: query.query,
      limit: query.limit ? Number(query.limit) : 25,
      offset: query.offset ? Number(query.offset) : 0,
    });

    return {
      data: users,
      meta: {
        total,
        limit: query.limit || 25,
        offset: query.offset || 0,
        tenantId,
      },
    };
  }

  // ════════════════════════════════════════════════════════════════
  // Current User
  // ════════════════════════════════════════════════════════════════

  /**
   * GET /api/users/me
   * Get the current authenticated admin user
   */
  @Get('me')
  async getMe(@CurrentUser() currentUser: AuthenticatedUser) {
    const user = await this.usersService.getById(currentUser.fusionauthUserId);
    return { success: true, data: user };
  }

  // ════════════════════════════════════════════════════════════════
  // User Operations (any user)
  // ════════════════════════════════════════════════════════════════

  /**
   * GET /api/users/:userId
   * Get a user by ID
   */
  @Get(':userId')
  async getById(@Param('userId') userId: string) {
    const user = await this.usersService.getById(userId);
    return { data: user };
  }

  /**
   * GET /api/users/email/:email
   * Get a user by email
   */
  @Get('email/:email')
  async getByEmail(@Param('email') email: string) {
    const user = await this.usersService.getByEmail(email);
    return { data: user };
  }

  /**
   * PUT /api/users/:userId
   * Update a user
   */
  @Put(':userId')
  async update(
    @Param('userId') userId: string,
    @Body() dto: UpdateAdminUserDto,
    @CurrentUser() currentUser: AuthenticatedUser
  ) {
    console.log(`[UsersController] Updating user: ${userId} by ${currentUser.email}`);

    const user = await this.usersService.update(userId, dto);

    return {
      data: user,
      message: 'User updated successfully',
    };
  }

  /**
   * PUT /api/users/:userId/roles/:applicationId
   * Update user roles for an application
   */
  @Put(':userId/roles/:applicationId')
  @Roles('admin')
  async updateRoles(
    @Param('userId') userId: string,
    @Param('applicationId') applicationId: string,
    @Body() dto: UpdateUserRolesDto,
    @CurrentUser() currentUser: AuthenticatedUser
  ) {
    console.log(
      `[UsersController] Updating roles for user ${userId} by ${currentUser.email}`
    );

    await this.usersService.updateRoles(userId, applicationId, dto.roles);

    return {
      message: 'User roles updated successfully',
    };
  }

  /**
   * POST /api/users/:userId/deactivate
   * Deactivate a user (soft delete)
   */
  @Post(':userId/deactivate')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async deactivate(
    @Param('userId') userId: string,
    @CurrentUser() currentUser: AuthenticatedUser
  ) {
    console.log(`[UsersController] Deactivating user: ${userId} by ${currentUser.email}`);

    await this.usersService.deactivate(userId);

    return {
      message: 'User deactivated successfully',
    };
  }

  /**
   * POST /api/users/:userId/reactivate
   * Reactivate a user
   */
  @Post(':userId/reactivate')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async reactivate(
    @Param('userId') userId: string,
    @CurrentUser() currentUser: AuthenticatedUser
  ) {
    console.log(`[UsersController] Reactivating user: ${userId} by ${currentUser.email}`);

    await this.usersService.reactivate(userId);

    return {
      message: 'User reactivated successfully',
    };
  }

  /**
   * DELETE /api/users/:userId
   * Delete a user permanently
   */
  @Delete(':userId')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('userId') userId: string,
    @CurrentUser() currentUser: AuthenticatedUser
  ) {
    console.log(`[UsersController] Deleting user: ${userId} by ${currentUser.email}`);

    await this.usersService.delete(userId);
  }
}
