'use client';

import type { Breakpoint, SxProps, Theme } from '@mui/material/styles';
import { dashboardLayoutVars, dashboardNavColorVars } from './css-vars';
import { Main, VerticalDivider } from './main';

import Box from '@mui/material/Box';
import type { CSSObject } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';
import { Logo } from '../../components/logo';
import type { NavSectionProps } from '../../components/nav-section';
import { useSettingsContext } from '../../components/settings';
import { useBoolean } from '../../hooks/use-boolean';
import { AccountDrawer } from '../components/account-drawer';
import { LanguagePopover } from '../components/language-popover';
import { MenuButton } from '../components/menu-button';
import { NotificationsDrawer } from '../components/notifications-drawer';
import { SettingsButton } from '../components/settings-button';
import { _account } from '../config-nav-account';
import { navData as defaultNavData } from '../config-nav-dashboard';
import { layoutClasses } from '../core';
import { HeaderSection } from '../core/header-section';
import { LayoutSection } from '../core/layout-section';
import { NavHorizontal } from './nav-horizontal';
import { NavMobile } from './nav-mobile';
import { NavVertical } from './nav-vertical';

// ----------------------------------------------------------------------

/**
 * User data for the dashboard layout.
 * This is a simplified interface - the actual user object can have more fields.
 */
export interface DashboardUser {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  photoURL?: string;
  imageUrl?: string;
}

/**
 * Account menu item configuration.
 */
export interface AccountMenuItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

/**
 * Notification item for the notifications drawer.
 */
export interface NotificationItem {
  id: string;
  title: string;
  description?: string;
  type?: string;
  category?: string;
  createdAt?: Date;
  isUnRead?: boolean;
  avatarUrl?: string | null;
}

export type DashboardLayoutProps = {
  sx?: SxProps<Theme>;
  children: React.ReactNode;
  header?: {
    sx?: SxProps<Theme>;
  };
  data?: {
    nav?: NavSectionProps['data'];
    account?: AccountMenuItem[];
    notifications?: NotificationItem[];
  };
  cssVars?: CSSObject;
  /**
   * Optional user data. If not provided, account features may be limited.
   */
  user?: DashboardUser | null;
  /**
   * Callback function to handle sign out.
   */
  onSignOut?: () => void | Promise<void>;
  /**
   * Optional slots for customization.
   */
  slots?: {
    /** Custom component to render in the header right area */
    headerRight?: React.ReactNode;
    /** Custom component to render before the account drawer */
    beforeAccount?: React.ReactNode;
    /** Hide language popover */
    hideLanguage?: boolean;
    /** Hide notifications */
    hideNotifications?: boolean;
    /** Hide settings button */
    hideSettings?: boolean;
  };
};

// Default empty notifications
const defaultNotifications: NotificationItem[] = [];

export function DashboardLayout({
  sx,
  children,
  header,
  data,
  cssVars,
  user,
  onSignOut,
  slots,
}: DashboardLayoutProps) {
  const theme = useTheme();

  const mobileNavOpen = useBoolean();

  const settings = useSettingsContext();

  const navVars = dashboardNavColorVars(
    theme,
    settings.state.navColor,
    settings.state.navLayout
  );

  const layoutQuery: Breakpoint = 'lg';

  // Use provided nav data or default
  const navData = data?.nav ?? defaultNavData;
  const accountData = data?.account ?? _account;
  const notifications = data?.notifications ?? defaultNotifications;

  const isNavMini = settings.state.navLayout === 'mini';
  const isNavHorizontal = settings.state.navLayout === 'horizontal';
  const isNavVertical = isNavMini || settings.state.navLayout === 'vertical';

  return (
    <LayoutSection
      /** **************************************
       * Header
       *************************************** */
      headerSection={
        <HeaderSection
          layoutQuery={layoutQuery}
          disableElevation={isNavVertical}
          slotProps={{
            container: {
              maxWidth: false,
              sx: {
                ...(isNavVertical && { px: { [layoutQuery]: 5 } }),
              },
            },
          }}
          sx={header?.sx}
          slots={{
            bottomArea: isNavHorizontal ? (
              <NavHorizontal
                data={navData}
                layoutQuery={layoutQuery}
                cssVars={navVars.section}
              />
            ) : null,
            leftArea: (
              <>
                {/* -- Nav mobile -- */}
                <MenuButton
                  onClick={mobileNavOpen.onTrue}
                  sx={{
                    mr: 1,
                    ml: -1,
                    [theme.breakpoints.up(layoutQuery)]: { display: 'none' },
                  }}
                />
                <NavMobile
                  data={navData}
                  open={mobileNavOpen.value}
                  onClose={mobileNavOpen.onFalse}
                  cssVars={navVars.section}
                />
                {/* -- Logo -- */}
                {isNavHorizontal && (
                  <Logo
                    sx={{
                      display: 'none',
                      [theme.breakpoints.up(layoutQuery)]: {
                        display: 'inline-flex',
                      },
                    }}
                  />
                )}
                {/* -- Divider -- */}
                {isNavHorizontal && (
                  <VerticalDivider
                    sx={{
                      [theme.breakpoints.up(layoutQuery)]: { display: 'flex' },
                    }}
                  />
                )}

                 {slots?.beforeAccount}
              </>
            ),
            rightArea: (
              <Box display="flex" alignItems="center" gap={{ xs: 0, sm: 0.75 }}>
                {/* -- Language popover -- */}
                {!slots?.hideLanguage && (
                  <LanguagePopover
                    data={[
                      { value: 'es', label: 'Español', countryCode: 'ES' },
                      { value: 'en', label: 'English', countryCode: 'GB' },
                    ]}
                  />
                )}
                {/* -- Notifications drawer -- */}
                {!slots?.hideNotifications && (
                  <NotificationsDrawer data={notifications} />
                )}
                {/* -- Settings button -- */}
                {!slots?.hideSettings && <SettingsButton />}
                {/* -- Custom slot before account -- */}
               
                {/* -- Account drawer -- */}
                <AccountDrawer data={accountData} user={user} onSignOut={onSignOut} />
                {/* -- Custom header right slot -- */}
                {slots?.headerRight}
              </Box>
            ),
          }}
        />
      }
      /** **************************************
       * Sidebar
       *************************************** */
      sidebarSection={
        isNavHorizontal ? null : (
          <NavVertical
            data={navData}
            isNavMini={isNavMini}
            layoutQuery={layoutQuery}
            cssVars={navVars.section}
            onToggleNav={() =>
              settings.setField(
                'navLayout',
                settings.state.navLayout === 'vertical' ? 'mini' : 'vertical'
              )
            }
          />
        )
      }
      /** **************************************
       * Footer
       *************************************** */
      footerSection={null}
      /** **************************************
       * Style
       *************************************** */
      cssVars={{ ...dashboardLayoutVars(theme), ...navVars.layout, ...cssVars }}
      sx={[
        {
          [`& .${layoutClasses.sidebarContainer}`]: {
            [theme.breakpoints.up(layoutQuery)]: {
              pl: isNavMini
                ? 'var(--layout-nav-mini-width)'
                : 'var(--layout-nav-vertical-width)',
              transition: theme.transitions.create(['padding-left'], {
                easing: 'var(--layout-transition-easing)',
                duration: 'var(--layout-transition-duration)',
              }),
            },
          },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Main isNavHorizontal={isNavHorizontal}>{children}</Main>
    </LayoutSection>
  );
}
