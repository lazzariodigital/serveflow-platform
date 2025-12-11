import { ObjectId } from 'mongodb';
import type { DaySchedule } from '../schemas/organization.schema';

// ════════════════════════════════════════════════════════════════
// Re-exports from Zod schemas (for backward compatibility)
// ════════════════════════════════════════════════════════════════

export type {
  Address,
  Contact,
  ColorScale,
} from '../schemas/tenant.schema';

export type {
  TimeBreak,
  DaySchedule,
  WeeklySchedule,
} from '../schemas/organization.schema';

// ════════════════════════════════════════════════════════════════
// Common Types - Utility types not in Zod schemas
// ════════════════════════════════════════════════════════════════

export type TenantStatus = 'active' | 'suspended' | 'cancelled';
export type TenantPlan = 'free' | 'starter' | 'pro' | 'enterprise';
export type ThemeMode = 'light' | 'dark' | 'system';
export type TextDirection = 'ltr' | 'rtl';
export type ThemePreset = 'default' | 'preset1' | 'preset2' | 'preset3' | 'preset4' | 'preset5';

// ════════════════════════════════════════════════════════════════
// Schedule Types - Holiday (not yet in Zod)
// ════════════════════════════════════════════════════════════════

export interface Holiday {
  date: string;       // "YYYY-MM-DD"
  name: string;
  isOpen: boolean;
  schedule?: DaySchedule;
}

// ════════════════════════════════════════════════════════════════
// MongoDB Document Base
// ════════════════════════════════════════════════════════════════

export interface BaseDocument {
  _id: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ════════════════════════════════════════════════════════════════
// System Roles
// ════════════════════════════════════════════════════════════════

export type SystemRole = 'superadmin' | 'support' | 'billing';

// ════════════════════════════════════════════════════════════════
// Tenant Access for Global Users
// ════════════════════════════════════════════════════════════════

export interface TenantAccess {
  tenantId: ObjectId;
  role: 'viewer' | 'support';
  grantedAt: Date;
  grantedBy: ObjectId;
}
