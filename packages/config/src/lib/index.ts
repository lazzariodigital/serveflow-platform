// Environment configuration
export { env } from './env';
export type { Env } from './env';

// Default values
export {
  DEFAULT_TENANT_SETTINGS,
  DEFAULT_BRANDING,
  DEFAULT_THEMING,
  DEFAULT_WEEKLY_SCHEDULE,
  DEFAULT_TENANT_LIMITS,
  THEME_PRESETS,
  SYSTEM_DB_NAME,
  TENANT_DB_PREFIX,
  getTenantDbName,
} from './defaults';

export type {
  DaySchedule,
  WeeklySchedule,
  ThemePreset,
} from './defaults';
