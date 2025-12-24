// ════════════════════════════════════════════════════════════════
// Authorization Context Types
// ════════════════════════════════════════════════════════════════

/**
 * App types that users can access.
 * - dashboard: Admin/management interface (admin, employee, provider with access)
 * - webapp: Client-facing interface (provider, client)
 */
export type AppType = 'dashboard' | 'webapp';

/**
 * User context from JWT token.
 */
export interface UserContext {
  /** FusionAuth User ID (UUID) */
  userId: string;
  /** User email */
  email: string;
  /** First name */
  firstName?: string;
  /** Last name */
  lastName?: string;
  /** Profile image URL */
  imageUrl?: string;
  /** Roles assigned to the user */
  roles: string[];
  /** Organization IDs the user belongs to (empty = all orgs) */
  organizationIds: string[];
  /** Primary organization ID */
  primaryOrganizationId?: string;
  /** FusionAuth Tenant ID */
  tenantId?: string;
  /** Serveflow Tenant Slug */
  tenantSlug?: string;
  /** FusionAuth Application ID (audience) - the app this JWT was issued for */
  applicationId?: string;
}

/**
 * Authorization context for frontend components.
 */
export interface AuthorizationContext {
  /** User roles from JWT */
  userRoles: string[];
  /** Organization IDs user can access */
  organizationIds: string[];
  /** Current app type */
  appType: AppType;
  /** Routes configuration */
  routes: DashboardRoute[];
  /** Check if user has a specific role */
  hasRole: (role: string) => boolean;
  /** Check if user has any of the specified roles */
  hasAnyRole: (roles: string[]) => boolean;
  /** Check if user can access a specific route */
  canAccessRoute: (path: string) => boolean;
  /** Get routes accessible to the current user */
  getAccessibleRoutes: () => DashboardRoute[];
}

/**
 * Route configuration for navigation and access control.
 */
export interface DashboardRoute {
  /** Route path (e.g., "/users", "/bookings") */
  path: string;
  /** Display label */
  label: string;
  /** Icon name (for rendering) */
  icon: string;
  /** Roles that can access this route */
  allowedRoles: string[];
  /** Whether the route is enabled */
  isEnabled: boolean;
  /** Order in navigation */
  order: number;
  /** Sub-routes */
  children?: DashboardRoute[];
}

/**
 * Tenant role configuration.
 */
export interface TenantRole {
  /** Role slug (e.g., "admin", "employee") */
  slug: string;
  /** Display name */
  name: string;
  /** Description */
  description?: string;
  /** Apps this role can access */
  allowedApps: AppType[];
  /** Whether this is a super role (full access) */
  isSuperRole: boolean;
  /** Whether this is the default role for new users */
  isDefault: boolean;
  /** Whether the role is active */
  isActive: boolean;
}

/**
 * Decoded JWT payload from FusionAuth.
 */
export interface FusionAuthJwtPayload {
  /** User ID (subject) */
  sub: string;
  /** Application ID (audience) */
  aud: string;
  /** Issuer */
  iss: string;
  /** Expiration timestamp */
  exp: number;
  /** Issued at timestamp */
  iat: number;
  /** Email */
  email: string;
  /** Email verified */
  email_verified?: boolean;
  /** First name */
  given_name?: string;
  /** Last name */
  family_name?: string;
  /** Profile picture URL */
  picture?: string;
  /** Roles from registration */
  roles?: string[];
  /** FusionAuth Tenant ID */
  tid?: string;
  /** Application ID */
  applicationId?: string;
  /** Serveflow Tenant Slug (via JWT Populate Lambda) */
  tenantSlug?: string;
  /** Organization IDs (via JWT Populate Lambda) - empty array means ALL orgs */
  organizationIds?: string[];
  /** Primary organization ID (via JWT Populate Lambda) */
  primaryOrganizationId?: string;
}

/**
 * Organization data for frontend use.
 */
export interface OrganizationInfo {
  /** Organization ID */
  id: string;
  /** URL-friendly identifier */
  slug: string;
  /** Display name */
  name: string;
}

/**
 * Organization context for components.
 */
export interface OrganizationContextValue {
  /** Currently selected organization (null = all orgs or not selected) */
  currentOrganization: OrganizationInfo | null;
  /** List of organizations user can access */
  organizations: OrganizationInfo[];
  /** Whether user has access to all organizations */
  hasFullAccess: boolean;
  /** User's primary organization ID */
  primaryOrganizationId: string | undefined;
  /** Loading state */
  isLoading: boolean;
  /** Set current organization */
  setCurrentOrganization: (org: OrganizationInfo | null) => void;
  /** Set current organization by ID */
  setCurrentOrganizationById: (orgId: string | null) => void;
}
