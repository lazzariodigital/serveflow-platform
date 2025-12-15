// ════════════════════════════════════════════════════════════════
// FusionAuth Module Exports
// ════════════════════════════════════════════════════════════════

// Client
export {
  getFusionAuthClient,
  getFusionAuthClientForTenant,
  getFusionAuthUrl,
  resetFusionAuthClient,
} from './client';

// User Operations
export {
  createFusionAuthUser,
  getFusionAuthUser,
  getFusionAuthUserByEmail,
  updateFusionAuthUser,
  deleteFusionAuthUser,
  deactivateFusionAuthUser,
  reactivateFusionAuthUser,
  searchFusionAuthUsers,
  assignUserRoles,
  removeUserRoles,
} from './users';

// Tenant & Application Operations
export {
  createFusionAuthTenant,
  getFusionAuthTenant,
  deleteFusionAuthTenant,
  createFusionAuthApplication,
  getFusionAuthApplication,
  deleteFusionAuthApplication,
  createFusionAuthTenantWithApplication,
  deleteFusionAuthTenantWithApplication,
  type CreateFusionAuthTenantInput,
  type CreateFusionAuthApplicationInput,
  type FusionAuthTenantResult,
  type FusionAuthApplicationResult,
  type CreateTenantWithApplicationResult,
} from './tenants';
