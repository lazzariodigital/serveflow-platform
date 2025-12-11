'use client';

import type { ButtonProps } from '@mui/material/Button';
import Button from '@mui/material/Button';
import { RouterLink } from '../../routes/components';

// ----------------------------------------------------------------------

export type SignInButtonProps = ButtonProps & {
  /**
   * The href to navigate to when clicked.
   * Defaults to '/sign-in'.
   */
  href?: string;
};

export function SignInButton({ sx, href = '/sign-in', ...other }: SignInButtonProps) {
  return (
    <Button
      component={RouterLink}
      href={href}
      variant="outlined"
      sx={sx}
      {...other}
    >
      Sign in
    </Button>
  );
}
