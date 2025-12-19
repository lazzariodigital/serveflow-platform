'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { useFusionAuth } from '@serveflow/ui';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import { useCurrentUser } from '../../../hooks/useCurrentUser';

// ════════════════════════════════════════════════════════════════
// Profile Page - Protected
// ════════════════════════════════════════════════════════════════

export default function ProfilePage() {
  const user = useCurrentUser();
  const { logout } = useFusionAuth();
  const router = useRouter();

  const handleSignOut = useCallback(async () => {
    await logout();
    router.push('/sign-in');
  }, [logout, router]);

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Mi Perfil
      </Typography>

      <Box
        sx={{
          p: 4,
          borderRadius: 2,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Nombre
          </Typography>
          <Typography variant="body1">
            {user.firstName} {user.lastName}
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Email
          </Typography>
          <Typography variant="body1">{user.email}</Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Estado
          </Typography>
          <Typography variant="body1">{user.status}</Typography>
        </Box>

        <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button variant="outlined" color="error" onClick={handleSignOut}>
            Cerrar Sesion
          </Button>
        </Box>
      </Box>
    </Container>
  );
}
