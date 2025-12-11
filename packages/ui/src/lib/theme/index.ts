// ════════════════════════════════════════════════════════════════
// Theme Exports
// ════════════════════════════════════════════════════════════════

// Types
export type {
  TenantTheming,
  ThemeMode,
  ThemeDirection,
  ThemePreset,
  ThemeSettings,
  ThemeOptions,
  ThemeColorScheme,
  ThemeCssVariables,
  SchemesRecord,
  DeepPartial,
} from './types';
export { defaultThemeSettings } from './types';

// Theme config
export { themeConfig, type ThemeConfig } from './theme-config';

// Core - Palette
export {
  palette,
  primary,
  secondary,
  info,
  success,
  warning,
  error,
  common,
  grey,
  text,
  background,
  action,
  colorKeys,
  type PaletteColorKey,
  type CommonColorsKeys,
  type PaletteColorNoChannels,
  type PaletteColorWithChannels,
  type PaletteColorExtend,
  type CommonColorsExtend,
  type TypeTextExtend,
  type TypeBackgroundExtend,
  type GreyExtend,
  type PaletteExtend,
} from './core/palette';

// Core - Typography
export { typography, type TypographyVariantsExtend } from './core/typography';

// Core - Shadows
export { shadows } from './core/shadows';
export { customShadows, createShadowColor, type CustomShadows } from './core/custom-shadows';

// Core - Opacity
export { opacity, type OpacityExtend } from './core/opacity';

// Core - Mixins
export {
  mixins,
  bgBlur,
  bgGradient,
  maxLine,
  textGradient,
  borderGradient,
  menuItemStyles,
  paperStyles,
  filledStyles,
  softStyles,
  type MixinsExtend,
  type BgBlurProps,
  type BgGradientProps,
  type MaxLineProps,
  type BorderGradientProps,
  type PaperStyleOptions,
  type ColorKey,
  type StyleOptions,
} from './core/mixins';

// Core - Components
export { components } from './core/components';

// With Settings
export {
  applySettingsToTheme,
  applySettingsToComponents,
  Rtl,
  colorPresets,
} from './with-settings';

// Theme creation
export {
  createTheme,
  createDefaultTheme,
  baseTheme,
} from './create-theme';

// Theme overrides
export { themeOverrides } from './theme-overrides';

// Classes
export { createClasses } from './create-classes';

// Provider
export { ThemeProvider, type ThemeProviderProps } from './theme-provider';
