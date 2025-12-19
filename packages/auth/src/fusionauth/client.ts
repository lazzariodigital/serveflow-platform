import { FusionAuthClient } from '@fusionauth/typescript-client';

// ════════════════════════════════════════════════════════════════
// FusionAuth Client
// ════════════════════════════════════════════════════════════════

let client: FusionAuthClient | null = null;

/**
 * Gets the FusionAuth client singleton.
 * Initializes from environment variables if not already created.
 *
 * Required environment variables:
 * - FUSIONAUTH_API_KEY: API key from FusionAuth Settings > API Keys
 * - FUSIONAUTH_URL: FusionAuth server URL (e.g., http://localhost:9011)
 *
 * @returns FusionAuth client instance
 * @throws Error if environment variables are not set
 */
export function getFusionAuthClient(): FusionAuthClient {
  if (!client) {
    const apiKey = process.env['FUSIONAUTH_API_KEY'];
    const url = process.env['FUSIONAUTH_URL'];

    if (!apiKey) {
      throw new Error(
        'FUSIONAUTH_API_KEY environment variable is not set. ' +
        'Generate an API key in FusionAuth Settings > API Keys.'
      );
    }

    if (!url) {
      throw new Error(
        'FUSIONAUTH_URL environment variable is not set. ' +
        'Set it to your FusionAuth server URL (e.g., http://localhost:9011).'
      );
    }

    client = new FusionAuthClient(apiKey, url);
  }

  return client;
}

/**
 * Gets the FusionAuth client for a specific tenant.
 * Useful when operating across multiple FusionAuth tenants.
 *
 * @param tenantId - FusionAuth tenant ID to scope requests to
 * @returns FusionAuth client instance with tenant header
 */
export function getFusionAuthClientForTenant(tenantId: string): FusionAuthClient {
  // Validate inputs
  const apiKey = process.env['FUSIONAUTH_API_KEY'];
  const url = process.env['FUSIONAUTH_URL'];

  if (!apiKey || !url) {
    throw new Error('FUSIONAUTH_API_KEY or FUSIONAUTH_URL not configured');
  }

  console.log(`[FusionAuth] Creating client for tenant: ${tenantId}`);
  console.log(`[FusionAuth] URL: ${url}`);

  const tenantClient = new FusionAuthClient(apiKey, url, tenantId);

  return tenantClient;
}

/**
 * Gets the FusionAuth base URL from environment.
 *
 * @returns FusionAuth URL
 */
export function getFusionAuthUrl(): string {
  const url = process.env['FUSIONAUTH_URL'];

  if (!url) {
    throw new Error('FUSIONAUTH_URL environment variable is not set.');
  }

  return url;
}

/**
 * Resets the client singleton.
 * Useful for testing or when configuration changes.
 */
export function resetFusionAuthClient(): void {
  client = null;
}
