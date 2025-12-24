import { Model } from 'mongoose';
import { TENANT_DB_PREFIX } from '@serveflow/config';
import {
  createFusionAuthTenantWithApplications,
  deleteFusionAuthTenantWithApplication,
} from '@serveflow/auth';
import {
  DEFAULT_DASHBOARD_ROUTES,
  DEFAULT_WEBAPP_ROUTES,
  type DashboardConfig,
  type WebappConfig,
} from '@serveflow/core';
import type { Tenant, RoleTemplate, TenantRole } from '../schemas';
import { listRoleTemplates } from './role-templates';
import { initializeTenantRolesFromTemplates, updateTenantRoleFusionAuthId } from './tenant-roles';

// ════════════════════════════════════════════════════════════════
// Tenant Lookup Type (matching Mongoose schema)
// ════════════════════════════════════════════════════════════════

export interface TenantLookup {
  _id: string;
  slug: string;
  name: string;
  fusionauthTenantId: string;
  fusionauthApplications: {
    dashboard: { id: string };
    webapp: { id: string };
  };
  // Hito 1B: App Configuration (Authorization)
  dashboardConfig: DashboardConfig;
  webappConfig: WebappConfig;
  database: { name: string };
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
    supportEmail?: string;
    billingEmail?: string;
  };
  settings?: {
    locale: string;
    timezone: string;
    currency: string;
  };
  branding?: {
    logo: { url: string; darkUrl?: string };
    favicon?: string;
    appName?: string;
  };
  theming?: {
    mode: string;
    preset?: string;
    palette?: {
      primary?: Record<string, string>;
      secondary?: Record<string, string>;
    };
    typography?: {
      primaryFont?: string;
      secondaryFont?: string;
    };
    direction?: string;
  };
  status: 'active' | 'suspended';
  plan?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ════════════════════════════════════════════════════════════════
// Tenant Lookup Operations (Mongoose)
//
// Estas operaciones se ejecutan en la base de datos del SISTEMA
// (db_serveflow_sys) para obtener información de tenants.
// ════════════════════════════════════════════════════════════════

/**
 * Gets a tenant by its FusionAuth Tenant ID.
 *
 * @param tenantModel - Mongoose Tenant Model
 * @param fusionauthTenantId - FusionAuth tenant ID (UUID)
 * @returns Tenant document or null if not found
 *
 * Usage:
 * ```typescript
 * const tenantModel = await mongooseConnection.getTenantModel();
 * const tenant = await getTenantByFusionauthId(tenantModel, 'uuid-xxx');
 * ```
 */
