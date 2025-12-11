'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { useAuth } from '@frontegg/nextjs';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { PageNotFoundIllustration } from '../../assets/illustrations';

// ----------------------------------------------------------------------

interface UserNotFoundErrorProps {
  message?: string;
}

export function UserNotFoundError({
  message = 'Tu cuenta no está registrada en el sistema. Por favor, contacta al administrador para obtener acceso.'
}: UserNotFoundErrorProps) {
  const { logout } = useAuth();
  const router = useRouter();

  const handleSignOut = useCallback(async () => {
    await logout();
    router.push('/sign-in');
  }, [logout, router]);

  return (
    <Container
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        textAlign: 'center',
        py: 10,
      }}
    >
      <Typography variant="h3" sx={{ mb: 2 }}>
        Usuario No Registrado
      </Typography>

      <Typography sx={{ color: 'text.secondary', mb: 4, maxWidth: 480 }}>
        {message}
      </Typography>

      <PageNotFoundIllustration sx={{ width: 320, height: 'auto', my: 4 }} />

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          size="large"
          color="primary"
          onClick={handleSignOut}
        >
          Cerrar Sesión
        </Button>
      </Box>
    </Container>
  );
}
