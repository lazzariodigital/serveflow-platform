import type { Request } from 'express';

// ════════════════════════════════════════════════════════════════
// Auth Types - Frontegg
// ════════════════════════════════════════════════════════════════

/**
 * Frontegg user structure from decoded JWT token
 */
export interface FronteggUser {
  id: string;
  sub: string;
  email: string;
  name?: string;
  tenantId: string;
  tenantIds?: string[];
  roles: string[];
  permissions: string[];
  metadata?: Record<string, unknown>;
  // Additional fields from Frontegg API response
  profilePictureUrl?: string;
  verified?: boolean;
  phoneNumber?: string;
  createdAt?: string;
  lastLogin?: string;
}

/**
 * Tenant information from Frontegg
 */
export interface FronteggTenant {
  tenantId: string;
  name?: string;
  creatorEmail?: string;
  creatorName?: string;
}

/**
 * Authenticated user object injected into requests
 */
export interface AuthenticatedUser {
  fronteggUserId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
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
    permissions: string[];
  };
}

// ════════════════════════════════════════════════════════════════
// Guard Options
// ════════════════════════════════════════════════════════════════

export interface FronteggGuardOptions {
  /**
   * If true, requires the user to have a valid tenant context
   */
  requireTenant?: boolean;

  /**
   * Required roles (any of these roles will pass)
   */
  roles?: string[];

  /**
   * Required permissions (any of these permissions will pass)
   */
  permissions?: string[];

  /**
   * If true, skips authentication (useful for public endpoints)
   */
  isPublic?: boolean;
}

// ════════════════════════════════════════════════════════════════
// Frontegg Configuration
// ════════════════════════════════════════════════════════════════

export interface FronteggConfig {
  clientId: string;
  apiKey: string;
  baseUrl?: string;
}
