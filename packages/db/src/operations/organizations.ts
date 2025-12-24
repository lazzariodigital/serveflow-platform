import { Model } from 'mongoose';
import type { Organization } from '../schemas';

// ════════════════════════════════════════════════════════════════
// Organization Operations (db_tenant_{slug}.organizations)
//
// Estas operaciones gestionan las organizaciones (sedes/sucursales)
// de un tenant específico.
//
// Key principle: organizationIds: [] en un usuario significa
// acceso a TODAS las organizaciones.
// ════════════════════════════════════════════════════════════════

export interface CreateOrganizationInput {
  slug: string;
  name: string;
  description?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  contact?: {
    phone?: string;
    email?: string;
  };
  settings?: {
    timezone: string;
    currency: string;
    businessHours?: Record<string, unknown>;
  };
}

export interface UpdateOrganizationInput {
  name?: string;
  description?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  contact?: {
    phone?: string;
    email?: string;
  };
  settings?: {
    timezone?: string;
    currency?: string;
    businessHours?: Record<string, unknown>;
  };
  isActive?: boolean;
}

export interface ListOrganizationsOptions {
  includeInactive?: boolean;
  city?: string;
  limit?: number;
  offset?: number;
}

/**
 * Lista todas las organizaciones de un tenant.
 *
 * @param organizationModel - Mongoose Organization Model (del tenant)
 * @param options - Opciones de filtrado
 * @returns Array de organizaciones ordenadas por nombre
 *
 * @example
 * ```typescript
 * const orgs = await listOrganizations(orgModel, { includeInactive: false });
 * ```
 */
export async function listOrganizations(
  organizationModel: Model<Organization>,
  options: ListOrganizationsOptions = {}
): Promise<Organization[]> {
  const filter: Record<string, unknown> = {};

  if (!options.includeInactive) {
    filter['isActive'] = true;
  }

  if (options.city) {
    filter['address.city'] = options.city;
  }

  let query = organizationModel.find(filter).sort({ name: 1 });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.skip(options.offset);
  }

  return query.lean();
}

/**
 * Lista organizaciones por sus IDs.
 * Útil para obtener las organizaciones a las que tiene acceso un usuario.
 *
 * @param organizationModel - Mongoose Organization Model
 * @param organizationIds - Array de IDs de organización
 * @param options - Opciones adicionales
 * @returns Array de organizaciones
 *
 * @example
 * ```typescript
 * // Si organizationIds está vacío, devuelve TODAS las organizaciones
 * const orgs = await listOrganizationsByIds(orgModel, user.organizationIds);
 * ```
 */
export async function listOrganizationsByIds(
  organizationModel: Model<Organization>,
  organizationIds: string[],
  options: { includeInactive?: boolean } = {}
): Promise<Organization[]> {
  const filter: Record<string, unknown> = {};

  // Empty array means access to ALL organizations
  if (organizationIds.length > 0) {
    filter['_id'] = { $in: organizationIds };
  }

  if (!options.includeInactive) {
    filter['isActive'] = true;
  }

  return organizationModel.find(filter).sort({ name: 1 }).lean();
}

/**
 * Obtiene una organización por slug.
 *
 * @param organizationModel - Mongoose Organization Model
 * @param slug - Slug de la organización
 * @returns Organización o null si no existe
 */
export async function getOrganizationBySlug(
  organizationModel: Model<Organization>,
  slug: string
): Promise<Organization | null> {
  return organizationModel.findOne({ slug }).lean();
}

/**
 * Obtiene una organización por ID.
 *
 * @param organizationModel - Mongoose Organization Model
 * @param organizationId - ID de la organización
 * @returns Organización o null si no existe
 */
export async function getOrganizationById(
  organizationModel: Model<Organization>,
  organizationId: string
): Promise<Organization | null> {
  return organizationModel.findById(organizationId).lean();
}

/**
 * Crea una nueva organización.
 *
 * @param organizationModel - Mongoose Organization Model
 * @param input - Datos de la organización
 * @returns Organización creada
 *
 * @example
 * ```typescript
 * const org = await createOrganization(orgModel, {
 *   slug: 'madrid-centro',
 *   name: 'Madrid Centro',
 *   address: { city: 'Madrid', country: 'Spain' },
 *   settings: { timezone: 'Europe/Madrid', currency: 'EUR' }
 * });
 * ```
 */
