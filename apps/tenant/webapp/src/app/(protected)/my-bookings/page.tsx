'use client';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { useCurrentUser } from '../../../hooks/useCurrentUser';

// ════════════════════════════════════════════════════════════════
// My Bookings Page - Protected
// ════════════════════════════════════════════════════════════════

export default function MyBookingsPage() {
  const user = useCurrentUser();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Mis Reservas
      </Typography>

      <Box
        sx={{
          p: 4,
          borderRadius: 2,
          bgcolor: 'background.neutral',
          textAlign: 'center',
        }}
      >
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          Hola, {user.firstName}
        </Typography>
        <Typography color="text.secondary">
          Aqui se mostrara el historial de tus reservas.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Proximamente: lista de reservas activas, historial y cancelaciones.
        </Typography>
      </Box>
    </Container>
  );
}
