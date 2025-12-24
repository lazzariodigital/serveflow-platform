'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import { Iconify } from '@serveflow/ui';
import { DashboardContent } from '@serveflow/ui';
import { Can } from '@serveflow/authorization/client';
import { getApiUrl, getAuthHeaders } from '../../../../lib/api';

interface Organization {
  _id: string;
  slug: string;
  name: string;
  description?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  contact?: {
    email?: string;
    phone?: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrganization();
  }, [slug]);

  const fetchOrganization = async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl(`/organizations/${slug}`), {
        credentials: 'include',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Organización no encontrada');
      }

      const data = await response.json();
      setOrganization(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!organization) return;

    const action = organization.isActive ? 'deactivate' : 'reactivate';
    const confirmMsg = organization.isActive
      ? '¿Desactivar esta organización?'
      : '¿Reactivar esta organización?';

    if (!confirm(confirmMsg)) return;

    try {
      const response = await fetch(getApiUrl(`/organizations/${slug}/${action}`), {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Error al ${action}`);
      }

      fetchOrganization();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  };

  if (loading) {
    return (
      <DashboardContent>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  if (error || !organization) {
    return (
      <DashboardContent>
        <Box sx={{ p: 3 }}>
          <Typography color="error">{error || 'Organización no encontrada'}</Typography>
          <Button sx={{ mt: 2 }} onClick={() => router.push('/organizations')}>
            Volver
          </Button>
        </Box>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="text"
              startIcon={<Iconify icon="eva:arrow-back-fill" />}
              onClick={() => router.push('/organizations')}
            >
              Volver
            </Button>
            <Typography variant="h4">{organization.name}</Typography>
            <Chip
              label={organization.isActive ? 'Activa' : 'Inactiva'}
              color={organization.isActive ? 'success' : 'default'}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Can
              permission={{
                resource: 'organization',
                action: 'update',
                resourceId: slug,
              }}
            >
              <Button
                variant="outlined"
                startIcon={<Iconify icon="eva:edit-fill" />}
                onClick={() => router.push(`/organizations/${slug}/edit`)}
              >
                Editar
              </Button>
            </Can>

            <Can
              permission={{
                resource: 'organization',
                action: 'update',
                resourceId: slug,
              }}
            >
              <Button
                variant="outlined"
                color={organization.isActive ? 'warning' : 'success'}
                onClick={handleToggleStatus}
              >
                {organization.isActive ? 'Desactivar' : 'Reactivar'}
              </Button>
            </Can>
          </Box>
        </Box>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Información General
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Slug
                    </Typography>
                    <Typography variant="body2">{organization.slug}</Typography>
                  </Box>

                  {organization.description && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Descripción
                      </Typography>
                      <Typography variant="body2">{organization.description}</Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Dirección
                </Typography>

                {organization.address ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {organization.address.street && (
                      <Typography variant="body2">{organization.address.street}</Typography>
                    )}
                    <Typography variant="body2">
                      {[
                        organization.address.city,
                        organization.address.state,
                        organization.address.postalCode,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </Typography>
                    {organization.address.country && (
                      <Typography variant="body2">{organization.address.country}</Typography>
                    )}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Sin dirección configurada
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Contacto
                </Typography>

                {organization.contact ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {organization.contact.email && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Email
                        </Typography>
                        <Typography variant="body2">{organization.contact.email}</Typography>
                      </Box>
                    )}
                    {organization.contact.phone && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Teléfono
                        </Typography>
                        <Typography variant="body2">{organization.contact.phone}</Typography>
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Sin contacto configurado
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Metadatos
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Creada
                    </Typography>
                    <Typography variant="body2">
                      {new Date(organization.createdAt).toLocaleString()}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Actualizada
                    </Typography>
                    <Typography variant="body2">
                      {new Date(organization.updatedAt).toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </DashboardContent>
  );
}
