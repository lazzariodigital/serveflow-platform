// ════════════════════════════════════════════════════════════════
// TYPES - Only export what is NOT in Zod schemas
// All domain types (User, Tenant, Organization, GlobalUser) are now
// exported from @serveflow/core/schemas with z.infer types
// ════════════════════════════════════════════════════════════════

// Common types - Base document and utility types
export * from './common';

// AI Config types - No Zod schema yet
export * from './ai-config';

// Tenant types - Additional interfaces not in Zod schemas
export type {
  TenantAuthProviders,
  TenantAuthProviderGoogle,
  TenantAuthProviderGithub,
} from './tenant';

// ════════════════════════════════════════════════════════════════
// DEPRECATED: The following files exist but are superseded by Zod schemas
// - user.ts → use schemas/user.schema.ts
// - tenant.ts → use schemas/tenant.schema.ts
// - organization.ts → use schemas/organization.schema.ts
// - global-user.ts → use schemas/global-user.schema.ts
// ════════════════════════════════════════════════════════════════
