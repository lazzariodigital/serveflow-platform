import { GrantType, RegistrationType } from '@fusionauth/typescript-client';
import { getFusionAuthClient } from './client';

// ════════════════════════════════════════════════════════════════
// FusionAuth Tenant & Application Operations
// ════════════════════════════════════════════════════════════════
// Estas funciones crean y gestionan Tenants y Applications en FusionAuth
// para soportar multi-tenancy en Serveflow.
//
// Modelo: 1 Serveflow Tenant = 1 FusionAuth Tenant + 1 FusionAuth Application
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════

export interface CreateFusionAuthTenantInput {
  name: string;
  slug: string;
  issuer?: string;
  emailConfiguration?: {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    fromEmail?: string;
    fromName?: string;
  };
}

export interface CreateFusionAuthApplicationInput {
  tenantId: string;
  name: string;
  slug: string;
  oauthConfiguration?: {
    authorizedRedirectURLs?: string[];
    logoutURL?: string;
    clientSecret?: string;
  };
  roles?: string[];
}

export interface FusionAuthTenantResult {
  id: string;
  name: string;
  issuer: string;
}

export interface FusionAuthApplicationResult {
  id: string;
  name: string;
  tenantId: string;
  oauthConfiguration: {
    clientId: string;
    clientSecret?: string;
    authorizedRedirectURLs: string[];
  };
  roles: Array<{ id: string; name: string }>;
}

export interface CreateTenantWithApplicationResult {
  tenant: FusionAuthTenantResult;
  application: FusionAuthApplicationResult;
}

// ════════════════════════════════════════════════════════════════
// Tenant Operations
// ════════════════════════════════════════════════════════════════

/**
 * Creates a new FusionAuth Tenant.
 * Each Serveflow tenant gets its own FusionAuth tenant for isolation.
 */
export async function createFusionAuthTenant(
  input: CreateFusionAuthTenantInput
): Promise<FusionAuthTenantResult> {
  const client = getFusionAuthClient();

  const response = await client.createTenant(null as unknown as string, {
    tenant: {
      name: input.name,
      issuer: input.issuer || `https://${input.slug}.serveflow.app`,
      emailConfiguration: input.emailConfiguration ? {
        host: input.emailConfiguration.host,
        port: input.emailConfiguration.port,
        username: input.emailConfiguration.username,
        password: input.emailConfiguration.password,
        defaultFromEmail: input.emailConfiguration.fromEmail,
        defaultFromName: input.emailConfiguration.fromName,
      } : undefined,
      // JWT configuration
      jwtConfiguration: {
        timeToLiveInSeconds: 3600, // 1 hour
        refreshTokenTimeToLiveInMinutes: 43200, // 30 days
      },
      // User registration settings
      userDeletePolicy: {
        unverified: {
          enabled: true,
          numberOfDaysToRetain: 7,
        },
      },
    },
  });

  if (!response.response.tenant?.id) {
    throw new Error('Failed to create FusionAuth tenant');
  }

  return {
    id: response.response.tenant.id,
    name: response.response.tenant.name || input.name,
    issuer: response.response.tenant.issuer || '',
  };
}

/**
 * Gets a FusionAuth Tenant by ID.
 */
export async function getFusionAuthTenant(
  tenantId: string
): Promise<FusionAuthTenantResult | null> {
  const client = getFusionAuthClient();

  try {
    const response = await client.retrieveTenant(tenantId);

    if (!response.response.tenant) {
      return null;
    }

    return {
      id: response.response.tenant.id || tenantId,
      name: response.response.tenant.name || '',
      issuer: response.response.tenant.issuer || '',
    };
  } catch {
    return null;
  }
}

/**
 * Deletes a FusionAuth Tenant.
 * WARNING: This will delete all users and applications in the tenant!
 */
export async function deleteFusionAuthTenant(tenantId: string): Promise<boolean> {
  const client = getFusionAuthClient();

  try {
    await client.deleteTenant(tenantId);
    return true;
  } catch (error) {
    console.error('[FusionAuth] Error deleting tenant:', error);
    return false;
  }
}

// ════════════════════════════════════════════════════════════════
// Application Operations
// ════════════════════════════════════════════════════════════════

/**
 * Creates a new FusionAuth Application within a Tenant.
 * Each Serveflow tenant gets one application for the dashboard.
 */
