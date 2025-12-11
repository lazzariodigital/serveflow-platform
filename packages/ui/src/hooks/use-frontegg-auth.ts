'use client';

import { useState, useCallback } from 'react';
import { useTenant } from '@serveflow/tenants/react';

// ════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════

export interface FronteggAuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expires: string;
  userId: string;
  userEmail: string;
  mfaRequired?: boolean;
  mfaToken?: string;
  mfaEnrolled?: boolean;
  emailVerified?: boolean;
}

export interface FronteggError {
  errors?: string[];
  message?: string;
  statusCode?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignUpData {
  email: string;
  password: string;
  name?: string;
  metadata?: Record<string, unknown>;
}

export interface MfaVerifyData {
  mfaToken: string;
  code: string;
}

// ════════════════════════════════════════════════════════════════
// Cookie utilities
// ════════════════════════════════════════════════════════════════

function setCookie(name: string, value: string, expiresIn: number) {
  const expires = new Date(Date.now() + expiresIn * 1000).toUTCString();
  document.cookie = `${name}=${value}; path=/; expires=${expires}; SameSite=Lax`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

// ════════════════════════════════════════════════════════════════
// Hook
// ════════════════════════════════════════════════════════════════

export function useFronteggAuth() {
  const { tenant } = useTenant();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the Frontegg base URL from tenant config or env
  const getBaseUrl = useCallback(() => {
    if (tenant?.fronteggConfig?.baseUrl) {
      return tenant.fronteggConfig.baseUrl;
    }
    // Fallback to environment variable
    return process.env.NEXT_PUBLIC_FRONTEGG_BASE_URL || '';
  }, [tenant]);

  // Get the vendor host (domain without protocol)
  const getVendorHost = useCallback(() => {
    const baseUrl = getBaseUrl();
    try {
      const url = new URL(baseUrl);
      return url.host; // e.g., "app-ohuzygg5u79z.frontegg.com"
    } catch {
      return baseUrl.replace(/^https?:\/\//, '');
    }
  }, [getBaseUrl]);

  /**
   * Login with email and password
   * POST /identity/resources/auth/v1/user
   */
  const login = useCallback(async (credentials: LoginCredentials): Promise<FronteggAuthResponse> => {
    const baseUrl = getBaseUrl();
    if (!baseUrl) {
      throw new Error('Frontegg base URL not configured');
    }

    setIsLoading(true);
    setError(null);

    try {
      const vendorHost = getVendorHost();
      const response = await fetch(`${baseUrl}/identity/resources/auth/v1/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'frontegg-vendor-host': vendorHost,
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
        }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.errors?.[0] || data.message || 'Error al iniciar sesión';
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      // If MFA is not required, set the tokens as cookies
      if (!data.mfaRequired) {
        setCookie('fe_access_token', data.accessToken, data.expiresIn);
        setCookie('fe_refresh_token', data.refreshToken, 60 * 60 * 24 * 30); // 30 days
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al iniciar sesión';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getBaseUrl, getVendorHost]);

  /**
   * Verify MFA code
   * POST /identity/resources/auth/v1/user/mfa/verify
   */
  const verifyMfa = useCallback(async (data: MfaVerifyData): Promise<FronteggAuthResponse> => {
    const baseUrl = getBaseUrl();
    if (!baseUrl) {
      throw new Error('Frontegg base URL not configured');
    }

    setIsLoading(true);
    setError(null);

    try {
      const vendorHost = getVendorHost();
      const response = await fetch(`${baseUrl}/identity/resources/auth/v1/user/mfa/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'frontegg-vendor-host': vendorHost,
        },
        body: JSON.stringify({
          mfaToken: data.mfaToken,
          value: data.code,
        }),
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result.errors?.[0] || result.message || 'Código inválido';
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      // Set tokens after successful MFA
      setCookie('fe_access_token', result.accessToken, result.expiresIn);
      setCookie('fe_refresh_token', result.refreshToken, 60 * 60 * 24 * 30);

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al verificar código';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getBaseUrl, getVendorHost]);

  /**
   * Sign up a new user
   * POST /identity/resources/users/v1/signUp
   */
  const signUp = useCallback(async (data: SignUpData): Promise<FronteggAuthResponse> => {
    const baseUrl = getBaseUrl();
    if (!baseUrl) {
      throw new Error('Frontegg base URL not configured');
    }

    setIsLoading(true);
    setError(null);

    try {
      const vendorHost = getVendorHost();
      const response = await fetch(`${baseUrl}/identity/resources/users/v1/signUp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'frontegg-vendor-host': vendorHost,
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          name: data.name,
          metadata: JSON.stringify(data.metadata || {}),
        }),
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result.errors?.[0] || result.message || 'Error al crear cuenta';
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      // If signup returns tokens (auto-login after signup)
      if (result.accessToken) {
        setCookie('fe_access_token', result.accessToken, result.expiresIn);
        setCookie('fe_refresh_token', result.refreshToken, 60 * 60 * 24 * 30);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al crear cuenta';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getBaseUrl, getVendorHost]);

  /**
   * Logout - clear cookies and redirect
   */
  const logout = useCallback(async () => {
    const baseUrl = getBaseUrl();
    const vendorHost = getVendorHost();

    // Try to call logout endpoint
    if (baseUrl) {
      try {
        await fetch(`${baseUrl}/identity/resources/auth/v1/user/logout`, {
          method: 'POST',
          headers: {
            'frontegg-vendor-host': vendorHost,
          },
          credentials: 'include',
        });
      } catch {
        // Ignore errors, we'll clear cookies anyway
      }
    }

    // Clear cookies
    deleteCookie('fe_access_token');
    deleteCookie('fe_refresh_token');
  }, [getBaseUrl, getVendorHost]);

  /**
   * Initiate social login (Google)
   * Redirects to Frontegg's OAuth flow
   */
  const loginWithGoogle = useCallback(() => {
    const baseUrl = getBaseUrl();
    if (!baseUrl) {
      setError('Frontegg base URL not configured');
      return;
    }

    const clientId = tenant?.fronteggConfig?.clientId || process.env.NEXT_PUBLIC_FRONTEGG_CLIENT_ID;
    const redirectUri = encodeURIComponent(`${window.location.origin}/oauth/callback`);

    // Redirect to Frontegg's Google OAuth
    window.location.href = `${baseUrl}/oauth/authorize?` +
      `response_type=code&` +
      `client_id=${clientId}&` +
      `redirect_uri=${redirectUri}&` +
      `scope=openid email profile&` +
      `connection=google-oauth2`;
  }, [getBaseUrl, tenant]);

  /**
   * Activate account with token
   * POST /identity/resources/users/v1/activate
   */
  const activateAccount = useCallback(async (data: { token: string; userId: string }): Promise<FronteggAuthResponse> => {
    const baseUrl = getBaseUrl();
    if (!baseUrl) {
      throw new Error('Frontegg base URL not configured');
    }

    setIsLoading(true);
    setError(null);

    try {
      const vendorHost = getVendorHost();
      const response = await fetch(`${baseUrl}/identity/resources/users/v1/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'frontegg-vendor-host': vendorHost,
        },
        body: JSON.stringify({
          token: data.token,
          userId: data.userId,
        }),
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result.errors?.[0] || result.message || 'Error al activar cuenta';
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      // If activation returns tokens
      if (result.accessToken) {
        setCookie('fe_access_token', result.accessToken, result.expiresIn);
        setCookie('fe_refresh_token', result.refreshToken, 60 * 60 * 24 * 30);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al activar cuenta';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getBaseUrl, getVendorHost]);

  /**
   * Resend activation email
   * POST /identity/resources/users/v1/activate/resend
   */
  const resendActivationEmail = useCallback(async (email: string): Promise<void> => {
    const baseUrl = getBaseUrl();
    if (!baseUrl) {
      throw new Error('Frontegg base URL not configured');
    }

    setIsLoading(true);
    setError(null);

    try {
      const vendorHost = getVendorHost();
      const response = await fetch(`${baseUrl}/identity/resources/users/v1/activate/resend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'frontegg-vendor-host': vendorHost,
        },
        body: JSON.stringify({ email }),
        credentials: 'include',
      });

      if (!response.ok) {
        const result = await response.json();
        const errorMessage = result.errors?.[0] || result.message || 'Error al reenviar email';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al reenviar email';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getBaseUrl, getVendorHost]);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    login,
    signUp,
    verifyMfa,
    logout,
    loginWithGoogle,
    activateAccount,
    resendActivationEmail,
    isLoading,
    error,
    clearError,
  };
}
