import type { BaseDocument, WeeklySchedule } from './common';

// ════════════════════════════════════════════════════════════════
// User (Usuarios de Tenant)
// Ubicación: db_tenant_{slug}.users
// ════════════════════════════════════════════════════════════════

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending' | 'archived';
export type IdType = 'dni' | 'passport' | 'nie' | 'other';

export interface User extends BaseDocument {
  // ════════════════════════════════════════════════════════════════
  // IDENTIDAD - Vínculos externos
  // ════════════════════════════════════════════════════════════════

  fusionauthUserId: string; // ID único en FusionAuth
  unifiedId?: string; // ID de @serveflow/identity (para WhatsApp, etc.)

  // ════════════════════════════════════════════════════════════════
  // DATOS BÁSICOS - Sincronizados desde FusionAuth
  // ════════════════════════════════════════════════════════════════

  email: string;
  firstName: string;
  lastName: string;
  imageUrl?: string;

  // ════════════════════════════════════════════════════════════════
  // DATOS ADICIONALES - Solo en MongoDB (FusionAuth no los tiene)
  // ════════════════════════════════════════════════════════════════

  phoneNumber?: string; // Para WhatsApp/SMS (E.164: +34666555444)
  idNumber?: string; // DNI/Pasaporte
  idType?: IdType;
  birthDate?: Date;

  // ════════════════════════════════════════════════════════════════
  // MULTI-ORGANIZACIÓN (sedes dentro del tenant)
  // ════════════════════════════════════════════════════════════════

  organizationIds: string[]; // ObjectIds de organizations a las que pertenece
  primaryOrganizationId?: string; // Sede por defecto

  // ════════════════════════════════════════════════════════════════
  // ESTADO
  // ════════════════════════════════════════════════════════════════

  status: UserStatus;
  isVerified: boolean; // Email verificado en FusionAuth

  // ════════════════════════════════════════════════════════════════
  // PREFERENCIAS
  // ════════════════════════════════════════════════════════════════

  preferences?: {
    language: string; // 'es', 'en', etc.
    timezone: string; // 'Europe/Madrid'
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
      whatsapp: boolean;
    };
  };

  // ════════════════════════════════════════════════════════════════
  // LEGAL
  // ════════════════════════════════════════════════════════════════

  legal?: {
    acceptedTerms: boolean;
    acceptedPrivacy: boolean;
    acceptedMarketing: boolean;
    consentDate?: Date;
  };

  // ════════════════════════════════════════════════════════════════
  // PROVIDER PROFILE (opcional - solo para proveedores de servicios)
  // ════════════════════════════════════════════════════════════════

  providerProfile?: {
    bio?: string;
    specializations: string[];
    certifications?: string[];
    schedule?: WeeklySchedule; // Disponibilidad
  };

  // ════════════════════════════════════════════════════════════════
  // METADATA
  // ════════════════════════════════════════════════════════════════

  lastLoginAt?: Date;
  createdBy?: string; // clerkId del admin que lo creó
}

// ════════════════════════════════════════════════════════════════
// DTOs - Create User Input
// ════════════════════════════════════════════════════════════════

export interface CreateUserInput {
  // Identidad
  fusionauthUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  imageUrl?: string;

  // Datos adicionales opcionales
  phoneNumber?: string;
  idNumber?: string;
  idType?: IdType;
  birthDate?: Date;

  // Multi-org
  organizationIds?: string[];
  primaryOrganizationId?: string;

  // Estado
  status?: UserStatus;
  isVerified?: boolean;

  // Preferencias
  preferences?: User['preferences'];

  // Legal
  legal?: User['legal'];

  // Provider
  providerProfile?: User['providerProfile'];

  // Metadata
  createdBy?: string;
}

// ════════════════════════════════════════════════════════════════
// DTOs - Update User Input
// ════════════════════════════════════════════════════════════════

export interface UpdateUserInput {
  // Datos básicos
  email?: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;

  // Datos adicionales
  phoneNumber?: string;
  idNumber?: string;
  idType?: IdType;
  birthDate?: Date;

  // Multi-org
  organizationIds?: string[];
  primaryOrganizationId?: string;

  // Estado
  status?: UserStatus;
  isVerified?: boolean;

  // Preferencias
  preferences?: User['preferences'];

  // Legal
  legal?: User['legal'];

  // Provider
  providerProfile?: User['providerProfile'];

  // Metadata
  lastLoginAt?: Date;
}

// ════════════════════════════════════════════════════════════════
// DTOs - List Users Query
// ════════════════════════════════════════════════════════════════

export interface ListUsersQuery {
  // Filtros
  status?: UserStatus | UserStatus[];
  organizationId?: string;
  search?: string; // Buscar por email, nombre
  hasProviderProfile?: boolean;

  // Paginación
  page?: number;
  limit?: number;

  // Ordenamiento
  sortBy?: 'createdAt' | 'updatedAt' | 'firstName' | 'lastName' | 'email';
  sortOrder?: 'asc' | 'desc';
}
