'use client';

import type { BoxProps } from '@mui/material/Box';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { Iconify } from './iconify';
import { GoogleSignInButton } from './google-sign-in-button';

// ----------------------------------------------------------------------

export type FormSocialsProps = BoxProps & {
  /**
   * Google OAuth Client ID for this tenant (per-tenant config)
   * Required when using onGoogleCredential for SDK flow
   */
  googleClientId?: string;
  /**
   * Legacy: onClick handler for Google button (redirect flow)
   * @deprecated Use onGoogleCredential instead for SDK flow
   */
  onGoogleClick?: () => void;
  /**
   * Callback when Google SDK returns a credential token
   * Use this for the recommended SDK flow (white-label)
   */
  onGoogleCredential?: (credential: string) => void | Promise<void>;
  /**
   * onClick handler for GitHub button
   */
  onGithubClick?: () => void;
  /**
   * Disable all buttons
   */
  disabled?: boolean;
  /**
   * Show loading state
   */
  loading?: boolean;
  /**
   * Error handler for Google SDK
   */
  onGoogleError?: (error: Error) => void;
};

export function FormSocials({
  sx,
  googleClientId,
  onGoogleClick,
  onGoogleCredential,
  onGithubClick,
  disabled,
  loading,
  onGoogleError,
  ...other
}: FormSocialsProps) {
  // Determine if Google is configured
  const showGoogle = onGoogleCredential || onGoogleClick;
  const useGoogleSDK = !!onGoogleCredential;

  return (
    <Box gap={2} display="flex" flexDirection="column" sx={sx} {...other}>
      {showGoogle && (
        useGoogleSDK ? (
          // Use native Google SDK button (handles FedCM properly)
          <GoogleSignInButton
            clientId={googleClientId}
            onCredentialResponse={onGoogleCredential!}
            onError={onGoogleError}
            disabled={disabled}
            loading={loading}
          />
        ) : (
          // Legacy redirect button
          <Button
            fullWidth
            size="large"
            color="inherit"
            variant="outlined"
            onClick={onGoogleClick}
            disabled={disabled || loading}
            startIcon={<Iconify icon="logos:google-icon" width={20} />}
          >
            Continuar con Google
          </Button>
        )
      )}

      {onGithubClick && (
        <Button
          fullWidth
          size="large"
          color="inherit"
          variant="outlined"
          onClick={onGithubClick}
          disabled={disabled || loading}
          startIcon={<Iconify icon="mdi:github" width={24} />}
        >
          Continuar con GitHub
        </Button>
      )}
    </Box>
  );
}
