'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { Iconify } from './iconify';

// ════════════════════════════════════════════════════════════════
// Google Sign-In SDK Types
// ════════════════════════════════════════════════════════════════

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleIdConfig) => void;
          renderButton: (element: HTMLElement, options: GoogleButtonOptions) => void;
          prompt: (callback?: (notification: PromptNotification) => void) => void;
          cancel: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

interface GoogleIdConfig {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  context?: 'signin' | 'signup' | 'use';
  ux_mode?: 'popup' | 'redirect';
  login_uri?: string;
  native_callback?: (response: GoogleCredentialResponse) => void;
  itp_support?: boolean;
  use_fedcm_for_prompt?: boolean;
}

interface GoogleButtonOptions {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: string | number;
  locale?: string;
  click_listener?: () => void;
}

interface GoogleCredentialResponse {
  credential: string;
  select_by?: string;
}

interface PromptNotification {
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
  isDismissedMoment: () => boolean;
  getNotDisplayedReason: () => string;
  getSkippedReason: () => string;
  getDismissedReason: () => string;
}

// ════════════════════════════════════════════════════════════════
// Component Props
// ════════════════════════════════════════════════════════════════

export interface GoogleSignInButtonProps {
  /**
   * Google OAuth Client ID for this tenant
   * If not provided, falls back to NEXT_PUBLIC_GOOGLE_CLIENT_ID env var
   */
  clientId?: string;
  /**
   * Callback when Google returns a credential token
   */
  onCredentialResponse: (credential: string) => void | Promise<void>;
  /**
   * Callback on error
   */
  onError?: (error: Error) => void;
  /**
   * Disable the button
   */
  disabled?: boolean;
  /**
   * Show loading state
   */
  loading?: boolean;
  /**
   * Button text
   * @default 'Continuar con Google'
   */
  buttonText?: string;
}

// ════════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════════

/**
 * Google Sign-In Button with custom styling.
 * Uses a hidden native Google button for FedCM compatibility,
 * triggered by a visible custom-styled button.
 */
export function GoogleSignInButton({
  clientId: clientIdProp,
  onCredentialResponse,
  onError,
  disabled = false,
  loading = false,
  buttonText = 'Continuar con Google',
}: GoogleSignInButtonProps) {
  const hiddenButtonRef = useRef<HTMLDivElement>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Use prop if provided, otherwise fall back to env var
  const clientId = clientIdProp || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  // Handle credential response from Google
  const handleCredentialResponse = useCallback(
    async (response: GoogleCredentialResponse) => {
      if (!response.credential) {
        onError?.(new Error('No credential received from Google'));
        return;
      }

      setIsProcessing(true);
      try {
        await onCredentialResponse(response.credential);
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error('Error processing Google credential'));
      } finally {
        setIsProcessing(false);
      }
    },
    [onCredentialResponse, onError]
  );

  // Load Google Sign-In SDK
  useEffect(() => {
    if (!clientId) {
      console.warn('[GoogleSignInButton] Google Client ID not configured');
      return;
    }

    // Check if already loaded
    if (window.google?.accounts?.id) {
      setSdkLoaded(true);
      return;
    }

    // Load the script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setSdkLoaded(true);
    };
    script.onerror = () => {
      onError?.(new Error('Failed to load Google Sign-In SDK'));
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup: cancel any pending prompts
      if (window.google?.accounts?.id) {
        window.google.accounts.id.cancel();
      }
    };
  }, [clientId, onError]);

  // Initialize Google Sign-In and render hidden button when SDK is loaded
  useEffect(() => {
    if (!sdkLoaded || !clientId || !window.google?.accounts?.id || !hiddenButtonRef.current) {
      return;
    }

    // Initialize with FedCM support
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true,
      context: 'signin',
      ux_mode: 'popup',
      itp_support: true,
      use_fedcm_for_prompt: true,
    });

    // Render a hidden native Google button - this handles FedCM properly
    window.google.accounts.id.renderButton(hiddenButtonRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      width: 300,
    });
  }, [sdkLoaded, clientId, handleCredentialResponse]);

  // Click handler for custom button - triggers the hidden Google button
  const handleClick = useCallback(() => {
    if (!sdkLoaded || disabled || isProcessing || loading) return;

    // Find and click the hidden Google button
    const googleButton = hiddenButtonRef.current?.querySelector('div[role="button"]') as HTMLElement;
    if (googleButton) {
      googleButton.click();
    }
  }, [sdkLoaded, disabled, isProcessing, loading]);

  // Don't render if not configured
  if (!clientId) {
    return null;
  }

  const isLoading = !sdkLoaded || isProcessing || loading;

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      {/* Hidden native Google button for FedCM compatibility */}
      <Box
        ref={hiddenButtonRef}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      />

      {/* Custom styled button */}
      <Button
        fullWidth
        size="large"
        color="inherit"
        variant="outlined"
        onClick={handleClick}
        disabled={disabled || isLoading}
        startIcon={
          isLoading ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            <Iconify icon="logos:google-icon" width={20} />
          )
        }
        sx={{
          borderColor: 'divider',
          '&:hover': {
            borderColor: 'text.primary',
            bgcolor: 'action.hover',
          },
        }}
      >
        {isLoading ? 'Conectando...' : buttonText}
      </Button>
    </Box>
  );
}
