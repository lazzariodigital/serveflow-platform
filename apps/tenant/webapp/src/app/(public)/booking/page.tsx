'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { useTenant } from '@serveflow/tenants/react';
import Link from 'next/link';

// ════════════════════════════════════════════════════════════════
// Public Booking Page - No auth required to view availability
// ════════════════════════════════════════════════════════════════

export default function BookingPage() {
  const { tenant } = useTenant();

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        component="header"
        sx={{
          py: 2,
          px: 3,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography
          component={Link}
          href="/"
          variant="h6"
          fontWeight="bold"
          sx={{ textDecoration: 'none', color: 'inherit' }}
        >
          {tenant?.branding?.appName || tenant?.name || 'Serveflow'}
        </Typography>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button component={Link} href="/sign-in" variant="outlined" size="small">
            Iniciar Sesion
          </Button>
        </Box>
      </Box>

      {/* Content */}
      <Container maxWidth="lg" sx={{ flex: 1, py: 4 }}>
        <Typography variant="h4" sx={{ mb: 3 }}>
          Reservar
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
            Calendario de Disponibilidad
          </Typography>
          <Typography color="text.secondary">
            Aqui se mostrara el calendario con las pistas y horarios disponibles.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Para realizar una reserva necesitaras{' '}
            <Link href="/sign-in">iniciar sesion</Link>.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
