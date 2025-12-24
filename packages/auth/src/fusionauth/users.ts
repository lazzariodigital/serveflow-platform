import type {
  CreateFusionAuthUserInput,
  CreateFusionAuthUserWithAppsInput,
  FusionAuthUser,
  ListFusionAuthUsersParams,
  UpdateFusionAuthUserInput,
} from '../types';
import { getFusionAuthClient, getFusionAuthClientForTenant } from './client';

import type { User } from '@fusionauth/typescript-client';

// ════════════════════════════════════════════════════════════════
// FusionAuth User Operations
// ════════════════════════════════════════════════════════════════

/**
 * Creates a new user in FusionAuth with a registration to an application.
 * This creates both the User and the Registration in a single API call.
 *
 * @param input - User creation data
 * @returns Created FusionAuth user
 *
 * @example
 * ```typescript
 * const user = await createFusionAuthUser({
 *   email: 'user@example.com',
 *   firstName: 'John',
 *   lastName: 'Doe',
 *   tenantId: 'tenant-uuid',
 *   applicationId: 'app-uuid',
 *   roles: ['client'], // Must be a role that exists in the Application (admin, user, viewer)
 *   sendSetPasswordEmail: true,
 * });
 * ```
 */
export async function createFusionAuthUser(
  input: CreateFusionAuthUserInput
): Promise<FusionAuthUser> {
  const client = getFusionAuthClientForTenant(input.tenantId);

  console.log('[FusionAuth] Creating user with input:', input);

  const response = await client.register(null as unknown as string, {
    user: {
      email: input.email,
      password: input.password,
      firstName: input.firstName,
      lastName: input.lastName,
      fullName: input.firstName && input.lastName
        ? `${input.firstName} ${input.lastName}`
        : undefined,
      tenantId: input.tenantId,
      data: input.data,
    },
    registration: {
      applicationId: input.applicationId,
      roles: input.roles || ['client'], // Default role - must exist in the Application
      data: input.data,
    },
    sendSetPasswordEmail: input.sendSetPasswordEmail ?? false,
    skipVerification: false,
  });

  if (!response.wasSuccessful()) {
    const errorMessage = response.exception?.message ||
      JSON.stringify(response.exception) ||
      'Failed to create user in FusionAuth';
    throw new Error(errorMessage);
  }

  if (!response.response.user) {
    throw new Error('User was not returned from FusionAuth');
  }

  return mapFusionAuthUser(response.response.user);
}

/**
 * Creates a user in FusionAuth with multiple application registrations.
 *
 * According to 03-PERMISOS.md section 5.1:
 * 1. Create user with user.data containing all roles and organizationIds
 * 2. Create registrations for each app with subset of roles allowed in that app
 *
 * @param input - User creation data with multiple registrations
 * @returns Created FusionAuth user with all registrations
 */
export async function createFusionAuthUserWithApps(
  input: CreateFusionAuthUserWithAppsInput
): Promise<FusionAuthUser> {
  const client = getFusionAuthClientForTenant(input.tenantId);

  if (input.registrations.length === 0) {
    throw new Error('At least one registration is required');
  }

  // First registration is created with the user
  const firstReg = input.registrations[0];

  console.log('[FusionAuth] Creating user with multiple apps:', {
    email: input.email,
    roles: input.roles,
    registrations: input.registrations.map((r) => ({
      appId: r.applicationId,
      roles: r.roles,
    })),
  });

  // Create user with first registration
  const response = await client.register(null as unknown as string, {
    user: {
      email: input.email,
      password: input.password,
      firstName: input.firstName,
      lastName: input.lastName,
      fullName:
        input.firstName && input.lastName
          ? `${input.firstName} ${input.lastName}`
          : undefined,
      tenantId: input.tenantId,
      // Store all roles and org info in user.data
      data: {
        serveflowTenantSlug: input.tenantSlug,
        roles: input.roles,
        organizationIds: input.organizationIds || [],
        primaryOrganizationId: input.primaryOrganizationId,
      },
    },
    registration: {
      applicationId: firstReg.applicationId,
      roles: firstReg.roles,
    },
    sendSetPasswordEmail: input.sendSetPasswordEmail ?? false,
    skipVerification: false,
  });

  if (!response.wasSuccessful()) {
    const errorMessage =
      response.exception?.message ||
      JSON.stringify(response.exception) ||
      'Failed to create user in FusionAuth';
    throw new Error(errorMessage);
  }

  if (!response.response.user?.id) {
    throw new Error('User was not returned from FusionAuth');
  }

  const userId = response.response.user.id;

  // Add additional registrations
  for (let i = 1; i < input.registrations.length; i++) {
    const reg = input.registrations[i];
    console.log(`[FusionAuth] Adding registration for app ${reg.applicationId}`);

    const regResponse = await client.register(userId, {
      registration: {
        applicationId: reg.applicationId,
        roles: reg.roles,
      },
    });

    if (!regResponse.wasSuccessful()) {
      console.error(
        `[FusionAuth] Failed to add registration for app ${reg.applicationId}:`,
        regResponse.exception
      );
      // Continue with other registrations, don't fail completely
    }
  }

  // Fetch the updated user with all registrations
  const updatedUser = await getFusionAuthUser(userId);
  if (!updatedUser) {
    throw new Error('Failed to retrieve user after creating registrations');
  }

  return updatedUser;
}

