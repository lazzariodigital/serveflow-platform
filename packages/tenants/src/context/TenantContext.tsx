'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { TenantMVP, TenantBranding, TenantTheming, TenantSettings, TenantAuthProviders } from '@serveflow/core';

// ════════════════════════════════════════════════════════════════
// Tenant Context Types
// ════════════════════════════════════════════════════════════════

export interface TenantContextValue {
  tenant: TenantMVP | null;
  isLoading: boolean;
  error: string | null;
  // Convenience accessors
  slug: string | null;
  branding: TenantBranding | null;
  theming: TenantTheming | null;
  settings: TenantSettings | null;
  authProviders: TenantAuthProviders | null;
}

// ════════════════════════════════════════════════════════════════
// Context Creation
// ════════════════════════════════════════════════════════════════

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

// ════════════════════════════════════════════════════════════════
// Provider Props
// ════════════════════════════════════════════════════════════════

export interface TenantProviderProps {
  children: ReactNode;
  tenant: TenantMVP | null;
  isLoading?: boolean;
  error?: string | null;
}

// ════════════════════════════════════════════════════════════════
// Tenant Provider
// ════════════════════════════════════════════════════════════════

/**
 * Provider component that makes tenant data available to the component tree.
 *
 * Usage in Next.js layout:
 * ```tsx
 * // app/layout.tsx
 * export default async function RootLayout({ children }) {
 *   const tenant = await getTenantFromHeaders();
 *   return (
 *     <TenantProvider tenant={tenant}>
 *       {children}
 *     </TenantProvider>
 *   );
 * }
 * ```
 */
export function TenantProvider({
  children,
  tenant,
  isLoading = false,
  error = null,
}: TenantProviderProps) {
  const value = useMemo<TenantContextValue>(
    () => ({
      tenant,
      isLoading,
      error,
      slug: tenant?.slug ?? null,
      branding: tenant?.branding ?? null,
      theming: tenant?.theming ?? null,
      settings: tenant?.settings ?? null,
      authProviders: tenant?.authProviders ?? null,
    }),
    [tenant, isLoading, error]
  );

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

// ════════════════════════════════════════════════════════════════
// Context Hook
// ════════════════════════════════════════════════════════════════

/**
 * Hook to access tenant context. Throws if used outside TenantProvider.
 */
export function useTenantContext(): TenantContextValue {
  const context = useContext(TenantContext);

  if (context === undefined) {
    throw new Error('useTenantContext must be used within a TenantProvider');
  }

  return context;
}

// ════════════════════════════════════════════════════════════════
// Export Context for advanced use cases
// ════════════════════════════════════════════════════════════════

export { TenantContext };