export async function getTenantByFusionauthId(
  tenantModel: Model<Tenant>,
  fusionauthTenantId: string
): Promise<TenantLookup | null> {
  const tenant = await tenantModel.findOne({ fusionauthTenantId }).lean();
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
    status?: 'active' | 'suspended';
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
 * Internal input for creating a tenant (includes FusionAuth IDs).
 * @internal
 */
interface CreateTenantInput {
  slug: string;
  name: string;
  fusionauthTenantId: string;
  fusionauthApplications: {
    dashboard: { id: string };
    webapp: { id: string };
  };
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

/**
 * Creates a new tenant in the system database (internal helper).
 *
 * NOTA: Esta función solo crea el registro en db_serveflow_sys.
 * La base de datos del tenant (db_tenant_{slug}) debe crearse por separado.
 *
 * @internal Use createTenantWithFusionAuthAndRoles for public API
 */
async function createTenant(
  tenantModel: Model<Tenant>,
  tenantData: CreateTenantInput
): Promise<TenantLookup> {
  const dbName = `${TENANT_DB_PREFIX}${tenantData.slug.replace(/-/g, '_')}`;

  // Hito 1B: Initialize app configs from default templates
  const dashboardConfig: DashboardConfig = {
    routes: DEFAULT_DASHBOARD_ROUTES.map((route) => ({ ...route })),
    defaultRoute: '/dashboard',
  };

  const webappConfig: WebappConfig = {
    routes: DEFAULT_WEBAPP_ROUTES.map((route) => ({ ...route })),
    defaultRoute: '/',
  };

  const tenantDoc = {
    slug: tenantData.slug,
    name: tenantData.name,
    fusionauthTenantId: tenantData.fusionauthTenantId,
    fusionauthApplications: tenantData.fusionauthApplications,
    // Hito 1B: App Configuration (Authorization)
    dashboardConfig,
    webappConfig,
    database: { name: dbName },
    company: tenantData.company,
    contact: tenantData.contact,
    settings: {
      locale: tenantData.settings?.locale || 'es-ES',
      timezone: tenantData.settings?.timezone || 'Europe/Madrid',
      currency: tenantData.settings?.currency || 'EUR',
    },
    branding: {
      logo: tenantData.branding?.logo || { url: 'https://serveflow.app/default-logo.png' },
      favicon: tenantData.branding?.favicon,
      appName: tenantData.branding?.appName,
    },
    theming: {
      mode: tenantData.theming?.mode || 'light',
      preset: tenantData.theming?.preset || 'default',
    },
    status: tenantData.status || 'active',
    plan: tenantData.plan || 'free',
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

// ════════════════════════════════════════════════════════════════
// Create Tenant Input (Public API)
// ════════════════════════════════════════════════════════════════

/**
 * Input for creating a new tenant.
 * FusionAuth IDs are generated automatically.
 */
export interface CreateTenantData {
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

// ════════════════════════════════════════════════════════════════
// Extended Result Type (with roles)
// ════════════════════════════════════════════════════════════════

export interface TenantWithRolesResult extends TenantLookup {
  roles: TenantRole[];
}

/**
 * Creates a new tenant with FusionAuth integration AND initializes roles.
 *
 * This function:
 * 1. Fetches role templates from db_serveflow_sys.role_templates
 * 2. Creates a FusionAuth Tenant
 * 3. Creates 2 FusionAuth Applications with roles from templates
 * 4. Creates the MongoDB tenant record
 * 5. Initializes tenant_roles from templates
 * 6. Updates tenant_roles with FusionAuth role IDs
 *
 * If any step fails, it rolls back the previous steps.
 *
 * @param tenantModel - Mongoose Tenant Model (system DB)
 * @param roleTemplateModel - Mongoose RoleTemplate Model (system DB)
 * @param getTenantRoleModel - Function to get TenantRole Model for a specific tenant DB
 * @param tenantData - Tenant data (without FusionAuth IDs)
 * @returns Created tenant with roles
 */
export async function createTenantWithFusionAuthAndRoles(
  tenantModel: Model<Tenant>,
  roleTemplateModel: Model<RoleTemplate>,
  getTenantRoleModel: (dbName: string) => Promise<Model<TenantRole>>,
  tenantData: CreateTenantData
): Promise<TenantWithRolesResult> {
  console.log(`[createTenantWithFusionAuthAndRoles] Creating tenant: ${tenantData.name} (${tenantData.slug})`);

  // 1. Get role templates
  const templates = await listRoleTemplates(roleTemplateModel);
  console.log(`[createTenantWithFusionAuthAndRoles] Found ${templates.length} role templates`);

  // 2. Split roles by allowedApps for each FusionAuth Application
  const dashboardRoles = templates
    .filter((t) => t.defaultAllowedApps.includes('dashboard'))
    .map((t) => t.slug);
  const webappRoles = templates
    .filter((t) => t.defaultAllowedApps.includes('webapp'))
    .map((t) => t.slug);

  console.log(`[createTenantWithFusionAuthAndRoles] Dashboard roles: ${dashboardRoles.join(', ')}`);
  console.log(`[createTenantWithFusionAuthAndRoles] WebApp roles: ${webappRoles.join(', ')}`);

  // 3. Create FusionAuth Tenant + 2 Applications with roles from templates
  const { tenant: faTenant, applications } = await createFusionAuthTenantWithApplications(
    tenantData.name,
    tenantData.slug,
    {
      dashboard: dashboardRoles,
      webapp: webappRoles,
    }
  );

  try {
    // 4. Create MongoDB tenant record
    const tenant = await createTenant(tenantModel, {
      ...tenantData,
      fusionauthTenantId: faTenant.id,
      fusionauthApplications: {
        dashboard: { id: applications.dashboard.id },
        webapp: { id: applications.webapp.id },
      },
    });

    // 5. Initialize tenant roles from templates
    const dbName = getTenantDbName(tenantData.slug);
    const tenantRoleModel = await getTenantRoleModel(dbName);
    const tenantRoles = await initializeTenantRolesFromTemplates(tenantRoleModel, templates);

    // 6. Update tenant roles with FusionAuth role IDs from both applications
    // Dashboard app roles
    for (const faRole of applications.dashboard.roles) {
      const matchingTenantRole = tenantRoles.find((tr) => tr.slug === faRole.name);
      if (matchingTenantRole) {
        await updateTenantRoleFusionAuthId(tenantRoleModel, matchingTenantRole.slug, faRole.id, 'dashboard');
      }
    }
    // WebApp app roles
    for (const faRole of applications.webapp.roles) {
      const matchingTenantRole = tenantRoles.find((tr) => tr.slug === faRole.name);
      if (matchingTenantRole) {
        await updateTenantRoleFusionAuthId(tenantRoleModel, matchingTenantRole.slug, faRole.id, 'webapp');
      }
    }

    // Refresh roles with updated FusionAuth IDs
    const updatedRoles = await tenantRoleModel.find({}).lean();

    console.log(`[createTenantWithFusionAuthAndRoles] Tenant created with ${updatedRoles.length} roles`);
    console.log(`  - FusionAuth Tenant ID: ${faTenant.id}`);
    console.log(`  - Dashboard App ID: ${applications.dashboard.id}`);
    console.log(`  - WebApp App ID: ${applications.webapp.id}`);
    console.log(`  - Roles: ${updatedRoles.map((r) => r.slug).join(', ')}`);

    return {
      ...tenant,
      roles: updatedRoles as TenantRole[],
    };
  } catch (error) {
    // Rollback FusionAuth on failure
    console.error('[createTenantWithFusionAuthAndRoles] Failed, rolling back FusionAuth');
    await deleteFusionAuthTenantWithApplication(faTenant.id);
    throw error;
  }
}

/**
 * Deletes a tenant from both FusionAuth and MongoDB.
 *
 * WARNING: This will permanently delete:
 * - The FusionAuth Tenant (and all its users, applications, etc.)
 * - The MongoDB tenant record
 *
 * @param tenantModel - Mongoose Tenant Model
 * @param slug - Tenant slug to delete
 * @returns True if deleted, false if not found
 */
export async function deleteTenantWithFusionAuth(
  tenantModel: Model<Tenant>,
  slug: string
): Promise<boolean> {
  console.log(`[deleteTenantWithFusionAuth] Deleting tenant: ${slug}`);

  // 1. Get the tenant to find FusionAuth ID
  const tenant = await getTenantBySlug(tenantModel, slug);
  if (!tenant) {
    console.warn(`[deleteTenantWithFusionAuth] Tenant not found: ${slug}`);
    return false;
  }

  // 2. Delete from FusionAuth first
  if (tenant.fusionauthTenantId) {
    const faDeleted = await deleteFusionAuthTenantWithApplication(tenant.fusionauthTenantId);
    if (!faDeleted) {
      console.warn(`[deleteTenantWithFusionAuth] Failed to delete FusionAuth tenant, continuing with MongoDB deletion`);
    }
  }

  // 3. Delete from MongoDB
  const result = await tenantModel.deleteOne({ slug });

  console.log(`[deleteTenantWithFusionAuth] Tenant deleted: ${slug}`);
  return result.deletedCount > 0;
}
