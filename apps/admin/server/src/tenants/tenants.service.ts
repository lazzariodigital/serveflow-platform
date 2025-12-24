import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  MongooseConnectionService,
  RoleTemplate,
  Tenant,
  countTenants,
  createTenantWithFusionAuthAndRoles,
  deleteTenantWithFusionAuth,
  getTenantById,
  getTenantBySlug,
  listTenants,
  updateTenant,
  type TenantLookup,
  type TenantWithRolesResult,
} from '@serveflow/db';
import { Model } from 'mongoose';

// ════════════════════════════════════════════════════════════════
// DTOs (matching documentation structure)
// ════════════════════════════════════════════════════════════════

export interface CreateTenantDto {
  slug: string;
  name: string;
  company?: {
    legalName: string;
    taxId: string;
    address: {
      street: string;
      city: string;
      postalCode: string;
      country: string;
      state?: string;
    };
  };
  contact?: {
    email: string;
    phone?: string;
  };
  settings?: {
    locale?: string;
    timezone?: string;
    currency?: string;
  };
  branding?: {
    logo?: { url: string; darkUrl?: string };
    favicon?: string;
    appName?: string;
  };
  theming?: {
    mode?: string;
    preset?: string;
  };
  status?: 'active' | 'suspended';
  plan?: 'free' | 'starter' | 'pro' | 'enterprise';
}

export interface UpdateTenantDto {
  name?: string;
  status?: 'active' | 'suspended';
  plan?: 'free' | 'starter' | 'pro' | 'enterprise';
  settings?: {
    locale?: string;
    timezone?: string;
    currency?: string;
  };
  branding?: {
    logo?: { url: string; darkUrl?: string };
    favicon?: string;
    appName?: string;
  };
  theming?: {
    mode?: string;
    preset?: string;
  };
}

export interface ListTenantsQuery {
  status?: 'active' | 'suspended';
  limit?: number;
  skip?: number;
}

// ════════════════════════════════════════════════════════════════
// Service
// ════════════════════════════════════════════════════════════════

@Injectable()
export class TenantsService {
  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<Tenant>,
    @InjectModel(RoleTemplate.name) private roleTemplateModel: Model<RoleTemplate>,
    private connectionService: MongooseConnectionService
  ) {}

  /**
   * List all tenants with optional filtering and pagination
   */
  async list(query: ListTenantsQuery = {}): Promise<{
    tenants: TenantLookup[];
    total: number;
  }> {
    const [tenants, total] = await Promise.all([
      listTenants(this.tenantModel, query),
      countTenants(this.tenantModel, query.status ? { status: query.status } : {}),
    ]);

    return { tenants, total };
  }

  /**
   * Get a single tenant by slug
   */
  async getBySlug(slug: string): Promise<TenantLookup> {
    const tenant = await getTenantBySlug(this.tenantModel, slug);
    if (!tenant) {
      throw new NotFoundException(`Tenant with slug '${slug}' not found`);
    }
    return tenant;
  }

  /**
   * Get a single tenant by ID
   */
  async getById(id: string): Promise<TenantLookup> {
    const tenant = await getTenantById(this.tenantModel, id);
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID '${id}' not found`);
    }
    return tenant;
  }

  /**
   * Create a new tenant with FusionAuth integration and roles
   *
   * This function:
   * 1. Creates FusionAuth Tenant + Application with roles from templates
   * 2. Creates MongoDB tenant record in db_serveflow_sys
   * 3. Creates tenant database (db_tenant_{slug})
   * 4. Initializes tenant_roles from role_templates
   */
  async create(dto: CreateTenantDto): Promise<TenantWithRolesResult> {
    // Check if slug already exists
    const existing = await getTenantBySlug(this.tenantModel, dto.slug);
    if (existing) {
      throw new ConflictException(`Tenant with slug '${dto.slug}' already exists`);
    }

    // Create tenant with FusionAuth and roles
    const result = await createTenantWithFusionAuthAndRoles(
      this.tenantModel,
      this.roleTemplateModel,
      // Callback to get TenantRoleModel for the new tenant database
      (dbName: string) => this.connectionService.getTenantRoleModel(dbName),
      dto
    );

    console.log(`[TenantsService] Tenant created: ${result.slug} (${result._id})`);
    console.log(`[TenantsService] Roles initialized: ${result.roles.map((r) => r.slug).join(', ')}`);

    return result;
  }

  /**
   * Update a tenant
   */
  async update(slug: string, dto: UpdateTenantDto): Promise<TenantLookup> {
    // Check tenant exists
    const existing = await getTenantBySlug(this.tenantModel, slug);
    if (!existing) {
      throw new NotFoundException(`Tenant with slug '${slug}' not found`);
    }

    // Update tenant (slug cannot be changed)
    const tenant = await updateTenant(this.tenantModel, slug, dto as Record<string, unknown>);
    if (!tenant) {
      throw new NotFoundException(`Tenant with slug '${slug}' not found`);
    }

    console.log(`[TenantsService] Tenant updated: ${slug}`);
    return tenant;
  }

  /**
   * Delete a tenant (including FusionAuth cleanup)
   */
  async delete(slug: string): Promise<void> {
    // Check tenant exists
    const existing = await getTenantBySlug(this.tenantModel, slug);
    if (!existing) {
      throw new NotFoundException(`Tenant with slug '${slug}' not found`);
    }

    // Delete tenant with FusionAuth cleanup
    const deleted = await deleteTenantWithFusionAuth(this.tenantModel, slug);
    if (!deleted) {
      throw new NotFoundException(`Tenant with slug '${slug}' not found`);
    }

    console.log(`[TenantsService] Tenant deleted: ${slug}`);
  }
}
