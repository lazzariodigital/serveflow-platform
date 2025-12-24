import type { AppType, DashboardRoute, TenantRole, FusionAuthJwtPayload } from '../types';

// ════════════════════════════════════════════════════════════════
// Middleware Utilities
// ════════════════════════════════════════════════════════════════
// Utility functions for Next.js middleware authorization.
// These run at the edge and must be lightweight.
// ════════════════════════════════════════════════════════════════

/**
 * Decode JWT payload without verification.
 * Note: Signature verification is done server-side.
 */
export function decodeJwtPayload(token: string): FusionAuthJwtPayload | null {
  try {
    const base64Payload = token.split('.')[1];
    if (!base64Payload) return null;

    const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
    return payload as FusionAuthJwtPayload;
  } catch {
    return null;
  }
}

/**
 * Verify token expiration.
 */
export function isTokenExpired(payload: FusionAuthJwtPayload): boolean {
  if (!payload.exp) return false;
  return Date.now() >= payload.exp * 1000;
}

/**
 * Check if user can access an app based on their roles and tenant roles.
 *
 * @param userRoles - Roles the user has
 * @param appType - App to check access for
 * @param tenantRoles - Tenant role configurations (REQUIRED - loaded from MongoDB)
 * @returns true if user can access the app
 */
export function canAccessApp(
  userRoles: string[],
  appType: AppType,
  tenantRoles: TenantRole[]
): boolean {
  // No roles = no access
  if (!userRoles || userRoles.length === 0) {
    return false;
  }

  // No tenant roles configured = no access (must be loaded from DB)
  if (!tenantRoles || tenantRoles.length === 0) {
    console.error('[canAccessApp] No tenant roles provided - authorization denied');
    return false;
  }

  // Check each user role against tenant roles configuration
  for (const userRole of userRoles) {
    const tenantRole = tenantRoles.find((r) => r.slug === userRole);
    if (tenantRole?.allowedApps.includes(appType) && tenantRole.isActive) {
      return true;
    }
  }

  return false;
}

/**
 * Check if user can access a specific route.
 *
 * @param pathname - Route pathname
 * @param userRoles - User's roles
 * @param routes - Routes configuration
 * @returns true if user can access the route
 */
export function canAccessRoute(
  pathname: string,
  userRoles: string[],
  routes: DashboardRoute[]
): boolean {
  const matchedRoute = routes.find(
    (r) => pathname === r.path || pathname.startsWith(r.path + '/')
  );

  // No matching route = allow (undefined routes are accessible)
  if (!matchedRoute) {
    return true;
  }

  // Route disabled
  if (!matchedRoute.isEnabled) {
    return false;
  }

  // Empty allowedRoles = public route
  if (matchedRoute.allowedRoles.length === 0) {
    return true;
  }

  // Check if user has any required role
  return matchedRoute.allowedRoles.some((role) => userRoles.includes(role));
}

/**
 * Public routes that never require authentication.
 */
export const PUBLIC_AUTH_ROUTES = [
  '/sign-in',
  '/sign-up',
  '/sso-callback',
  '/verify',
  '/api/webhooks',
  '/account/login',
  '/account/logout',
  '/account/callback',
  '/unauthorized',
];

/**
 * Check if a path is a public auth route.
 */
export function isPublicAuthRoute(pathname: string): boolean {
  return PUBLIC_AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}
