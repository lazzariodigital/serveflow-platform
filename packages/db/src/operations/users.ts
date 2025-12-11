import { Model } from 'mongoose';
import type { User } from '../schemas';
import type { CreateUserInput, UpdateUserInput, UserStatus } from '@serveflow/core';

// ════════════════════════════════════════════════════════════════
// User CRUD Operations (Mongoose)
// ════════════════════════════════════════════════════════════════

/**
 * Creates a new user in MongoDB.
 *
 * @param userModel - Mongoose User Model
 * @param userInput - User data to create
 * @returns Created user
 *
 * Usage:
 * ```typescript
 * const userModel = await mongooseConnection.getUserModel(dbName);
 * const user = await createUser(userModel, {
 *   fronteggUserId: 'uuid-xxx',
 *   email: 'john@example.com',
 *   firstName: 'John',
 *   lastName: 'Doe',
 *   status: 'active',
 *   isVerified: true,
 *   organizationIds: [],
 * });
 * ```
 */
export async function createUser(
  userModel: Model<User>,
  userInput: CreateUserInput
): Promise<User> {
  const user = await userModel.create(userInput);
  return user.toObject();
}

/**
 * Gets a user by their Frontegg User ID.
 *
 * @param userModel - Mongoose User Model
 * @param fronteggUserId - Frontegg user ID (UUID)
 * @returns User or null if not found
 *
 * Usage:
 * ```typescript
 * const user = await getUserByFronteggId(userModel, 'uuid-xxx');
 * ```
 */
export async function getUserByFronteggId(
  userModel: Model<User>,
  fronteggUserId: string
): Promise<User | null> {
  const user = await userModel.findOne({ fronteggUserId }).lean();
  return user;
}

/**
 * Gets a user by their MongoDB _id.
 *
 * @param userModel - Mongoose User Model
 * @param userId - MongoDB ObjectId or string
 * @returns User or null if not found
 */
export async function getUserById(
  userModel: Model<User>,
  userId: string
): Promise<User | null> {
  const user = await userModel.findById(userId).lean();
  return user;
}

/**
 * Gets a user by email.
 *
 * @param userModel - Mongoose User Model
 * @param email - User email
 * @returns User or null if not found
 */
export async function getUserByEmail(
  userModel: Model<User>,
  email: string
): Promise<User | null> {
  const user = await userModel
    .findOne({ email: email.toLowerCase() })
    .lean();
  return user;
}

/**
 * Lists all users in a tenant.
 *
 * @param userModel - Mongoose User Model
 * @param options - Pagination and filtering options
 * @returns Array of users
 *
 * Usage:
 * ```typescript
 * const users = await listUsers(userModel, { limit: 20, skip: 0 });
 * const activeUsers = await listUsers(userModel, { status: 'active' });
 * ```
 */
export async function listUsers(
  userModel: Model<User>,
  options: {
    status?: UserStatus;
    organizationId?: string;
    limit?: number;
    skip?: number;
  } = {}
): Promise<User[]> {
  const { status, organizationId, limit = 100, skip = 0 } = options;

  const filter: Record<string, unknown> = {};

  if (status) {
    filter['status'] = status;
  }

  if (organizationId) {
    filter['organizationIds'] = organizationId;
  }

  const users = await userModel
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();

  return users;
}

/**
 * Updates a user by their Frontegg User ID.
 *
 * @param userModel - Mongoose User Model
 * @param fronteggUserId - Frontegg user ID (UUID)
 * @param updates - Fields to update
 * @returns Updated user or null if not found
 *
 * Usage:
 * ```typescript
 * const user = await updateUser(userModel, 'uuid-xxx', {
 *   firstName: 'Jane',
 *   status: 'inactive',
 * });
 * ```
 */
export async function updateUser(
  userModel: Model<User>,
  fronteggUserId: string,
  updates: UpdateUserInput
): Promise<User | null> {
  const user = await userModel
    .findOneAndUpdate(
      { fronteggUserId },
      { $set: updates },
      { new: true, runValidators: true }
    )
    .lean();

  return user;
}

/**
 * Updates a user by their MongoDB _id.
 *
 * @param userModel - Mongoose User Model
 * @param userId - MongoDB ObjectId or string
 * @param updates - Fields to update
 * @returns Updated user or null if not found
 */
export async function updateUserById(
  userModel: Model<User>,
  userId: string,
  updates: UpdateUserInput
): Promise<User | null> {
  const user = await userModel
    .findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    )
    .lean();

  return user;
}

/**
 * Archives a user (soft delete).
 * Does not delete the user from the database.
 *
 * @param userModel - Mongoose User Model
 * @param fronteggUserId - Frontegg user ID (UUID)
 * @returns Archived user or null if not found
 *
 * Usage:
 * ```typescript
 * const user = await archiveUser(userModel, 'uuid-xxx');
 * ```
 */
export async function archiveUser(
  userModel: Model<User>,
  fronteggUserId: string
): Promise<User | null> {
  return updateUser(userModel, fronteggUserId, { status: 'archived' } as UpdateUserInput);
}

/**
 * Permanently deletes a user from the database.
 * USE WITH CAUTION - This operation cannot be undone.
 *
 * Prefer using archiveUser() for soft deletes.
 *
 * @param userModel - Mongoose User Model
 * @param fronteggUserId - Frontegg user ID (UUID)
 * @returns True if deleted, false if not found
 */
export async function deleteUser(
  userModel: Model<User>,
  fronteggUserId: string
): Promise<boolean> {
  const result = await userModel.deleteOne({ fronteggUserId });
  return result.deletedCount > 0;
}

/**
 * Adds a user to an organization.
 *
 * @param userModel - Mongoose User Model
 * @param fronteggUserId - Frontegg user ID (UUID)
 * @param organizationId - Organization MongoDB ObjectId
 * @returns Updated user or null if not found
 *
 * Usage:
 * ```typescript
 * const user = await addUserToOrganization(userModel, 'uuid-xxx', '507f1f77bcf86cd799439011');
 * ```
 */
export async function addUserToOrganization(
  userModel: Model<User>,
  fronteggUserId: string,
  organizationId: string
): Promise<User | null> {
  const user = await userModel
    .findOneAndUpdate(
      { fronteggUserId },
      { $addToSet: { organizationIds: organizationId } },
      { new: true, runValidators: true }
    )
    .lean();

  return user;
}

/**
 * Removes a user from an organization.
 *
 * @param userModel - Mongoose User Model
 * @param fronteggUserId - Frontegg user ID (UUID)
 * @param organizationId - Organization MongoDB ObjectId
 * @returns Updated user or null if not found
 */
export async function removeUserFromOrganization(
  userModel: Model<User>,
  fronteggUserId: string,
  organizationId: string
): Promise<User | null> {
  const user = await userModel
    .findOneAndUpdate(
      { fronteggUserId },
      { $pull: { organizationIds: organizationId } },
      { new: true, runValidators: true }
    )
    .lean();

  return user;
}

/**
 * Counts users in a tenant.
 *
 * @param userModel - Mongoose User Model
 * @param filter - Optional filter criteria
 * @returns Number of users matching the filter
 *
 * Usage:
 * ```typescript
 * const totalUsers = await countUsers(userModel);
 * const activeUsers = await countUsers(userModel, { status: 'active' });
 * ```
 */
export async function countUsers(
  userModel: Model<User>,
  filter: Record<string, unknown> = {}
): Promise<number> {
  return userModel.countDocuments(filter);
}
