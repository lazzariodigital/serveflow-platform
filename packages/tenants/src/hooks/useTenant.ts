'use client';

import { useTenantContext } from '../context/TenantContext';
import type { TenantMVP, TenantBranding, TenantTheming, TenantSettings } from '@serveflow/core';

// ════════════════════════════════════════════════════════════════
// useTenant Hook
// ════════════════════════════════════════════════════════════════

/**
 * Primary hook to access the current tenant.
 *
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const { tenant, isLoading } = useTenant();
 *
 *   if (isLoading) return <Loading />;
 *   if (!tenant) return <NotFound />;
 *
 *   return <h1>{tenant.name}</h1>;
 * }
 * ```
 */
export function useTenant(): {
  tenant: TenantMVP | null;
  isLoading: boolean;
  error: string | null;
} {
  const { tenant, isLoading, error } = useTenantContext();
  return { tenant, isLoading, error };
}

// ════════════════════════════════════════════════════════════════
// useTenantBranding Hook
// ════════════════════════════════════════════════════════════════

/**
 * Hook to access tenant branding (logo, favicon, appName).
 *
 * Usage:
 * ```tsx
 * function Logo() {
 *   const branding = useTenantBranding();
 *   return <img src={branding?.logo.url} alt="Logo" />;
 * }
 * ```
 */
export function useTenantBranding(): TenantBranding | null {
  const { branding } = useTenantContext();
  return branding;
}

// ════════════════════════════════════════════════════════════════
// useTenantTheming Hook
// ════════════════════════════════════════════════════════════════

/**
 * Hook to access tenant theming (mode, palette, typography).
 *
 * Usage:
 * ```tsx
 * function ThemeWrapper({ children }) {
 *   const theming = useTenantTheming();
 *   const mode = theming?.mode ?? 'light';
 *   return <ThemeProvider mode={mode}>{children}</ThemeProvider>;
 * }
 * ```
 */
export function useTenantTheming(): TenantTheming | null {
  const { theming } = useTenantContext();
  return theming;
}

// ════════════════════════════════════════════════════════════════
// useTenantSettings Hook
// ════════════════════════════════════════════════════════════════

/**
 * Hook to access tenant settings (locale, timezone, currency).
 *
 * Usage:
 * ```tsx
 * function PriceDisplay({ amount }) {
 *   const settings = useTenantSettings();
 *   const formatted = new Intl.NumberFormat(settings?.locale, {
 *     style: 'currency',
 *     currency: settings?.currency,
 *   }).format(amount);
 *   return <span>{formatted}</span>;
 * }
 * ```
 */
export function useTenantSettings(): TenantSettings | null {
  const { settings } = useTenantContext();
  return settings;
}

// ════════════════════════════════════════════════════════════════
// useTenantSlug Hook
// ════════════════════════════════════════════════════════════════

/**
 * Hook to get just the tenant slug.
 *
 * Usage:
 * ```tsx
 * function ApiClient() {
 *   const slug = useTenantSlug();
 *   // Use slug to build API URLs or for logging
 * }
 * ```
 */
export function useTenantSlug(): string | null {
  const { slug } = useTenantContext();
  return slug;
}
