// ════════════════════════════════════════════════════════════════
// Client-side API Helper
// ════════════════════════════════════════════════════════════════
// Constructs the correct API URL for client-side fetch calls.
// In development: uses subdomain.localhost:3100
// In production: uses subdomain routing
// ════════════════════════════════════════════════════════════════

/**
 * Get cookie value by name
 */
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

/**
 * Get the base URL for tenant API calls from client-side code.
 * Preserves the subdomain for tenant identification.
 *
 * @example
 * const url = getApiUrl('/organizations');
 * // Development: http://gimnasio-fitmax.localhost:3100/api/organizations
 * // Production: https://gimnasio-fitmax.serveflow.com/api/organizations
 */
export function getApiUrl(path: string): string {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  // Ensure path starts with /api
  const apiPath = path.startsWith('/api') ? path : `/api${path.startsWith('/') ? path : `/${path}`}`;

  if (process.env.NODE_ENV !== 'production') {
    // Development: use port 3100 (tenant-server) with subdomain
    return `http://${hostname}:3100${apiPath}`;
  }

  // Production: use same origin (handled by infrastructure)
  return `${protocol}//${hostname}${apiPath}`;
}

/**
 * Get headers for authenticated API calls.
 * Includes Authorization header with Bearer token from cookie.
 */
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const accessToken = getCookie('fa_access_token');
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  return headers;
}

/**
 * Fetch wrapper that uses the correct API URL.
 * Automatically includes credentials and Authorization header.
 *
 * @example
 * const data = await apiFetch('/organizations?includeInactive=true');
 * const result = await apiFetch('/organizations', { method: 'POST', body: JSON.stringify(data) });
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<{ data: T; success: boolean; error?: string }> {
  const url = getApiUrl(path);

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  const json = await response.json();

  if (!response.ok) {
    return {
      data: json,
      success: false,
      error: json.message || `Error ${response.status}`,
    };
  }

  return {
    data: json.data ?? json,
    success: true,
  };
}
