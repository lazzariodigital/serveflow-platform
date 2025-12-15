import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthRequest, AuthenticatedUser } from '../types';

// ════════════════════════════════════════════════════════════════
// Metadata Keys
// ════════════════════════════════════════════════════════════════

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';
export const PERMISSIONS_KEY = 'permissions';
export const REQUIRE_TENANT_KEY = 'requireTenant';

// Legacy alias for backwards compatibility
export const REQUIRE_ORG_KEY = REQUIRE_TENANT_KEY;

// ════════════════════════════════════════════════════════════════
// @Public() Decorator
// ════════════════════════════════════════════════════════════════

/**
 * Marks an endpoint as public (no authentication required).
 *
 * Usage:
 * ```typescript
 * @Public()
 * @Get('health')
 * healthCheck() {
 *   return { status: 'ok' };
 * }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// ════════════════════════════════════════════════════════════════
// @Roles() Decorator
// ════════════════════════════════════════════════════════════════

/**
 * Restricts access to users with specific roles.
 *
 * Usage:
 * ```typescript
 * @Roles('Admin', 'Owner')
 * @Get('settings')
 * getSettings() {
 *   return { ... };
 * }
 * ```
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// ════════════════════════════════════════════════════════════════
// @Permissions() Decorator
// ════════════════════════════════════════════════════════════════

/**
 * Restricts access to users with specific permissions.
 *
 * NOTE: This decorator is kept for backwards compatibility.
 * Permissions will be handled by Cerbos in Block 3.
 * The FusionAuthGuard no longer validates permissions.
 *
 * @deprecated Use Cerbos for permission checks instead
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

// ════════════════════════════════════════════════════════════════
// @RequireTenant() Decorator
// ════════════════════════════════════════════════════════════════

/**
 * Requires the user to be authenticated within a tenant context.
 *
 * Usage:
 * ```typescript
 * @RequireTenant()
 * @Get('tenant-data')
 * getTenantData() {
 *   return { ... };
 * }
 * ```
 */
export const RequireTenant = () => SetMetadata(REQUIRE_TENANT_KEY, true);

// Legacy alias for backwards compatibility
export const RequireOrganization = RequireTenant;

// ════════════════════════════════════════════════════════════════
// @CurrentUser() Decorator
// ════════════════════════════════════════════════════════════════

/**
 * Parameter decorator to inject the authenticated user.
 *
 * Usage:
 * ```typescript
 * @Get('profile')
 * getProfile(@CurrentUser() user: AuthenticatedUser) {
 *   return { email: user.email };
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<AuthRequest>();

    if (!request.user) {
      throw new Error(
        'User not found in request. Ensure FusionAuthGuard is applied.'
      );
    }

    return request.user;
  }
);

// ════════════════════════════════════════════════════════════════
// @CurrentUserId() Decorator
// ════════════════════════════════════════════════════════════════

/**
 * Parameter decorator to inject just the user's FusionAuth ID.
 *
 * Usage:
 * ```typescript
 * @Get('my-data')
 * getMyData(@CurrentUserId() userId: string) {
 *   return this.service.getByUserId(userId);
 * }
 * ```
 */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<AuthRequest>();

    if (!request.auth?.userId) {
      throw new Error(
        'Auth not found in request. Ensure FusionAuthGuard is applied.'
      );
    }

    return request.auth.userId;
  }
);

// ════════════════════════════════════════════════════════════════
// @CurrentTenantId() Decorator
// ════════════════════════════════════════════════════════════════

/**
 * Parameter decorator to inject the current tenant ID.
 *
 * Usage:
 * ```typescript
 * @RequireTenant()
 * @Get('tenant-info')
 * getTenantInfo(@CurrentTenantId() tenantId: string) {
 *   return this.service.getTenant(tenantId);
 * }
 * ```
 */
export const CurrentTenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthRequest>();
    return request.auth?.tenantId;
  }
);

// Legacy alias for backwards compatibility
export const CurrentOrgId = CurrentTenantId;
