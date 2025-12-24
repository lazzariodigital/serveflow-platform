'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import { Iconify } from '@serveflow/ui';
import { DashboardContent } from '@serveflow/ui';
import { Can } from '@serveflow/authorization/client';
import { getApiUrl, getAuthHeaders } from '../../../lib/api';

interface Organization {
  _id: string;
  slug: string;
  name: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  isActive: boolean;
  createdAt: string;
}

export default function OrganizationsPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl('/organizations?includeInactive=true'), {
        credentials: 'include',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Error al cargar organizaciones');
      }

      const data = await response.json();
      setOrganizations(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta organización?')) {
      return;
    }

    try {
      const response = await fetch(getApiUrl(`/organizations/${slug}`), {
        method: 'DELETE',
        credentials: 'include',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Error al eliminar');
      }

      fetchOrganizations();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar');
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

  if (error) {
    return (
      <DashboardContent>
        <Box sx={{ p: 3 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">Organizaciones</Typography>

          <Can permission={{ resource: 'organization', action: 'create' }}>
            <Button
              variant="contained"
              startIcon={<Iconify icon="eva:plus-fill" />}
              onClick={() => router.push('/organizations/new')}
            >
              Nueva Organización
            </Button>
          </Can>
        </Box>

        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Slug</TableCell>
                  <TableCell>Ciudad</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {organizations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No hay organizaciones
                    </TableCell>
                  </TableRow>
                ) : (
                  organizations.map((org) => (
                    <TableRow key={org._id} hover>
                      <TableCell>
                        <Typography variant="subtitle2">{org.name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {org.slug}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {org.address?.city || '-'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={org.isActive ? 'Activa' : 'Inactiva'}
                          color={org.isActive ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Can
                          permission={{
                            resource: 'organization',
                            action: 'view',
                            resourceId: org.slug,
                          }}
                        >
                          <IconButton
                            size="small"
                            onClick={() => router.push(`/organizations/${org.slug}`)}
                          >
                            <Iconify icon="eva:eye-fill" />
                          </IconButton>
                        </Can>

                        <Can
                          permission={{
                            resource: 'organization',
                            action: 'update',
                            resourceId: org.slug,
                          }}
                        >
                          <IconButton
                            size="small"
                            onClick={() => router.push(`/organizations/${org.slug}/edit`)}
                          >
                            <Iconify icon="eva:edit-fill" />
                          </IconButton>
                        </Can>

                        <Can
                          permission={{
                            resource: 'organization',
                            action: 'delete',
                            resourceId: org.slug,
                          }}
                        >
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(org.slug)}
                          >
                            <Iconify icon="eva:trash-2-fill" />
                          </IconButton>
                        </Can>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Box>
    </DashboardContent>
  );
}
