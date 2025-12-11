import { getVendorToken } from './client';
import type { FronteggTenant } from '../types';

// Frontegg API base URL for backend-to-backend calls
const FRONTEGG_API_URL = 'https://api.frontegg.com';

// ════════════════════════════════════════════════════════════════
// Tenant Operations with Frontegg
// ════════════════════════════════════════════════════════════════

export interface CreateFronteggTenantInput {
  name: string;
  tenantId?: string; // Optional - Frontegg will generate if not provided
  creatorEmail?: string;
  creatorName?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateFronteggTenantInput {
  name?: string;
  metadata?: Record<string, unknown>;
}

// ════════════════════════════════════════════════════════════════
// Create Tenant
// ════════════════════════════════════════════════════════════════

/**
 * Creates a new tenant in Frontegg.
 *
 * @param input - Tenant data
 * @returns Created Frontegg tenant
 *
 * Usage:
 * ```typescript
 * const tenant = await createFronteggTenant({
 *   name: 'Gimnasio Demo',
 *   creatorEmail: 'owner@example.com',
 * });
 * ```
 */
export async function createFronteggTenant(
  input: CreateFronteggTenantInput
): Promise<FronteggTenant> {
  const token = await getVendorToken();

  const response = await fetch(
    `${FRONTEGG_API_URL}/tenants/resources/tenants/v1`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: input.name,
        tenantId: input.tenantId,
        creatorEmail: input.creatorEmail,
        creatorName: input.creatorName,
        metadata: JSON.stringify(input.metadata || {}),
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Frontegg tenant: ${response.status} - ${error}`);
  }

  return response.json();
}

// ════════════════════════════════════════════════════════════════
// Get Tenant
// ════════════════════════════════════════════════════════════════

/**
 * Gets a tenant from Frontegg by its ID.
 *
 * @param tenantId - Frontegg tenant ID (UUID)
 * @returns Frontegg tenant
 */
export async function getFronteggTenant(
  tenantId: string
): Promise<FronteggTenant> {
  const token = await getVendorToken();

  const response = await fetch(
    `${FRONTEGG_API_URL}/tenants/resources/tenants/v1/${tenantId}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Frontegg tenant: ${response.status} - ${error}`);
  }

  return response.json();
}

// ════════════════════════════════════════════════════════════════
// Update Tenant
// ════════════════════════════════════════════════════════════════

/**
 * Updates a tenant in Frontegg.
 *
 * @param tenantId - Frontegg tenant ID
 * @param input - Fields to update
 * @returns Updated Frontegg tenant
 */
export async function updateFronteggTenant(
  tenantId: string,
  input: UpdateFronteggTenantInput
): Promise<FronteggTenant> {
  const token = await getVendorToken();

  const response = await fetch(
    `${FRONTEGG_API_URL}/tenants/resources/tenants/v1/${tenantId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update Frontegg tenant: ${response.status} - ${error}`);
  }

  return response.json();
}

// ════════════════════════════════════════════════════════════════
// Delete Tenant
// ════════════════════════════════════════════════════════════════

/**
 * Deletes a tenant from Frontegg.
 * WARNING: This will delete all users associated with this tenant!
 *
 * @param tenantId - Frontegg tenant ID
 */
export async function deleteFronteggTenant(tenantId: string): Promise<void> {
  const token = await getVendorToken();

  const response = await fetch(
    `${FRONTEGG_API_URL}/tenants/resources/tenants/v1/${tenantId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete Frontegg tenant: ${response.status} - ${error}`);
  }
}

// ════════════════════════════════════════════════════════════════
// List Tenants
// ════════════════════════════════════════════════════════════════

export interface ListFronteggTenantsParams {
  limit?: number;
  offset?: number;
  name?: string;
}

/**
 * Lists all tenants in Frontegg.
 *
 * @param params - List parameters
 * @returns List of Frontegg tenants
 */
export async function listFronteggTenants(
  params: ListFronteggTenantsParams = {}
): Promise<FronteggTenant[]> {
  const token = await getVendorToken();

  const searchParams = new URLSearchParams();
  if (params.limit) searchParams.set('_limit', params.limit.toString());
  if (params.offset) searchParams.set('_offset', params.offset.toString());
  if (params.name) searchParams.set('_filter', params.name);

  const response = await fetch(
    `${FRONTEGG_API_URL}/tenants/resources/tenants/v1?${searchParams.toString()}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list Frontegg tenants: ${response.status} - ${error}`);
  }

  return response.json();
}
