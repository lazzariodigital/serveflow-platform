// ════════════════════════════════════════════════════════════════
// @serveflow/db/client - Pure MongoDB Client (No NestJS)
// ════════════════════════════════════════════════════════════════
// This entry point exports ONLY pure MongoDB functions without
// any NestJS dependencies. Safe to use in Next.js client bundles.
//
// Usage: import { getSystemDb } from '@serveflow/db/client';
// ════════════════════════════════════════════════════════════════

export {
  getMongoClient,
  closeMongoClient,
  getSystemDb,
  getTenantDb,
  getTenantDbBySlug,
  getCachedTenantDb,
  clearDbCache,
} from '../client';
