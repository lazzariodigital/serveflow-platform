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
  tenantId?: string;     // Serveflow tenant ID
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
  roles: string[];
}

// ════════════════════════════════════════════════════════════════
// Request Extension
// ════════════════════════════════════════════════════════════════

export interface AuthRequest extends Request {
  user: AuthenticatedUser;
  auth: {
    userId: string;
    tenantId: string;
    roles: string[];
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
