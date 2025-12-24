import './../global.css';

import type { ThemePreset } from '@serveflow/ui';
import { SettingsProvider, ThemeProvider, defaultSettings } from '@serveflow/ui';
import { getTenantFromHeaders, getTenantMetadata } from '../lib/get-tenant';

import { TenantProvider, TenantNotFound } from '@serveflow/tenants/react';

// Force dynamic rendering - layout requires runtime database access
export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return getTenantMetadata();
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { tenant, error, attemptedSlug } = await getTenantFromHeaders();

  // ════════════════════════════════════════════════════════════════
  // Tenant Not Found - Show error page
  // ════════════════════════════════════════════════════════════════
  if (!tenant && error) {
    return (
      <html lang="es" suppressHydrationWarning>
        <body>
          <TenantNotFound slug={attemptedSlug} error={error} />
        </body>
      </html>
    );
  }

  const themeMode = tenant?.theming?.mode || 'light';
  // Cast preset to ThemePreset (core uses preset1-5, ui uses named presets)
  const themePreset = (tenant?.theming?.preset || 'default') as ThemePreset;

  // FusionAuth is self-hosted - no client-side provider needed
  // Authentication is handled via cookies (fa_access_token) and server-side validation

  return (
    <html
      lang={tenant?.settings.locale?.split('-')[0] || 'es'}
      data-color-scheme={themeMode}
      suppressHydrationWarning
    >
      <body>
        <TenantProvider tenant={tenant} error={error}>
          <ThemeProvider
            settings={{
              mode: themeMode,
              direction: tenant?.theming?.direction || 'ltr',
              preset: themePreset,
              tenant: tenant?.theming,
            }}
          >
            <SettingsProvider defaultSettings={{ ...defaultSettings, mode: themeMode }}>
              {children}
            </SettingsProvider>
          </ThemeProvider>
        </TenantProvider>
      </body>
    </html>
  );
}