/**
 * Retrieves a user from FusionAuth by their ID.
 *
 * @param userId - FusionAuth user ID (UUID)
 * @returns FusionAuth user or null if not found
 */
export async function getFusionAuthUser(
  userId: string
): Promise<FusionAuthUser | null> {
  const client = getFusionAuthClient();

  const response = await client.retrieveUser(userId);

  if (response.statusCode === 404) {
    return null;
  }

  if (!response.wasSuccessful()) {
    throw new Error(
      response.exception?.message || 'Failed to retrieve user from FusionAuth'
    );
  }

  if (!response.response.user) {
    return null;
  }

  return mapFusionAuthUser(response.response.user);
}

/**
 * Retrieves a user from FusionAuth by their email.
 *
 * @param email - User email address
 * @returns FusionAuth user or null if not found
 */
export async function getFusionAuthUserByEmail(
  email: string
): Promise<FusionAuthUser | null> {
  const client = getFusionAuthClient();

  const response = await client.retrieveUserByEmail(email);

  if (response.statusCode === 404) {
    return null;
  }

  if (!response.wasSuccessful()) {
    throw new Error(
      response.exception?.message || 'Failed to retrieve user from FusionAuth'
    );
  }

  if (!response.response.user) {
    return null;
  }

  return mapFusionAuthUser(response.response.user);
}

/**
 * Updates a user in FusionAuth.
 *
 * @param userId - FusionAuth user ID
 * @param input - Fields to update
 * @returns Updated FusionAuth user
 */
export async function updateFusionAuthUser(
  userId: string,
  input: UpdateFusionAuthUserInput
): Promise<FusionAuthUser> {
  const client = getFusionAuthClient();

  const response = await client.patchUser(userId, {
    user: {
      firstName: input.firstName,
      lastName: input.lastName,
      fullName: input.fullName,
      imageUrl: input.imageUrl,
      mobilePhone: input.mobilePhone,
      data: input.data,
    },
  });

  if (!response.wasSuccessful()) {
    throw new Error(
      response.exception?.message || 'Failed to update user in FusionAuth'
    );
  }

  if (!response.response.user) {
    throw new Error('User was not returned from FusionAuth after update');
  }

  return mapFusionAuthUser(response.response.user);
}

/**
 * Deletes a user from FusionAuth.
 * WARNING: This permanently deletes the user and all their registrations.
 *
 * @param userId - FusionAuth user ID
 */
export async function deleteFusionAuthUser(userId: string): Promise<void> {
  const client = getFusionAuthClient();

  const response = await client.deleteUser(userId);

  if (!response.wasSuccessful() && response.statusCode !== 404) {
    throw new Error(
      response.exception?.message || 'Failed to delete user from FusionAuth'
    );
  }
}

/**
 * Deactivates a user in FusionAuth (soft delete).
 * The user still exists but cannot log in.
 *
 * @param userId - FusionAuth user ID
 */
export async function deactivateFusionAuthUser(userId: string): Promise<void> {
  const client = getFusionAuthClient();

  const response = await client.deactivateUser(userId);

  if (!response.wasSuccessful()) {
    throw new Error(
      response.exception?.message || 'Failed to deactivate user in FusionAuth'
    );
  }
}

