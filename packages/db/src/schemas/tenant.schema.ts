import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { HydratedDocument } from 'mongoose';

export type TenantDocument = HydratedDocument<Tenant>;

// ════════════════════════════════════════════════════════════════
// Nested Types (matching @serveflow/core)
// ════════════════════════════════════════════════════════════════

class Address {
  @Prop({ required: true })
  street!: string;

  @Prop({ required: true })
  city!: string;

  @Prop({ required: true })
  postalCode!: string;

  @Prop({ required: true })
  country!: string; // ISO 3166-1 alpha-2

  @Prop()
  state?: string;
}

class TenantCompany {
  @Prop({ required: true })
  legalName!: string;

  @Prop({ required: true })
  taxId!: string; // CIF/NIF/VAT

  @Prop({ type: Object, required: true })
  address!: Address;
}

class TenantContact {
  @Prop({ required: true })
  email!: string;

  @Prop()
  phone?: string;

  @Prop()
  supportEmail?: string;

  @Prop()
  billingEmail?: string;
}

class TenantDatabase {
  @Prop({ required: true })
  name!: string; // "db_tenant_{slug}"
}

class TenantSettings {
  @Prop({ required: true })
  locale!: string; // "es-ES"

  @Prop({ required: true })
  timezone!: string; // "Europe/Madrid"

  @Prop({ required: true })
  currency!: string; // "EUR"
}

class TenantBrandingLogo {
  @Prop({ required: true })
  url!: string;

  @Prop()
  darkUrl?: string;
}

class TenantBranding {
  @Prop({ type: Object, required: true })
  logo!: TenantBrandingLogo;

  @Prop()
  favicon?: string;

  @Prop()
  appName?: string;
}

class ColorScale {
  @Prop()
  lighter?: string;

  @Prop()
  light?: string;

  @Prop()
  main?: string;

  @Prop()
  dark?: string;

  @Prop()
  darker?: string;

  @Prop()
  contrastText?: string;
}

class TenantThemingPalette {
  @Prop({ type: Object })
  primary?: ColorScale;

  @Prop({ type: Object })
  secondary?: ColorScale;
}

class TenantThemingTypography {
  @Prop()
  primaryFont?: string;

  @Prop()
  secondaryFont?: string;
}

class TenantTheming {
  @Prop({ required: true, enum: ['light', 'dark', 'system'] })
  mode!: string;

  @Prop({ enum: ['default', 'preset1', 'preset2', 'preset3', 'preset4', 'preset5'] })
  preset?: string;

  @Prop({ type: Object })
  palette?: TenantThemingPalette;

  @Prop({ type: Object })
  typography?: TenantThemingTypography;

  @Prop({ enum: ['ltr', 'rtl'] })
  direction?: string;
}

class FusionAuthApplication {
  @Prop({ required: true })
  id!: string;
}

class FusionAuthApplications {
  @Prop({ type: Object, required: true })
  dashboard!: FusionAuthApplication;

  @Prop({ type: Object, required: true })
  webapp!: FusionAuthApplication;
}

class TenantAuthProviderGoogle {
  @Prop({ required: true })
  clientId!: string;

  @Prop({ required: true })
  enabled!: boolean;
}

class TenantAuthProviderGithub {
  @Prop({ required: true })
  clientId!: string;

  @Prop({ required: true })
  enabled!: boolean;
}

class TenantAuthProviders {
  @Prop({ type: Object })
  google?: TenantAuthProviderGoogle;

  @Prop({ type: Object })
  github?: TenantAuthProviderGithub;
}

// ════════════════════════════════════════════════════════════════
// Hito 1B: App Configuration (Authorization)
// ════════════════════════════════════════════════════════════════

class RouteConfig {
  @Prop({ required: true })
  path!: string;

  @Prop({ required: true })
  label!: string;

  @Prop({ required: true })
  icon!: string;

  @Prop({ type: [String], required: true })
  allowedRoles!: string[];

  @Prop({ required: true })
  isEnabled!: boolean;

  @Prop({ required: true })
  order!: number;

  @Prop({ type: [Object] })
  children?: RouteConfig[];
}

class DashboardConfig {
  @Prop({ type: [Object], required: true })
  routes!: RouteConfig[];

  @Prop({ required: true })
  defaultRoute!: string;
}

class WebappConfig {
  @Prop({ type: [Object], required: true })
  routes!: RouteConfig[];

  @Prop({ required: true })
  defaultRoute!: string;
}

