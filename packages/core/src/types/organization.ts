import { ObjectId } from 'mongodb';
import type {
  Contact,
  WeeklySchedule,
  Holiday,
  BaseDocument,
} from './common';
import type { TenantBranding } from './tenant';

// ════════════════════════════════════════════════════════════════
// Organization Location
// ════════════════════════════════════════════════════════════════

export interface OrganizationLocation {
  address: string;
  city: string;
  country: string;
  postalCode?: string;
}

export interface OrganizationCoordinates {
  lat: number;
  lng: number;
}

// ════════════════════════════════════════════════════════════════
// Organization Schedule
// ════════════════════════════════════════════════════════════════

export interface OrganizationSchedule {
  timezone: string;
  weekly: WeeklySchedule;
}

// ════════════════════════════════════════════════════════════════
// Organization Integrations (Phase 2)
// ════════════════════════════════════════════════════════════════

export interface StripeIntegration {
  accountId: string; // Stripe Connect account
  enabled: boolean;
  onboardingComplete: boolean;
}

export interface WhatsAppIntegration {
  phoneNumberId: string;
  enabled: boolean;
}

export interface OrganizationIntegrations {
  stripe?: StripeIntegration;
  whatsapp?: WhatsAppIntegration;
}

// ════════════════════════════════════════════════════════════════
// Organization Status
// ════════════════════════════════════════════════════════════════

export type OrganizationStatus = 'active' | 'inactive';

// ════════════════════════════════════════════════════════════════
// Full Organization Interface
// ════════════════════════════════════════════════════════════════

export interface Organization extends BaseDocument {
  // Phase 1: Core (MVP)
  slug: string;
  name: string;
  location: OrganizationLocation;
  contact: Pick<Contact, 'email' | 'phone'>;
  schedule: OrganizationSchedule;
  status: OrganizationStatus;
  isDefault: boolean;

  // Phase 2: Integrations
  integrations?: OrganizationIntegrations;

  // Phase 3: Advanced
  coordinates?: OrganizationCoordinates;
  description?: string;
  website?: string;
  holidays?: Holiday[];
  branding?: Partial<TenantBranding>;
}

// ════════════════════════════════════════════════════════════════
// OrganizationMVP - Phase 1 only
// ════════════════════════════════════════════════════════════════

export interface OrganizationMVP extends BaseDocument {
  slug: string;
  name: string;
  location: OrganizationLocation;
  contact: Pick<Contact, 'email' | 'phone'>;
  schedule: OrganizationSchedule;
  status: OrganizationStatus;
  isDefault: boolean;
}

// ════════════════════════════════════════════════════════════════
// Create Organization Input
// ════════════════════════════════════════════════════════════════

export interface CreateOrganizationInput {
  slug: string;
  name: string;
  location: OrganizationLocation;
  contact: Pick<Contact, 'email' | 'phone'>;
  schedule?: Partial<OrganizationSchedule>;
  isDefault?: boolean;
}
