#!/usr/bin/env npx tsx
/**
 * ════════════════════════════════════════════════════════════════
 * Migration Script: Frontegg → FusionAuth
 * ════════════════════════════════════════════════════════════════
 *
 * This script migrates user data from Frontegg to FusionAuth.
 *
 * Prerequisites:
 * 1. FusionAuth is running (docker-compose.fusionauth.yml)
 * 2. FusionAuth tenant and application are created manually in the admin console
 * 3. Environment variables are set (see .env.example)
 *
 * Usage:
 *   npx tsx scripts/migrate-to-fusionauth.ts
 *
 * ════════════════════════════════════════════════════════════════
 */

import { FusionAuthClient } from '@fusionauth/typescript-client';
import { MongoClient } from 'mongodb';

// ════════════════════════════════════════════════════════════════
// Configuration
// ════════════════════════════════════════════════════════════════

const config = {
  // FusionAuth
  fusionauth: {
    url: process.env.FUSIONAUTH_URL || 'http://localhost:9011',
    apiKey: process.env.FUSIONAUTH_API_KEY || '',
    tenantId: process.env.FUSIONAUTH_TENANT_ID || '',
    applicationId: process.env.FUSIONAUTH_APPLICATION_ID || '',
  },
  // MongoDB
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    systemDb: process.env.MONGODB_SYSTEM_DB || 'db_serveflow_sys',
  },
  // Migration options
  dryRun: process.argv.includes('--dry-run'),
  skipExisting: process.argv.includes('--skip-existing'),
};

// ════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════

interface TenantDocument {
  _id: string;
  slug: string;
  name: string;
  fronteggTenantId?: string;
  fusionauthTenantId?: string;
  fusionauthApplicationId?: string;
  status: string;
}

interface UserDocument {
  _id: string;
  fronteggUserId?: string;
  fusionauthUserId?: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  isVerified: boolean;
}

// ════════════════════════════════════════════════════════════════
// Migration Functions
// ════════════════════════════════════════════════════════════════

async function migrateUserToFusionAuth(
  client: FusionAuthClient,
  user: UserDocument,
  tenantId: string,
  applicationId: string
): Promise<string | null> {
  console.log(`  Migrating user: ${user.email}`);

  if (config.dryRun) {
    console.log(`    [DRY RUN] Would create user in FusionAuth`);
    return 'dry-run-user-id';
  }

  try {
    // Check if user already exists
    const existingUser = await client.retrieveUserByEmail(user.email);
    if (existingUser.response.user) {
      if (config.skipExisting) {
        console.log(`    User already exists in FusionAuth, skipping`);
        return existingUser.response.user.id || null;
      }
      console.log(`    User already exists in FusionAuth: ${existingUser.response.user.id}`);
      return existingUser.response.user.id || null;
    }

    // Create user in FusionAuth
    const response = await client.register(undefined, {
      user: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        verified: user.isVerified,
        active: user.status === 'active',
        tenantId,
      },
      registration: {
        applicationId,
        roles: ['user'],
      },
      sendSetPasswordEmail: true,
      skipVerification: user.isVerified,
    });

    if (response.response.user?.id) {
      console.log(`    Created FusionAuth user: ${response.response.user.id}`);
      return response.response.user.id;
    }

    console.error(`    Failed to create user in FusionAuth`);
    return null;
  } catch (error) {
    console.error(`    Error migrating user ${user.email}:`, error);
    return null;
  }
}

async function updateUserInMongoDB(
  db: MongoClient['db'],
  collectionName: string,
  userId: string,
  fusionauthUserId: string
): Promise<void> {
  if (config.dryRun) {
    console.log(`    [DRY RUN] Would update MongoDB user ${userId} with fusionauthUserId`);
    return;
  }

  const collection = db.collection('users');
  await collection.updateOne(
    { _id: userId },
    {
      $set: { fusionauthUserId },
      $unset: { fronteggUserId: '' },
    }
  );
  console.log(`    Updated MongoDB user with fusionauthUserId`);
}

