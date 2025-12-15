import { z } from 'zod';

// ════════════════════════════════════════════════════════════════
// Global User Status
// ════════════════════════════════════════════════════════════════

export const GlobalUserStatusSchema = z.enum(['active', 'inactive', 'suspended']);

// ════════════════════════════════════════════════════════════════
// Tenant Access Entry Schema
// ════════════════════════════════════════════════════════════════

export const TenantAccessEntrySchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  tenantSlug: z.string().min(1, 'Tenant slug is required'),
  grantedAt: z.date(),
  grantedBy: z.string().min(1, 'Granted by is required'),
});

// ════════════════════════════════════════════════════════════════
// Full GlobalUser Schema
// Ubicación: db_serveflow_sys.global_users
// ════════════════════════════════════════════════════════════════

export const GlobalUserSchema = z.object({
  // ════════════════════════════════════════════════════════════════
  // IDENTIDAD - Vínculos con FusionAuth
  // ════════════════════════════════════════════════════════════════

  fusionauthUserId: z.string().min(1, 'FusionAuth User ID is required'),
  email: z.string().email('Invalid email'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  imageUrl: z.string().url().optional(),

  // ════════════════════════════════════════════════════════════════
  // ESTADO
  // ════════════════════════════════════════════════════════════════

  status: GlobalUserStatusSchema,

  // ════════════════════════════════════════════════════════════════
  // ACCESO A TENANTS - Para soporte/partners
  // ════════════════════════════════════════════════════════════════

  accessibleTenants: z.array(TenantAccessEntrySchema).optional(),

  // ════════════════════════════════════════════════════════════════
  // METADATA
  // ════════════════════════════════════════════════════════════════

  lastLoginAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ════════════════════════════════════════════════════════════════
// Create GlobalUser Input Schema
// ════════════════════════════════════════════════════════════════

export const CreateGlobalUserInputSchema = z.object({
  fusionauthUserId: z.string().min(1, 'FusionAuth User ID is required'),
  email: z.string().email('Invalid email'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  imageUrl: z.string().url().optional(),
  status: GlobalUserStatusSchema.optional().default('active'),
});

// ════════════════════════════════════════════════════════════════
// Update GlobalUser Input Schema
// ════════════════════════════════════════════════════════════════

export const UpdateGlobalUserInputSchema = z.object({
  email: z.string().email('Invalid email').optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  imageUrl: z.string().url().optional(),
  status: GlobalUserStatusSchema.optional(),
  lastLoginAt: z.date().optional(),
});

// ════════════════════════════════════════════════════════════════
// Grant Tenant Access Input Schema
// ════════════════════════════════════════════════════════════════

export const GrantTenantAccessInputSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  tenantSlug: z.string().min(1, 'Tenant slug is required'),
  grantedBy: z.string().min(1, 'Granted by is required'),
});

// ════════════════════════════════════════════════════════════════
// List GlobalUsers Query Schema
// ════════════════════════════════════════════════════════════════

export const ListGlobalUsersQuerySchema = z.object({
  // Filtros
  status: z.union([GlobalUserStatusSchema, z.array(GlobalUserStatusSchema)]).optional(),
  search: z.string().optional(),

  // Paginación
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),

  // Ordenamiento
  sortBy: z.enum(['createdAt', 'updatedAt', 'firstName', 'lastName', 'email']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// ════════════════════════════════════════════════════════════════
// Type exports from schemas
// ════════════════════════════════════════════════════════════════

export type GlobalUserStatus = z.infer<typeof GlobalUserStatusSchema>;
export type TenantAccessEntry = z.infer<typeof TenantAccessEntrySchema>;
export type GlobalUser = z.infer<typeof GlobalUserSchema>;
export type CreateGlobalUserInput = z.infer<typeof CreateGlobalUserInputSchema>;
export type UpdateGlobalUserInput = z.infer<typeof UpdateGlobalUserInputSchema>;
export type GrantTenantAccessInput = z.infer<typeof GrantTenantAccessInputSchema>;
export type ListGlobalUsersQuery = z.infer<typeof ListGlobalUsersQuerySchema>;
