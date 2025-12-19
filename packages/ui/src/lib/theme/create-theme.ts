'use client';

import type { Components, Theme } from '@mui/material/styles';
import { applySettingsToComponents, applySettingsToTheme } from './with-settings';

import type { ThemeSettings, ThemeOptions, TenantTheming } from './types';
import { components } from './core/components';
import { createTheme as createMuiTheme } from '@mui/material/styles';
import { customShadows } from './core/custom-shadows';
import { mixins } from './core/mixins';
import { opacity } from './core/opacity';
import { palette } from './core/palette';
import { shadows } from './core/shadows';
import { themeConfig } from './theme-config';
import { typography } from './core/typography';

// ----------------------------------------------------------------------

export const baseTheme: ThemeOptions = {
  colorSchemes: {
    light: {
      palette: palette.light,
      shadows: shadows.light,
      customShadows: customShadows.light,
      opacity,
    },
    dark: {
      palette: palette.dark,
      shadows: shadows.dark,
      customShadows: customShadows.dark,
      opacity,
    },
  },
  mixins,
  components,
  typography,
  shape: { borderRadius: 8 },
  direction: themeConfig.direction,
  cssVariables: themeConfig.cssVariables,
};

// ----------------------------------------------------------------------

type CreateThemeProps = {
  settingsState?: Partial<ThemeSettings>;
  themeOverrides?: ThemeOptions;
  localeComponents?: { components?: Components<Theme> };
};

export function createTheme({
  settingsState,
  themeOverrides = {},
  localeComponents = {},
}: CreateThemeProps = {}): Theme {
  // Update core theme settings (colorSchemes, typography, etc.)
  const updatedCore = settingsState ? applySettingsToTheme(baseTheme, settingsState) : baseTheme;

  // Update component settings (only components)
  const updatedComponents = settingsState ? applySettingsToComponents(settingsState) : {};

  // Set defaultMode in cssVariables based on settings (prevents system detection)
  const themeMode = settingsState?.mode || 'light';
  const coreWithMode = {
    ...updatedCore,
    cssVariables: {
      ...(typeof updatedCore.cssVariables === 'object' ? updatedCore.cssVariables : {}),
      defaultMode: themeMode,
    },
  } as ThemeOptions;

  // Create and return the final theme
  const theme = createMuiTheme(coreWithMode, updatedComponents, localeComponents, themeOverrides);

  return theme;
}

// ----------------------------------------------------------------------

/**
 * Creates a default light theme
 */
export function createDefaultTheme() {
  return createTheme({
    settingsState: {
      mode: 'light',
      direction: 'ltr',
      preset: 'default',
      contrast: false,
    },
  });
}

/**
 * Creates a theme customized for a tenant
 */
export function createTenantTheme(tenantTheming: TenantTheming, mode: 'light' | 'dark' = 'light') {
  return createTheme({
    settingsState: {
      mode,
      direction: 'ltr',
      preset: 'default',
      contrast: false,
      tenant: tenantTheming,
    },
  });
}
