'use client';

import type { UserContext, FusionAuthJwtPayload } from '../types';

// ════════════════════════════════════════════════════════════════
// useCurrentUser Hook
// ════════════════════════════════════════════════════════════════
// Extracts user information from the JWT token stored in cookies.
// This hook is for client-side use only.
//
// NOTE: We intentionally don't use useMemo here because:
// 1. Cookie reading is synchronous and fast
// 2. We need to detect cookie changes after navigation (router.refresh)
// 3. Memoizing with stable deps prevents re-evaluation
// ════════════════════════════════════════════════════════════════

/**
 * Decode JWT payload from a token string.
 * Note: This only decodes the payload, it does NOT verify the signature.
 * Signature verification is done server-side.
 */
function decodeJwtPayload(token: string): FusionAuthJwtPayload | null {
  try {
    const base64Payload = token.split('.')[1];
    if (!base64Payload) return null;

    const payload = JSON.parse(atob(base64Payload));
    return payload as FusionAuthJwtPayload;
  } catch {
    return null;
  }
}

/**
 * Get access token from cookies (client-side).
 */
function getAccessToken(): string | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'fa_access_token') {
      return decodeURIComponent(value);
    }
  }
  return null;
}

/**
 * Get user context from JWT token.
 * @param expectedApplicationId - Optional: if provided, returns null if JWT's aud doesn't match
 */
function getUserFromToken(expectedApplicationId?: string): UserContext | null {
  const token = getAccessToken();
  if (!token) return null;

  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  // Check if token is expired
  if (payload.exp && Date.now() >= payload.exp * 1000) {
    return null;
  }

  // If expectedApplicationId is provided, validate the JWT was issued for this app
  // This prevents cross-app authentication when dashboard and webapp share cookies
  if (expectedApplicationId && payload.aud && payload.aud !== expectedApplicationId) {
    console.warn(
      `[useCurrentUser] JWT issued for different app. Expected: ${expectedApplicationId}, Got: ${payload.aud}`
    );
    return null;
  }

  return {
    userId: payload.sub,
    email: payload.email,
    firstName: payload.given_name,
    lastName: payload.family_name,
    imageUrl: payload.picture,
    roles: payload.roles || [],
    // Organization data from JWT Populate Lambda
    // Empty array means access to ALL organizations
    organizationIds: payload.organizationIds || [],
    primaryOrganizationId: payload.primaryOrganizationId,
    tenantId: payload.tid,
    tenantSlug: payload.tenantSlug,
    applicationId: payload.aud, // Include applicationId for consumers who need it
  };
}

export interface UseCurrentUserOptions {
  /**
   * If provided, only return user if JWT was issued for this FusionAuth Application ID.
   * This prevents cross-app authentication when multiple apps share cookies.
   *
   * For tenant apps, pass: tenant?.fusionauthApplications?.webapp?.id
   * or tenant?.fusionauthApplications?.dashboard?.id
   */
  expectedApplicationId?: string;
}

/**
 * Hook to get the current authenticated user from JWT.
 *
 * @example
 * ```tsx
 * // Basic usage (no app validation)
 * const { user, isAuthenticated, roles } = useCurrentUser();
 *
 * // With app validation (recommended for multi-app setups)
 * const { tenant } = useTenant();
 * const { user, isAuthenticated } = useCurrentUser({
 *   expectedApplicationId: tenant?.fusionauthApplications?.webapp?.id
 * });
 *
 * if (!isAuthenticated) {
 *   return <LoginPrompt />;
 * }
 *
 * return <div>Hello, {user?.firstName}!</div>;
 * ```
 */
export function useCurrentUser(options: UseCurrentUserOptions = {}): {
  user: UserContext | null;
  isAuthenticated: boolean;
  roles: string[];
  isLoading: boolean;
} {
  // Read user from token on every render to catch cookie changes
  // This is intentional - cookie reading is fast and we need reactivity
  const user = getUserFromToken(options.expectedApplicationId);

  return {
    user,
    isAuthenticated: user !== null,
    roles: user?.roles || [],
    isLoading: false, // Token decoding is synchronous
  };
}