/**
 * Reactivates a previously deactivated user.
 *
 * @param userId - FusionAuth user ID
 */
export async function reactivateFusionAuthUser(userId: string): Promise<void> {
  const client = getFusionAuthClient();

  const response = await client.reactivateUser(userId);

  if (!response.wasSuccessful()) {
    throw new Error(
      response.exception?.message || 'Failed to reactivate user in FusionAuth'
    );
  }
}

/**
 * Searches for users in FusionAuth.
 *
 * @param params - Search parameters
 * @returns Array of FusionAuth users
 */
export async function searchFusionAuthUsers(
  params: ListFusionAuthUsersParams
): Promise<FusionAuthUser[]> {
  const client = params.tenantId
    ? getFusionAuthClientForTenant(params.tenantId)
    : getFusionAuthClient();

  const response = await client.searchUsersByQuery({
    search: {
      queryString: params.queryString || '*',
      numberOfResults: params.numberOfResults || 25,
      startRow: params.startRow || 0,
    },
  });

  if (!response.wasSuccessful()) {
    throw new Error(
      response.exception?.message || 'Failed to search users in FusionAuth'
    );
  }

  const users = response.response.users || [];
  return users.map(mapFusionAuthUser);
}

// ════════════════════════════════════════════════════════════════
// User Roles
// ════════════════════════════════════════════════════════════════

/**
 * Assigns roles to a user's registration for an application.
 *
 * @param userId - FusionAuth user ID
 * @param applicationId - Application ID
 * @param roles - Roles to assign
 */
export async function assignUserRoles(
  userId: string,
  applicationId: string,
  roles: string[]
): Promise<void> {
  const client = getFusionAuthClient();

  // First get the current registration
  const regResponse = await client.retrieveRegistration(userId, applicationId);

  if (!regResponse.wasSuccessful()) {
    throw new Error('User registration not found');
  }

  const currentRoles = regResponse.response.registration?.roles || [];
  const newRoles = [...new Set([...currentRoles, ...roles])];

  // Update the registration with new roles
  const response = await client.patchRegistration(userId, {
    registration: {
      applicationId,
      roles: newRoles,
    },
  });

  if (!response.wasSuccessful()) {
    throw new Error(
      response.exception?.message || 'Failed to assign roles in FusionAuth'
    );
  }
}

/**
 * Removes roles from a user's registration for an application.
 *
 * @param userId - FusionAuth user ID
 * @param applicationId - Application ID
 * @param roles - Roles to remove
 */
export async function removeUserRoles(
  userId: string,
  applicationId: string,
  roles: string[]
): Promise<void> {
  const client = getFusionAuthClient();

  // First get the current registration
  const regResponse = await client.retrieveRegistration(userId, applicationId);

  if (!regResponse.wasSuccessful()) {
    throw new Error('User registration not found');
  }

  const currentRoles = regResponse.response.registration?.roles || [];
  const newRoles = currentRoles.filter(role => !roles.includes(role));

  // Update the registration with remaining roles
  const response = await client.patchRegistration(userId, {
    registration: {
      applicationId,
      roles: newRoles,
    },
  });

  if (!response.wasSuccessful()) {
    throw new Error(
      response.exception?.message || 'Failed to remove roles in FusionAuth'
    );
  }
}

// ════════════════════════════════════════════════════════════════
// Organization Management
// ════════════════════════════════════════════════════════════════

/**
 * Gets the organization IDs for a user.
 *
 * @param userId - FusionAuth user ID
 * @returns Array of organization IDs (empty array means access to all)
 */
export async function getUserOrganizationIds(
  userId: string
): Promise<string[]> {
  const user = await getFusionAuthUser(userId);
  if (!user) {
    throw new Error('User not found');
  }

  return (user.data?.['organizationIds'] as string[]) || [];
}

/**
 * Sets the organization IDs for a user.
 * This replaces all existing organization IDs.
 *
 * @param userId - FusionAuth user ID
 * @param organizationIds - Array of organization IDs (empty = access to all)
 * @returns Updated FusionAuth user
 *
 * @example
 * ```typescript
 * // Grant access to specific organizations
 * await setUserOrganizations(userId, ['org-1', 'org-2']);
 *
 * // Grant access to ALL organizations
 * await setUserOrganizations(userId, []);
 * ```
 */
