'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

// ════════════════════════════════════════════════════════════════
// Global Users Page - Admin Dashboard
// ════════════════════════════════════════════════════════════════

export default function UsersPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4">Global Users</Typography>
        <Button variant="contained">Create Admin User</Button>
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
          Admin Users Management
        </Typography>
        <Typography color="text.secondary">
          This page will allow you to manage global admin users:
        </Typography>
        <Box component="ul" sx={{ mt: 2, pl: 3 }}>
          <li>View all admin users</li>
          <li>Create new admin accounts</li>
          <li>Manage admin permissions and roles</li>
          <li>View user activity logs</li>
        </Box>
      </Box>
    </Container>
  );
}
