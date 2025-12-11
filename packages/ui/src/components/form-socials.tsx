'use client';

import type { BoxProps } from '@mui/material/Box';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { Iconify } from '@serveflow/ui';

// ----------------------------------------------------------------------

export type FormSocialsProps = BoxProps & {
  onGoogleClick?: () => void;
  onGithubClick?: () => void;
  disabled?: boolean;
};

export function FormSocials({
  sx,
  onGoogleClick,
  onGithubClick,
  disabled,
  ...other
}: FormSocialsProps) {
  return (
    <Box gap={2} display="flex" flexDirection="column" sx={sx} {...other}>
      {onGoogleClick && (
        <Button
          fullWidth
          size="large"
          color="inherit"
          variant="outlined"
          onClick={onGoogleClick}
          disabled={disabled}
          startIcon={<Iconify icon="logos:google-icon" width={20} />}
        >
          Continue with Google
        </Button>
      )}

      {onGithubClick && (
        <Button
          fullWidth
          size="large"
          color="inherit"
          variant="outlined"
          onClick={onGithubClick}
          disabled={disabled}
          startIcon={<Iconify icon="mdi:github" width={24} />}
        >
          Continue with GitHub
        </Button>
      )}
    </Box>
  );
}
