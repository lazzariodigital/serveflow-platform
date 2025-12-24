import { headers } from 'next/headers';
import type { TenantMVP } from '@serveflow/core';
import { resolveTenantFromHost, extractSlugFromHost } from '@serveflow/tenants/resolve';

export interface TenantResult {
  tenant: TenantMVP | null;
  error: string | null;
  attemptedSlug: string | null;
}

/**
 * Serialize tenant to plain object for passing to Client Components.
 * MongoDB objects (like _id with buffer) cannot be passed directly.
 */
function serializeTenant(tenant: TenantMVP | null): TenantMVP | null {
  if (!tenant) return null;
  return JSON.parse(JSON.stringify(tenant));
}

/**
 * Server-side function to resolve tenant from request headers.
 * Returns both tenant and error for proper error handling.
 */
export async function getTenantFromHeaders(): Promise<TenantResult> {
  const headersList = await headers();
  const host = headersList.get('host') || headersList.get('x-forwarded-host') || '';

  if (!host) {
    console.warn('[getTenantFromHeaders] No host header found');
    return { tenant: null, error: 'No host header found', attemptedSlug: null };
  }

  // Extract slug for error display
  const attemptedSlug = extractSlugFromHost(host);

  const { tenant, error } = await resolveTenantFromHost(host);

  if (error) {
    console.warn(`[getTenantFromHeaders] ${error}`);
  }

  return { tenant: serializeTenant(tenant), error: error || null, attemptedSlug };
}

/**
 * Server-side function to get tenant settings for metadata generation.
 */
export async function getTenantMetadata(): Promise<{
  title: string;
  description?: string;
}> {
  const { tenant } = await getTenantFromHeaders();

  if (!tenant) {
    return {
      title: 'Serveflow',
      description: 'Sports club management platform',
    };
  }

  return {
    title: tenant.branding.appName || tenant.name,
    description: `${tenant.name} - Powered by Serveflow`,
  };
}
