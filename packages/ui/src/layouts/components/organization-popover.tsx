'use client';

import { CustomPopover, usePopover } from '../../components/custom-popover';
import { useCallback } from 'react';

import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import type { ButtonBaseProps } from '@mui/material/ButtonBase';
import Divider from '@mui/material/Divider';
import { Iconify } from '../../components/iconify';
import { Label } from '../../components/label';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

export interface Organization {
  id: string;
  name: string;
  logoUrl?: string | null;
  status?: 'active' | 'inactive';
  address?: string;
}

export type ScopeType = 'tenant' | 'organization' | 'multi-organization';

export type OrganizationPopoverProps = ButtonBaseProps & {
  /** Current scope type */
  scopeType?: ScopeType;
  /** Currently selected organization ID */
  currentOrganizationId?: string | null;
  /** Selected organization IDs for multi-organization scope */
  selectedOrganizationIds?: string[];
  /** Available organizations to select from */
  organizations?: Organization[];
  /** Whether organizations are loading */
  loading?: boolean;
  /** Whether user has tenant-wide access */
  hasTenantAccess?: boolean;
  /** Callback when an organization is selected */
  onSelectOrganization?: (org: Organization) => void;
  /** Callback when tenant scope is selected */
  onSelectTenantScope?: () => void;
  /** Callback when all organizations are selected */
  onSelectAllOrganizations?: () => void;
};

