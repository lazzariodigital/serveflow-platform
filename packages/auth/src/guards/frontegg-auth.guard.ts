import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';
import type { AuthRequest, AuthenticatedUser } from '../types';
import { IS_PUBLIC_KEY, ROLES_KEY, REQUIRE_TENANT_KEY, PERMISSIONS_KEY } from '../decorators/auth.decorator';

// ════════════════════════════════════════════════════════════════
// Frontegg Auth Guard
// ════════════════════════════════════════════════════════════════

interface FronteggJwtPayload {
  sub: string;
  email: string;
  name?: string;
  tenantId: string;
  tenantIds?: string[];
  roles: string[];
  permissions: string[];
  type: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

@Injectable()
export class FronteggAuthGuard implements CanActivate {
  private jwksClient: jwksClient.JwksClient;
  private baseUrl: string;

  constructor(private reflector: Reflector) {
    this.baseUrl = process.env['FRONTEGG_BASE_URL'] || '';

    if (!this.baseUrl) {
      console.warn('FRONTEGG_BASE_URL not set - auth will fail');
    }

    // Initialize JWKS client for JWT verification
    this.jwksClient = jwksClient({
      jwksUri: `${this.baseUrl}/.well-known/jwks.json`,
      cache: true,
      cacheMaxAge: 86400000, // 24 hours
      rateLimit: true,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthRequest>();

    // Extract token from Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    try {
      // Verify and decode the JWT token
      const decoded = await this.verifyToken(token);

      console.log('[FronteggAuthGuard] Token verified. Claims:', {
        sub: decoded.sub,
        email: decoded.email,
        tenantId: decoded.tenantId,
        roles: decoded.roles,
      });

      // Build authenticated user object
      const authenticatedUser: AuthenticatedUser = {
        fronteggUserId: decoded.sub,
        email: decoded.email,
        firstName: decoded.name?.split(' ')[0],
        lastName: decoded.name?.split(' ').slice(1).join(' '),
        tenantId: decoded.tenantId,
        roles: decoded.roles || [],
        permissions: decoded.permissions || [],
      };

      // Inject auth info into request
      request.user = authenticatedUser;
      request.auth = {
        userId: decoded.sub,
        tenantId: decoded.tenantId,
        roles: decoded.roles || [],
        permissions: decoded.permissions || [],
      };

      // Check if tenant is required
      const requireTenant = this.reflector.getAllAndOverride<boolean>(
        REQUIRE_TENANT_KEY,
        [context.getHandler(), context.getClass()]
      );

      if (requireTenant && !decoded.tenantId) {
        console.log('[FronteggAuthGuard] 403: Tenant required but not found in token');
        throw new ForbiddenException('Tenant context required');
      }

      // Check roles if specified
      const requiredRoles = this.reflector.getAllAndOverride<string[]>(
        ROLES_KEY,
        [context.getHandler(), context.getClass()]
      );

      if (requiredRoles?.length) {
        const hasRole = requiredRoles.some(role => decoded.roles?.includes(role));
        if (!hasRole) {
          throw new ForbiddenException(
            `Required role: ${requiredRoles.join(' or ')}`
          );
        }
      }

      // Check permissions if specified
      const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
        PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()]
      );

      if (requiredPermissions?.length) {
        const hasPermission = requiredPermissions.some(
          perm => decoded.permissions?.includes(perm)
        );
        if (!hasPermission) {
          throw new ForbiddenException(
            `Required permission: ${requiredPermissions.join(' or ')}`
          );
        }
      }

      return true;
    } catch (error) {
      console.log('[FronteggAuthGuard] Error:', error instanceof Error ? error.message : error);

      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Verifies and decodes a Frontegg JWT token.
   */
  private async verifyToken(token: string): Promise<FronteggJwtPayload> {
    return new Promise((resolve, reject) => {
      // Get the signing key
      const getKey = (header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) => {
        this.jwksClient.getSigningKey(header.kid, (err, key) => {
          if (err) {
            callback(err, undefined);
            return;
          }
          const signingKey = key?.getPublicKey();
          callback(null, signingKey);
        });
      };

      // Verify the token
      jwt.verify(
        token,
        getKey,
        {
          algorithms: ['RS256'],
          issuer: this.baseUrl,
        },
        (err, decoded) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(decoded as FronteggJwtPayload);
        }
      );
    });
  }
}
