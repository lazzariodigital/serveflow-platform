'use client';

import { forwardRef } from 'react';
import type { SxProps, Theme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Link from 'next/link';
import { logoClasses } from './classes';

// ════════════════════════════════════════════════════════════════
// Logo Props - Receives URL from tenant instead of static import
// ════════════════════════════════════════════════════════════════

export interface LogoProps {
  /** URL of the logo (from tenant.branding.logo.url) */
  logoUrl?: string | null;
  /** Navigation path when clicked */
  href?: string;
  /** Disable link behavior */
  disableLink?: boolean;
  /** Single icon (40x40) or full logo (120x36) */
  isSingle?: boolean;
  /** Custom class name */
  className?: string;
  /** Custom styles */
  sx?: SxProps<Theme>;
}

// ════════════════════════════════════════════════════════════════
// Logo Component
// ════════════════════════════════════════════════════════════════

export const Logo = forwardRef<HTMLDivElement, LogoProps>(
  (
    {
      logoUrl,
      href = '/',
      disableLink = false,
      isSingle = true,
      className,
      sx,
    },
    ref
  ) => {
    // Fallback to default logo if no tenant URL
    const defaultLogo = '/logo/logo-single.svg';
    const src = logoUrl || defaultLogo;

    const baseSize = {
      width: isSingle ? 40 : 120,
      height: isSingle ? 40 : 36,
    };

    const logoStyles: SxProps<Theme> = {
      ...baseSize,
      flexShrink: 0,
      display: 'inline-flex',
      verticalAlign: 'middle',
      ...sx,
    };

    const logoContent = (
      <Box
        component="img"
        src={src}
        alt="Logo"
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
      />
    );

    const combinedClassName = logoClasses.root + (className ? ` ${className}` : '');

    if (disableLink) {
      return (
        <Box
          ref={ref}
          className={combinedClassName}
          aria-label="Logo"
          sx={logoStyles}
        >
          {logoContent}
        </Box>
      );
    }

    return (
      <Link href={href} style={{ textDecoration: 'none' }}>
        <Box
          ref={ref}
          className={combinedClassName}
          aria-label="Logo"
          sx={{
            ...logoStyles,
            pointerEvents: 'auto',
          }}
        >
          {logoContent}
        </Box>
      </Link>
    );
  }
);

Logo.displayName = 'Logo';
