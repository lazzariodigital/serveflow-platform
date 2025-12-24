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
  createFusionAuthUserWithApps,
  getFusionAuthUser,
  getFusionAuthUserByEmail,
  updateFusionAuthUser,
  deleteFusionAuthUser,
  deactivateFusionAuthUser,
  reactivateFusionAuthUser,
  searchFusionAuthUsers,
  assignUserRoles,
  removeUserRoles,
  // Organization Management
  getUserOrganizationIds,
  setUserOrganizations,
  assignUserToOrganization,
  removeUserFromOrganization,
  setUserPrimaryOrganization,
  userHasOrganizationAccess,
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
  createFusionAuthTenantWithApplications,  // Creates 2 apps (Dashboard + WebApp) + JWT Lambda
  deleteFusionAuthTenantWithApplication,
  // Lambda Operations (Global - shared across all tenants)
  getGlobalJwtPopulateLambdaId,
  createGlobalJwtPopulateLambda,
  ensureGlobalJwtPopulateLambda,
  createJwtPopulateLambda,  // @deprecated - use global lambda instead
  // Application Role Operations
  updateApplicationRoles,
  getApplicationRoles,
  addApplicationRole,
  removeApplicationRole,
  type AppType,
  type CreateFusionAuthTenantInput,
  type CreateFusionAuthApplicationInput,
  type FusionAuthTenantResult,
  type FusionAuthApplicationResult,
  type CreateTenantWithApplicationResult,
  type CreateTenantWithApplicationsResult,
  type UpdateApplicationRolesInput,
  type ApplicationRoleResult,
  type CreateLambdaResult,
} from './tenants';
