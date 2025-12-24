import { Model } from 'mongoose';
import type { TenantRole, RoleTemplate } from '../schemas';

// ════════════════════════════════════════════════════════════════
// TenantRole Operations (db_tenant_{slug}.tenant_roles)
//
// Estas operaciones gestionan los roles de un tenant especifico.
// Los roles se inicializan desde RoleTemplate al crear el tenant.
// ════════════════════════════════════════════════════════════════

export interface CreateTenantRoleInput {
  slug: string;
  name: string;
  description?: string;
  allowedApps: ('dashboard' | 'webapp')[];
  isSuperRole?: boolean;
  isDefault?: boolean;
  permissions?: Record<string, unknown>;
}

export interface UpdateTenantRoleInput {
  name?: string;
  description?: string;
  allowedApps?: ('dashboard' | 'webapp')[];
  isActive?: boolean;
  isDefault?: boolean;
  permissions?: Record<string, unknown>;
  sortOrder?: number;
}

/**
 * Lista todos los roles de un tenant.
 *
 * @param tenantRoleModel - Mongoose TenantRole Model (del tenant)
 * @param options - Opciones de filtrado
 * @returns Array de roles ordenados por sortOrder
 */
export async function listTenantRoles(
  tenantRoleModel: Model<TenantRole>,
  options: {
    includeInactive?: boolean;
    onlyCustom?: boolean;
  } = {}
): Promise<TenantRole[]> {
  const filter: Record<string, unknown> = {};

  if (!options.includeInactive) {
    filter['isActive'] = true;
  }

  if (options.onlyCustom) {
    filter['isCustom'] = true;
  }

  return tenantRoleModel.find(filter).sort({ sortOrder: 1, createdAt: 1 }).lean();
}

/**
 * Obtiene un rol por slug.
 *
 * @param tenantRoleModel - Mongoose TenantRole Model
 * @param slug - Slug del rol
 * @returns Rol o null si no existe
 */
export async function getTenantRoleBySlug(
  tenantRoleModel: Model<TenantRole>,
  slug: string
): Promise<TenantRole | null> {
  return tenantRoleModel.findOne({ slug }).lean();
}

/**
 * Obtiene el rol default del tenant (para self-registration).
 *
 * @param tenantRoleModel - Mongoose TenantRole Model
 * @returns Rol default o null si no hay ninguno
 */
export async function getDefaultTenantRole(
  tenantRoleModel: Model<TenantRole>
): Promise<TenantRole | null> {
  return tenantRoleModel.findOne({ isDefault: true, isActive: true }).lean();
}

/**
 * Crea un rol custom para el tenant.
 *
 * @param tenantRoleModel - Mongoose TenantRole Model
 * @param input - Datos del rol
 * @returns Rol creado
 */
export async function createTenantRole(
  tenantRoleModel: Model<TenantRole>,
  input: CreateTenantRoleInput
): Promise<TenantRole> {
  // Si se marca como default, quitar default de otros roles
  if (input.isDefault) {
    await tenantRoleModel.updateMany({ isDefault: true }, { $set: { isDefault: false } });
  }

  const role = await tenantRoleModel.create({
    ...input,
    templateSlug: undefined, // No viene de template
    isFromTemplate: false,
    isCustom: true,
    isActive: true,
    isSuperRole: input.isSuperRole ?? false,
    isDefault: input.isDefault ?? false,
    permissions: input.permissions ?? {},
    sortOrder: 100, // Roles custom van al final
  });

  return role.toObject();
}

/**
 * Actualiza un rol del tenant.
 *
 * @param tenantRoleModel - Mongoose TenantRole Model
 * @param slug - Slug del rol
 * @param updates - Campos a actualizar
 * @returns Rol actualizado o null si no existe
 */
export async function updateTenantRole(
  tenantRoleModel: Model<TenantRole>,
  slug: string,
  updates: UpdateTenantRoleInput
): Promise<TenantRole | null> {
  // Si se marca como default, quitar default de otros roles
  if (updates.isDefault === true) {
    await tenantRoleModel.updateMany(
      { slug: { $ne: slug }, isDefault: true },
      { $set: { isDefault: false } }
    );
  }

  return tenantRoleModel
    .findOneAndUpdate({ slug }, { $set: updates }, { new: true, runValidators: true })
    .lean();
}

/**
 * Elimina un rol custom (no se pueden eliminar roles de template).
 *
 * @param tenantRoleModel - Mongoose TenantRole Model
 * @param slug - Slug del rol
 * @returns Resultado de la eliminacion
 */
export async function deleteTenantRole(
  tenantRoleModel: Model<TenantRole>,
  slug: string
): Promise<{ deleted: boolean; reason?: string }> {
  const role = await tenantRoleModel.findOne({ slug });

  if (!role) {
    return { deleted: false, reason: 'Role not found' };
  }

  if (role.isFromTemplate) {
    return { deleted: false, reason: 'Cannot delete template-based roles' };
  }

  if (role.isDefault) {
    return { deleted: false, reason: 'Cannot delete the default role' };
  }

  const result = await tenantRoleModel.deleteOne({ slug, isCustom: true });
  return { deleted: result.deletedCount > 0 };
}

/**
 * Inicializa roles del tenant desde templates.
 * Llamar al crear un nuevo tenant.
 *
 * @param tenantRoleModel - Mongoose TenantRole Model
 * @param templates - Array de RoleTemplate a copiar
 * @returns Array de roles creados
 */
export async function initializeTenantRolesFromTemplates(
  tenantRoleModel: Model<TenantRole>,
  templates: RoleTemplate[]
): Promise<TenantRole[]> {
  const roles = templates.map((template, index) => ({
    templateSlug: template.slug,
    slug: template.slug,
    name: template.name,
    description: template.description,
    allowedApps: template.defaultAllowedApps,
    isSuperRole: template.isSuperRole,
    isDefault: template.isDefault,
    isActive: true,
    isFromTemplate: true,
    isCustom: false,
    permissions: template.basePermissions || {},
    sortOrder: index,
  }));

  const created = await tenantRoleModel.insertMany(roles);
  return created.map((r) => r.toObject());
}

/**
 * Actualiza el fusionauthRoleId despues de sync con FusionAuth.
 *
 * @param tenantRoleModel - Mongoose TenantRole Model
 * @param slug - Slug del rol
 * @param fusionauthRoleId - ID del rol en FusionAuth
 * @param appType - Tipo de app ('dashboard' | 'webapp')
 * @returns Rol actualizado o null
 */
export async function updateTenantRoleFusionAuthId(
  tenantRoleModel: Model<TenantRole>,
  slug: string,
  fusionauthRoleId: string,
  appType: 'dashboard' | 'webapp'
): Promise<TenantRole | null> {
  const updatePath = `fusionauthRoleIds.${appType}`;
  return tenantRoleModel
    .findOneAndUpdate({ slug }, { $set: { [updatePath]: fusionauthRoleId } }, { new: true })
    .lean();
}

/**
 * Cuenta el numero de roles del tenant.
 *
 * @param tenantRoleModel - Mongoose TenantRole Model
 * @param filter - Filtro opcional
 * @returns Numero de roles
 */
export async function countTenantRoles(
  tenantRoleModel: Model<TenantRole>,
  filter: Record<string, unknown> = {}
): Promise<number> {
  return tenantRoleModel.countDocuments(filter);
}
