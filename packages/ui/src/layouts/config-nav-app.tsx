import { Iconify } from '../components/iconify';

// ----------------------------------------------------------------------

// Default app navigation - apps should provide their own with proper paths
export const appNavData: { subheader?: string; items: { title: string; path: string; icon?: React.ReactNode }[] }[] = [];

// Helper to create nav items with icons
export const createNavItem = (title: string, path: string, iconName: string) => ({
  title,
  path,
  icon: <Iconify icon={iconName} />,
});

// Common icons for app navigation
export const APP_NAV_ICONS = {
  home: 'solar:home-angle-bold-duotone',
  user: 'solar:user-bold-duotone',
  bookmark: 'solar:bookmark-bold-duotone',
  academic: 'solar:square-academic-cap-bold-duotone',
  bag: 'solar:bag-bold-duotone',
  ticket: 'solar:ticket-bold-duotone',
  wallet: 'solar:wallet-bold-duotone',
  settings: 'solar:settings-bold-duotone',
};