export async function setUserOrganizations(
  userId: string,
  organizationIds: string[]
): Promise<FusionAuthUser> {
  const user = await getFusionAuthUser(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const currentData = (user.data || {}) as Record<string, unknown>;

  return updateFusionAuthUser(userId, {
    data: {
      ...currentData,
      organizationIds,
    },
  });
}

/**
 * Assigns a user to an organization.
 * Adds the organization ID to the user's organizationIds array.
 *
 * @param userId - FusionAuth user ID
 * @param organizationId - Organization ID to add
 * @returns Updated FusionAuth user
 */
export async function assignUserToOrganization(
  userId: string,
  organizationId: string
): Promise<FusionAuthUser> {
  const user = await getFusionAuthUser(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const currentOrgIds = (user.data?.['organizationIds'] as string[]) || [];

  // If already assigned, return early
  if (currentOrgIds.includes(organizationId)) {
    return user;
  }

  const newOrgIds = [...currentOrgIds, organizationId];
  const currentData = (user.data || {}) as Record<string, unknown>;

  return updateFusionAuthUser(userId, {
    data: {
      ...currentData,
      organizationIds: newOrgIds,
    },
  });
}

/**
 * Removes a user from an organization.
 * Removes the organization ID from the user's organizationIds array.
 *
 * @param userId - FusionAuth user ID
 * @param organizationId - Organization ID to remove
 * @returns Updated FusionAuth user
 */
export async function removeUserFromOrganization(
  userId: string,
  organizationId: string
): Promise<FusionAuthUser> {
  const user = await getFusionAuthUser(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const currentOrgIds = (user.data?.['organizationIds'] as string[]) || [];
  const newOrgIds = currentOrgIds.filter((id) => id !== organizationId);

  const currentData = (user.data || {}) as Record<string, unknown>;

  return updateFusionAuthUser(userId, {
    data: {
      ...currentData,
      organizationIds: newOrgIds,
    },
  });
}

/**
 * Sets the primary organization for a user.
 *
 * @param userId - FusionAuth user ID
 * @param primaryOrganizationId - Primary organization ID (or undefined to clear)
 * @returns Updated FusionAuth user
 */
export async function setUserPrimaryOrganization(
  userId: string,
  primaryOrganizationId: string | undefined
): Promise<FusionAuthUser> {
  const user = await getFusionAuthUser(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const currentData = (user.data || {}) as Record<string, unknown>;

  return updateFusionAuthUser(userId, {
    data: {
      ...currentData,
      primaryOrganizationId,
    },
  });
}

/**
 * Checks if a user has access to a specific organization.
 * Empty organizationIds array means access to ALL organizations.
 *
 * @param userId - FusionAuth user ID
 * @param organizationId - Organization ID to check
 * @returns true if user has access
 */
export async function userHasOrganizationAccess(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const orgIds = await getUserOrganizationIds(userId);

  // Empty array = access to all
  if (orgIds.length === 0) {
    return true;
  }

  return orgIds.includes(organizationId);
}

// ════════════════════════════════════════════════════════════════
// Helper Functions
// ════════════════════════════════════════════════════════════════

/**
 * Maps a FusionAuth API user response to our FusionAuthUser type.
 */
function mapFusionAuthUser(user: User): FusionAuthUser {
  return {
    id: user.id || '',
    email: user.email || '',
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    imageUrl: user.imageUrl,
    verified: user.verified ?? false,
    active: user.active ?? true,
    tenantId: user.tenantId || '',
    registrations: user.registrations?.map((r) => ({
      applicationId: r.applicationId || '',
      roles: r.roles || [],
      data: r.data as Record<string, unknown> | undefined,
      insertInstant: r.insertInstant,
      lastLoginInstant: r.lastLoginInstant,
    })),
    mobilePhone: user.mobilePhone,
    birthDate: user.birthDate,
    data: user.data as Record<string, unknown> | undefined,
    insertInstant: user.insertInstant,
    lastLoginInstant: user.lastLoginInstant,
  };
}
