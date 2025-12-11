import { z } from 'zod';

// ════════════════════════════════════════════════════════════════
// Common Schemas
// ════════════════════════════════════════════════════════════════

export const AddressSchema = z.object({
  street: z.string().min(1, 'Street is required'),
  city: z.string().min(1, 'City is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().length(2, 'Country must be ISO 3166-1 alpha-2'),
  state: z.string().optional(),
});

export const ContactSchema = z.object({
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  supportEmail: z.string().email().optional(),
  billingEmail: z.string().email().optional(),
});

// ════════════════════════════════════════════════════════════════
// Branding Schema
// ════════════════════════════════════════════════════════════════

export const TenantBrandingSchema = z.object({
  logo: z.object({
    url: z.string().url('Invalid logo URL'),
    darkUrl: z.string().url().optional(),
  }),
  favicon: z.string().optional(),
  appName: z.string().optional(),
});

// ════════════════════════════════════════════════════════════════
// Theming Schema
// ════════════════════════════════════════════════════════════════

export const ColorScaleSchema = z.object({
  lighter: z.string(),
  light: z.string(),
  main: z.string(),
  dark: z.string(),
  darker: z.string(),
  contrastText: z.string(),
});

export const TenantThemingSchema = z.object({
  mode: z.enum(['light', 'dark', 'system']),
  preset: z.enum(['default', 'preset1', 'preset2', 'preset3', 'preset4', 'preset5']).optional(),
  palette: z.object({
    primary: ColorScaleSchema.optional(),
    secondary: ColorScaleSchema.optional(),
  }).optional(),
  typography: z.object({
    primaryFont: z.string().optional(),
    secondaryFont: z.string().optional(),
  }).optional(),
  direction: z.enum(['ltr', 'rtl']).optional(),
});

// ════════════════════════════════════════════════════════════════
// Settings Schema
// ════════════════════════════════════════════════════════════════

export const TenantSettingsSchema = z.object({
  locale: z.string().min(2),
  timezone: z.string(),
  currency: z.string().length(3, 'Currency must be ISO 4217'),
});

// ════════════════════════════════════════════════════════════════
// Company Schema
// ════════════════════════════════════════════════════════════════

export const TenantCompanySchema = z.object({
  legalName: z.string().min(1, 'Legal name is required'),
  taxId: z.string().min(1, 'Tax ID is required'),
  address: AddressSchema,
});

// ════════════════════════════════════════════════════════════════
// Database Schema
// ════════════════════════════════════════════════════════════════

export const TenantDatabaseSchema = z.object({
  name: z.string().regex(/^db_tenant_[\w]+$/, 'Database name must follow pattern db_tenant_{slug}'),
});

// ════════════════════════════════════════════════════════════════
// Full Tenant Schema (MVP)
// ════════════════════════════════════════════════════════════════

export const TenantMVPSchema = z.object({
  slug: z.string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug must be at most 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  name: z.string().min(1, 'Name is required'),
  fronteggTenantId: z.string().min(1, 'Frontegg Tenant ID is required'),
  database: TenantDatabaseSchema,
  company: TenantCompanySchema,
  contact: ContactSchema.pick({ email: true, phone: true }),
  settings: TenantSettingsSchema,
  branding: TenantBrandingSchema,
  theming: TenantThemingSchema,
  status: z.enum(['active', 'suspended']),
});

// ════════════════════════════════════════════════════════════════
// Create Tenant Input Schema
// ════════════════════════════════════════════════════════════════

export const CreateTenantInputSchema = z.object({
  slug: z.string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug must be at most 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  name: z.string().min(1, 'Name is required'),
  fronteggTenantId: z.string().min(1, 'Frontegg Tenant ID is required'),
  ownerEmail: z.string().email('Invalid owner email'),
  company: TenantCompanySchema,
  contact: z.object({
    email: z.string().email(),
    phone: z.string().optional(),
  }),
  settings: TenantSettingsSchema.partial().optional(),
  branding: TenantBrandingSchema.partial().optional(),
  theming: TenantThemingSchema.partial().optional(),
});

// ════════════════════════════════════════════════════════════════
// Update Tenant Input Schema
// ════════════════════════════════════════════════════════════════

export const UpdateTenantInputSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  status: z.enum(['active', 'suspended', 'trial', 'churned']).optional(),
  plan: z.enum(['free', 'starter', 'pro', 'enterprise']).optional(),
  branding: z.object({
    logoUrl: z.string().url().optional(),
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    faviconUrl: z.string().url().optional(),
  }).optional(),
  theming: z.object({
    preset: z.string(),
    customCSS: z.string().optional(),
  }).optional(),
  settings: z.object({
    timezone: z.string(),
    locale: z.string(),
    currency: z.string().length(3),
    dateFormat: z.string().optional(),
    timeFormat: z.string().optional(),
  }).partial().optional(),
  trialEndsAt: z.coerce.date().optional(),
  subscriptionEndsAt: z.coerce.date().optional(),
});

// ════════════════════════════════════════════════════════════════
// List Tenants Query Schema (for admin API)
// ════════════════════════════════════════════════════════════════

export const ListTenantsQuerySchema = z.object({
  // Filters
  status: z.union([
    z.enum(['active', 'suspended', 'trial', 'churned']),
    z.array(z.enum(['active', 'suspended', 'trial', 'churned'])),
  ]).optional(),
  plan: z.union([
    z.enum(['free', 'starter', 'pro', 'enterprise']),
    z.array(z.enum(['free', 'starter', 'pro', 'enterprise'])),
  ]).optional(),
  search: z.string().optional(),

  // Pagination
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),

  // Sorting
  sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'slug']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// ════════════════════════════════════════════════════════════════
// Create Tenant Request Schema (for admin API)
// ════════════════════════════════════════════════════════════════

export const CreateTenantRequestSchema = z.object({
  slug: z.string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug must be at most 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  name: z.string().min(1, 'Name is required'),
  fronteggTenantId: z.string().optional(),
  plan: z.enum(['free', 'starter', 'pro', 'enterprise']).optional().default('free'),
  branding: z.object({
    logoUrl: z.string().url().optional(),
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    faviconUrl: z.string().url().optional(),
  }).optional(),
  settings: z.object({
    timezone: z.string().default('UTC'),
    locale: z.string().default('en'),
    currency: z.string().length(3).default('USD'),
  }).optional(),
});

// ════════════════════════════════════════════════════════════════
// Type exports from schemas
// ════════════════════════════════════════════════════════════════

export type Address = z.infer<typeof AddressSchema>;
export type Contact = z.infer<typeof ContactSchema>;
export type TenantBranding = z.infer<typeof TenantBrandingSchema>;
export type ColorScale = z.infer<typeof ColorScaleSchema>;
export type TenantTheming = z.infer<typeof TenantThemingSchema>;
export type TenantSettings = z.infer<typeof TenantSettingsSchema>;
export type TenantCompany = z.infer<typeof TenantCompanySchema>;
export type TenantDatabase = z.infer<typeof TenantDatabaseSchema>;
export type TenantMVP = z.infer<typeof TenantMVPSchema>;
export type CreateTenantInput = z.infer<typeof CreateTenantInputSchema>;
export type UpdateTenantInput = z.infer<typeof UpdateTenantInputSchema>;
export type ListTenantsQuery = z.infer<typeof ListTenantsQuerySchema>;
export type CreateTenantRequest = z.infer<typeof CreateTenantRequestSchema>;
