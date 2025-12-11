import type { Direction, Theme, ThemeProviderProps } from '@mui/material/styles';

// ----------------------------------------------------------------------

export type ThemeConfig = {
  direction: Direction;
  classesPrefix: string;
  defaultMode: ThemeProviderProps<Theme>['defaultMode'];
  modeStorageKey: ThemeProviderProps<Theme>['modeStorageKey'];
  fontFamily: Record<'primary' | 'secondary', string>;
};

export const themeConfig: ThemeConfig = {
  defaultMode: 'light',
  modeStorageKey: 'theme-mode',
  direction: 'ltr',
  classesPrefix: 'serveflow',
  fontFamily: {
    primary: 'Inter Variable',
    secondary: 'Barlow',
  },
};
