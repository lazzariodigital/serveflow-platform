import type { DashboardRoute } from '../types';

// ════════════════════════════════════════════════════════════════
// Default WebApp Routes
// ════════════════════════════════════════════════════════════════
// These are the default routes for the tenant webapp.
// Routes marked with empty allowedRoles are public (no auth required).
// ════════════════════════════════════════════════════════════════

export const DEFAULT_WEBAPP_ROUTES: DashboardRoute[] = [
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

/**
 * Check if a route is public (no authentication required).
 */
export function isPublicRoute(path: string, routes: DashboardRoute[] = DEFAULT_WEBAPP_ROUTES): boolean {
  const route = routes.find(r => path === r.path || path.startsWith(r.path + '/'));
  // Route is public if allowedRoles is empty
  return route ? route.allowedRoles.length === 0 : false;
}
