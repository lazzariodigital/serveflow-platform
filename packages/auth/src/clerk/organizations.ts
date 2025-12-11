import { getClerkClient } from './client';
import type { Organization, OrganizationMembership } from '@clerk/backend';

// ════════════════════════════════════════════════════════════════
// Organization Operations with Clerk
// ════════════════════════════════════════════════════════════════

export interface CreateClerkOrganizationInput {
  name: string;
  slug?: string;
  createdBy: string; // Clerk user ID
}

export interface AddUserToOrganizationInput {
  organizationId: string;
  userId: string;
  role?: 'org:admin' | 'org:member'; // Clerk organization roles
}

// ════════════════════════════════════════════════════════════════
// Create Organization
// ════════════════════════════════════════════════════════════════

/**
 * Creates a new organization in Clerk.
 * This represents a Tenant in our system (1 Clerk Org = 1 Tenant).
 *
 * @param input - Organization data
 * @returns Created Clerk organization
 *
 * Usage:
 * ```typescript
 * const org = await createClerkOrganization({
 *   name: 'Gimnasio Demo',
 *   slug: 'gimnasio-demo',
 *   createdBy: 'user_xxx',
 * });
 * ```
 */
export async function createClerkOrganization(
  input: CreateClerkOrganizationInput
): Promise<Organization> {
  const clerk = getClerkClient();

  return clerk.organizations.createOrganization({
    name: input.name,
    slug: input.slug,
    createdBy: input.createdBy,
  });
}

// ════════════════════════════════════════════════════════════════
// Get Organization
// ════════════════════════════════════════════════════════════════

/**
 * Gets an organization from Clerk by its ID.
 *
 * @param organizationId - Clerk organization ID (e.g., "org_xxx")
 * @returns Clerk organization
 */
export async function getClerkOrganization(
  organizationId: string
): Promise<Organization> {
  const clerk = getClerkClient();
  return clerk.organizations.getOrganization({ organizationId });
}

/**
 * Gets an organization from Clerk by its slug.
 *
 * @param slug - Organization slug (e.g., "gimnasio-demo")
 * @returns Clerk organization or null if not found
 */
export async function getClerkOrganizationBySlug(
  slug: string
): Promise<Organization | null> {
  const clerk = getClerkClient();

  try {
    const orgs = await clerk.organizations.getOrganizationList({
      query: slug,
    });

    return orgs.data.find((org) => org.slug === slug) || null;
  } catch {
    return null;
  }
}

// ════════════════════════════════════════════════════════════════
// Update Organization
// ════════════════════════════════════════════════════════════════

/**
 * Updates an organization in Clerk.
 *
 * @param organizationId - Clerk organization ID
 * @param input - Fields to update
 * @returns Updated organization
 */
export async function updateClerkOrganization(
  organizationId: string,
  input: Partial<CreateClerkOrganizationInput>
): Promise<Organization> {
  const clerk = getClerkClient();

  return clerk.organizations.updateOrganization(organizationId, {
    name: input.name,
    slug: input.slug,
  });
}

// ════════════════════════════════════════════════════════════════
// Delete Organization
// ════════════════════════════════════════════════════════════════

/**
 * Deletes an organization from Clerk.
 *
 * @param organizationId - Clerk organization ID
 * @returns Deleted organization
 */
export async function deleteClerkOrganization(
  organizationId: string
): Promise<Organization> {
  const clerk = getClerkClient();
  return clerk.organizations.deleteOrganization(organizationId);
}

// ════════════════════════════════════════════════════════════════
// Organization Memberships
// ════════════════════════════════════════════════════════════════

/**
 * Adds a user to a Clerk organization.
 *
 * @param input - User and organization IDs, plus role
 * @returns Created organization membership
 *
 * Usage:
 * ```typescript
 * await addUserToOrganization({
 *   organizationId: 'org_xxx',
 *   userId: 'user_yyy',
 *   role: 'org:member',
 * });
 * ```
 */
export async function addUserToOrganization(
  input: AddUserToOrganizationInput
): Promise<OrganizationMembership> {
  const clerk = getClerkClient();

  return clerk.organizations.createOrganizationMembership({
    organizationId: input.organizationId,
    userId: input.userId,
    role: input.role || 'org:member',
  });
}

/**
 * Removes a user from a Clerk organization.
 *
 * @param organizationId - Clerk organization ID
 * @param userId - Clerk user ID
 * @returns Deleted membership
 */
export async function removeUserFromOrganization(
  organizationId: string,
  userId: string
): Promise<OrganizationMembership> {
  const clerk = getClerkClient();

  // Get membership first
  const memberships = await clerk.organizations.getOrganizationMembershipList({
    organizationId,
  });

  const membership = memberships.data.find((m) => m.publicUserData?.userId === userId);

  if (!membership) {
    throw new Error('User is not a member of this organization');
  }

  return clerk.organizations.deleteOrganizationMembership({
    organizationId,
    userId,
  });
}

/**
 * Updates a user's role in a Clerk organization.
 *
 * @param organizationId - Clerk organization ID
 * @param userId - Clerk user ID
 * @param role - New role
 * @returns Updated membership
 */
export async function updateOrganizationMemberRole(
  organizationId: string,
  userId: string,
  role: 'org:admin' | 'org:member'
): Promise<OrganizationMembership> {
  const clerk = getClerkClient();

  return clerk.organizations.updateOrganizationMembership({
    organizationId,
    userId,
    role,
  });
}

/**
 * Lists all members of a Clerk organization.
 *
 * @param organizationId - Clerk organization ID
 * @returns List of organization memberships
 */
export async function listOrganizationMembers(organizationId: string) {
  const clerk = getClerkClient();

  return clerk.organizations.getOrganizationMembershipList({
    organizationId,
  });
}

/**
 * Gets a user's organizations.
 *
 * @param userId - Clerk user ID
 * @returns List of organization memberships
 */
export async function getUserOrganizations(userId: string) {
  const clerk = getClerkClient();

  return clerk.users.getOrganizationMembershipList({
    userId,
  });
}
