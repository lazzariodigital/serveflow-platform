'use client';

import { useCallback, useState } from 'react';
import { usePathname, useRouter } from '../../routes/hooks';

import { AccountButton } from './account-button';
import { AnimateBorder } from '../../components/animate';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import type { IconButtonProps } from '@mui/material/IconButton';
import { Iconify } from '../../components/iconify';
import { Label } from '../../components/label';
import MenuItem from '@mui/material/MenuItem';
import { Scrollbar } from '../../components/scrollbar';
import { SignOutButton } from './sign-out-button';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { UpgradeBlock } from './nav-upgrade';
import { useTheme } from '@mui/material/styles';
import { varAlpha } from 'minimal-shared/utils';

// ----------------------------------------------------------------------

/**
 * User data for the account drawer.
 */
export interface AccountDrawerUser {
  displayName?: string;
  email?: string;
  photoURL?: string;
  imageUrl?: string;
}

export type AccountDrawerProps = IconButtonProps & {
  data?: {
    label: string;
    href: string;
    icon?: React.ReactNode;
    info?: React.ReactNode;
  }[];
  /**
   * User data to display. If not provided, account info will be empty.
   */
  user?: AccountDrawerUser | null;
  /**
   * Base path for dashboard routes. Defaults to '/dashboard'.
   */
  dashboardPath?: string;
  /**
   * Callback function to handle sign out.
   */
  onSignOut?: () => void | Promise<void>;
};

export function AccountDrawer({ data = [], user, dashboardPath = '/dashboard', onSignOut, sx, ...other }: AccountDrawerProps) {
  const theme = useTheme();

  const router = useRouter();

  const pathname = usePathname();

  const [open, setOpen] = useState(false);

  const handleOpenDrawer = useCallback(() => {
    setOpen(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setOpen(false);
  }, []);

  const handleClickItem = useCallback(
    (path: string) => {
      handleCloseDrawer();
      router.push(path);
    },
    [handleCloseDrawer, router]
  );

  const renderAvatar = () => (
    <AnimateBorder
      sx={{ mb: 2, p: '6px', width: 96, height: 96, borderRadius: '50%' }}
      slotProps={{
        primaryBorder: { size: 120, sx: { color: 'primary.main' } },
      }}
    >
      <Avatar src={user?.photoURL} alt={user?.displayName} sx={{ width: 1, height: 1 }}>
        {user?.displayName?.charAt(0).toUpperCase()}
      </Avatar>
    </AnimateBorder>
  );

  return (
    <>
      <AccountButton
        onClick={handleOpenDrawer}
        photoURL={user?.photoURL}
        displayName={user?.displayName}
        sx={sx}
        {...other}
      />

      <Drawer
        open={open}
        onClose={handleCloseDrawer}
        anchor="right"
        slotProps={{ backdrop: { invisible: true } }}
        PaperProps={{ sx: { width: 320 } }}
      >
        <IconButton
          onClick={handleCloseDrawer}
          sx={{ top: 12, left: 12, zIndex: 9, position: 'absolute' }}
        >
          <Iconify icon="mingcute:close-line" />
        </IconButton>

        <Scrollbar>
          <Stack alignItems="center" sx={{ pt: 8 }}>
            {renderAvatar()}

            <Typography variant="subtitle1" noWrap sx={{ mt: 2 }}>
              {user?.displayName}
            </Typography>

            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }} noWrap>
              {user?.email}
            </Typography>
          </Stack>

          <Stack
            sx={{
              py: 3,
              px: 2.5,
              borderTop: `dashed 1px ${theme.vars.palette.divider}`,
              borderBottom: `dashed 1px ${theme.vars.palette.divider}`,
            }}
          >
            {data.map((option) => {
              const rootLabel = pathname.includes(dashboardPath) ? 'Home' : 'Dashboard';

              const rootHref = pathname.includes(dashboardPath) ? '/' : dashboardPath;

              return (
                <MenuItem
                  key={option.label}
                  onClick={() => handleClickItem(option.label === 'Home' ? rootHref : option.href)}
                  sx={{
                    py: 1,
                    color: 'text.secondary',
                    '& svg': { width: 24, height: 24 },
                    '&:hover': { color: 'text.primary' },
                  }}
                >
                  {option.icon}

                  <Box component="span" sx={{ ml: 2 }}>
                    {option.label === 'Home' ? rootLabel : option.label}
                  </Box>

                  {option.info && (
                    <Label color="error" sx={{ ml: 1 }}>
                      {option.info}
                    </Label>
                  )}
                </MenuItem>
              );
            })}
          </Stack>

          <Box sx={{ px: 2.5, py: 3 }}>
            <UpgradeBlock />
          </Box>
        </Scrollbar>

        <Box sx={{ p: 2.5 }}>
          <SignOutButton onClose={handleCloseDrawer} onSignOut={onSignOut} />
        </Box>
      </Drawer>
    </>
  );
}
