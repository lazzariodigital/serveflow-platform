'use client';

import { CustomPopover, usePopover } from '../../components/custom-popover';

import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import type { ButtonBaseProps } from '@mui/material/ButtonBase';
import ButtonBase from '@mui/material/ButtonBase';
import Divider from '@mui/material/Divider';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import Typography from '@mui/material/Typography';
import { useCallback } from 'react';
import { Iconify } from '../../components/iconify';
import { Label } from '../../components/label';

// ----------------------------------------------------------------------

export interface Organization {
  id: string;
  name: string;
  logoUrl?: string | null;
  status?: 'active' | 'inactive';
  address?: string;
}

export type ScopeType = 'tenant' | 'organization';

export type OrganizationPopoverProps = ButtonBaseProps & {
  /** Current scope type: 'tenant' (all user's orgs) or 'organization' (single org) */
  scopeType?: ScopeType;
  /** Currently selected organization ID */
  currentOrganizationId?: string | null;
  /** Available organizations to select from (already filtered by user access) */
  organizations?: Organization[];
  /** Whether organizations are loading */
  loading?: boolean;
  /** Callback when an organization is selected */
  onSelectOrganization?: (org: Organization) => void;
  /** Callback when "All Organizations" is selected */
  onSelectAllOrganizations?: () => void;
};

export function OrganizationPopover({
  sx,
  scopeType = 'organization',
  currentOrganizationId,
  organizations = [],
  loading = false,
  onSelectOrganization,
  onSelectAllOrganizations,
  ...other
}: OrganizationPopoverProps) {
  const popover = usePopover();
  const mediaQuery = 'sm';

  // Get current organization details
  const currentOrganization = organizations.find((org) => org.id === currentOrganizationId);

  // Show "All Organizations" option if user has access to multiple orgs
  const showAllOption = organizations.length > 1;

  const handleSelectOrganization = useCallback(
    (org: Organization) => {
      onSelectOrganization?.(org);
      popover.onClose();
    },
    [onSelectOrganization, popover]
  );

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
            sx={{ display: { xs: 'none', [mediaQuery]: 'inline-flex' } }}
          >
            All Organizations
          </Typography>
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
          {/* "All Organizations" option (only if user has access to multiple orgs) */}
          {showAllOption && [
            <MenuItem
              key="all-orgs"
              selected={scopeType === 'tenant'}
              onClick={handleSelectAllOrganizations}
              sx={{ height: 48, borderRadius: 1 }}
            >
              <ListItemIcon sx={{ mr: 0 }}>
                <Iconify icon="solar:buildings-bold-duotone" sx={{ width: 24, height: 24 }} />
              </ListItemIcon>
              <ListItemText
                primary="All Organizations"
                secondary={`View all ${organizations.length} organizations`}
                primaryTypographyProps={{ typography: 'body2' }}
                secondaryTypographyProps={{ typography: 'caption' }}
              />
            </MenuItem>,
            <Divider key="all-divider" sx={{ my: 0.5 }} />,
          ]}

          {/* Individual organizations */}
          {organizations.length > 0 && (
            <Typography variant="caption" sx={{ px: 1.5, py: 0.5, color: 'text.secondary' }}>
              Organizations
            </Typography>
          )}

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
