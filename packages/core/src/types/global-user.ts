import type { BaseDocument } from './common';

// ════════════════════════════════════════════════════════════════
// Global User (Usuarios de Serveflow)
// Ubicación: db_serveflow_sys.global_users
//
// IMPORTANTE: El "tipo" (admin, soporte, partner) vendrá del ROL
// en Bloque 3 (RBAC). NO hardcodeamos tipos aquí - mantenemos el
// modelo flexible.
// ════════════════════════════════════════════════════════════════

export type GlobalUserStatus = 'active' | 'inactive' | 'suspended';

export interface GlobalUser extends BaseDocument {
  // ════════════════════════════════════════════════════════════════
  // IDENTIDAD - Igual que User
  // ════════════════════════════════════════════════════════════════

  clerkId: string; // ID único en Clerk
  email: string;
  firstName: string;
  lastName: string;
  imageUrl?: string;

  // ════════════════════════════════════════════════════════════════
  // ESTADO - Igual que User
  // ════════════════════════════════════════════════════════════════

  status: GlobalUserStatus;

  // ════════════════════════════════════════════════════════════════
  // ACCESO A TENANTS - Específico de GlobalUser
  // ════════════════════════════════════════════════════════════════

  // Para soporte/partners que necesitan acceder a tenants específicos
  accessibleTenants?: {
    tenantId: string; // ObjectId del tenant
    tenantSlug: string; // Para display/routing
    grantedAt: Date;
    grantedBy: string; // clerkId de quien dio acceso
  }[];

  // ════════════════════════════════════════════════════════════════
  // METADATA
  // ════════════════════════════════════════════════════════════════

  lastLoginAt?: Date;
}

// ════════════════════════════════════════════════════════════════
// DTOs - Create Global User Input
// ════════════════════════════════════════════════════════════════

export interface CreateGlobalUserInput {
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  imageUrl?: string;
  status?: GlobalUserStatus;
}

// ════════════════════════════════════════════════════════════════
// DTOs - Update Global User Input
// ════════════════════════════════════════════════════════════════

export interface UpdateGlobalUserInput {
  email?: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  status?: GlobalUserStatus;
  lastLoginAt?: Date;
}

// ════════════════════════════════════════════════════════════════
// DTOs - Grant Tenant Access
// ════════════════════════════════════════════════════════════════

export interface GrantTenantAccessInput {
  tenantId: string;
  tenantSlug: string;
  grantedBy: string; // clerkId del admin que otorga acceso
}
