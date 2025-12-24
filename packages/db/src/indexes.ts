import { Db } from 'mongodb';

// ════════════════════════════════════════════════════════════════
// System Database Indexes (db_serveflow_sys)
// ════════════════════════════════════════════════════════════════

export async function createSystemIndexes(db: Db): Promise<void> {
  console.log('[MongoDB] Creating system database indexes...');

  await Promise.all([
    // Tenants collection
    db.collection('tenants').createIndex({ slug: 1 }, { unique: true }),
    db.collection('tenants').createIndex({ fusionauthTenantId: 1 }, { unique: true }),
    db.collection('tenants').createIndex({ 'fusionauthApplications.dashboard.id': 1 }, { unique: true }),
    db.collection('tenants').createIndex({ 'fusionauthApplications.webapp.id': 1 }, { unique: true }),
    db.collection('tenants').createIndex({ 'company.taxId': 1 }, { unique: true, sparse: true }),
    db.collection('tenants').createIndex({ 'contact.email': 1 }),
    db.collection('tenants').createIndex({ status: 1 }),
    db.collection('tenants').createIndex({ 'advancedSettings.customDomain': 1 }, { sparse: true }),

    // Global Users collection (clerkId for admin dashboard)
    db.collection('global_users').createIndex({ clerkId: 1 }, { unique: true }),
    db.collection('global_users').createIndex({ email: 1 }, { unique: true }),

    // Billing collection
    db.collection('billing').createIndex({ tenantId: 1 }, { unique: true }),
    db.collection('billing').createIndex({ stripeSubscriptionId: 1 }, { sparse: true }),

    // Usage Metrics collection
    db.collection('usage_metrics').createIndex({ tenantId: 1, period: 1 }, { unique: true }),

    // Role Templates collection
    db.collection('role_templates').createIndex({ slug: 1 }, { unique: true }),
    db.collection('role_templates').createIndex({ isSystemTemplate: 1 }),
    db.collection('role_templates').createIndex({ sortOrder: 1 }),
  ]);

  console.log('[MongoDB] System database indexes created');
}

// ════════════════════════════════════════════════════════════════
// Tenant Database Indexes (db_tenant_{slug})
// ════════════════════════════════════════════════════════════════

export async function createTenantIndexes(db: Db): Promise<void> {
  console.log(`[MongoDB] Creating tenant database indexes for ${db.databaseName}...`);

  await Promise.all([
    // Organizations collection
    db.collection('organizations').createIndex({ slug: 1 }, { unique: true }),
    db.collection('organizations').createIndex({ status: 1 }),
    db.collection('organizations').createIndex({ isDefault: 1 }),

    // Users collection
    db.collection('users').createIndex({ fusionauthUserId: 1 }, { unique: true }),
    db.collection('users').createIndex({ email: 1 }),
    db.collection('users').createIndex({ phone: 1 }, { sparse: true }),

    // Memberships collection
    db.collection('memberships').createIndex({ userId: 1 }),
    db.collection('memberships').createIndex({ organizationId: 1 }),
    db.collection('memberships').createIndex(
      { userId: 1, organizationId: 1 },
      { unique: true }
    ),

    // Services collection
    db.collection('services').createIndex({ slug: 1 }, { unique: true }),
    db.collection('services').createIndex({ organizationId: 1, status: 1 }),

    // Resources collection
    db.collection('resources').createIndex(
      { organizationId: 1, slug: 1 },
      { unique: true }
    ),
    db.collection('resources').createIndex({ organizationId: 1, status: 1 }),

    // Events collection
    db.collection('events').createIndex({ organizationId: 1, startTime: 1 }),
    db.collection('events').createIndex({ resourceId: 1, startTime: 1, endTime: 1 }),
    db.collection('events').createIndex({ 'participants.userId': 1, startTime: 1 }),

    // AI Config collection (single document per tenant)
    db.collection('ai_config').createIndex({ _id: 1 }),

    // Tenant Roles collection
    db.collection('tenant_roles').createIndex({ slug: 1 }, { unique: true }),
    db.collection('tenant_roles').createIndex({ templateSlug: 1 }),
    db.collection('tenant_roles').createIndex({ isActive: 1, isDefault: 1 }),
    db.collection('tenant_roles').createIndex({ isFromTemplate: 1 }),
    db.collection('tenant_roles').createIndex({ isCustom: 1 }),
    db.collection('tenant_roles').createIndex({ fusionauthRoleId: 1 }, { sparse: true }),
    db.collection('tenant_roles').createIndex({ sortOrder: 1 }),
  ]);

  console.log(`[MongoDB] Tenant database indexes created for ${db.databaseName}`);
}

// ════════════════════════════════════════════════════════════════
// Drop and recreate indexes (for development/migration)
// ════════════════════════════════════════════════════════════════

export async function recreateSystemIndexes(db: Db): Promise<void> {
  console.log('[MongoDB] Dropping existing system indexes...');

  const collections = ['tenants', 'global_users', 'billing', 'usage_metrics', 'role_templates'];
  for (const collName of collections) {
    try {
      await db.collection(collName).dropIndexes();
    } catch {
      // Collection might not exist yet
    }
  }

  await createSystemIndexes(db);
}

export async function recreateTenantIndexes(db: Db): Promise<void> {
  console.log(`[MongoDB] Dropping existing tenant indexes for ${db.databaseName}...`);

  const collections = ['organizations', 'users', 'memberships', 'services', 'resources', 'events', 'ai_config', 'tenant_roles'];
  for (const collName of collections) {
    try {
      await db.collection(collName).dropIndexes();
    } catch {
      // Collection might not exist yet
    }
  }

  await createTenantIndexes(db);
}
