'use client';

import { useState, useCallback } from 'react';
import { useTenant } from '@serveflow/tenants/react';

// ════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════

export interface FusionAuthResponse {
  token: string;
  refreshToken?: string;
  tokenExpirationInstant?: number;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    verified: boolean;
    active: boolean;
  };
  twoFactorId?: string;
  methods?: Array<{ method: string }>;
}

export interface FusionAuthError {
  fieldErrors?: Record<string, Array<{ code: string; message: string }>>;
  generalErrors?: Array<{ code: string; message: string }>;
}

export interface LoginCredentials {
  email: string;
  password: string;
  applicationId?: string;
}

export interface SignUpData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  applicationId?: string;
  roles?: string[];
}

export interface TwoFactorData {
  twoFactorId: string;
  code: string;
}

// ════════════════════════════════════════════════════════════════
// Cookie utilities
// ════════════════════════════════════════════════════════════════

/**
 * Get cookie domain for subdomain support
 * For development: subdomain.localhost -> localhost (no leading dot for localhost)
 * For production: subdomain.example.com -> .example.com
 */
function getCookieDomain(): string {
  const hostname = window.location.hostname;

  // For localhost subdomains (e.g., matching-academy.localhost)
  // Set domain to 'localhost' to share cookies across subdomains
  if (hostname.endsWith('.localhost') || hostname === 'localhost') {
    return 'localhost';
  }

  // For production (e.g., demo.serveflow.app -> .serveflow.app)
  const parts = hostname.split('.');
  if (parts.length >= 2) {
    return '.' + parts.slice(-2).join('.');
  }

  return hostname;
}

function setCookie(name: string, value: string, expiresAt?: number) {
  const expires = expiresAt
    ? new Date(expiresAt).toUTCString()
    : new Date(Date.now() + 60 * 60 * 1000).toUTCString(); // 1 hour default
  const domain = getCookieDomain();

  // For localhost, don't set domain attribute (browsers handle it correctly)
  const domainAttr = domain === 'localhost' ? '' : `domain=${domain};`;

  document.cookie = `${name}=${value}; path=/; ${domainAttr}expires=${expires}; SameSite=Lax`;

  console.log(`[FusionAuth] Cookie set: ${name}, domain: ${domain || 'default'}`);
}

