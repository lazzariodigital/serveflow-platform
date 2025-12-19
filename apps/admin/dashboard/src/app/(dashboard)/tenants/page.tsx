'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { useCurrentUser } from '../../../hooks/useCurrentUser';

// ════════════════════════════════════════════════════════════════
// Tenants List Page - Admin Dashboard
// ════════════════════════════════════════════════════════════════

export default function TenantsPage() {
  const user = useCurrentUser();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4">Tenants</Typography>
        <Button variant="contained">Create Tenant</Button>
      </Box>

      <Box
        sx={{
          p: 4,
          borderRadius: 2,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          Welcome, {user.firstName || user.email}
        </Typography>
        <Typography color="text.secondary">
          This is the tenants management page. Here you will be able to:
        </Typography>
        <Box component="ul" sx={{ mt: 2, pl: 3 }}>
          <li>View all tenants in the system</li>
          <li>Create new tenants</li>
          <li>Edit tenant settings</li>
          <li>Manage tenant subscriptions</li>
        </Box>
      </Box>
    </Container>
  );
}
