import { Model } from 'mongoose';
import type { RoleTemplate } from '../schemas';

// ════════════════════════════════════════════════════════════════
// RoleTemplate Operations (db_serveflow_sys.role_templates)
//
// Estas operaciones gestionan las plantillas de roles del sistema.
// Los role_templates se copian a cada tenant al crearlo.
// ════════════════════════════════════════════════════════════════

export interface RoleTemplateInput {
  slug: string;
  name: string;
  description: string;
  defaultAllowedApps: ('dashboard' | 'webapp')[];
  isSuperRole: boolean;
  isDefault: boolean;
  basePermissions?: Record<string, unknown>;
  isSystemTemplate?: boolean;
  sortOrder?: number;
}

/**
 * Lista todos los role templates del sistema.
 *
 * @param roleTemplateModel - Mongoose RoleTemplate Model
 * @param options - Opciones de filtrado
 * @returns Array de role templates ordenados por sortOrder
 */
export async function listRoleTemplates(
  roleTemplateModel: Model<RoleTemplate>,
  options: { includeNonSystem?: boolean } = {}
): Promise<RoleTemplate[]> {
  const filter: Record<string, unknown> = {};

  // Por defecto solo muestra system templates
  if (!options.includeNonSystem) {
    filter['isSystemTemplate'] = true;
  }

  return roleTemplateModel.find(filter).sort({ sortOrder: 1 }).lean();
}

/**
 * Obtiene un role template por slug.
 *
 * @param roleTemplateModel - Mongoose RoleTemplate Model
 * @param slug - Slug del template (ej: "admin")
 * @returns Role template o null si no existe
 */
export async function getRoleTemplateBySlug(
  roleTemplateModel: Model<RoleTemplate>,
  slug: string
): Promise<RoleTemplate | null> {
  return roleTemplateModel.findOne({ slug }).lean();
}

/**
 * Crea un nuevo role template.
 *
 * @param roleTemplateModel - Mongoose RoleTemplate Model
 * @param input - Datos del template
 * @returns Role template creado
 */
export async function createRoleTemplate(
  roleTemplateModel: Model<RoleTemplate>,
  input: RoleTemplateInput
): Promise<RoleTemplate> {
  const template = await roleTemplateModel.create({
    ...input,
    isSystemTemplate: input.isSystemTemplate ?? false,
    basePermissions: input.basePermissions ?? {},
    sortOrder: input.sortOrder ?? 0,
  });
  return template.toObject();
}

/**
 * Actualiza un role template existente.
 *
 * @param roleTemplateModel - Mongoose RoleTemplate Model
 * @param slug - Slug del template
 * @param updates - Campos a actualizar
 * @returns Role template actualizado o null si no existe
 */
export async function updateRoleTemplate(
  roleTemplateModel: Model<RoleTemplate>,
  slug: string,
  updates: Partial<RoleTemplateInput>
): Promise<RoleTemplate | null> {
  return roleTemplateModel
    .findOneAndUpdate({ slug }, { $set: updates }, { new: true, runValidators: true })
    .lean();
}

/**
 * Elimina un role template (solo si no es system template).
 *
 * @param roleTemplateModel - Mongoose RoleTemplate Model
 * @param slug - Slug del template
 * @returns true si se elimino, false si no existe o es system template
 */
export async function deleteRoleTemplate(
  roleTemplateModel: Model<RoleTemplate>,
  slug: string
): Promise<boolean> {
  const result = await roleTemplateModel.deleteOne({
    slug,
    isSystemTemplate: false,
  });
  return result.deletedCount > 0;
}

/**
 * Cuenta el numero de role templates.
 *
 * @param roleTemplateModel - Mongoose RoleTemplate Model
 * @param filter - Filtro opcional
 * @returns Numero de templates
 */
export async function countRoleTemplates(
  roleTemplateModel: Model<RoleTemplate>,
  filter: Record<string, unknown> = {}
): Promise<number> {
  return roleTemplateModel.countDocuments(filter);
}
