import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import {
  Tenant,
  listTenants,
  getTenantBySlug,
  getTenantById,
  createTenantWithFusionAuth,
  updateTenant,
  deleteTenantWithFusionAuth,
  countTenants,
  type TenantLookup,
} from '@serveflow/db';

// ════════════════════════════════════════════════════════════════
// DTOs
// ════════════════════════════════════════════════════════════════

export interface CreateTenantDto {
  slug: string;
  name: string;
  status?: 'active' | 'inactive' | 'suspended';
  plan?: 'free' | 'starter' | 'pro' | 'enterprise';
  metadata?: Record<string, unknown>;
}

export interface UpdateTenantDto {
  name?: string;
  status?: 'active' | 'inactive' | 'suspended';
  plan?: 'free' | 'starter' | 'pro' | 'enterprise';
  metadata?: Record<string, unknown>;
}

export interface ListTenantsQuery {
  status?: 'active' | 'inactive' | 'suspended';
  limit?: number;
  skip?: number;
}

// ════════════════════════════════════════════════════════════════
// Service
// ════════════════════════════════════════════════════════════════

@Injectable()
export class TenantsService {
  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<Tenant>
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
   * Create a new tenant with FusionAuth integration
   */
  async create(dto: CreateTenantDto): Promise<TenantLookup> {
    // Check if slug already exists
    const existing = await getTenantBySlug(this.tenantModel, dto.slug);
    if (existing) {
      throw new ConflictException(`Tenant with slug '${dto.slug}' already exists`);
    }

    // Create tenant with FusionAuth (handles FusionAuth tenant + app creation)
    const tenant = await createTenantWithFusionAuth(this.tenantModel, dto);

    console.log(`[TenantsService] Tenant created: ${tenant.slug} (${tenant._id})`);
    return tenant;
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
