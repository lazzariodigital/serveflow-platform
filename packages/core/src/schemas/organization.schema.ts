import { z } from 'zod';

// ════════════════════════════════════════════════════════════════
// Location Schema
// ════════════════════════════════════════════════════════════════

export const OrganizationLocationSchema = z.object({
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  country: z.string().min(1, 'Country is required'),
  postalCode: z.string().optional(),
});

// ════════════════════════════════════════════════════════════════
// Schedule Schemas
// ════════════════════════════════════════════════════════════════

export const TimeBreakSchema = z.object({
  start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:mm format'),
  end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:mm format'),
});

export const DayScheduleSchema = z.object({
  isOpen: z.boolean(),
  openTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:mm format').optional(),
  closeTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:mm format').optional(),
  breaks: z.array(TimeBreakSchema).optional(),
});

export const WeeklyScheduleSchema = z.object({
  monday: DayScheduleSchema.optional(),
  tuesday: DayScheduleSchema.optional(),
  wednesday: DayScheduleSchema.optional(),
  thursday: DayScheduleSchema.optional(),
  friday: DayScheduleSchema.optional(),
  saturday: DayScheduleSchema.optional(),
  sunday: DayScheduleSchema.optional(),
});

export const OrganizationScheduleSchema = z.object({
  timezone: z.string().min(1, 'Timezone is required'),
  weekly: WeeklyScheduleSchema,
});

// ════════════════════════════════════════════════════════════════
// Contact Schema (Organization specific)
// ════════════════════════════════════════════════════════════════

export const OrganizationContactSchema = z.object({
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
});

// ════════════════════════════════════════════════════════════════
// Organization MVP Schema
// ════════════════════════════════════════════════════════════════

export const OrganizationMVPSchema = z.object({
  slug: z.string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50, 'Slug must be at most 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  name: z.string().min(1, 'Name is required'),
  location: OrganizationLocationSchema,
  contact: OrganizationContactSchema,
  schedule: OrganizationScheduleSchema,
  status: z.enum(['active', 'inactive']),
  isDefault: z.boolean(),
});

// ════════════════════════════════════════════════════════════════
// Create Organization Input Schema
// ════════════════════════════════════════════════════════════════

export const CreateOrganizationInputSchema = z.object({
  slug: z.string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50, 'Slug must be at most 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  name: z.string().min(1, 'Name is required'),
  location: OrganizationLocationSchema,
  contact: OrganizationContactSchema,
  schedule: OrganizationScheduleSchema.partial().optional(),
  isDefault: z.boolean().optional(),
});

// ════════════════════════════════════════════════════════════════
// Type exports from schemas
// ════════════════════════════════════════════════════════════════

export type OrganizationLocation = z.infer<typeof OrganizationLocationSchema>;
export type TimeBreak = z.infer<typeof TimeBreakSchema>;
export type DaySchedule = z.infer<typeof DayScheduleSchema>;
export type WeeklySchedule = z.infer<typeof WeeklyScheduleSchema>;
export type OrganizationSchedule = z.infer<typeof OrganizationScheduleSchema>;
export type OrganizationContact = z.infer<typeof OrganizationContactSchema>;
export type OrganizationMVP = z.infer<typeof OrganizationMVPSchema>;
export type CreateOrganizationInput = z.infer<typeof CreateOrganizationInputSchema>;
