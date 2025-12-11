/**
 * Default values for Serveflow configuration
 * These values are used when a tenant doesn't provide custom configuration
 */

// ════════════════════════════════════════════════════════════════
// Tenant Settings Defaults
// ════════════════════════════════════════════════════════════════

export const DEFAULT_TENANT_SETTINGS = {
  locale: 'es-ES',
  timezone: 'Europe/Madrid',
  currency: 'EUR',
} as const;

// ════════════════════════════════════════════════════════════════
// Branding Defaults
// ════════════════════════════════════════════════════════════════

export const DEFAULT_BRANDING = {
  logo: {
    url: '/assets/logo-serveflow.svg',
    darkUrl: '/assets/logo-serveflow-white.svg',
  },
  favicon: '/favicon.ico',
} as const;

// ════════════════════════════════════════════════════════════════
// Theming Defaults
// ════════════════════════════════════════════════════════════════

export const DEFAULT_THEMING = {
  mode: 'light' as const,
  preset: 'default' as const,
  direction: 'ltr' as const,
} as const;

// ════════════════════════════════════════════════════════════════
// Weekly Schedule Defaults
// ════════════════════════════════════════════════════════════════

export interface DaySchedule {
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
  breaks?: Array<{
    start: string;
    end: string;
  }>;
}

export interface WeeklySchedule {
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
}

export const DEFAULT_WEEKLY_SCHEDULE: WeeklySchedule = {
  monday:    { isOpen: true, openTime: '09:00', closeTime: '21:00' },
  tuesday:   { isOpen: true, openTime: '09:00', closeTime: '21:00' },
  wednesday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
  thursday:  { isOpen: true, openTime: '09:00', closeTime: '21:00' },
  friday:    { isOpen: true, openTime: '09:00', closeTime: '21:00' },
  saturday:  { isOpen: true, openTime: '09:00', closeTime: '14:00' },
  sunday:    { isOpen: false },
};

// ════════════════════════════════════════════════════════════════
// Tenant Limits Defaults (for plan-based limits)
// ════════════════════════════════════════════════════════════════

export const DEFAULT_TENANT_LIMITS = {
  maxOrganizations: 1,
  maxUsers: 10,
  maxEventsPerMonth: null as number | null, // unlimited
} as const;

// ════════════════════════════════════════════════════════════════
// Theme Presets
// ════════════════════════════════════════════════════════════════

export type ThemePreset = 'default' | 'preset1' | 'preset2' | 'preset3' | 'preset4' | 'preset5';

export const THEME_PRESETS: Record<ThemePreset, { primary: string; description: string }> = {
  default: { primary: '#FF9776', description: 'Coral (Serveflow default)' },
  preset1: { primary: '#078DEE', description: 'Azul cielo' },
  preset2: { primary: '#7635dc', description: 'Púrpura' },
  preset3: { primary: '#0C68E9', description: 'Azul eléctrico' },
  preset4: { primary: '#fda92d', description: 'Naranja/Amarillo' },
  preset5: { primary: '#FF3030', description: 'Rojo' },
};

// ════════════════════════════════════════════════════════════════
// MongoDB Database Names
// ════════════════════════════════════════════════════════════════

export const SYSTEM_DB_NAME = 'db_serveflow_sys';
export const TENANT_DB_PREFIX = 'db_tenant_';

export function getTenantDbName(slug: string): string {
  return `${TENANT_DB_PREFIX}${slug.replace(/-/g, '_')}`;
}
