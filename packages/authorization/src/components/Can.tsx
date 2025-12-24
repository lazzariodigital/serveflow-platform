'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useAuthorization } from '../hooks/use-authorization';

// ════════════════════════════════════════════════════════════════
// Can Component
// ════════════════════════════════════════════════════════════════
// Conditionally renders children based on user roles or permissions.
// Phase 1: Role-based (synchronous)
// Phase 2: Permission-based with Cerbos (async)
// ════════════════════════════════════════════════════════════════

interface CanProps {
  /** Roles required to render children (Phase 1 - current) */
  roles?: string[];

  /** Permission to check (Phase 2 - future with Cerbos) */
  permission?: {
    resource: string;
    action: string;
    resourceId?: string;
  };

  /** Content to render if authorized */
  children: ReactNode;

  /** Content to render if NOT authorized */
  fallback?: ReactNode;
}

/**
 * Component that conditionally renders based on authorization.
 *
 * @example
 * ```tsx
 * // Role-based (Phase 1)
 * <Can roles={['admin', 'employee']}>
 *   <Button onClick={handleCreateEvent}>Create Event</Button>
 * </Can>
 *
 * // With fallback
 * <Can roles={['admin']} fallback={<Badge>Read Only</Badge>}>
 *   <Button onClick={handleEdit}>Edit</Button>
 * </Can>
 *
 * // Permission-based (Phase 2 - future)
 * <Can permission={{ resource: 'event', action: 'create' }}>
 *   <Button onClick={handleCreate}>Create</Button>
 * </Can>
 * ```
 */
export function Can({ roles, permission, children, fallback = null }: CanProps) {
  const { hasAnyRole, userRoles } = useAuthorization();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    // ═══════════════════════════════════════════════════════════════════
    // PHASE 1: Role-based check (synchronous, immediate)
    // ═══════════════════════════════════════════════════════════════════
    if (roles && roles.length > 0) {
      setAllowed(hasAnyRole(roles));
      return;
    }

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 2: Permission-based check (async, Cerbos via API)
    // ═══════════════════════════════════════════════════════════════════
    if (permission) {
      const checkCerbosPermission = async () => {
        try {
          // Build API URL with correct port for development
          const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
          const apiUrl = process.env.NODE_ENV !== 'production'
            ? `http://${hostname}:3100/api/auth/check`
            : '/api/auth/check';

          // Get auth token from cookie
          const getAuthToken = (): string | null => {
            if (typeof document === 'undefined') return null;
            const match = document.cookie.match(/(^| )fa_access_token=([^;]+)/);
            return match ? match[2] : null;
          };

          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          const token = getAuthToken();
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const response = await fetch(apiUrl, {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify({
              resource: permission.resource,
              action: permission.action,
              resourceId: permission.resourceId,
            }),
          });

          if (!response.ok) {
            // Fallback a derivación por roles
            const derivedAllowed = derivePermissionFromRoles(
              userRoles,
              permission.resource,
              permission.action
            );
            setAllowed(derivedAllowed);
            return;
          }

          const { allowed: cerbosAllowed } = await response.json();
          setAllowed(cerbosAllowed);
        } catch {
          // Fallback a derivación por roles
          const derivedAllowed = derivePermissionFromRoles(
            userRoles,
            permission.resource,
            permission.action
          );
          setAllowed(derivedAllowed);
        }
      };

      checkCerbosPermission();
      return;
    }

    // No restriction
    setAllowed(true);
  }, [roles, permission, hasAnyRole, userRoles]);

  // Loading state
  if (allowed === null) return null;

  // Not allowed
  if (!allowed) return <>{fallback}</>;

  // Allowed
  return <>{children}</>;
}

// ═══════════════════════════════════════════════════════════════════════
// HELPER: Derive permissions from roles (Phase 1, before Cerbos)
// ═══════════════════════════════════════════════════════════════════════

function derivePermissionFromRoles(
  roles: string[],
  resource: string,
  action: string
): boolean {
  // Admin can do everything
  if (roles.includes('admin')) return true;

  // Basic rules by role
  const ROLE_PERMISSIONS: Record<string, Record<string, string[]>> = {
    employee: {
      booking: ['create', 'read', 'update', 'cancel', 'list'],
      event: ['read', 'list', 'create', 'update'],
      service: ['read', 'list'],
      user: ['read', 'list'],
    },
    provider: {
      booking: ['read', 'list'],
      event: ['read', 'update', 'list'],
    },
    client: {
      booking: ['create', 'read', 'cancel'],
      event: ['read', 'list'],
      service: ['read', 'list'],
    },
  };

  for (const role of roles) {
    const permissions = ROLE_PERMISSIONS[role];
    if (permissions?.[resource]?.includes(action)) {
      return true;
    }
  }

  return false;
}
