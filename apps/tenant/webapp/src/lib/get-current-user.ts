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
 */
function decodeJwtPayload(token: string): {
  sub?: string;
  email?: string;
  tid?: string;
  aud?: string;
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
 */
export async function getCurrentUser(tenant: TenantMVP | null): Promise<GetCurrentUserResult> {
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
    const tenantId = tokenPayload.tid;

    // Verify membership
    if (tenantId !== tenant.fusionauthTenantId) {
      return {
        user: null,
        error: {
          type: 'FORBIDDEN',
          message: 'No eres miembro de esta organizacion. Contacta al administrador para obtener acceso.',
        },
      };
    }

    const response = await fetch(`${TENANT_API_URL}/api/users/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'x-tenant-slug': tenant.slug,
      },
      cache: 'no-store',
    });

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
        return {
          user: null,
          error: {
            type: 'USER_NOT_FOUND',
            message: 'Usuario no registrado en el sistema. Contacta al administrador.',
          },
        };
      }

      return {
        user: null,
        error: {
          type: 'INTERNAL',
          message: 'Error al obtener datos del usuario',
        },
      };
    }

    const data = await response.json();

    if (!data.success || !data.data) {
      return {
        user: null,
        error: {
          type: 'USER_NOT_FOUND',
          message: 'Usuario no registrado en el sistema. Contacta al administrador.',
        },
      };
    }

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
