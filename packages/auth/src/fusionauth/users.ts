import type { User } from '@fusionauth/typescript-client';
import { getFusionAuthClient, getFusionAuthClientForTenant } from './client';
import type {
  FusionAuthUser,
  CreateFusionAuthUserInput,
  UpdateFusionAuthUserInput,
  ListFusionAuthUsersParams,
} from '../types';

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
 *   roles: ['member'],
 *   sendSetPasswordEmail: true,
 * });
 * ```
 */
export async function createFusionAuthUser(
  input: CreateFusionAuthUserInput
): Promise<FusionAuthUser> {
  const client = getFusionAuthClientForTenant(input.tenantId);

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
      roles: input.roles || ['member'],
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
