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
  Req,
} from '@nestjs/common';
import type { AuthenticatedUser } from '@serveflow/auth';
import { CurrentUser, Public, RequireTenant, Roles } from '@serveflow/auth/server';
import {
  CreateUserRequest,
  CreateUserRequestSchema,
  ListUsersRequest,
  ListUsersRequestSchema,
  UpdateUserRequest,
  UpdateUserRequestSchema,
  ZodValidationPipe,
} from '@serveflow/core';
import type { TenantRequest } from '@serveflow/tenants';
import { getTenantRoleBySlug } from '@serveflow/db';
import { getOrganizationFilter } from '@serveflow/authorization/server';
import { UsersService } from './users.service';

// ════════════════════════════════════════════════════════════════
// Users Controller
//
// Endpoints para gestión de usuarios del tenant.
// Todos los endpoints requieren autenticación (FusionAuthGuard aplicado globalmente).
//
// MIGRACIÓN MONGOOSE: Ahora extrae userModel del request (inyectado por TenantMiddleware)
// ════════════════════════════════════════════════════════════════

@Controller('users')
@RequireTenant() // Todos los endpoints requieren tenant
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * POST /api/users
   * Crea un nuevo usuario.
   * Only admins can create users.
   *
   * Según 03-PERMISOS.md sección 5.1:
   * - roles: Qué ES el usuario (admin, employee, provider, client)
   * - appAccess: A qué apps tiene acceso (opcional - se deriva de los roles si no se proporciona)
   * - organizationIds: En qué organizaciones está
   */
  @Post('')
  @Public()
  // @Roles('admin')
  async create(
    @Req() req: TenantRequest,
    @Body(new ZodValidationPipe(CreateUserRequestSchema)) dto: CreateUserRequest
  ) {
    const { userModel, tenantRoleModel, tenant } = req;

    // ════════════════════════════════════════════════════════════════
    // Determinar appAccess: Explícito (override) o derivado de roles
    // ════════════════════════════════════════════════════════════════
    let effectiveAppAccess: ('dashboard' | 'webapp')[];

    if (dto.appAccess && dto.appAccess.length > 0) {
      // Override: usar appAccess explícito
      effectiveAppAccess = dto.appAccess;
    } else {
      // Derivar de roles: buscar allowedApps de cada rol en tenant_roles
      const appAccessSet = new Set<'dashboard' | 'webapp'>();

      for (const roleSlug of dto.roles) {
        const tenantRole = await getTenantRoleBySlug(tenantRoleModel, roleSlug);
        if (tenantRole?.allowedApps) {
          tenantRole.allowedApps.forEach((app) => appAccessSet.add(app));
        }
      }

      effectiveAppAccess = Array.from(appAccessSet);

      // Fallback si no se encontraron roles configurados: usar lógica default
      if (effectiveAppAccess.length === 0) {
        const hasDashboardRole = dto.roles.some((r) => ['admin', 'employee'].includes(r));
        const hasWebappRole = dto.roles.some((r) => ['provider', 'client'].includes(r));
        if (hasDashboardRole) effectiveAppAccess.push('dashboard');
        if (hasWebappRole) effectiveAppAccess.push('webapp');
      }
    }

    // ════════════════════════════════════════════════════════════════
    // Build FusionAuth registrations from effectiveAppAccess
    // ════════════════════════════════════════════════════════════════
    const applications: { id: string; roles: string[] }[] = [];

    if (effectiveAppAccess.includes('dashboard')) {
      // Filter roles that are allowed in dashboard (admin, employee)
      const dashboardRoles = dto.roles.filter((r) => r === 'admin' || r === 'employee');
      if (dashboardRoles.length > 0) {
        applications.push({
          id: tenant.fusionauthApplications.dashboard.id,
          roles: dashboardRoles,
        });
      }
    }

    if (effectiveAppAccess.includes('webapp')) {
      // Filter roles that are allowed in webapp (provider, client)
      const webappRoles = dto.roles.filter((r) => r === 'provider' || r === 'client');
      if (webappRoles.length > 0) {
        applications.push({
          id: tenant.fusionauthApplications.webapp.id,
          roles: webappRoles,
        });
      }
    }

    const user = await this.usersService.createWithMultipleApps(
      userModel,
      tenant.fusionauthTenantId,
      tenant.slug,
      applications,
      dto
    );

    return {
      success: true,
      data: user,
      message: 'User created successfully',
    };
  }

  /**
   * GET /api/users
   * Lista todos los usuarios del tenant con paginación y filtros.
   *
   * Organization Filtering (Hito 2):
   * - Si el usuario tiene organizationIds: [], ve todos los usuarios
   * - Si tiene organizationIds limitados, solo ve usuarios de esas orgs
   * - Si se pide organizationId específico, valida acceso primero
   */
  @Get()
  async findAll(
    @Req() req: TenantRequest,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query(new ZodValidationPipe(ListUsersRequestSchema)) query: ListUsersRequest
  ) {
    const { userModel } = req;

    // Get organization filter based on current user's access
    // This validates that the user can access the requested organizationId
    // and returns the appropriate filter for the query
    const orgFilter = getOrganizationFilter(
      currentUser.organizationIds,
      query.organizationId
    );

    // Apply organization filter to query
    const filteredQuery: ListUsersRequest = {
      ...query,
      // Use the effective organizationId from the filter
      // If orgFilter is empty, don't filter by org (user has full access)
      // If orgFilter has $in, the service will need to handle it
      organizationId: orgFilter.organizationId
        ? typeof orgFilter.organizationId === 'string'
          ? orgFilter.organizationId
          : undefined // Handle $in case in service if needed
        : undefined,
    };

    const result = await this.usersService.findAll(userModel, filteredQuery);

    return {
      success: true,
      data: result.users,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
        hasFullAccess: currentUser.organizationIds.length === 0,
      },
    };
  }

  /**
   * GET /api/users/me
   * Obtiene el perfil del usuario actual.
   */
  @Get('me')
  async getMe(@Req() req: TenantRequest, @CurrentUser() user: AuthenticatedUser) {
    const { userModel, tenant } = req;

    console.log(`[UsersController.getMe] fusionauthUserId: ${user.fusionauthUserId}, tenant: ${tenant?.slug}`);

    const dbUser = await this.usersService.findByFusionauthId(userModel, user.fusionauthUserId);

    console.log(`[UsersController.getMe] dbUser found: ${!!dbUser}`);

    return {
      success: true,
      data: dbUser,
    };
  }

  /**
   * GET /api/users/:fusionauthUserId
   * Obtiene un usuario específico por su FusionAuth User ID.
   */
  @Get(':fusionauthUserId')
  async findOne(@Req() req: TenantRequest, @Param('fusionauthUserId') fusionauthUserId: string) {
    const { userModel } = req;

    const user = await this.usersService.findByFusionauthId(userModel, fusionauthUserId);

    return {
      success: true,
      data: user,
    };
  }

  /**
   * PUT /api/users/:fusionauthUserId
   * Actualiza un usuario.
   * Solo admins pueden actualizar usuarios.
   */
  @Put(':fusionauthUserId')
  @Roles('admin')
  async update(
    @Req() req: TenantRequest,
    @Param('fusionauthUserId') fusionauthUserId: string,
    @Body(new ZodValidationPipe(UpdateUserRequestSchema)) dto: UpdateUserRequest
  ) {
    const { userModel } = req;

    const user = await this.usersService.update(userModel, fusionauthUserId, dto);

    return {
      success: true,
      data: user,
      message: 'User updated successfully',
    };
  }

  /**
   * DELETE /api/users/:fusionauthUserId/archive
   * Archiva un usuario (soft delete).
   * Solo admins pueden archivar usuarios.
   */
  @Delete(':fusionauthUserId/archive')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async archive(@Req() req: TenantRequest, @Param('fusionauthUserId') fusionauthUserId: string) {
    const { userModel } = req;

    const user = await this.usersService.archive(userModel, fusionauthUserId);

    return {
      success: true,
      data: user,
      message: 'User archived successfully',
    };
  }

  /**
   * DELETE /api/users/:fusionauthUserId
   * Elimina permanentemente un usuario.
   * Solo admins pueden eliminar usuarios.
   */
  @Delete(':fusionauthUserId')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Req() req: TenantRequest, @Param('fusionauthUserId') fusionauthUserId: string) {
    const { userModel } = req;

    await this.usersService.remove(userModel, fusionauthUserId);

    // No content response
    return;
  }
}
