import { cookies, headers } from 'next/headers';

import { getTenantFromHeaders } from './get-tenant';

// ════════════════════════════════════════════════════════════════
// Get Organizations
// ════════════════════════════════════════════════════════════════
// Fetches organizations for the current tenant.
// Used by OrganizationProvider in the layout.
// ════════════════════════════════════════════════════════════════

export interface OrganizationBasic {
  id: string;
  slug: string;
  name: string;
}

/**
 * Fetch organizations from the tenant server API.
 * Returns a list of accessible organizations.
 */
export async function getOrganizations(): Promise<{
  organizations: OrganizationBasic[];
  error?: string;
}> {
  try {
    const { tenant } = await getTenantFromHeaders();

    if (!tenant) {
      return { organizations: [], error: 'Tenant not found' };
    }

    // Get host for API call
    const headersList = await headers();
    const host = headersList.get('host') || '';
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';

    // Get access token for authenticated request
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('fa_access_token')?.value;

    if (!accessToken) {
      return { organizations: [], error: 'Not authenticated' };
    }

    // Fetch organizations from API
    // In development, use localhost directly (Node.js can't resolve subdomain.localhost)
    // In production, we use subdomain routing
    let apiUrl: string;
    if (process.env.NODE_ENV !== 'production') {
      // Development: use localhost:3000 with tenant header (Node.js can't resolve subdomains)
      apiUrl = `http://localhost:3100/api/organizations/list`;
    } else {
      // Production: replace webapp subdomain with api subdomain
      const apiHost = host.replace(/^[^.]+/, 'api');
      apiUrl = `${protocol}://${apiHost}/api/organizations/list`;
    }

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Tenant-Slug': tenant.slug,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('[getOrganizations] API error:', response.status);
      return { organizations: [], error: `API error: ${response.status}` };
    }

    const data = await response.json();

    if (!data.success) {
      return { organizations: [], error: data.message || 'Failed to fetch organizations' };
    }

    return { organizations: data.data || [] };
  } catch (error) {
    console.error('[getOrganizations] Error:', error);
    return { organizations: [], error: 'Failed to fetch organizations' };
  }
}
