import { ForbiddenException } from '@nestjs/common';

// ════════════════════════════════════════════════════════════════
// Organization Filter Utilities
// ════════════════════════════════════════════════════════════════
// Backend utilities for filtering data by organization access.
//
// Key principle: organizationIds: [] means access to ALL organizations.
// ════════════════════════════════════════════════════════════════

/**
 * Organization filter for MongoDB queries.
 */
export interface OrganizationFilter {
  organizationId?: string | { $in: string[] };
}

/**
 * User's organization context from JWT.
 */
export interface UserOrganizationContext {
  /** Organization IDs the user can access (empty = all) */
  organizationIds: string[];
  /** Primary organization ID */
  primaryOrganizationId?: string;
}

/**
 * Get MongoDB filter based on user's organization access.
 *
 * @param userOrgIds - User's organization IDs (empty array = access to all)
 * @param requestedOrgId - Optional: specific organization requested by the user
 * @returns MongoDB filter object
 * @throws ForbiddenException if user requests an org they don't have access to
 *
 * @example
 * ```typescript
 * // User with limited access
 * const filter = getOrganizationFilter(['org-1', 'org-2']);
 * // Returns: { organizationId: { $in: ['org-1', 'org-2'] } }
 *
 * // User with full access (admin, premium client)
 * const filter = getOrganizationFilter([]);
 * // Returns: {} (no filter)
 *
 * // User requesting specific org they have access to
 * const filter = getOrganizationFilter(['org-1', 'org-2'], 'org-1');
 * // Returns: { organizationId: 'org-1' }
 *
 * // User requesting specific org they DON'T have access to
 * const filter = getOrganizationFilter(['org-1', 'org-2'], 'org-3');
 * // Throws ForbiddenException
 * ```
 */
export function getOrganizationFilter(
  userOrgIds: string[],
  requestedOrgId?: string
): OrganizationFilter {
  // User has access to ALL organizations
  if (userOrgIds.length === 0) {
    // If requesting a specific org, filter by it
    if (requestedOrgId) {
      return { organizationId: requestedOrgId };
    }
    // Otherwise, no filter (return all)
    return {};
  }

  // User has limited access
  if (requestedOrgId) {
    // Validate user has access to requested org
    if (!userOrgIds.includes(requestedOrgId)) {
      throw new ForbiddenException(
        `No access to organization "${requestedOrgId}"`
      );
    }
    // Filter by requested org
    return { organizationId: requestedOrgId };
  }

  // No specific org requested: filter by user's accessible orgs
  return { organizationId: { $in: userOrgIds } };
}

/**
 * Check if user has access to a specific organization.
 *
 * @param userOrgIds - User's organization IDs (empty array = access to all)
 * @param organizationId - Organization to check access for
 * @returns true if user has access
 */
export function hasOrganizationAccess(
  userOrgIds: string[],
  organizationId: string
): boolean {
  // Empty array = access to all
  if (userOrgIds.length === 0) {
    return true;
  }
  return userOrgIds.includes(organizationId);
}

/**
 * Validate user has access to an organization.
 * Throws ForbiddenException if not.
 *
 * @param userOrgIds - User's organization IDs (empty array = access to all)
 * @param organizationId - Organization to validate access for
 * @throws ForbiddenException if user doesn't have access
 */
export function validateOrganizationAccess(
  userOrgIds: string[],
  organizationId: string
): void {
  if (!hasOrganizationAccess(userOrgIds, organizationId)) {
    throw new ForbiddenException(
      `No access to organization "${organizationId}"`
    );
  }
}

/**
 * Get the effective organization ID for a query.
 * Returns the requested org if provided and valid, otherwise null (= all accessible).
 *
 * @param userOrgIds - User's organization IDs (empty array = access to all)
 * @param requestedOrgId - Optional: specific organization requested
 * @returns Organization ID to use for filtering, or null for "all"
 * @throws ForbiddenException if user requests an org they don't have access to
 */
export function getEffectiveOrganizationId(
  userOrgIds: string[],
  requestedOrgId?: string
): string | null {
  if (!requestedOrgId) {
    return null;
  }

  // Validate access
  if (userOrgIds.length > 0 && !userOrgIds.includes(requestedOrgId)) {
    throw new ForbiddenException(
      `No access to organization "${requestedOrgId}"`
    );
  }

  return requestedOrgId;
}

/**
 * Merge organization filter with other filters.
 *
 * @param orgFilter - Organization filter from getOrganizationFilter
 * @param otherFilters - Other filters to merge
 * @returns Combined filter object
 *
 * @example
 * ```typescript
 * const orgFilter = getOrganizationFilter(userOrgIds, requestedOrgId);
 * const filter = mergeFilters(orgFilter, {
 *   status: 'active',
 *   createdAt: { $gte: startDate }
 * });
 * ```
 */
export function mergeFilters<T extends Record<string, unknown>>(
  orgFilter: OrganizationFilter,
  otherFilters: T
): OrganizationFilter & T {
  return { ...orgFilter, ...otherFilters };
}
