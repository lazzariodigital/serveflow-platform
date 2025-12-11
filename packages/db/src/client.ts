import { SYSTEM_DB_NAME, TENANT_DB_PREFIX, env } from '@serveflow/config';
import { Db, MongoClient } from 'mongodb';

// ════════════════════════════════════════════════════════════════
// Singleton MongoClient with connection pooling
// ════════════════════════════════════════════════════════════════

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

export async function getMongoClient(): Promise<MongoClient> {
  if (client) {
    return client;
  }

  if (clientPromise) {
    return clientPromise;
  }

  clientPromise = MongoClient.connect(env.MONGODB_URI, {
    maxPoolSize: 100,
    minPoolSize: 10,
    maxIdleTimeMS: 30000,
  }).then((connectedClient) => {
    client = connectedClient;
    console.log('[MongoDB] Connected to cluster');
    return connectedClient;
  });

  return clientPromise;
}

// ════════════════════════════════════════════════════════════════
// Close connection (for graceful shutdown)
// ════════════════════════════════════════════════════════════════

export async function closeMongoClient(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    clientPromise = null;
    console.log('[MongoDB] Connection closed');
  }
}

// ════════════════════════════════════════════════════════════════
// Get System Database (db_serveflow_sys)
// ════════════════════════════════════════════════════════════════

export async function getSystemDb(): Promise<Db> {
  const mongoClient = await getMongoClient();

  console.log('[MongoDB] Accessing system database');
  console.log(SYSTEM_DB_NAME)

  return mongoClient.db(SYSTEM_DB_NAME);
}

// ════════════════════════════════════════════════════════════════
// Get Tenant Database (db_tenant_{slug})
// ════════════════════════════════════════════════════════════════

export async function getTenantDb(dbName: string): Promise<Db> {
  // Validate that the name follows the expected pattern
  if (!dbName.startsWith(TENANT_DB_PREFIX)) {
    throw new Error(
      `Invalid tenant database name: ${dbName}. Must start with "${TENANT_DB_PREFIX}"`
    );
  }

  const mongoClient = await getMongoClient();
  return mongoClient.db(dbName);
}

// ════════════════════════════════════════════════════════════════
// Get Tenant Database by Slug (convenience method)
// ════════════════════════════════════════════════════════════════

export async function getTenantDbBySlug(slug: string): Promise<Db> {
  const dbName = `${TENANT_DB_PREFIX}${slug.replace(/-/g, '_')}`;
  return getTenantDb(dbName);
}

// ════════════════════════════════════════════════════════════════
// Database Cache (optional, for optimization)
// ════════════════════════════════════════════════════════════════

const dbCache = new Map<string, Db>();

export async function getCachedTenantDb(dbName: string): Promise<Db> {
  if (!dbCache.has(dbName)) {
    const db = await getTenantDb(dbName);
    dbCache.set(dbName, db);
  }
  return dbCache.get(dbName)!;
}

export function clearDbCache(): void {
  dbCache.clear();
}
