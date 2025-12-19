'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

/**
 * SSO Callback Page
 * Handles OAuth callback - redirects to home after auth completes
 */
export default function SSOCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Simple redirect after a brief moment
    // The actual token handling is done by FusionAuth
    const timer = setTimeout(() => {
      router.push('/');
    }, 1000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: 2,
      }}
    >
      <CircularProgress />
      <Typography>Completando inicio de sesion...</Typography>
    </Box>
  );
}
