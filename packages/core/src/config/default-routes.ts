import type { RouteConfig } from '../types/tenant';

// ════════════════════════════════════════════════════════════════
// Default Dashboard Routes
// ════════════════════════════════════════════════════════════════
// These are the default routes for the tenant dashboard.
// Used as templates when creating a new tenant.
// ════════════════════════════════════════════════════════════════

export const DEFAULT_DASHBOARD_ROUTES: RouteConfig[] = [
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

// ════════════════════════════════════════════════════════════════
// Default WebApp Routes
// ════════════════════════════════════════════════════════════════
// These are the default routes for the tenant webapp.
// Routes with empty allowedRoles are public (no auth required).
// ════════════════════════════════════════════════════════════════

export const DEFAULT_WEBAPP_ROUTES: RouteConfig[] = [
  // Public routes (no auth required)
  {
    path: '/',
    label: 'Inicio',
    icon: 'home',
    allowedRoles: [], // Empty = public
    isEnabled: true,
    order: 0,
  },
  {
    path: '/services',
    label: 'Servicios',
    icon: 'list',
    allowedRoles: [], // Empty = public
    isEnabled: true,
    order: 1,
  },
  {
    path: '/booking',
    label: 'Reservar',
    icon: 'calendar-plus',
    allowedRoles: [], // Empty = public
    isEnabled: true,
    order: 2,
  },

  // Protected routes (auth required)
  {
    path: '/my-bookings',
    label: 'Mis Reservas',
    icon: 'calendar',
    allowedRoles: ['client', 'provider'],
    isEnabled: true,
    order: 3,
  },
  {
    path: '/profile',
    label: 'Mi Perfil',
    icon: 'user',
    allowedRoles: ['client', 'provider'],
    isEnabled: true,
    order: 4,
  },

  // Provider-only routes
  {
    path: '/my-schedule',
    label: 'Mi Agenda',
    icon: 'calendar-check',
    allowedRoles: ['provider'],
    isEnabled: true,
    order: 5,
  },
  {
    path: '/my-clients',
    label: 'Mis Clientes',
    icon: 'users',
    allowedRoles: ['provider'],
    isEnabled: true,
    order: 6,
  },
];
