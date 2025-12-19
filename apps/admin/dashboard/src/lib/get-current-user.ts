import type { GlobalUser } from '@serveflow/core';

import { cookies } from 'next/headers';

// ----------------------------------------------------------------------

export type GetCurrentUserError = {
  type: 'UNAUTHORIZED' | 'FORBIDDEN' | 'USER_NOT_FOUND' | 'INTERNAL';
  message: string;
};

export interface GetCurrentUserResult {
  user: GlobalUser | null;
  error: GetCurrentUserError | null;
}

// ----------------------------------------------------------------------

const ADMIN_API_URL = process.env.ADMIN_API_URL || 'http://localhost:4001';

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
 * Server-side function to get the current authenticated admin user.
 * Unlike tenant dashboard, this does NOT require tenant context.
 */
export async function getCurrentUser(): Promise<GetCurrentUserResult> {
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

    // Verify the token is for the admin tenant
    const adminTenantId = process.env.FUSIONAUTH_ADMIN_TENANT_ID;
    if (adminTenantId && tokenPayload.tid !== adminTenantId) {
      return {
        user: null,
        error: {
          type: 'FORBIDDEN',
          message: 'Not authorized to access admin panel',
        },
      };
    }

    const response = await fetch(`${ADMIN_API_URL}/api/users/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
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
            message: 'Admin user not found',
          },
        };
      }

      return {
        user: null,
        error: {
          type: 'INTERNAL',
          message: 'Error fetching user data',
        },
      };
    }

    const data = await response.json();

    if (!data.success || !data.data) {
      return {
        user: null,
        error: {
          type: 'USER_NOT_FOUND',
          message: 'Admin user not found',
        },
      };
    }

    return {
      user: data.data as GlobalUser,
      error: null,
    };
  } catch (error) {
    console.error('[getCurrentUser] Error:', error);
    return {
      user: null,
      error: {
        type: 'INTERNAL',
        message: 'Internal server error',
      },
    };
  }
}
