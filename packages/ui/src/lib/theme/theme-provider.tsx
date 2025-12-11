'use client';

import type {} from './extend-theme-types';

import type { Theme, ThemeProviderProps as MuiThemeProviderProps } from '@mui/material/styles';

import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider as ThemeVarsProvider } from '@mui/material/styles';

import { createTheme } from './create-theme';
import type { ThemeOptions, ThemeSettings } from './types';
import { defaultThemeSettings } from './types';
import { Rtl } from './with-settings/right-to-left';

// ════════════════════════════════════════════════════════════════
// Theme Provider Props
// ════════════════════════════════════════════════════════════════

export type ThemeProviderProps = Partial<MuiThemeProviderProps<Theme>> & {
  /**
   * Theme settings (mode, direction, preset, tenant overrides)
   */
  settings?: Partial<ThemeSettings>;
  /**
   * Theme overrides (deep merge with generated theme)
   */
  themeOverrides?: ThemeOptions;
};

// ════════════════════════════════════════════════════════════════
// Theme Provider Component
// ════════════════════════════════════════════════════════════════

/**
 * Serveflow Theme Provider
 *
 * Wraps MUI ThemeProvider with settings-based customization.
 * Follows the same pattern as Minimal template.
 *
 * @example
 * // Basic usage (uses defaults)
 * <ThemeProvider>
 *   <App />
 * </ThemeProvider>
 *
 * @example
 * // With tenant theming
 * <ThemeProvider settings={{
 *   mode: tenant?.theming?.mode || 'light',
 *   direction: tenant?.theming?.direction || 'ltr',
 *   preset: tenant?.theming?.preset || 'default',
 *   tenant: tenant?.theming
 * }}>
 *   <App />
 * </ThemeProvider>
 *
 * @example
 * // Dark mode
 * <ThemeProvider settings={{ mode: 'dark' }}>
 *   <App />
 * </ThemeProvider>
 */
export function ThemeProvider({
  settings,
  themeOverrides,
  children,
  ...other
}: ThemeProviderProps) {
  const mergedSettings: ThemeSettings = {
    ...defaultThemeSettings,
    ...settings,
  };

  const theme = createTheme({
    settingsState: mergedSettings,
    themeOverrides,
  });

  return (
    <ThemeVarsProvider
      disableTransitionOnChange
      theme={theme}
      defaultMode={mergedSettings.mode}
      {...other}
    >
      <CssBaseline />
      <Rtl direction={mergedSettings.direction}>{children}</Rtl>
    </ThemeVarsProvider>
  );
}

// ════════════════════════════════════════════════════════════════
// Export default
// ════════════════════════════════════════════════════════════════

export default ThemeProvider;
