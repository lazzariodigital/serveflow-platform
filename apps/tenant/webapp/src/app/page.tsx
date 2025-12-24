'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { useTenant } from '@serveflow/tenants/react';
import { useCurrentUser } from '@serveflow/authorization/client';
import Link from 'next/link';

// ════════════════════════════════════════════════════════════════
// Public Landing Page - No auth required
// ════════════════════════════════════════════════════════════════

export default function HomePage() {
  const { tenant } = useTenant();
  const { isAuthenticated, user } = useCurrentUser();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
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
        <Typography variant="h6" fontWeight="bold">
          {tenant?.branding?.appName || tenant?.name || 'Serveflow'}
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {isAuthenticated ? (
            <>
              <Typography variant="body2" color="text.secondary">
                Hola, {user?.firstName || user?.email}
              </Typography>
              <Button component={Link} href="/profile" variant="outlined">
                Mi Perfil
              </Button>
            </>
          ) : (
            <>
              <Button component={Link} href="/sign-in" variant="outlined">
                Iniciar Sesión
              </Button>
              <Button component={Link} href="/sign-up" variant="contained">
                Registrarse
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* Hero */}
      <Container
        maxWidth="md"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          py: 8,
        }}
      >
        <Typography variant="h2" sx={{ mb: 2 }}>
          Bienvenido a {tenant?.name || 'nuestra plataforma'}
        </Typography>

        <Typography
          variant="h5"
          color="text.secondary"
          sx={{ mb: 4, maxWidth: 600 }}
        >
          Reserva tus actividades, consulta horarios y gestiona tu perfil de forma sencilla.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            component={Link}
            href="/booking"
            variant="contained"
            size="large"
          >
            Ver Disponibilidad
          </Button>
          <Button
            component={Link}
            href="/services"
            variant="outlined"
            size="large"
          >
            Ver Servicios
          </Button>
        </Box>
      </Container>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          py: 3,
          px: 3,
          borderTop: '1px solid',
          borderColor: 'divider',
          textAlign: 'center',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Powered by Serveflow
        </Typography>
      </Box>
    </Box>
  );
}
