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
import { Public, RequireTenant, Roles } from '@serveflow/auth/server';
import type { TenantRole } from '@serveflow/db';
import type { TenantRequest } from '@serveflow/tenants';
import type { Model } from 'mongoose';
import { CreateRoleDto, RolesService, UpdateRoleDto } from './roles.service';

// ════════════════════════════════════════════════════════════════
// Roles Controller
//
// API REST para gestionar roles del tenant.
// Los roles definen a que apps puede acceder un usuario.
//
// Endpoints:
// - GET    /api/roles           Lista roles del tenant
// - GET    /api/roles/:slug     Obtiene un rol por slug
// - POST   /api/roles           Crea un nuevo rol custom
// - PUT    /api/roles/:slug     Actualiza un rol
// - DELETE /api/roles/:slug     Elimina un rol (solo custom)
// - POST   /api/roles/sync      Sincroniza con FusionAuth
// ════════════════════════════════════════════════════════════════

@Controller('roles')
@RequireTenant()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /**
   * Helper to get TenantRole model from connection.
   */
  private getTenantRoleModel(req: TenantRequest): Model<TenantRole> {
    return req.mongooseConnection.model<TenantRole>('TenantRole');
  }

  /**
   * GET /api/roles/allowed-apps
   * Endpoint PÚBLICO para que el middleware pueda verificar allowedApps.
   * Retorna solo slug y allowedApps de cada rol (sin info sensible).
   */
  @Get('allowed-apps')
  @Public()
  async getAllowedApps(@Req() req: TenantRequest) {
    const tenantRoleModel = this.getTenantRoleModel(req);

    const roles = await this.rolesService.findAll(tenantRoleModel, {
      includeInactive: false,
    });

    // Solo retornar slug y allowedApps para el middleware
    const allowedAppsMap = roles.map((role) => ({
      slug: role.slug,
      allowedApps: role.allowedApps,
    }));

    return {
      success: true,
      data: allowedAppsMap,
    };
  }

  /**
   * GET /api/roles
   * Lista todos los roles del tenant.
   */
  @Get()
  async findAll(@Req() req: TenantRequest, @Query('includeInactive') includeInactive?: string) {
    const tenantRoleModel = this.getTenantRoleModel(req);

    const roles = await this.rolesService.findAll(tenantRoleModel, {
      includeInactive: includeInactive === 'true',
    });

    return {
      success: true,
      data: roles,
    };
  }

  /**
   * GET /api/roles/:slug
   * Obtiene un rol por slug.
   */
  @Get(':slug')
  async findOne(@Req() req: TenantRequest, @Param('slug') slug: string) {
    const tenantRoleModel = this.getTenantRoleModel(req);

    const role = await this.rolesService.findBySlug(tenantRoleModel, slug);

    return {
      success: true,
      data: role,
    };
  }

  /**
   * POST /api/roles
   * Crea un nuevo rol custom.
   * Solo admins pueden crear roles.
   */
  @Post()
  @Roles('admin')
  async create(@Req() req: TenantRequest, @Body() dto: CreateRoleDto) {
    const tenantRoleModel = this.getTenantRoleModel(req);
    const { tenant } = req;

    const role = await this.rolesService.create(tenantRoleModel, tenant.fusionauthApplications, dto);

    return {
      success: true,
      data: role,
      message: 'Role created successfully',
    };
  }

  /**
   * PUT /api/roles/:slug
   * Actualiza un rol existente.
   * Solo admins pueden actualizar roles.
   */
  @Put(':slug')
  @Roles('admin')
  async update(@Req() req: TenantRequest, @Param('slug') slug: string, @Body() dto: UpdateRoleDto) {
    const tenantRoleModel = this.getTenantRoleModel(req);

    const role = await this.rolesService.update(tenantRoleModel, slug, dto);

    return {
      success: true,
      data: role,
      message: 'Role updated successfully',
    };
  }

  /**
   * DELETE /api/roles/:slug
   * Elimina un rol custom.
   * Solo admins pueden eliminar roles.
   */
  @Delete(':slug')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async remove(@Req() req: TenantRequest, @Param('slug') slug: string) {
    const tenantRoleModel = this.getTenantRoleModel(req);
    const { tenant } = req;

    await this.rolesService.remove(tenantRoleModel, tenant.fusionauthApplications, slug);

    return {
      success: true,
      message: 'Role deleted successfully',
    };
  }

  /**
   * POST /api/roles/sync
   * Sincroniza todos los roles con FusionAuth.
   * Solo admins pueden sincronizar roles.
   */
  @Post('sync')
  @Roles('admin')
  async sync(@Req() req: TenantRequest) {
    const tenantRoleModel = this.getTenantRoleModel(req);
    const { tenant } = req;

    const result = await this.rolesService.syncWithFusionAuth(tenantRoleModel, tenant.fusionauthApplications);

    return {
      success: result.errors.length === 0,
      data: {
        synced: result.synced,
        errors: result.errors,
      },
      message: result.errors.length === 0 ? `Synced ${result.synced} roles with FusionAuth` : 'Sync completed with errors',
    };
  }
}
