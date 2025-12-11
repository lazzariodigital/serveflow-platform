import mongoose, { Connection, Model } from 'mongoose';
import { env, SYSTEM_DB_NAME, TENANT_DB_PREFIX } from '@serveflow/config';
import {
  User,
  UserSchema,
  GlobalUser,
  GlobalUserSchema,
  Tenant,
  TenantSchema,
} from './schemas';

// ════════════════════════════════════════════════════════════════
// Standalone Mongoose Connection (for non-NestJS usage)
//
// This module provides functions to get Mongoose models without
// NestJS dependency injection. Use this for:
// - Webhook handlers
// - CLI scripts
// - Background jobs
//
// For NestJS apps, use MongooseConnectionService instead.
// ════════════════════════════════════════════════════════════════

let systemConnection: Connection | null = null;
const tenantConnections = new Map<string, Connection>();

// ════════════════════════════════════════════════════════════════
// System Database Connection (db_serveflow_sys)
// ════════════════════════════════════════════════════════════════

/**
 * Gets or creates the system database connection.
 */
async function getSystemConnection(): Promise<Connection> {
  if (systemConnection) {
    return systemConnection;
  }

  systemConnection = await mongoose.createConnection(env.MONGODB_URI, {
    dbName: SYSTEM_DB_NAME,
    maxPoolSize: 10,
    minPoolSize: 2,
  }).asPromise();

  systemConnection.model(GlobalUser.name, GlobalUserSchema);
  systemConnection.model(Tenant.name, TenantSchema);

  return systemConnection;
}

// ════════════════════════════════════════════════════════════════
// Tenant Database Connection (db_tenant_{slug})
// ════════════════════════════════════════════════════════════════

/**
 * Gets or creates a tenant database connection.
 */
async function getTenantConnection(dbName: string): Promise<Connection> {
  if (!dbName.startsWith(TENANT_DB_PREFIX)) {
    throw new Error(
      `Invalid tenant database name: ${dbName}. Must start with "${TENANT_DB_PREFIX}"`
    );
  }

  if (tenantConnections.has(dbName)) {
    return tenantConnections.get(dbName)!;
  }

  const connection = await mongoose.createConnection(env.MONGODB_URI, {
    dbName,
    maxPoolSize: 10,
    minPoolSize: 2,
  }).asPromise();

  connection.model(User.name, UserSchema);

  tenantConnections.set(dbName, connection);

  return connection;
}

// ════════════════════════════════════════════════════════════════
// Model Getters (Standalone)
// ════════════════════════════════════════════════════════════════

/**
 * Gets the Tenant model from the system database.
 *
 * Usage:
 * ```typescript
 * const tenantModel = await getStandaloneTenantModel();
 * const tenant = await getTenantByClerkOrgId(tenantModel, 'org_xxx');
 * ```
 */
export async function getStandaloneTenantModel(): Promise<Model<Tenant>> {
  const connection = await getSystemConnection();
  return connection.model<Tenant>(Tenant.name);
}

/**
 * Gets the GlobalUser model from the system database.
 */
export async function getStandaloneGlobalUserModel(): Promise<Model<GlobalUser>> {
  const connection = await getSystemConnection();
  return connection.model<GlobalUser>(GlobalUser.name);
}

/**
 * Gets the User model for a specific tenant database.
 *
 * Usage:
 * ```typescript
 * const userModel = await getStandaloneUserModel('db_tenant_gimnasio');
 * const user = await getUserByClerkId(userModel, 'user_xxx');
 * ```
 */
export async function getStandaloneUserModel(dbName: string): Promise<Model<User>> {
  const connection = await getTenantConnection(dbName);
  return connection.model<User>(User.name);
}

/**
 * Gets the User model for a tenant by slug.
 *
 * Usage:
 * ```typescript
 * const userModel = await getStandaloneUserModelBySlug('gimnasio-demo');
 * const user = await getUserByClerkId(userModel, 'user_xxx');
 * ```
 */
export async function getStandaloneUserModelBySlug(slug: string): Promise<Model<User>> {
  const dbName = `${TENANT_DB_PREFIX}${slug.replace(/-/g, '_')}`;
  return getStandaloneUserModel(dbName);
}

// ════════════════════════════════════════════════════════════════
// Cleanup
// ════════════════════════════════════════════════════════════════

/**
 * Closes all standalone connections.
 * Call this when shutting down the application.
 */
export async function closeStandaloneConnections(): Promise<void> {
  if (systemConnection) {
    await systemConnection.close();
    systemConnection = null;
  }

  for (const connection of tenantConnections.values()) {
    await connection.close();
  }

  tenantConnections.clear();
}
