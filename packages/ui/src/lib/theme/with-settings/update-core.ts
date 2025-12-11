import type { ColorSystem } from '@mui/material/styles';
import type { ThemeOptions, ThemeColorScheme, ThemeSettings } from '../types';

import { setFont, hexToRgbChannel, createPaletteChannel } from 'minimal-shared/utils';

import { primaryColorPresets } from './color-presets';
import { createShadowColor } from '../core/custom-shadows';

// ----------------------------------------------------------------------

/**
 * Updates the core theme with the provided settings state.
 * @param theme - The base theme options to update.
 * @param settingsState - The settings state containing direction, preset, contrast, and tenant theming.
 * @returns Updated theme options with applied settings.
 */

export function applySettingsToTheme(
  theme: ThemeOptions,
  settingsState?: Partial<ThemeSettings>
): ThemeOptions {
  const {
    direction,
    preset = 'default',
    contrast = false,
    tenant,
  } = settingsState ?? {};

  const fontFamily = tenant?.fontFamily;
  const isDefaultContrast = !contrast;
  const isDefaultPreset = preset === 'default';

  const lightPalette = theme.colorSchemes?.light?.palette as ColorSystem['palette'];

  const primaryColorPalette = !isDefaultPreset
    ? createPaletteChannel(primaryColorPresets[preset])
    : null;

  const updateColorScheme = (schemeName: ThemeColorScheme) => {
    const currentScheme = theme.colorSchemes?.[schemeName];

    const updatedPalette = {
      ...currentScheme?.palette,
      ...(primaryColorPalette && {
        primary: primaryColorPalette,
      }),
      ...(schemeName === 'light' &&
        !isDefaultContrast && {
          background: {
            ...lightPalette?.background,
            default: lightPalette?.grey?.[200],
            defaultChannel: lightPalette?.grey?.[200]
              ? hexToRgbChannel(lightPalette.grey[200])
              : undefined,
          },
        }),
    };

    const updatedCustomShadows = {
      ...currentScheme?.customShadows,
      ...(primaryColorPalette && {
        primary: createShadowColor(primaryColorPalette.mainChannel),
      }),
    };

    return {
      ...currentScheme,
      palette: updatedPalette,
      customShadows: updatedCustomShadows,
    };
  };

  return {
    ...theme,
    direction,
    colorSchemes: {
      light: updateColorScheme('light'),
      dark: updateColorScheme('dark'),
    },
    typography: {
      ...theme.typography,
      ...(fontFamily && { fontFamily: setFont(fontFamily) }),
    },
  };
}
