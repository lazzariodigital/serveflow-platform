import type { DashboardRoute } from '../types';

// ════════════════════════════════════════════════════════════════
// Default Dashboard Routes
// ════════════════════════════════════════════════════════════════
// These are the default routes for the tenant dashboard.
// Each tenant can customize these via dashboard_config in MongoDB.
// ════════════════════════════════════════════════════════════════

export const DEFAULT_DASHBOARD_ROUTES: DashboardRoute[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: 'home',
    allowedRoles: ['admin', 'employee', 'provider'],
    isEnabled: true,
    order: 0,
  },
  {
    path: '/bookings',
    label: 'Reservas',
    icon: 'calendar',
    allowedRoles: ['admin', 'employee', 'provider'],
    isEnabled: true,
    order: 1,
  },
  {
    path: '/events',
    label: 'Eventos',
    icon: 'calendar-days',
    allowedRoles: ['admin', 'employee'],
    isEnabled: true,
    order: 2,
  },
  {
    path: '/services',
    label: 'Servicios',
    icon: 'list',
    allowedRoles: ['admin', 'employee'],
    isEnabled: true,
    order: 3,
  },
  {
    path: '/users',
    label: 'Usuarios',
    icon: 'users',
    allowedRoles: ['admin'],
    isEnabled: true,
    order: 4,
  },
  {
    path: '/roles',
    label: 'Roles',
    icon: 'shield',
    allowedRoles: ['admin'],
    isEnabled: true,
    order: 5,
  },
  {
    path: '/settings',
    label: 'Configuración',
    icon: 'settings',
    allowedRoles: ['admin'],
    isEnabled: true,
    order: 6,
  },
];
