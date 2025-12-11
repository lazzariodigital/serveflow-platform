// ════════════════════════════════════════════════════════════════
// Frontegg Client Utilities
// ════════════════════════════════════════════════════════════════

import type { FronteggConfig } from '../types';

// ════════════════════════════════════════════════════════════════
// Configuration
// ════════════════════════════════════════════════════════════════

let fronteggConfig: FronteggConfig | null = null;

/**
 * Initializes the Frontegg client configuration.
 *
 * @param config - Frontegg configuration (clientId, apiKey)
 *
 * Usage:
 * ```typescript
 * initFrontegg({
 *   clientId: process.env.FRONTEGG_CLIENT_ID,
 *   apiKey: process.env.FRONTEGG_API_KEY,
 *   baseUrl: 'https://api.frontegg.com', // optional
 * });
 * ```
 */
export function initFrontegg(config: FronteggConfig): void {
  fronteggConfig = {
    clientId: config.clientId,
    apiKey: config.apiKey,
    baseUrl: config.baseUrl || 'https://api.frontegg.com',
  };
}

/**
 * Gets the current Frontegg configuration.
 * Throws if not initialized.
 *
 * @returns Frontegg configuration
 */
export function getFronteggConfig(): FronteggConfig {
  if (!fronteggConfig) {
    // Try to initialize from environment variables
    const clientId = process.env['FRONTEGG_CLIENT_ID'];
    const apiKey = process.env['FRONTEGG_API_KEY'];

    if (clientId && apiKey) {
      initFrontegg({
        clientId,
        apiKey,
        baseUrl: process.env['FRONTEGG_BASE_URL'],
      });
      return fronteggConfig!;
    }

    throw new Error(
      'Frontegg client not initialized. Call initFrontegg() first or set FRONTEGG_CLIENT_ID and FRONTEGG_API_KEY environment variables.'
    );
  }

  return fronteggConfig;
}

/**
 * Resets the Frontegg configuration.
 * Useful for testing or when changing configuration.
 */
export function resetFrontegg(): void {
  fronteggConfig = null;
}

// ════════════════════════════════════════════════════════════════
// HTTP Client for Frontegg API
// ════════════════════════════════════════════════════════════════

/**
 * Makes an authenticated request to the Frontegg API.
 *
 * @param endpoint - API endpoint path
 * @param options - Fetch options
 * @returns Response data
 */
export async function fronteggFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const config = getFronteggConfig();

  const url = `${config.baseUrl}${endpoint}`;

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('frontegg-client-id', config.clientId);
  headers.set('x-access-token', config.apiKey);

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Frontegg API error: ${response.status} - ${error}`);
  }

  return response.json();
}

// ════════════════════════════════════════════════════════════════
// Vendor Token (for backend-to-backend calls)
// ════════════════════════════════════════════════════════════════

let vendorToken: string | null = null;
let vendorTokenExpiry = 0;

/**
 * Gets a vendor token for backend-to-backend API calls.
 * The token is cached and refreshed automatically.
 *
 * @returns Vendor JWT token
 */
export async function getVendorToken(): Promise<string> {
  const now = Date.now();

  // Return cached token if still valid (with 5 min buffer)
  if (vendorToken && vendorTokenExpiry > now + 5 * 60 * 1000) {
    return vendorToken;
  }

  const config = getFronteggConfig();

  // Use api.frontegg.com for vendor authentication (not the app URL)
  const apiBaseUrl = 'https://api.frontegg.com';

  const response = await fetch(`${apiBaseUrl}/auth/vendor/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      clientId: config.clientId,
      secret: config.apiKey,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get vendor token: ${response.status} - ${error}`);
  }

  const data = await response.json();

  if (!data.token) {
    throw new Error('No token received from Frontegg vendor authentication');
  }

  const token: string = data.token;
  vendorToken = token;

  // Decode JWT to get expiry (without verification - just for caching)
  const payload = JSON.parse(
    Buffer.from(token.split('.')[1], 'base64').toString()
  );
  vendorTokenExpiry = payload.exp * 1000;

  return token;
}
