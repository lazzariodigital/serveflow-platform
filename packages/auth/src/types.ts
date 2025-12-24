import type { Request } from 'express';

// ════════════════════════════════════════════════════════════════
// Auth Types - FusionAuth
// ════════════════════════════════════════════════════════════════

/**
 * FusionAuth user structure from API response
 */
export interface FusionAuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  imageUrl?: string;
  verified: boolean;
  active: boolean;
  tenantId: string;
  // Registration data (roles are per-application)
  registrations?: Array<{
    applicationId: string;
    roles: string[];
    data?: Record<string, unknown>;
  }>;
  // Additional fields
  mobilePhone?: string;
  birthDate?: string;
  data?: Record<string, unknown>;
  insertInstant?: number;
  lastLoginInstant?: number;
}

/**
 * FusionAuth JWT payload structure
 */
export interface FusionAuthJwtPayload {
  // Standard claims
  sub: string;           // User ID (UUID)
  aud: string;           // Application ID
  iss: string;           // FusionAuth URL (issuer)
  exp: number;           // Expiration timestamp
  iat: number;           // Issued at timestamp

  // FusionAuth claims
  email: string;
  email_verified: boolean;
  authenticationType: string;  // 'PASSWORD', 'REFRESH_TOKEN', etc.

  // User info
  given_name?: string;   // First name
  family_name?: string;  // Last name
  name?: string;         // Full name
  picture?: string;      // Profile picture URL

  // Registration claims
  applicationId: string;
  roles: string[];       // Roles from Registration
  tid?: string;          // Tenant ID (if using multi-tenant)

  // Custom claims (via JWT Populate Lambda)
  tenantId?: string;         // Serveflow tenant ID
  tenantSlug?: string;       // Serveflow tenant slug

  // Organization claims (via JWT Populate Lambda)
  // Empty array means access to ALL organizations
  organizationIds?: string[];
  primaryOrganizationId?: string;
}

/**
 * Tenant information from FusionAuth
 */
export interface FusionAuthTenant {
  id: string;
  name: string;
  configured: boolean;
  data?: Record<string, unknown>;
}

/**
 * Authenticated user object injected into requests
 * NOTE: permissions removed - will be handled by Cerbos in Block 3
 */
export interface AuthenticatedUser {
  fusionauthUserId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  tenantId: string;
  tenantSlug?: string;
  roles: string[];
  // Organization access (empty array = access to ALL organizations)
  organizationIds: string[];
  primaryOrganizationId?: string;
}

// ════════════════════════════════════════════════════════════════
// Request Extension
// ════════════════════════════════════════════════════════════════

export interface AuthRequest extends Request {
  user: AuthenticatedUser;
  auth: {
    userId: string;
    tenantId: string;
    tenantSlug?: string;
    roles: string[];
    // Organization access (empty array = access to ALL organizations)
    organizationIds: string[];
    primaryOrganizationId?: string;
  };
}

// ════════════════════════════════════════════════════════════════
// Guard Options
// ════════════════════════════════════════════════════════════════

export interface FusionAuthGuardOptions {
  /**
   * If true, requires the user to have a valid tenant context
   */
  requireTenant?: boolean;

  /**
   * Required roles (any of these roles will pass)
   */
  roles?: string[];

  /**
   * If true, skips authentication (useful for public endpoints)
   */
  isPublic?: boolean;
}

// ════════════════════════════════════════════════════════════════
// FusionAuth Configuration
// ════════════════════════════════════════════════════════════════

export interface FusionAuthConfig {
  apiKey: string;
  url: string;
  tenantId?: string;      // Default FusionAuth tenant ID
  applicationId?: string; // Default application ID
}

// ════════════════════════════════════════════════════════════════
// Input Types for FusionAuth Operations
// ════════════════════════════════════════════════════════════════

export interface CreateFusionAuthUserInput {
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  tenantId: string;
  applicationId: string;
  roles?: string[];
  sendSetPasswordEmail?: boolean;
  data?: Record<string, unknown>;
}

/**
 * Input for creating a user with multiple application registrations.
 * According to 03-PERMISOS.md section 5.1:
 * - user.data.roles: All roles the user has
 * - user.data.organizationIds: All organizations
 * - registrations[]: One per app with subset of roles allowed in that app
 */
export interface CreateFusionAuthUserWithAppsInput {
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  tenantId: string;
  tenantSlug: string;
  // All roles the user has (stored in user.data.roles)
  roles: string[];
  // Organization IDs (stored in user.data.organizationIds)
  organizationIds?: string[];
  primaryOrganizationId?: string;
  // Registrations per app
  registrations: {
    applicationId: string;
    roles: string[]; // Subset of roles allowed in this app
  }[];
  sendSetPasswordEmail?: boolean;
}

export interface UpdateFusionAuthUserInput {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  imageUrl?: string;
  mobilePhone?: string;
  data?: Record<string, unknown>;
}

export interface ListFusionAuthUsersParams {
  tenantId?: string;
  applicationId?: string;
  queryString?: string;
  numberOfResults?: number;
  startRow?: number;
}
