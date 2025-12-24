import type { DashboardRoute } from '../types';

// ════════════════════════════════════════════════════════════════
// Default Admin Dashboard Routes
// ════════════════════════════════════════════════════════════════
// These are the routes for the admin (superadmin) dashboard.
// Only superadmin role can access.
// ════════════════════════════════════════════════════════════════

export const DEFAULT_ADMIN_ROUTES: DashboardRoute[] = [
  {
    path: '/tenants',
    label: 'Tenants',
    icon: 'building',
    allowedRoles: ['superadmin'],
    isEnabled: true,
    order: 0,
  },
  {
    path: '/role-templates',
    label: 'Role Templates',
    icon: 'shield',
    allowedRoles: ['superadmin'],
    isEnabled: true,
    order: 1,
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: 'settings',
    allowedRoles: ['superadmin'],
    isEnabled: true,
    order: 2,
  },
];
