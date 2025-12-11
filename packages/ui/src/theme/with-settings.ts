import type { PaletteColorNoChannels } from './core';

// ----------------------------------------------------------------------

export type ThemeColorPreset =
  | 'default'
  | 'preset1'
  | 'preset2'
  | 'preset3'
  | 'preset4'
  | 'preset5';

// Default primary colors
const defaultPrimary: PaletteColorNoChannels = {
  lighter: '#faebe9',
  light: '#feb39d',
  main: '#FF9776',
  dark: '#f76337',
  darker: '#c24825',
  contrastText: '#FFFFFF',
};

export const primaryColorPresets: Record<ThemeColorPreset, PaletteColorNoChannels> = {
  default: defaultPrimary,
  preset1: {
    lighter: '#CCF4FE',
    light: '#68CDF9',
    main: '#078DEE',
    dark: '#0351AB',
    darker: '#012972',
    contrastText: '#FFFFFF',
  },
  preset2: {
    lighter: '#EBD6FD',
    light: '#B985F4',
    main: '#7635dc',
    dark: '#431A9E',
    darker: '#200A69',
    contrastText: '#FFFFFF',
  },
  preset3: {
    lighter: '#CDE9FD',
    light: '#6BB1F8',
    main: '#0C68E9',
    dark: '#063BA7',
    darker: '#021D6F',
    contrastText: '#FFFFFF',
  },
  preset4: {
    lighter: '#FEF4D4',
    light: '#FED680',
    main: '#fda92d',
    dark: '#B66816',
    darker: '#793908',
    contrastText: '#1C252E',
  },
  preset5: {
    lighter: '#FFE3D5',
    light: '#FFC1AC',
    main: '#FF3030',
    dark: '#B71833',
    darker: '#7A0930',
    contrastText: '#FFFFFF',
  },
};
