import { createClerkClient as createClerk } from '@clerk/backend';
import type { ClerkClient } from '@clerk/backend';

// ════════════════════════════════════════════════════════════════
// Clerk Client Singleton
// ════════════════════════════════════════════════════════════════

let clerkClientInstance: ClerkClient | null = null;

/**
 * Creates or returns the singleton Clerk client instance.
 *
 * @param secretKey - Clerk secret key (defaults to CLERK_SECRET_KEY env var)
 * @returns Clerk client instance
 *
 * Usage:
 * ```typescript
 * const clerk = createClerkClient();
 * const user = await clerk.users.getUser('user_xxx');
 * ```
 */
export function createClerkClient(secretKey?: string): ClerkClient {
  if (clerkClientInstance) {
    return clerkClientInstance;
  }

  const key = secretKey || process.env['CLERK_SECRET_KEY'];

  if (!key) {
    throw new Error(
      'CLERK_SECRET_KEY is required. Set it in environment variables or pass it explicitly.'
    );
  }

  clerkClientInstance = createClerk({ secretKey: key });

  return clerkClientInstance;
}

/**
 * Gets the existing Clerk client instance.
 * Throws if not initialized.
 *
 * @returns Clerk client instance
 */
export function getClerkClient(): ClerkClient {
  if (!clerkClientInstance) {
    throw new Error(
      'Clerk client not initialized. Call createClerkClient() first.'
    );
  }

  return clerkClientInstance;
}

/**
 * Resets the Clerk client instance.
 * Useful for testing or when changing configuration.
 */
export function resetClerkClient(): void {
  clerkClientInstance = null;
}