function deleteCookie(name: string) {
  const domain = getCookieDomain();
  const domainAttr = domain === 'localhost' ? '' : `domain=${domain};`;

  document.cookie = `${name}=; path=/; ${domainAttr}expires=Thu, 01 Jan 1970 00:00:00 GMT`;

  // Also try to delete without domain for cleanup
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

/**
 * Clear all legacy auth cookies (Clerk, Frontegg, etc.)
 * Call this on logout to clean up old cookies
 */
function clearLegacyAuthCookies() {
  // Common Clerk cookie names
  const clerkCookies = [
    '__clerk_db_jwt',
    '__session',
    '__client_uat',
    '__client',
  ];

  // Common Frontegg cookie names
  const fronteggCookies = [
    'fe_access_token',
    'fe_refresh_token',
    'frontegg-access-token',
    'frontegg-refresh-token',
  ];

  const allLegacyCookies = [...clerkCookies, ...fronteggCookies];

  allLegacyCookies.forEach((name) => {
    // Delete with various domain combinations
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    document.cookie = `${name}=; path=/; domain=localhost; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    document.cookie = `${name}=; path=/; domain=.localhost; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  });

  console.log('[FusionAuth] Cleared legacy auth cookies');
}

// ════════════════════════════════════════════════════════════════
// Hook
// ════════════════════════════════════════════════════════════════

export function useFusionAuth() {
  const { tenant } = useTenant();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the FusionAuth base URL
  const getBaseUrl = useCallback(() => {
    return process.env.NEXT_PUBLIC_FUSIONAUTH_URL || 'http://localhost:9011';
  }, []);

  // Get the application ID for this tenant
  const getApplicationId = useCallback(() => {
    return tenant?.fusionauthApplicationId || process.env.NEXT_PUBLIC_FUSIONAUTH_APPLICATION_ID || '';
  }, [tenant]);

  /**
   * Parse FusionAuth error response
   */
  const parseError = (data: FusionAuthError): string => {
    if (data.generalErrors?.length) {
      return data.generalErrors[0].message;
    }
    if (data.fieldErrors) {
      const firstField = Object.keys(data.fieldErrors)[0];
      if (firstField && data.fieldErrors[firstField]?.length) {
        return data.fieldErrors[firstField][0].message;
      }
    }
    return 'Ha ocurrido un error';
  };

  /**
   * Login with email and password
   * POST /api/login - Direct to FusionAuth
   */
  const login = useCallback(async (credentials: LoginCredentials): Promise<FusionAuthResponse> => {
    const baseUrl = getBaseUrl();
    setIsLoading(true);
    setError(null);

    try {
      const applicationId = credentials.applicationId || getApplicationId();

      const response = await fetch(`${baseUrl}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          loginId: credentials.email,
          password: credentials.password,
          applicationId,
        }),
      });

      // Handle empty response body (e.g., 401 returns empty)
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};

      // 202 = Two-factor required
      if (response.status === 202) {
        return {
          token: '',
          twoFactorId: data.twoFactorId,
          methods: data.methods,
        };
      }

      if (!response.ok) {
        // 401 = Invalid credentials, 404 = User not found
        let errorMessage = 'Error al iniciar sesión';
        if (response.status === 401 || response.status === 404) {
          errorMessage = 'Email o contraseña incorrectos';
        } else if (data && Object.keys(data).length > 0) {
          errorMessage = parseError(data) || errorMessage;
        }
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      // Set token cookie
      setCookie('fa_access_token', data.token, data.tokenExpirationInstant);
      if (data.refreshToken) {
        // Refresh token expires in 30 days
        setCookie('fa_refresh_token', data.refreshToken, Date.now() + 30 * 24 * 60 * 60 * 1000);
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al iniciar sesión';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getBaseUrl, getApplicationId]);

  /**
   * Complete two-factor authentication
   * POST /api/two-factor/login - Direct to FusionAuth
   */
  const verifyTwoFactor = useCallback(async (data: TwoFactorData): Promise<FusionAuthResponse> => {
    const baseUrl = getBaseUrl();
    setIsLoading(true);
    setError(null);

    try {
      const applicationId = getApplicationId();

      const response = await fetch(`${baseUrl}/api/two-factor/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          twoFactorId: data.twoFactorId,
          code: data.code,
          applicationId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = parseError(result) || 'Código inválido';
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      // Set tokens after successful 2FA
      setCookie('fa_access_token', result.token, result.tokenExpirationInstant);
      if (result.refreshToken) {
        setCookie('fa_refresh_token', result.refreshToken, Date.now() + 30 * 24 * 60 * 60 * 1000);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al verificar código';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getBaseUrl, getApplicationId]);

  /**
   * Register a new user
   * POST /api/user/registration - Direct to FusionAuth
   */
  const signUp = useCallback(async (data: SignUpData): Promise<FusionAuthResponse> => {
    const baseUrl = getBaseUrl();
    setIsLoading(true);
    setError(null);

    try {
      const applicationId = data.applicationId || getApplicationId();

      const response = await fetch(`${baseUrl}/api/user/registration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: {
            email: data.email,
            password: data.password,
            firstName: data.firstName,
            lastName: data.lastName,
          },
          registration: {
            applicationId,
            roles: data.roles || [],
          },
          sendSetPasswordEmail: false,
          skipVerification: false,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = parseError(result) || 'Error al crear cuenta';
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      // If registration returns a token (auto-login)
      if (result.token) {
        setCookie('fa_access_token', result.token, result.tokenExpirationInstant);
        if (result.refreshToken) {
          setCookie('fa_refresh_token', result.refreshToken, Date.now() + 30 * 24 * 60 * 60 * 1000);
        }
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al crear cuenta';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getBaseUrl, getApplicationId]);

  /**
   * Logout - clear cookies
   * POST /api/logout - Direct to FusionAuth
   */
  const logout = useCallback(async () => {
    const baseUrl = getBaseUrl();

    // Try to call logout endpoint
    try {
      await fetch(`${baseUrl}/api/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch {
      // Ignore errors, we'll clear cookies anyway
    }

    // Clear FusionAuth cookies
    deleteCookie('fa_access_token');
    deleteCookie('fa_refresh_token');

    // Clear legacy auth cookies (Clerk, Frontegg)
    clearLegacyAuthCookies();
  }, [getBaseUrl]);

  /**
   * Initiate Google OAuth login
   * Redirects to FusionAuth's OAuth authorize endpoint
   */
  const loginWithGoogle = useCallback(() => {
    const baseUrl = getBaseUrl();
    if (!baseUrl) {
      setError('FusionAuth URL not configured');
      return;
    }

    const clientId = getApplicationId();
    const redirectUri = encodeURIComponent(`${window.location.origin}/oauth/callback`);
    const state = encodeURIComponent(window.location.pathname);

    // Redirect to FusionAuth's OAuth endpoint with Google IdP hint
    window.location.href = `${baseUrl}/oauth2/authorize?` +
      `client_id=${clientId}&` +
      `redirect_uri=${redirectUri}&` +
      `response_type=code&` +
      `scope=openid email profile&` +
      `state=${state}&` +
      `idp_hint=google`;
  }, [getBaseUrl, getApplicationId]);

  /**
   * Request password reset email
   * POST /api/user/forgot-password - Direct to FusionAuth
   */
  const forgotPassword = useCallback(async (email: string): Promise<void> => {
    const baseUrl = getBaseUrl();
    setIsLoading(true);
    setError(null);

    try {
      const applicationId = getApplicationId();

      const response = await fetch(`${baseUrl}/api/user/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          loginId: email,
          applicationId,
          sendForgotPasswordEmail: true,
        }),
      });

      if (!response.ok && response.status !== 404) {
        // 404 means user not found, but we don't want to reveal that
        const result = await response.json();
        const errorMessage = parseError(result) || 'Error al enviar email';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err) {
      // Don't throw for "user not found" - security best practice
      if (err instanceof Error && !err.message.includes('not found')) {
        const errorMessage = err.message || 'Error al enviar email';
        setError(errorMessage);
        throw err;
      }
    } finally {
      setIsLoading(false);
    }
  }, [getBaseUrl, getApplicationId]);

  /**
   * Reset password with token
   * POST /api/user/change-password - Direct to FusionAuth
   */
  const resetPassword = useCallback(async (data: { changePasswordId: string; password: string }): Promise<void> => {
    const baseUrl = getBaseUrl();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${baseUrl}/api/user/change-password/${data.changePasswordId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: data.password,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        const errorMessage = parseError(result) || 'Error al cambiar contraseña';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cambiar contraseña';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getBaseUrl]);

  /**
   * Verify email with token
   * POST /api/user/verify-email - Direct to FusionAuth
   */
  const verifyEmail = useCallback(async (verificationId: string): Promise<void> => {
    const baseUrl = getBaseUrl();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${baseUrl}/api/user/verify-email/${verificationId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const result = await response.json();
        const errorMessage = parseError(result) || 'Error al verificar email';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al verificar email';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getBaseUrl]);

  /**
   * Resend verification email
   * PUT /api/user/verify-email - Direct to FusionAuth
   */
  const resendVerificationEmail = useCallback(async (email: string): Promise<void> => {
    const baseUrl = getBaseUrl();
    setIsLoading(true);
    setError(null);

    try {
      const applicationId = getApplicationId();

      const response = await fetch(`${baseUrl}/api/user/verify-email?email=${encodeURIComponent(email)}&applicationId=${applicationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const result = await response.json();
        const errorMessage = parseError(result) || 'Error al reenviar email';
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
  }, [getBaseUrl, getApplicationId]);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    login,
    signUp,
    verifyTwoFactor,
    logout,
    loginWithGoogle,
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerificationEmail,
    isLoading,
    error,
    clearError,
  };
}
