// ════════════════════════════════════════════════════════════════
// Seed Tenants Script
// ════════════════════════════════════════════════════════════════
// Creates test tenants with organizations and users in:
// - FusionAuth (tenant, applications, users)
// - MongoDB (db_serveflow_sys.tenants, db_tenant_{slug}.*)
//
// Usage:
//   npx ts-node scripts/seed/seed-tenants.ts
//   npx ts-node scripts/seed/seed-tenants.ts --tenant gimnasio-fitmax
//   npx ts-node scripts/seed/seed-tenants.ts --clean
// ════════════════════════════════════════════════════════════════

import { config } from 'dotenv';
config(); // Load .env

import mongoose from 'mongoose';
import {
  createFusionAuthTenantWithApplications,
  createFusionAuthUserWithApps,
  deleteFusionAuthTenant,
  getFusionAuthTenant,
} from '../../packages/auth/src/fusionauth';
import {
  getSystemDbConnection,
  getTenantDbConnection,
} from '../../packages/db/src/connection.service';
import {
  createTenant,
  getTenantBySlug,
  deleteTenant,
} from '../../packages/db/src/operations/tenants';
import {
  createOrganization,
  getOrganizationBySlug,
} from '../../packages/db/src/operations/organizations';
import {
  createUser,
  getUserByEmail,
} from '../../packages/db/src/operations/users';
import { copyRoleTemplatesToTenant } from '../../packages/db/src/operations/role-templates';

import { allTestTenants, type TestTenantData } from './test-data';

// ════════════════════════════════════════════════════════════════
// Configuration
// ════════════════════════════════════════════════════════════════

const MONGODB_URI = process.env['MONGODB_URI'] || 'mongodb://localhost:27017';

// ════════════════════════════════════════════════════════════════
// Helper Functions
// ════════════════════════════════════════════════════════════════

async function seedTenant(data: TestTenantData): Promise<void> {
  const { tenant, organizations, users } = data;

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Creating tenant: ${tenant.name} (${tenant.slug})`);
  console.log('═'.repeat(60));

  // Get system DB connection
  const systemDb = await getSystemDbConnection();

  // 1. Check if tenant already exists
  const existingTenant = await getTenantBySlug(systemDb.tenantModel, tenant.slug);
  if (existingTenant) {
    console.log(`⚠️  Tenant "${tenant.slug}" already exists. Skipping...`);
    console.log(`   To recreate, run: npx ts-node scripts/seed/seed-tenants.ts --clean`);
    return;
  }

  try {
    // 2. Create FusionAuth tenant + applications
    console.log(`\n📦 Creating FusionAuth tenant...`);
    const fusionAuthResult = await createFusionAuthTenantWithApplications(
      tenant.name,
      tenant.slug
    );
    console.log(`   ✓ FusionAuth Tenant: ${fusionAuthResult.tenant.id}`);
    console.log(`   ✓ Dashboard App: ${fusionAuthResult.applications.dashboard.id}`);
    console.log(`   ✓ WebApp App: ${fusionAuthResult.applications.webapp.id}`);

    // 3. Create tenant in MongoDB (db_serveflow_sys.tenants)
    console.log(`\n📦 Creating MongoDB tenant...`);
    const mongoTenant = await createTenant(systemDb.tenantModel, {
      slug: tenant.slug,
      name: tenant.name,
      plan: tenant.plan,
      fusionauthTenantId: fusionAuthResult.tenant.id,
      fusionauthApplications: {
        dashboard: {
          id: fusionAuthResult.applications.dashboard.id,
          name: fusionAuthResult.applications.dashboard.name,
        },
        webapp: {
          id: fusionAuthResult.applications.webapp.id,
          name: fusionAuthResult.applications.webapp.name,
        },
      },
      branding: tenant.branding,
      status: 'active',
    });
    console.log(`   ✓ MongoDB Tenant created`);

    // 4. Get tenant DB connection
    const tenantDb = await getTenantDbConnection(tenant.slug);

    // 5. Copy role templates to tenant
    console.log(`\n📦 Copying role templates...`);
    await copyRoleTemplatesToTenant(
      systemDb.roleTemplateModel,
      tenantDb.tenantRoleModel
    );
    console.log(`   ✓ Role templates copied`);

    // 6. Create organizations
    console.log(`\n📦 Creating ${organizations.length} organizations...`);
    const orgIdMap: Record<string, string> = {};

    for (const org of organizations) {
      const createdOrg = await createOrganization(tenantDb.organizationModel, {
        slug: org.slug,
        name: org.name,
        description: `${org.name} - ${tenant.name}`,
        address: org.address,
        contact: org.contact,
        settings: org.settings || { timezone: 'Europe/Madrid', currency: 'EUR' },
      });
      // Store mapping from slug to _id
      orgIdMap[org.slug] = (createdOrg as any)._id.toString();
      console.log(`   ✓ Organization: ${org.name} (${org.slug})`);
    }

    // 7. Create users
    console.log(`\n📦 Creating ${users.length} users...`);

    for (const user of users) {
      // Resolve organization slugs to IDs
      const organizationIds = user.organizationIds.map(slug => orgIdMap[slug] || slug);
      const primaryOrganizationId = user.primaryOrganizationId
        ? orgIdMap[user.primaryOrganizationId]
        : undefined;

      // Determine which apps this user should have access to based on roles
      const registrations: { applicationId: string; roles: string[] }[] = [];

      // Dashboard access for admin, employee
      const dashboardRoles = user.roles.filter(r => ['admin', 'employee'].includes(r));
      if (dashboardRoles.length > 0) {
        registrations.push({
          applicationId: fusionAuthResult.applications.dashboard.id,
          roles: dashboardRoles,
        });
      }

      // WebApp access for provider, client
      const webappRoles = user.roles.filter(r => ['provider', 'client'].includes(r));
      if (webappRoles.length > 0) {
        registrations.push({
          applicationId: fusionAuthResult.applications.webapp.id,
          roles: webappRoles,
        });
      }

      // Create user in FusionAuth
      const fusionAuthUser = await createFusionAuthUserWithApps({
        email: user.email,
        password: user.password,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId: fusionAuthResult.tenant.id,
        tenantSlug: tenant.slug,
        roles: user.roles,
        organizationIds,
        primaryOrganizationId,
        registrations,
        sendSetPasswordEmail: false, // Don't send email for test users
      });

      // Create user in MongoDB
      await createUser(tenantDb.userModel, {
        fusionauthUserId: fusionAuthUser.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: 'active',
        isVerified: true,
        organizationIds,
      });

      console.log(`   ✓ User: ${user.email} (roles: ${user.roles.join(', ')})`);
    }

    console.log(`\n✅ Tenant "${tenant.slug}" created successfully!`);
    console.log(`\n   Dashboard URL: http://${tenant.slug}.localhost:4200`);
    console.log(`   WebApp URL: http://${tenant.slug}.app.localhost:4201`);

  } catch (error) {
    console.error(`\n❌ Error creating tenant "${tenant.slug}":`, error);

    // Try to clean up partial creation
    console.log(`   Attempting cleanup...`);
    await cleanupTenant(tenant.slug);

    throw error;
  }
}