// ════════════════════════════════════════════════════════════════
// Main Migration
// ════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('FusionAuth Migration Script');
  console.log('════════════════════════════════════════════════════════════════');

  if (config.dryRun) {
    console.log('Running in DRY RUN mode - no changes will be made\n');
  }

  // Validate configuration
  if (!config.fusionauth.apiKey) {
    console.error('Error: FUSIONAUTH_API_KEY is required');
    process.exit(1);
  }

  if (!config.fusionauth.tenantId || !config.fusionauth.applicationId) {
    console.error('Error: FUSIONAUTH_TENANT_ID and FUSIONAUTH_APPLICATION_ID are required');
    console.error('Create a tenant and application in FusionAuth admin console first.');
    process.exit(1);
  }

  // Initialize clients
  const fusionAuthClient = new FusionAuthClient(
    config.fusionauth.apiKey,
    config.fusionauth.url,
    config.fusionauth.tenantId
  );

  const mongoClient = new MongoClient(config.mongodb.uri);

  try {
    await mongoClient.connect();
    console.log('Connected to MongoDB\n');

    const systemDb = mongoClient.db(config.mongodb.systemDb);

    // ════════════════════════════════════════════════════════════════
    // Step 1: Update tenant with FusionAuth IDs
    // ════════════════════════════════════════════════════════════════
    console.log('Step 1: Updating tenants with FusionAuth configuration...');

    const tenantsCollection = systemDb.collection<TenantDocument>('tenants');
    const tenants = await tenantsCollection.find({ status: 'active' }).toArray();

    console.log(`Found ${tenants.length} active tenants\n`);

    for (const tenant of tenants) {
      console.log(`Processing tenant: ${tenant.slug}`);

      if (tenant.fusionauthTenantId && tenant.fusionauthApplicationId) {
        console.log(`  Already has FusionAuth config, skipping tenant update`);
      } else if (!config.dryRun) {
        // Update tenant with FusionAuth IDs
        // Note: In production, you'd create separate tenants/apps for each Serveflow tenant
        await tenantsCollection.updateOne(
          { _id: tenant._id },
          {
            $set: {
              fusionauthTenantId: config.fusionauth.tenantId,
              fusionauthApplicationId: config.fusionauth.applicationId,
            },
            $unset: { fronteggTenantId: '' },
          }
        );
        console.log(`  Updated tenant with FusionAuth config`);
      } else {
        console.log(`  [DRY RUN] Would update tenant with FusionAuth config`);
      }

      // ════════════════════════════════════════════════════════════════
      // Step 2: Migrate users for this tenant
      // ════════════════════════════════════════════════════════════════
      console.log(`\nStep 2: Migrating users for tenant ${tenant.slug}...`);

      const tenantDbName = tenant.slug.replace(/-/g, '_');
      const tenantDb = mongoClient.db(`db_tenant_${tenantDbName}`);
      const usersCollection = tenantDb.collection<UserDocument>('users');

      const users = await usersCollection.find({}).toArray();
      console.log(`Found ${users.length} users\n`);

      let migrated = 0;
      let skipped = 0;
      let failed = 0;

      for (const user of users) {
        // Skip if already has FusionAuth ID
        if (user.fusionauthUserId) {
          console.log(`  User ${user.email} already has fusionauthUserId, skipping`);
          skipped++;
          continue;
        }

        const fusionauthUserId = await migrateUserToFusionAuth(
          fusionAuthClient,
          user,
          config.fusionauth.tenantId,
          config.fusionauth.applicationId
        );

        if (fusionauthUserId) {
          await updateUserInMongoDB(tenantDb, 'users', user._id, fusionauthUserId);
          migrated++;
        } else {
          failed++;
        }
      }

      console.log(`\nTenant ${tenant.slug} migration complete:`);
      console.log(`  Migrated: ${migrated}`);
      console.log(`  Skipped: ${skipped}`);
      console.log(`  Failed: ${failed}`);
    }

    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('Migration complete!');
    console.log('════════════════════════════════════════════════════════════════');

    if (config.dryRun) {
      console.log('\nThis was a dry run. Run without --dry-run to apply changes.');
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoClient.close();
  }
}

// Run migration
main().catch(console.error);
