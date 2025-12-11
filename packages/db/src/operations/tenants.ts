import { Model } from 'mongoose';
import { TENANT_DB_PREFIX } from '@serveflow/config';
import type { Tenant } from '../schemas';

// ════════════════════════════════════════════════════════════════
// Tenant Lookup Type (compatible with existing code)
// ════════════════════════════════════════════════════════════════

export interface TenantLookup {
  _id: string;
  fronteggTenantId: string;
  slug: string;
  dbName: string;
  name: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

// ════════════════════════════════════════════════════════════════
// Tenant Lookup Operations (Mongoose)
//
// Estas operaciones se ejecutan en la base de datos del SISTEMA
// (db_serveflow_sys) para obtener información de tenants.
// ════════════════════════════════════════════════════════════════

/**
 * Gets a tenant by its Frontegg Tenant ID.
 *
 * @param tenantModel - Mongoose Tenant Model
 * @param fronteggTenantId - Frontegg tenant ID (UUID)
 * @returns Tenant document or null if not found
 *
 * Usage:
 * ```typescript
 * const tenantModel = await mongooseConnection.getTenantModel();
 * const tenant = await getTenantByFronteggId(tenantModel, 'uuid-xxx');
 * ```
 */
export async function getTenantByFronteggId(
  tenantModel: Model<Tenant>,
  fronteggTenantId: string
): Promise<TenantLookup | null> {
  const tenant = await tenantModel.findOne({ fronteggTenantId }).lean();
  if (!tenant) return null;
  return { ...tenant, _id: tenant._id.toString() } as TenantLookup;
}

/**
 * Gets a tenant by its slug.
 *
 * @param tenantModel - Mongoose Tenant Model
 * @param slug - Tenant slug (e.g., "gimnasio-demo")
 * @returns Tenant document or null if not found
 *
 * Usage:
 * ```typescript
 * const tenantModel = await mongooseConnection.getTenantModel();
 * const tenant = await getTenantBySlug(tenantModel, 'gimnasio-demo');
 * ```
 */
export async function getTenantBySlug(
  tenantModel: Model<Tenant>,
  slug: string
): Promise<TenantLookup | null> {
  const tenant = await tenantModel.findOne({ slug }).lean();
  if (!tenant) return null;
  return { ...tenant, _id: tenant._id.toString() } as TenantLookup;
}

/**
 * Gets a tenant by its MongoDB _id.
 *
 * @param tenantModel - Mongoose Tenant Model
 * @param tenantId - MongoDB ObjectId as string
 * @returns Tenant document or null if not found
 */
export async function getTenantById(
  tenantModel: Model<Tenant>,
  tenantId: string
): Promise<TenantLookup | null> {
  const tenant = await tenantModel.findById(tenantId).lean();
  if (!tenant) return null;
  return { ...tenant, _id: tenant._id.toString() } as TenantLookup;
}

/**
 * Lists all tenants in the system.
 *
 * @param tenantModel - Mongoose Tenant Model
 * @param options - Pagination options
 * @returns Array of tenants
 *
 * Usage:
 * ```typescript
 * const tenantModel = await mongooseConnection.getTenantModel();
 * const tenants = await listTenants(tenantModel, { limit: 20, skip: 0 });
 * ```
 */
export async function listTenants(
  tenantModel: Model<Tenant>,
  options: {
    status?: 'active' | 'inactive' | 'suspended';
    limit?: number;
    skip?: number;
  } = {}
): Promise<TenantLookup[]> {
  const { status, limit = 100, skip = 0 } = options;

  const filter: Record<string, unknown> = {};

  if (status) {
    filter['status'] = status;
  }

  const tenants = await tenantModel
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();

  return tenants.map((t) => ({
    ...t,
    _id: t._id.toString(),
  })) as TenantLookup[];
}

/**
 * Creates a new tenant in the system database.
 *
 * NOTA: Esta función solo crea el registro en db_serveflow_sys.
 * La base de datos del tenant (db_tenant_{slug}) debe crearse por separado.
 *
 * @param tenantModel - Mongoose Tenant Model
 * @param tenantData - Tenant data
 * @returns Created tenant
 *
 * Usage:
 * ```typescript
 * const tenantModel = await mongooseConnection.getTenantModel();
 * const tenant = await createTenant(tenantModel, {
 *   fronteggTenantId: 'uuid-xxx',
 *   slug: 'gimnasio-demo',
 *   name: 'Gimnasio Demo',
 *   status: 'active',
 * });
 * ```
 */
export async function createTenant(
  tenantModel: Model<Tenant>,
  tenantData: {
    fronteggTenantId: string;
    slug: string;
    name: string;
    status?: 'active' | 'inactive' | 'suspended';
    plan?: 'free' | 'starter' | 'pro' | 'enterprise';
    metadata?: Record<string, unknown>;
  }
): Promise<TenantLookup> {
  const tenantDoc = {
    fronteggTenantId: tenantData.fronteggTenantId,
    slug: tenantData.slug,
    name: tenantData.name,
    dbName: `${TENANT_DB_PREFIX}${tenantData.slug.replace(/-/g, '_')}`,
    status: tenantData.status || 'active',
    plan: tenantData.plan || 'free',
    metadata: tenantData.metadata || {},
  };

  const tenant = await tenantModel.create(tenantDoc);
  const obj = tenant.toObject();
  return {
    ...obj,
    _id: obj._id.toString(),
  } as TenantLookup;
}

/**
 * Updates a tenant in the system database.
 *
 * @param tenantModel - Mongoose Tenant Model
 * @param slug - Tenant slug
 * @param updates - Fields to update
 * @returns Updated tenant or null if not found
 */
export async function updateTenant(
  tenantModel: Model<Tenant>,
  slug: string,
  updates: Record<string, unknown>
): Promise<TenantLookup | null> {
  const tenant = await tenantModel
    .findOneAndUpdate(
      { slug },
      { $set: updates },
      { new: true, runValidators: true }
    )
    .lean();

  if (!tenant) return null;
  return { ...tenant, _id: tenant._id.toString() } as TenantLookup;
}

/**
 * Gets the database name for a tenant from its slug.
 *
 * @param slug - Tenant slug (e.g., "gimnasio-demo")
 * @returns Database name (e.g., "db_tenant_gimnasio_demo")
 *
 * Usage:
 * ```typescript
 * const dbName = getTenantDbName('gimnasio-demo');
 * // Returns: "db_tenant_gimnasio_demo"
 * ```
 */
export function getTenantDbName(slug: string): string {
  return `${TENANT_DB_PREFIX}${slug.replace(/-/g, '_')}`;
}

/**
 * Gets tenant information including database name.
 * Helper function that combines getTenantBySlug with database name.
 *
 * @param tenantModel - Mongoose Tenant Model
 * @param slug - Tenant slug
 * @returns Tenant with database name
 */
export async function getTenantInfo(
  tenantModel: Model<Tenant>,
  slug: string
): Promise<(TenantLookup & { dbName: string }) | null> {
  const tenant = await getTenantBySlug(tenantModel, slug);

  if (!tenant) {
    return null;
  }

  return {
    ...tenant,
    dbName: getTenantDbName(slug),
  };
}

/**
 * Counts tenants in the system.
 *
 * @param tenantModel - Mongoose Tenant Model
 * @param filter - Optional filter criteria
 * @returns Number of tenants matching the filter
 */
export async function countTenants(
  tenantModel: Model<Tenant>,
  filter: Record<string, unknown> = {}
): Promise<number> {
  return tenantModel.countDocuments(filter);
}