async function cleanupTenant(slug: string): Promise<void> {
  console.log(`\n🧹 Cleaning up tenant: ${slug}`);

  try {
    const systemDb = await getSystemDbConnection();
    const existingTenant = await getTenantBySlug(systemDb.tenantModel, slug);

    if (existingTenant?.fusionauthTenantId) {
      // Delete FusionAuth tenant (this deletes apps and users too)
      console.log(`   Deleting FusionAuth tenant...`);
      await deleteFusionAuthTenant(existingTenant.fusionauthTenantId);
      console.log(`   ✓ FusionAuth tenant deleted`);
    }

    if (existingTenant) {
      // Delete MongoDB tenant record
      console.log(`   Deleting MongoDB tenant record...`);
      await deleteTenant(systemDb.tenantModel, slug);
      console.log(`   ✓ MongoDB tenant deleted`);
    }

    // Drop tenant database
    const tenantDbName = `db_tenant_${slug.replace(/-/g, '_')}`;
    console.log(`   Dropping database: ${tenantDbName}...`);
    const conn = mongoose.createConnection(`${MONGODB_URI}/${tenantDbName}`);
    await conn.dropDatabase();
    await conn.close();
    console.log(`   ✓ Database dropped`);

    console.log(`✅ Cleanup complete for "${slug}"`);
  } catch (error) {
    console.error(`   ⚠️ Cleanup error:`, error);
  }
}

async function cleanAllTenants(): Promise<void> {
  console.log('\n🧹 Cleaning all test tenants...');

  for (const data of allTestTenants) {
    await cleanupTenant(data.tenant.slug);
  }

  console.log('\n✅ All test tenants cleaned!');
}

// ════════════════════════════════════════════════════════════════
// Main
// ════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const clean = args.includes('--clean');
  const tenantArg = args.find(a => a.startsWith('--tenant='));
  const specificTenant = tenantArg?.split('=')[1];

  console.log('\n🌱 Serveflow Tenant Seeder');
  console.log('═'.repeat(60));

  // Check required environment variables
  if (!process.env['FUSIONAUTH_URL']) {
    console.error('❌ FUSIONAUTH_URL not set');
    process.exit(1);
  }
  if (!process.env['FUSIONAUTH_API_KEY']) {
    console.error('❌ FUSIONAUTH_API_KEY not set');
    process.exit(1);
  }

  console.log(`\n📋 Configuration:`);
  console.log(`   MongoDB: ${MONGODB_URI}`);
  console.log(`   FusionAuth: ${process.env['FUSIONAUTH_URL']}`);
  console.log(`   JWT Lambda: ${process.env['FUSIONAUTH_JWT_POPULATE_LAMBDA_ID'] || 'NOT SET'}`);

  try {
    if (clean) {
      await cleanAllTenants();
    } else if (specificTenant) {
      const tenantData = allTestTenants.find(t => t.tenant.slug === specificTenant);
      if (!tenantData) {
        console.error(`❌ Tenant "${specificTenant}" not found in test data`);
        console.log(`   Available: ${allTestTenants.map(t => t.tenant.slug).join(', ')}`);
        process.exit(1);
      }
      await seedTenant(tenantData);
    } else {
      // Seed all tenants
      for (const tenantData of allTestTenants) {
        await seedTenant(tenantData);
      }
    }

    console.log('\n🎉 Seeding complete!');
    console.log('\n📝 Test credentials (password: Test1234!):');
    for (const data of allTestTenants) {
      console.log(`\n   ${data.tenant.name}:`);
      for (const user of data.users.slice(0, 3)) {
        console.log(`     - ${user.email} (${user.roles.join(', ')})`);
      }
    }

  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    // Close mongoose connections
    await mongoose.disconnect();
  }
}

main();