// ════════════════════════════════════════════════════════════════
// Tenant Schema
// Location: db_serveflow_sys.tenants
// ════════════════════════════════════════════════════════════════

@Schema({
  collection: 'tenants',
  timestamps: true,
})
export class Tenant {
  // ════════════════════════════════════════════════════════════════
  // FASE 1: CORE (MVP)
  // ════════════════════════════════════════════════════════════════

  // Identificación
  @Prop({ required: true, unique: true, lowercase: true, index: true })
  slug!: string;

  @Prop({ required: true })
  name!: string;

  // Auth - Vínculo con FusionAuth
  @Prop({ required: true })
  fusionauthTenantId!: string;

  /**
   * FusionAuth Applications for this tenant
   * - dashboard: Application for admin/employee access (${slug}.serveflow.app)
   * - webapp: Application for client/provider access (${slug}.app.serveflow.app)
   */
  @Prop({ type: Object, required: true })
  fusionauthApplications!: FusionAuthApplications;

  // ════════════════════════════════════════════════════════════════
  // HITO 1B: App Configuration (Authorization)
  // ════════════════════════════════════════════════════════════════

  /**
   * Dashboard app configuration (routes and permissions)
   * Initialized from DEFAULT_DASHBOARD_ROUTES on tenant creation
   */
  @Prop({ type: Object, required: true })
  dashboardConfig!: DashboardConfig;

  /**
   * WebApp configuration (routes and permissions)
   * Initialized from DEFAULT_WEBAPP_ROUTES on tenant creation
   */
  @Prop({ type: Object, required: true })
  webappConfig!: WebappConfig;

  // Infraestructura
  @Prop({ type: Object, required: true })
  database!: TenantDatabase;

  // Datos de empresa (para facturación Serveflow → Tenant)
  @Prop({ type: Object })
  company?: TenantCompany;

  // Contacto del tenant
  @Prop({ type: Object })
  contact?: TenantContact;

  // Settings básicos
  @Prop({ type: Object })
  settings?: TenantSettings;

  // Branding - Identidad de marca
  @Prop({ type: Object })
  branding?: TenantBranding;

  // Theming - Personalización visual
  @Prop({ type: Object })
  theming?: TenantTheming;

  // Estado
  @Prop({
    required: true,
    enum: ['active', 'suspended'],
    default: 'active',
    index: true,
  })
  status!: string;

  // ════════════════════════════════════════════════════════════════
  // FASE 2: NEGOCIO (opcional por ahora)
  // ════════════════════════════════════════════════════════════════

  @Prop({ enum: ['free', 'starter', 'pro', 'enterprise'], default: 'free' })
  plan?: string;

  @Prop({ type: Object })
  billing?: {
    stripeCustomerId?: string;
    subscriptionId?: string;
    subscriptionStatus?: string;
  };

  @Prop({ type: Object })
  trial?: {
    endsAt: Date;
    convertedAt?: Date;
  };

  @Prop({ type: Object })
  limits?: {
    maxOrganizations: number;
    maxUsers: number;
    maxEventsPerMonth?: number;
  };

  // ════════════════════════════════════════════════════════════════
  // FASE 3: AVANZADO (opcional por ahora)
  // ════════════════════════════════════════════════════════════════

  @Prop({ type: Object })
  features?: {
    bookings: boolean;
    payments: boolean;
    whatsapp: boolean;
    ai: boolean;
    api: boolean;
  };

  @Prop({ type: Object })
  advancedSettings?: {
    dateFormat?: string;
    timeFormat?: '12h' | '24h';
    weekStartsOn?: 0 | 1;
    customDomain?: string;
  };

  // Social auth configuration per tenant
  @Prop({ type: Object })
  authProviders?: TenantAuthProviders;

  // Timestamps
  createdAt!: Date;
  updatedAt!: Date;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);

// ════════════════════════════════════════════════════════════════
// Indexes
// ════════════════════════════════════════════════════════════════

TenantSchema.index({ fusionauthTenantId: 1 }, { unique: true });
TenantSchema.index({ 'fusionauthApplications.dashboard.id': 1 }, { unique: true });
TenantSchema.index({ 'fusionauthApplications.webapp.id': 1 }, { unique: true });
TenantSchema.index({ 'company.taxId': 1 }, { unique: true, sparse: true });
TenantSchema.index({ 'contact.email': 1 });
TenantSchema.index({ status: 1, plan: 1 });
TenantSchema.index({ 'advancedSettings.customDomain': 1 }, { sparse: true });
