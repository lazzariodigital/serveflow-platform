import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Roles, CurrentUser } from '@serveflow/auth/server';
import type { AuthenticatedUser } from '@serveflow/auth';
import {
  TenantsService,
  CreateTenantDto,
  UpdateTenantDto,
  ListTenantsQuery,
} from './tenants.service';

// ════════════════════════════════════════════════════════════════
// Tenants Controller (Admin API)
// ════════════════════════════════════════════════════════════════
// All endpoints require admin authentication (FusionAuthGuard global)
// ════════════════════════════════════════════════════════════════

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  /**
   * GET /api/tenants
   * List all tenants with optional filtering
   */
  @Get()
  async list(@Query() query: ListTenantsQuery) {
    const { tenants, total } = await this.tenantsService.list({
      status: query.status,
      limit: query.limit ? Number(query.limit) : 100,
      skip: query.skip ? Number(query.skip) : 0,
    });

    return {
      data: tenants,
      meta: {
        total,
        limit: query.limit || 100,
        skip: query.skip || 0,
      },
    };
  }

  /**
   * GET /api/tenants/:slug
   * Get a single tenant by slug
   */
  @Get(':slug')
  async getBySlug(@Param('slug') slug: string) {
    const tenant = await this.tenantsService.getBySlug(slug);
    return { data: tenant };
  }

  /**
   * POST /api/tenants
   * Create a new tenant with FusionAuth integration
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateTenantDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    console.log(`[TenantsController] Creating tenant: ${dto.name} by ${user.email}`);

    const tenant = await this.tenantsService.create(dto);

    return {
      data: tenant,
      message: 'Tenant created successfully',
    };
  }

  /**
   * PUT /api/tenants/:slug
   * Update a tenant
   */
  @Put(':slug')
  async update(
    @Param('slug') slug: string,
    @Body() dto: UpdateTenantDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    console.log(`[TenantsController] Updating tenant: ${slug} by ${user.email}`);

    const tenant = await this.tenantsService.update(slug, dto);

    return {
      data: tenant,
      message: 'Tenant updated successfully',
    };
  }

  /**
   * DELETE /api/tenants/:slug
   * Delete a tenant (including FusionAuth cleanup)
   */
  @Delete(':slug')
  @Roles('admin') // Only platform admins can delete tenants
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    console.log(`[TenantsController] Deleting tenant: ${slug} by ${user.email}`);

    await this.tenantsService.delete(slug);
  }
}
