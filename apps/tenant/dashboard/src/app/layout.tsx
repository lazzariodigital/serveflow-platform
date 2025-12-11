import './../global.css';

import { SettingsProvider, ThemeProvider, defaultSettings } from '@serveflow/ui';
import { getTenantFromHeaders, getTenantMetadata } from '../lib/get-tenant';

import { FronteggAppProvider } from '@frontegg/nextjs/app';
import { TenantProvider } from '@serveflow/tenants/react';

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
  const { tenant, error } = await getTenantFromHeaders();
  const themeMode = tenant?.theming?.mode || 'light';

  // Get Frontegg configuration from tenant
  // Each tenant has its own Frontegg environment
  const fronteggBaseUrl = tenant?.fronteggConfig?.baseUrl || process.env.FRONTEGG_BASE_URL || '';
  const fronteggClientId = tenant?.fronteggConfig?.clientId || process.env.FRONTEGG_CLIENT_ID || '';

  console.log('Frontegg Base URL:', fronteggBaseUrl);
  console.log('Frontegg Client ID:', fronteggClientId);

  return (
    <html
      lang={tenant?.settings.locale?.split('-')[0] || 'es'}
      data-color-scheme={themeMode}
      suppressHydrationWarning
    >
      <body>
        <FronteggAppProvider
          hostedLoginBox={false}
          customLoader={<div>Loading...</div>}
          authOptions={{
            baseUrl: fronteggBaseUrl,
            clientId: fronteggClientId,
            keepSessionAlive: true,
          }}
        >
          <TenantProvider tenant={tenant} error={error}>
            <ThemeProvider
              settings={{
                mode: themeMode,
                direction: tenant?.theming?.direction || 'ltr',
                preset: tenant?.theming?.preset || 'default',
                tenant: tenant?.theming,
              }}
            >
              <SettingsProvider defaultSettings={{ ...defaultSettings, mode: themeMode }}>
                {children}
              </SettingsProvider>
            </ThemeProvider>
          </TenantProvider>
        </FronteggAppProvider>
      </body>
    </html>
  );
}
