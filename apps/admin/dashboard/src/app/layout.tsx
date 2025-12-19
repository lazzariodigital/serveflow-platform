import './../global.css';

import type { ThemePreset } from '@serveflow/ui';
import { SettingsProvider, ThemeProvider, defaultSettings } from '@serveflow/ui';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Serveflow Admin',
  description: 'Admin panel for Serveflow platform',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Admin dashboard uses fixed theme settings (no tenant customization)
  const themeMode = 'light';
  const themePreset: ThemePreset = 'default';

  return (
    <html lang="es" data-color-scheme={themeMode} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider
          settings={{
            mode: themeMode,
            direction: 'ltr',
            preset: themePreset,
          }}
        >
          <SettingsProvider defaultSettings={{ ...defaultSettings, mode: themeMode }}>
            {children}
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
