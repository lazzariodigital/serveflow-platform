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
import type { AuthRequest, AuthenticatedUser, FusionAuthJwtPayload } from '../types';
import { IS_PUBLIC_KEY, ROLES_KEY, REQUIRE_TENANT_KEY } from '../decorators/auth.decorator';

// ════════════════════════════════════════════════════════════════
// FusionAuth Auth Guard
// ════════════════════════════════════════════════════════════════
// Verifies JWT tokens issued by FusionAuth using JWKS.
// NOTE: Permissions removed - authorization will be handled by Cerbos (Block 3)
// ════════════════════════════════════════════════════════════════

@Injectable()
export class FusionAuthGuard implements CanActivate {
  private jwksClient: jwksClient.JwksClient;
  private baseUrl: string;

  constructor(private reflector: Reflector) {
    this.baseUrl = process.env['FUSIONAUTH_URL'] || '';

    if (!this.baseUrl) {
      console.warn('[FusionAuthGuard] FUSIONAUTH_URL not set - auth will fail');
    }

    // Initialize JWKS client for JWT verification
    // FusionAuth exposes JWKS at /.well-known/jwks.json
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

      console.log('[FusionAuthGuard] Token verified. Claims:', {
        sub: decoded.sub,
        email: decoded.email,
        applicationId: decoded.applicationId,
        roles: decoded.roles,
      });

      // Determine tenant ID from token
      // FusionAuth can include tenant ID in different claims depending on setup:
      // - tid: Multi-tenant FusionAuth tenant ID
      // - tenantId: Custom claim via JWT Populate Lambda
      // - applicationId: Can be used to identify the Serveflow tenant
      const tenantId = decoded.tenantId || decoded.tid || decoded.applicationId;

      // Build authenticated user object
      const authenticatedUser: AuthenticatedUser = {
        fusionauthUserId: decoded.sub,
        email: decoded.email,
        firstName: decoded.given_name,
        lastName: decoded.family_name,
        imageUrl: decoded.picture,
        tenantId: tenantId,
        roles: decoded.roles || [],
      };

      // Inject auth info into request
      request.user = authenticatedUser;
      request.auth = {
        userId: decoded.sub,
        tenantId: tenantId,
        roles: decoded.roles || [],
      };

      // Check if tenant is required
      const requireTenant = this.reflector.getAllAndOverride<boolean>(
        REQUIRE_TENANT_KEY,
        [context.getHandler(), context.getClass()]
      );

      if (requireTenant && !tenantId) {
        console.log('[FusionAuthGuard] 403: Tenant required but not found in token');
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

      // NOTE: Permissions check removed - will be handled by Cerbos (Block 3)

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log('[FusionAuthGuard] Error:', errorMessage);

      // Log helpful debug info for issuer mismatch
      if (errorMessage.includes('issuer')) {
        console.log('[FusionAuthGuard] Expected issuer:', this.baseUrl);
        console.log('[FusionAuthGuard] Check FusionAuth → Tenants → JWT → Issuer setting');
      }

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
   * Verifies and decodes a FusionAuth JWT token using JWKS.
   * Note: Issuer validation is flexible to handle different FusionAuth configurations
   */
  private async verifyToken(token: string): Promise<FusionAuthJwtPayload> {
    return new Promise((resolve, reject) => {
      // Get the signing key from JWKS endpoint
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

      // Build list of valid issuers (with and without protocol)
      // This handles FusionAuth tenants that may have different issuer formats
      const validIssuers = this.getValidIssuers();

      // Verify the token with RS256 algorithm
      jwt.verify(
        token,
        getKey,
        {
          algorithms: ['RS256'],
          issuer: validIssuers.length > 0 ? (validIssuers as [string, ...string[]]) : undefined,
        },
        (err: jwt.VerifyErrors | null, decoded: unknown) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(decoded as FusionAuthJwtPayload);
        }
      );
    });
  }

  /**
   * Generate list of valid issuer formats to handle FusionAuth configuration variations
   * Handles cases like: http://localhost:9011, localhost:9011, localhost9011
   */
  private getValidIssuers(): string[] {
    const issuers: string[] = [];

    if (this.baseUrl) {
      // Add the configured URL as-is
      issuers.push(this.baseUrl);

      // Extract host:port without protocol (e.g., "localhost:9011")
      try {
        const url = new URL(this.baseUrl);
        const hostPort = url.host; // "localhost:9011"
        issuers.push(hostPort);

        // Also try without port if it's default
        if (url.hostname !== hostPort) {
          issuers.push(url.hostname);
        }

        // Handle FusionAuth default format without colon (e.g., "localhost9011")
        // This is how FusionAuth sometimes sets the issuer by default
        if (url.port) {
          issuers.push(`${url.hostname}${url.port}`);
        }
      } catch {
        // If URL parsing fails, try simple string manipulation
        const withoutProtocol = this.baseUrl.replace(/^https?:\/\//, '');
        issuers.push(withoutProtocol);
        // Also without colon
        issuers.push(withoutProtocol.replace(':', ''));
      }
    }

    console.log('[FusionAuthGuard] Valid issuers:', issuers);
    return issuers;
  }
}
