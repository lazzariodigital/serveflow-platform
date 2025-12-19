'use client';

import { use } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Link from 'next/link';

// ════════════════════════════════════════════════════════════════
// Tenant Detail Page - Admin Dashboard
// ════════════════════════════════════════════════════════════════

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function TenantDetailPage({ params }: PageProps) {
  const { slug } = use(params);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Button component={Link} href="/tenants" variant="text" sx={{ mb: 2 }}>
          Back to Tenants
        </Button>
        <Typography variant="h4">Tenant: {slug}</Typography>
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
          Tenant Details
        </Typography>
        <Typography color="text.secondary">
          This page will show detailed information about the tenant "{slug}":
        </Typography>
        <Box component="ul" sx={{ mt: 2, pl: 3 }}>
          <li>Basic information (name, slug, status)</li>
          <li>FusionAuth configuration</li>
          <li>Subscription and billing details</li>
          <li>Usage statistics</li>
          <li>Quick actions (suspend, activate, delete)</li>
        </Box>
      </Box>
    </Container>
  );
}
