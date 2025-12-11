import type {
  Theme,
  Shadows,
  Components,
  ColorSystemOptions,
  CssVarsThemeOptions,
  SupportedColorScheme,
  ThemeOptions as MuiThemeOptions,
} from '@mui/material/styles';
import type { CustomShadows } from './core/custom-shadows';

// ════════════════════════════════════════════════════════════════
// MUI Theme Extensions
// ════════════════════════════════════════════════════════════════

/**
 * Theme options
 * Extended type that includes additional properties for color schemes and CSS variables.
 *
 * @see https://github.com/mui/material-ui/blob/master/packages/mui-material/src/styles/createTheme.ts
 */

export type ThemeColorScheme = SupportedColorScheme;
export type ThemeCssVariables = Pick<
  CssVarsThemeOptions,
  | 'cssVarPrefix'
  | 'rootSelector'
  | 'colorSchemeSelector'
  | 'disableCssColorScheme'
  | 'shouldSkipGeneratingVar'
>;

type ColorSchemeOptionsExtended = ColorSystemOptions & {
  shadows?: Partial<Shadows>;
  customShadows?: Partial<CustomShadows>;
};

export type SchemesRecord<T> = Partial<Record<ThemeColorScheme, T>>;

export type ThemeOptions = Omit<MuiThemeOptions, 'components'> &
  Pick<CssVarsThemeOptions, 'defaultColorScheme'> & {
    colorSchemes?: SchemesRecord<ColorSchemeOptionsExtended>;
    cssVariables?: ThemeCssVariables;
    components?: Components<Theme>;
  };

/**
 * DeepPartial utility type that recursively makes all properties of T optional.
 * This is useful for partial configurations and merging deeply nested objects.
 * Supports objects, arrays, and primitive types.
 */
export type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

// ════════════════════════════════════════════════════════════════
// Tenant Theming Types
// ════════════════════════════════════════════════════════════════

/**
 * Tenant theming configuration
 * This can be stored in tenant settings and used to customize the theme
 */
export interface TenantTheming {
  /**
   * Theme mode (light/dark)
   */
  mode?: ThemeMode;

  /**
   * Primary color in hex format
   */
  primaryColor?: string;

  /**
   * Secondary color in hex format
   */
  secondaryColor?: string;

  /**
   * Logo URL
   */
  logoUrl?: string;

  /**
   * Favicon URL
   */
  faviconUrl?: string;

  /**
   * Font family override
   */
  fontFamily?: string;

  /**
   * Border radius multiplier (0.5 = rounded, 1 = default, 1.5 = more rounded)
   */
  borderRadiusMultiplier?: number;

  /**
   * @deprecated Use mode instead
   * Dark mode preference
   */
  darkMode?: boolean;

  /**
   * Custom CSS variables
   */
  customCss?: Record<string, string>;
}

/**
 * Theme mode
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Theme direction
 */
export type ThemeDirection = 'ltr' | 'rtl';

/**
 * Theme preset colors
 */
export type ThemePreset = 'default' | 'blue' | 'cyan' | 'purple' | 'orange' | 'red';

/**
 * Theme settings
 */
export interface ThemeSettings {
  mode: ThemeMode;
  direction: ThemeDirection;
  preset: ThemePreset;
  contrast: boolean;
  tenant?: TenantTheming;
}

/**
 * Default theme settings
 */
export const defaultThemeSettings: ThemeSettings = {
  mode: 'light',
  direction: 'ltr',
  preset: 'default',
  contrast: false,
};
