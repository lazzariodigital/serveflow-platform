import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import type { Model } from 'mongoose';
import {
  listOrganizations,
  listOrganizationsByIds,
  getOrganizationBySlug,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  deactivateOrganization,
  reactivateOrganization,
  countOrganizations,
  organizationSlugExists,
  type Organization,
  type CreateOrganizationInput,
  type UpdateOrganizationInput,
} from '@serveflow/db';

// ════════════════════════════════════════════════════════════════
// Organizations Service
//
// Gestiona las organizaciones (sedes/sucursales) de un tenant.
//
// Key principle: organizationIds: [] en un usuario significa
// acceso a TODAS las organizaciones.
// ════════════════════════════════════════════════════════════════

export interface CreateOrganizationDto {
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

export interface UpdateOrganizationDto {
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

export interface ListOrganizationsFilters {
  includeInactive?: boolean;
  city?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class OrganizationsService {
  /**
   * Lista todas las organizaciones del tenant.
   */
  async findAll(
    organizationModel: Model<Organization>,
    filters: ListOrganizationsFilters = {}
  ): Promise<Organization[]> {
    return listOrganizations(organizationModel, filters);
  }

  /**
   * Lista organizaciones accesibles por un usuario.
   * Si organizationIds está vacío, retorna TODAS las organizaciones.
   *
   * @param organizationModel - Mongoose Organization Model
   * @param userOrganizationIds - IDs de orgs del usuario ([] = todas)
   * @param filters - Filtros adicionales
   */
  async findAccessible(
    organizationModel: Model<Organization>,
    userOrganizationIds: string[],
    filters: { includeInactive?: boolean } = {}
  ): Promise<Organization[]> {
    return listOrganizationsByIds(organizationModel, userOrganizationIds, filters);
  }

  /**
   * Obtiene una organización por slug.
   */
  async findBySlug(
    organizationModel: Model<Organization>,
    slug: string
  ): Promise<Organization> {
    const org = await getOrganizationBySlug(organizationModel, slug);
    if (!org) {
      throw new NotFoundException(`Organization "${slug}" not found`);
    }
    return org;
  }

  /**
   * Obtiene una organización por ID.
   */
  async findById(
    organizationModel: Model<Organization>,
    organizationId: string
  ): Promise<Organization> {
    const org = await getOrganizationById(organizationModel, organizationId);
    if (!org) {
      throw new NotFoundException(`Organization "${organizationId}" not found`);
    }
    return org;
  }

  /**
   * Verifica si el usuario tiene acceso a una organización específica.
   *
   * @param userOrganizationIds - IDs de orgs del usuario ([] = todas)
   * @param requestedOrgId - ID de la organización solicitada
   * @returns true si tiene acceso
   */
  hasAccess(userOrganizationIds: string[], requestedOrgId: string): boolean {
    // Empty array means access to ALL organizations
    if (userOrganizationIds.length === 0) {
      return true;
    }
    return userOrganizationIds.includes(requestedOrgId);
  }

  /**
   * Valida que el usuario tenga acceso a una organización.
   * Lanza ForbiddenException si no tiene acceso.
   */
  validateAccess(userOrganizationIds: string[], requestedOrgId: string): void {
    if (!this.hasAccess(userOrganizationIds, requestedOrgId)) {
      throw new ForbiddenException(
        `No access to organization "${requestedOrgId}"`
      );
    }
  }

  /**
   * Crea una nueva organización.
   */
  async create(
    organizationModel: Model<Organization>,
    dto: CreateOrganizationDto
  ): Promise<Organization> {
    // Check if slug already exists
    const exists = await organizationSlugExists(organizationModel, dto.slug);
    if (exists) {
      throw new ConflictException(
        `Organization with slug "${dto.slug}" already exists`
      );
    }

    const input: CreateOrganizationInput = {
      slug: dto.slug,
      name: dto.name,
      description: dto.description,
      address: dto.address,
      contact: dto.contact,
      settings: dto.settings,
    };

    return createOrganization(organizationModel, input);
  }

  /**
   * Actualiza una organización existente.
   */
  async update(
    organizationModel: Model<Organization>,
    slug: string,
    dto: UpdateOrganizationDto
  ): Promise<Organization> {
    const existing = await getOrganizationBySlug(organizationModel, slug);
    if (!existing) {
      throw new NotFoundException(`Organization "${slug}" not found`);
    }

    const input: UpdateOrganizationInput = {
      name: dto.name,
      description: dto.description,
      address: dto.address,
      contact: dto.contact,
      settings: dto.settings,
      isActive: dto.isActive,
    };

    const updated = await updateOrganization(organizationModel, slug, input);
    if (!updated) {
      throw new NotFoundException(`Organization "${slug}" not found after update`);
    }

    return updated;
  }

  /**
   * Elimina una organización.
   */
  async remove(
    organizationModel: Model<Organization>,
    slug: string
  ): Promise<void> {
    const existing = await getOrganizationBySlug(organizationModel, slug);
    if (!existing) {
      throw new NotFoundException(`Organization "${slug}" not found`);
    }

    // TODO: Verificar que no haya usuarios asignados antes de eliminar
    // const usersInOrg = await countUsersInOrganization(userModel, existing._id);
    // if (usersInOrg > 0) {
    //   throw new BadRequestException(
    //     `Cannot delete organization with ${usersInOrg} assigned users`
    //   );
    // }

    const result = await deleteOrganization(organizationModel, slug);
    if (!result.deleted) {
      throw new NotFoundException(result.reason || 'Cannot delete organization');
    }
  }

  /**
   * Desactiva una organización (soft delete).
   */
  async deactivate(
    organizationModel: Model<Organization>,
    slug: string
  ): Promise<Organization> {
    const org = await deactivateOrganization(organizationModel, slug);
    if (!org) {
      throw new NotFoundException(`Organization "${slug}" not found`);
    }
    return org;
  }

  /**
   * Reactiva una organización.
   */
  async reactivate(
    organizationModel: Model<Organization>,
    slug: string
  ): Promise<Organization> {
    const org = await reactivateOrganization(organizationModel, slug);
    if (!org) {
      throw new NotFoundException(`Organization "${slug}" not found`);
    }
    return org;
  }

  /**
   * Cuenta el número de organizaciones.
   */
  async count(
    organizationModel: Model<Organization>,
    filter: { isActive?: boolean } = {}
  ): Promise<number> {
    return countOrganizations(organizationModel, filter);
  }
}
