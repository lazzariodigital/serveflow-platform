// ════════════════════════════════════════════════════════════════
// @serveflow/tenants/resolve - Pure Resolver Functions (No NestJS)
// ════════════════════════════════════════════════════════════════
// This entry point exports ONLY the tenant resolution functions
// without any NestJS dependencies. Safe to use in Next.js apps.
//
// Usage: import { resolveTenantFromHost } from '@serveflow/tenants/resolve';
// ════════════════════════════════════════════════════════════════

export {
  extractSlugFromHost,
  resolveTenantBySlug,
  resolveTenantFromHost,
  resolveTenantByFronteggId,
  // Legacy alias for backwards compatibility
  resolveTenantByClerkOrgId,
  type TenantResolutionResult,
} from '../resolver';
