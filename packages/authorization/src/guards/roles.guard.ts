import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '@serveflow/auth/server';

// ════════════════════════════════════════════════════════════════
// Roles Guard
// ════════════════════════════════════════════════════════════════
// Verifies that the authenticated user has the required roles.
// Works with the @Roles() decorator.
// ════════════════════════════════════════════════════════════════

/**
 * Guard that checks if user has required roles.
 *
 * @example
 * ```typescript
 * @Roles('admin', 'employee')
 * @Get('bookings')
 * async getBookings() {
 *   // Only admin or employee can access
 * }
 * ```
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    // No roles required = allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const userRoles: string[] = user.roles || [];

    // Check if user has any of the required roles
    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException(
        `Required role: ${requiredRoles.join(' or ')}`
      );
    }

    return true;
  }
}
