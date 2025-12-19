'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { useTenant } from '@serveflow/tenants/react';
import Link from 'next/link';

// ════════════════════════════════════════════════════════════════
// Public Services Page - No auth required
// ════════════════════════════════════════════════════════════════

export default function ServicesPage() {
  const { tenant } = useTenant();

  // Placeholder services
  const services = [
    {
      id: 1,
      name: 'Pista de Padel',
      description: 'Reserva tu pista de padel por horas.',
      price: '12/hora',
    },
    {
      id: 2,
      name: 'Clases Grupales',
      description: 'Clases con monitores profesionales.',
      price: '15/clase',
    },
    {
      id: 3,
      name: 'Entrenamiento Personal',
      description: 'Sesiones individuales personalizadas.',
      price: '30/sesion',
    },
  ];

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
          Nuestros Servicios
        </Typography>

        <Grid container spacing={3}>
          {services.map((service) => (
            <Grid key={service.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    {service.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    {service.description}
                  </Typography>
                  <Typography variant="h5" color="primary">
                    {service.price}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Button
            component={Link}
            href="/booking"
            variant="contained"
            size="large"
          >
            Ver Disponibilidad
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
