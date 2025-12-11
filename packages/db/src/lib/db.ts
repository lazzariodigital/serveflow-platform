// ════════════════════════════════════════════════════════════════
// Mongoose Module and Connection Service (NEW)
// ════════════════════════════════════════════════════════════════
export * from '../mongoose.module';
export * from '../connection.service';

// ════════════════════════════════════════════════════════════════
// Schemas (NEW)
// ════════════════════════════════════════════════════════════════
export * from '../schemas';

// ════════════════════════════════════════════════════════════════
// Database Operations (Updated to use Mongoose Models)
// ════════════════════════════════════════════════════════════════
export * from '../operations';

// ════════════════════════════════════════════════════════════════
// Indexes
// ════════════════════════════════════════════════════════════════
export * from '../indexes';

// ════════════════════════════════════════════════════════════════
// Standalone Mongoose (for non-NestJS usage: webhooks, CLI, scripts)
// ════════════════════════════════════════════════════════════════
export * from '../standalone';

// ════════════════════════════════════════════════════════════════
// Legacy exports (deprecated, maintained for compatibility)
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
