# Bloque 2: Identidad (Autenticación)

**Estado:** En desarrollo
**Dependencias:** Bloque 1 (Fundación) - Completado
**Última actualización:** 2025-12-10

---

## Contenido

### Parte A: Arquitectura de Autenticación
1. [Visión General](#1-visión-general)
2. [Frontegg como Proveedor de Identidad](#2-frontegg-como-proveedor-de-identidad)
3. [Arquitectura de Apps](#3-arquitectura-de-apps)

### Parte B: Modelo de Datos
4. [User (Usuarios de Tenant)](#4-user-usuarios-de-tenant)
5. [GlobalUser (Usuarios de Serveflow)](#5-globaluser-usuarios-de-serveflow)

### Parte C: Flujos de Autenticación
6. [Flujo de Login](#6-flujo-de-login)
7. [Flujo de Creación de Usuario](#7-flujo-de-creación-de-usuario)
8. [Sincronización Frontegg ↔ MongoDB](#8-sincronización-frontegg--mongodb)

### Parte D: Implementación por App
9. [Apps Next.js (Dashboards + Webapp)](#9-apps-nextjs-dashboards--webapp)
10. [Apps NestJS (APIs)](#10-apps-nestjs-apis)

### Parte E: Decisiones
11. [Decisiones y Trade-offs](#11-decisiones-y-trade-offs)

---

## 1. Visión General

### El Problema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SERVEFLOW TIENE 5 APPS QUE NECESITAN AUTENTICACIÓN                         │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │ tenant/dashboard│  │  tenant/webapp  │  │ admin/dashboard │              │
│  │   (Next.js)     │  │   (Next.js)     │  │   (Next.js)     │              │
│  │   Puerto 4200   │  │   Puerto 4202   │  │   Puerto 4000   │              │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘              │
│           │                    │                    │                        │
│           ▼                    ▼                    ▼                        │
│  ┌─────────────────┐                      ┌─────────────────┐               │
│  │  tenant/server  │                      │   admin/server  │               │
│  │    (NestJS)     │                      │    (NestJS)     │               │
│  │   Puerto 3001   │                      │   Puerto 4001   │               │
│  └─────────────────┘                      └─────────────────┘               │
│                                                                              │
│  REQUISITO CRÍTICO: WHITE-LABEL MULTI-TENANT                                 │
│  • Cada tenant tiene usuarios COMPLETAMENTE AISLADOS                         │
│  • El mismo email puede existir en diferentes tenants                        │
│  • Cada tenant puede tener su propio branding de login                       │
│  • Los usuarios NO se comparten entre tenants                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### La Solución: Frontegg + MongoDB

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             FRONTEGG                                         │
│                    (Proveedor de Identidad White-Label)                      │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  • Login/Logout/Sesión por Tenant                                    │    │
│  │  • JWT tokens firmados con RS256 (verificación via JWKS)             │    │
│  │  • Usuarios aislados por Tenant (mismo email = usuarios distintos)   │    │
│  │  • SSO/SAML/MFA configurable por tenant                              │    │
│  │  • Roles y Permisos granulares                                       │    │
│  │  • Admin Portal embebido                                             │    │
│  │  • API REST para gestión de usuarios                                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                              API + JWKS                                      │
│                                    ▼                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                             MONGODB                                          │
│                    (Datos del Usuario)                                       │
│                                                                              │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐           │
│  │  db_serveflow_sys           │  │  db_tenant_{slug}           │           │
│  │  └── global_users           │  │  └── users                  │           │
│  │      • Admins Serveflow     │  │      • Usuarios del tenant  │           │
│  │      • Soporte              │  │      • Datos de negocio     │           │
│  │      • Partners             │  │      • Preferencias         │           │
│  └─────────────────────────────┘  └─────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Principio Fundamental: Separación de Concerns

| Responsabilidad | Frontegg | MongoDB |
|-----------------|----------|---------|
| **Autenticación** (¿quién eres?) | ✅ | ❌ |
| **Sesión** (¿estás logueado?) | ✅ | ❌ |
| **Datos básicos** (email, nombre) | ✅ | ✅ (copia) |
| **Datos de negocio** (teléfono, DNI) | ❌ | ✅ |
| **Membresías a sedes** | ❌ | ✅ |
| **Preferencias** | ❌ | ✅ |
| **Roles y Permisos** | ✅ | ❌ (lee de JWT) |

---

## 2. Frontegg como Proveedor de Identidad

### Modelo White-Label: Un Entorno por Tenant

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              MODELO WHITE-LABEL - USUARIOS COMPLETAMENTE AISLADOS            │
│                                                                              │
│  FRONTEGG                                       SERVEFLOW                    │
│  ────────                                       ─────────                    │
│                                                                              │
│  ┌─────────────────────────────┐               ┌─────────────────────────┐  │
│  │ Frontegg Tenant Environment │ ════════════► │      Tenant             │  │
│  │ tenant-abc.frontegg.com     │               │ slug: "gimnasio-demo"   │  │
│  │ clientId: xxx-yyy-zzz       │               │ fronteggTenantId: abc   │  │
│  │                             │               │ fronteggConfig: {       │  │
│  │  ┌───────────────────────┐  │               │   baseUrl, clientId     │  │
│  │  │ User: juan@mail.com   │  │               │ }                       │  │
│  │  │ Password: ****        │  │               └─────────────────────────┘  │
│  │  │ Roles: [Admin]        │  │                          │                 │
│  │  └───────────────────────┘  │                          │ tiene           │
│  │                             │                          ▼                 │
│  │  ┌───────────────────────┐  │               ┌─────────────────────────┐  │
│  │  │ User: maria@mail.com  │  │               │  db_tenant_gimnasio     │  │
│  │  │ Password: ****        │  │               │  └── users              │  │
│  │  │ Roles: [Member]       │  │               │      ├── juan@mail.com  │  │
│  │  └───────────────────────┘  │               │      └── maria@mail.com │  │
│  └─────────────────────────────┘               └─────────────────────────┘  │
│                                                                              │
│  ┌─────────────────────────────┐               ┌─────────────────────────┐  │
│  │ Frontegg Tenant Environment │ ════════════► │      Tenant             │  │
│  │ tenant-xyz.frontegg.com     │               │ slug: "spa-wellness"    │  │
│  │ clientId: aaa-bbb-ccc       │               │ fronteggTenantId: xyz   │  │
│  │                             │               │ fronteggConfig: {       │  │
│  │  ┌───────────────────────┐  │               │   baseUrl, clientId     │  │
│  │  │ User: juan@mail.com   │  │  ◄── MISMO    │ }                       │  │
│  │  │ Password: ****        │  │      EMAIL    └─────────────────────────┘  │
│  │  │ Roles: [Owner]        │  │      PERO                  │              │
│  │  └───────────────────────┘  │      USUARIO               │ tiene        │
│  │                             │      DIFERENTE             ▼              │
│  └─────────────────────────────┘               ┌─────────────────────────┐  │
│                                                │  db_tenant_spa          │  │
│                                                │  └── users              │  │
│  CLAVE: juan@mail.com en gimnasio-demo        │      └── juan@mail.com  │  │
│         es un USUARIO DIFERENTE de            └─────────────────────────┘  │
│         juan@mail.com en spa-wellness                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### ¿Por qué Frontegg?

| Requisito | Clerk | Auth0 | Frontegg |
|-----------|-------|-------|----------|
| **Usuarios aislados por tenant** | ❌ Pool compartido | ⚠️ Requiere múltiples tenants | ✅ Nativo |
| **White-label login** | ⚠️ Limitado | ✅ | ✅ |
| **Mismo email en diferentes tenants** | ❌ | ⚠️ | ✅ |
| **SDK para NestJS** | ❌ | ✅ | ✅ |
| **SDK para Next.js** | ✅ | ✅ | ✅ |
| **Admin Portal embebido** | ❌ | ❌ | ✅ |
| **RBAC granular** | ✅ | ✅ | ✅ |
| **AI Agent Integration** | ❌ | ❌ | ✅ |

### Qué guarda Frontegg vs MongoDB

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DISTRIBUCIÓN DE DATOS                               │
│                                                                              │
│  FRONTEGG (source of truth para auth)     MONGODB (source of truth datos)   │
│  ─────────────────────────────────────     ─────────────────────────────────│
│                                                                              │
│  ✅ email                              ✅ email (copia, sync via API)        │
│  ✅ name                               ✅ firstName, lastName (copia)        │
│  ✅ profilePictureUrl                  ✅ imageUrl (copia)                   │
│  ✅ password (hashed)                  ❌ nunca                              │
│  ✅ OAuth providers                    ❌ no lo necesitamos                  │
│  ✅ MFA settings                       ❌ no lo necesitamos                  │
│  ✅ Session tokens                     ❌ no lo necesitamos                  │
│  ✅ roles[]                            ❌ leemos del JWT                     │
│  ✅ permissions[]                      ❌ leemos del JWT                     │
│  ✅ tenantId                           ❌ implícito (DB separada)            │
│                                                                              │
│  ❌ phoneNumber                        ✅ phoneNumber (para WhatsApp)        │
│  ❌ idNumber (DNI)                     ✅ idNumber                           │
│  ❌ birthDate                          ✅ birthDate                          │
│  ❌ organizationIds (sedes)            ✅ organizationIds                    │
│  ❌ preferences                        ✅ preferences                        │
│  ❌ providerProfile                    ✅ providerProfile                    │
│  ❌ legal consent                      ✅ legal                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Arquitectura de Apps

### Mapa de Apps y Acceso

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           APPS DE TENANT                                     │
│                    (Acceso: Usuarios del tenant)                             │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                                                                     │     │
│  │   {tenant}.serveflow.app/dashboard  ──►  tenant/dashboard (4200)   │     │
│  │   Dashboard para admins del tenant                                  │     │
│  │   • Gestión de usuarios                                             │     │
│  │   • Gestión de reservas                                             │     │
│  │   • Configuración del negocio                                       │     │
│  │                                                                     │     │
│  │   {tenant}.serveflow.app/api/*  ──►  tenant/server (3001)           │     │
│  │   API backend del tenant                                            │     │
│  │   • CRUD usuarios                                                   │     │
│  │   • Lógica de negocio                                               │     │
│  │                                                                     │     │
│  │   {tenant}.serveflow.app  ──►  tenant/webapp (4202)                 │     │
│  │   App pública para clientes finales                                 │     │
│  │   • Ver servicios                                                   │     │
│  │   • Hacer reservas                                                  │     │
│  │   • Mi perfil                                                       │     │
│  │                                                                     │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                           APPS DE ADMIN                                      │
│                    (Acceso: Usuarios de Serveflow)                           │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                                                                     │     │
│  │   admin.serveflow.app  ──►  admin/dashboard (4000)                  │     │
│  │   Dashboard para admins de Serveflow                                │     │
│  │   • Gestión de tenants                                              │     │
│  │   • Usuarios globales                                               │     │
│  │   • Métricas de plataforma                                          │     │
│  │                                                                     │     │
│  │   admin.serveflow.app/api/*  ──►  admin/server (4001)               │     │
│  │   API backend de Serveflow                                          │     │
│  │   • CRUD tenants                                                    │     │
│  │   • CRUD global users                                               │     │
│  │                                                                     │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Flujo de Request por App

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TENANT APPS (dashboard, webapp)                           │
│                                                                              │
│  Request: gimnasio-demo.serveflow.app/dashboard                              │
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                 │
│  │   Browser    │────►│  Middleware  │────►│    Page      │                 │
│  │              │     │  (Next.js)   │     │  Component   │                 │
│  └──────────────┘     └──────────────┘     └──────────────┘                 │
│                              │                    │                          │
│                              │                    │                          │
│                              ▼                    ▼                          │
│                       ┌──────────────┐     ┌──────────────┐                 │
│                       │  1. Extraer  │     │  5. Obtener  │                 │
│                       │  tenant slug │     │  User de     │                 │
│                       │  del host    │     │  MongoDB     │                 │
│                       └──────────────┘     └──────────────┘                 │
│                              │                    ▲                          │
│                              ▼                    │                          │
│                       ┌──────────────┐     ┌──────────────┐                 │
│                       │  2. Obtener  │────►│  4. Decode   │                 │
│                       │  Frontegg    │     │  JWT payload │                 │
│                       │  access_token│     │  (userId,    │                 │
│                       │  de cookie   │     │  tenantId)   │                 │
│                       └──────────────┘     └──────────────┘                 │
│                              │                                               │
│                              ▼                                               │
│                       ┌──────────────┐                                      │
│                       │  3. Verificar│                                      │
│                       │  tenantId ==│                                       │
│                       │  fronteggId  │                                      │
│                       └──────────────┘                                      │
│                                                                              │
│  Resultado: Request tiene tenantSlug + fronteggUserId + User de MongoDB     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. User (Usuarios de Tenant)

### Ubicación

```
db_tenant_{slug}.users
```

Cada tenant tiene su propia colección de usuarios, **completamente aislada**.

### Arquitectura: Zod-First

Siguiendo los principios de [01-FUNDACION.md - Sección 5.5](./01-FUNDACION.md#55-arquitectura-de-código-zod-first):

- **Zod Schema** en `@serveflow/core` = Única fuente de verdad
- **Mongoose Schema** en `@serveflow/db` = Implementa el tipo de Zod
- **NO DTOs separados** = Usar ZodValidationPipe

### Definición: Zod Schema (Single Source of Truth)

```typescript
// packages/core/src/schemas/user.schema.ts
import { z } from 'zod';

// ════════════════════════════════════════════════════════════════
// ENUMS
// ════════════════════════════════════════════════════════════════

export const UserStatusSchema = z.enum([
  'active',
  'inactive',
  'suspended',
  'pending',
  'archived'
]);

export const IdTypeSchema = z.enum(['dni', 'passport', 'nie', 'other']);

// ════════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ════════════════════════════════════════════════════════════════

export const UserNotificationsSchema = z.object({
  email: z.boolean().default(true),
  sms: z.boolean().default(false),
  push: z.boolean().default(true),
  whatsapp: z.boolean().default(false),
});

export const UserPreferencesSchema = z.object({
  language: z.string().default('es'),
  timezone: z.string().default('Europe/Madrid'),
  notifications: UserNotificationsSchema.optional(),
});

export const UserLegalSchema = z.object({
  acceptedTerms: z.boolean().default(false),
  acceptedPrivacy: z.boolean().default(false),
  acceptedMarketing: z.boolean().default(false),
  consentDate: z.coerce.date().optional(),
});

export const ProviderProfileSchema = z.object({
  bio: z.string().max(500).optional(),
  specializations: z.array(z.string()).default([]),
  certifications: z.array(z.string()).optional(),
});

// ════════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ════════════════════════════════════════════════════════════════

export const UserSchema = z.object({
  _id: z.string().optional(),

  // ── IDENTIDAD ──────────────────────────────────────────────────
  // Vínculo con Frontegg
  fronteggUserId: z.string().min(1, 'Frontegg User ID is required'),

  // Datos básicos - Sincronizados desde Frontegg
  email: z.string().email().toLowerCase(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),

  // Estado
  status: UserStatusSchema.default('pending'),
  isVerified: z.boolean().default(false),

  // Multi-sede (organizations dentro del tenant)
  organizationIds: z.array(z.string()).default([]),

  // ── OPCIONAL ───────────────────────────────────────────────────
  imageUrl: z.string().url().optional(),
  primaryOrganizationId: z.string().optional(),
  createdBy: z.string().optional(),
  lastLoginAt: z.coerce.date().optional(),

  // Contacto adicional (no está en Frontegg)
  phoneNumber: z.string()
    .regex(/^\+\d{10,15}$/, 'Phone must be E.164 format: +34666555444')
    .optional(),

  // Documento de identidad
  idNumber: z.string().optional(),
  idType: IdTypeSchema.optional(),

  // Personal
  birthDate: z.coerce.date().optional(),

  // Preferencias
  preferences: UserPreferencesSchema.optional(),

  // Legal
  legal: UserLegalSchema.optional(),

  // Provider profile (solo para proveedores de servicios)
  providerProfile: ProviderProfileSchema.optional(),

  // Timestamps
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

// ════════════════════════════════════════════════════════════════
// INPUT SCHEMAS (para crear/actualizar)
// ════════════════════════════════════════════════════════════════

export const CreateUserRequestSchema = UserSchema.pick({
  email: true,
  firstName: true,
  lastName: true,
}).extend({
  imageUrl: z.string().url().optional(),
  phoneNumber: z.string().regex(/^\+\d{10,15}$/).optional(),
  organizationIds: z.array(z.string()).optional(),
});

export const UpdateUserRequestSchema = UserSchema.partial().omit({
  _id: true,
  fronteggUserId: true,  // No se puede cambiar
  createdAt: true,
  updatedAt: true,
});

export const ListUsersRequestSchema = z.object({
  status: UserStatusSchema.optional(),
  organizationId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// ════════════════════════════════════════════════════════════════
// TIPOS INFERIDOS (NO interfaces manuales)
// ════════════════════════════════════════════════════════════════

export type User = z.infer<typeof UserSchema>;
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;
export type ListUsersRequest = z.infer<typeof ListUsersRequestSchema>;
export type UserStatus = z.infer<typeof UserStatusSchema>;
```

### Definición: Mongoose Schema

```typescript
// packages/db/src/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, unique: true, index: true })
  fronteggUserId!: string;

  @Prop({ required: true, lowercase: true, index: true })
  email!: string;

  @Prop({ required: true })
  firstName!: string;

  @Prop({ required: true })
  lastName!: string;

  @Prop({
    required: true,
    enum: ['active', 'inactive', 'suspended', 'pending', 'archived'],
    default: 'pending',
    index: true
  })
  status!: string;

  @Prop({ default: false })
  isVerified!: boolean;

  @Prop({ type: [String], default: [], index: true })
  organizationIds!: string[];

  @Prop()
  imageUrl?: string;

  @Prop()
  primaryOrganizationId?: string;

  @Prop()
  createdBy?: string;

  @Prop()
  lastLoginAt?: Date;

  @Prop({ sparse: true })
  phoneNumber?: string;

  @Prop()
  idNumber?: string;

  @Prop({ enum: ['dni', 'passport', 'nie', 'other'] })
  idType?: string;

  @Prop()
  birthDate?: Date;

  @Prop({ type: Object })
  preferences?: Record<string, unknown>;

  @Prop({ type: Object })
  legal?: Record<string, unknown>;

  @Prop({ type: Object })
  providerProfile?: Record<string, unknown>;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Índices
UserSchema.index({ phoneNumber: 1 }, { sparse: true });
```

### Índices en MongoDB

```javascript
// Configurados automáticamente por Mongoose decorators
{ fronteggUserId: 1 }                 // unique - lookup principal
{ email: 1 }                          // búsqueda por email
{ status: 1 }                         // filtrar por estado
{ organizationIds: 1 }                // usuarios de una sede
{ phoneNumber: 1 }                    // sparse - para WhatsApp
```

---

## 5. GlobalUser (Usuarios de Serveflow)

### Ubicación

```
db_serveflow_sys.global_users
```

Usuarios que operan a nivel de plataforma, **no pertenecen a ningún tenant**.

### Definición: Zod Schema

```typescript
// packages/core/src/schemas/global-user.schema.ts
import { z } from 'zod';

export const GlobalUserStatusSchema = z.enum(['active', 'inactive', 'suspended']);

export const TenantAccessSchema = z.object({
  tenantId: z.string(),
  tenantSlug: z.string(),
  grantedAt: z.coerce.date(),
  grantedBy: z.string(),
});

export const GlobalUserSchema = z.object({
  _id: z.string().optional(),

  // Identidad - Vínculo con Frontegg (entorno de admin)
  fronteggUserId: z.string().min(1, 'Frontegg User ID is required'),
  email: z.string().email().toLowerCase(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  imageUrl: z.string().url().optional(),

  // Estado
  status: GlobalUserStatusSchema.default('active'),

  // Acceso a tenants (para soporte/partners)
  accessibleTenants: z.array(TenantAccessSchema).optional(),

  // Metadata
  lastLoginAt: z.coerce.date().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export type GlobalUser = z.infer<typeof GlobalUserSchema>;
export type GlobalUserStatus = z.infer<typeof GlobalUserStatusSchema>;
export type TenantAccess = z.infer<typeof TenantAccessSchema>;
```

### User vs GlobalUser

| Aspecto | User | GlobalUser |
|---------|------|------------|
| **Base de datos** | `db_tenant_{slug}.users` | `db_serveflow_sys.global_users` |
| **Scope** | Un solo tenant | Plataforma completa |
| **Acceso a apps** | tenant/* | admin/* |
| **Multi-tenant** | No (aislado) | Sí (puede ver múltiples) |
| **Frontegg env** | Entorno del tenant | Entorno de admin |

---

## 6. Flujo de Login

### Tenant Dashboard/Webapp

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  FLUJO DE LOGIN - TENANT                                                     │
│                                                                              │
│  1. Usuario accede a gimnasio-demo.serveflow.app/dashboard                   │
│                                                                              │
│  ┌────────────┐                                                              │
│  │  Browser   │                                                              │
│  │  accede    │                                                              │
│  └─────┬──────┘                                                              │
│        │                                                                     │
│        ▼                                                                     │
│  ┌────────────────────────────────────────────────────────────────┐         │
│  │  2. MIDDLEWARE (Next.js)                                        │         │
│  │     ├── Extrae tenant: "gimnasio-demo" del host                 │         │
│  │     ├── Busca fe_access_token en cookies                        │         │
│  │     └── Si no hay token → redirect a /sign-in                   │         │
│  └────────────────────────────────────────────────────────────────┘         │
│        │                                                                     │
│        ▼                                                                     │
│  ┌────────────────────────────────────────────────────────────────┐         │
│  │  3. FRONTEGG LOGIN                                              │         │
│  │     ├── FronteggAppProvider carga config del tenant             │         │
│  │     ├── useLoginWithRedirect() → Frontegg hosted login          │         │
│  │     └── Usuario introduce credenciales                          │         │
│  └────────────────────────────────────────────────────────────────┘         │
│        │                                                                     │
│        ▼                                                                     │
│  ┌────────────────────────────────────────────────────────────────┐         │
│  │  4. FRONTEGG CALLBACK                                           │         │
│  │     ├── Frontegg valida credenciales                            │         │
│  │     ├── Genera JWT con: sub, email, tenantId, roles, perms      │         │
│  │     └── Guarda access_token en cookie: fe_access_token          │         │
│  └────────────────────────────────────────────────────────────────┘         │
│        │                                                                     │
│        ▼                                                                     │
│  ┌────────────────────────────────────────────────────────────────┐         │
│  │  5. VERIFICACIÓN DE MEMBRESÍA                                   │         │
│  │     ├── Middleware decodifica JWT                               │         │
│  │     ├── Extrae tenantId del token                               │         │
│  │     ├── Verifica: token.tenantId === tenant.fronteggTenantId    │         │
│  │     └── Si no coincide → 403 Forbidden                          │         │
│  └────────────────────────────────────────────────────────────────┘         │
│        │                                                                     │
│        ▼                                                                     │
│  ┌────────────────────────────────────────────────────────────────┐         │
│  │  6. OBTENER USER DE MONGODB                                     │         │
│  │     ├── Llama a API: GET /api/users/me                          │         │
│  │     ├── Bearer token en header                                  │         │
│  │     ├── API busca user por fronteggUserId en db_tenant_{slug}   │         │
│  │     └── Si no existe → USER_NOT_FOUND (nuevo usuario)           │         │
│  └────────────────────────────────────────────────────────────────┘         │
│        │                                                                     │
│        ▼                                                                     │
│  ┌────────────────────────────────────────────────────────────────┐         │
│  │  7. RENDERIZAR DASHBOARD                                        │         │
│  │     ├── User disponible en contexto                             │         │
│  │     ├── Roles/permisos del JWT para UI                          │         │
│  │     └── Datos de negocio de MongoDB                             │         │
│  └────────────────────────────────────────────────────────────────┘         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Flujo de Creación de Usuario

### Flujo Directo (API → Frontegg + MongoDB)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  FLUJO DIRECTO - SIN WEBHOOKS                                                │
│                                                                              │
│  Admin crea usuario desde dashboard:                                         │
│                                                                              │
│  ┌────────────┐     ┌────────────┐     ┌────────────┐                       │
│  │  Dashboard │────►│  API Call  │────►│  NestJS    │                       │
│  │  (React)   │     │ POST /users│     │  Controller│                       │
│  └────────────┘     └────────────┘     └────────────┘                       │
│                                               │                              │
│                                               ▼                              │
│  ┌───────────────────────────────────────────────────────────────┐          │
│  │  UsersService.create()                                         │          │
│  │                                                                │          │
│  │  1. Verificar email no existe en MongoDB                       │          │
│  │     └── getUserByEmail(userModel, dto.email)                   │          │
│  │                                                                │          │
│  │  2. Crear usuario en Frontegg                                  │          │
│  │     └── createFronteggUser({                                   │          │
│  │           email: dto.email,                                    │          │
│  │           name: `${dto.firstName} ${dto.lastName}`,            │          │
│  │           tenantId: fronteggTenantId,                          │          │
│  │         })                                                     │          │
│  │     └── Frontegg devuelve: { id, email, verified, ... }        │          │
│  │                                                                │          │
│  │  3. Crear usuario en MongoDB                                   │          │
│  │     └── createUserInDb(userModel, {                            │          │
│  │           fronteggUserId: fronteggUser.id,                     │          │
│  │           email: dto.email,                                    │          │
│  │           firstName: dto.firstName,                            │          │
│  │           ...                                                  │          │
│  │         })                                                     │          │
│  │                                                                │          │
│  │  4. Retornar usuario creado                                    │          │
│  │                                                                │          │
│  └───────────────────────────────────────────────────────────────┘          │
│                                                                              │
│  VENTAJAS:                                                                   │
│  • Transaccional: Si Frontegg falla, no creamos en MongoDB                   │
│  • Sin latencia de webhooks                                                  │
│  • Resultado inmediato                                                       │
│  • Más simple de debuggear                                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Sincronización Frontegg ↔ MongoDB

### Estrategia: API Directa (No Webhooks)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SINCRONIZACIÓN - FLUJO DIRECTO                                              │
│                                                                              │
│  OPERACIÓN          FRONTEGG               MONGODB                           │
│  ─────────────────────────────────────────────────────────────────────────── │
│                                                                              │
│  CREATE USER        1. API: createFronteggUser()                             │
│                     2. API: createUserInDb()                                 │
│                     Resultado: Usuario en ambos sistemas                     │
│                                                                              │
│  UPDATE USER        1. API: updateFronteggUser() [name, metadata]            │
│                     2. API: updateUser()         [todos los campos]          │
│                     Resultado: Datos sync                                    │
│                                                                              │
│  DELETE USER        1. API: deleteFronteggUser()                             │
│                     2. API: deleteUserFromDb()                               │
│                     Resultado: Usuario eliminado de ambos                    │
│                                                                              │
│  LOGIN (OAuth)      Frontegg maneja internamente                             │
│  CHANGE PASSWORD    Frontegg maneja internamente                             │
│  MFA                Frontegg maneja internamente                             │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────── │
│                                                                              │
│  DATOS QUE SE SINCRONIZAN:                                                   │
│  • email, name → Frontegg + MongoDB                                          │
│  • profilePictureUrl → Frontegg (se copia a MongoDB como imageUrl)           │
│                                                                              │
│  DATOS SOLO EN MONGODB:                                                      │
│  • phoneNumber, idNumber, birthDate                                          │
│  • organizationIds, preferences, legal                                       │
│  • providerProfile                                                           │
│                                                                              │
│  DATOS SOLO EN FRONTEGG:                                                     │
│  • password (hashed)                                                         │
│  • OAuth connections                                                         │
│  • MFA settings                                                              │
│  • Session tokens                                                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Apps Next.js (Dashboards + Webapp)

### Estructura de Autenticación

```
apps/tenant/dashboard/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # FronteggAppProvider
│   │   ├── (auth)/
│   │   │   ├── sign-in/page.tsx    # useLoginWithRedirect
│   │   │   ├── sign-up/page.tsx    # useLoginWithRedirect({ type: 'signup' })
│   │   │   ├── sso-callback/       # OAuth callback
│   │   │   └── verify/             # Email verification
│   │   └── (dashboard)/            # Rutas protegidas
│   ├── middleware.ts               # Verificación de token + tenant
│   └── lib/
│       ├── get-tenant.ts           # Resolver tenant desde headers
│       └── get-current-user.ts     # Obtener user de API
```

### middleware.ts

```typescript
// apps/tenant/dashboard/src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicRoutes = ['/sign-in', '/sign-up', '/sso-callback', '/verify'];

function extractTenantSlug(host: string): string | null {
  if (host.includes('localhost')) {
    const parts = host.split('.');
    if (parts.length >= 2 && parts[0] !== 'localhost') {
      return parts[0];
    }
    return process.env.DEV_TENANT_SLUG || null;
  }
  const parts = host.split('.');
  return parts.length >= 3 ? parts[0] : null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get('host') || '';
  const tenantSlug = extractTenantSlug(host);

  // Public routes - allow without auth
  if (publicRoutes.some(r => pathname.startsWith(r))) {
    const response = NextResponse.next();
    if (tenantSlug) response.headers.set('x-tenant-slug', tenantSlug);
    return response;
  }

  // Get Frontegg access token from cookies
  const accessToken =
    req.cookies.get(`fe_access_token_${tenantSlug}`)?.value ||
    req.cookies.get('fe_access_token')?.value;

  if (!accessToken) {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  // Inject headers for Server Components
  const response = NextResponse.next();
  if (tenantSlug) response.headers.set('x-tenant-slug', tenantSlug);
  return response;
}
```

### layout.tsx

```typescript
// apps/tenant/dashboard/src/app/layout.tsx
import { FronteggAppProvider } from '@frontegg/nextjs/app';
import { getTenantFromHeaders } from '../lib/get-tenant';

export default async function RootLayout({ children }) {
  const { tenant } = await getTenantFromHeaders();

  const fronteggBaseUrl = tenant?.fronteggConfig?.baseUrl || process.env.FRONTEGG_BASE_URL;
  const fronteggClientId = tenant?.fronteggConfig?.clientId || process.env.FRONTEGG_CLIENT_ID;

  return (
    <html lang="es">
      <body>
        <FronteggAppProvider
          hostedLoginBox={false}
          authOptions={{
            baseUrl: fronteggBaseUrl,
            clientId: fronteggClientId,
            keepSessionAlive: true,
          }}
        >
          {children}
        </FronteggAppProvider>
      </body>
    </html>
  );
}
```

---

## 10. Apps NestJS (APIs)

### Estructura de Autenticación

```
apps/tenant/server/
├── src/
│   ├── app/
│   │   └── app.module.ts           # FronteggAuthGuard global
│   └── users/
│       ├── users.controller.ts     # @RequireTenant, @CurrentUser
│       └── users.service.ts        # Integración Frontegg API
```

### FronteggAuthGuard

```typescript
// packages/auth/src/guards/frontegg-auth.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';

@Injectable()
export class FronteggAuthGuard implements CanActivate {
  private jwksClient: jwksClient.JwksClient;
  private baseUrl: string;

  constructor(private reflector: Reflector) {
    this.baseUrl = process.env.FRONTEGG_BASE_URL || '';
    this.jwksClient = jwksClient({
      jwksUri: `${this.baseUrl}/.well-known/jwks.json`,
      cache: true,
      cacheMaxAge: 86400000, // 24 hours
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if public
    const isPublic = this.reflector.getAllAndOverride('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const token = authHeader.substring(7);
    const decoded = await this.verifyToken(token);

    // Inject user info into request
    request.user = {
      fronteggUserId: decoded.sub,
      email: decoded.email,
      tenantId: decoded.tenantId,
      roles: decoded.roles || [],
      permissions: decoded.permissions || [],
    };

    request.auth = {
      userId: decoded.sub,
      tenantId: decoded.tenantId,
      roles: decoded.roles || [],
      permissions: decoded.permissions || [],
    };

    // Check tenant requirement
    const requireTenant = this.reflector.getAllAndOverride('requireTenant', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requireTenant && !decoded.tenantId) {
      throw new ForbiddenException('Tenant context required');
    }

    return true;
  }

  private async verifyToken(token: string): Promise<FronteggJwtPayload> {
    return new Promise((resolve, reject) => {
      const getKey = (header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) => {
        this.jwksClient.getSigningKey(header.kid, (err, key) => {
          if (err) return callback(err);
          callback(null, key?.getPublicKey());
        });
      };

      jwt.verify(token, getKey, { algorithms: ['RS256'], issuer: this.baseUrl },
        (err, decoded) => err ? reject(err) : resolve(decoded as FronteggJwtPayload)
      );
    });
  }
}
```

### Decorators

```typescript
// packages/auth/src/decorators/auth.decorator.ts
import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const REQUIRE_TENANT_KEY = 'requireTenant';
export const ROLES_KEY = 'roles';
export const PERMISSIONS_KEY = 'permissions';

// @Public() - Skip authentication
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// @RequireTenant() - Require tenant context
export const RequireTenant = () => SetMetadata(REQUIRE_TENANT_KEY, true);

// @Roles('Admin', 'Owner') - Require specific roles
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// @Permissions('users.read') - Require specific permissions
export const Permissions = (...perms: string[]) => SetMetadata(PERMISSIONS_KEY, perms);

// @CurrentUser() - Get authenticated user
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  }
);

// @CurrentTenantId() - Get current tenant ID
export const CurrentTenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.auth?.tenantId;
  }
);
```

---

## 11. Decisiones y Trade-offs

### Decisión 1: Frontegg en vez de Clerk

| Factor | Clerk | Frontegg |
|--------|-------|----------|
| Aislamiento de usuarios | ❌ Pool compartido | ✅ Por tenant |
| Mismo email multi-tenant | ❌ | ✅ |
| White-label | ⚠️ | ✅ |
| Admin Portal | ❌ | ✅ |

**Decisión:** Frontegg permite el modelo white-label donde cada tenant tiene usuarios completamente aislados.

### Decisión 2: API Directa en vez de Webhooks

| Factor | Webhooks | API Directa |
|--------|----------|-------------|
| Latencia | Alta (async) | Baja (sync) |
| Complejidad | Alta | Baja |
| Debugging | Difícil | Fácil |
| Transaccionalidad | No | Sí |

**Decisión:** Flujo directo API → Frontegg + MongoDB en el mismo request.

### Decisión 3: JWT con JWKS Verification

| Factor | Descripción |
|--------|-------------|
| Algoritmo | RS256 (asimétrico) |
| Verificación | Via JWKS endpoint |
| Caché | 24 horas |
| Claims | sub, email, tenantId, roles, permissions |

**Decisión:** Verificación de tokens via JWKS para máxima seguridad sin compartir secretos.

### Decisión 4: fronteggConfig por Tenant

Cada tenant puede tener su propio entorno de Frontegg:

```typescript
interface TenantMVP {
  fronteggTenantId: string;
  fronteggConfig?: {
    baseUrl: string;   // https://tenant-abc.frontegg.com
    clientId: string;  // Specific client for this tenant
  };
}
```

**Decisión:** Permite white-labeling completo donde cada tenant tiene su propia URL de login.

---

## Variables de Entorno

```env
# Frontegg (valores por defecto / desarrollo)
FRONTEGG_BASE_URL=https://app-xxx.frontegg.com
FRONTEGG_CLIENT_ID=your-client-id
FRONTEGG_API_KEY=your-api-key

# Desarrollo local
DEV_TENANT_SLUG=demo

# API URLs
TENANT_API_URL=http://localhost:3001
```

---

## Resumen de Packages

| Package | Exports | Uso |
|---------|---------|-----|
| `@serveflow/auth` | Types, Frontegg API functions | Client-safe |
| `@serveflow/auth/server` | FronteggAuthGuard, Decorators | NestJS only |
| `@serveflow/core` | Zod schemas, types | Everywhere |
| `@serveflow/db` | Mongoose schemas, operations | Server only |
| `@serveflow/tenants` | TenantMiddleware, resolvers | Server only |
