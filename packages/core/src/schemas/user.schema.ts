import { z } from 'zod';

// ════════════════════════════════════════════════════════════════
// User Enums
// ════════════════════════════════════════════════════════════════

export const UserStatusSchema = z.enum(['active', 'inactive', 'suspended', 'pending', 'archived']);
export const IdTypeSchema = z.enum(['dni', 'passport', 'nie', 'other']);

// ════════════════════════════════════════════════════════════════
// User Preferences Schema
// ════════════════════════════════════════════════════════════════

export const UserPreferencesSchema = z.object({
  language: z.string().min(2).max(5), // 'es', 'en', 'en-US', etc.
  timezone: z.string(), // IANA timezone: 'Europe/Madrid'
  notifications: z.object({
    email: z.boolean(),
    sms: z.boolean(),
    push: z.boolean(),
    whatsapp: z.boolean(),
  }),
});

// ════════════════════════════════════════════════════════════════
// User Legal Schema
// ════════════════════════════════════════════════════════════════

export const UserLegalSchema = z.object({
  acceptedTerms: z.boolean(),
  acceptedPrivacy: z.boolean(),
  acceptedMarketing: z.boolean(),
  consentDate: z.date().optional(),
});

// ════════════════════════════════════════════════════════════════
// Provider Profile Schema
// ════════════════════════════════════════════════════════════════

export const ProviderProfileSchema = z.object({
  bio: z.string().optional(),
  specializations: z.array(z.string()),
  certifications: z.array(z.string()).optional(),
  schedule: z.any().optional(), // WeeklySchedule - complex type
});

// ════════════════════════════════════════════════════════════════
// Full User Schema
// ════════════════════════════════════════════════════════════════

export const UserSchema = z.object({
  // Identidad - Vínculo con Frontegg
  fronteggUserId: z.string().min(1, 'Frontegg User ID is required'),

  // Datos básicos
  email: z.string().email('Invalid email'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  imageUrl: z.string().url().optional(),

  // Datos adicionales
  phoneNumber: z.string().regex(/^\+\d{10,15}$/, 'Phone number must be in E.164 format').optional(),
  idNumber: z.string().optional(),
  idType: IdTypeSchema.optional(),
  birthDate: z.date().optional(),

  // Multi-org
  organizationIds: z.array(z.string()),
  primaryOrganizationId: z.string().optional(),

  // Estado
  status: UserStatusSchema,
  isVerified: z.boolean(),

  // Preferencias
  preferences: UserPreferencesSchema.optional(),

  // Legal
  legal: UserLegalSchema.optional(),

  // Provider
  providerProfile: ProviderProfileSchema.optional(),

  // Metadata
  lastLoginAt: z.date().optional(),
  createdBy: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ════════════════════════════════════════════════════════════════
// Create User Input Schema
// ════════════════════════════════════════════════════════════════

export const CreateUserInputSchema = z.object({
  // Identidad (required) - Vínculo con Frontegg
  fronteggUserId: z.string().min(1, 'Frontegg User ID is required'),
  email: z.string().email('Invalid email'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  imageUrl: z.string().url().optional(),

  // Datos adicionales (optional)
  phoneNumber: z.string().regex(/^\+\d{10,15}$/, 'Phone number must be in E.164 format').optional(),
  idNumber: z.string().optional(),
  idType: IdTypeSchema.optional(),
  birthDate: z.date().optional(),

  // Multi-org (optional)
  organizationIds: z.array(z.string()).optional(),
  primaryOrganizationId: z.string().optional(),

  // Estado (optional - defaults will be set in service)
  status: UserStatusSchema.optional(),
  isVerified: z.boolean().optional(),

  // Preferencias (optional)
  preferences: UserPreferencesSchema.optional(),

  // Legal (optional)
  legal: UserLegalSchema.optional(),

  // Provider (optional)
  providerProfile: ProviderProfileSchema.optional(),

  // Metadata (optional)
  createdBy: z.string().optional(),
});

// ════════════════════════════════════════════════════════════════
// Update User Input Schema
// ════════════════════════════════════════════════════════════════

export const UpdateUserInputSchema = z.object({
  // Datos básicos
  email: z.string().email('Invalid email').optional(),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  imageUrl: z.string().url().optional(),

  // Datos adicionales
  phoneNumber: z.string().regex(/^\+\d{10,15}$/, 'Phone number must be in E.164 format').optional(),
  idNumber: z.string().optional(),
  idType: IdTypeSchema.optional(),
  birthDate: z.date().optional(),

  // Multi-org
  organizationIds: z.array(z.string()).optional(),
  primaryOrganizationId: z.string().optional(),

  // Estado
  status: UserStatusSchema.optional(),
  isVerified: z.boolean().optional(),

  // Preferencias
  preferences: UserPreferencesSchema.optional(),

  // Legal
  legal: UserLegalSchema.optional(),

  // Provider
  providerProfile: ProviderProfileSchema.optional(),

  // Metadata
  lastLoginAt: z.date().optional(),
});

// ════════════════════════════════════════════════════════════════
// List Users Query Schema
// ════════════════════════════════════════════════════════════════

export const ListUsersQuerySchema = z.object({
  // Filtros
  status: z.union([UserStatusSchema, z.array(UserStatusSchema)]).optional(),
  organizationId: z.string().optional(),
  search: z.string().optional(),
  hasProviderProfile: z.boolean().optional(),

  // Paginación
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),

  // Ordenamiento
  sortBy: z.enum(['createdAt', 'updatedAt', 'firstName', 'lastName', 'email']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// ════════════════════════════════════════════════════════════════
// API-level Schemas (for controllers/endpoints)
// These include fields not stored in MongoDB but needed for API operations
// ════════════════════════════════════════════════════════════════

/**
 * API Create User Request - Used by tenant-api POST /users
 * Includes password and sendInvitation which are used for Frontegg operations
 */
export const CreateUserRequestSchema = z.object({
  email: z.string().email('Invalid email'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  phoneNumber: z.string().regex(/^\+\d{10,15}$/, 'Phone number must be in E.164 format').optional(),
  imageUrl: z.string().url().optional(),
  organizationIds: z.array(z.string()).optional(),
  sendInvitation: z.boolean().optional().default(false),
});

/**
 * API Update User Request - Used by tenant-api PUT /users/:fronteggUserId
 */
export const UpdateUserRequestSchema = z.object({
  email: z.string().email('Invalid email').optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phoneNumber: z.string().regex(/^\+\d{10,15}$/, 'Phone number must be in E.164 format').optional(),
  imageUrl: z.string().url().optional(),
  organizationIds: z.array(z.string()).optional(),
  status: UserStatusSchema.optional(),
});

/**
 * API List Users Query - Used by tenant-api GET /users
 * Coerces query strings to proper types
 */
export const ListUsersRequestSchema = z.object({
  status: UserStatusSchema.optional(),
  organizationId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  sortBy: z.enum(['createdAt', 'updatedAt', 'firstName', 'lastName', 'email']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// ════════════════════════════════════════════════════════════════
// Type exports from schemas
// ════════════════════════════════════════════════════════════════

export type UserStatus = z.infer<typeof UserStatusSchema>;
export type IdType = z.infer<typeof IdTypeSchema>;
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
export type UserLegal = z.infer<typeof UserLegalSchema>;
export type ProviderProfile = z.infer<typeof ProviderProfileSchema>;

export type User = z.infer<typeof UserSchema>;
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserInputSchema>;
export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>;

// API-level types
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;
export type ListUsersRequest = z.infer<typeof ListUsersRequestSchema>;
