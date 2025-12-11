import type { NextFunction, Request, Response } from 'express';

import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { TenantMVP } from '@serveflow/core';
import {
  MongooseConnectionService,
  getTenantDb,
  type Organization,
  type User,
} from '@serveflow/db';
import type { Db } from 'mongodb';
import type { Connection, Model } from 'mongoose';
import { resolveTenantBySlug, resolveTenantFromHost } from '../resolver';

// ════════════════════════════════════════════════════════════════
// Extended Request Type
// ════════════════════════════════════════════════════════════════

export interface TenantRequest extends Request {
  tenant: TenantMVP;
  /** @deprecated Use mongooseConnection or models instead */
  tenantDb: Db;
  // Mongoose models
  mongooseConnection: Connection;
  userModel: Model<User>;
  organizationModel: Model<Organization>;
}

// ════════════════════════════════════════════════════════════════
// Tenant Middleware
// ════════════════════════════════════════════════════════════════

/**
 * NestJS Middleware that resolves tenant from subdomain and injects
 * tenant info, database connection, and Mongoose models into the request.
 *
 * Usage in NestJS:
 * ```typescript
 * // In AppModule
 * imports: [ServeflowMongooseModule], // Required for MongooseConnectionService
 *
 * export class AppModule implements NestModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer.apply(TenantMiddleware).forRoutes('*');
 *   }
 * }
 * ```
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly mongooseConnection: MongooseConnectionService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const host = req.get('host') || req.hostname || '';

    // Skip tenant resolution for health checks
    if (req.path === '/health' || req.path === '/api/health') {
      return next();
    }

    // ════════════════════════════════════════════════════════════════
    // PASO 1: Resolver tenant por SUBDOMAIN (método primario)
    // ════════════════════════════════════════════════════════════════
    console.log(`[TenantMiddleware] Resolving tenant for host: ${host}`);
    let { tenant, error } = await resolveTenantFromHost(host);

    // ════════════════════════════════════════════════════════════════
    // PASO 1B: Fallback a X-Tenant-Slug header (servicios internos)
    // ════════════════════════════════════════════════════════════════
    if (!tenant) {
      const tenantSlugHeader = req.get('x-tenant-slug');

      console.log(`[TenantMiddleware] Tenant not found from subdomain. Checking X-Tenant-Slug header.`);

      if (tenantSlugHeader) {
        console.log(`[TenantMiddleware] Fallback to X-Tenant-Slug header: ${tenantSlugHeader}`);
        const result = await resolveTenantBySlug(tenantSlugHeader);
        tenant = result.tenant;
        error = result.error;
      }
    }

    if (!tenant) {
      res.status(404).json({
        error: 'Tenant not found',
        message: error || 'Could not resolve tenant from subdomain or X-Tenant-Slug header',
      });
      return;
    }

    console.log(`[TenantMiddleware] Resolved tenant: ${tenant.slug}`);

    // Inject tenant into request
    (req as TenantRequest).tenant = tenant;

    // Get tenant database connections and models
    try {
      const dbName = tenant.database.name;

      // Legacy: MongoDB native Db (deprecated, for backwards compatibility)
      const tenantDb = await getTenantDb(dbName);
      (req as TenantRequest).tenantDb = tenantDb;

      // New: Mongoose connection and models
      const connection = await this.mongooseConnection.getTenantConnection(dbName);
      (req as TenantRequest).mongooseConnection = connection;
      (req as TenantRequest).userModel = await this.mongooseConnection.getUserModel(dbName);
      (req as TenantRequest).organizationModel = await this.mongooseConnection.getOrganizationModel(dbName);
    } catch (dbError) {
      console.error('[TenantMiddleware] Database connection failed:', dbError);
      res.status(500).json({
        error: 'Database connection failed',
        message: 'Could not connect to tenant database',
      });
      return;
    }

    next();
  }
}

// ════════════════════════════════════════════════════════════════
// Functional Middleware (alternative - deprecated)
// ════════════════════════════════════════════════════════════════

/**
 * @deprecated Use TenantMiddleware class with dependency injection instead
 * Functional middleware for use without class instantiation
 */
export async function tenantMiddleware(
  _req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  // This function is deprecated - the middleware now requires DI
  res.status(500).json({
    error: 'Configuration error',
    message: 'tenantMiddleware function is deprecated. Use TenantMiddleware class with NestJS DI.',
  });
}