export async function createOrganization(
  organizationModel: Model<Organization>,
  input: CreateOrganizationInput
): Promise<Organization> {
  const org = await organizationModel.create({
    ...input,
    isActive: true,
    settings: input.settings ?? {
      timezone: 'Europe/Madrid',
      currency: 'EUR',
    },
  });

  return org.toObject();
}

/**
 * Actualiza una organización.
 *
 * @param organizationModel - Mongoose Organization Model
 * @param slug - Slug de la organización
 * @param updates - Campos a actualizar
 * @returns Organización actualizada o null si no existe
 */
export async function updateOrganization(
  organizationModel: Model<Organization>,
  slug: string,
  updates: UpdateOrganizationInput
): Promise<Organization | null> {
  // Build update object, handling nested settings
  const updateObj: Record<string, unknown> = {};

  if (updates['name'] !== undefined) updateObj['name'] = updates['name'];
  if (updates['description'] !== undefined) updateObj['description'] = updates['description'];
  if (updates['address'] !== undefined) updateObj['address'] = updates['address'];
  if (updates['contact'] !== undefined) updateObj['contact'] = updates['contact'];
  if (updates['isActive'] !== undefined) updateObj['isActive'] = updates['isActive'];

  // Handle partial settings updates
  if (updates.settings) {
    if (updates.settings.timezone !== undefined) {
      updateObj['settings.timezone'] = updates.settings.timezone;
    }
    if (updates.settings.currency !== undefined) {
      updateObj['settings.currency'] = updates.settings.currency;
    }
    if (updates.settings.businessHours !== undefined) {
      updateObj['settings.businessHours'] = updates.settings.businessHours;
    }
  }

  return organizationModel
    .findOneAndUpdate({ slug }, { $set: updateObj }, { new: true, runValidators: true })
    .lean();
}

/**
 * Elimina una organización.
 * IMPORTANTE: Verificar que no haya usuarios asignados antes de eliminar.
 *
 * @param organizationModel - Mongoose Organization Model
 * @param slug - Slug de la organización
 * @returns Resultado de la eliminación
 */
export async function deleteOrganization(
  organizationModel: Model<Organization>,
  slug: string
): Promise<{ deleted: boolean; reason?: string }> {
  const org = await organizationModel.findOne({ slug });

  if (!org) {
    return { deleted: false, reason: 'Organization not found' };
  }

  const result = await organizationModel.deleteOne({ slug });
  return { deleted: result.deletedCount > 0 };
}

/**
 * Desactiva una organización (soft delete).
 *
 * @param organizationModel - Mongoose Organization Model
 * @param slug - Slug de la organización
 * @returns Organización desactivada o null
 */
export async function deactivateOrganization(
  organizationModel: Model<Organization>,
  slug: string
): Promise<Organization | null> {
  return organizationModel
    .findOneAndUpdate({ slug }, { $set: { isActive: false } }, { new: true })
    .lean();
}

/**
 * Reactiva una organización.
 *
 * @param organizationModel - Mongoose Organization Model
 * @param slug - Slug de la organización
 * @returns Organización reactivada o null
 */
export async function reactivateOrganization(
  organizationModel: Model<Organization>,
  slug: string
): Promise<Organization | null> {
  return organizationModel
    .findOneAndUpdate({ slug }, { $set: { isActive: true } }, { new: true })
    .lean();
}

/**
 * Cuenta el número de organizaciones.
 *
 * @param organizationModel - Mongoose Organization Model
 * @param filter - Filtro opcional
 * @returns Número de organizaciones
 */
export async function countOrganizations(
  organizationModel: Model<Organization>,
  filter: Record<string, unknown> = {}
): Promise<number> {
  return organizationModel.countDocuments(filter);
}

/**
 * Verifica si un slug ya existe.
 *
 * @param organizationModel - Mongoose Organization Model
 * @param slug - Slug a verificar
 * @returns true si existe, false si no
 */
export async function organizationSlugExists(
  organizationModel: Model<Organization>,
  slug: string
): Promise<boolean> {
  const count = await organizationModel.countDocuments({ slug });
  return count > 0;
}
