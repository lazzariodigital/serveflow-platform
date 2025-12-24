'use client';

import { useMemo } from 'react';
import { useOrganizationContext } from '../components/OrganizationProvider';
import type { OrganizationInfo } from '../types';

// ════════════════════════════════════════════════════════════════
// useOrganization Hook
// ════════════════════════════════════════════════════════════════
// Convenience hook for organization access control.
// Provides helpers for checking organization access and filtering data.
// ════════════════════════════════════════════════════════════════

export interface UseOrganizationResult {
  /** Currently selected organization (null = all orgs or not selected) */
  currentOrganization: OrganizationInfo | null;
  /** Current organization ID (null = all orgs) */
  currentOrganizationId: string | null;
  /** List of organizations user can access */
  organizations: OrganizationInfo[];
  /** Whether user has access to all organizations */
  hasFullAccess: boolean;
  /** User's primary organization ID */
  primaryOrganizationId: string | undefined;
  /** Loading state */
  isLoading: boolean;
  /** Set current organization */
  setCurrentOrganization: (org: OrganizationInfo | null) => void;
  /** Set current organization by ID */
  setCurrentOrganizationById: (orgId: string | null) => void;
  /** Check if user has access to a specific organization */
  hasAccessTo: (organizationId: string) => boolean;
  /** Get organization by ID */
  getOrganization: (organizationId: string) => OrganizationInfo | undefined;
  /** Get filter for API queries based on current selection */
  getQueryFilter: () => { organizationId?: string };
}

/**
 * Hook for organization access control and selection.
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { currentOrganization, organizations, hasFullAccess } = useOrganization();
 *
 * // Get filter for API queries
 * const { getQueryFilter } = useOrganization();
 * const filter = getQueryFilter();
 * // If user selected "Madrid Centro": { organizationId: "org-123" }
 * // If user selected "All": {}
 *
 * // Check access
 * const { hasAccessTo } = useOrganization();
 * if (!hasAccessTo(booking.organizationId)) {
 *   return <AccessDenied />;
 * }
 * ```
 */
export function useOrganization(): UseOrganizationResult {
  const context = useOrganizationContext();

  const {
    currentOrganization,
    organizations,
    hasFullAccess,
    primaryOrganizationId,
    isLoading,
    setCurrentOrganization,
    setCurrentOrganizationById,
  } = context;

  // Current organization ID (null = all orgs)
  const currentOrganizationId = currentOrganization?.id || null;

  // Check if user has access to a specific organization
  const hasAccessTo = useMemo(() => {
    return (organizationId: string): boolean => {
      if (hasFullAccess) {
        return true;
      }
      return organizations.some((org) => org.id === organizationId);
    };
  }, [hasFullAccess, organizations]);

  // Get organization by ID
  const getOrganization = useMemo(() => {
    return (organizationId: string): OrganizationInfo | undefined => {
      return organizations.find((org) => org.id === organizationId);
    };
  }, [organizations]);

  // Get filter for API queries
  // Returns { organizationId: "xxx" } if an org is selected
  // Returns {} if "All" is selected (backend will use user's organizationIds)
  const getQueryFilter = useMemo(() => {
    return (): { organizationId?: string } => {
      if (currentOrganizationId) {
        return { organizationId: currentOrganizationId };
      }
      return {};
    };
  }, [currentOrganizationId]);

  return {
    currentOrganization,
    currentOrganizationId,
    organizations,
    hasFullAccess,
    primaryOrganizationId,
    isLoading,
    setCurrentOrganization,
    setCurrentOrganizationById,
    hasAccessTo,
    getOrganization,
    getQueryFilter,
  };
}
