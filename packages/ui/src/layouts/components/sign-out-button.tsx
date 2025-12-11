'use client';

import type { SxProps, Theme } from '@mui/material/styles';
import type { ButtonProps } from '@mui/material/Button';
import Button from '@mui/material/Button';
import { useCallback } from 'react';

// ----------------------------------------------------------------------

export type SignOutButtonProps = ButtonProps & {
  sx?: SxProps<Theme>;
  onClose?: () => void;
  /**
   * Callback function to handle sign out.
   * This should be provided by the consuming application.
   */
  onSignOut?: () => void | Promise<void>;
};

export function SignOutButton({ onClose, onSignOut, ...other }: SignOutButtonProps) {
  const handleLogout = useCallback(async () => {
    try {
      await onSignOut?.();
      onClose?.();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, [onSignOut, onClose]);

  return (
    <Button fullWidth variant="soft" size="large" color="error" onClick={handleLogout} {...other}>
      Logout
    </Button>
  );
}
