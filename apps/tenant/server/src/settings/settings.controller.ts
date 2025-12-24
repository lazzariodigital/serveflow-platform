import { Body, Controller, Get, Put, Req } from '@nestjs/common';
import { Public, RequireTenant, Roles } from '@serveflow/auth/server';
import type { TenantRequest } from '@serveflow/tenants';
import { SettingsService, UpdateDashboardConfigDto, UpdateWebappConfigDto } from './settings.service';

// ════════════════════════════════════════════════════════════════
// Settings Controller
//
// API REST para gestionar configuración de apps del tenant.
// Estas configuraciones definen rutas y permisos para dashboard/webapp.
//
// Endpoints:
// - GET    /api/settings/dashboard-config   Obtiene config dashboard (público para middleware)
// - PUT    /api/settings/dashboard-config   Actualiza config dashboard (solo admin)
// - GET    /api/settings/webapp-config      Obtiene config webapp (público para middleware)
// - PUT    /api/settings/webapp-config      Actualiza config webapp (solo admin)
// ════════════════════════════════════════════════════════════════

@Controller('settings')
@RequireTenant()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * GET /api/settings/dashboard-config
   * Endpoint PÚBLICO para que el middleware pueda obtener la configuración.
   */
  @Get('dashboard-config')
  @Public()
  async getDashboardConfig(@Req() req: TenantRequest) {
    const config = await this.settingsService.getDashboardConfig(req.tenant.slug);

    return {
      success: true,
      data: config,
    };
  }

  /**
   * PUT /api/settings/dashboard-config
   * Actualiza la configuración del dashboard.
   * Solo admins pueden modificar.
   */
  @Put('dashboard-config')
  @Roles('admin')
  async updateDashboardConfig(
    @Req() req: TenantRequest,
    @Body() dto: UpdateDashboardConfigDto
  ) {
    const config = await this.settingsService.updateDashboardConfig(req.tenant.slug, dto);

    return {
      success: true,
      data: config,
      message: 'Dashboard configuration updated successfully',
    };
  }

  /**
   * GET /api/settings/webapp-config
   * Endpoint PÚBLICO para que el middleware pueda obtener la configuración.
   */
  @Get('webapp-config')
  @Public()
  async getWebappConfig(@Req() req: TenantRequest) {
    const config = await this.settingsService.getWebappConfig(req.tenant.slug);

    return {
      success: true,
      data: config,
    };
  }

  /**
   * PUT /api/settings/webapp-config
   * Actualiza la configuración del webapp.
   * Solo admins pueden modificar.
   */
  @Put('webapp-config')
  @Roles('admin')
  async updateWebappConfig(
    @Req() req: TenantRequest,
    @Body() dto: UpdateWebappConfigDto
  ) {
    const config = await this.settingsService.updateWebappConfig(req.tenant.slug, dto);

    return {
      success: true,
      data: config,
      message: 'Webapp configuration updated successfully',
    };
  }
}
