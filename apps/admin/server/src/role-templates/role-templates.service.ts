import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import {
  RoleTemplate,
  listRoleTemplates,
  getRoleTemplateBySlug,
  createRoleTemplate,
  updateRoleTemplate,
  deleteRoleTemplate,
} from '@serveflow/db';

// ════════════════════════════════════════════════════════════════
// DTOs
// ════════════════════════════════════════════════════════════════

export interface CreateRoleTemplateDto {
  slug: string;
  name: string;
  description: string;
  defaultAllowedApps: ('dashboard' | 'webapp')[];
  isSuperRole: boolean;
  isDefault: boolean;
  isSystemTemplate?: boolean;
  basePermissions?: Record<string, unknown>;
  sortOrder?: number;
}

export interface UpdateRoleTemplateDto {
  name?: string;
  description?: string;
  defaultAllowedApps?: ('dashboard' | 'webapp')[];
  isSuperRole?: boolean;
  isDefault?: boolean;
  basePermissions?: Record<string, unknown>;
  sortOrder?: number;
}

// ════════════════════════════════════════════════════════════════
// Default Role Templates for Seeding
// ════════════════════════════════════════════════════════════════

const DEFAULT_ROLE_TEMPLATES: CreateRoleTemplateDto[] = [
  {
    slug: 'admin',
    name: 'Administrador',
    description: 'Acceso completo a todas las funcionalidades del tenant',
    defaultAllowedApps: ['dashboard'],
    isSuperRole: true,
    isDefault: false,
    isSystemTemplate: true,
    sortOrder: 0,
    basePermissions: {
      '*': ['*'], // Full access
    },
  },
  {
    slug: 'employee',
    name: 'Empleado',
    description: 'Personal interno con acceso al dashboard de gestion',
    defaultAllowedApps: ['dashboard'],
    isSuperRole: false,
    isDefault: false,
    isSystemTemplate: true,
    sortOrder: 1,
    basePermissions: {
      dashboard: ['read', 'write'],
      reports: ['read'],
    },
  },
  {
    slug: 'provider',
    name: 'Proveedor',
    description: 'Proveedores de servicios externos (coaches, instructores, etc)',
    defaultAllowedApps: ['webapp'],
    isSuperRole: false,
    isDefault: false,
    isSystemTemplate: true,
    sortOrder: 2,
    basePermissions: {
      webapp: ['read', 'write'],
      schedule: ['read', 'write'],
    },
  },
  {
    slug: 'client',
    name: 'Cliente',
    description: 'Usuarios finales que acceden a la webapp publica',
    defaultAllowedApps: ['webapp'],
    isSuperRole: false,
    isDefault: true, // Default role for new users (self-registration)
    isSystemTemplate: true,
    sortOrder: 3,
    basePermissions: {
      webapp: ['read'],
      bookings: ['read', 'write'],
      profile: ['read', 'write'],
    },
  },
];

// ════════════════════════════════════════════════════════════════
// Service
// ════════════════════════════════════════════════════════════════

@Injectable()
export class RoleTemplatesService {
  constructor(
    @InjectModel(RoleTemplate.name) private roleTemplateModel: Model<RoleTemplate>
  ) {}

  /**
   * List all role templates
   */
  async list(): Promise<RoleTemplate[]> {
    return listRoleTemplates(this.roleTemplateModel);
  }

  /**
   * Get a single role template by slug
   */
  async getBySlug(slug: string): Promise<RoleTemplate> {
    const template = await getRoleTemplateBySlug(this.roleTemplateModel, slug);
    if (!template) {
      throw new NotFoundException(`Role template with slug '${slug}' not found`);
    }
    return template;
  }

  /**
   * Create a new role template
   */
  async create(dto: CreateRoleTemplateDto): Promise<RoleTemplate> {
    const existing = await getRoleTemplateBySlug(this.roleTemplateModel, dto.slug);
    if (existing) {
      throw new ConflictException(`Role template with slug '${dto.slug}' already exists`);
    }

    const template = await createRoleTemplate(this.roleTemplateModel, dto);
    console.log(`[RoleTemplatesService] Role template created: ${template.slug}`);
    return template;
  }

  /**
   * Update a role template
   */
  async update(slug: string, dto: UpdateRoleTemplateDto): Promise<RoleTemplate> {
    const existing = await getRoleTemplateBySlug(this.roleTemplateModel, slug);
    if (!existing) {
      throw new NotFoundException(`Role template with slug '${slug}' not found`);
    }

    const template = await updateRoleTemplate(this.roleTemplateModel, slug, dto);
    if (!template) {
      throw new NotFoundException(`Role template with slug '${slug}' not found`);
    }

    console.log(`[RoleTemplatesService] Role template updated: ${slug}`);
    return template;
  }

  /**
   * Delete a role template
   */
  async delete(slug: string): Promise<void> {
    const existing = await getRoleTemplateBySlug(this.roleTemplateModel, slug);
    if (!existing) {
      throw new NotFoundException(`Role template with slug '${slug}' not found`);
    }

    if (existing.isSystemTemplate) {
      throw new ConflictException(`Cannot delete system role template '${slug}'`);
    }

    const deleted = await deleteRoleTemplate(this.roleTemplateModel, slug);
    if (!deleted) {
      throw new NotFoundException(`Role template with slug '${slug}' not found`);
    }

    console.log(`[RoleTemplatesService] Role template deleted: ${slug}`);
  }

  /**
   * Seed default role templates
   * Inserts or updates the 4 default role templates
   */
  async seed(): Promise<{
    created: string[];
    updated: string[];
    total: number;
  }> {
    const created: string[] = [];
    const updated: string[] = [];

    for (const template of DEFAULT_ROLE_TEMPLATES) {
      const existing = await getRoleTemplateBySlug(this.roleTemplateModel, template.slug);

      if (existing) {
        // Update existing template (preserve basePermissions customizations)
        await updateRoleTemplate(this.roleTemplateModel, template.slug, {
          name: template.name,
          description: template.description,
          defaultAllowedApps: template.defaultAllowedApps,
          isSuperRole: template.isSuperRole,
          isDefault: template.isDefault,
          sortOrder: template.sortOrder,
          // Note: We don't overwrite basePermissions to preserve customizations
        });
        updated.push(template.slug);
      } else {
        // Create new template
        await createRoleTemplate(this.roleTemplateModel, template);
        created.push(template.slug);
      }
    }

    const total = await this.roleTemplateModel.countDocuments();

    console.log(`[RoleTemplatesService] Seed completed: ${created.length} created, ${updated.length} updated`);

    return { created, updated, total };
  }
}
