'use client';

import type { SxProps, Theme } from '@mui/material/styles';

import { Icon } from '@iconify/react';
import Box from '@mui/material/Box';
import { forwardRef } from 'react';

// ----------------------------------------------------------------------

export type IconifyProps = {
  icon: string;
  width?: number | string;
  sx?: SxProps<Theme>;
  className?: string;
};

export const Iconify = forwardRef<SVGElement, IconifyProps>(
  ({ icon, width = 20, sx, className, ...other }, ref) => {
    const baseStyles = {
      width,
      height: width,
      flexShrink: 0,
      display: 'inline-flex',
    };

    return (
      <Box
        ref={ref}
        component={Icon}
        icon={icon}
        className={className}
        sx={{ ...baseStyles, ...sx }}
        {...other}
      />
    );
  }
);

Iconify.displayName = 'Iconify';

// Disable iconify cache
// disableCache('local');
