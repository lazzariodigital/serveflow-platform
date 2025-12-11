'use client';

import { useCurrentUser } from '../../hooks/useCurrentUser';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { DashboardContent } from '@serveflow/ui';

// ----------------------------------------------------------------------

export default function DashboardPage() {
  const user = useCurrentUser();

  return (
    <DashboardContent>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3 }}>
          Bienvenido, {user.firstName}
        </Typography>

        <Typography color="text.secondary">
          Este es tu panel de control. Aquí podrás gestionar tu organización.
        </Typography>

        <Box sx={{ mt: 4, p: 3, bgcolor: 'background.neutral', borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Información del usuario:
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Email: {user.email}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Estado: {user.status}
          </Typography>
        </Box>
      </Box>
    </DashboardContent>
  );
}
