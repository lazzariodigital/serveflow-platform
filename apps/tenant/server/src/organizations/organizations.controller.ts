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
  UseGuards,
} from '@nestjs/common';
import { RequireTenant, Roles } from '@serveflow/auth/server';
import { CerbosGuard, CheckPermission } from '@serveflow/authorization/server';
import type { Organization } from '@serveflow/db';
import type { TenantRequest } from '@serveflow/tenants';
import type { Model } from 'mongoose';
import {
  CreateOrganizationDto,
  OrganizationsService,
  UpdateOrganizationDto,
} from './organizations.service';

// ════════════════════════════════════════════════════════════════
// Organizations Controller
//
// API REST para gestionar organizaciones (sedes/sucursales) del tenant.
//
// Endpoints:
// - GET    /api/organizations           Lista organizaciones
// - GET    /api/organizations/accessible Lista orgs accesibles por el usuario
// - GET    /api/organizations/:slug     Obtiene una organización por slug
// - POST   /api/organizations           Crea una nueva organización (solo admin)
// - PUT    /api/organizations/:slug     Actualiza una organización (solo admin)
// - DELETE /api/organizations/:slug     Elimina una organización (solo admin)
// - POST   /api/organizations/:slug/deactivate  Desactiva (solo admin)
// - POST   /api/organizations/:slug/reactivate  Reactiva (solo admin)
// ════════════════════════════════════════════════════════════════

@Controller('organizations')
@RequireTenant()
@UseGuards(CerbosGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  /**
   * Helper to get Organization model from request.
   */
  private getOrganizationModel(req: TenantRequest): Model<Organization> {
    return req.organizationModel;
  }

  /**
   * GET /api/organizations/list
   * Endpoint PÚBLICO para que el middleware pueda obtener la lista de orgs.
   * Retorna solo id, slug y name (sin info sensible).
   */
  @Get('list')
  async getOrganizationList(@Req() req: TenantRequest) {
    const orgModel = this.getOrganizationModel(req);

    const orgs = await this.organizationsService.findAll(orgModel, {
      includeInactive: false,
    });

    // Solo retornar id, slug y name para el frontend
    const list = orgs.map((org) => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      id: (org as any)._id?.toString() || '',
      slug: org.slug,
      name: org.name,
    }));

    return {
      success: true,
      data: list,
    };
  }

  /**
   * GET /api/organizations
   * Lista todas las organizaciones del tenant.
   */
  @Get()
  @CheckPermission({ resource: 'organization', action: 'list' })
  async findAll(
    @Req() req: TenantRequest,
    @Query('includeInactive') includeInactive?: string,
    @Query('city') city?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const orgModel = this.getOrganizationModel(req);

    const orgs = await this.organizationsService.findAll(orgModel, {
      includeInactive: includeInactive === 'true',
      city,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    return {
      success: true,
      data: orgs,
      count: orgs.length,
    };
  }

  /**
   * GET /api/organizations/accessible
   * Lista organizaciones accesibles por el usuario autenticado.
   * Si el usuario tiene organizationIds: [], retorna todas.
   */
  @Get('accessible')
  async findAccessible(
    @Req() req: TenantRequest,
    @Query('includeInactive') includeInactive?: string
  ) {
    const orgModel = this.getOrganizationModel(req);

    // Get user's organizationIds from JWT claims
    // NOTE: This requires JWT to include organizationIds via Lambda
    const userOrganizationIds: string[] =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (req as any).user?.organizationIds || [];

    const orgs = await this.organizationsService.findAccessible(
      orgModel,
      userOrganizationIds,
      { includeInactive: includeInactive === 'true' }
    );

    const hasFullAccess = userOrganizationIds.length === 0;

    return {
      success: true,
      data: orgs,
      count: orgs.length,
      hasFullAccess,
    };
  }

  /**
   * GET /api/organizations/:slug
   * Obtiene una organización por slug.
   */
  @Get(':slug')
  @CheckPermission({ resource: 'organization', action: 'view', idParam: 'slug' })
  async findOne(@Req() req: TenantRequest, @Param('slug') slug: string) {
    const orgModel = this.getOrganizationModel(req);

    const org = await this.organizationsService.findBySlug(orgModel, slug);

    return {
      success: true,
      data: org,
    };
  }

  /**
   * POST /api/organizations
   * Crea una nueva organización.
   * Solo admins pueden crear organizaciones.
   */
  @Post()
  @CheckPermission({ resource: 'organization', action: 'create' })
  @Roles('admin')
  async create(@Req() req: TenantRequest, @Body() dto: CreateOrganizationDto) {
    const orgModel = this.getOrganizationModel(req);

    const org = await this.organizationsService.create(orgModel, dto);

    return {
      success: true,
      data: org,
      message: 'Organization created successfully',
    };
  }

  /**
   * PUT /api/organizations/:slug
   * Actualiza una organización existente.
   * Solo admins pueden actualizar organizaciones.
   */
  @Put(':slug')
  @CheckPermission({ resource: 'organization', action: 'update', idParam: 'slug' })
  @Roles('admin')
  async update(
    @Req() req: TenantRequest,
    @Param('slug') slug: string,
    @Body() dto: UpdateOrganizationDto
  ) {
    const orgModel = this.getOrganizationModel(req);

    const org = await this.organizationsService.update(orgModel, slug, dto);

    return {
      success: true,
      data: org,
      message: 'Organization updated successfully',
    };
  }

  /**
   * DELETE /api/organizations/:slug
   * Elimina una organización.
   * Solo admins pueden eliminar organizaciones.
   */
  @Delete(':slug')
  @CheckPermission({ resource: 'organization', action: 'delete', idParam: 'slug' })
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async remove(@Req() req: TenantRequest, @Param('slug') slug: string) {
    const orgModel = this.getOrganizationModel(req);

    await this.organizationsService.remove(orgModel, slug);

    return {
      success: true,
      message: 'Organization deleted successfully',
    };
  }

  /**
   * POST /api/organizations/:slug/deactivate
   * Desactiva una organización (soft delete).
   * Solo admins pueden desactivar organizaciones.
   */
  @Post(':slug/deactivate')
  @CheckPermission({ resource: 'organization', action: 'update', idParam: 'slug' })
  @Roles('admin')
  async deactivate(@Req() req: TenantRequest, @Param('slug') slug: string) {
    const orgModel = this.getOrganizationModel(req);

    const org = await this.organizationsService.deactivate(orgModel, slug);

    return {
      success: true,
      data: org,
      message: 'Organization deactivated successfully',
    };
  }

  /**
   * POST /api/organizations/:slug/reactivate
   * Reactiva una organización previamente desactivada.
   * Solo admins pueden reactivar organizaciones.
   */
  @Post(':slug/reactivate')
  @CheckPermission({ resource: 'organization', action: 'update', idParam: 'slug' })
  @Roles('admin')
  async reactivate(@Req() req: TenantRequest, @Param('slug') slug: string) {
    const orgModel = this.getOrganizationModel(req);

    const org = await this.organizationsService.reactivate(orgModel, slug);

    return {
      success: true,
      data: org,
      message: 'Organization reactivated successfully',
    };
  }

  /**
   * GET /api/organizations/count
   * Cuenta el número de organizaciones.
   */
  @Get('stats/count')
  async count(
    @Req() req: TenantRequest,
    @Query('isActive') isActive?: string
  ) {
    const orgModel = this.getOrganizationModel(req);

    const filter: { isActive?: boolean } = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const count = await this.organizationsService.count(orgModel, filter);

    return {
      success: true,
      data: { count },
    };
  }
}
