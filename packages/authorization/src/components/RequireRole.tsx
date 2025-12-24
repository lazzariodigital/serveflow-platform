'use client';

import type { ReactNode } from 'react';
import { useAuthorization } from '../hooks/use-authorization';

// ════════════════════════════════════════════════════════════════
// RequireRole Component
// ════════════════════════════════════════════════════════════════
// Renders children only if user has one of the required roles.
// Simpler alternative to Can for role-only checks.
// ════════════════════════════════════════════════════════════════

interface RequireRoleProps {
  /** Required roles (user must have at least one) */
  roles: string[];
  /** Content to render if user has required role */
  children: ReactNode;
  /** Content to render if user does NOT have required role */
  fallback?: ReactNode;
}

/**
 * Component that requires specific roles to render children.
 *
 * @example
 * ```tsx
 * <RequireRole roles={['admin']}>
 *   <DangerZone />
 * </RequireRole>
 *
 * <RequireRole roles={['admin', 'employee']} fallback={<AccessDenied />}>
 *   <ManagementPanel />
 * </RequireRole>
 * ```
 */
export function RequireRole({
  roles,
  children,
  fallback = null,
}: RequireRoleProps) {
  const { hasAnyRole } = useAuthorization();

  if (!hasAnyRole(roles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
