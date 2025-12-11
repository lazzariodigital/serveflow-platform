import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { TenantMVP } from '@serveflow/core';
import type { Db } from 'mongodb';
import type { TenantRequest } from '../middleware/tenant.middleware';

// ════════════════════════════════════════════════════════════════
// @Tenant() Decorator
// ════════════════════════════════════════════════════════════════

/**
 * Parameter decorator to inject the current tenant into a controller method.
 *
 * Usage:
 * ```typescript
 * @Get('profile')
 * getProfile(@Tenant() tenant: TenantMVP) {
 *   return { tenantName: tenant.name };
 * }
 * ```
 */
export const Tenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantMVP => {
    const request = ctx.switchToHttp().getRequest<TenantRequest>();

    if (!request.tenant) {
      throw new Error(
        'Tenant not found in request. Ensure TenantMiddleware is applied.'
      );
    }

    return request.tenant;
  }
);

// ════════════════════════════════════════════════════════════════
// @TenantDb() Decorator
// ════════════════════════════════════════════════════════════════

/**
 * Parameter decorator to inject the tenant's database connection.
 *
 * Usage:
 * ```typescript
 * @Get('users')
 * async getUsers(@TenantDb() db: Db) {
 *   return db.collection('users').find().toArray();
 * }
 * ```
 */
export const TenantDb = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Db => {
    const request = ctx.switchToHttp().getRequest<TenantRequest>();

    if (!request.tenantDb) {
      throw new Error(
        'TenantDb not found in request. Ensure TenantMiddleware is applied.'
      );
    }

    return request.tenantDb;
  }
);

// ════════════════════════════════════════════════════════════════
// @TenantSlug() Decorator
// ════════════════════════════════════════════════════════════════

/**
 * Parameter decorator to inject just the tenant slug.
 *
 * Usage:
 * ```typescript
 * @Get('info')
 * getInfo(@TenantSlug() slug: string) {
 *   return { slug };
 * }
 * ```
 */
export const TenantSlug = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<TenantRequest>();

    if (!request.tenant) {
      throw new Error(
        'Tenant not found in request. Ensure TenantMiddleware is applied.'
      );
    }

    return request.tenant.slug;
  }
);
