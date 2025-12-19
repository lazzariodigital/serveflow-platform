'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { useFusionAuth } from '@serveflow/ui';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

// ----------------------------------------------------------------------

interface UserNotFoundErrorProps {
  message?: string;
}

export function UserNotFoundError({
  message = 'Tu cuenta de administrador no fue encontrada.'
}: UserNotFoundErrorProps) {
  const { logout } = useFusionAuth();
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
        Usuario No Encontrado
      </Typography>

      <Typography sx={{ color: 'text.secondary', mb: 4, maxWidth: 480 }}>
        {message}
      </Typography>

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          size="large"
          color="primary"
          onClick={handleSignOut}
        >
          Volver a Iniciar Sesión
        </Button>
      </Box>
    </Container>
  );
}
