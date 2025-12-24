'use client';

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import type { AppType, DashboardRoute, TenantRole } from '../types';
import { useCurrentUser } from '../hooks/use-current-user';

// ════════════════════════════════════════════════════════════════
// Authorization Provider
// ════════════════════════════════════════════════════════════════
// Provides authorization context to the component tree.
// Includes user roles, tenant roles, and app access checking.
// ════════════════════════════════════════════════════════════════

interface AuthorizationContextValue {
  /** Current user roles */
  userRoles: string[];
  /** Tenant roles configuration */
  tenantRoles: TenantRole[];
  /** Current app type */
  appType: AppType;
  /** Check if user can access a specific app */
  canAccessApp: (app: AppType) => boolean;
  /** Check if user has a role */
  hasRole: (role: string) => boolean;
  /** Check if user has any of the roles */
  hasAnyRole: (roles: string[]) => boolean;
  /** Is user authenticated */
  isAuthenticated: boolean;
}

const AuthorizationContext = createContext<AuthorizationContextValue | null>(null);

interface AuthorizationProviderProps {
  /** Current app type */
  appType: AppType;
  /** Tenant roles (from API/context) */
  tenantRoles?: TenantRole[];
  /** Children components */
  children: ReactNode;
}

/**
 * Provider for authorization context.
 *
 * @example
 * ```tsx
 * // In layout.tsx
 * <AuthorizationProvider appType="dashboard" tenantRoles={roles}>
 *   {children}
 * </AuthorizationProvider>
 * ```
 */
export function AuthorizationProvider({
  appType,
  tenantRoles = [],
  children,
}: AuthorizationProviderProps) {
  const { user, isAuthenticated, roles: userRoles } = useCurrentUser();

  /**
   * Check if user can access a specific app based on their roles.
   * A user can access an app if any of their roles has that app in allowedApps.
   */
  const canAccessApp = useMemo(() => {
    return (app: AppType): boolean => {
      if (!isAuthenticated || userRoles.length === 0) {
        return false;
      }

      // Check if any user role allows access to this app
      for (const userRole of userRoles) {
        const tenantRole = tenantRoles.find((r) => r.slug === userRole);
        if (tenantRole?.allowedApps.includes(app) && tenantRole.isActive) {
          return true;
        }
      }

      // If no tenant roles configured, fall back to default logic
      if (tenantRoles.length === 0) {
        // Default: admin and employee can access dashboard
        // provider and client can access webapp
        if (app === 'dashboard') {
          return userRoles.some((r) => ['admin', 'employee', 'superadmin'].includes(r));
        }
        if (app === 'webapp') {
          return userRoles.some((r) => ['provider', 'client'].includes(r));
        }
      }

      return false;
    };
  }, [isAuthenticated, userRoles, tenantRoles]);

  const hasRole = useMemo(() => {
    return (role: string): boolean => userRoles.includes(role);
  }, [userRoles]);

  const hasAnyRole = useMemo(() => {
    return (roles: string[]): boolean => roles.some((r) => userRoles.includes(r));
  }, [userRoles]);

  const value = useMemo<AuthorizationContextValue>(
    () => ({
      userRoles,
      tenantRoles,
      appType,
      canAccessApp,
      hasRole,
      hasAnyRole,
      isAuthenticated,
    }),
    [userRoles, tenantRoles, appType, canAccessApp, hasRole, hasAnyRole, isAuthenticated]
  );

  return (
    <AuthorizationContext.Provider value={value}>
      {children}
    </AuthorizationContext.Provider>
  );
}

/**
 * Hook to access authorization context.
 * Must be used within AuthorizationProvider.
 */
export function useAuthorizationContext(): AuthorizationContextValue {
  const context = useContext(AuthorizationContext);

  if (!context) {
    throw new Error(
      'useAuthorizationContext must be used within AuthorizationProvider'
    );
  }

  return context;
}
