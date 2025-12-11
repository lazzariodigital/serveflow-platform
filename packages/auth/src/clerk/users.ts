import { getClerkClient } from './client';
import type { User, EmailAddress } from '@clerk/backend';

// ════════════════════════════════════════════════════════════════
// User CRUD Operations with Clerk
// ════════════════════════════════════════════════════════════════

export interface CreateClerkUserInput {
  email: string;
  firstName?: string;
  lastName?: string;
  password?: string; // Si se omite, se enviará invitación
  imageUrl?: string;
}

export interface UpdateClerkUserInput {
  firstName?: string;
  lastName?: string;
  password?: string;
  imageUrl?: string;
}

// ════════════════════════════════════════════════════════════════
// Create User
// ════════════════════════════════════════════════════════════════

/**
 * Creates a new user in Clerk.
 *
 * @param input - User data
 * @returns Created Clerk user
 *
 * Usage:
 * ```typescript
 * const clerkUser = await createClerkUser({
 *   email: 'user@example.com',
 *   firstName: 'John',
 *   lastName: 'Doe',
 * });
 * ```
 */
export async function createClerkUser(
  input: CreateClerkUserInput
): Promise<User> {
  const clerk = getClerkClient();

  const createParams: Parameters<typeof clerk.users.createUser>[0] = {
    emailAddress: [input.email],
    firstName: input.firstName,
    lastName: input.lastName,
  };

  // Solo establecer password si se proporciona
  if (input.password) {
    createParams.password = input.password;
  }

  const user = await clerk.users.createUser(createParams);

  return user;
}

// ════════════════════════════════════════════════════════════════
// Get User
// ════════════════════════════════════════════════════════════════

/**
 * Gets a user from Clerk by their ID.
 *
 * @param clerkId - Clerk user ID (e.g., "user_xxx")
 * @returns Clerk user
 */
export async function getClerkUser(clerkId: string): Promise<User> {
  const clerk = getClerkClient();
  return clerk.users.getUser(clerkId);
}

/**
 * Gets a user from Clerk by their email.
 *
 * @param email - User email
 * @returns Clerk user or null if not found
 */
export async function getClerkUserByEmail(
  email: string
): Promise<User | null> {
  const clerk = getClerkClient();

  const users = await clerk.users.getUserList({
    emailAddress: [email],
  });

  return users.data[0] || null;
}

// ════════════════════════════════════════════════════════════════
// Update User
// ════════════════════════════════════════════════════════════════

/**
 * Updates a user in Clerk.
 *
 * @param clerkId - Clerk user ID
 * @param input - Fields to update
 * @returns Updated Clerk user
 */
export async function updateClerkUser(
  clerkId: string,
  input: UpdateClerkUserInput
): Promise<User> {
  const clerk = getClerkClient();

  return clerk.users.updateUser(clerkId, {
    firstName: input.firstName,
    lastName: input.lastName,
    password: input.password,
  });
}

// ════════════════════════════════════════════════════════════════
// Delete User
// ════════════════════════════════════════════════════════════════

/**
 * Deletes a user from Clerk.
 *
 * @param clerkId - Clerk user ID
 * @returns Deleted user
 */
export async function deleteClerkUser(clerkId: string): Promise<User> {
  const clerk = getClerkClient();
  return clerk.users.deleteUser(clerkId);
}

// ════════════════════════════════════════════════════════════════
// List Users
// ════════════════════════════════════════════════════════════════

export interface ListClerkUsersParams {
  limit?: number;
  offset?: number;
  emailAddress?: string[];
  organizationId?: string[];
}

/**
 * Lists users from Clerk with optional filters.
 *
 * @param params - List parameters
 * @returns List of Clerk users
 */
export async function listClerkUsers(params?: ListClerkUsersParams) {
  const clerk = getClerkClient();

  return clerk.users.getUserList({
    limit: params?.limit,
    offset: params?.offset,
    emailAddress: params?.emailAddress,
    organizationId: params?.organizationId,
  });
}

// ════════════════════════════════════════════════════════════════
// Send Invitation
// ════════════════════════════════════════════════════════════════

/**
 * Sends a verification email to a user.
 *
 * @param clerkId - Clerk user ID
 * @returns Email address object
 */
export async function sendUserVerification(clerkId: string): Promise<EmailAddress> {
  const clerk = getClerkClient();
  const user = await clerk.users.getUser(clerkId);

  if (!user.emailAddresses || user.emailAddresses.length === 0) {
    throw new Error('User has no email addresses');
  }

  const primaryEmail = user.emailAddresses[0];

  // Create a new email verification
  return clerk.emailAddresses.createEmailAddress({
    userId: clerkId,
    emailAddress: primaryEmail.emailAddress,
  });
}
