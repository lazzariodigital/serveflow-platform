import { ObjectId } from 'mongodb';
import type {
  Address,
  Contact,
  TenantStatus,
  TenantPlan,
  ThemeMode,
  TextDirection,
  ThemePreset,
  ColorScale,
  BaseDocument,
} from './common';

// ════════════════════════════════════════════════════════════════
// Branding (Identity of the brand)
// ════════════════════════════════════════════════════════════════

export interface TenantBranding {
  logo: {
    url: string;      // URL for light mode
    darkUrl?: string; // URL for dark mode (optional)
  };
  favicon?: string;
  appName?: string;   // Override tenant name in UI
}

// ════════════════════════════════════════════════════════════════
// Theming (Visual customization)
// ════════════════════════════════════════════════════════════════

export interface TenantTheming {
  mode: ThemeMode;
  preset?: ThemePreset;
  palette?: {
    primary?: ColorScale;
    secondary?: ColorScale;
  };
  typography?: {
    primaryFont?: string;
    secondaryFont?: string;
  };
  direction?: TextDirection;
}

// ════════════════════════════════════════════════════════════════
// Tenant Settings
// ════════════════════════════════════════════════════════════════

export interface TenantSettings {
  locale: string;   // "es-ES"
  timezone: string; // "Europe/Madrid"
  currency: string; // "EUR"
}

// ════════════════════════════════════════════════════════════════
// Company Info (for billing Serveflow → Tenant)
// ════════════════════════════════════════════════════════════════

export interface TenantCompany {
  legalName: string;
  taxId: string; // CIF/NIF/VAT
  address: Address;
}

// ════════════════════════════════════════════════════════════════
// Tenant Database Config
// ════════════════════════════════════════════════════════════════

export interface TenantDatabase {
  name: string; // "db_tenant_club_madrid"
}

// ════════════════════════════════════════════════════════════════
// Tenant Limits (Phase 2)
// ════════════════════════════════════════════════════════════════

export interface TenantLimits {
  maxOrganizations: number;
  maxUsers: number;
  maxEventsPerMonth?: number | null;
}

// ════════════════════════════════════════════════════════════════
// Tenant Billing (Phase 2)
// ════════════════════════════════════════════════════════════════

export interface TenantBilling {
  stripeCustomerId?: string;
  subscriptionId?: string;
  subscriptionStatus?: 'active' | 'past_due' | 'cancelled';
}

// ════════════════════════════════════════════════════════════════
// Tenant Trial (Phase 2)
// ════════════════════════════════════════════════════════════════

export interface TenantTrial {
  endsAt: Date;
  convertedAt?: Date;
}

// ════════════════════════════════════════════════════════════════
// Tenant Features (Phase 3)
// ════════════════════════════════════════════════════════════════

export interface TenantFeatures {
  bookings: boolean;
  payments: boolean;
  whatsapp: boolean;
  ai: boolean;
  api: boolean;
}

// ════════════════════════════════════════════════════════════════
// Tenant Advanced Settings (Phase 3)
// ════════════════════════════════════════════════════════════════

export interface TenantAdvancedSettings {
  dateFormat?: string;        // "DD/MM/YYYY"
  timeFormat?: '12h' | '24h';
  weekStartsOn?: 0 | 1;       // 0=Sunday, 1=Monday
  customDomain?: string;      // "app.clubpadelmadrid.com"
}

// ════════════════════════════════════════════════════════════════
// Full Tenant Interface (all phases)
// ════════════════════════════════════════════════════════════════

export interface Tenant extends BaseDocument {
  // Phase 1: Core (MVP)
  slug: string;
  name: string;
  fusionauthTenantId: string;
  fusionauthApplicationId: string;
  database: TenantDatabase;
  company: TenantCompany;
  contact: Contact;
  settings: TenantSettings;
  branding: TenantBranding;
  theming: TenantTheming;
  status: TenantStatus;

  // Phase 2: Business
  plan?: TenantPlan;
  billing?: TenantBilling;
  trial?: TenantTrial;
  limits?: TenantLimits;

  // Phase 3: Advanced
  features?: TenantFeatures;
  advancedSettings?: TenantAdvancedSettings;
}

// ════════════════════════════════════════════════════════════════
// TenantMVP - Phase 1 only (what we implement now)
// ════════════════════════════════════════════════════════════════

export interface TenantMVP extends BaseDocument {
  slug: string;
  name: string;
  fusionauthTenantId: string;
  fusionauthApplicationId: string;
  database: TenantDatabase;
  company: TenantCompany;
  contact: Contact;
  settings: TenantSettings;
  branding: TenantBranding;
  theming: TenantTheming;
  status: 'active' | 'suspended';
}

// ════════════════════════════════════════════════════════════════
// Create Tenant Input
// ════════════════════════════════════════════════════════════════

export interface CreateTenantInput {
  slug: string;
  name: string;
  fusionauthTenantId: string;
  fusionauthApplicationId: string;
  ownerEmail: string;
  company: TenantCompany;
  contact: Pick<Contact, 'email' | 'phone'>;
  settings?: Partial<TenantSettings>;
  branding?: Partial<TenantBranding>;
  theming?: Partial<TenantTheming>;
}
