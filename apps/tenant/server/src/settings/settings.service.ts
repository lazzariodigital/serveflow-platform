import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import type { DashboardConfig, WebappConfig, RouteConfig } from '@serveflow/core';
import { MongooseConnectionService } from '@serveflow/db';

// ════════════════════════════════════════════════════════════════
// Settings Service
//
// Gestiona la configuración de apps (dashboard y webapp) del tenant.
// Estas configuraciones definen las rutas disponibles y sus permisos.
// ════════════════════════════════════════════════════════════════

export interface UpdateRouteDto {
  path: string;
  label?: string;
  icon?: string;
  allowedRoles?: string[];
  isEnabled?: boolean;
  order?: number;
}

export interface UpdateDashboardConfigDto {
  routes?: UpdateRouteDto[];
  defaultRoute?: string;
}

export interface UpdateWebappConfigDto {
  routes?: UpdateRouteDto[];
  defaultRoute?: string;
}

@Injectable()
export class SettingsService {
  constructor(private readonly mongooseConnection: MongooseConnectionService) {}

  /**
   * Get dashboard configuration for a tenant.
   */
  async getDashboardConfig(tenantSlug: string): Promise<DashboardConfig> {
    const tenantModel = await this.mongooseConnection.getTenantModel();
    const tenant = await tenantModel.findOne({ slug: tenantSlug }).lean();
    if (!tenant) {
      throw new NotFoundException(`Tenant "${tenantSlug}" not found`);
    }

    if (!tenant.dashboardConfig) {
      throw new BadRequestException('Dashboard configuration not initialized for this tenant');
    }

    return tenant.dashboardConfig as DashboardConfig;
  }

  /**
   * Get webapp configuration for a tenant.
   */
  async getWebappConfig(tenantSlug: string): Promise<WebappConfig> {
    const tenantModel = await this.mongooseConnection.getTenantModel();
    const tenant = await tenantModel.findOne({ slug: tenantSlug }).lean();
    if (!tenant) {
      throw new NotFoundException(`Tenant "${tenantSlug}" not found`);
    }

    if (!tenant.webappConfig) {
      throw new BadRequestException('Webapp configuration not initialized for this tenant');
    }

    return tenant.webappConfig as WebappConfig;
  }

  /**
   * Update dashboard configuration for a tenant.
   */
  async updateDashboardConfig(
    tenantSlug: string,
    dto: UpdateDashboardConfigDto
  ): Promise<DashboardConfig> {
    const tenantModel = await this.mongooseConnection.getTenantModel();
    const tenant = await tenantModel.findOne({ slug: tenantSlug });
    if (!tenant) {
      throw new NotFoundException(`Tenant "${tenantSlug}" not found`);
    }

    const currentConfig = tenant.dashboardConfig as DashboardConfig;
    if (!currentConfig) {
      throw new BadRequestException('Dashboard configuration not initialized for this tenant');
    }

    // Update routes if provided
    let updatedRoutes = currentConfig.routes;
    if (dto.routes) {
      updatedRoutes = this.mergeRoutes(currentConfig.routes, dto.routes);
    }

    // Update default route if provided
    const updatedDefaultRoute = dto.defaultRoute ?? currentConfig.defaultRoute;

    // Validate default route exists in routes
    if (!updatedRoutes.find((r) => r.path === updatedDefaultRoute)) {
      throw new BadRequestException(`Default route "${updatedDefaultRoute}" not found in routes`);
    }

    const newConfig: DashboardConfig = {
      routes: updatedRoutes,
      defaultRoute: updatedDefaultRoute,
    };

    await tenantModel.updateOne(
      { slug: tenantSlug },
      { $set: { dashboardConfig: newConfig } }
    );

    return newConfig;
  }

  /**
   * Update webapp configuration for a tenant.
   */
  async updateWebappConfig(
    tenantSlug: string,
    dto: UpdateWebappConfigDto
  ): Promise<WebappConfig> {
    const tenantModel = await this.mongooseConnection.getTenantModel();
    const tenant = await tenantModel.findOne({ slug: tenantSlug });
    if (!tenant) {
      throw new NotFoundException(`Tenant "${tenantSlug}" not found`);
    }

    const currentConfig = tenant.webappConfig as WebappConfig;
    if (!currentConfig) {
      throw new BadRequestException('Webapp configuration not initialized for this tenant');
    }

    // Update routes if provided
    let updatedRoutes = currentConfig.routes;
    if (dto.routes) {
      updatedRoutes = this.mergeRoutes(currentConfig.routes, dto.routes);
    }

    // Update default route if provided
    const updatedDefaultRoute = dto.defaultRoute ?? currentConfig.defaultRoute;

    // Validate default route exists in routes
    if (!updatedRoutes.find((r) => r.path === updatedDefaultRoute)) {
      throw new BadRequestException(`Default route "${updatedDefaultRoute}" not found in routes`);
    }

    const newConfig: WebappConfig = {
      routes: updatedRoutes,
      defaultRoute: updatedDefaultRoute,
    };

    await tenantModel.updateOne(
      { slug: tenantSlug },
      { $set: { webappConfig: newConfig } }
    );

    return newConfig;
  }

  /**
   * Merge route updates with existing routes.
   * Routes are matched by path.
   */
  private mergeRoutes(
    existingRoutes: RouteConfig[],
    updates: UpdateRouteDto[]
  ): RouteConfig[] {
    const routeMap = new Map<string, RouteConfig>();

    // Add existing routes to map
    for (const route of existingRoutes) {
      routeMap.set(route.path, { ...route });
    }

    // Apply updates
    for (const update of updates) {
      const existing = routeMap.get(update.path);
      if (existing) {
        // Update existing route
        routeMap.set(update.path, {
          ...existing,
          label: update.label ?? existing.label,
          icon: update.icon ?? existing.icon,
          allowedRoles: update.allowedRoles ?? existing.allowedRoles,
          isEnabled: update.isEnabled ?? existing.isEnabled,
          order: update.order ?? existing.order,
        });
      }
      // Note: We don't add new routes, only update existing ones
      // Adding new routes would require full RouteConfig validation
    }

    // Sort by order and return
    return Array.from(routeMap.values()).sort((a, b) => a.order - b.order);
  }
}
