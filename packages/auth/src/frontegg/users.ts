import { getVendorToken } from './client';
import type { FronteggUser } from '../types';

// Frontegg API base URL for backend-to-backend calls
const FRONTEGG_API_URL = 'https://api.frontegg.com';

// ════════════════════════════════════════════════════════════════
// User CRUD Operations with Frontegg
// ════════════════════════════════════════════════════════════════

export interface CreateFronteggUserInput {
  email: string;
  name?: string;
  password?: string;
  tenantId: string;
  roleIds?: string[];
  metadata?: Record<string, unknown>;
  skipInviteEmail?: boolean;
}

export interface UpdateFronteggUserInput {
  name?: string;
  phoneNumber?: string;
  profilePictureUrl?: string;
  metadata?: Record<string, unknown>;
}

// ════════════════════════════════════════════════════════════════
// Create User
// ════════════════════════════════════════════════════════════════

/**
 * Creates a new user in Frontegg for a specific tenant.
 *
 * @param input - User data
 * @returns Created Frontegg user
 *
 * Usage:
 * ```typescript
 * const user = await createFronteggUser({
 *   email: 'user@example.com',
 *   name: 'John Doe',
 *   tenantId: 'tenant-uuid',
 *   skipInviteEmail: false,
 * });
 * ```
 */
export async function createFronteggUser(
  input: CreateFronteggUserInput
): Promise<FronteggUser> {
  const token = await getVendorToken();

  const response = await fetch(
    `${FRONTEGG_API_URL}/identity/resources/users/v2`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'frontegg-tenant-id': input.tenantId,
      },
      body: JSON.stringify({
        email: input.email,
        name: input.name,
        password: input.password,
        roleIds: input.roleIds,
        metadata: JSON.stringify(input.metadata || {}),
        skipInviteEmail: input.skipInviteEmail ?? false,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Frontegg user: ${response.status} - ${error}`);
  }

  return response.json();
}

// ════════════════════════════════════════════════════════════════
// Get User
// ════════════════════════════════════════════════════════════════

/**
 * Gets a user from Frontegg by their ID.
 *
 * @param userId - Frontegg user ID (UUID)
 * @param tenantId - Tenant ID for context
 * @returns Frontegg user
 */
export async function getFronteggUser(
  userId: string,
  tenantId: string
): Promise<FronteggUser> {
  const token = await getVendorToken();

  const response = await fetch(
    `${FRONTEGG_API_URL}/identity/resources/users/v1/${userId}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'frontegg-tenant-id': tenantId,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Frontegg user: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Gets a user from Frontegg by their email.
 *
 * @param email - User email
 * @param tenantId - Tenant ID for context
 * @returns Frontegg user or null if not found
 */
export async function getFronteggUserByEmail(
  email: string,
  tenantId: string
): Promise<FronteggUser | null> {
  const token = await getVendorToken();

  const response = await fetch(
    `${FRONTEGG_API_URL}/identity/resources/users/v1?_email=${encodeURIComponent(email)}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'frontegg-tenant-id': tenantId,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const error = await response.text();
    throw new Error(`Failed to get Frontegg user by email: ${response.status} - ${error}`);
  }

  const users = await response.json();
  return users[0] || null;
}

// ════════════════════════════════════════════════════════════════
// Update User
// ════════════════════════════════════════════════════════════════

/**
 * Updates a user in Frontegg.
 *
 * @param userId - Frontegg user ID
 * @param tenantId - Tenant ID for context
 * @param input - Fields to update
 * @returns Updated Frontegg user
 */
export async function updateFronteggUser(
  userId: string,
  tenantId: string,
  input: UpdateFronteggUserInput
): Promise<FronteggUser> {
  const token = await getVendorToken();

  const response = await fetch(
    `${FRONTEGG_API_URL}/identity/resources/users/v1/${userId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'frontegg-tenant-id': tenantId,
      },
      body: JSON.stringify(input),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update Frontegg user: ${response.status} - ${error}`);
  }

  return response.json();
}

// ════════════════════════════════════════════════════════════════
// Delete User
// ════════════════════════════════════════════════════════════════

/**
 * Deletes a user from Frontegg.
 *
 * @param userId - Frontegg user ID
 * @param tenantId - Tenant ID for context
 */
export async function deleteFronteggUser(
  userId: string,
  tenantId: string
): Promise<void> {
  const token = await getVendorToken();

  const response = await fetch(
    `${FRONTEGG_API_URL}/identity/resources/users/v1/${userId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'frontegg-tenant-id': tenantId,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete Frontegg user: ${response.status} - ${error}`);
  }
}

// ════════════════════════════════════════════════════════════════
// List Users
// ════════════════════════════════════════════════════════════════

export interface ListFronteggUsersParams {
  tenantId: string;
  limit?: number;
  offset?: number;
  email?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

/**
 * Lists users from Frontegg for a specific tenant.
 *
 * @param params - List parameters
 * @returns List of Frontegg users
 */
export async function listFronteggUsers(
  params: ListFronteggUsersParams
): Promise<FronteggUser[]> {
  const token = await getVendorToken();

  const searchParams = new URLSearchParams();
  if (params.limit) searchParams.set('_limit', params.limit.toString());
  if (params.offset) searchParams.set('_offset', params.offset.toString());
  if (params.email) searchParams.set('_email', params.email);
  if (params.sortBy) searchParams.set('_sortBy', params.sortBy);
  if (params.sortDirection) searchParams.set('_sortDirection', params.sortDirection);

  const response = await fetch(
    `${FRONTEGG_API_URL}/identity/resources/users/v2?${searchParams.toString()}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'frontegg-tenant-id': params.tenantId,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list Frontegg users: ${response.status} - ${error}`);
  }

  return response.json();
}

// ════════════════════════════════════════════════════════════════
// User Roles
// ════════════════════════════════════════════════════════════════

/**
 * Assigns roles to a user in Frontegg.
 *
 * @param userId - Frontegg user ID
 * @param tenantId - Tenant ID
 * @param roleIds - Array of role IDs to assign
 */
export async function assignUserRoles(
  userId: string,
  tenantId: string,
  roleIds: string[]
): Promise<void> {
  const token = await getVendorToken();

  const response = await fetch(
    `${FRONTEGG_API_URL}/identity/resources/users/v1/${userId}/roles`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'frontegg-tenant-id': tenantId,
      },
      body: JSON.stringify({ roleIds }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to assign roles: ${response.status} - ${error}`);
  }
}

/**
 * Removes roles from a user in Frontegg.
 *
 * @param userId - Frontegg user ID
 * @param tenantId - Tenant ID
 * @param roleIds - Array of role IDs to remove
 */
export async function removeUserRoles(
  userId: string,
  tenantId: string,
  roleIds: string[]
): Promise<void> {
  const token = await getVendorToken();

  const response = await fetch(
    `${FRONTEGG_API_URL}/identity/resources/users/v1/${userId}/roles`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'frontegg-tenant-id': tenantId,
      },
      body: JSON.stringify({ roleIds }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to remove roles: ${response.status} - ${error}`);
  }
}
