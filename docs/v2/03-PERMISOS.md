# Bloque 3: Permisos y Autorización

**Estado:** En desarrollo
**Última actualización:** 2025-12-20
**Dependencias:** Bloque 2 (Identidad con FusionAuth)

---

## Índice

1. [Visión General](#1-visión-general)
2. [Arquitectura RBAC](#2-arquitectura-rbac)
3. [Modelo de Datos](#3-modelo-de-datos)
4. [Sistema de Role Templates](#4-sistema-de-role-templates)
5. [Flujos de Usuarios](#5-flujos-de-usuarios)
6. [Flujos de Autorización](#6-flujos-de-autorización)
7. [Gestión de Permisos y Recursos](#7-gestión-de-permisos-y-recursos)
8. [Escenario Completo: Gimnasio 20 Sedes](#8-escenario-completo-gimnasio-20-sedes)
9. [Implementación Técnica](#9-implementación-técnica)
10. [Decisiones y Trade-offs](#10-decisiones-y-trade-offs)

---

## 1. Visión General

### El Problema

Serveflow es un SaaS B2B2C multi-tenant donde:
- Cada **Tenant** (negocio) tiene su propia configuración de roles y permisos
- Un Tenant puede tener múltiples **Organizations** (sedes/sucursales)
- Los usuarios pueden pertenecer a todo el Tenant o solo a ciertas Organizations
- Cada Tenant quiere personalizar qué roles existen y qué pueden hacer

### La Solución: RBAC Dinámico

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SISTEMA RBAC DE SERVEFLOW                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   1. ROLE TEMPLATES (Plantillas Base)                                       │
│   ────────────────────────────────────                                       │
│   Serveflow proporciona plantillas predefinidas:                            │
│   • admin, employee, provider, client                                       │
│   Cada tenant puede: usarlas, modificarlas, crear nuevas                    │
│                                                                              │
│   2. SEPARACIÓN DE CONCEPTOS                                                │
│   ───────────────────────────                                                │
│   • ROL = Qué ES el usuario (admin, employee, provider, client)             │
│   • ACCESO = A qué APPS puede entrar (Dashboard, WebApp)                    │
│   • PERMISO = Qué puede HACER (create:booking, delete:resource)             │
│   • SCOPE = En qué ÁMBITO (todo el tenant, solo una organization)           │
│                                                                              │
│   3. COMPONENTES                                                            │
│   ──────────────                                                             │
│   • FusionAuth: Identidad + Roles + Acceso a Apps                           │
│   • Cerbos: Permisos granulares + Condiciones                               │
│   • MongoDB: Configuración + Datos de negocio                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Principio Core

> **"Todo es una plantilla personalizable. No hardcodeamos roles ni permisos.
> Cada tenant puede adaptar el sistema a su negocio."**

---

## 2. Arquitectura RBAC

### Stack Tecnológico

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            STACK DE AUTORIZACIÓN                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                           APLICACIONES                                  │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │ │
│  │  │    Admin     │  │    Tenant    │  │    Tenant    │  │     AI     │  │ │
│  │  │   Dashboard  │  │   Dashboard  │  │    WebApp    │  │  Assistant │  │ │
│  │  │  (Next.js)   │  │  (Next.js)   │  │  (Next.js)   │  │   (MCP)    │  │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘  │ │
│  └─────────┼─────────────────┼─────────────────┼────────────────┼─────────┘ │
│            │                 │                 │                │           │
│            ▼                 ▼                 ▼                ▼           │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                        TENANT API (NestJS)                              ││
│  │  ┌─────────────────────────────────────────────────────────────────┐   ││
│  │  │                    Authorization Layer                           │   ││
│  │  │  • JWT Validation (FusionAuth)                                  │   ││
│  │  │  • Permission Check (Cerbos)                                    │   ││
│  │  │  • Organization Scope Validation                                │   ││
│  │  └─────────────────────────────────────────────────────────────────┘   ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│            │                                         │                      │
│            ▼                                         ▼                      │
│  ┌───────────────────────┐             ┌───────────────────────────────────┐│
│  │      FUSIONAUTH       │             │            CERBOS PDP             ││
│  │  (Identity Provider)  │             │     (Policy Decision Point)       ││
│  │                       │             │                                   ││
│  │  • Autenticación      │             │  • Resource Policies              ││
│  │  • Usuarios           │             │  • Derived Roles                  ││
│  │  • Tenants            │             │  • Scoped Policies (por tenant)   ││
│  │  • Applications       │             │  • Principal Policies (AI)        ││
│  │  • Registrations      │             │                                   ││
│  │  • Roles (por app)    │             │  Storage: PostgreSQL              ││
│  └───────────────────────┘             └───────────────────────────────────┘│
│            │                                         │                      │
│            ▼                                         ▼                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                            MONGODB                                    │  │
│  │                                                                       │  │
│  │  db_serveflow_sys (Sistema)        db_tenant_{slug} (Por Tenant)     │  │
│  │  ├── global_users                  ├── organizations                  │  │
│  │  ├── tenants                       ├── users (datos extendidos)       │  │
│  │  └── role_templates ◄──────────    ├── user_organizations             │  │
│  │        (Plantillas base)           ├── tenant_roles (personalizados)  │  │
│  │                                    ├── bookings, services, etc.       │  │
│  │                                    └── ai_config                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Cómo Interactúan los Componentes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLUJO DE UNA REQUEST AUTORIZADA                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   1. Usuario hace login en WebApp                                           │
│      │                                                                       │
│      ▼                                                                       │
│   2. FusionAuth autentica y genera JWT                                      │
│      │  JWT contiene:                                                        │
│      │  • sub: userId                                                        │
│      │  • roles: ["client"] (de la Registration)                            │
│      │  • tenantSlug: "gimnasio-fitmax"                                     │
│      │  • organizationIds: ["org_centro", "org_norte"]                      │
│      │                                                                       │
│      ▼                                                                       │
│   3. Usuario hace request: POST /bookings                                   │
│      │                                                                       │
│      ▼                                                                       │
│   4. Tenant API recibe request                                              │
│      │                                                                       │
│      ├─► 4a. Valida JWT con FusionAuth                                      │
│      │       ✓ Token válido                                                 │
│      │       ✓ Usuario tiene Registration en WebApp                        │
│      │                                                                       │
│      ├─► 4b. Consulta a Cerbos: ¿puede "client" hacer "create" en "booking"?│
│      │       Request a Cerbos:                                              │
│      │       {                                                               │
│      │         principal: { id: "user123", roles: ["client"],               │
│      │                      attr: { organizationIds: [...] } },             │
│      │         resource: { kind: "booking",                                 │
│      │                     attr: { organizationId: "org_centro" } },        │
│      │         action: "create",                                            │
│      │         scope: "gimnasio-fitmax"  // Para scoped policies            │
│      │       }                                                               │
│      │                                                                       │
│      │       Cerbos evalúa:                                                 │
│      │       1. ¿Hay scoped policy para "gimnasio-fitmax"? → Usa esa       │
│      │       2. Si no, usa la base policy                                   │
│      │       3. Verifica condiciones: organizationId in organizationIds    │
│      │                                                                       │
│      │       Response: ALLOW                                                │
│      │                                                                       │
│      ▼                                                                       │
│   5. API ejecuta la operación                                               │
│      │                                                                       │
│      ▼                                                                       │
│   6. Response al usuario                                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Modelo de Datos

### 3.1 FusionAuth: Estructura

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// FUSIONAUTH TENANT (1 por Serveflow Tenant)
// ═══════════════════════════════════════════════════════════════════════════
interface FusionAuthTenant {
  id: string;                    // UUID
  name: string;                  // "Gimnasio FitMax"

  // Applications dentro de este tenant
  applications: FusionAuthApplication[];
}

// ═══════════════════════════════════════════════════════════════════════════
// FUSIONAUTH APPLICATION (N por Tenant: Dashboard, WebApp, API)
// ═══════════════════════════════════════════════════════════════════════════
//
// TIPOS DE APLICACIONES:
// ┌──────────────────────────────────────────────────────────────────────────┐
// │ APPS DE USUARIO (usan Authorization Code + allowedApps de roles)         │
// │   • Dashboard: admin, employee, provider (si configurado)                │
// │   • WebApp: provider, client                                             │
// │   → Roles: admin, employee, provider, client + custom                    │
// │   → Grant: Authorization Code + PKCE                                     │
// ├──────────────────────────────────────────────────────────────────────────┤
// │ APP M2M (usa Client Credentials, NO usa allowedApps)                     │
// │   • API: integraciones externas, webhooks, sistemas                      │
// │   → Roles propios: api_full, api_readonly                                │
// │   → Grant: Client Credentials                                            │
// │   → Ver sección 6.7 para flujo detallado                                 │
// └──────────────────────────────────────────────────────────────────────────┘
//
interface FusionAuthApplication {
  id: string;
  name: string;                  // "Dashboard", "WebApp", "API"

  // Roles disponibles EN ESTA APP
  // Para Dashboard/WebApp: roles de tenant_roles con allowedApps que incluya esta app
  // Para API: roles M2M específicos (api_full, api_readonly)
  roles: Array<{
    name: string;                // "admin", "employee" o "api_full"
    description?: string;
    isDefault: boolean;          // Para self-registration (solo Dashboard/WebApp)
    isSuperRole: boolean;        // Admin tiene todos los permisos
  }>;

  oauthConfiguration: {
    clientId: string;
    clientSecret: string;
    authorizedRedirectURLs: string[];  // Solo para Dashboard/WebApp
    requireRegistration: boolean;       // true = sin Registration no puede login
    // Para API M2M:
    // enabledGrants: ['client_credentials']
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// FUSIONAUTH USER
// ═══════════════════════════════════════════════════════════════════════════
interface FusionAuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;

  // Datos compartidos entre todas las apps del tenant
  data: {
    // Identificación del tenant de Serveflow
    serveflowTenantId: string;
    serveflowTenantSlug: string;

    // ═══════════════════════════════════════════════════════════════════
    // ROLES DEL USUARIO (todos los roles que TIENE)
    // Estos son los roles que definen QUÉ ES el usuario
    // ═══════════════════════════════════════════════════════════════════
    roles: string[];  // ["admin", "client"] - puede tener múltiples

    // ═══════════════════════════════════════════════════════════════════
    // ORGANIZATIONS
    // ═══════════════════════════════════════════════════════════════════
    organizationIds: string[];       // Todas las orgs a las que pertenece
    primaryOrganizationId?: string;  // Org por defecto
  };

  // Registrations: acceso a cada Application
  registrations: FusionAuthRegistration[];
}

// ═══════════════════════════════════════════════════════════════════════════
// FUSIONAUTH REGISTRATION (link User ↔ Application)
// ═══════════════════════════════════════════════════════════════════════════
interface FusionAuthRegistration {
  applicationId: string;

  // ═══════════════════════════════════════════════════════════════════
  // ROLES EN ESTA APP
  // Subset de User.data.roles que aplican a esta app específica
  // Según la configuración del tenant para esta app
  // ═══════════════════════════════════════════════════════════════════
  roles: string[];  // ["admin"] - solo los permitidos en esta app

  // Datos específicos de esta app
  data?: Record<string, unknown>;
}
```

### 3.2 MongoDB: Sistema (db_serveflow_sys)

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// ROLE TEMPLATES (Plantillas base para todos los tenants)
// Collection: db_serveflow_sys.role_templates
// ═══════════════════════════════════════════════════════════════════════════
interface RoleTemplate {
  _id: ObjectId;
  slug: string;           // "admin", "employee", "provider", "client"
  name: string;           // "Administrador"
  description: string;

  // En qué apps puede usarse este rol POR DEFECTO
  // Cada tenant puede cambiar esto
  // NOTA: Solo apps de usuario (dashboard, webapp). API es M2M con roles propios.
  defaultAllowedApps: ('dashboard' | 'webapp')[];

  // Configuración base
  isSuperRole: boolean;   // true para admin
  isDefault: boolean;     // true para client (self-registration)

  // Permisos base (para generar policies)
  basePermissions: Array<{
    resource: string;     // "booking", "service", "event"
    actions: string[];    // ["create", "read", "update", "delete"]
    conditions?: {        // Condiciones CEL opcionales
      ownership?: boolean;        // Solo sus propios recursos
      organizationScope?: boolean; // Solo de sus organizations
    };
  }>;

  // Metadata
  isSystemTemplate: boolean;  // true = no se puede eliminar
  createdAt: Date;
  updatedAt: Date;
}

// Ejemplo de templates base:
const roleTemplates: RoleTemplate[] = [
  {
    slug: "admin",
    name: "Administrador",
    description: "Acceso completo a la gestión del negocio",
    defaultAllowedApps: ["dashboard"],
    isSuperRole: true,
    isDefault: false,
    basePermissions: [
      { resource: "*", actions: ["*"] }  // Todo
    ],
    isSystemTemplate: true,
  },
  {
    slug: "employee",
    name: "Empleado",
    description: "Personal operativo del negocio",
    defaultAllowedApps: ["dashboard"],
    isSuperRole: false,
    isDefault: false,
    basePermissions: [
      { resource: "booking", actions: ["create", "read", "update", "list", "check_in"],
        conditions: { organizationScope: true } },
      { resource: "service", actions: ["read", "list"] },
      { resource: "resource", actions: ["read", "list", "update"],
        conditions: { organizationScope: true } },
    ],
    isSystemTemplate: true,
  },
  {
    slug: "provider",
    name: "Proveedor",
    description: "Profesional que ofrece servicios",
    defaultAllowedApps: ["webapp"],  // Por defecto solo WebApp
    isSuperRole: false,
    isDefault: false,
    basePermissions: [
      { resource: "booking", actions: ["read", "list"],
        conditions: { ownership: true } },  // Solo las que le asignan
      { resource: "event", actions: ["read", "update", "check_in"],
        conditions: { ownership: true } },
    ],
    isSystemTemplate: true,
  },
  {
    slug: "client",
    name: "Cliente",
    description: "Usuario final que consume servicios",
    defaultAllowedApps: ["webapp"],
    isSuperRole: false,
    isDefault: true,  // Default para self-registration
    basePermissions: [
      { resource: "booking", actions: ["create", "read", "cancel"],
        conditions: { ownership: true } },
      { resource: "service", actions: ["read", "list"] },
      { resource: "event", actions: ["read", "list", "join"] },
    ],
    isSystemTemplate: true,
  },
];
```

### 3.3 MongoDB: Tenant (db_tenant_{slug})

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// TENANT ROLES (Roles configurados para ESTE tenant)
// Collection: db_tenant_{slug}.tenant_roles
// ═══════════════════════════════════════════════════════════════════════════
interface TenantRole {
  _id: ObjectId;

  // Referencia al template (si viene de uno)
  templateSlug?: string;     // "admin", "employee", etc. (null si es custom)

  // Identificación
  slug: string;              // "admin", "receptionist" (custom)
  name: string;              // "Administrador", "Recepcionista"
  description?: string;

  // ═══════════════════════════════════════════════════════════════════
  // CONFIGURACIÓN ESPECÍFICA DE ESTE TENANT
  // ═══════════════════════════════════════════════════════════════════
  // NOTA: Solo 'dashboard' y 'webapp' porque son apps de USUARIOS HUMANOS.
  // La app 'API' es M2M (machine-to-machine) y usa client_credentials grant
  // con roles propios (api_full, api_readonly), no roles de usuario.
  allowedApps: ('dashboard' | 'webapp')[];  // Apps de usuario que puede acceder

  // Flags
  isSuperRole: boolean;
  isDefault: boolean;        // Para self-registration

  // Estado
  isActive: boolean;

  // Metadata
  isFromTemplate: boolean;   // true si viene de un template
  isCustom: boolean;         // true si lo creó el tenant
  createdAt: Date;
  updatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// ORGANIZATIONS (Sedes/Sucursales del tenant)
// Collection: db_tenant_{slug}.organizations
// ═══════════════════════════════════════════════════════════════════════════
interface Organization {
  _id: ObjectId;
  slug: string;              // "sede-centro"
  name: string;              // "Sede Centro"

  address?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
    coordinates?: { lat: number; lng: number };
  };

  contact?: {
    phone?: string;
    email?: string;
  };

  settings: {
    timezone: string;
    currency: string;
    businessHours: BusinessHours;
  };

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// USER ORGANIZATIONS (Relación User ↔ Organization con metadata)
// Collection: db_tenant_{slug}.user_organizations
// ═══════════════════════════════════════════════════════════════════════════
interface UserOrganization {
  _id: ObjectId;
  userId: ObjectId;           // Ref a users
  organizationId: ObjectId;   // Ref a organizations

  isPrimary: boolean;         // Org principal del usuario
  joinedAt: Date;

  // Override de roles SOLO PARA ESTA ORG (opcional)
  // Si no hay overrides, usa los roles del User.data.roles
  roleOverrides?: {
    additionalRoles?: string[];   // Roles extra solo en esta org
    restrictedRoles?: string[];   // Roles deshabilitados en esta org
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TENANT CONFIG (Configuración general del tenant)
// Collection: db_tenant_{slug}.config (documento único)
// ═══════════════════════════════════════════════════════════════════════════
interface TenantConfig {
  _id: ObjectId;

  // Configuración de apps
  applications: {
    dashboard: {
      allowedRoles: string[];    // ["admin", "employee", "receptionist"]
      defaultRole?: string;      // Si no hay rol al dar acceso
    };
    webapp: {
      allowedRoles: string[];    // ["client", "provider"]
      defaultRole: string;       // "client" para self-registration
    };
  };

  // Configuración de autorización
  authorization: {
    // ¿Los empleados pueden ver todas las orgs o solo las suyas?
    employeeScopeMode: 'all_organizations' | 'assigned_only';

    // Política de cancelación (para Cerbos)
    bookingCancellation: {
      clientMinHours: number;      // 24 = 24h antes
      employeeCanAlways: boolean;  // true = employee puede cancelar siempre
    };
  };

  updatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// AI CONFIG (Configuración del AI Assistant)
// Collection: db_tenant_{slug}.ai_config (documento único)
// ═══════════════════════════════════════════════════════════════════════════
interface AIConfig {
  _id: ObjectId;
  isEnabled: boolean;

  capabilities: {
    canReadBookings: boolean;
    canReadServices: boolean;
    canCreateBookings: boolean;
    canCancelBookings: boolean;
    canModifyBookings: boolean;
  };

  restrictions: {
    maxBookingsPerConversation: number;
    requiresUserConfirmation: string[];  // ["create_booking", "cancel_booking"]
  };

  updatedAt: Date;
}
```

### 3.4 Cerbos: Estructura de Policies

```yaml
# ═══════════════════════════════════════════════════════════════════════════
# BASE POLICY: booking (sin scope, aplica a todos los tenants)
# ═══════════════════════════════════════════════════════════════════════════
---
apiVersion: "api.cerbos.dev/v1"
resourcePolicy:
  resource: "booking"
  version: "default"

  rules:
    # ADMIN - Todo
    - name: admin_full_access
      actions: ["*"]
      effect: EFFECT_ALLOW
      roles: ["admin"]

    # EMPLOYEE - CRUD en sus organizations
    - name: employee_manage
      actions: ["create", "read", "update", "list", "check_in", "cancel"]
      effect: EFFECT_ALLOW
      roles: ["employee"]
      condition:
        match:
          expr: R.attr.organizationId in P.attr.organizationIds

    # PROVIDER - Ver sus asignadas
    - name: provider_view_assigned
      actions: ["read", "list"]
      effect: EFFECT_ALLOW
      roles: ["provider"]
      condition:
        match:
          expr: P.id in R.attr.providerIds || P.id == R.attr.instructorId

    # CLIENT - CRUD propias
    - name: client_own_bookings
      actions: ["create", "read", "list"]
      effect: EFFECT_ALLOW
      roles: ["client"]
      condition:
        match:
          expr: R.attr.userId == P.id || R.id == ""  # "" para create

    - name: client_cancel_own
      actions: ["cancel"]
      effect: EFFECT_ALLOW
      roles: ["client"]
      condition:
        match:
          all:
            of:
              - expr: R.attr.userId == P.id
              - expr: R.attr.status in ["pending", "confirmed"]
              - expr: timestamp(R.attr.startTime) > now() + duration("24h")

# ═══════════════════════════════════════════════════════════════════════════
# SCOPED POLICY: Tenant "gimnasio-vip" override
# Permite cancelación hasta 2h antes (en vez de 24h)
# ═══════════════════════════════════════════════════════════════════════════
---
apiVersion: "api.cerbos.dev/v1"
resourcePolicy:
  resource: "booking"
  version: "default"
  scope: "gimnasio-vip"
  scopePermissions: SCOPE_PERMISSIONS_OVERRIDE_PARENT

  rules:
    - name: client_cancel_flexible
      actions: ["cancel"]
      effect: EFFECT_ALLOW
      roles: ["client"]
      condition:
        match:
          all:
            of:
              - expr: R.attr.userId == P.id
              - expr: timestamp(R.attr.startTime) > now() + duration("2h")

# ═══════════════════════════════════════════════════════════════════════════
# DERIVED ROLES (Roles dinámicos basados en contexto)
# ═══════════════════════════════════════════════════════════════════════════
---
apiVersion: "api.cerbos.dev/v1"
derivedRoles:
  name: common_derived_roles

  definitions:
    # Dueño del recurso
    - name: resource_owner
      parentRoles: ["client", "provider", "employee"]
      condition:
        match:
          expr: R.attr.ownerId == P.id || R.attr.userId == P.id

    # Miembro de la organization del recurso
    - name: organization_member
      parentRoles: ["employee", "provider"]
      condition:
        match:
          expr: R.attr.organizationId in P.attr.organizationIds

# ═══════════════════════════════════════════════════════════════════════════
# PRINCIPAL POLICY: AI Assistant
# ═══════════════════════════════════════════════════════════════════════════
---
apiVersion: "api.cerbos.dev/v1"
principalPolicy:
  principal: "ai_assistant"
  version: "default"

  rules:
    - resource: "booking"
      actions:
        - action: "read"
          effect: EFFECT_ALLOW
          condition:
            match:
              expr: P.attr.canReadBookings == true

        - action: "create"
          effect: EFFECT_ALLOW
          condition:
            match:
              all:
                of:
                  - expr: P.attr.canCreateBookings == true
                  - expr: P.attr.contextUserId != ""

        - action: "cancel"
          effect: EFFECT_ALLOW
          condition:
            match:
              all:
                of:
                  - expr: P.attr.canCancelBookings == true
                  - expr: R.attr.userId == P.attr.contextUserId
```

---

## 4. Sistema de Role Templates

### Concepto

Los Role Templates son **plantillas base** que Serveflow proporciona. Cada tenant puede:
1. **Usar los templates tal cual** - Heredar admin, employee, provider, client
2. **Modificar los templates** - Cambiar qué apps permiten, descripción
3. **Crear roles custom** - Nuevos roles específicos de su negocio

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SISTEMA DE ROLE TEMPLATES                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   db_serveflow_sys.role_templates                                           │
│   ─────────────────────────────────                                          │
│   Plantillas base del sistema:                                              │
│   • admin     → defaultAllowedApps: [dashboard]                             │
│   • employee  → defaultAllowedApps: [dashboard]                             │
│   • provider  → defaultAllowedApps: [webapp]                                │
│   • client    → defaultAllowedApps: [webapp], isDefault: true               │
│                                                                              │
│                           │                                                  │
│                           │ Al crear tenant                                  │
│                           ▼                                                  │
│                                                                              │
│   db_tenant_{slug}.tenant_roles                                             │
│   ─────────────────────────────                                              │
│   Roles CONFIGURADOS para este tenant:                                      │
│                                                                              │
│   Tenant "Gimnasio FitMax":                                                 │
│   • admin     → allowedApps: [dashboard] (heredado)                         │
│   • employee  → allowedApps: [dashboard] (heredado)                         │
│   • provider  → allowedApps: [dashboard, webapp] ← MODIFICADO              │
│   • client    → allowedApps: [webapp] (heredado)                            │
│   • receptionist → allowedApps: [dashboard] ← CUSTOM                       │
│                                                                              │
│   Tenant "Clínica Dental":                                                  │
│   • admin     → allowedApps: [dashboard] (heredado)                         │
│   • employee  → allowedApps: [dashboard, webapp] ← MODIFICADO              │
│   • provider  → allowedApps: [webapp] (heredado)                            │
│   • client    → allowedApps: [webapp] (heredado)                            │
│   • dentist   → allowedApps: [dashboard, webapp] ← CUSTOM                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Flujo: Configuración de Roles al Crear Tenant

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// Al crear un nuevo tenant, inicializamos sus roles desde los templates
// ═══════════════════════════════════════════════════════════════════════════
async function initializeTenantRoles(tenantSlug: string): Promise<void> {
  // 1. Obtener templates base
  const templates = await db.collection('role_templates')
    .find({ isSystemTemplate: true })
    .toArray();

  // 2. Crear tenant_roles basados en templates
  const tenantRoles: TenantRole[] = templates.map(template => ({
    templateSlug: template.slug,
    slug: template.slug,
    name: template.name,
    description: template.description,
    allowedApps: template.defaultAllowedApps,  // Copia los defaults
    isSuperRole: template.isSuperRole,
    isDefault: template.isDefault,
    isActive: true,
    isFromTemplate: true,
    isCustom: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  await getTenantDb(tenantSlug).collection('tenant_roles').insertMany(tenantRoles);

  // 3. Crear roles en FusionAuth Applications
  await syncRolesToFusionAuth(tenantSlug, tenantRoles);

  // 4. Generar policies base en Cerbos
  await generateCerbosPolicies(tenantSlug, tenantRoles);
}

// ═══════════════════════════════════════════════════════════════════════════
// Sincronizar roles con FusionAuth Applications
// ═══════════════════════════════════════════════════════════════════════════
async function syncRolesToFusionAuth(
  tenantSlug: string,
  roles: TenantRole[]
): Promise<void> {
  const tenant = await getTenant(tenantSlug);

  // Para cada app (dashboard, webapp)
  for (const appType of ['dashboard', 'webapp'] as const) {
    const appId = tenant.fusionauthApplications[appType].id;

    // Filtrar roles permitidos en esta app
    const appRoles = roles.filter(r => r.allowedApps.includes(appType));

    // Actualizar roles en FusionAuth Application
    for (const role of appRoles) {
      await fusionAuth.createApplicationRole(appId, {
        name: role.slug,
        description: role.description,
        isDefault: role.isDefault && appType === 'webapp',  // Default solo en WebApp
        isSuperRole: role.isSuperRole,
      });
    }
  }
}
```

### API: Gestión de Roles por Tenant

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// Modificar configuración de un rol existente
// ═══════════════════════════════════════════════════════════════════════════
async function updateTenantRole(
  tenantSlug: string,
  roleSlug: string,
  updates: {
    name?: string;
    description?: string;
    allowedApps?: ('dashboard' | 'webapp')[];
    isDefault?: boolean;
  }
): Promise<void> {
  const db = getTenantDb(tenantSlug);

  // 1. Actualizar en MongoDB
  await db.collection('tenant_roles').updateOne(
    { slug: roleSlug },
    { $set: { ...updates, updatedAt: new Date() } }
  );

  // 2. Sincronizar con FusionAuth si cambiaron las apps
  if (updates.allowedApps) {
    await syncRoleAppsInFusionAuth(tenantSlug, roleSlug, updates.allowedApps);
  }

  // 3. Regenerar scoped policy si es necesario
  if (updates.allowedApps) {
    await regenerateCerbosPolicy(tenantSlug);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Crear rol custom
// ═══════════════════════════════════════════════════════════════════════════
async function createCustomRole(
  tenantSlug: string,
  input: {
    slug: string;
    name: string;
    description?: string;
    allowedApps: ('dashboard' | 'webapp')[];
    basePermissions: Array<{
      resource: string;
      actions: string[];
      conditions?: { ownership?: boolean; organizationScope?: boolean };
    }>;
  }
): Promise<TenantRole> {
  const db = getTenantDb(tenantSlug);

  // 1. Verificar que el slug no existe
  const existing = await db.collection('tenant_roles').findOne({ slug: input.slug });
  if (existing) {
    throw new ConflictException('Role slug already exists');
  }

  // 2. Crear en MongoDB
  const role: TenantRole = {
    _id: new ObjectId(),
    templateSlug: undefined,
    slug: input.slug,
    name: input.name,
    description: input.description,
    allowedApps: input.allowedApps,
    isSuperRole: false,
    isDefault: false,
    isActive: true,
    isFromTemplate: false,
    isCustom: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.collection('tenant_roles').insertOne(role);

  // 3. Crear en FusionAuth Applications
  await syncRolesToFusionAuth(tenantSlug, [role]);

  // 4. Crear scoped policy para este rol
  await createCustomRolePolicy(tenantSlug, input.slug, input.basePermissions);

  return role;
}
```

---

## 5. Flujos de Usuarios

### 5.1 Creación de Usuario

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUJO: CREAR USUARIO                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ESCENARIO: Admin crea un nuevo empleado para la sede Centro               │
│                                                                              │
│   INPUT:                                                                    │
│   {                                                                          │
│     email: "juan@email.com",                                                │
│     firstName: "Juan",                                                      │
│     lastName: "García",                                                     │
│     roles: ["employee"],              // Qué ES                             │
│     appAccess: ["dashboard"],         // A qué apps accede                  │
│     organizationIds: ["org_centro"],  // En qué orgs                        │
│   }                                                                          │
│                                                                              │
│   ─────────────────────────────────────────────────────────────────────     │
│                                                                              │
│   PASO 1: Crear usuario en FusionAuth                                       │
│   ────────────────────────────────────                                       │
│   POST /api/user                                                            │
│   {                                                                          │
│     user: {                                                                  │
│       email: "juan@email.com",                                              │
│       firstName: "Juan",                                                    │
│       lastName: "García",                                                   │
│       data: {                                                                │
│         serveflowTenantId: "tenant_123",                                    │
│         serveflowTenantSlug: "gimnasio-fitmax",                             │
│         roles: ["employee"],          // Todos los roles del usuario        │
│         organizationIds: ["org_centro"],                                    │
│         primaryOrganizationId: "org_centro"                                 │
│       }                                                                      │
│     },                                                                       │
│     registrations: [{                                                        │
│       applicationId: "dashboard_app_id",                                    │
│       roles: ["employee"]  // Subset permitido en Dashboard                 │
│     }]                                                                       │
│   }                                                                          │
│                                                                              │
│   PASO 2: Crear datos extendidos en MongoDB                                 │
│   ──────────────────────────────────────────                                 │
│   db_tenant_gimnasio-fitmax.users.insertOne({                               │
│     fusionauthUserId: "fa_user_123",                                        │
│     email: "juan@email.com",                                                │
│     profile: { ... },                                                       │
│     preferences: { ... }                                                    │
│   })                                                                         │
│                                                                              │
│   PASO 3: Crear relación user-organization                                  │
│   ─────────────────────────────────────────                                  │
│   db_tenant_gimnasio-fitmax.user_organizations.insertOne({                  │
│     userId: "user_123",                                                     │
│     organizationId: "org_centro",                                           │
│     isPrimary: true,                                                        │
│     joinedAt: new Date()                                                    │
│   })                                                                         │
│                                                                              │
│   PASO 4: Auditoría                                                         │
│   ─────────────────                                                          │
│   db_tenant_gimnasio-fitmax.audit_logs.insertOne({                          │
│     action: "user_created",                                                 │
│     actor: { userId: "admin_123" },                                         │
│     target: { userId: "user_123" },                                         │
│     details: { roles: ["employee"], organizations: ["org_centro"] }         │
│   })                                                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Edición de Usuario (Cambio de Roles/Accesos)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FLUJO: EDITAR ROLES/ACCESOS                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ESCENARIO: Promover a Juan a admin y darle acceso a WebApp                │
│                                                                              │
│   INPUT:                                                                    │
│   {                                                                          │
│     userId: "user_123",                                                     │
│     addRoles: ["admin"],                                                    │
│     addAppAccess: ["webapp"]                                                │
│   }                                                                          │
│                                                                              │
│   ─────────────────────────────────────────────────────────────────────     │
│                                                                              │
│   PASO 1: Actualizar User.data.roles en FusionAuth                          │
│   ─────────────────────────────────────────────────                          │
│   // Antes: roles: ["employee"]                                             │
│   // Después: roles: ["employee", "admin"]                                  │
│                                                                              │
│   PATCH /api/user/{userId}                                                  │
│   {                                                                          │
│     user: {                                                                  │
│       data: {                                                                │
│         ...existingData,                                                    │
│         roles: ["employee", "admin"]                                        │
│       }                                                                      │
│     }                                                                        │
│   }                                                                          │
│                                                                              │
│   PASO 2: Actualizar Registration existente (Dashboard)                     │
│   ──────────────────────────────────────────────────────                     │
│   // Añadir "admin" a los roles del Dashboard                               │
│   // (porque admin está en allowedApps: [dashboard])                        │
│                                                                              │
│   PATCH /api/user/registration/{userId}                                     │
│   {                                                                          │
│     registration: {                                                          │
│       applicationId: "dashboard_app_id",                                    │
│       roles: ["employee", "admin"]                                          │
│     }                                                                        │
│   }                                                                          │
│                                                                              │
│   PASO 3: Crear nueva Registration (WebApp)                                 │
│   ──────────────────────────────────────────                                 │
│   // Como admin no está en allowedApps de WebApp,                           │
│   // solo incluimos employee si estuviera permitido                         │
│                                                                              │
│   POST /api/user/registration                                               │
│   {                                                                          │
│     registration: {                                                          │
│       userId: "user_123",                                                   │
│       applicationId: "webapp_app_id",                                       │
│       roles: []  // Ninguno de sus roles está permitido en WebApp           │
│     }                                                                        │
│   }                                                                          │
│                                                                              │
│   PASO 4: Auditoría                                                         │
│   ─────────────────                                                          │
│   Registrar cambios en audit_logs                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Asignación a Organizations

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   FLUJO: ASIGNAR A ORGANIZATION                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ESCENARIO: Juan ahora también trabaja en la sede Norte                    │
│                                                                              │
│   ─────────────────────────────────────────────────────────────────────     │
│                                                                              │
│   PASO 1: Actualizar User.data.organizationIds en FusionAuth               │
│   ───────────────────────────────────────────────────────────                │
│   // Antes: organizationIds: ["org_centro"]                                 │
│   // Después: organizationIds: ["org_centro", "org_norte"]                  │
│                                                                              │
│   PATCH /api/user/{userId}                                                  │
│   {                                                                          │
│     user: {                                                                  │
│       data: {                                                                │
│         ...existingData,                                                    │
│         organizationIds: ["org_centro", "org_norte"]                        │
│       }                                                                      │
│     }                                                                        │
│   }                                                                          │
│                                                                              │
│   PASO 2: Crear relación en MongoDB                                         │
│   ──────────────────────────────────                                         │
│   db_tenant_gimnasio-fitmax.user_organizations.insertOne({                  │
│     userId: "user_123",                                                     │
│     organizationId: "org_norte",                                            │
│     isPrimary: false,  // Centro sigue siendo primaria                      │
│     joinedAt: new Date()                                                    │
│   })                                                                         │
│                                                                              │
│   RESULTADO:                                                                │
│   ───────────                                                                │
│   Ahora Juan puede:                                                         │
│   • Gestionar bookings de org_centro Y org_norte                            │
│   • Ver recursos de ambas sedes                                             │
│   • Sus permisos en Cerbos evalúan:                                         │
│     R.attr.organizationId in ["org_centro", "org_norte"]                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.4 Eliminación de Usuario

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FLUJO: ELIMINAR USUARIO                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   OPCIÓN A: Soft Delete (Recomendado)                                       │
│   ─────────────────────────────────────                                      │
│   1. Marcar como inactivo en FusionAuth (no puede login)                    │
│   2. Eliminar todas las Registrations (pierde acceso a apps)                │
│   3. Mantener datos en MongoDB para historial                               │
│   4. Auditoría                                                              │
│                                                                              │
│   OPCIÓN B: Hard Delete                                                     │
│   ─────────────────────                                                      │
│   1. Eliminar usuario de FusionAuth                                         │
│   2. Eliminar de MongoDB (users, user_organizations)                        │
│   3. Mantener referencias en bookings como "deleted_user"                   │
│   4. Auditoría                                                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Flujos de Autorización

> **NOTA IMPORTANTE:** Esta sección documenta el flujo **ACTUAL** implementado y el flujo **OBJETIVO** con Cerbos.
> Actualmente la autorización usa `@Roles()` de NestJS. Cerbos se implementará en una fase posterior.

### 6.1 Flujo en Apps (Dashboard/WebApp) - IMPLEMENTACIÓN ACTUAL

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              FLUJO ACTUAL: AUTENTICACIÓN + AUTORIZACIÓN EN APPS              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ESCENARIO: Employee accede al Dashboard y quiere gestionar reservas      │
│                                                                              │
│   ═══════════════════════════════════════════════════════════════════════   │
│   FASE 1: ACCESO A LA APP (Next.js Middleware)                              │
│   ═══════════════════════════════════════════════════════════════════════   │
│                                                                              │
│   1. Usuario accede a gimnasio-fitmax.localhost:4200                        │
│                                                                              │
│   2. Next.js Middleware (apps/tenant/dashboard/src/middleware.ts):          │
│      a. Extrae tenant slug del subdominio: "gimnasio-fitmax"                │
│      b. Verifica si es ruta pública: /sign-in, /sign-up, etc.              │
│      c. Si NO es pública → busca cookie fa_access_token                    │
│      d. Si NO hay cookie → redirect a /sign-in                              │
│                                                                              │
│   3. Usuario ve página de login (SignInView)                                │
│                                                                              │
│   ═══════════════════════════════════════════════════════════════════════   │
│   FASE 2: LOGIN (FusionAuth REST API - NO OAuth redirect)                   │
│   ═══════════════════════════════════════════════════════════════════════   │
│                                                                              │
│   4. Usuario ingresa email/password                                         │
│                                                                              │
│   5. Frontend (useFusionAuth hook) hace:                                    │
│      POST http://localhost:9011/api/login                                   │
│      Headers: X-FusionAuth-TenantId: {fusionauth_tenant_id}                 │
│      Body: {                                                                 │
│        loginId: "employee@gimnasio.com",                                    │
│        password: "xxx",                                                     │
│        applicationId: "{fusionauth_application_id}"  // Del tenant          │
│      }                                                                       │
│                                                                              │
│   6. FusionAuth verifica:                                                   │
│      ✓ Credenciales válidas                                                 │
│      ✓ Usuario tiene Registration en esta Application                       │
│      ✓ Genera JWT con claims:                                               │
│                                                                              │
│        {                                                                     │
│          "sub": "a1b2c3d4-...",           // User ID                        │
│          "aud": "4ad542dc-...",           // Application ID                 │
│          "iss": "http://localhost:9011",  // Issuer                         │
│          "exp": 1703425200,               // Expiration (1 hora)            │
│          "iat": 1703421600,               // Issued at                      │
│          "email": "employee@gimnasio.com",                                  │
│          "email_verified": true,                                            │
│          "given_name": "Juan",                                              │
│          "family_name": "García",                                           │
│          "roles": ["employee"],           // De la Registration             │
│          "tid": "9de7e969-...",           // FusionAuth Tenant ID           │
│          "applicationId": "4ad542dc-..."                                    │
│        }                                                                     │
│                                                                              │
│   7. FusionAuth response:                                                   │
│      {                                                                       │
│        token: "eyJhbGc...",                  // Access token JWT            │
│        refreshToken: "...",                  // Refresh token               │
│        tokenExpirationInstant: 1703425200000,                               │
│        user: { id, email, firstName, lastName, verified, active }           │
│      }                                                                       │
│                                                                              │
│   8. Frontend guarda en cookies:                                            │
│      • fa_access_token = JWT (expira en 1 hora)                             │
│      • fa_refresh_token = refresh token (expira en 30 días)                 │
│      • Domain: localhost (dev) / .serveflow.app (prod)                      │
│      • SameSite: Lax                                                        │
│                                                                              │
│   9. Redirect a / (dashboard home)                                          │
│                                                                              │
│   ═══════════════════════════════════════════════════════════════════════   │
│   FASE 3: REQUEST A API (NestJS Backend)                                    │
│   ═══════════════════════════════════════════════════════════════════════   │
│                                                                              │
│   10. Frontend hace: GET /api/bookings                                      │
│       Headers: Authorization: Bearer {jwt}                                  │
│                                                                              │
│   11. TenantMiddleware (packages/tenants/src/middleware):                   │
│       a. Extrae tenant del header Host o x-tenant-slug                      │
│       b. Busca tenant en MongoDB (db_serveflow_sys.tenants)                 │
│       c. Inyecta en request:                                                │
│          • req.tenant = TenantMVP                                           │
│          • req.mongooseConnection = conexión a db_tenant_{slug}             │
│                                                                              │
│   12. FusionAuthGuard (packages/auth/src/guards):                           │
│       a. Extrae token del header Authorization                              │
│       b. Valida firma JWT con JWKS:                                         │
│          GET http://localhost:9011/.well-known/jwks.json                    │
│       c. Verifica claims: iss, exp, aud                                     │
│       d. Inyecta en request:                                                │
│          req.user = {                                                        │
│            fusionauthUserId: "a1b2c3d4-...",                                │
│            email: "employee@gimnasio.com",                                  │
│            firstName: "Juan",                                               │
│            lastName: "García",                                              │
│            tenantId: "9de7e969-...",                                        │
│            roles: ["employee"]                                              │
│          }                                                                   │
│                                                                              │
│   13. Controller con @Roles() (AUTORIZACIÓN ACTUAL):                        │
│                                                                              │
│       @Roles('admin', 'employee')          // Decorator                     │
│       @Get('bookings')                                                      │
│       getBookings(@CurrentUser() user) {                                    │
│         // Solo admin o employee pueden acceder                             │
│       }                                                                      │
│                                                                              │
│       Guard verifica: user.roles incluye 'admin' o 'employee' → ✓          │
│                                                                              │
│   14. Response: 200 OK con lista de bookings                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Flujo OBJETIVO con Cerbos (Por Implementar)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│               FLUJO OBJETIVO: AUTORIZACIÓN GRANULAR CON CERBOS               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ESCENARIO: Employee quiere cancelar una reserva específica                │
│                                                                              │
│   ═══════════════════════════════════════════════════════════════════════   │
│   DIFERENCIAS CON FLUJO ACTUAL                                              │
│   ═══════════════════════════════════════════════════════════════════════   │
│                                                                              │
│   Actual:                                                                   │
│   • @Roles('admin', 'employee') → permite o deniega                         │
│   • No considera: organización, ownership, estado del recurso               │
│                                                                              │
│   Con Cerbos:                                                               │
│   • Permisos granulares por acción + recurso + condiciones                  │
│   • Considera: organización del usuario, ownership, atributos del recurso   │
│                                                                              │
│   ═══════════════════════════════════════════════════════════════════════   │
│   FLUJO DETALLADO                                                           │
│   ═══════════════════════════════════════════════════════════════════════   │
│                                                                              │
│   1. Usuario hace: POST /api/bookings/booking_456/cancel                    │
│      Headers: Authorization: Bearer {jwt}                                   │
│                                                                              │
│   2. FusionAuthGuard valida JWT (igual que ahora)                           │
│                                                                              │
│   3. Controller con @CheckPermission (NUEVO):                               │
│                                                                              │
│      @Post(':id/cancel')                                                    │
│      @CheckPermission({ resource: 'booking', action: 'cancel' })            │
│      cancelBooking(@Param('id') id: string) { ... }                         │
│                                                                              │
│   4. CerbosGuard (NUEVO) consulta a Cerbos PDP:                             │
│                                                                              │
│      a. Carga recurso de MongoDB para obtener atributos:                    │
│         const booking = await BookingModel.findById(id);                    │
│                                                                              │
│      b. Construye request a Cerbos:                                         │
│         {                                                                    │
│           principal: {                                                       │
│             id: "a1b2c3d4-...",                                             │
│             roles: ["employee"],                                            │
│             attr: {                                                          │
│               organizationIds: ["org_centro", "org_norte"]                  │
│             }                                                                │
│           },                                                                 │
│           resource: {                                                        │
│             kind: "booking",                                                │
│             id: "booking_456",                                              │
│             attr: {                                                          │
│               organizationId: "org_centro",                                 │
│               ownerId: "client_789",                                        │
│               status: "confirmed"                                           │
│             }                                                                │
│           },                                                                 │
│           action: "cancel",                                                 │
│           auxData: {                                                         │
│             jwt: { scope: "gimnasio-fitmax" }                               │
│           }                                                                  │
│         }                                                                    │
│                                                                              │
│      c. Cerbos evalúa policy:                                               │
│         - Principal tiene rol "employee" ✓                                  │
│         - Action es "cancel" ✓                                              │
│         - Condición: booking.organizationId in principal.organizationIds   │
│           → "org_centro" in ["org_centro", "org_norte"] ✓                  │
│         - Response: EFFECT_ALLOW                                            │
│                                                                              │
│   5. Controller ejecuta la cancelación                                      │
│                                                                              │
│   ═══════════════════════════════════════════════════════════════════════   │
│   BENEFICIOS DE CERBOS                                                      │
│   ═══════════════════════════════════════════════════════════════════════   │
│                                                                              │
│   • Employee solo puede cancelar bookings de SUS organizations              │
│   • Client solo puede cancelar SUS PROPIAS reservas                         │
│   • Policies externalizadas (no hardcoded en controllers)                   │
│   • Scoped policies permiten personalización por tenant                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Componentes de Autenticación Implementados

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COMPONENTES DE AUTH IMPLEMENTADOS                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   FRONTEND (Next.js)                                                        │
│   ═══════════════════════════════════════════════════════════════════════   │
│                                                                              │
│   packages/ui/src/hooks/use-fusionauth.ts                                   │
│   ─────────────────────────────────────────                                  │
│   Hook principal con operaciones:                                           │
│   • login(email, password) → POST /api/login                                │
│   • logout() → limpia cookies                                               │
│   • completeGoogleLogin(token) → OAuth con Google                           │
│   • register(data) → POST /api/user/registration                            │
│   • refreshToken() → POST /api/jwt/refresh                                  │
│                                                                              │
│   Gestión de cookies:                                                       │
│   • setCookie('fa_access_token', token, expiration)                         │
│   • setCookie('fa_refresh_token', refreshToken, 30d)                        │
│   • getCookieDomain() → 'localhost' | '.serveflow.app'                      │
│                                                                              │
│   apps/tenant/dashboard/src/middleware.ts                                   │
│   ──────────────────────────────────────────                                 │
│   Middleware de Next.js:                                                    │
│   • Extrae tenant slug del subdominio                                       │
│   • Verifica cookie fa_access_token                                         │
│   • Valida solo EXPIRATION (no firma - eso es backend)                      │
│   • Inyecta headers: x-tenant-slug, x-fusionauth-user-id                    │
│   • Rutas públicas: /sign-in, /sign-up, /api/webhooks, etc.                 │
│                                                                              │
│                                                                              │
│   BACKEND (NestJS)                                                          │
│   ═══════════════════════════════════════════════════════════════════════   │
│                                                                              │
│   packages/auth/src/guards/fusionauth-auth.guard.ts                         │
│   ───────────────────────────────────────────────────                        │
│   Guard principal:                                                          │
│   • Extrae token de Authorization header                                    │
│   • Valida firma con JWKS (RS256)                                           │
│   • Verifica issuer, expiration, audience                                   │
│   • Inyecta req.user con datos del JWT                                      │
│   • Soporta @Public() para rutas sin auth                                   │
│   • Soporta @Roles() para RBAC básico                                       │
│                                                                              │
│   packages/auth/src/decorators/                                             │
│   ─────────────────────────────────                                          │
│   • @Public() → marca ruta como pública                                     │
│   • @Roles('admin', 'employee') → requiere rol específico                   │
│   • @CurrentUser() → inyecta usuario autenticado                            │
│   • @RequireTenant() → requiere contexto de tenant                          │
│                                                                              │
│   packages/tenants/src/middleware/tenant.middleware.ts                      │
│   ──────────────────────────────────────────────────────                     │
│   Middleware de tenant:                                                     │
│   • Resuelve tenant del subdominio o header x-tenant-slug                   │
│   • Busca en MongoDB db_serveflow_sys.tenants                               │
│   • Inyecta conexión a base de datos del tenant                             │
│   • Inyecta req.tenant con TenantMVP                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.4 Estructura del JWT Actual

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// JWT CLAIMS ACTUALES (generados por FusionAuth)
// ═══════════════════════════════════════════════════════════════════════════

interface FusionAuthJwtPayload {
  // Standard OIDC claims
  sub: string;              // User ID (UUID de FusionAuth)
  aud: string;              // Application ID (audience)
  iss: string;              // Issuer: "http://localhost:9011"
  exp: number;              // Expiration (Unix timestamp segundos)
  iat: number;              // Issued at (Unix timestamp segundos)

  // User info claims
  email: string;
  email_verified: boolean;
  given_name?: string;      // firstName
  family_name?: string;     // lastName
  name?: string;            // fullName
  picture?: string;         // Profile picture URL

  // FusionAuth specific claims
  authenticationType: string; // 'PASSWORD', 'REFRESH_TOKEN', 'JWT_SSO'
  applicationId: string;      // Misma que aud
  tid?: string;               // FusionAuth Tenant ID

  // Registration claims
  roles: string[];          // ["admin", "employee", "client"]
}

// Ejemplo real de JWT decodificado:
{
  "sub": "a1b2c3d4-e5f6-4789-0abc-def123456789",
  "aud": "4ad542dc-d0c3-4aad-86b3-04803a73851f",
  "iss": "http://localhost:9011",
  "exp": 1703425200,
  "iat": 1703421600,
  "email": "admin@gimnasio.com",
  "email_verified": true,
  "given_name": "Carlos",
  "family_name": "López",
  "authenticationType": "PASSWORD",
  "applicationId": "4ad542dc-d0c3-4aad-86b3-04803a73851f",
  "tid": "9de7e969-c254-41a0-ba46-f48e86fe5797",
  "roles": ["admin"]
}
```

### 6.5 Claims Adicionales para Cerbos (Por Implementar)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              CLAIMS ADICIONALES NECESARIOS PARA CERBOS                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Para que Cerbos pueda evaluar permisos granulares, necesitamos            │
│   añadir claims al JWT mediante un JWT Populate Lambda en FusionAuth:       │
│                                                                              │
│   CLAIMS ACTUALES          →   CLAIMS NECESARIOS                            │
│   ─────────────────────────────────────────────────────────────             │
│   sub: userId                  sub: userId                                  │
│   roles: ["employee"]          roles: ["employee"]                          │
│   tid: fusionAuthTenantId      tid: fusionAuthTenantId                      │
│   (ninguno)                    tenantSlug: "gimnasio-fitmax"       ← NUEVO  │
│   (ninguno)                    organizationIds: ["org1", "org2"]   ← NUEVO  │
│   (ninguno)                    primaryOrganizationId: "org1"       ← NUEVO  │
│                                                                              │
│   ═══════════════════════════════════════════════════════════════════════   │
│   JWT POPULATE LAMBDA (FusionAuth)                                          │
│   ═══════════════════════════════════════════════════════════════════════   │
│                                                                              │
│   // En FusionAuth: Tenants → [Tenant] → Lambdas → JWT Populate             │
│                                                                              │
│   function populate(jwt, user, registration, context) {                     │
│     // Añadir tenant slug de Serveflow                                      │
│     jwt.tenantSlug = user.data.serveflowTenantSlug;                         │
│                                                                              │
│     // Añadir organizations del usuario                                     │
│     jwt.organizationIds = user.data.organizationIds || [];                  │
│     jwt.primaryOrganizationId = user.data.primaryOrganizationId;            │
│                                                                              │
│     return jwt;                                                              │
│   }                                                                          │
│                                                                              │
│   ═══════════════════════════════════════════════════════════════════════   │
│   ALTERNATIVA: Cargar datos en el Guard                                     │
│   ═══════════════════════════════════════════════════════════════════════   │
│                                                                              │
│   Si no queremos modificar el JWT, el CerbosGuard puede cargar              │
│   los organizationIds desde MongoDB antes de consultar a Cerbos:            │
│                                                                              │
│   const userData = await UserModel.findOne({                                │
│     fusionAuthUserId: jwtPayload.sub                                        │
│   });                                                                        │
│   const organizationIds = userData.organizationIds;                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.6 Flujo de AI Assistant (Por Implementar)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLUJO: AUTORIZACIÓN AI ASSISTANT                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ESTADO: Por implementar                                                   │
│   DEPENDENCIAS: Cerbos debe estar integrado primero                         │
│                                                                              │
│   ═══════════════════════════════════════════════════════════════════════   │
│   ESCENARIO                                                                 │
│   ═══════════════════════════════════════════════════════════════════════   │
│                                                                              │
│   Cliente habla con AI en WebApp para reservar una clase.                   │
│                                                                              │
│   El AI Assistant:                                                          │
│   • NO hereda los permisos del usuario                                      │
│   • Tiene su PROPIA identidad (Principal Policy en Cerbos)                  │
│   • Sus capacidades están configuradas POR TENANT en ai_config              │
│   • Opera EN NOMBRE DEL usuario (contextUserId)                             │
│                                                                              │
│   ═══════════════════════════════════════════════════════════════════════   │
│   FLUJO                                                                     │
│   ═══════════════════════════════════════════════════════════════════════   │
│                                                                              │
│   1. Cliente (logueado en WebApp) abre chat con AI                          │
│      → AI recibe: contextUser = { id: "client_123", roles: ["client"] }     │
│                                                                              │
│   2. Cliente dice: "Quiero reservar spinning mañana a las 10"               │
│                                                                              │
│   3. AI necesita: crear una reserva                                         │
│      → Llama a tool: create_booking                                         │
│                                                                              │
│   4. MCP Server - AIAuthorizationService:                                   │
│                                                                              │
│      a. Cargar configuración del tenant:                                    │
│         const aiConfig = await getAIConfig("gimnasio-fitmax");              │
│         // aiConfig.capabilities.canCreateBookings = true                   │
│                                                                              │
│      b. Construir Principal del AI:                                         │
│         {                                                                    │
│           id: "ai_assistant_gimnasio-fitmax",                               │
│           roles: ["ai_assistant"],                                          │
│           attr: {                                                            │
│             canCreateBookings: true,                                        │
│             canReadBookings: true,                                          │
│             contextUserId: "client_123",                                    │
│             contextUserRole: "client"                                       │
│           }                                                                  │
│         }                                                                    │
│                                                                              │
│      c. Consultar Cerbos (Principal Policy):                                │
│         → Evalúa principalPolicy "ai_assistant"                             │
│         → Verifica: canCreateBookings == true ✓                             │
│         → Verifica: contextUserId != "" ✓                                   │
│         → Response: ALLOW                                                   │
│                                                                              │
│   5. AI procede a crear la reserva:                                         │
│      → POST /api/bookings                                                   │
│      → Body: { userId: "client_123", ... }                                  │
│                                                                              │
│   6. (Opcional) Si requiresUserConfirmation incluye "create_booking":       │
│      → AI pregunta al usuario: "¿Confirmas la reserva?"                    │
│      → Usuario confirma                                                     │
│      → AI procede                                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.7 Flujo de APIs M2M (Por Implementar)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     FLUJO: AUTORIZACIÓN APIs (M2M)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ESTADO: Por implementar                                                   │
│   DEPENDENCIAS: Configurar Client Credentials Grant en FusionAuth           │
│                                                                              │
│   ═══════════════════════════════════════════════════════════════════════   │
│   ESCENARIO                                                                 │
│   ═══════════════════════════════════════════════════════════════════════   │
│                                                                              │
│   Sistema externo (CRM) necesita sincronizar clientes con Serveflow.        │
│                                                                              │
│   ═══════════════════════════════════════════════════════════════════════   │
│   SETUP (Admin crea API Key para el tenant)                                 │
│   ═══════════════════════════════════════════════════════════════════════   │
│                                                                              │
│   1. Crear Application "API" en FusionAuth para el tenant                   │
│      → Client Credentials Grant habilitado                                  │
│      → Roles: ["api_full", "api_readonly"]                                  │
│                                                                              │
│   2. Generar API Key:                                                       │
│      → clientId + clientSecret                                              │
│      → Asignar rol: "api_readonly"                                          │
│                                                                              │
│   ═══════════════════════════════════════════════════════════════════════   │
│   FLUJO                                                                     │
│   ═══════════════════════════════════════════════════════════════════════   │
│                                                                              │
│   1. CRM obtiene token:                                                     │
│      POST http://localhost:9011/oauth2/token                                │
│      Content-Type: application/x-www-form-urlencoded                        │
│      {                                                                       │
│        grant_type: "client_credentials",                                    │
│        client_id: "api_client_id",                                          │
│        client_secret: "api_client_secret",                                  │
│        scope: "target-entity:{api_app_id}:read"                             │
│      }                                                                       │
│                                                                              │
│   2. FusionAuth genera JWT:                                                 │
│      {                                                                       │
│        sub: "api_client_id",                                                │
│        aud: "api_app_id",                                                   │
│        roles: ["api_readonly"],                                             │
│        tid: "{fusionauth_tenant_id}"                                        │
│      }                                                                       │
│                                                                              │
│   3. CRM hace request:                                                      │
│      GET /api/users                                                         │
│      Authorization: Bearer {token}                                          │
│      X-Tenant-Slug: gimnasio-fitmax                                         │
│                                                                              │
│   4. Tenant API valida con FusionAuthGuard + CerbosGuard:                   │
│      a. JWT válido ✓                                                        │
│      b. Cerbos: rol "api_readonly" permite "read" en "user" ✓              │
│                                                                              │
│   5. Response: lista de usuarios                                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Gestión de Permisos y Recursos

### 7.1 Cómo Crear un Nuevo Recurso

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CREAR NUEVO RECURSO: "membership"                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   PASO 1: Definir el modelo en MongoDB                                      │
│   ─────────────────────────────────────                                      │
│                                                                              │
│   // db_tenant_{slug}.memberships                                           │
│   interface Membership {                                                    │
│     _id: ObjectId;                                                          │
│     userId: ObjectId;                                                       │
│     organizationId: ObjectId;  // Para scope                                │
│     type: string;                                                           │
│     status: 'active' | 'expired' | 'cancelled';                             │
│     ...                                                                      │
│   }                                                                          │
│                                                                              │
│   PASO 2: Crear Base Policy en Cerbos                                       │
│   ─────────────────────────────────────                                      │
│                                                                              │
│   # policies/membership.yaml                                                │
│   ---                                                                        │
│   apiVersion: "api.cerbos.dev/v1"                                           │
│   resourcePolicy:                                                           │
│     resource: "membership"                                                  │
│     version: "default"                                                      │
│                                                                              │
│     rules:                                                                  │
│       - name: admin_full                                                    │
│         actions: ["*"]                                                      │
│         effect: EFFECT_ALLOW                                                │
│         roles: ["admin"]                                                    │
│                                                                              │
│       - name: employee_manage                                               │
│         actions: ["create", "read", "update", "list"]                       │
│         effect: EFFECT_ALLOW                                                │
│         roles: ["employee"]                                                 │
│         condition:                                                          │
│           match:                                                            │
│             expr: R.attr.organizationId in P.attr.organizationIds           │
│                                                                              │
│       - name: client_own                                                    │
│         actions: ["read"]                                                   │
│         effect: EFFECT_ALLOW                                                │
│         roles: ["client"]                                                   │
│         condition:                                                          │
│           match:                                                            │
│             expr: R.attr.userId == P.id                                     │
│                                                                              │
│   PASO 3: Subir policy a Cerbos (PostgreSQL)                                │
│   ───────────────────────────────────────────                                │
│                                                                              │
│   await cerbosAdmin.addOrUpdatePolicy(membershipPolicy);                    │
│                                                                              │
│   PASO 4: Actualizar Role Templates (opcional)                              │
│   ─────────────────────────────────────────────                              │
│                                                                              │
│   // Añadir permisos de membership a templates existentes                   │
│   await db.collection('role_templates').updateOne(                          │
│     { slug: 'employee' },                                                   │
│     { $push: {                                                               │
│       basePermissions: {                                                    │
│         resource: 'membership',                                             │
│         actions: ['create', 'read', 'update', 'list'],                      │
│         conditions: { organizationScope: true }                             │
│       }                                                                      │
│     }}                                                                       │
│   );                                                                         │
│                                                                              │
│   PASO 5: Crear Controller con decoradores                                  │
│   ─────────────────────────────────────────                                  │
│                                                                              │
│   @Controller('memberships')                                                │
│   @UseGuards(TenantAuthGuard)                                               │
│   export class MembershipsController {                                      │
│     @Get(':id')                                                             │
│     @CheckPermission({ resource: 'membership', action: 'read' })            │
│     async get(@Param('id') id: string) { ... }                              │
│                                                                              │
│     @Post()                                                                 │
│     @CheckPermission({ resource: 'membership', action: 'create' })          │
│     async create(@Body() dto: CreateMembershipDto) { ... }                  │
│   }                                                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Cómo Crear Permisos Custom por Tenant

```
┌─────────────────────────────────────────────────────────────────────────────┐
│               CREAR PERMISO CUSTOM: "priority_booking"                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ESCENARIO: Gimnasio VIP quiere que clientes premium puedan                │
│   reservar con prioridad (antes que otros clientes)                         │
│                                                                              │
│   ─────────────────────────────────────────────────────────────────────     │
│                                                                              │
│   PASO 1: El tenant crea rol custom "premium_client"                        │
│   ─────────────────────────────────────────────────────                      │
│                                                                              │
│   POST /api/admin/roles                                                     │
│   {                                                                          │
│     slug: "premium_client",                                                 │
│     name: "Cliente Premium",                                                │
│     allowedApps: ["webapp"],                                                │
│     basePermissions: [                                                      │
│       { resource: "booking", actions: ["create", "read", "cancel",          │
│                                         "priority_book"] }                  │
│     ]                                                                        │
│   }                                                                          │
│                                                                              │
│   PASO 2: Sistema genera Scoped Policy                                      │
│   ─────────────────────────────────────                                      │
│                                                                              │
│   # Automáticamente generado para gimnasio-vip                              │
│   ---                                                                        │
│   apiVersion: "api.cerbos.dev/v1"                                           │
│   resourcePolicy:                                                           │
│     resource: "booking"                                                     │
│     version: "default"                                                      │
│     scope: "gimnasio-vip"                                                   │
│                                                                              │
│     rules:                                                                  │
│       - name: premium_client_priority                                       │
│         actions: ["priority_book"]                                          │
│         effect: EFFECT_ALLOW                                                │
│         roles: ["premium_client"]                                           │
│                                                                              │
│   PASO 3: Backend implementa la acción                                      │
│   ─────────────────────────────────────                                      │
│                                                                              │
│   @Post(':id/priority-book')                                                │
│   @CheckPermission({ resource: 'booking', action: 'priority_book' })        │
│   async priorityBook(@Param('id') eventId: string) {                        │
│     // Lógica de reserva prioritaria                                        │
│     // Salta la cola de espera, etc.                                        │
│   }                                                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Escenario Completo: Gimnasio 20 Sedes

### El Escenario

**Gimnasio FitMax** tiene:
- 20 sedes (Organizations) en diferentes ciudades
- 500 empleados totales
- 50,000 clientes
- Algunos empleados trabajan en múltiples sedes
- Algunos clientes tienen membresías multi-sede

### 8.1 Setup Inicial del Tenant

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SETUP: GIMNASIO FITMAX (20 SEDES)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   1. CREAR TENANT EN SERVEFLOW                                              │
│   ────────────────────────────────                                           │
│                                                                              │
│   POST /api/admin/tenants                                                   │
│   {                                                                          │
│     slug: "gimnasio-fitmax",                                                │
│     name: "Gimnasio FitMax",                                                │
│     plan: "enterprise"                                                      │
│   }                                                                          │
│                                                                              │
│   Sistema automáticamente:                                                  │
│   • Crea FusionAuth Tenant "gimnasio-fitmax"                                │
│   • Crea 2 FusionAuth Apps: Dashboard + WebApp (API es M2M, ver 6.7)        │
│   • Crea base de datos: db_tenant_gimnasio-fitmax                           │
│   • Inicializa role_templates → tenant_roles                                │
│   • Genera base policies en Cerbos                                          │
│                                                                              │
│   2. PERSONALIZAR ROLES                                                     │
│   ─────────────────────                                                      │
│                                                                              │
│   El admin de FitMax decide:                                                │
│   • Providers (instructores) también acceden al Dashboard                   │
│   • Crear rol custom "regional_manager"                                     │
│                                                                              │
│   PUT /api/admin/roles/provider                                             │
│   { allowedApps: ["dashboard", "webapp"] }                                  │
│                                                                              │
│   POST /api/admin/roles                                                     │
│   {                                                                          │
│     slug: "regional_manager",                                               │
│     name: "Gerente Regional",                                               │
│     allowedApps: ["dashboard"],                                             │
│     basePermissions: [                                                      │
│       { resource: "*", actions: ["*"],                                      │
│         conditions: { organizationScope: true } }                           │
│     ]                                                                        │
│   }                                                                          │
│                                                                              │
│   3. CREAR ORGANIZATIONS (20 sedes)                                         │
│   ───────────────────────────────────                                        │
│                                                                              │
│   for (const sede of sedes) {                                               │
│     POST /api/admin/organizations                                           │
│     {                                                                        │
│       slug: sede.slug,      // "fitmax-madrid-centro"                       │
│       name: sede.name,      // "FitMax Madrid Centro"                       │
│       address: sede.address,                                                │
│       settings: { timezone: "Europe/Madrid", ... }                          │
│     }                                                                        │
│   }                                                                          │
│                                                                              │
│   RESULTADO:                                                                │
│   ───────────                                                                │
│   db_tenant_gimnasio-fitmax.organizations: 20 documentos                    │
│   db_tenant_gimnasio-fitmax.tenant_roles: 5 roles                           │
│     - admin, employee, provider, client, regional_manager                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Tipos de Usuarios

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TIPOS DE USUARIOS EN FITMAX                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ═══════════════════════════════════════════════════════════════════════   │
│   TIPO 1: ADMIN (Acceso a todo el tenant)                                   │
│   ═══════════════════════════════════════════════════════════════════════   │
│                                                                              │
│   User: CEO de FitMax                                                       │
│   FusionAuth User.data:                                                     │
│     roles: ["admin"]                                                        │
│     organizationIds: []  // Vacío = TODAS las orgs                          │
│                                                                              │
│   Registrations:                                                            │
│     Dashboard: roles = ["admin"]                                            │
│                                                                              │
│   Permisos en Cerbos:                                                       │
│     → isSuperRole = true → puede hacer TODO                                 │
│     → No se evalúa organizationId                                           │
│                                                                              │
│   ═══════════════════════════════════════════════════════════════════════   │
│   TIPO 2: REGIONAL MANAGER (Acceso a grupo de sedes)                        │
│   ═══════════════════════════════════════════════════════════════════════   │
│                                                                              │
│   User: Gerente Región Norte (5 sedes)                                      │
│   FusionAuth User.data:                                                     │
│     roles: ["regional_manager"]                                             │
│     organizationIds: ["madrid_norte", "bilbao", "santander",                │
│                       "vitoria", "pamplona"]                                │
│     primaryOrganizationId: "madrid_norte"                                   │
│                                                                              │
│   Registrations:                                                            │
│     Dashboard: roles = ["regional_manager"]                                 │
│                                                                              │
│   Permisos en Cerbos:                                                       │
│     → Puede hacer * en recursos donde                                       │
│       R.attr.organizationId in ["madrid_norte", "bilbao", ...]              │
│                                                                              │
│   ═══════════════════════════════════════════════════════════════════════   │
│   TIPO 3: EMPLOYEE (Acceso a 1-2 sedes)                                     │
│   ═══════════════════════════════════════════════════════════════════════   │
│                                                                              │
│   User: Recepcionista Madrid Centro                                         │
│   FusionAuth User.data:                                                     │
│     roles: ["employee"]                                                     │
│     organizationIds: ["madrid_centro"]                                      │
│     primaryOrganizationId: "madrid_centro"                                  │
│                                                                              │
│   Registrations:                                                            │
│     Dashboard: roles = ["employee"]                                         │
│                                                                              │
│   Permisos en Cerbos:                                                       │
│     → CRUD bookings donde organizationId = "madrid_centro"                  │
│     → NO puede ver bookings de otras sedes                                  │
│                                                                              │
│   ═══════════════════════════════════════════════════════════════════════   │
│   TIPO 4: EMPLOYEE MULTI-SEDE                                               │
│   ═══════════════════════════════════════════════════════════════════════   │
│                                                                              │
│   User: Instructor de Spinning (trabaja en 3 sedes)                         │
│   FusionAuth User.data:                                                     │
│     roles: ["provider", "employee"]  // Múltiples roles                     │
│     organizationIds: ["madrid_centro", "madrid_norte", "madrid_sur"]        │
│     primaryOrganizationId: "madrid_centro"                                  │
│                                                                              │
│   Registrations:                                                            │
│     Dashboard: roles = ["employee"]  // Como empleado                       │
│     WebApp: roles = ["provider"]     // Como instructor                     │
│                                                                              │
│   Permisos en Cerbos:                                                       │
│     En Dashboard (employee):                                                │
│       → CRUD bookings de sus 3 sedes                                        │
│     En WebApp (provider):                                                   │
│       → Ver sus clases asignadas                                            │
│       → Marcar asistencia                                                   │
│                                                                              │
│   ═══════════════════════════════════════════════════════════════════════   │
│   TIPO 5: CLIENT SINGLE-SEDE                                                │
│   ═══════════════════════════════════════════════════════════════════════   │
│                                                                              │
│   User: Cliente normal (solo va a Madrid Centro)                            │
│   FusionAuth User.data:                                                     │
│     roles: ["client"]                                                       │
│     organizationIds: ["madrid_centro"]                                      │
│                                                                              │
│   Registrations:                                                            │
│     WebApp: roles = ["client"]                                              │
│                                                                              │
│   Permisos en Cerbos:                                                       │
│     → Solo ve servicios/recursos de madrid_centro                           │
│     → Solo puede reservar en madrid_centro                                  │
│                                                                              │
│   ═══════════════════════════════════════════════════════════════════════   │
│   TIPO 6: CLIENT MULTI-SEDE (Membresía Premium)                             │
│   ═══════════════════════════════════════════════════════════════════════   │
│                                                                              │
│   User: Cliente Premium (acceso a todas las sedes)                          │
│   FusionAuth User.data:                                                     │
│     roles: ["client"]                                                       │
│     organizationIds: []  // Vacío = TODAS las orgs                          │
│                                                                              │
│   Registrations:                                                            │
│     WebApp: roles = ["client"]                                              │
│                                                                              │
│   Permisos en Cerbos:                                                       │
│     → organizationIds vacío se interpreta como "todas"                      │
│     → Puede reservar en cualquier sede                                      │
│                                                                              │
│   (La lógica de membership/pago se gestiona en Bloque 4: Negocio)          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.3 Flujo Completo de Ejemplo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│     FLUJO: INSTRUCTOR CONSULTA ASISTENTES DE SU CLASE EN OTRA SEDE          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   USUARIO: Carlos (Instructor de Spinning)                                  │
│   ROLES: ["provider", "employee"]                                           │
│   ORGANIZATIONS: ["madrid_centro", "madrid_norte", "madrid_sur"]            │
│                                                                              │
│   ACCIÓN: Ver asistentes de su clase en madrid_norte                        │
│                                                                              │
│   ─────────────────────────────────────────────────────────────────────     │
│                                                                              │
│   1. Carlos accede a Dashboard (dashboard.fitmax.serveflow.app)             │
│                                                                              │
│   2. Login via FusionAuth:                                                  │
│      → Registration en Dashboard: roles = ["employee"]                      │
│      → JWT generado:                                                        │
│        {                                                                     │
│          sub: "carlos_123",                                                 │
│          roles: ["employee"],                                               │
│          organizationIds: ["madrid_centro", "madrid_norte", "madrid_sur"],  │
│          tenantSlug: "gimnasio-fitmax"                                      │
│        }                                                                     │
│                                                                              │
│   3. Carlos selecciona sede "Madrid Norte" en OrganizationSwitcher          │
│      → UI cambia contexto a madrid_norte                                    │
│                                                                              │
│   4. Carlos navega a: Clases → Spinning Lunes 10:00 → Ver Asistentes        │
│                                                                              │
│   5. Frontend hace:                                                         │
│      GET /api/events/event_123/attendees                                    │
│      Headers: Authorization: Bearer {jwt}                                   │
│      Query: organizationId=madrid_norte                                     │
│                                                                              │
│   6. Backend:                                                               │
│      a. TenantAuthGuard: valida JWT ✓                                       │
│      b. Carga evento: event_123 pertenece a madrid_norte                    │
│      c. CerbosGuard consulta:                                               │
│         {                                                                    │
│           principal: {                                                       │
│             id: "carlos_123",                                               │
│             roles: ["employee"],                                            │
│             attr: { organizationIds: ["madrid_centro", "madrid_norte", ...]}│
│           },                                                                 │
│           resource: {                                                        │
│             kind: "event",                                                  │
│             id: "event_123",                                                │
│             attr: { organizationId: "madrid_norte" }                        │
│           },                                                                 │
│           action: "read_attendees"                                          │
│         }                                                                    │
│                                                                              │
│      d. Cerbos evalúa:                                                      │
│         Regla employee_manage:                                              │
│         - roles: ["employee"] ✓                                             │
│         - action: "read_attendees" ∈ ["read", "list", ...] ✓               │
│         - madrid_norte in [madrid_centro, madrid_norte, madrid_sur] ✓      │
│         → ALLOW                                                             │
│                                                                              │
│   7. Response: lista de asistentes                                          │
│                                                                              │
│   ─────────────────────────────────────────────────────────────────────     │
│                                                                              │
│   CASO DENEGADO: Carlos intenta ver clase de Barcelona                      │
│                                                                              │
│   → CerbosGuard consulta con:                                               │
│     resource: { attr: { organizationId: "barcelona" } }                     │
│                                                                              │
│   → Cerbos evalúa:                                                          │
│     - "barcelona" in ["madrid_centro", "madrid_norte", "madrid_sur"] ✗     │
│     → DENY                                                                  │
│                                                                              │
│   → Response: 403 Forbidden                                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.4 Matriz de Permisos Resultante

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MATRIZ DE PERMISOS: GIMNASIO FITMAX                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   RECURSO: booking                                                          │
│   ──────────────────                                                         │
│                                                                              │
│   Rol              │ create │ read │ update │ cancel │ check_in │ Scope     │
│   ─────────────────┼────────┼──────┼────────┼────────┼──────────┼───────────│
│   admin            │   ✓    │  ✓   │   ✓    │   ✓    │    ✓     │ TODO      │
│   regional_manager │   ✓    │  ✓   │   ✓    │   ✓    │    ✓     │ Sus orgs  │
│   employee         │   ✓    │  ✓   │   ✓    │   ✓    │    ✓     │ Sus orgs  │
│   provider         │   ✗    │  ✓*  │   ✗    │   ✗    │    ✓*    │ Sus clases│
│   client           │   ✓*   │  ✓*  │   ✗    │   ✓*   │    ✗     │ Propias   │
│                                                                              │
│   * = con condiciones adicionales                                           │
│                                                                              │
│   RECURSO: service                                                          │
│   ────────────────                                                           │
│                                                                              │
│   Rol              │ create │ read │ update │ delete │ Scope                │
│   ─────────────────┼────────┼──────┼────────┼────────┼──────────────────────│
│   admin            │   ✓    │  ✓   │   ✓    │   ✓    │ TODO                 │
│   regional_manager │   ✓    │  ✓   │   ✓    │   ✓    │ Sus orgs             │
│   employee         │   ✗    │  ✓   │   ✗    │   ✗    │ Sus orgs             │
│   provider         │   ✗    │  ✓   │   ✗    │   ✗    │ Sus orgs             │
│   client           │   ✗    │  ✓   │   ✗    │   ✗    │ Sus orgs             │
│                                                                              │
│   RECURSO: user                                                             │
│   ─────────────────                                                          │
│                                                                              │
│   Rol              │ create │ read │ update │ delete │ Scope                │
│   ─────────────────┼────────┼──────┼────────┼────────┼──────────────────────│
│   admin            │   ✓    │  ✓   │   ✓    │   ✓    │ TODO                 │
│   regional_manager │   ✓    │  ✓   │   ✓    │   ✗    │ Usuarios de sus orgs │
│   employee         │   ✗    │  ✓   │   ✗    │   ✗    │ Clientes de sus orgs │
│   provider         │   ✗    │  ✓   │   ✗    │   ✗    │ Sus alumnos          │
│   client           │   ✗    │  ✓*  │   ✓*   │   ✗    │ Solo él mismo        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Implementación Técnica

### 9.1 Package @serveflow/authorization

```
packages/authorization/
├── src/
│   ├── index.ts
│   ├── guards/
│   │   ├── tenant-auth.guard.ts      # Valida JWT + inyecta contexto
│   │   ├── cerbos.guard.ts           # Consulta Cerbos
│   │   └── role.guard.ts             # Verifica roles simples
│   ├── decorators/
│   │   ├── check-permission.ts       # @CheckPermission({resource, action})
│   │   ├── require-role.ts           # @RequireRole('admin', 'employee')
│   │   └── auth-context.ts           # @AuthContext() para inyectar ctx
│   ├── services/
│   │   ├── cerbos.service.ts         # Cliente de Cerbos
│   │   ├── role.service.ts           # Gestión de roles
│   │   └── permission.service.ts     # Lógica de permisos
│   ├── utils/
│   │   ├── jwt-to-principal.ts       # Mapeo JWT → Cerbos Principal
│   │   └── resource-loader.ts        # Carga atributos de recursos
│   ├── hooks/                        # Frontend React
│   │   ├── usePermission.ts
│   │   ├── useRoles.ts
│   │   └── useOrganization.ts
│   ├── components/                   # Frontend React
│   │   ├── Can.tsx
│   │   ├── HasRole.tsx
│   │   └── OrganizationSwitcher.tsx
│   └── types/
│       ├── auth-context.ts
│       ├── permission.ts
│       └── jwt.ts
├── package.json
└── tsconfig.json
```

### 9.2 Flujo de Request Completo

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// 1. CONTROLLER: Define qué permisos necesita cada endpoint
// ═══════════════════════════════════════════════════════════════════════════
@Controller('bookings')
@UseGuards(TenantAuthGuard)  // Siempre valida JWT
export class BookingsController {

  @Get()
  async list(@AuthContext() ctx: AuthContext, @Query() query: ListDto) {
    // Para listar, filtramos en la query según el scope del usuario
    const filters = this.buildFilters(ctx, query);
    return this.bookingsService.list(ctx.tenantSlug, filters);
  }

  @Get(':id')
  @CheckPermission({ resource: 'booking', action: 'read', idParam: 'id' })
  async get(@Param('id') id: string, @AuthContext() ctx: AuthContext) {
    return this.bookingsService.get(ctx.tenantSlug, id);
  }

  @Post()
  @CheckPermission({ resource: 'booking', action: 'create' })
  async create(@Body() dto: CreateDto, @AuthContext() ctx: AuthContext) {
    // Verificar que puede crear en la org especificada
    this.validateOrganizationAccess(ctx, dto.organizationId);
    return this.bookingsService.create(ctx.tenantSlug, dto);
  }

  @Post(':id/cancel')
  @CheckPermission({ resource: 'booking', action: 'cancel', idParam: 'id' })
  async cancel(@Param('id') id: string, @AuthContext() ctx: AuthContext) {
    return this.bookingsService.cancel(ctx.tenantSlug, id);
  }

  private buildFilters(ctx: AuthContext, query: ListDto): BookingFilters {
    // Admin sin restricción de org ve todo
    if (ctx.roles.includes('admin') && ctx.organizationIds.length === 0) {
      return query;
    }

    // Otros ven solo de sus organizations
    if (ctx.organizationIds.length > 0) {
      return { ...query, organizationId: { $in: ctx.organizationIds } };
    }

    // organizationIds vacío para no-admin = todas (cliente premium)
    return query;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. GUARD: TenantAuthGuard - Valida JWT e inyecta contexto
// ═══════════════════════════════════════════════════════════════════════════
@Injectable()
export class TenantAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // 1. Extraer JWT
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException();

    // 2. Validar con FusionAuth
    const jwt = await this.jwtService.verify<ServeflowJWT>(token);

    // 3. Obtener tenant
    const tenant = await this.tenantService.getBySlug(jwt.tenantSlug);

    // 4. Verificar que el token es para una app de este tenant
    if (!this.isValidApp(jwt.aud, tenant)) {
      throw new ForbiddenException('Invalid application');
    }

    // 5. Inyectar contexto
    request.authContext = {
      userId: jwt.sub,
      tenantSlug: jwt.tenantSlug,
      roles: jwt.roles,
      organizationIds: jwt.organizationIds || [],
      primaryOrganizationId: jwt.primaryOrganizationId,
      appType: this.getAppType(jwt.aud, tenant),
      principal: this.buildCerbosPrincipal(jwt),
    };

    return true;
  }

  private buildCerbosPrincipal(jwt: ServeflowJWT): Principal {
    return {
      id: jwt.sub,
      roles: jwt.roles,
      attr: {
        tenantSlug: jwt.tenantSlug,
        organizationIds: jwt.organizationIds || [],
        email: jwt.email,
      },
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. GUARD: CerbosGuard - Consulta Cerbos para verificar permisos
// ═══════════════════════════════════════════════════════════════════════════
@Injectable()
export class CerbosGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.get<CheckPermissionOptions>(
      CHECK_PERMISSION_KEY,
      context.getHandler(),
    );

    if (!permission) return true;

    const request = context.switchToHttp().getRequest();
    const { principal, tenantSlug } = request.authContext;

    // Construir recurso
    const resource = await this.buildResource(permission, request);

    // Consultar Cerbos
    const decision = await this.cerbos.checkResource({
      principal,
      resource,
      actions: [permission.action],
      auxData: {
        jwt: { scope: tenantSlug },  // Para scoped policies
      },
    });

    if (!decision.isAllowed(permission.action)) {
      throw new ForbiddenException('Permission denied');
    }

    return true;
  }

  private async buildResource(
    permission: CheckPermissionOptions,
    request: Request,
  ): Promise<Resource> {
    const resourceId = permission.idParam
      ? request.params[permission.idParam]
      : '';

    // Cargar atributos del recurso desde MongoDB
    let attr: Record<string, unknown> = {};
    if (resourceId) {
      const doc = await this.loadResource(permission.resource, resourceId);
      attr = {
        organizationId: doc.organizationId?.toString(),
        userId: doc.userId?.toString(),
        ownerId: doc.ownerId?.toString(),
        status: doc.status,
        ...doc.attr,
      };
    }

    return {
      kind: permission.resource,
      id: resourceId,
      attr,
    };
  }
}
```

### 9.3 Frontend: Componentes de Autorización

```tsx
// ═══════════════════════════════════════════════════════════════════════════
// Hook: usePermission
// ═══════════════════════════════════════════════════════════════════════════
export function usePermission() {
  const { token } = useAuth();

  const checkPermission = useCallback(
    async (resource: string, action: string, resourceId?: string): Promise<boolean> => {
      const response = await fetch('/api/auth/check', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resource, action, resourceId }),
      });
      const { allowed } = await response.json();
      return allowed;
    },
    [token],
  );

  return { checkPermission };
}

// ═══════════════════════════════════════════════════════════════════════════
// Component: Can
// ═══════════════════════════════════════════════════════════════════════════
interface CanProps {
  resource: string;
  action: string;
  resourceId?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function Can({ resource, action, resourceId, children, fallback }: CanProps) {
  const { checkPermission } = usePermission();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    checkPermission(resource, action, resourceId).then(setAllowed);
  }, [resource, action, resourceId]);

  if (allowed === null) return null;  // Loading
  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}

// Uso:
<Can resource="booking" action="cancel" resourceId={booking.id}>
  <Button onClick={handleCancel}>Cancelar Reserva</Button>
</Can>

// ═══════════════════════════════════════════════════════════════════════════
// Component: OrganizationSwitcher
// ═══════════════════════════════════════════════════════════════════════════
export function OrganizationSwitcher() {
  const { user } = useAuth();
  const { currentOrg, setCurrentOrg, organizations } = useOrganization();

  // Si el usuario tiene acceso a todas las orgs (array vacío o admin)
  const hasFullAccess = user.organizationIds.length === 0;

  return (
    <Select value={currentOrg?.id} onValueChange={setCurrentOrg}>
      <SelectTrigger>
        <BuildingIcon />
        <span>{currentOrg?.name || 'Todas las sedes'}</span>
      </SelectTrigger>
      <SelectContent>
        {hasFullAccess && (
          <SelectItem value="">Todas las sedes</SelectItem>
        )}
        {organizations.map(org => (
          <SelectItem key={org.id} value={org.id}>
            {org.name}
            {org.id === user.primaryOrganizationId && (
              <Badge variant="secondary">Principal</Badge>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

### 9.4 Autorización en Frontend: Rutas y UI

> **Principio de diseño:** El frontend usa una abstracción que hoy lee defaults y mañana lee config del tenant.
> Cambiar de "hardcoded" a "dinámico" solo requiere modificar la fuente de datos, no los componentes.

#### 9.4.1 Modelo de Datos: Configuración de Rutas por App

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// MODELO UNIFICADO: AppRoute
// Usado tanto para Dashboard como para WebApp
// Diseñado para ser EXTENSIBLE: campos opcionales se implementan en Bloque 4
// ═══════════════════════════════════════════════════════════════════════════

type AppType = 'dashboard' | 'webapp';

// Tipos de vista disponibles (extensible en Bloque 4)
type ViewType =
  | 'list' | 'calendar' | 'kanban' | 'crm' | 'grid' | 'form' | 'timeline'  // Dashboard
  | 'cards' | 'profile' | 'detail';  // WebApp

// Filtros especiales que se resuelven en runtime
type SpecialFilter = 'ME' | 'MY_ORGS';

// ═══════════════════════════════════════════════════════════════════════════
// AppRoute: Modelo base EXTENSIBLE
// ═══════════════════════════════════════════════════════════════════════════

interface AppRoute {
  // ─────────────────────────────────────────────────────────────────────────
  // FASE 1 (Hito 3): Campos obligatorios - Autorización básica
  // ─────────────────────────────────────────────────────────────────────────
  id: string;                  // Identificador único: "events", "clients"
  path: string;                // Ruta: "/events", "/clients"
  label: string;               // Label en navegación: "Eventos", "Clientes"
  icon?: string;               // Icono: "calendar", "users"
  allowedRoles: string[];      // Roles que pueden ver esta ruta: ["admin", "employee"]
                               // Usar ["*"] para rutas públicas (solo webapp)
  isEnabled: boolean;          // Para ocultar rutas sin eliminarlas
  order: number;               // Orden en navegación

  // Sub-rutas (opcional)
  children?: AppRoute[];

  // ─────────────────────────────────────────────────────────────────────────
  // FASE 2 (Bloque 4): Campos opcionales - Sistema de Vistas
  // Estos campos se definen ahora pero se IMPLEMENTAN en Bloque 4
  // Ver docs/v2/04-NEGOCIO.md para especificación completa
  // ─────────────────────────────────────────────────────────────────────────
  resource?: string;                         // Recurso asociado: "events", "users", "bookings"
  availableViews?: ViewType[];               // Vistas disponibles: ["calendar", "list"]
  defaultView?: ViewType;                    // Vista por defecto: "calendar"
  defaultFilters?: Record<string, unknown>;  // Filtros predefinidos: { serviceType: "class" }
                                             // Soporta SpecialFilter: { userId: "ME" }
}

// ═══════════════════════════════════════════════════════════════════════════
// AppConfig: Configuración por App
// Collection: db_tenant_{slug}.app_config
// ═══════════════════════════════════════════════════════════════════════════

interface AppConfig {
  _id: ObjectId;
  app: AppType;                // 'dashboard' | 'webapp'
  routes: AppRoute[];

  // Solo para webapp
  publicRoutes?: string[];     // Rutas sin autenticación: ["/", "/services"]

  // Configuración adicional
  homeWidgets?: Record<string, string[]>;  // Widgets por rol en home
  theme?: ThemeConfig;                      // Override de tema por app

  updatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULTS: Dashboard
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_DASHBOARD_ROUTES: AppRoute[] = [
  {
    id: 'home',
    path: '/',
    label: 'Dashboard',
    icon: 'home',
    allowedRoles: ['admin', 'employee', 'provider'],
    isEnabled: true,
    order: 0,
    // Bloque 4: resource: 'dashboard', defaultView: 'widgets'
  },
  {
    id: 'bookings',
    path: '/bookings',
    label: 'Reservas',
    icon: 'calendar',
    allowedRoles: ['admin', 'employee', 'provider'],
    isEnabled: true,
    order: 1,
    resource: 'bookings',  // Preparado para Bloque 4
    // Bloque 4: availableViews: ['list', 'calendar'], defaultView: 'list'
  },
  {
    id: 'events',
    path: '/events',
    label: 'Eventos',
    icon: 'calendar-days',
    allowedRoles: ['admin', 'employee'],
    isEnabled: true,
    order: 2,
    resource: 'events',
    // Bloque 4: availableViews: ['calendar', 'list'], defaultView: 'calendar'
  },
  {
    id: 'services',
    path: '/services',
    label: 'Servicios',
    icon: 'list',
    allowedRoles: ['admin', 'employee'],
    isEnabled: true,
    order: 3,
    resource: 'services',
  },
  {
    id: 'users',
    path: '/users',
    label: 'Usuarios',
    icon: 'users',
    allowedRoles: ['admin'],
    isEnabled: true,
    order: 4,
    resource: 'users',
    // Bloque 4: availableViews: ['list', 'crm'], defaultView: 'list'
  },
  {
    id: 'organizations',
    path: '/organizations',
    label: 'Sedes',
    icon: 'building',
    allowedRoles: ['admin'],
    isEnabled: true,
    order: 5,
    resource: 'organizations',
  },
  {
    id: 'settings',
    path: '/settings',
    label: 'Configuración',
    icon: 'settings',
    allowedRoles: ['admin'],
    isEnabled: true,
    order: 6,
    resource: 'settings',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULTS: WebApp
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_WEBAPP_ROUTES: AppRoute[] = [
  {
    id: 'home',
    path: '/',
    label: 'Inicio',
    icon: 'home',
    allowedRoles: ['*'],  // Público
    isEnabled: true,
    order: 0,
  },
  {
    id: 'services',
    path: '/services',
    label: 'Servicios',
    icon: 'grid',
    allowedRoles: ['*'],  // Público
    isEnabled: true,
    order: 1,
    resource: 'services',
    // Bloque 4: availableViews: ['cards', 'list'], defaultView: 'cards'
  },
  {
    id: 'my-bookings',
    path: '/my-bookings',
    label: 'Mis Reservas',
    icon: 'calendar',
    allowedRoles: ['client', 'provider'],
    isEnabled: true,
    order: 2,
    resource: 'bookings',
    defaultFilters: { userId: 'ME' },  // Filtro especial: solo mis reservas
    // Bloque 4: availableViews: ['list', 'calendar'], defaultView: 'list'
  },
  {
    id: 'my-classes',
    path: '/my-classes',
    label: 'Mis Clases',
    icon: 'dumbbell',
    allowedRoles: ['provider'],
    isEnabled: true,
    order: 3,
    resource: 'events',
    defaultFilters: { instructorId: 'ME' },  // Solo clases donde soy instructor
    // Bloque 4: availableViews: ['calendar', 'list'], defaultView: 'calendar'
  },
  {
    id: 'profile',
    path: '/profile',
    label: 'Mi Perfil',
    icon: 'user',
    allowedRoles: ['client', 'provider'],
    isEnabled: true,
    order: 4,
    resource: 'users',
    defaultFilters: { userId: 'ME' },
    // Bloque 4: availableViews: ['profile'], defaultView: 'profile'
  },
];

// Rutas públicas de WebApp (no requieren autenticación)
const DEFAULT_WEBAPP_PUBLIC_ROUTES = ['/', '/services', '/services/[slug]'];
```

#### 9.4.1.1 Diferencias Dashboard vs WebApp

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DASHBOARD vs WEBAPP                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   TENANT DASHBOARD                        TENANT WEBAPP                      │
│   ════════════════                        ═════════════                      │
│   Usuarios: admin, employee, provider*    Usuarios: client, provider         │
│                                                                              │
│   Propósito:                              Propósito:                         │
│   • Gestión del negocio                   • Consumo de servicios             │
│   • Muchas vistas configurables           • UX simple y directa              │
│   • Alta personalización                  • Menos personalización            │
│                                                                              │
│   Views típicas:                          Views típicas:                     │
│   • list, calendar, kanban, crm           • cards, list, profile             │
│                                                                              │
│   Rutas públicas: NO                      Rutas públicas: SÍ                 │
│   (todo requiere auth)                    (/, /services)                     │
│                                                                              │
│   ─────────────────────────────────────────────────────────────────────     │
│                                                                              │
│   MISMO MODELO AppRoute, DIFERENTES INSTANCIAS                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 9.4.2 Hook: useAuthorization

```tsx
// ═══════════════════════════════════════════════════════════════════════════
// packages/authorization/src/hooks/use-authorization.ts
// Hook UNIFICADO para Dashboard y WebApp
// ═══════════════════════════════════════════════════════════════════════════

interface UseAuthorizationOptions {
  app: AppType;  // 'dashboard' | 'webapp'
}

interface AuthorizationContext {
  // App actual
  app: AppType;

  // Datos del usuario (del JWT)
  userRoles: string[];
  organizationIds: string[];
  isAuthenticated: boolean;

  // Configuración de rutas (del tenant o defaults)
  routes: AppRoute[];
  publicRoutes: string[];  // Solo relevante para webapp

  // Helpers de roles
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;

  // Helpers de rutas
  canAccessRoute: (path: string) => boolean;
  getAccessibleRoutes: () => AppRoute[];
  isPublicRoute: (path: string) => boolean;
}

export function useAuthorization(options: UseAuthorizationOptions): AuthorizationContext {
  const { app } = options;
  const { user, isAuthenticated } = useCurrentUser();
  const { tenant } = useTenant();

  // Roles del usuario (del JWT decodificado)
  const userRoles = useMemo(() => user?.roles || [], [user]);
  const organizationIds = useMemo(() => user?.organizationIds || [], [user]);

  // ═══════════════════════════════════════════════════════════════════════
  // RUTAS: Selecciona defaults según app, o usa config del tenant
  // ═══════════════════════════════════════════════════════════════════════
  const { routes, publicRoutes } = useMemo(() => {
    // Fase 2: cuando tengamos app_config en MongoDB
    // const tenantConfig = tenant?.appConfigs?.find(c => c.app === app);
    // if (tenantConfig) {
    //   return {
    //     routes: tenantConfig.routes,
    //     publicRoutes: tenantConfig.publicRoutes || [],
    //   };
    // }

    // Fase 1: usar defaults según app
    if (app === 'dashboard') {
      return {
        routes: DEFAULT_DASHBOARD_ROUTES,
        publicRoutes: [],  // Dashboard no tiene rutas públicas
      };
    }

    return {
      routes: DEFAULT_WEBAPP_ROUTES,
      publicRoutes: DEFAULT_WEBAPP_PUBLIC_ROUTES,
    };
  }, [app, tenant]);

  // ═══════════════════════════════════════════════════════════════════════
  // HELPERS: Roles
  // ═══════════════════════════════════════════════════════════════════════

  const hasRole = useCallback(
    (role: string) => userRoles.includes(role),
    [userRoles]
  );

  const hasAnyRole = useCallback(
    (roles: string[]) => {
      // '*' significa público / todos
      if (roles.includes('*')) return true;
      return roles.some(r => userRoles.includes(r));
    },
    [userRoles]
  );

  // ═══════════════════════════════════════════════════════════════════════
  // HELPERS: Rutas
  // ═══════════════════════════════════════════════════════════════════════

  const isPublicRoute = useCallback(
    (path: string) => {
      return publicRoutes.some(pr => {
        // Soporta patterns simples como /services/[slug]
        const pattern = pr.replace(/\[.*?\]/g, '[^/]+');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(path);
      });
    },
    [publicRoutes]
  );

  const canAccessRoute = useCallback(
    (path: string) => {
      // Ruta pública = acceso libre
      if (isPublicRoute(path)) return true;

      // No autenticado y no es ruta pública = no puede
      if (!isAuthenticated) return false;

      const route = routes.find(r =>
        path === r.path || path.startsWith(r.path + '/')
      );

      // Ruta no definida = acceso libre para autenticados
      if (!route) return true;

      // Ruta deshabilitada
      if (!route.isEnabled) return false;

      // Verificar roles
      return hasAnyRole(route.allowedRoles);
    },
    [routes, hasAnyRole, isPublicRoute, isAuthenticated]
  );

  const getAccessibleRoutes = useCallback(
    () => routes
      .filter(r => {
        if (!r.isEnabled) return false;
        // Rutas públicas siempre visibles
        if (r.allowedRoles.includes('*')) return true;
        // Rutas privadas solo si tiene rol
        return isAuthenticated && hasAnyRole(r.allowedRoles);
      })
      .sort((a, b) => a.order - b.order),
    [routes, hasAnyRole, isAuthenticated]
  );

  return {
    app,
    userRoles,
    organizationIds,
    isAuthenticated,
    routes,
    publicRoutes,
    hasRole,
    hasAnyRole,
    canAccessRoute,
    getAccessibleRoutes,
    isPublicRoute,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Hooks especializados para cada app (sugar syntax)
// ═══════════════════════════════════════════════════════════════════════════

export function useDashboardAuthorization() {
  return useAuthorization({ app: 'dashboard' });
}

export function useWebAppAuthorization() {
  return useAuthorization({ app: 'webapp' });
}
```

#### 9.4.3 Protección de Rutas en Middleware

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// apps/tenant/dashboard/src/middleware.ts
// ═══════════════════════════════════════════════════════════════════════════

import { DEFAULT_DASHBOARD_ROUTES } from '@serveflow/authorization';

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // ═══════════════════════════════════════════════════════════════════════
  // 1. Rutas siempre públicas (auth, webhooks)
  // ═══════════════════════════════════════════════════════════════════════
  const publicRoutes = ['/sign-in', '/sign-up', '/api/webhooks', '/unauthorized'];
  if (publicRoutes.some(r => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 2. Validar autenticación
  // ═══════════════════════════════════════════════════════════════════════
  const accessToken = req.cookies.get('fa_access_token')?.value;
  if (!accessToken) {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  const tokenResult = await verifyFusionAuthToken(accessToken);
  if (!tokenResult.valid) {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  const userRoles = tokenResult.roles || [];

  // ═══════════════════════════════════════════════════════════════════════
  // 3. Verificar acceso a ruta
  // ═══════════════════════════════════════════════════════════════════════

  // Fase 2: cargar config del tenant desde API/cache
  // const tenantConfig = await getTenantDashboardConfig(tenantSlug);
  // const routes = tenantConfig?.routes || DEFAULT_DASHBOARD_ROUTES;

  // Fase 1: usar defaults
  const routes = DEFAULT_DASHBOARD_ROUTES;

  const matchedRoute = routes.find(r =>
    pathname === r.path || pathname.startsWith(r.path + '/')
  );

  if (matchedRoute) {
    const hasAccess = matchedRoute.allowedRoles.some(r => userRoles.includes(r));

    if (!hasAccess) {
      // Redirigir a página de no autorizado
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 4. Continuar con headers inyectados
  // ═══════════════════════════════════════════════════════════════════════
  const response = NextResponse.next();
  response.headers.set('x-user-roles', JSON.stringify(userRoles));
  return response;
}
```

#### 9.4.4 Navegación Dinámica

```tsx
// ═══════════════════════════════════════════════════════════════════════════
// apps/tenant/dashboard/src/components/nav/DashboardNav.tsx
// ═══════════════════════════════════════════════════════════════════════════

import { useAuthorization } from '@serveflow/authorization';
import { ICON_MAP } from './icons';

export function DashboardNav() {
  const { getAccessibleRoutes } = useAuthorization();
  const pathname = usePathname();

  // Solo muestra rutas a las que el usuario tiene acceso
  const accessibleRoutes = getAccessibleRoutes();

  return (
    <nav className="flex flex-col gap-1">
      {accessibleRoutes.map(route => {
        const Icon = ICON_MAP[route.icon];
        const isActive = pathname === route.path || pathname.startsWith(route.path + '/');

        return (
          <Link
            key={route.path}
            href={route.path}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md',
              isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            <span>{route.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
```

#### 9.4.5 Componente Can (Mejorado)

```tsx
// ═══════════════════════════════════════════════════════════════════════════
// packages/ui/src/components/authorization/Can.tsx
// ═══════════════════════════════════════════════════════════════════════════

interface CanProps {
  /** Verificar por roles (Fase 1 - actual) */
  roles?: string[];

  /** Verificar por permiso específico (Fase 2 - con Cerbos) */
  permission?: { resource: string; action: string; resourceId?: string };

  /** Contenido a mostrar si tiene permiso */
  children: React.ReactNode;

  /** Contenido alternativo si NO tiene permiso */
  fallback?: React.ReactNode;
}

export function Can({ roles, permission, children, fallback = null }: CanProps) {
  const { hasAnyRole } = useAuthorization();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    // ═══════════════════════════════════════════════════════════════════
    // FASE 1: Verificación por roles (síncrona, inmediata)
    // ═══════════════════════════════════════════════════════════════════
    if (roles && roles.length > 0) {
      setAllowed(hasAnyRole(roles));
      return;
    }

    // ═══════════════════════════════════════════════════════════════════
    // FASE 2: Verificación por permiso (asíncrona, consulta backend/Cerbos)
    // ═══════════════════════════════════════════════════════════════════
    if (permission) {
      // Por ahora: derivar de roles
      // Futuro: llamada a /api/auth/check
      const derivedAllowed = derivePermissionFromRoles(
        userRoles,
        permission.resource,
        permission.action
      );
      setAllowed(derivedAllowed);
      return;
    }

    // Sin restricción
    setAllowed(true);
  }, [roles, permission, hasAnyRole]);

  // Loading state
  if (allowed === null) return null;

  // No permitido
  if (!allowed) return <>{fallback}</>;

  // Permitido
  return <>{children}</>;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Derivar permisos de roles (Fase 1, antes de Cerbos)
// ═══════════════════════════════════════════════════════════════════════════

function derivePermissionFromRoles(
  roles: string[],
  resource: string,
  action: string
): boolean {
  // Admin puede todo
  if (roles.includes('admin')) return true;

  // Reglas básicas por rol
  const ROLE_PERMISSIONS: Record<string, Record<string, string[]>> = {
    employee: {
      booking: ['create', 'read', 'update', 'cancel', 'list'],
      event: ['read', 'list'],
      service: ['read', 'list'],
      user: ['read', 'list'],  // Solo leer
    },
    provider: {
      booking: ['read', 'list'],
      event: ['read', 'update', 'list'],
    },
    client: {
      booking: ['create', 'read', 'cancel'],  // Solo los propios
      event: ['read', 'list'],
      service: ['read', 'list'],
    },
  };

  for (const role of roles) {
    const permissions = ROLE_PERMISSIONS[role];
    if (permissions?.[resource]?.includes(action)) {
      return true;
    }
  }

  return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// USO EN COMPONENTES
// ═══════════════════════════════════════════════════════════════════════════

// Ejemplo 1: Ocultar botón por rol
<Can roles={['admin', 'employee']}>
  <Button onClick={handleCreateEvent}>Crear Evento</Button>
</Can>

// Ejemplo 2: Ocultar botón por permiso (Fase 2)
<Can permission={{ resource: 'event', action: 'create' }}>
  <Button onClick={handleCreateEvent}>Crear Evento</Button>
</Can>

// Ejemplo 3: Con fallback
<Can roles={['admin']} fallback={<Badge>Solo lectura</Badge>}>
  <Button onClick={handleEdit}>Editar</Button>
</Can>

// Ejemplo 4: Ocultar sección completa
<Can roles={['admin']}>
  <SettingsSection>
    <DangerZone />
  </SettingsSection>
</Can>
```

#### 9.4.6 Flujo Completo de Autorización Frontend

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLUJO: AUTORIZACIÓN FRONTEND                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   USUARIO: Empleado con rol ["employee"]                                    │
│   TENANT: gimnasio-fitmax (usa defaults, sin config personalizada)          │
│                                                                              │
│   ─────────────────────────────────────────────────────────────────────     │
│   1. LOGIN EXITOSO                                                          │
│   ─────────────────────────────────────────────────────────────────────     │
│                                                                              │
│   JWT contiene: { roles: ["employee"], ... }                                │
│   Cookie fa_access_token guardada                                           │
│                                                                              │
│   ─────────────────────────────────────────────────────────────────────     │
│   2. ACCESO A DASHBOARD                                                     │
│   ─────────────────────────────────────────────────────────────────────     │
│                                                                              │
│   Usuario navega a: gimnasio-fitmax.localhost:4200/                         │
│                                                                              │
│   Middleware:                                                               │
│   ├─ ¿Tiene token? → Sí ✓                                                  │
│   ├─ ¿Token válido? → Sí ✓                                                 │
│   ├─ Extrae roles: ["employee"]                                            │
│   └─ Inyecta x-user-roles header                                           │
│                                                                              │
│   ─────────────────────────────────────────────────────────────────────     │
│   3. RENDER NAVEGACIÓN                                                      │
│   ─────────────────────────────────────────────────────────────────────     │
│                                                                              │
│   DashboardNav llama a getAccessibleRoutes():                              │
│                                                                              │
│   DEFAULT_ROUTES:                     FILTRADO (employee tiene acceso):    │
│   ├─ /dashboard  [admin,employee,..] → ✓ Dashboard                         │
│   ├─ /bookings   [admin,employee,..] → ✓ Reservas                          │
│   ├─ /events     [admin,employee]    → ✓ Eventos                           │
│   ├─ /services   [admin,employee]    → ✓ Servicios                         │
│   ├─ /users      [admin]             → ✗ (oculto)                          │
│   └─ /settings   [admin]             → ✗ (oculto)                          │
│                                                                              │
│   Navbar renderiza solo 4 items                                             │
│                                                                              │
│   ─────────────────────────────────────────────────────────────────────     │
│   4. INTENTO DE ACCESO DIRECTO A /users (URL)                              │
│   ─────────────────────────────────────────────────────────────────────     │
│                                                                              │
│   Usuario escribe: gimnasio-fitmax.localhost:4200/users                     │
│                                                                              │
│   Middleware:                                                               │
│   ├─ Ruta /users requiere: ["admin"]                                       │
│   ├─ Usuario tiene: ["employee"]                                           │
│   ├─ Intersección: [] (vacío)                                              │
│   └─ Redirect a /unauthorized                                              │
│                                                                              │
│   ─────────────────────────────────────────────────────────────────────     │
│   5. EN PÁGINA /events - BOTONES                                           │
│   ─────────────────────────────────────────────────────────────────────     │
│                                                                              │
│   <Can roles={['admin', 'employee']}>                                       │
│     <Button>Crear Evento</Button>  → VISIBLE (employee está en lista)      │
│   </Can>                                                                     │
│                                                                              │
│   <Can roles={['admin']}>                                                   │
│     <Button>Eliminar</Button>      → OCULTO (employee no es admin)         │
│   </Can>                                                                     │
│                                                                              │
│   ─────────────────────────────────────────────────────────────────────     │
│   6. PROTECCIÓN BACKEND (Última línea de defensa)                          │
│   ─────────────────────────────────────────────────────────────────────     │
│                                                                              │
│   Si de alguna forma el usuario intenta:                                    │
│   DELETE /api/events/123                                                    │
│                                                                              │
│   Backend con @Roles('admin'):                                              │
│   → 403 Forbidden                                                           │
│                                                                              │
│   El frontend oculta, el backend SIEMPRE valida.                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 9.4.7 Migración Fase 1 → Fase 2 (Configuración por Tenant)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│               MIGRACIÓN: DE DEFAULTS A CONFIG POR TENANT                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   FASE 1 (Actual): Defaults hardcoded                                       │
│   ───────────────────────────────────                                        │
│                                                                              │
│   const routes = DEFAULT_DASHBOARD_ROUTES;                                  │
│                                                                              │
│   ─────────────────────────────────────────────────────────────────────     │
│                                                                              │
│   FASE 2 (Futura): Config desde MongoDB                                     │
│   ────────────────────────────────────                                       │
│                                                                              │
│   // 1. Crear collection en MongoDB                                         │
│   db_tenant_{slug}.dashboard_config.insertOne({                             │
│     routes: [                                                                │
│       { path: '/dashboard', allowedRoles: ['admin', 'employee', 'provider'],│
│         ... },                                                               │
│       // Gimnasio FitMax quiere que providers vean eventos:                 │
│       { path: '/events', allowedRoles: ['admin', 'employee', 'provider'],   │
│         ... },                                                               │
│     ]                                                                        │
│   });                                                                        │
│                                                                              │
│   // 2. Modificar useAuthorization (1 línea)                                │
│   const routes = useMemo(() => {                                            │
│     if (tenant?.dashboardConfig?.routes) {     // ← Descomentar            │
│       return tenant.dashboardConfig.routes;                                 │
│     }                                                                        │
│     return DEFAULT_DASHBOARD_ROUTES;                                        │
│   }, [tenant]);                                                              │
│                                                                              │
│   // 3. Modificar middleware (similar)                                      │
│   const routes = tenantConfig?.routes || DEFAULT_DASHBOARD_ROUTES;          │
│                                                                              │
│   ─────────────────────────────────────────────────────────────────────     │
│                                                                              │
│   CAMBIOS NECESARIOS EN FASE 2:                                             │
│   • Añadir dashboardConfig al schema de Tenant                             │
│   • API para que admin configure rutas: PUT /api/settings/dashboard        │
│   • UI en Settings > Dashboard para arrastrar y configurar rutas           │
│   • Caché de configuración para evitar queries en cada request             │
│                                                                              │
│   COMPONENTES QUE NO CAMBIAN:                                               │
│   • DashboardNav (usa getAccessibleRoutes)                                  │
│   • Can (usa hasAnyRole)                                                    │
│   • Cualquier componente que use useAuthorization                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 9.5 Definición Centralizada de Recursos

Los recursos del sistema deben estar definidos en un único lugar para garantizar consistencia entre:
- **Cerbos**: Policies (resource type)
- **Frontend**: ResourceType enum, vistas, navegación
- **Backend**: Validación, controladores
- **MongoDB**: Collections

#### 9.5.1 Catálogo de Recursos del Sistema

```typescript
// packages/core/src/resources/index.ts

/**
 * CATÁLOGO CENTRALIZADO DE RECURSOS
 *
 * Cada recurso define:
 * - id: Identificador único (singular, snake_case) - USADO EN CERBOS
 * - label: Nombre para mostrar en UI
 * - pluralId: Para colecciones MongoDB y URLs
 * - icon: Icono de Lucide React
 * - apps: En qué apps está disponible
 * - defaultActions: Acciones CRUD estándar
 */

export const SYSTEM_RESOURCES = {
  // ════════════════════════════════════════════════════════════════
  // RECURSOS DE NEGOCIO
  // ════════════════════════════════════════════════════════════════

  event: {
    id: 'event',
    label: 'Evento',
    labelPlural: 'Eventos',
    pluralId: 'events',
    icon: 'Calendar',
    apps: ['dashboard', 'webapp'],
    defaultActions: ['view', 'create', 'update', 'delete', 'publish'],
    description: 'Clases, talleres, sesiones programables',
  },

  service: {
    id: 'service',
    label: 'Servicio',
    labelPlural: 'Servicios',
    pluralId: 'services',
    icon: 'Briefcase',
    apps: ['dashboard', 'webapp'],
    defaultActions: ['view', 'create', 'update', 'delete'],
    description: 'Servicios ofrecidos por el negocio',
  },

  resource: {
    id: 'resource',
    label: 'Recurso',
    labelPlural: 'Recursos',
    pluralId: 'resources',
    icon: 'Box',
    apps: ['dashboard'],
    defaultActions: ['view', 'create', 'update', 'delete'],
    description: 'Salas, equipos, espacios reservables',
  },

  // ════════════════════════════════════════════════════════════════
  // RECURSOS DE USUARIOS
  // ════════════════════════════════════════════════════════════════

  user: {
    id: 'user',
    label: 'Usuario',
    labelPlural: 'Usuarios',
    pluralId: 'users',
    icon: 'Users',
    apps: ['dashboard'],
    defaultActions: ['view', 'create', 'update', 'delete', 'invite', 'suspend'],
    description: 'Usuarios del tenant',
  },

  // ════════════════════════════════════════════════════════════════
  // RECURSOS ORGANIZACIONALES
  // ════════════════════════════════════════════════════════════════

  organization: {
    id: 'organization',
    label: 'Organización',
    labelPlural: 'Organizaciones',
    pluralId: 'organizations',
    icon: 'Building2',
    apps: ['dashboard'],
    defaultActions: ['view', 'create', 'update', 'delete', 'deactivate'],
    description: 'Sedes, sucursales del tenant',
  },

  role: {
    id: 'role',
    label: 'Rol',
    labelPlural: 'Roles',
    pluralId: 'roles',
    icon: 'Shield',
    apps: ['dashboard'],
    defaultActions: ['view', 'create', 'update', 'delete'],
    description: 'Roles y permisos del tenant',
  },

  // ════════════════════════════════════════════════════════════════
  // RECURSOS DE SISTEMA
  // ════════════════════════════════════════════════════════════════

  settings: {
    id: 'settings',
    label: 'Configuración',
    labelPlural: 'Configuraciones',
    pluralId: 'settings',
    icon: 'Settings',
    apps: ['dashboard'],
    defaultActions: ['view', 'update'],
    description: 'Configuración del tenant',
  },
} as const;

// ════════════════════════════════════════════════════════════════
// TIPOS DERIVADOS
// ════════════════════════════════════════════════════════════════

/** IDs de recursos (para Cerbos) - singular */
export type ResourceId = keyof typeof SYSTEM_RESOURCES;

/** IDs plurales (para URLs y collections) */
export type ResourcePluralId = typeof SYSTEM_RESOURCES[ResourceId]['pluralId'];

/** Apps disponibles */
export type AppId = 'dashboard' | 'webapp';

/** Acciones base para todos los recursos */
export type BaseAction = 'view' | 'create' | 'update' | 'delete';

/** Todas las acciones posibles */
export type ResourceAction = BaseAction | 'publish' | 'invite' | 'suspend' | 'deactivate';

// ════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════

/** Obtiene recursos disponibles para una app */
export function getResourcesForApp(app: AppId): ResourceId[] {
  return Object.entries(SYSTEM_RESOURCES)
    .filter(([_, config]) => config.apps.includes(app))
    .map(([id]) => id as ResourceId);
}

/** Obtiene ID plural desde ID singular */
export function getPluralId(resourceId: ResourceId): string {
  return SYSTEM_RESOURCES[resourceId].pluralId;
}

/** Obtiene ID singular desde plural */
export function getSingularId(pluralId: string): ResourceId | undefined {
  const entry = Object.entries(SYSTEM_RESOURCES)
    .find(([_, config]) => config.pluralId === pluralId);
  return entry?.[0] as ResourceId | undefined;
}

/** Valida que un string sea un ResourceId válido */
export function isValidResourceId(id: string): id is ResourceId {
  return id in SYSTEM_RESOURCES;
}
```

#### 9.5.2 Uso en Cerbos Policies

```yaml
# cerbos/policies/event.yaml
apiVersion: api.cerbos.dev/v1
resourcePolicy:
  version: "default"
  resource: "event"  # ← Usa ResourceId (singular)

  rules:
    - actions: ["view", "create", "update", "delete", "publish"]
      effect: EFFECT_ALLOW
      roles: ["admin"]

    - actions: ["view", "create", "update"]
      effect: EFFECT_ALLOW
      roles: ["employee"]
      condition:
        match:
          expr: "request.resource.attr.organizationId in request.principal.attr.organizationIds || size(request.principal.attr.organizationIds) == 0"
```

#### 9.5.3 Uso en Frontend

```typescript
// Ejemplo: Obtener label para breadcrumb
import { SYSTEM_RESOURCES, type ResourceId } from '@serveflow/core';

function ResourceBreadcrumb({ resourceId }: { resourceId: ResourceId }) {
  const resource = SYSTEM_RESOURCES[resourceId];
  return (
    <Breadcrumb>
      <BreadcrumbItem icon={resource.icon}>
        {resource.labelPlural}
      </BreadcrumbItem>
    </Breadcrumb>
  );
}

// Ejemplo: Verificar permiso con Cerbos
import { usePermission } from '@serveflow/authorization';

function EventActions({ event }: { event: Event }) {
  const canDelete = usePermission('event', 'delete', {
    organizationId: event.organizationId
  });

  return canDelete ? <DeleteButton /> : null;
}
```

#### 9.5.4 Mapeo MongoDB Collections

| ResourceId | Collection | Database |
|------------|------------|----------|
| `event` | `events` | db_tenant_{slug} |
| `service` | `services` | db_tenant_{slug} |
| `resource` | `resources` | db_tenant_{slug} |
| `user` | `users` | db_tenant_{slug} |
| `organization` | `organizations` | db_tenant_{slug} |
| `role` | `tenant_roles` | db_tenant_{slug} |
| `settings` | `settings` | db_tenant_{slug} |

> **Nota**: Los providers no son un recurso separado - son `users` con `roles.includes('provider')`. Se filtran mediante `defaultFilters` en las vistas.

#### 9.5.5 Extensibilidad por Tenant

Los tenants pueden añadir recursos custom en el futuro:

```typescript
// Fase futura: recursos custom por tenant
interface CustomResource {
  id: string;           // "membership"
  label: string;        // "Membresía"
  labelPlural: string;  // "Membresías"
  pluralId: string;     // "memberships"
  icon: string;         // "CreditCard"
  actions: string[];    // ["view", "create", "renew", "cancel"]
  schema?: object;      // JSON Schema para validación
}

// Se almacenaría en db_tenant_{slug}.custom_resources
// Las policies de Cerbos se generarían dinámicamente
```

---

## 10. Decisiones y Trade-offs

### Decisiones Tomadas

| Decisión | Opción Elegida | Alternativas | Justificación |
|----------|----------------|--------------|---------------|
| **Modelo de Roles** | User.data.roles (FusionAuth) + Registration.roles (subset) | Solo Registration.roles | Separa "qué ES" de "a qué accede". Más flexible. |
| **Permisos** | Cerbos externo | Código custom / Casbin | Declarativo, auditable, scoped policies nativas |
| **Storage Policies** | PostgreSQL | YAML files | Cambios dinámicos sin redeploy |
| **Role Templates** | MongoDB + sync a FusionAuth | Solo FusionAuth | Permite personalización por tenant |
| **Organizations** | IDs en FusionAuth + metadata en MongoDB | Todo en MongoDB | IDs en JWT para Cerbos, metadata flexible en Mongo |
| **Scope "todas las orgs"** | organizationIds: [] | Lista explícita | Simplifica clientes premium, admins |
| **AI Authorization** | Principal Policy separada | Heredar de user | Control independiente, configurable por tenant |

### Trade-offs Aceptados

1. **Complejidad vs Flexibilidad**: El sistema es más complejo que roles simples, pero permite personalización total por tenant.

2. **Sincronización FusionAuth ↔ MongoDB**: Hay que mantener roles sincronizados entre ambos sistemas. Aceptable porque FusionAuth es source of truth para auth.

3. **Latencia Cerbos**: Cada request requiere llamada a Cerbos. Mitigado con caching y Cerbos embebido si es necesario.

4. **organizationIds en JWT**: El JWT puede crecer si un usuario tiene muchas orgs. Límite práctico ~50 orgs por usuario.

---

## Próximos Pasos: Hitos de Implementación

La implementación se divide en **4 hitos**, siguiendo los conceptos base del sistema:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CAPAS DE AUTORIZACIÓN                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   HITO 3: PERMISO ──────────────────────────────────────────────────────    │
│   Qué puede HACER: create:booking, cancel:booking                           │
│   Cerbos, conditions, scoped policies                                       │
│                                                                              │
│   HITO 2: SCOPE ────────────────────────────────────────────────────────    │
│   En qué ÁMBITO: todo el tenant, solo ciertas sedes                         │
│   Organizations, organizationIds, filtrado                                  │
│                                                                              │
│   HITO 1B: ACCESO ──────────────────────────────────────────────────────    │
│   A qué APPS entra: Dashboard, WebApp                                       │
│   Middleware, UI condicional, <Can />, @Roles                               │
│                                                                              │
│   HITO 1A: ROL (Templates) ─────────────────────────────────────────────    │
│   Qué ES el usuario: admin, employee, provider, client                      │
│   role_templates, tenant_roles, FusionAuth sync                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ▲
                                    │
                               BASE (Auth)
                          FusionAuth implementado
```

## Apps Cubiertas

| App | Tipo | Roles |
|-----|------|-------|
| `apps/admin/dashboard` | Next.js | superadmin |
| `apps/admin/server` | NestJS | superadmin |
| `apps/tenant/dashboard` | Next.js | admin, employee, provider* |
| `apps/tenant/webapp` | Next.js | client, provider |
| `apps/tenant/server` | NestJS | Todos (valida por rol/permiso) |

*provider en dashboard es configurable por tenant via allowedApps

---

## HITO 1A: ROL (Role Templates)

**Concepto:** Qué ES el usuario - Sistema de plantillas de roles

**Objetivo:** Implementar el sistema de Role Templates que define qué roles existen y qué apps puede acceder cada rol.

**Criterios de Éxito (Testeable):**
- [ ] Al crear un nuevo tenant, se copian los 4 role_templates a tenant_roles
- [ ] Admin del tenant puede crear rol personalizado "receptionist"
- [ ] Admin puede modificar allowedApps de "provider" para incluir "dashboard"
- [ ] Los roles del tenant se sincronizan con FusionAuth Application
- [ ] GET /api/admin/roles devuelve los roles del tenant con sus allowedApps

**Tareas:**
- [ ] Crear collection `role_templates` en db_serveflow_sys
- [ ] Crear collection `tenant_roles` en db_tenant_{slug}
- [ ] Seed de templates base: admin, employee, provider, client
- [ ] Modificar flujo de creación de tenant para copiar templates
- [ ] API CRUD para tenant_roles (solo admin del tenant)
- [ ] Sincronización tenant_roles → FusionAuth Application.roles
- [ ] Añadir allowedApps a User.data en registro/update de usuario

### Prompt Hito 1A

````markdown
# Contexto del Proyecto

Eres un experto en arquitectura SaaS B2B2C multi-tenant. Trabajas en Serveflow,
una plataforma donde cada tenant puede personalizar sus roles y permisos.

## Documentación del Proyecto (LEER OBLIGATORIO)

Archivo: `docs/v2/03-PERMISOS.md`
- Sección 1: Visión General - Conceptos ROL/ACCESO/PERMISO/SCOPE
- Sección 3.2: MongoDB Sistema - RoleTemplate interface
- Sección 3.3: MongoDB Tenant - TenantRole interface
- Sección 4: Sistema de Role Templates (IMPLEMENTAR ESTO)
- Sección 5.1: Flujo de creación de usuario

## Documentación Oficial (Consultar)

- FusionAuth Applications: https://fusionauth.io/docs/lifecycle/manage-applications
- FusionAuth Roles: https://fusionauth.io/docs/get-started/core-concepts/roles
- MongoDB Indexes: https://www.mongodb.com/docs/manual/indexes/

## Estructura del Monorepo (Relevante)

```
packages/
├── auth/
│   └── src/fusionauth/
│       ├── client.ts          # FusionAuth client
│       ├── users.ts           # User operations
│       └── applications.ts    # ⭐ CREAR/MODIFICAR - Role sync
├── core/
│   └── src/types/
│       └── tenant.ts          # TenantMVP type
└── db/
    └── src/
        ├── models/            # ⭐ CREAR: RoleTemplate, TenantRole
        └── seeds/             # ⭐ CREAR: role-templates.seed.ts

apps/
├── admin/server/
│   └── src/
│       └── tenants/           # Flujo creación tenant
└── tenant/server/
    └── src/
        └── roles/             # ⭐ CREAR: CRUD tenant_roles
```

## Modelo de Datos a Implementar

```typescript
// db_serveflow_sys.role_templates
interface RoleTemplate {
  _id: ObjectId;
  slug: string;                        // "admin", "employee", "provider", "client"
  name: string;                        // "Administrador"
  description: string;
  defaultAllowedApps: ('dashboard' | 'webapp')[];
  isSuperRole: boolean;                // true para admin
  isDefault: boolean;                  // true para client (self-registration)
  basePermissions: Permission[];       // Para Cerbos (Hito 3)
  isSystemTemplate: boolean;           // No se puede eliminar
}

// db_tenant_{slug}.tenant_roles
interface TenantRole {
  _id: ObjectId;
  templateSlug?: string;               // Referencia al template original
  slug: string;
  name: string;
  description?: string;
  allowedApps: ('dashboard' | 'webapp')[];  // ⭐ CLAVE: qué apps puede acceder
  isSuperRole: boolean;
  isDefault: boolean;
  isActive: boolean;
  isFromTemplate: boolean;
  isCustom: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

## Templates Base (Seed)

```typescript
const ROLE_TEMPLATES = [
  {
    slug: "admin",
    name: "Administrador",
    defaultAllowedApps: ["dashboard"],
    isSuperRole: true,
    isDefault: false,
  },
  {
    slug: "employee",
    name: "Empleado",
    defaultAllowedApps: ["dashboard"],
    isSuperRole: false,
    isDefault: false,
  },
  {
    slug: "provider",
    name: "Proveedor",
    defaultAllowedApps: ["webapp"],  // Por defecto solo webapp
    isSuperRole: false,
    isDefault: false,
  },
  {
    slug: "client",
    name: "Cliente",
    defaultAllowedApps: ["webapp"],
    isSuperRole: false,
    isDefault: true,  // Self-registration
  },
];
```

## Principios

1. **Templates son plantillas**: Se copian al crear tenant, cada tenant modifica su copia
2. **allowedApps es la clave**: Define a qué apps puede acceder un rol
3. **Sync con FusionAuth**: Los roles deben existir en la Application de FusionAuth
4. **isSystemTemplate**: Los 4 base no se pueden eliminar, solo modificar

## Tarea

1. **Crear modelos Mongoose**
   - RoleTemplateSchema en packages/db
   - TenantRoleSchema en packages/db

2. **Seed de role_templates**
   - Script que inserta los 4 templates en db_serveflow_sys
   - Ejecutable con: `npm run db:seed:role-templates`

3. **Modificar creación de tenant**
   - Al crear tenant: copiar role_templates a tenant_roles
   - Crear los roles en FusionAuth Application

4. **API tenant_roles**
   ```
   GET    /api/roles           → Lista roles del tenant
   POST   /api/roles           → Crear rol custom
   PUT    /api/roles/:slug     → Modificar rol (ej: cambiar allowedApps)
   DELETE /api/roles/:slug     → Eliminar rol (solo custom)
   ```

5. **Sync con FusionAuth**
   - Al modificar tenant_roles → actualizar Application.roles
   - Función: syncTenantRolesToFusionAuth(tenantSlug)

## Verificación

```bash
# 1. Crear nuevo tenant
POST /api/admin/tenants { slug: "gimnasio-test", ... }
# → Verificar: db_tenant_gimnasio-test.tenant_roles tiene 4 documentos

# 2. Listar roles del tenant
GET /api/roles (como admin de gimnasio-test)
# → [admin, employee, provider, client] con sus allowedApps

# 3. Modificar allowedApps de provider
PUT /api/roles/provider { allowedApps: ["dashboard", "webapp"] }
# → provider ahora puede acceder a dashboard

# 4. Crear rol custom
POST /api/roles { slug: "receptionist", name: "Recepcionista", allowedApps: ["dashboard"] }
# → Nuevo rol creado y sincronizado con FusionAuth

# 5. Verificar sync con FusionAuth
# → En FusionAuth Admin: Application del tenant tiene 5 roles
```
````

---

## HITO 1B: ACCESO (UI + Middleware)

**Concepto:** A qué APPS puede entrar y qué ve en cada una

**Objetivo:** Implementar control de acceso en todas las apps basado en allowedApps del rol.

**Criterios de Éxito (Testeable):**
- [ ] Employee (allowedApps: ['dashboard']) accede a tenant-dashboard ✓
- [ ] Employee intenta acceder a tenant-webapp → Redirect a /unauthorized
- [ ] Provider (allowedApps: ['webapp']) accede a tenant-webapp ✓
- [ ] Provider (allowedApps: ['dashboard', 'webapp']) accede a ambas
- [ ] Superadmin accede a admin-dashboard, pero NO a tenant-dashboard
- [ ] Navbar muestra solo rutas permitidas según rol

**Tareas:**
- [ ] **Actualizar `packages/auth/src/fusionauth/tenants.ts`:**
  - Modificar `createFusionAuthTenantWithApplication` → `createFusionAuthTenantWithApplications`
  - Crear 2 Applications: Dashboard + WebApp (no API, es M2M fase posterior)
  - Retornar `{ dashboard: { id }, webapp: { id } }` en lugar de singular
  - Actualizar `packages/db/src/operations/tenants.ts` para usar nueva estructura
- [ ] Crear package `@serveflow/authorization`
- [ ] Implementar useAuthorization hook
- [ ] Implementar componente `<Can />`
- [ ] Crear DEFAULT_ROUTES por app (dashboard, webapp)
- [ ] Modificar middleware de TODAS las apps
- [ ] Crear páginas /unauthorized en TODAS las apps
- [ ] Implementar @Roles() decorator en backends
- [ ] Proteger endpoints críticos

### Prompt Hito 1B

````markdown
# Contexto del Proyecto

Continuación de Serveflow. Hito 1A completado:
- ✅ role_templates en db_serveflow_sys
- ✅ tenant_roles copiados al crear tenant
- ✅ Cada rol tiene allowedApps definido
- ✅ Sync con FusionAuth Application

Ahora: Implementar control de acceso en TODAS las apps basado en allowedApps.

## Documentación del Proyecto (LEER OBLIGATORIO)

Archivo: `docs/v2/03-PERMISOS.md`
- Sección 6.1: Flujo actual de autenticación
- Sección 6.3: Componentes de auth implementados
- Sección 9.4: Autorización en Frontend (IMPLEMENTAR ESTO)
  - 9.4.1: Modelo DashboardRoute y defaults
  - 9.4.2: Hook useAuthorization
  - 9.4.3: Protección en middleware
  - 9.4.4: Navegación dinámica
  - 9.4.5: Componente Can
  - 9.4.6: Flujo completo

## Documentación Oficial (Consultar)

- Next.js Middleware: https://nextjs.org/docs/app/building-your-application/routing/middleware
- NestJS Guards: https://docs.nestjs.com/guards
- NestJS Custom Decorators: https://docs.nestjs.com/custom-decorators

## TAREA 0: Actualizar creación de FusionAuth Apps

**ANTES de crear el package authorization**, actualizar `packages/auth/src/fusionauth/tenants.ts`:

```typescript
// ACTUAL (incorrecto):
// Modelo: 1 Serveflow Tenant = 1 FusionAuth Tenant + 1 FusionAuth Application

// NUEVO (correcto):
// Modelo: 1 Serveflow Tenant = 1 FusionAuth Tenant + 2 FusionAuth Applications (Dashboard + WebApp)
// Nota: API es M2M y se crea por separado (ver sección 6.7)

export interface CreateTenantWithApplicationsResult {
  tenant: FusionAuthTenantResult;
  applications: {
    dashboard: FusionAuthApplicationResult;
    webapp: FusionAuthApplicationResult;
  };
}

// Renombrar: createFusionAuthTenantWithApplication → createFusionAuthTenantWithApplications
// Crear 2 apps con diferentes redirect URLs:
// - Dashboard: /${slug}.serveflow.app/oauth/callback (admin, employee)
// - WebApp: /${slug}.app.serveflow.app/oauth/callback (provider, client)
```

También actualizar `packages/db/src/operations/tenants.ts` para usar la nueva estructura.

## Estructura del Monorepo

```
packages/
├── auth/src/fusionauth/
│   └── tenants.ts                  # ⭐ MODIFICAR: crear 2 apps (Dashboard + WebApp)
├── authorization/                  # ⭐ CREAR PACKAGE COMPLETO
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       ├── types/
│       │   ├── auth-context.ts
│       │   └── routes.ts
│       ├── config/
│       │   ├── default-dashboard-routes.ts
│       │   └── default-webapp-routes.ts
│       ├── hooks/
│       │   ├── use-authorization.ts
│       │   └── use-current-user.ts
│       ├── components/
│       │   ├── Can.tsx
│       │   ├── RequireRole.tsx
│       │   └── AuthorizationProvider.tsx
│       ├── guards/                 # Backend (NestJS)
│       │   └── roles.guard.ts
│       └── decorators/
│           └── roles.decorator.ts

apps/
├── admin/
│   ├── dashboard/src/
│   │   ├── middleware.ts          # ⭐ MODIFICAR: solo superadmin
│   │   └── app/unauthorized/      # ⭐ CREAR
│   └── server/src/
│       └── guards/                # ⭐ VERIFICAR: @Roles()
│
├── tenant/
│   ├── dashboard/src/
│   │   ├── middleware.ts          # ⭐ MODIFICAR: verificar allowedApps
│   │   ├── app/unauthorized/      # ⭐ CREAR
│   │   └── components/nav/        # ⭐ MODIFICAR: usar getAccessibleRoutes
│   ├── webapp/src/
│   │   ├── middleware.ts          # ⭐ MODIFICAR: verificar allowedApps
│   │   └── app/unauthorized/      # ⭐ CREAR
│   └── server/src/
│       └── guards/                # ⭐ VERIFICAR: @Roles()
```

## Lógica de Acceso por App

```typescript
// ¿Puede el usuario acceder a esta app?
function canAccessApp(userRoles: string[], appType: 'dashboard' | 'webapp', tenantRoles: TenantRole[]): boolean {
  // Buscar los roles del usuario que tienen esta app en allowedApps
  for (const userRole of userRoles) {
    const tenantRole = tenantRoles.find(r => r.slug === userRole);
    if (tenantRole?.allowedApps.includes(appType)) {
      return true;
    }
  }
  return false;
}

// Ejemplo:
// userRoles: ["provider"]
// tenantRoles: [{ slug: "provider", allowedApps: ["webapp"] }]
// canAccessApp(["provider"], "dashboard", tenantRoles) → false
// canAccessApp(["provider"], "webapp", tenantRoles) → true
```

## Middleware por App

```typescript
// apps/tenant/dashboard/src/middleware.ts
export async function middleware(req: NextRequest) {
  // 1. Validar token (existente)
  const token = req.cookies.get('fa_access_token');
  if (!token) return redirect('/sign-in');

  // 2. Decodificar y obtener roles
  const { roles } = decodeToken(token);

  // 3. Obtener tenant_roles (del tenant context o API)
  const tenantRoles = await getTenantRoles(tenantSlug);

  // 4. ¿Puede acceder a dashboard?
  if (!canAccessApp(roles, 'dashboard', tenantRoles)) {
    return redirect('/unauthorized');
  }

  // 5. ¿Puede acceder a esta ruta específica?
  if (!canAccessRoute(pathname, roles)) {
    return redirect('/unauthorized');
  }

  return next();
}
```

## Principios

1. **Package compartido**: @serveflow/authorization usado por todas las apps
2. **allowedApps decide**: Si el rol no tiene la app en allowedApps → no entra
3. **Frontend oculta, Backend valida**: Middleware + Guards
4. **Rutas por defecto**: DEFAULT_ROUTES preparado para config dinámica

## Tarea

### Parte A: Package @serveflow/authorization

1. Crear package con estructura mostrada arriba
2. Implementar useAuthorization (sección 9.4.2 del doc)
3. Implementar <Can /> component (sección 9.4.5)
4. Implementar RolesGuard para NestJS
5. DEFAULT_DASHBOARD_ROUTES y DEFAULT_WEBAPP_ROUTES

### Parte B: Admin Dashboard

6. Modificar middleware: solo permitir rol "superadmin"
7. Crear página /unauthorized
8. Navbar fijo (superadmin ve todo)

### Parte C: Tenant Dashboard

9. Modificar middleware: verificar allowedApps incluye 'dashboard'
10. Verificar acceso a rutas según rol
11. Crear página /unauthorized
12. Navbar dinámico con getAccessibleRoutes()
13. <Can /> en botones de acción

### Parte D: Tenant WebApp

14. Modificar middleware: verificar allowedApps incluye 'webapp'
15. Rutas públicas: /, /services, /booking
16. Rutas privadas: /my-bookings, /profile
17. Crear página /unauthorized
18. UI diferenciada client vs provider

### Parte E: Backends

19. Verificar @Roles() en admin-server
20. Verificar @Roles() en tenant-server
21. Endpoints críticos protegidos

## Verificación

```bash
# Escenario 1: Employee (allowedApps: ['dashboard'])
Login como employee
- Accede a tenant-dashboard ✓
- Intenta tenant-webapp/my-bookings → /unauthorized
- Navbar muestra: Dashboard, Reservas, Eventos, Servicios
- Navbar NO muestra: Usuarios, Configuración

# Escenario 2: Provider default (allowedApps: ['webapp'])
Login como provider
- Accede a tenant-webapp ✓
- Intenta tenant-dashboard → /unauthorized

# Escenario 3: Provider configurado (allowedApps: ['dashboard', 'webapp'])
Admin modifica provider.allowedApps = ['dashboard', 'webapp']
Login como provider
- Accede a tenant-dashboard ✓
- Accede a tenant-webapp ✓

# Escenario 4: Client (allowedApps: ['webapp'])
Login como client
- Accede a tenant-webapp ✓
- Rutas públicas sin login ✓
- /my-bookings requiere login ✓

# Escenario 5: Superadmin
Login como superadmin
- Accede a admin-dashboard ✓
- Intenta tenant-dashboard → /unauthorized (no es usuario de ese tenant)
```
````

---

## HITO 2: SCOPE (Organizations)

**Concepto:** En qué ÁMBITO opera el usuario

**Objetivo:** Implementar gestión de organizations y filtrado automático de datos por sede.

**Criterios de Éxito (Testeable):**
- [ ] Admin crea 3 organizations: Madrid Centro, Madrid Norte, Barcelona
- [ ] Employee asignado a Madrid Centro solo ve bookings de esa sede
- [ ] GET /api/bookings?organizationId=barcelona → 403 si no tiene acceso
- [ ] OrganizationSwitcher muestra solo sedes asignadas
- [ ] Admin (organizationIds: []) ve todas las sedes
- [ ] Cliente Premium (organizationIds: []) puede reservar en cualquier sede

**Tareas:**
- [ ] Crear collection `organizations` en db_tenant_{slug}
- [ ] API CRUD para organizations
- [ ] Añadir organizationIds a User.data en FusionAuth
- [ ] Crear JWT Populate Lambda para incluir organizationIds
- [ ] Implementar useOrganization hook
- [ ] Implementar OrganizationSwitcher component
- [ ] Middleware que inyecta organizationIds en request
- [ ] Filtrado automático en queries de backend
- [ ] Lógica "organizationIds: [] = todas"

### Prompt Hito 2

````markdown
# Contexto del Proyecto

Continuación de Serveflow. Hitos anteriores completados:
- ✅ Hito 1A: Role Templates y tenant_roles
- ✅ Hito 1B: Control de acceso a apps por allowedApps

Ahora: Organizations (sedes/sucursales) y scope de datos.

## Documentación del Proyecto (LEER OBLIGATORIO)

Archivo: `docs/v2/03-PERMISOS.md`
- Sección 3.1: FusionAuth User.data.organizationIds
- Sección 3.3: MongoDB organizations y user_organizations
- Sección 5.3: Flujo de asignación a organizations
- Sección 6.5: Claims adicionales para JWT
- Sección 8: Escenario Gimnasio 20 Sedes (referencia completa)
- Sección 9.3: OrganizationSwitcher component

## Documentación Oficial (Consultar)

- FusionAuth JWT Populate Lambda: https://fusionauth.io/docs/extend/code/lambdas/jwt-populate
- FusionAuth User.data: https://fusionauth.io/docs/apis/users

## Estructura del Monorepo

```
packages/
├── authorization/
│   └── src/
│       ├── hooks/
│       │   └── use-organization.ts      # ⭐ CREAR
│       ├── components/
│       │   └── OrganizationSwitcher.tsx # ⭐ CREAR
│       └── context/
│           └── OrganizationContext.tsx  # ⭐ CREAR
├── auth/
│   └── src/
│       ├── fusionauth/
│       │   └── users.ts                 # ⭐ MODIFICAR: organizationIds
│       └── types.ts                     # ⭐ MODIFICAR: JWT claims
└── db/
    └── src/models/
        └── organization.model.ts        # ⭐ CREAR

apps/tenant/
├── dashboard/src/
│   └── components/
│       └── header/                      # ⭐ AÑADIR OrganizationSwitcher
├── webapp/src/
│   └── components/
│       └── location-selector/           # ⭐ CREAR (para multi-sede)
└── server/src/
    ├── organizations/                   # ⭐ CREAR: CRUD
    └── middleware/
        └── organization-scope.middleware.ts  # ⭐ CREAR

infra/fusionauth/
└── lambdas/
    └── jwt-populate.js                  # ⭐ CREAR
```

## Modelo de Datos

```typescript
// db_tenant_{slug}.organizations
interface Organization {
  _id: ObjectId;
  slug: string;              // "madrid-centro"
  name: string;              // "Madrid Centro"
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
    coordinates?: { lat: number; lng: number };
  };
  contact?: {
    phone?: string;
    email?: string;
  };
  settings: {
    timezone: string;
    currency: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// FusionAuth User.data (añadir campos)
interface UserData {
  serveflowTenantId: string;
  serveflowTenantSlug: string;
  roles: string[];
  organizationIds: string[];        // ⭐ NUEVO
  primaryOrganizationId?: string;   // ⭐ NUEVO
}

// JWT Claims (añadir via Lambda)
interface JWTClaims {
  // ... existentes
  organizationIds: string[];
  primaryOrganizationId?: string;
}
```

## JWT Populate Lambda

```javascript
// infra/fusionauth/lambdas/jwt-populate.js
// Configurar en: FusionAuth Admin → Tenants → Lambdas → JWT Populate

function populate(jwt, user, registration, context) {
  // Añadir organizationIds al JWT
  jwt.organizationIds = user.data.organizationIds || [];
  jwt.primaryOrganizationId = user.data.primaryOrganizationId || null;

  // Añadir tenant slug
  jwt.tenantSlug = user.data.serveflowTenantSlug;

  return jwt;
}
```

## Lógica de Scope

```typescript
// organizationIds: [] significa TODAS las organizaciones
function getOrganizationFilter(userOrgIds: string[], requestedOrgId?: string) {
  // Usuario tiene acceso a todas
  if (userOrgIds.length === 0) {
    return requestedOrgId ? { organizationId: requestedOrgId } : {};
  }

  // Usuario tiene acceso limitado
  if (requestedOrgId) {
    if (!userOrgIds.includes(requestedOrgId)) {
      throw new ForbiddenException('No access to this organization');
    }
    return { organizationId: requestedOrgId };
  }

  // Sin org específica: filtrar por las del usuario
  return { organizationId: { $in: userOrgIds } };
}
```

## Principios

1. **organizationIds: [] = TODAS**: Array vacío significa acceso completo
2. **Filtrar SIEMPRE en backend**: No confiar en frontend
3. **JWT contiene los IDs**: Añadidos via Lambda, disponibles sin query
4. **OrganizationSwitcher**: Solo muestra orgs a las que tiene acceso

## Tarea

### Parte A: MongoDB

1. Crear modelo Organization en packages/db
2. Crear modelo UserOrganization (metadata) si necesario
3. Índices: slug unique, isActive

### Parte B: API Organizations

4. CRUD organizations:
   ```
   GET    /api/organizations          → Lista (filtrada por acceso)
   POST   /api/organizations          → Crear (solo admin)
   GET    /api/organizations/:slug    → Detalle
   PUT    /api/organizations/:slug    → Actualizar
   DELETE /api/organizations/:slug    → Eliminar
   ```

### Parte C: FusionAuth

5. Modificar users.ts: funciones para gestionar organizationIds
   - assignUserToOrganization(userId, orgId)
   - removeUserFromOrganization(userId, orgId)
   - setUserOrganizations(userId, orgIds)

6. Crear JWT Populate Lambda
   - Documentar cómo configurar en FusionAuth Admin

7. Actualizar tipos JWT en packages/auth

### Parte D: Frontend

8. useOrganization hook:
   - currentOrganization
   - organizations (lista a las que tiene acceso)
   - setCurrentOrganization
   - hasFullAccess (organizationIds.length === 0)

9. OrganizationSwitcher component:
   - Select/Dropdown con orgs
   - "Todas las sedes" si hasFullAccess
   - Guardar selección en localStorage

10. Integrar en tenant-dashboard header
11. Integrar en tenant-webapp (selector de ubicación)

### Parte E: Backend Filtering

12. Middleware/interceptor que:
    - Lee organizationIds del JWT
    - Inyecta en request context
    - Disponible para queries

13. Modificar servicios para usar getOrganizationFilter()

14. Ejemplo con BookingsService:
    ```typescript
    async list(ctx: AuthContext, filters: ListFilters) {
      const orgFilter = getOrganizationFilter(
        ctx.organizationIds,
        filters.organizationId
      );
      return this.bookingModel.find({ ...filters, ...orgFilter });
    }
    ```

## Verificación

```bash
# Setup
Admin crea 3 organizations: madrid-centro, madrid-norte, barcelona
Employee Juan asignado a: ["madrid-centro", "madrid-norte"]
Admin Carlos (organizationIds: [])
Cliente Premium (organizationIds: [])
Cliente Normal asignado a: ["madrid-centro"]

# Test 1: Employee Juan
Login Juan
OrganizationSwitcher muestra: Madrid Centro, Madrid Norte (NO Barcelona)
Selecciona "Madrid Centro"
GET /api/bookings → solo bookings de Madrid Centro
GET /api/bookings?organizationId=barcelona → 403 Forbidden

# Test 2: Admin Carlos
Login Carlos
OrganizationSwitcher muestra: "Todas las sedes", Madrid Centro, Madrid Norte, Barcelona
Selecciona "Todas las sedes"
GET /api/bookings → bookings de TODAS las sedes
Selecciona "Barcelona"
GET /api/bookings → solo bookings de Barcelona

# Test 3: Cliente Premium
En webapp, selector de ubicación muestra TODAS las sedes
Puede reservar en cualquier sede

# Test 4: Cliente Normal
En webapp, selector de ubicación muestra solo Madrid Centro
Solo puede reservar en Madrid Centro
```
````

---

## HITO 3: PERMISO (Cerbos + Config Tenant)

**Concepto:** Qué puede HACER y con qué condiciones

**Objetivo:** Implementar permisos granulares con Cerbos y configuración dinámica de dashboard por tenant.

**Criterios de Éxito (Testeable):**
- [ ] Client solo puede cancelar SUS PROPIOS eventos (reservas)
- [ ] Employee puede cancelar cualquier evento de SU sede
- [ ] Client no puede cancelar evento de otro client → 403
- [ ] Employee no puede cancelar evento de otra sede → 403
- [ ] Tenant FitMax configura que provider vea /events
- [ ] Provider de FitMax ve /events en navbar
- [ ] Provider de otro tenant NO ve /events (usa defaults)
- [ ] Policies almacenadas en PostgreSQL, no en archivos

**Tareas:**
- [ ] Instalar y configurar Cerbos con PostgreSQL
- [ ] Crear base policies (event, service, resource, user)
- [ ] Implementar CerbosService en packages/authorization
- [ ] Implementar CerbosGuard
- [ ] Crear @CheckPermission decorator
- [ ] Endpoint /api/auth/check para frontend
- [ ] Migrar <Can /> para soportar permisos
- [ ] Crear collection dashboard_config
- [ ] API para configurar dashboard por tenant
- [ ] useAuthorization carga config del tenant

### Prompt Hito 3

````markdown
# Contexto del Proyecto

Continuación de Serveflow. Hitos anteriores completados:
- ✅ Hito 1A: Role Templates y tenant_roles
- ✅ Hito 1B: Control de acceso a apps
- ✅ Hito 2: Organizations y scope por sede

Ahora: Permisos granulares con Cerbos + configuración dinámica de dashboard.

## Documentación del Proyecto (LEER OBLIGATORIO)

Archivo: `docs/v2/03-PERMISOS.md`
- Sección 3.4: Cerbos - Estructura de Policies
- Sección 6.2: Flujo OBJETIVO con Cerbos
- Sección 7: Gestión de Permisos y Recursos
- Sección 9.2: Flujo de Request con CerbosGuard
- Sección 9.4.7: Migración a config por tenant
- Sección 9.5: SYSTEM_RESOURCES - Catálogo centralizado de recursos

## Documentación Oficial (Consultar)

- Cerbos Getting Started: https://docs.cerbos.dev/cerbos/latest/tutorial/
- Cerbos Policies: https://docs.cerbos.dev/cerbos/latest/policies/
- Cerbos Node SDK: https://docs.cerbos.dev/cerbos/latest/api/sdk/node/
- Cerbos PostgreSQL Storage: https://docs.cerbos.dev/cerbos/latest/configuration/storage#postgres
- Cerbos Scoped Policies: https://docs.cerbos.dev/cerbos/latest/policies/scoped_policies

## Estructura del Monorepo

```
packages/authorization/
└── src/
    ├── services/
    │   └── cerbos.service.ts        # ⭐ CREAR
    ├── guards/
    │   └── cerbos.guard.ts          # ⭐ CREAR
    ├── decorators/
    │   └── check-permission.ts      # ⭐ CREAR
    ├── components/
    │   └── Can.tsx                  # ⭐ MODIFICAR: añadir permission prop
    └── policies/                    # ⭐ CREAR: definiciones base
        ├── event.yaml
        ├── service.yaml
        ├── resource.yaml
        └── user.yaml

infra/
├── cerbos/
│   ├── docker-compose.yml           # ⭐ CREAR
│   └── config/
│       └── cerbos.yaml              # ⭐ CREAR
└── postgres/
    └── init-cerbos.sql              # ⭐ CREAR: schema para policies

apps/tenant/
├── server/src/
│   ├── auth/
│   │   └── auth-check.controller.ts # ⭐ CREAR: /api/auth/check
│   └── events/
│       └── events.controller.ts     # ⭐ MODIFICAR: @CheckPermission
└── dashboard/src/
    └── app/settings/
        └── dashboard/               # ⭐ CREAR: UI config rutas
```

## Arquitectura Cerbos

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│  Tenant API  │────▶│  Cerbos PDP  │
│    <Can />   │     │ CerbosGuard  │     │   (Docker)   │
│              │     │              │     │              │
│  permission= │     │@CheckPerm... │     │   Policies   │
│  {resource,  │     │              │     │   in PSQL    │
│   action}    │     │              │     │              │
└──────────────┘     └──────────────┘     └──────┬───────┘
       │                                         │
       │                                  ┌──────▼───────┐
       │                                  │  PostgreSQL  │
       └─────────────────────────────────▶│   Policies   │
                /api/auth/check           └──────────────┘
```

## Policies Base

```yaml
# policies/event.yaml
# "Event" cubre: reservas, clases, sesiones, etc.
# El tipo se distingue por serviceType en los atributos
apiVersion: api.cerbos.dev/v1
resourcePolicy:
  resource: event
  version: default
  rules:
    # Admin: acceso total
    - name: admin_full_access
      actions: ["*"]
      effect: EFFECT_ALLOW
      roles: ["admin"]

    # Employee: CRUD en sus organizations
    - name: employee_manage
      actions: ["view", "create", "update", "delete", "cancel", "check_in"]
      effect: EFFECT_ALLOW
      roles: ["employee"]
      condition:
        match:
          expr: >
            P.attr.organizationIds.size() == 0 ||
            R.attr.organizationId in P.attr.organizationIds

    # Provider: ver/gestionar sus eventos asignados
    - name: provider_manage_assigned
      actions: ["view", "update"]
      effect: EFFECT_ALLOW
      roles: ["provider"]
      condition:
        match:
          expr: R.attr.providerId == P.id

    # Client: ver eventos públicos, gestionar sus reservas
    - name: client_own_events
      actions: ["view", "create", "cancel"]
      effect: EFFECT_ALLOW
      roles: ["client"]
      condition:
        match:
          all:
            of:
              - expr: R.attr.ownerId == P.id || R.attr.isPublic == true
              - expr: >
                  P.attr.organizationIds.size() == 0 ||
                  R.attr.organizationId in P.attr.organizationIds
```

## App Config por Tenant (Dashboard + WebApp)

```typescript
// db_tenant_{slug}.app_configs (un documento por app)
// Ver sección 9.4.1 para modelo completo de AppRoute

interface AppConfig {
  _id: ObjectId;
  app: 'dashboard' | 'webapp';
  routes: AppRoute[];              // Rutas/vistas configuradas
  publicRoutes?: string[];         // Solo webapp: rutas sin auth
  homeWidgets?: Record<string, string[]>;  // Widgets por rol
  updatedAt: Date;
}

// Prioridad:
// 1. Si tenant tiene config para la app → usar la suya
// 2. Si no → usar DEFAULT_DASHBOARD_ROUTES o DEFAULT_WEBAPP_ROUTES
```

## Principios

1. **Policies en PostgreSQL**: Cambios sin redeploy
2. **Scoped Policies**: Overrides por tenant (scope: "tenant-slug")
3. **Frontend consulta backend**: /api/auth/check, nunca directo a Cerbos
4. **<Can /> retrocompatible**: Sigue funcionando con roles, añade permission
5. **AppRoute extensible**: Modelo unificado para Dashboard y WebApp (ver 9.4.1)

## Tarea

### Parte A: Infraestructura Cerbos

1. Docker Compose para Cerbos
   ```yaml
   # infra/cerbos/docker-compose.yml
   services:
     cerbos:
       image: ghcr.io/cerbos/cerbos:latest
       ports:
         - "3592:3592"
         - "3593:3593"
       volumes:
         - ./config:/config
       command: ["server", "--config=/config/cerbos.yaml"]
   ```

2. Configuración con PostgreSQL
   ```yaml
   # infra/cerbos/config/cerbos.yaml
   server:
     httpListenAddr: ":3592"
     grpcListenAddr: ":3593"
   storage:
     driver: postgres
     postgres:
       url: ${CERBOS_POSTGRES_URL}
       schema: cerbos
   ```

3. Script para insertar policies en PostgreSQL

### Parte B: CerbosService

4. Cliente Cerbos en packages/authorization
   ```typescript
   @Injectable()
   export class CerbosService {
     private client: GRPC;

     async check(params: CheckParams): Promise<boolean> {
       const decision = await this.client.checkResource({
         principal: params.principal,
         resource: params.resource,
         actions: [params.action],
         auxData: { jwt: { scope: params.tenantSlug } }
       });
       return decision.isAllowed(params.action);
     }
   }
   ```

### Parte C: CerbosGuard + Decorator

5. @CheckPermission decorator
   ```typescript
   @CheckPermission({ resource: 'event', action: 'cancel', idParam: 'id' })
   ```

6. CerbosGuard que:
   - Lee metadata del decorator
   - Carga atributos del recurso de MongoDB
   - Consulta Cerbos
   - 403 si denegado

### Parte D: Frontend

7. Endpoint /api/auth/check
   ```typescript
   POST /api/auth/check
   { resource: "event", action: "cancel", resourceId: "123" }
   → { allowed: true/false }
   ```

8. Modificar <Can /> para soportar permission
   ```tsx
   // Antes (sigue funcionando)
   <Can roles={['admin']}>...</Can>

   // Nuevo
   <Can permission={{ resource: 'event', action: 'cancel', resourceId: id }}>
     <Button>Cancelar</Button>
   </Can>
   ```

### Parte E: App Config (Dashboard + WebApp)

9. Collection `app_configs` con modelo AppConfig (ver sección 9.4.1)
   - Un documento por app: `{ app: 'dashboard', routes: [...] }`
   - Otro documento: `{ app: 'webapp', routes: [...], publicRoutes: [...] }`

10. API configuración (para ambas apps)
    ```
    GET  /api/settings/app-config?app=dashboard
    PUT  /api/settings/app-config?app=dashboard
    GET  /api/settings/app-config?app=webapp
    PUT  /api/settings/app-config?app=webapp
    ```

11. useAuthorization carga config del tenant (ver sección 9.4.2)
    ```typescript
    // El hook ya soporta ambas apps
    const { routes } = useAuthorization({ app: 'dashboard' });
    // o
    const { routes, publicRoutes } = useAuthorization({ app: 'webapp' });
    ```

12. UI básica en Settings > Apps para configurar rutas de Dashboard y WebApp

## Verificación

```bash
# Test Cerbos (usando Event como recurso universal)

# 1. Client cancela SU reserva (event donde es owner)
Client A tiene event_123 (su reserva de pista)
POST /api/events/event_123/cancel (como Client A)
→ 200 OK ✓

# 2. Client intenta cancelar reserva de otro
Client A intenta cancelar event_456 (reserva de Client B)
POST /api/events/event_456/cancel (como Client A)
→ 403 Forbidden ✓

# 3. Employee cancela evento de SU sede
Employee (orgs: ["madrid"]) cancela event de Madrid
→ 200 OK ✓

# 4. Employee intenta cancelar evento de otra sede
Employee (orgs: ["madrid"]) cancela event de Barcelona
→ 403 Forbidden ✓

# Test App Config (Dashboard)

# 5. Tenant FitMax configura provider en /events
PUT /api/settings/app-config?app=dashboard (como admin de FitMax)
{
  "routes": [
    { "id": "events", "path": "/events", "allowedRoles": ["admin", "employee", "provider"], ... }
  ]
}

# 6. Provider de FitMax
Login como provider en FitMax Dashboard
→ Navbar muestra /events ✓

# 7. Provider de otro tenant
Login como provider en OtroTenant Dashboard
→ Navbar NO muestra /events (usa defaults) ✓

# Test App Config (WebApp)

# 8. Tenant FitMax añade ruta /promotions para clientes
PUT /api/settings/app-config?app=webapp (como admin de FitMax)
{
  "routes": [
    { "id": "promotions", "path": "/promotions", "allowedRoles": ["client"], ... }
  ]
}

# 9. Client de FitMax
Login como client en FitMax WebApp
→ Navbar muestra /promotions ✓
```
````

---

## Resumen de Hitos

| Hito | Concepto | Objetivo | Entregables Clave |
|------|----------|----------|-------------------|
| **1A** | ROL | Qué ES el usuario | role_templates, tenant_roles, sync FusionAuth |
| **1B** | ACCESO | A qué apps entra | middleware, <Can />, @Roles, /unauthorized |
| **2** | SCOPE | En qué ámbito | organizations, JWT Lambda, OrganizationSwitcher |
| **3** | PERMISO | Qué puede hacer | Cerbos, policies, @CheckPermission, app_configs |

## Dependencias

```
┌──────────┐
│ HITO 1A  │  ROL (Templates)
│          │  Define qué roles existen
└────┬─────┘
     │
     ▼
┌──────────┐
│ HITO 1B  │  ACCESO (Apps)
│          │  Control de acceso a apps
└────┬─────┘
     │
     ▼
┌──────────┐
│ HITO 2   │  SCOPE (Organizations)
│          │  Filtrado por sede
└────┬─────┘
     │
     ▼
┌──────────┐
│ HITO 3   │  PERMISO (Cerbos)
│          │  Permisos granulares
└──────────┘
```

**Cada hito es independientemente testeable y deployable.**
