import type { Theme, Components } from '@mui/material/styles';
import type { ThemeSettings } from '../types';

import { cardClasses } from '@mui/material/Card';

// ----------------------------------------------------------------------

export function applySettingsToComponents(settingsState?: Partial<ThemeSettings>): {
  components: Components<Theme>;
} {
  const MuiCssBaseline: Components<Theme>['MuiCssBaseline'] = {
    styleOverrides: (theme) => ({
      body: {
        [`& .${cardClasses.root}`]: {
          ...(settingsState?.contrast && {
            '--card-shadow': theme.vars.customShadows.z1,
          }),
        },
      },
    }),
  };

  return {
    components: {
      MuiCssBaseline,
    },
  };
}
