'use client';

import { useCallback, useMemo } from 'react';
import type { DashboardRoute, AppType, AuthorizationContext } from '../types';
import { useCurrentUser } from './use-current-user';

// ════════════════════════════════════════════════════════════════
// useAuthorization Hook
// ════════════════════════════════════════════════════════════════
// Main hook for authorization in frontend components.
// Provides role checks, route access, and accessible routes.
// Routes must be loaded from API and passed via options or context.
// ════════════════════════════════════════════════════════════════

interface UseAuthorizationOptions {
  /** App type for context */
  appType?: AppType;
  /** Routes configuration (REQUIRED - loaded from tenant config API) */
  routes?: DashboardRoute[];
}

/**
 * Hook for authorization in frontend components.
 *
 * @example
 * ```tsx
 * const {
 *   hasRole,
 *   hasAnyRole,
 *   canAccessRoute,
 *   getAccessibleRoutes,
 * } = useAuthorization({ appType: 'dashboard' });
 *
 * // Check single role
 * if (hasRole('admin')) {
 *   // Show admin content
 * }
 *
 * // Check multiple roles
 * if (hasAnyRole(['admin', 'employee'])) {
 *   // Show content for admin or employee
 * }
 *
 * // Check route access
 * if (canAccessRoute('/users')) {
 *   // Show users link
 * }
 *
 * // Get all accessible routes for navigation
 * const navItems = getAccessibleRoutes();
 * ```
 */
export function useAuthorization(
  options: UseAuthorizationOptions = {}
): AuthorizationContext {
  const { appType = 'dashboard', routes: customRoutes } = options;
  const { user, roles: userRoles } = useCurrentUser();

  // Get organization IDs from user
  const organizationIds = useMemo(
    () => user?.organizationIds || [],
    [user]
  );

  // ═══════════════════════════════════════════════════════════════════════
  // ROUTES: Must be loaded from tenant config API and passed via options
  // ═══════════════════════════════════════════════════════════════════════
  const routes = useMemo(() => {
    // Routes must be provided via options (loaded from tenant config)
    if (customRoutes && customRoutes.length > 0) {
      return customRoutes;
    }

    // No routes = empty array (no access to any specific routes)
    // Components should load routes from API before using this hook
    return [];
  }, [customRoutes]);

  // ═══════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Check if user has a specific role.
   */
  const hasRole = useCallback(
    (role: string) => userRoles.includes(role),
    [userRoles]
  );

  /**
   * Check if user has any of the specified roles.
   */
  const hasAnyRole = useCallback(
    (roles: string[]) => roles.some((r) => userRoles.includes(r)),
    [userRoles]
  );

  /**
   * Check if user can access a specific route.
   */
  const canAccessRoute = useCallback(
    (path: string) => {
      const route = routes.find(
        (r) => path === r.path || path.startsWith(r.path + '/')
      );

      // Route not defined = free access for authenticated users
      if (!route) return true;

      // Route disabled
      if (!route.isEnabled) return false;

      // Empty allowedRoles = public route (no auth required)
      if (route.allowedRoles.length === 0) return true;

      // Check if user has any of the required roles
      return hasAnyRole(route.allowedRoles);
    },
    [routes, hasAnyRole]
  );

  /**
   * Get all routes accessible to the current user.
   */
  const getAccessibleRoutes = useCallback(
    () =>
      routes
        .filter((r) => {
          // Route must be enabled
          if (!r.isEnabled) return false;

          // Empty allowedRoles = public route, always accessible
          if (r.allowedRoles.length === 0) return true;

          // Check if user has any required role
          return hasAnyRole(r.allowedRoles);
        })
        .sort((a, b) => a.order - b.order),
    [routes, hasAnyRole]
  );

  return {
    userRoles,
    organizationIds,
    appType,
    routes,
    hasRole,
    hasAnyRole,
    canAccessRoute,
    getAccessibleRoutes,
  };
}