export async function createFusionAuthApplication(
  input: CreateFusionAuthApplicationInput
): Promise<FusionAuthApplicationResult> {
  const client = getFusionAuthClient();

  // Default roles for a Serveflow tenant
  const defaultRoles = input.roles || ['admin', 'user', 'viewer'];

  const response = await client.createApplication(null as unknown as string, {
    application: {
      name: input.name,
      tenantId: input.tenantId,
      // OAuth configuration
      oauthConfiguration: {
        authorizedRedirectURLs: input.oauthConfiguration?.authorizedRedirectURLs || [
          `https://${input.slug}.serveflow.app/oauth/callback`,
          `http://${input.slug}.localhost:4200/oauth/callback`,
        ],
        logoutURL: input.oauthConfiguration?.logoutURL || `https://${input.slug}.serveflow.app/sign-in`,
        clientSecret: input.oauthConfiguration?.clientSecret,
        enabledGrants: [GrantType.authorization_code, GrantType.refresh_token],
        generateRefreshTokens: true,
        requireClientAuthentication: false, // For public SPA clients
      },
      // JWT configuration
      jwtConfiguration: {
        enabled: true,
        timeToLiveInSeconds: 3600,
        refreshTokenTimeToLiveInMinutes: 43200,
      },
      // Login configuration
      loginConfiguration: {
        allowTokenRefresh: true,
        generateRefreshTokens: true,
        requireAuthentication: true,
      },
      // Registration configuration
      registrationConfiguration: {
        enabled: true,
        type: RegistrationType.basic,
      },
      // Roles
      roles: defaultRoles.map((name) => ({
        name,
        isDefault: name === 'user',
        isSuperRole: name === 'admin',
      })),
    },
  });

  if (!response.response.application?.id) {
    throw new Error('Failed to create FusionAuth application');
  }

  const app = response.response.application;

  const appId = app.id!; // We've already checked this exists above

  return {
    id: appId,
    name: app.name || input.name,
    tenantId: input.tenantId,
    oauthConfiguration: {
      clientId: appId, // In FusionAuth, app ID is the client ID
      clientSecret: app.oauthConfiguration?.clientSecret,
      authorizedRedirectURLs: app.oauthConfiguration?.authorizedRedirectURLs || [],
    },
    roles: (app.roles || []).map((r) => ({
      id: r.id || '',
      name: r.name || '',
    })),
  };
}

/**
 * Gets a FusionAuth Application by ID.
 */
export async function getFusionAuthApplication(
  applicationId: string
): Promise<FusionAuthApplicationResult | null> {
  const client = getFusionAuthClient();

  try {
    const response = await client.retrieveApplication(applicationId);

    if (!response.response.application) {
      return null;
    }

    const app = response.response.application;

    return {
      id: app.id || applicationId,
      name: app.name || '',
      tenantId: app.tenantId || '',
      oauthConfiguration: {
        clientId: app.id || applicationId,
        clientSecret: app.oauthConfiguration?.clientSecret,
        authorizedRedirectURLs: app.oauthConfiguration?.authorizedRedirectURLs || [],
      },
      roles: (app.roles || []).map((r) => ({
        id: r.id || '',
        name: r.name || '',
      })),
    };
  } catch {
    return null;
  }
}

/**
 * Deletes a FusionAuth Application.
 */
export async function deleteFusionAuthApplication(
  applicationId: string
): Promise<boolean> {
  const client = getFusionAuthClient();

  try {
    await client.deleteApplication(applicationId);
    return true;
  } catch (error) {
    console.error('[FusionAuth] Error deleting application:', error);
    return false;
  }
}

// ════════════════════════════════════════════════════════════════
// Combined Operations
// ════════════════════════════════════════════════════════════════

/**
 * Creates a complete FusionAuth setup for a new Serveflow tenant.
 * This creates both a FusionAuth Tenant and an Application.
 *
 * @param name - Display name (e.g., "Gimnasio Madrid")
 * @param slug - URL slug (e.g., "gimnasio-madrid")
 * @returns FusionAuth tenant ID and application ID
 */
export async function createFusionAuthTenantWithApplication(
  name: string,
  slug: string
): Promise<CreateTenantWithApplicationResult> {
  // 1. Create FusionAuth Tenant
  console.log(`[FusionAuth] Creating tenant: ${name}`);
  const tenant = await createFusionAuthTenant({
    name,
    slug,
  });

  try {
    // 2. Create FusionAuth Application in that tenant
    console.log(`[FusionAuth] Creating application for tenant: ${tenant.id}`);
    const application = await createFusionAuthApplication({
      tenantId: tenant.id,
      name: `${name} Dashboard`,
      slug,
    });

    console.log(`[FusionAuth] Setup complete - Tenant: ${tenant.id}, App: ${application.id}`);

    return { tenant, application };
  } catch (error) {
    // If application creation fails, clean up the tenant
    console.error('[FusionAuth] Application creation failed, rolling back tenant');
    await deleteFusionAuthTenant(tenant.id);
    throw error;
  }
}

/**
 * Deletes a complete FusionAuth setup for a Serveflow tenant.
 * Deleting the tenant will also delete all applications and users.
 */
export async function deleteFusionAuthTenantWithApplication(
  tenantId: string
): Promise<boolean> {
  console.log(`[FusionAuth] Deleting tenant and all associated data: ${tenantId}`);
  return deleteFusionAuthTenant(tenantId);
}
