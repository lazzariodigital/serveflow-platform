import type { TenantMVP } from '@serveflow/core';
import { getSystemDb } from '@serveflow/db/client';

// ════════════════════════════════════════════════════════════════
// Tenant Resolution Types
// ════════════════════════════════════════════════════════════════

export interface TenantResolutionResult {
  tenant: TenantMVP | null;
  error?: string;
}

// ════════════════════════════════════════════════════════════════
// Subdomain Extraction
// ════════════════════════════════════════════════════════════════

/**
 * Extracts tenant slug from hostname
 * Examples:
 *   - "club-madrid.serveflow.com" -> "club-madrid"
 *   - "demo.localhost:3000" -> "demo"
 *   - "serveflow.com" -> null (no subdomain)
 *   - "localhost:3000" -> null (no subdomain)
 */
export function extractSlugFromHost(host: string): string | null {
  // Remove port if present
  const hostname = host.split(':')[0];

  // For localhost development
  if (hostname.endsWith('.localhost') || hostname.match(/^[\w-]+\.localhost$/)) {
    return hostname.split('.')[0];
  }

  // For production domains (e.g., club-madrid.serveflow.com)
  const parts = hostname.split('.');

  // Need at least 3 parts for subdomain (subdomain.domain.tld)
  if (parts.length >= 3) {
    // Exclude www as subdomain
    if (parts[0] === 'www') {
      return null;
    }
    return parts[0];
  }

  return null;
}

// ════════════════════════════════════════════════════════════════
// Tenant Resolution
// ════════════════════════════════════════════════════════════════

/**
 * Resolves tenant from slug by querying system database
 */
export async function resolveTenantBySlug(
  slug: string
): Promise<TenantResolutionResult> {
  try {
    const systemDb = await getSystemDb();
    const tenantsCollection = systemDb.collection<TenantMVP>('tenants');

    const tenant = await tenantsCollection.findOne({
      slug,
      status: 'active',
    });

    console.log(`Tenant lookup for slug "${slug}":`, tenant);

    if (!tenant) {
      return {
        tenant: null,
        error: `Tenant not found: ${slug}`,
      };
    }

    return { tenant };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      tenant: null,
      error: `Failed to resolve tenant: ${message}`,
    };
  }
}

/**
 * Resolves tenant from HTTP host header
 */
export async function resolveTenantFromHost(
  host: string
): Promise<TenantResolutionResult> {
  const slug = extractSlugFromHost(host);

  if (!slug) {
    return {
      tenant: null,
      error: 'No tenant subdomain found in host',
    };
  }

  return resolveTenantBySlug(slug);
}

/**
 * Resolves tenant from FusionAuth tenant ID
 */
export async function resolveTenantByFusionauthId(
  fusionauthTenantId: string
): Promise<TenantResolutionResult> {
  try {
    const systemDb = await getSystemDb();
    const tenantsCollection = systemDb.collection<TenantMVP>('tenants');

    const tenant = await tenantsCollection.findOne({
      fusionauthTenantId,
      status: 'active',
    });

    if (!tenant) {
      return {
        tenant: null,
        error: `Tenant not found for FusionAuth tenant: ${fusionauthTenantId}`,
      };
    }

    return { tenant };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      tenant: null,
      error: `Failed to resolve tenant: ${message}`,
    };
  }
}
