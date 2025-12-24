import { GrantType, RegistrationType } from '@fusionauth/typescript-client';
import { getFusionAuthClient, getFusionAuthClientForTenant, getFusionAuthUrl } from './client';

// ════════════════════════════════════════════════════════════════
// FusionAuth Tenant & Application Operations
// ════════════════════════════════════════════════════════════════
// Estas funciones crean y gestionan Tenants y Applications en FusionAuth
// para soportar multi-tenancy en Serveflow.
//
// Modelo: 1 Serveflow Tenant = 1 FusionAuth Tenant + 1 FusionAuth Application
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
// Configuration
// ════════════════════════════════════════════════════════════════

const isDevelopment = process.env['NODE_ENV'] !== 'production';

/**
 * Get the base domain for tenant URLs.
 * Development: localhost with configurable port
 * Production: serveflow.app
 */
function getBaseDomain(): string {
  if (isDevelopment) {
    const port = process.env['TENANT_DASHBOARD_PORT'] || '3000';
    return `localhost:${port}`;
  }
  return 'serveflow.app';
}

/**
 * Get the protocol for tenant URLs.
 */
function getProtocol(): string {
  return isDevelopment ? 'http' : 'https';
}

// ════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════

export interface CreateFusionAuthTenantInput {
  name: string;
  slug: string;
  /**
   * Custom issuer for JWT tokens.
   * Defaults to FusionAuth URL (recommended for consistency across tenants).
   */
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

export type AppType = 'dashboard' | 'webapp';

export interface CreateFusionAuthApplicationInput {
  tenantId: string;
  name: string;
  slug: string;
  appType?: AppType;  // 'dashboard' or 'webapp' - affects redirect URLs
  oauthConfiguration?: {
    authorizedRedirectURLs?: string[];
    logoutURL?: string;
    clientSecret?: string;
  };
  roles?: string[];
  /**
   * JWT Populate Lambda ID to assign to this application.
   * Will be set for both accessTokenPopulateId and idTokenPopulateId.
   */
  jwtPopulateLambdaId?: string;
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

/**
 * Result type for creating a tenant with 2 applications (Dashboard + WebApp)
 */
export interface CreateTenantWithApplicationsResult {
  tenant: FusionAuthTenantResult;
  applications: {
    dashboard: FusionAuthApplicationResult;
    webapp: FusionAuthApplicationResult;
  };
}

// ════════════════════════════════════════════════════════════════
// Lambda Operations
// ════════════════════════════════════════════════════════════════

/**
 * JWT Populate Lambda body for Serveflow.
 * Adds organizationIds, primaryOrganizationId, and tenantSlug to JWT claims.
 *
 * This code is the SAME for all tenants - it reads from user.data which
 * is already tenant-scoped in FusionAuth.
 */
const JWT_POPULATE_LAMBDA_BODY = `
function populate(jwt, user, registration, context) {
  // Add organizationIds from user.data
  jwt.organizationIds = user.data.organizationIds || [];

  // Add primary organization
  jwt.primaryOrganizationId = user.data.primaryOrganizationId || null;

  // Add tenant slug
  jwt.tenantSlug = user.data.serveflowTenantSlug || null;

  // Add roles from user.data (all roles the user has)
  if (user.data.roles) {
    jwt.allRoles = user.data.roles;
  }

  return jwt;
}
`;

// Environment variable for the global Lambda ID
// Set this once after creating the Lambda manually or via ensureGlobalJwtPopulateLambda()
const GLOBAL_JWT_LAMBDA_ID = process.env['FUSIONAUTH_JWT_POPULATE_LAMBDA_ID'];

export interface CreateLambdaResult {
  id: string;
  name: string;
}

/**
 * Gets the global JWT Populate Lambda ID.
 * Returns the ID from environment variable if set.
 */
export function getGlobalJwtPopulateLambdaId(): string | undefined {
  return GLOBAL_JWT_LAMBDA_ID;
}

/**
 * Creates a GLOBAL JWT Populate Lambda (not tenant-specific).
 * This Lambda can be shared across ALL tenants since the code is identical.
 *
 * Call this ONCE when setting up FusionAuth, then save the returned ID
 * to FUSIONAUTH_JWT_POPULATE_LAMBDA_ID environment variable.
 *
 * @returns Lambda ID to save in environment variable
 */
export async function createGlobalJwtPopulateLambda(): Promise<CreateLambdaResult> {
  const client = getFusionAuthClient(); // Global client, not tenant-scoped

  console.log(`[FusionAuth] Creating GLOBAL JWT Populate Lambda...`);

  const response = await client.createLambda(null as unknown as string, {
    lambda: {
      name: 'Serveflow - JWT Populate (Global)',
      type: 'JWTPopulate' as never,
      body: JWT_POPULATE_LAMBDA_BODY.trim(),
      engineType: 'GraalJS' as never,
      debug: false,
    },
  });

  if (!response.response.lambda?.id) {
    throw new Error('Failed to create global JWT Populate Lambda');
  }

  const lambdaId = response.response.lambda.id;

  console.log(`[FusionAuth] ════════════════════════════════════════════════════════`);
  console.log(`[FusionAuth] GLOBAL JWT Populate Lambda created!`);
  console.log(`[FusionAuth] Lambda ID: ${lambdaId}`);
  console.log(`[FusionAuth] `);
  console.log(`[FusionAuth] Add this to your .env file:`);
  console.log(`[FusionAuth] FUSIONAUTH_JWT_POPULATE_LAMBDA_ID=${lambdaId}`);
  console.log(`[FusionAuth] ════════════════════════════════════════════════════════`);

  return {
    id: lambdaId,
    name: response.response.lambda.name || 'Serveflow - JWT Populate (Global)',
  };
}

/**
 * Ensures the global JWT Populate Lambda exists.
 * If FUSIONAUTH_JWT_POPULATE_LAMBDA_ID is set, returns that ID.
 * Otherwise, creates a new global Lambda and returns its ID.
 *
 * Note: In production, you should create the Lambda once and set the env var.
 * This function is mainly for development convenience.
 */
export async function ensureGlobalJwtPopulateLambda(): Promise<string> {
  // Check if we already have a Lambda ID configured
  if (GLOBAL_JWT_LAMBDA_ID) {
    console.log(`[FusionAuth] Using existing global JWT Lambda: ${GLOBAL_JWT_LAMBDA_ID}`);
    return GLOBAL_JWT_LAMBDA_ID;
  }

  // Create new global Lambda
  console.log(`[FusionAuth] No FUSIONAUTH_JWT_POPULATE_LAMBDA_ID set, creating global Lambda...`);
  const lambda = await createGlobalJwtPopulateLambda();
  return lambda.id;
}

/**
 * @deprecated Use createGlobalJwtPopulateLambda() instead.
 * Creates a tenant-specific JWT Populate Lambda.
 * Only use this if you need different Lambda logic per tenant.
 */
export async function createJwtPopulateLambda(
  tenantId: string,
  tenantName: string
): Promise<CreateLambdaResult> {
  const client = getFusionAuthClientForTenant(tenantId);

  console.log(`[FusionAuth] Creating JWT Populate Lambda for tenant: ${tenantName}`);

  const response = await client.createLambda(null as unknown as string, {
    lambda: {
      name: `${tenantName} - JWT Populate`,
      type: 'JWTPopulate' as never,
      body: JWT_POPULATE_LAMBDA_BODY.trim(),
      engineType: 'GraalJS' as never,
      debug: false,
    },
  });

  if (!response.response.lambda?.id) {
    throw new Error('Failed to create JWT Populate Lambda');
  }

  console.log(`[FusionAuth] JWT Populate Lambda created: ${response.response.lambda.id}`);

  return {
    id: response.response.lambda.id,
    name: response.response.lambda.name || `${tenantName} - JWT Populate`,
  };
}

// ════════════════════════════════════════════════════════════════
// Tenant Operations
// ════════════════════════════════════════════════════════════════

/**
 * Creates a new FusionAuth Tenant.
 * Each Serveflow tenant gets its own FusionAuth tenant for isolation.
 *
 * IMPORTANT: The issuer is set to the FusionAuth URL by default.
 * This ensures consistent JWT validation across all tenants.
 * The backend FusionAuthGuard validates the issuer against FUSIONAUTH_URL.
 */
export async function createFusionAuthTenant(
  input: CreateFusionAuthTenantInput
): Promise<FusionAuthTenantResult> {
  const client = getFusionAuthClient();

  // Use FusionAuth URL as issuer for consistent JWT validation
  // This matches what the FusionAuthGuard expects in the backend
  const issuer = input.issuer || getFusionAuthUrl();

  console.log(`[FusionAuth] Creating tenant "${input.name}" with issuer: ${issuer}`);

  const response = await client.createTenant(null as unknown as string, {
    tenant: {
      name: input.name,
      issuer,
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

  console.log(`[FusionAuth] Tenant creation response:`, response.response);

  console.log(`[FusionAuth] Tenant created: ${response.response.tenant.id}`);

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
 *
 * IMPORTANT: requireAuthentication is set to FALSE to allow browser-based
 * login without API key. The Login API can be called directly from the frontend.
 */
export async function createFusionAuthApplication(
  input: CreateFusionAuthApplicationInput
): Promise<FusionAuthApplicationResult> {
  // Use tenant-scoped client to include X-FusionAuth-TenantId header
  const client = getFusionAuthClientForTenant(input.tenantId);

  // Default roles for a Serveflow tenant
  // - admin: Full access to tenant management
  // - client: End users (members, customers)
  // - provider: Service providers (coaches, instructors, staff)
  const defaultRoles = input.roles || ['admin', 'client', 'provider'];

  // Build redirect URLs for OAuth based on app type
  const baseDomain = getBaseDomain();
  const appType = input.appType || 'dashboard';

  // Different subdomains for dashboard vs webapp
  // Dashboard: {slug}.serveflow.app (or {slug}.localhost:3000)
  // WebApp: {slug}.app.serveflow.app (or {slug}.app.localhost:3001)
  const subdomain = appType === 'webapp' ? `${input.slug}.app` : input.slug;
  const prodDomain = appType === 'webapp' ? `${input.slug}.app.serveflow.app` : `${input.slug}.serveflow.app`;

  const defaultRedirectURLs = [
    // Production URL
    `https://${prodDomain}/oauth/callback`,
    // Development URL (subdomain.localhost:port)
    `http://${subdomain}.${baseDomain}/oauth/callback`,
  ];

  const defaultLogoutURL = isDevelopment
    ? `http://${subdomain}.${baseDomain}/sign-in`
    : `https://${prodDomain}/sign-in`;

  console.log(`[FusionAuth] Creating application "${input.name}" for tenant ${input.tenantId}`);
  console.log(`[FusionAuth] Redirect URLs:`, defaultRedirectURLs);

  const response = await client.createApplication(null as unknown as string, {
    application: {
      name: input.name,
      tenantId: input.tenantId,
      // OAuth configuration
      oauthConfiguration: {
        authorizedRedirectURLs: input.oauthConfiguration?.authorizedRedirectURLs || defaultRedirectURLs,
        logoutURL: input.oauthConfiguration?.logoutURL || defaultLogoutURL,
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
      // IMPORTANT: requireAuthentication = false allows browser-based login
      // without needing to expose an API key in the frontend
      loginConfiguration: {
        allowTokenRefresh: true,
        generateRefreshTokens: true,
        requireAuthentication: false, // Allow browser login without API key
      },
      // Registration configuration
      registrationConfiguration: {
        enabled: true,
        type: RegistrationType.basic,
      },
      // Lambda configuration - JWT Populate Lambda for custom claims
      lambdaConfiguration: input.jwtPopulateLambdaId ? {
        accessTokenPopulateId: input.jwtPopulateLambdaId,
        idTokenPopulateId: input.jwtPopulateLambdaId,
      } : undefined,
      // Roles
      roles: defaultRoles.map((name) => ({
        name,
        isDefault: name === 'client', // New users get 'client' role by default
        isSuperRole: name === 'admin',
      })),
    },
  });

  if (!response.response.application?.id) {
    throw new Error('Failed to create FusionAuth application');
  }

  const app = response.response.application;
  const appId = app.id!; // We've already checked this exists above

  console.log(`[FusionAuth] Application created: ${appId}`);
  console.log(`[FusionAuth] Application config:`, {
    requireAuthentication: app.loginConfiguration?.requireAuthentication,
    roles: app.roles?.map(r => r.name),
    jwtPopulateLambdaId: input.jwtPopulateLambdaId || 'none',
  });

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
  } catch (error) {
    // Only return null for 404 (not found), throw for other errors
    if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 404) {
      return null;
    }
    console.error(`[FusionAuth] Error retrieving application ${applicationId}:`, error);
    throw error;
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
 * @param roles - Optional array of role names to create (defaults to admin, client, provider)
 * @returns FusionAuth tenant ID and application ID
 */
export async function createFusionAuthTenantWithApplication(
  name: string,
  slug: string,
  roles?: string[]
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
      roles, // Pass custom roles if provided
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
 * Creates a complete FusionAuth setup with 2 applications (Dashboard + WebApp).
 *
 * Architecture:
 * - 1 FusionAuth Tenant per Serveflow Tenant
 * - 1 GLOBAL JWT Populate Lambda (shared across ALL tenants)
 * - 2 FusionAuth Applications:
 *   - Dashboard: for admin, employee roles
 *   - WebApp: for provider, client roles
 *
 * The Lambda automatically adds to JWT claims:
 * - organizationIds: User's organization access ([] = all)
 * - primaryOrganizationId: User's primary organization
 * - tenantSlug: The Serveflow tenant slug
 * - allRoles: All roles from user.data.roles
 *
 * IMPORTANT: Set FUSIONAUTH_JWT_POPULATE_LAMBDA_ID environment variable
 * with your global Lambda ID before calling this function.
 *
 * @param name - Display name (e.g., "Gimnasio Madrid")
 * @param slug - URL slug (e.g., "gimnasio-madrid")
 * @param rolesByApp - Object with roles for each app type
 * @returns FusionAuth tenant ID and both application IDs
 */
export async function createFusionAuthTenantWithApplications(
  name: string,
  slug: string,
  rolesByApp?: {
    dashboard?: string[];  // Default: ['admin', 'employee']
    webapp?: string[];     // Default: ['provider', 'client']
  }
): Promise<CreateTenantWithApplicationsResult> {
  // Get global JWT Lambda ID from environment
  const jwtLambdaId = getGlobalJwtPopulateLambdaId();

  if (!jwtLambdaId) {
    console.warn(`[FusionAuth] ⚠️ FUSIONAUTH_JWT_POPULATE_LAMBDA_ID not set!`);
    console.warn(`[FusionAuth] JWT claims (organizationIds, tenantSlug) will NOT be added to tokens.`);
    console.warn(`[FusionAuth] Create a Lambda and set the env var to enable custom claims.`);
  }

  // 1. Create FusionAuth Tenant
  console.log(`[FusionAuth] Creating tenant: ${name}`);
  const tenant = await createFusionAuthTenant({
    name,
    slug,
  });

  try {
    // 2. Create Dashboard Application with global Lambda
    console.log(`[FusionAuth] Creating Dashboard application for tenant: ${tenant.id}`);
    const dashboardRoles = rolesByApp?.dashboard || ['admin', 'employee'];
    const dashboardApp = await createFusionAuthApplication({
      tenantId: tenant.id,
      name: `${name} Dashboard`,
      slug,
      appType: 'dashboard',
      roles: dashboardRoles,
      jwtPopulateLambdaId: jwtLambdaId, // Uses global Lambda
    });

    // 3. Create WebApp Application with global Lambda
    console.log(`[FusionAuth] Creating WebApp application for tenant: ${tenant.id}`);
    const webappRoles = rolesByApp?.webapp || ['provider', 'client'];
    const webappApp = await createFusionAuthApplication({
      tenantId: tenant.id,
      name: `${name} WebApp`,
      slug,
      appType: 'webapp',
      roles: webappRoles,
      jwtPopulateLambdaId: jwtLambdaId, // Uses global Lambda
    });

    console.log(`[FusionAuth] Setup complete - Tenant: ${tenant.id}`);
    console.log(`  - JWT Lambda: ${jwtLambdaId || 'NOT SET'}`);
    console.log(`  - Dashboard App: ${dashboardApp.id}`);
    console.log(`  - WebApp App: ${webappApp.id}`);

    return {
      tenant,
      applications: {
        dashboard: dashboardApp,
        webapp: webappApp,
      },
    };
  } catch (error) {
    // If any creation fails, clean up the tenant
    console.error('[FusionAuth] Setup failed, rolling back tenant');
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

// ════════════════════════════════════════════════════════════════
// Application Role Operations
// ════════════════════════════════════════════════════════════════

export interface UpdateApplicationRolesInput {
  applicationId: string;
  roles: Array<{
    id?: string;  // Include for existing roles, omit for new roles
    name: string;
    description?: string;
    isDefault?: boolean;
    isSuperRole?: boolean;
  }>;
}

export interface ApplicationRoleResult {
  id: string;
  name: string;
  isDefault: boolean;
  isSuperRole: boolean;
}

/**
 * Updates the roles of an existing FusionAuth Application.
 * Uses PATCH to merge roles (adds new roles, updates existing ones).
 *
 * @param input - Application ID and roles to set
 * @returns Updated application roles
 */
export async function updateApplicationRoles(
  input: UpdateApplicationRolesInput
): Promise<ApplicationRoleResult[]> {
  const client = getFusionAuthClient();

  console.log(`[FusionAuth] Updating roles for application: ${input.applicationId}`);
  console.log(`[FusionAuth] Roles to set:`, input.roles.map((r) => r.name));

  const response = await client.patchApplication(input.applicationId, {
    application: {
      roles: input.roles.map((role) => ({
        id: role.id,  // Include for existing roles, undefined for new roles
        name: role.name,
        description: role.description,
        isDefault: role.isDefault ?? false,
        isSuperRole: role.isSuperRole ?? false,
      })),
    },
  });

  if (!response.response.application) {
    throw new Error('Failed to update FusionAuth application roles');
  }

  const updatedRoles = response.response.application.roles || [];

  console.log(`[FusionAuth] Application roles updated. Total roles: ${updatedRoles.length}`);

  return updatedRoles.map((r) => ({
    id: r.id || '',
    name: r.name || '',
    isDefault: r.isDefault ?? false,
    isSuperRole: r.isSuperRole ?? false,
  }));
}

/**
 * Gets the current roles of a FusionAuth Application.
 */
export async function getApplicationRoles(applicationId: string): Promise<ApplicationRoleResult[]> {
  const client = getFusionAuthClient();

  try {
    const response = await client.retrieveApplication(applicationId);

    if (!response.response.application?.roles) {
      return [];
    }

    return response.response.application.roles.map((r) => ({
      id: r.id || '',
      name: r.name || '',
      isDefault: r.isDefault ?? false,
      isSuperRole: r.isSuperRole ?? false,
    }));
  } catch (error) {
    // Only return empty for 404, throw for other errors
    if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 404) {
      return [];
    }
    console.error(`[FusionAuth] Error getting roles for application ${applicationId}:`, error);
    throw error;
  }
}

/**
 * Adds a single role to a FusionAuth Application.
 */
export async function addApplicationRole(
  applicationId: string,
  role: {
    name: string;
    description?: string;
    isDefault?: boolean;
    isSuperRole?: boolean;
  }
): Promise<ApplicationRoleResult | null> {
  const currentRoles = await getApplicationRoles(applicationId);

  // Check if role already exists
  const existingRole = currentRoles.find((r) => r.name === role.name);
  if (existingRole) {
    console.log(`[FusionAuth] Role "${role.name}" already exists in application`);
    return existingRole;
  }

  // Include id for existing roles so FusionAuth knows to update them, not create new ones
  const updatedRoles = await updateApplicationRoles({
    applicationId,
    roles: [
      ...currentRoles.map((r) => ({
        id: r.id,
        name: r.name,
        isDefault: r.isDefault,
        isSuperRole: r.isSuperRole,
      })),
      role,  // New role without id
    ],
  });

  return updatedRoles.find((r) => r.name === role.name) || null;
}

/**
 * Removes a role from a FusionAuth Application.
 * WARNING: This will remove the role from all users who have it assigned.
 */
export async function removeApplicationRole(applicationId: string, roleName: string): Promise<boolean> {
  const client = getFusionAuthClient();

  // Get current application to find role ID
  const app = await getFusionAuthApplication(applicationId);
  if (!app) {
    return false;
  }

  const roleToRemove = app.roles.find((r) => r.name === roleName);
  if (!roleToRemove) {
    console.log(`[FusionAuth] Role "${roleName}" not found in application`);
    return false;
  }

  // FusionAuth requires role ID for deletion
  try {
    await client.deleteApplicationRole(applicationId, roleToRemove.id);
    console.log(`[FusionAuth] Removed role "${roleName}" from application`);
    return true;
  } catch (error) {
    console.error(`[FusionAuth] Failed to remove role:`, error);
    return false;
  }
}