export function OrganizationPopover({
  sx,
  scopeType = 'organization',
  currentOrganizationId,
  selectedOrganizationIds = [],
  organizations = [],
  loading = false,
  hasTenantAccess = false,
  onSelectOrganization,
  onSelectTenantScope,
  onSelectAllOrganizations,
  ...other
}: OrganizationPopoverProps) {
  const popover = usePopover();

  const mediaQuery = 'sm';

  // Get current organization details
  const currentOrganization = organizations.find((org) => org.id === currentOrganizationId);

  const handleSelectOrganization = useCallback(
    (org: Organization) => {
      onSelectOrganization?.(org);
      popover.onClose();
    },
    [onSelectOrganization, popover]
  );

  const handleSelectTenantScope = useCallback(() => {
    onSelectTenantScope?.();
    popover.onClose();
  }, [onSelectTenantScope, popover]);

  const handleSelectAllOrganizations = useCallback(() => {
    onSelectAllOrganizations?.();
    popover.onClose();
  }, [onSelectAllOrganizations, popover]);

  // Render button content based on scope
  const renderButtonContent = () => {
    if (loading) {
      return (
        <>
          <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'action.hover' }} />
          <Box
            component="span"
            sx={{
              typography: 'subtitle2',
              color: 'text.disabled',
              display: { xs: 'none', [mediaQuery]: 'inline-flex' },
            }}
          >
            Loading...
          </Box>
        </>
      );
    }

    if (scopeType === 'tenant') {
      return (
        <>
          <Iconify
            icon="solar:buildings-bold-duotone"
            sx={{ width: 24, height: 24, color: 'text.primary' }}
          />
          <Typography
            variant="subtitle2"
            color="text.primary"
            sx={{
              display: { xs: 'none', [mediaQuery]: 'inline-flex' },
            }}
          >
            All Organizations
          </Typography>
        </>
      );
    }

    if (scopeType === 'multi-organization') {
      return (
        <>
          <Iconify icon="solar:buildings-bold-duotone" sx={{ width: 24, height: 24 }} />
          <Box
            component="span"
            sx={{
              typography: 'subtitle2',
              display: { xs: 'none', [mediaQuery]: 'inline-flex' },
            }}
          >
            {selectedOrganizationIds.length} Organizations
          </Box>
          <Label
            color="info"
            sx={{
              height: 22,
              display: { xs: 'none', [mediaQuery]: 'inline-flex' },
            }}
          >
            Multi
          </Label>
        </>
      );
    }

    if (currentOrganization) {
      return (
        <>
          {currentOrganization.logoUrl ? (
            <Box
              component="img"
              alt={currentOrganization.name}
              src={currentOrganization.logoUrl}
              sx={{ width: 24, height: 24, borderRadius: '50%' }}
            />
          ) : (
            <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
              {currentOrganization.name.charAt(0).toUpperCase()}
            </Avatar>
          )}
          <Box
            component="span"
            sx={{
              typography: 'subtitle2',
              display: { xs: 'none', [mediaQuery]: 'inline-flex' },
            }}
          >
            {currentOrganization.name}
          </Box>
        </>
      );
    }

    return (
      <>
        <Iconify icon="solar:question-circle-bold" sx={{ width: 24, height: 24 }} />
        <Box
          component="span"
          sx={{
            typography: 'subtitle2',
            display: { xs: 'none', [mediaQuery]: 'inline-flex' },
          }}
        >
          Select Organization
        </Box>
      </>
    );
  };

  return (
    <>
      <ButtonBase
        disableRipple
        onClick={popover.onOpen}
        sx={{
          py: 0.5,
          gap: { xs: 0.5, [mediaQuery]: 1 },
          ...sx,
        }}
        {...other}
      >
        {renderButtonContent()}
        <Iconify width={16} icon="carbon:chevron-sort" sx={{ color: 'text.disabled' }} />
      </ButtonBase>

      <CustomPopover
        open={popover.open}
        anchorEl={popover.anchorEl}
        onClose={popover.onClose}
        slotProps={{ arrow: { placement: 'top-left' } }}
      >
        <MenuList sx={{ width: 280, p: 1 }}>
          {/* Tenant scope option (if user has access) */}
          {hasTenantAccess && (
            <>
              <MenuItem
                selected={scopeType === 'tenant'}
                onClick={handleSelectTenantScope}
                sx={{ height: 48, borderRadius: 1 }}
              >
                <ListItemIcon sx={{ mr: 0 }}>
                  <Iconify icon="solar:buildings-bold-duotone" sx={{ width: 24, height: 24 }} />
                </ListItemIcon>
                <ListItemText
                  primary="All Organizations"
                  secondary="Full tenant access"
                  primaryTypographyProps={{ typography: 'body2' }}
                  secondaryTypographyProps={{ typography: 'caption' }}
                />
              </MenuItem>
              <Divider sx={{ my: 0.5 }} />
            </>
          )}

          {/* Multi-organization option (if user has access to multiple) */}
          {organizations.length > 1 && (
            <>
              <MenuItem
                selected={scopeType === 'multi-organization'}
                onClick={handleSelectAllOrganizations}
                sx={{ height: 48, borderRadius: 1 }}
              >
                <ListItemIcon>
                  <Iconify icon="solar:buildings-bold-duotone" sx={{ width: 24, height: 24 }} />
                </ListItemIcon>
                <ListItemText
                  primary="Multiple Organizations"
                  secondary={`${organizations.length} organizations`}
                  primaryTypographyProps={{ typography: 'body2' }}
                  secondaryTypographyProps={{ typography: 'caption' }}
                />
              </MenuItem>
              <Divider sx={{ my: 0.5 }} />
            </>
          )}

          {/* Individual organizations */}
          <Typography variant="caption" sx={{ px: 1.5, py: 0.5, color: 'text.secondary' }}>
            Organizations
          </Typography>

          {organizations.map((org) => (
            <MenuItem
              key={org.id}
              selected={scopeType === 'organization' && org.id === currentOrganizationId}
              onClick={() => handleSelectOrganization(org)}
              sx={{ height: 48, borderRadius: 1 }}
            >
              {org.logoUrl ? (
                <Avatar alt={org.name} src={org.logoUrl} sx={{ width: 24, height: 24, mr: 2 }} />
              ) : (
                <Avatar sx={{ width: 24, height: 24, mr: 2, fontSize: 12 }}>
                  {org.name.charAt(0).toUpperCase()}
                </Avatar>
              )}

              <Box component="span" sx={{ flexGrow: 1 }}>
                <Typography variant="body2">{org.name}</Typography>
                {org.address && (
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {org.address}
                  </Typography>
                )}
              </Box>

              {org.status === 'inactive' && (
                <Label color="default" sx={{ ml: 1 }}>
                  Inactive
                </Label>
              )}
            </MenuItem>
          ))}

          {organizations.length === 0 && !loading && (
            <MenuItem disabled sx={{ height: 48, justifyContent: 'center' }}>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                No organizations available
              </Typography>
            </MenuItem>
          )}
        </MenuList>
      </CustomPopover>
    </>
  );
}
