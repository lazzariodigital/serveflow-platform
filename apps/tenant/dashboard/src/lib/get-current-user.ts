import type { TenantMVP, User } from '@serveflow/core';

import { cookies } from 'next/headers';

// ----------------------------------------------------------------------

export type GetCurrentUserError = {
  type: 'UNAUTHORIZED' | 'FORBIDDEN' | 'USER_NOT_FOUND' | 'INTERNAL';
  message: string;
};

export interface GetCurrentUserResult {
  user: User | null;
  error: GetCurrentUserError | null;
}

// ----------------------------------------------------------------------

const TENANT_API_URL = process.env.TENANT_API_URL || 'http://localhost:3001';

/**
 * Extracts FusionAuth user info from JWT token
 * FusionAuth claims: sub (userId), aud (applicationId), tid (tenantId), roles
 */
function decodeJwtPayload(token: string): {
  sub?: string;
  email?: string;
  tid?: string;        // FusionAuth tenant ID
  aud?: string;        // Application ID
  roles?: string[];
} | null {
  try {
    const base64Payload = token.split('.')[1];
    if (!base64Payload) return null;

    return JSON.parse(Buffer.from(base64Payload, 'base64').toString());
  } catch {
    return null;
  }
}

/**
 * Server-side function to get the current authenticated user.
 *
 * This function:
 * 1. Gets the FusionAuth access token from cookies
 * 2. Verifies the user's tenantId matches the tenant's fusionauthTenantId (membership verification)
 * 3. Calls the tenant-server API to get the User from MongoDB
 *
 * @param tenant - The resolved tenant from headers
 * @returns The current user or an error
 */
export async function getCurrentUser(tenant: TenantMVP | null): Promise<GetCurrentUserResult> {
  // 1. Check if tenant is valid
  if (!tenant) {
    return {
      user: null,
      error: {
        type: 'INTERNAL',
        message: 'Tenant not found',
      },
    };
  }

  try {
    // 2. Get the FusionAuth access token from cookies
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('fa_access_token')?.value;

    if (!accessToken) {
      return {
        user: null,
        error: {
          type: 'UNAUTHORIZED',
          message: 'Not authenticated',
        },
      };
    }

    // 3. Decode the token to get user info
    const tokenPayload = decodeJwtPayload(accessToken);

    if (!tokenPayload?.sub) {
      return {
        user: null,
        error: {
          type: 'UNAUTHORIZED',
          message: 'Invalid token',
        },
      };
    }

    const userId = tokenPayload.sub;
    const tenantId = tokenPayload.tid; // FusionAuth uses 'tid' for tenant ID

    // 4. Verify membership: tenantId from JWT must match tenant's fusionauthTenantId
    if (tenantId !== tenant.fusionauthTenantId) {
      console.warn(
        `[getCurrentUser] Membership verification failed. ` +
        `User tenantId: ${tenantId}, Tenant fusionauthTenantId: ${tenant.fusionauthTenantId}`
      );
      return {
        user: null,
        error: {
          type: 'FORBIDDEN',
          message: 'No eres miembro de esta organización. Contacta al administrador para obtener acceso.',
        },
      };
    }

    // 5. Call tenant-server API to get current user
    console.log(`[getCurrentUser] Calling API: ${TENANT_API_URL}/api/users/me`);
    console.log(`[getCurrentUser] fusionauthUserId: ${userId}, tenantId: ${tenantId}, tenant.slug: ${tenant.slug}`);

    const response = await fetch(`${TENANT_API_URL}/api/users/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'x-tenant-slug': tenant.slug,
      },
      cache: 'no-store', // Don't cache user data
    });

    console.log(`[getCurrentUser] Response status: ${response.status}`);

    if (!response.ok) {
      if (response.status === 401) {
        return {
          user: null,
          error: {
            type: 'UNAUTHORIZED',
            message: 'Authentication failed',
          },
        };
      }

      if (response.status === 404) {
        console.warn(
          `[getCurrentUser] User not found in MongoDB. ` +
          `fusionauthUserId: ${userId}, tenant: ${tenant.slug}`
        );
        return {
          user: null,
          error: {
            type: 'USER_NOT_FOUND',
            message: 'Usuario no registrado en el sistema. Contacta al administrador.',
          },
        };
      }

      console.error(`[getCurrentUser] API error: ${response.status} ${response.statusText}`);
      return {
        user: null,
        error: {
          type: 'INTERNAL',
          message: 'Error al obtener datos del usuario',
        },
      };
    }

    const data = await response.json();
    console.log(`[getCurrentUser] Response data:`, JSON.stringify(data, null, 2));

    if (!data.success || !data.data) {
      console.warn(`[getCurrentUser] User not found. success: ${data.success}, data: ${data.data}`);
      return {
        user: null,
        error: {
          type: 'USER_NOT_FOUND',
          message: 'Usuario no registrado en el sistema. Contacta al administrador.',
        },
      };
    }

    // 6. Return the user
    return {
      user: data.data as User,
      error: null,
    };
  } catch (error) {
    console.error('[getCurrentUser] Error:', error);
    return {
      user: null,
      error: {
        type: 'INTERNAL',
        message: 'Error interno del servidor',
      },
    };
  }
}
