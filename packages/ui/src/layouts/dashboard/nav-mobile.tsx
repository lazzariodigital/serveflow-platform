'use client';

import Drawer, { drawerClasses } from '@mui/material/Drawer';

import Box from '@mui/material/Box';
import { useEffect } from 'react';
import { Logo } from '../../components/logo';
import type { NavSectionProps } from '../../components/nav-section';
import { NavSectionVertical } from '../../components/nav-section';
import { Scrollbar } from '../../components/scrollbar';
import { usePathname } from '../../routes/hooks';
import { NavUpgrade } from '../components/nav-upgrade';

// ----------------------------------------------------------------------

type NavMobileProps = NavSectionProps & {
  open: boolean;
  onClose: () => void;
  slots?: {
    topArea?: React.ReactNode;
    bottomArea?: React.ReactNode;
  };
};

export function NavMobile({ data, open, onClose, slots, sx, ...other }: NavMobileProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (open) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      sx={{
        [`& .${drawerClasses.paper}`]: {
          overflow: 'unset',
          bgcolor: 'var(--layout-nav-bg)',
          width: 'var(--layout-nav-mobile-width)',
          ...sx,
        },
      }}
    >
      {slots?.topArea ?? (
        <Box sx={{ pl: 3.5, pt: 2.5, pb: 1 }}>
          <Logo disableLink={true} />
        </Box>
      )}

      <Scrollbar fillContent>
        <NavSectionVertical data={data} sx={{ px: 2, flex: '1 1 auto' }} {...other} />
        <NavUpgrade />
      </Scrollbar>

      {slots?.bottomArea}
    </Drawer>
  );
}
