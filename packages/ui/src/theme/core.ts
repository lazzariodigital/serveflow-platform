// ----------------------------------------------------------------------

// Keys for core palette colors
export type PaletteColorKey = 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';
export type CommonColorsKeys = 'black' | 'white';

// Color keys for iteration
export const colorKeys: {
  palette: PaletteColorKey[];
  common: CommonColorsKeys[];
} = {
  palette: ['primary', 'secondary', 'info', 'success', 'warning', 'error'],
  common: ['black', 'white'],
};

// Palette color types
export type PaletteColorNoChannels = {
  lighter: string;
  light: string;
  main: string;
  dark: string;
  darker: string;
  contrastText: string;
};
