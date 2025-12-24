'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type { OrganizationContextValue, OrganizationInfo } from '../types';
import { useCurrentUser } from '../hooks/use-current-user';

// ════════════════════════════════════════════════════════════════
// Organization Provider
// ════════════════════════════════════════════════════════════════
// Manages organization selection and access for multi-location tenants.
// Key principle: organizationIds: [] means access to ALL organizations.
// ════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'serveflow_current_org';

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

interface OrganizationProviderProps {
  /** Children components */
  children: ReactNode;
  /** List of all organizations for this tenant */
  organizations?: OrganizationInfo[];
  /** Optional: Initial organization ID (overrides localStorage) */
  initialOrganizationId?: string;
}

/**
 * Provider for organization context.
 * Manages the currently selected organization and provides access control.
 *
 * @example
 * ```tsx
 * // In layout.tsx
 * const orgs = await fetchOrganizations();
 *
 * <OrganizationProvider organizations={orgs}>
 *   {children}
 * </OrganizationProvider>
 * ```
 */
export function OrganizationProvider({
  children,
  organizations = [],
  initialOrganizationId,
}: OrganizationProviderProps) {
  const { user } = useCurrentUser();
  const [currentOrganization, setCurrentOrganizationState] = useState<OrganizationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // User's organization IDs from JWT
  const userOrganizationIds = user?.organizationIds || [];
  const primaryOrganizationId = user?.primaryOrganizationId;

  // Empty array means access to ALL organizations
  const hasFullAccess = userOrganizationIds.length === 0;

  // Filter organizations based on user access
  const accessibleOrganizations = useMemo(() => {
    if (hasFullAccess) {
      return organizations;
    }
    return organizations.filter((org) => userOrganizationIds.includes(org.id));
  }, [organizations, userOrganizationIds, hasFullAccess]);

  // Load initial organization from localStorage or props
  useEffect(() => {
    setIsLoading(true);

    try {
      let orgId: string | null = null;

      // Priority: prop > localStorage > primary > first accessible
      if (initialOrganizationId) {
        orgId = initialOrganizationId;
      } else if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          orgId = stored;
        }
      }

      // Fallback to primary organization
      if (!orgId && primaryOrganizationId) {
        orgId = primaryOrganizationId;
      }

      // Find the organization
      if (orgId) {
        const org = accessibleOrganizations.find((o) => o.id === orgId);
        if (org) {
          setCurrentOrganizationState(org);
        } else if (!hasFullAccess && accessibleOrganizations.length > 0) {
          // If user doesn't have full access and stored org is not accessible,
          // fall back to first accessible org
          setCurrentOrganizationState(accessibleOrganizations[0]);
        }
      } else if (!hasFullAccess && accessibleOrganizations.length > 0) {
        // No stored preference and limited access: select first
        setCurrentOrganizationState(accessibleOrganizations[0]);
      }
      // If hasFullAccess and no preference, leave as null (= all orgs)
    } finally {
      setIsLoading(false);
    }
  }, [accessibleOrganizations, hasFullAccess, initialOrganizationId, primaryOrganizationId]);

  // Set current organization
  const setCurrentOrganization = useCallback(
    (org: OrganizationInfo | null) => {
      setCurrentOrganizationState(org);

      // Persist to localStorage
      if (typeof window !== 'undefined') {
        if (org) {
          localStorage.setItem(STORAGE_KEY, org.id);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    },
    []
  );

  // Set current organization by ID
  const setCurrentOrganizationById = useCallback(
    (orgId: string | null) => {
      if (!orgId) {
        setCurrentOrganization(null);
        return;
      }

      const org = accessibleOrganizations.find((o) => o.id === orgId);
      if (org) {
        setCurrentOrganization(org);
      }
    },
    [accessibleOrganizations, setCurrentOrganization]
  );

  const value = useMemo<OrganizationContextValue>(
    () => ({
      currentOrganization,
      organizations: accessibleOrganizations,
      hasFullAccess,
      primaryOrganizationId,
      isLoading,
      setCurrentOrganization,
      setCurrentOrganizationById,
    }),
    [
      currentOrganization,
      accessibleOrganizations,
      hasFullAccess,
      primaryOrganizationId,
      isLoading,
      setCurrentOrganization,
      setCurrentOrganizationById,
    ]
  );

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

/**
 * Hook to access organization context.
 * Must be used within OrganizationProvider.
 *
 * @example
 * ```tsx
 * const {
 *   currentOrganization,
 *   organizations,
 *   hasFullAccess,
 *   setCurrentOrganization
 * } = useOrganizationContext();
 *
 * // Filter data by current organization
 * const filter = currentOrganization
 *   ? { organizationId: currentOrganization.id }
 *   : {};
 * ```
 */
export function useOrganizationContext(): OrganizationContextValue {
  const context = useContext(OrganizationContext);

  if (!context) {
    throw new Error(
      'useOrganizationContext must be used within OrganizationProvider'
    );
  }

  return context;
}
