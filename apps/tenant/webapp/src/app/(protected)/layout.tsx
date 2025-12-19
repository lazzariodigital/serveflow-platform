import { redirect } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Link from 'next/link';

import { CurrentUserProvider } from '../../context/CurrentUserContext';
import { getCurrentUser } from '../../lib/get-current-user';
import { getTenantFromHeaders } from '../../lib/get-tenant';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// ════════════════════════════════════════════════════════════════
// Protected Routes Layout - Requires authentication
// ════════════════════════════════════════════════════════════════

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Get tenant from headers
  const { tenant, error: tenantError } = await getTenantFromHeaders();

  if (!tenant) {
    console.error('[ProtectedLayout] Tenant not found:', tenantError);
    redirect('/');
  }

  // 2. Get current user
  const { user, error } = await getCurrentUser(tenant);

  // 3. Handle errors
  if (error) {
    switch (error.type) {
      case 'UNAUTHORIZED':
        redirect('/sign-in');

      case 'FORBIDDEN':
      case 'USER_NOT_FOUND':
      case 'INTERNAL':
      default:
        return (
          <Container
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '100vh',
              textAlign: 'center',
            }}
          >
            <Typography variant="h4" sx={{ mb: 2 }}>
              Error de acceso
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 4 }}>
              {error.message}
            </Typography>
            <Button component={Link} href="/sign-in" variant="contained">
              Iniciar Sesion
            </Button>
          </Container>
        );
    }
  }

  // 4. User is valid - render protected content
  return (
    <CurrentUserProvider user={user!}>
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Simple Header for protected pages */}
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

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button component={Link} href="/my-bookings" size="small">
              Mis Reservas
            </Button>
            <Button component={Link} href="/profile" size="small">
              Mi Perfil
            </Button>
          </Box>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1 }}>{children}</Box>
      </Box>
    </CurrentUserProvider>
  );
}
