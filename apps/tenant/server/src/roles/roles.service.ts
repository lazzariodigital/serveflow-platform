import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import type { Model } from 'mongoose';
import {
  listTenantRoles,
  getTenantRoleBySlug,
  createTenantRole,
  updateTenantRole,
  deleteTenantRole,
  updateTenantRoleFusionAuthId,
  type TenantRole,
} from '@serveflow/db';
import { addApplicationRole, removeApplicationRole, updateApplicationRoles } from '@serveflow/auth';

// ════════════════════════════════════════════════════════════════
// Roles Service
//
// Gestiona los roles de un tenant.
// Sincroniza los cambios con FusionAuth Applications (Dashboard + WebApp).
// ════════════════════════════════════════════════════════════════

export interface FusionAuthApps {
  dashboard: { id: string };
  webapp: { id: string };
}

export interface CreateRoleDto {
  slug: string;
  name: string;
  description?: string;
  allowedApps: ('dashboard' | 'webapp')[];
  isDefault?: boolean;
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  allowedApps?: ('dashboard' | 'webapp')[];
  isActive?: boolean;
  isDefault?: boolean;
}

@Injectable()
export class RolesService {
  /**
   * Lista todos los roles del tenant.
   */
  async findAll(
    tenantRoleModel: Model<TenantRole>,
    options: { includeInactive?: boolean } = {}
  ): Promise<TenantRole[]> {
    return listTenantRoles(tenantRoleModel, options);
  }

  /**
   * Obtiene un rol por slug.
   */
  async findBySlug(tenantRoleModel: Model<TenantRole>, slug: string): Promise<TenantRole> {
    const role = await getTenantRoleBySlug(tenantRoleModel, slug);
    if (!role) {
      throw new NotFoundException(`Role "${slug}" not found`);
    }
    return role;
  }

  /**
   * Crea un nuevo rol custom.
   * Sincroniza con las aplicaciones FusionAuth correspondientes según allowedApps.
   */
  async create(
    tenantRoleModel: Model<TenantRole>,
    fusionauthApps: FusionAuthApps,
    dto: CreateRoleDto
  ): Promise<TenantRole> {
    // Check if slug already exists
    const existing = await getTenantRoleBySlug(tenantRoleModel, dto.slug);
    if (existing) {
      throw new ConflictException(`Role with slug "${dto.slug}" already exists`);
    }

    const fusionauthRoleIds: { dashboard?: string; webapp?: string } = {};
    const errors: string[] = [];

    // Create role in each allowed FusionAuth application
    for (const appType of dto.allowedApps) {
      const appId = fusionauthApps[appType].id;

      try {
        console.log(`[RolesService] Creating role "${dto.slug}" in FusionAuth app ${appType} (${appId})`);

        const faRole = await addApplicationRole(appId, {
          name: dto.slug,
          description: dto.description,
          isDefault: dto.isDefault,
        });

        if (faRole) {
          fusionauthRoleIds[appType] = faRole.id;
          console.log(`[RolesService] Role "${dto.slug}" created in ${appType} with id: ${faRole.id}`);
        } else {
          errors.push(`Failed to create role in ${appType}: addApplicationRole returned null`);
          console.error(`[RolesService] addApplicationRole returned null for ${appType}`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to create role in ${appType}: ${errorMsg}`);
        console.error(`[RolesService] Error creating role in ${appType}:`, error);
      }
    }

    // If no roles were created in FusionAuth, fail early
    if (Object.keys(fusionauthRoleIds).length === 0) {
      throw new BadRequestException(
        `Failed to create role in FusionAuth: ${errors.join('; ')}`
      );
    }

    // Create in MongoDB
    const role = await createTenantRole(tenantRoleModel, {
      slug: dto.slug,
      name: dto.name,
      description: dto.description,
      allowedApps: dto.allowedApps,
      isDefault: dto.isDefault,
    });

    // Update with FusionAuth IDs
    for (const [appType, roleId] of Object.entries(fusionauthRoleIds)) {
      await updateTenantRoleFusionAuthId(
        tenantRoleModel,
        dto.slug,
        roleId,
        appType as 'dashboard' | 'webapp'
      );
    }

    return {
      ...role,
      fusionauthRoleIds,
    };
  }

  /**
   * Actualiza un rol existente.
   */
  async update(tenantRoleModel: Model<TenantRole>, slug: string, dto: UpdateRoleDto): Promise<TenantRole> {
    const existing = await getTenantRoleBySlug(tenantRoleModel, slug);
    if (!existing) {
      throw new NotFoundException(`Role "${slug}" not found`);
    }

    const updated = await updateTenantRole(tenantRoleModel, slug, dto);
    if (!updated) {
      throw new NotFoundException(`Role "${slug}" not found after update`);
    }

    return updated;
  }

  /**
   * Elimina un rol custom.
   * Elimina de todas las aplicaciones FusionAuth donde existe.
   */
  async remove(
    tenantRoleModel: Model<TenantRole>,
    fusionauthApps: FusionAuthApps,
    slug: string
  ): Promise<void> {
    const existing = await getTenantRoleBySlug(tenantRoleModel, slug);
    if (!existing) {
      throw new NotFoundException(`Role "${slug}" not found`);
    }

    // Remove from all FusionAuth applications where role exists
    if (existing.fusionauthRoleIds) {
      for (const appType of ['dashboard', 'webapp'] as const) {
        if (existing.fusionauthRoleIds[appType]) {
          try {
            await removeApplicationRole(fusionauthApps[appType].id, slug);
          } catch (error) {
            console.warn(`[RolesService] Failed to remove role from ${appType}:`, error);
          }
        }
      }
    }

    // Remove from MongoDB
    const result = await deleteTenantRole(tenantRoleModel, slug);

    if (!result.deleted) {
      throw new BadRequestException(result.reason || 'Cannot delete role');
    }
  }

  /**
   * Sincroniza roles del tenant con ambas aplicaciones FusionAuth.
   */
  async syncWithFusionAuth(
    tenantRoleModel: Model<TenantRole>,
    fusionauthApps: FusionAuthApps
  ): Promise<{ synced: number; errors: string[] }> {
    const roles = await listTenantRoles(tenantRoleModel, { includeInactive: false });
    const errors: string[] = [];
    let totalSynced = 0;

    // Sync each application separately
    for (const appType of ['dashboard', 'webapp'] as const) {
      const appId = fusionauthApps[appType].id;

      // Filter roles that belong to this application
      const appRoles = roles.filter((role) => role.allowedApps.includes(appType));
      const rolesToSync = appRoles.map((role) => ({
        name: role.slug,
        description: role.description,
        isDefault: role.isDefault,
        isSuperRole: role.isSuperRole,
      }));

      try {
        const faRoles = await updateApplicationRoles({
          applicationId: appId,
          roles: rolesToSync,
        });

        // Update fusionauthRoleIds for each role
        for (const faRole of faRoles) {
          const localRole = appRoles.find((r) => r.slug === faRole.name);
          if (localRole && !localRole.fusionauthRoleIds?.[appType]) {
            await updateTenantRoleFusionAuthId(tenantRoleModel, faRole.name, faRole.id, appType);
          }
        }

        totalSynced += faRoles.length;
      } catch (error) {
        errors.push(`Sync ${appType} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { synced: totalSynced, errors };
  }
}
