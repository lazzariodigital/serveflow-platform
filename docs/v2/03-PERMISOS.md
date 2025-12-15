# Bloque 3: Permisos y Autorización

**Estado:** En desarrollo
**Última actualización:** 2025-12-12
**Dependencias:** Bloque 2 (Identidad con FusionAuth)

---

## Índice

1. [Visión General](#1-visión-general)
2. [Cerbos como Motor de Autorización](#2-cerbos-como-motor-de-autorización)
3. [Arquitectura de Autorización](#3-arquitectura-de-autorización)
4. [Modelo de Roles](#4-modelo-de-roles)
5. [Derived Roles (Roles Derivados)](#5-derived-roles-roles-derivados)
6. [Resource Policies](#6-resource-policies)
7. [Condiciones CEL](#7-condiciones-cel)
8. [Scoped Policies (Multi-tenancy)](#8-scoped-policies-multi-tenancy)
9. [Integración FusionAuth + Cerbos](#9-integración-fusionauth--cerbos)
10. [Implementación NestJS](#10-implementación-nestjs)
11. [Implementación Next.js](#11-implementación-nextjs)
12. [MCP Server Authorization](#12-mcp-server-authorization)
13. [Testing de Policies](#13-testing-de-policies)
14. [Decisiones Tomadas](#14-decisiones-tomadas)

---

## 1. Visión General

### Separación de Responsabilidades

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AUTENTICACIÓN vs AUTORIZACIÓN                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   FusionAuth (Bloque 2)              Cerbos (Bloque 3)                  │
│   ─────────────────────              ──────────────────                  │
│   "¿Quién eres?"                     "¿Qué puedes hacer?"               │
│                                                                          │
│   • Identidad del usuario            • Permisos sobre recursos          │
│   • Roles estáticos (RBAC base)      • Roles derivados (contextuales)   │
│   • JWT con claims                   • Evaluación de policies           │
│   • Multi-tenant por Tenant          • Condiciones dinámicas            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### ¿Por qué Cerbos?

| Aspecto | Descripción |
|---------|-------------|
| **Políticas como Código** | YAML versionable en Git, revisable en PRs |
| **Context-Aware** | Decisiones basadas en datos del request (ownership, estado, etc.) |
| **Agnóstico** | No acoplado a FusionAuth, podríamos cambiar IdP sin reescribir permisos |
| **Multi-tenant Nativo** | Scoped policies para customización por tenant |
| **Alto Rendimiento** | Decisiones en < 1ms, ideal para microservicios |
| **SDKs Oficiales** | JavaScript/TypeScript, Go, Java, Python, .NET |

### Flujo de Autorización

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Request    │───▶│  FusionAuth  │───▶│    Cerbos    │───▶│   Recurso    │
│   + JWT      │    │   (Validar)  │    │  (Autorizar) │    │   (Acción)   │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
        │                   │                   │                   │
        │                   ▼                   ▼                   ▼
        │           ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
        │           │  Principal   │    │   Decision   │    │   Ejecutar   │
        │           │  id, roles,  │    │   ALLOW or   │    │   o Denegar  │
        │           │  attributes  │    │    DENY      │    │              │
        │           └──────────────┘    └──────────────┘    └──────────────┘
        │
        ▼
   ┌──────────────────────────────────────────────────────────────────────┐
   │  JWT Claims (de FusionAuth)                                          │
   │  {                                                                    │
   │    "sub": "user-uuid",                                               │
   │    "roles": ["admin", "staff"],                                      │
   │    "tenantId": "tenant-uuid",                                        │
   │    "organizationIds": ["org1", "org2"]                               │
   │  }                                                                    │
   └──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Cerbos como Motor de Autorización

### Conceptos Fundamentales

#### Principal (Quién)
El usuario que realiza la acción. Viene del JWT de FusionAuth.

```typescript
// Principal extraído del JWT
interface CerbosPrincipal {
  id: string;           // FusionAuth userId
  roles: string[];      // Roles del Registration (owner, admin, staff, member)
  attr: {               // Atributos adicionales
    tenantId: string;
    organizationIds: string[];
    email: string;
  };
}
```

#### Resource (Sobre qué)
El objeto sobre el que se quiere actuar.

```typescript
// Recurso a evaluar
interface CerbosResource {
  kind: string;        // Tipo: "booking", "user", "service", etc.
  id: string;          // ID del recurso específico
  attr: {              // Atributos del recurso
    ownerId?: string;
    organizationId?: string;
    status?: string;
    // ... según el tipo de recurso
  };
}
```

#### Action (Qué acción)
La operación que se quiere realizar.

```typescript
// Acciones típicas
type Actions =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'list'
  | 'approve'
  | 'cancel'
  | 'assign';
```

### API Principal: CheckResources

```typescript
// Request a Cerbos
const decision = await cerbos.checkResources({
  principal: {
    id: 'user-123',
    roles: ['admin'],
    attr: {
      tenantId: 'tenant-abc',
      organizationIds: ['org-1', 'org-2']
    }
  },
  resources: [
    {
      resource: {
        kind: 'booking',
        id: 'booking-456',
        attr: {
          ownerId: 'user-789',
          organizationId: 'org-1',
          status: 'pending'
        }
      },
      actions: ['read', 'update', 'cancel']
    }
  ]
});

// Response
// decision.isAllowed({ resource: { kind: 'booking', id: 'booking-456' }, action: 'read' })
// → true/false
```

---

## 3. Arquitectura de Autorización

### Deployment en Serveflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          ARQUITECTURA CERBOS                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                 │
│   │   Next.js   │    │   NestJS    │    │  Workers    │                 │
│   │  Frontend   │    │   Backend   │    │  (Jobs)     │                 │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                 │
│          │                  │                   │                        │
│          ▼                  ▼                   ▼                        │
│   ┌─────────────────────────────────────────────────────┐               │
│   │              Cerbos SDK (@cerbos/grpc)              │               │
│   └───────────────────────────┬─────────────────────────┘               │
│                               │                                          │
│                               ▼                                          │
│                    ┌─────────────────────┐                              │
│                    │    Cerbos Server    │                              │
│                    │    (Sidecar/Pod)    │                              │
│                    └──────────┬──────────┘                              │
│                               │                                          │
│                               ▼                                          │
│                    ┌─────────────────────┐                              │
│                    │   Policy Bundle     │                              │
│                    │   (Git-synced)      │                              │
│                    └─────────────────────┘                              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Estructura de Policies

```
packages/authorization/
├── policies/
│   ├── derived_roles/
│   │   └── common_roles.yaml      # Roles derivados compartidos
│   ├── resource_policies/
│   │   ├── booking.yaml           # Policy para reservas
│   │   ├── user.yaml              # Policy para usuarios
│   │   ├── service.yaml           # Policy para servicios
│   │   ├── resource.yaml          # Policy para recursos (pistas, etc.)
│   │   ├── event.yaml             # Policy para eventos
│   │   └── organization.yaml      # Policy para organizaciones
│   └── scoped/
│       └── acme/                   # Customizaciones tenant "acme"
│           └── booking.yaml
├── src/
│   ├── cerbos.client.ts           # Cliente Cerbos
│   ├── cerbos.guard.ts            # Guard para NestJS
│   ├── cerbos.service.ts          # Servicio de autorización
│   └── index.ts
├── tests/
│   └── policies/                   # Tests de policies
└── package.json
```

---

## 4. Modelo de Roles

### Roles Estáticos (FusionAuth)

Estos roles se asignan en el Registration de FusionAuth y vienen en el JWT.

```typescript
// Roles base definidos en FusionAuth
export const STATIC_ROLES = {
  // Roles de gestión (Dashboard)
  OWNER: 'owner',           // Propietario del tenant
  ADMIN: 'admin',           // Administrador
  STAFF: 'staff',           // Personal (recepcionistas, monitores)

  // Roles de cliente (Webapp)
  MEMBER: 'member',         // Socio/cliente

  // Roles especiales
  SUPER_ADMIN: 'super_admin', // Admin de plataforma (solo en Admin app)
} as const;
```

### Jerarquía de Roles

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        JERARQUÍA DE ROLES                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   OWNER ─────────────────────────────────────────────────────┐          │
│     │  • Configuración del tenant                            │          │
│     │  • Gestión de suscripción y pagos                      │          │
│     │  • Puede hacer TODO                                    │          │
│     │                                                        │          │
│     ▼                                                        │          │
│   ADMIN ────────────────────────────────────────────────┐    │          │
│     │  • Gestión de usuarios y roles                    │    │          │
│     │  • Configuración de servicios                     │    │          │
│     │  • Reportes y analytics                           │    │          │
│     │  • NO puede gestionar suscripción                 │    │          │
│     │                                                   │    │          │
│     ▼                                                   │    │          │
│   STAFF ───────────────────────────────────────────┐    │    │          │
│     │  • Gestión de reservas                       │    │    │          │
│     │  • Ver clientes                              │    │    │          │
│     │  • Operaciones día a día                     │    │    │          │
│     │  • NO puede gestionar otros staff            │    │    │          │
│     │                                              │    │    │          │
│     ▼                                              ▼    ▼    ▼          │
│   MEMBER ──────────────────────────────────────────────────────         │
│       • Sus propias reservas                                            │
│       • Ver servicios disponibles                                       │
│       • Perfil propio                                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Derived Roles (Roles Derivados)

Los derived roles permiten crear roles contextuales en tiempo de ejecución basados en datos del request.

### Definición: `common_roles.yaml`

```yaml
# policies/derived_roles/common_roles.yaml
---
apiVersion: "api.cerbos.dev/v1"
description: "Roles derivados comunes para Serveflow"
derivedRoles:
  name: serveflow_common_roles

  definitions:
    # Owner del recurso específico
    - name: resource_owner
      parentRoles: ["member", "staff", "admin", "owner"]
      condition:
        match:
          expr: request.resource.attr.ownerId == request.principal.id

    # Miembro de la misma organización
    - name: organization_member
      parentRoles: ["member", "staff", "admin", "owner"]
      condition:
        match:
          expr: request.resource.attr.organizationId in request.principal.attr.organizationIds

    # Staff de la organización del recurso
    - name: organization_staff
      parentRoles: ["staff", "admin", "owner"]
      condition:
        match:
          expr: request.resource.attr.organizationId in request.principal.attr.organizationIds

    # Admin de la organización del recurso
    - name: organization_admin
      parentRoles: ["admin", "owner"]
      condition:
        match:
          expr: request.resource.attr.organizationId in request.principal.attr.organizationIds

    # Owner del tenant
    - name: tenant_owner
      parentRoles: ["owner"]
      condition:
        match:
          expr: request.resource.attr.tenantId == request.principal.attr.tenantId

    # Creador de la reserva (puede cancelar)
    - name: booking_creator
      parentRoles: ["member", "staff", "admin", "owner"]
      condition:
        match:
          all:
            of:
              - expr: request.resource.kind == "booking"
              - expr: request.resource.attr.createdById == request.principal.id

    # Participante de un evento
    - name: event_participant
      parentRoles: ["member", "staff", "admin", "owner"]
      condition:
        match:
          all:
            of:
              - expr: request.resource.kind == "event"
              - expr: request.principal.id in request.resource.attr.participantIds
```

### Uso de Derived Roles

```yaml
# En una resource policy
rules:
  - actions: ["read"]
    effect: EFFECT_ALLOW
    derivedRoles:
      - resource_owner        # Puede leer si es dueño
      - organization_staff    # O si es staff de la org

  - actions: ["cancel"]
    effect: EFFECT_ALLOW
    derivedRoles:
      - booking_creator       # Solo el creador puede cancelar
    condition:
      match:
        expr: request.resource.attr.status == "pending"
```

---

## 6. Resource Policies

### Policy para Bookings (Reservas)

```yaml
# policies/resource_policies/booking.yaml
---
apiVersion: "api.cerbos.dev/v1"
resourcePolicy:
  resource: "booking"
  version: "default"
  importDerivedRoles:
    - serveflow_common_roles

  rules:
    # ═══════════════════════════════════════════════════════════════════
    # CREATE - Crear reservas
    # ═══════════════════════════════════════════════════════════════════
    - name: create_booking
      actions: ["create"]
      effect: EFFECT_ALLOW
      roles:
        - member
        - staff
        - admin
        - owner
      condition:
        match:
          # Solo puede crear en organizaciones donde tiene membresía
          expr: request.resource.attr.organizationId in request.principal.attr.organizationIds

    # ═══════════════════════════════════════════════════════════════════
    # READ - Ver reservas
    # ═══════════════════════════════════════════════════════════════════
    - name: read_own_booking
      actions: ["read"]
      effect: EFFECT_ALLOW
      derivedRoles:
        - resource_owner
        - booking_creator

    - name: read_org_bookings
      actions: ["read", "list"]
      effect: EFFECT_ALLOW
      derivedRoles:
        - organization_staff
        - organization_admin

    # ═══════════════════════════════════════════════════════════════════
    # UPDATE - Modificar reservas
    # ═══════════════════════════════════════════════════════════════════
    - name: update_own_booking
      actions: ["update"]
      effect: EFFECT_ALLOW
      derivedRoles:
        - resource_owner
      condition:
        match:
          # Solo si está pending y no ha empezado
          all:
            of:
              - expr: request.resource.attr.status == "pending"
              - expr: timestamp(request.resource.attr.startTime) > now

    - name: update_any_booking_as_staff
      actions: ["update"]
      effect: EFFECT_ALLOW
      derivedRoles:
        - organization_staff
        - organization_admin

    # ═══════════════════════════════════════════════════════════════════
    # CANCEL - Cancelar reservas
    # ═══════════════════════════════════════════════════════════════════
    - name: cancel_own_booking
      actions: ["cancel"]
      effect: EFFECT_ALLOW
      derivedRoles:
        - booking_creator
      condition:
        match:
          all:
            of:
              - expr: request.resource.attr.status == "pending"
              # Cancelación con mínimo 24h de antelación
              - expr: timestamp(request.resource.attr.startTime) > now + duration("24h")

    - name: cancel_any_booking_as_admin
      actions: ["cancel"]
      effect: EFFECT_ALLOW
      derivedRoles:
        - organization_admin
      # Admin puede cancelar cualquier booking de su org

    # ═══════════════════════════════════════════════════════════════════
    # DELETE - Eliminar reservas (solo admin)
    # ═══════════════════════════════════════════════════════════════════
    - name: delete_booking
      actions: ["delete"]
      effect: EFFECT_ALLOW
      derivedRoles:
        - organization_admin
        - tenant_owner
```

### Policy para Users

```yaml
# policies/resource_policies/user.yaml
---
apiVersion: "api.cerbos.dev/v1"
resourcePolicy:
  resource: "user"
  version: "default"
  importDerivedRoles:
    - serveflow_common_roles

  rules:
    # ═══════════════════════════════════════════════════════════════════
    # SELF - Operaciones sobre perfil propio
    # ═══════════════════════════════════════════════════════════════════
    - name: read_own_profile
      actions: ["read", "read:profile"]
      effect: EFFECT_ALLOW
      condition:
        match:
          expr: request.resource.id == request.principal.id

    - name: update_own_profile
      actions: ["update:profile"]
      effect: EFFECT_ALLOW
      condition:
        match:
          expr: request.resource.id == request.principal.id

    # ═══════════════════════════════════════════════════════════════════
    # STAFF - Ver usuarios de la organización
    # ═══════════════════════════════════════════════════════════════════
    - name: list_org_users
      actions: ["list"]
      effect: EFFECT_ALLOW
      derivedRoles:
        - organization_staff
        - organization_admin

    - name: read_org_user
      actions: ["read"]
      effect: EFFECT_ALLOW
      derivedRoles:
        - organization_staff
        - organization_admin

    # ═══════════════════════════════════════════════════════════════════
    # ADMIN - Gestión de usuarios
    # ═══════════════════════════════════════════════════════════════════
    - name: create_user
      actions: ["create"]
      effect: EFFECT_ALLOW
      derivedRoles:
        - organization_admin
        - tenant_owner

    - name: update_user
      actions: ["update", "update:role"]
      effect: EFFECT_ALLOW
      derivedRoles:
        - organization_admin
      condition:
        match:
          # No puede modificar a usuarios con rol mayor o igual
          expr: >
            !("owner" in request.resource.attr.roles) &&
            !("admin" in request.resource.attr.roles && !("owner" in request.principal.roles))

    - name: owner_update_any_user
      actions: ["update", "update:role", "deactivate"]
      effect: EFFECT_ALLOW
      derivedRoles:
        - tenant_owner

    # ═══════════════════════════════════════════════════════════════════
    # DEACTIVATE - Solo owner puede desactivar
    # ═══════════════════════════════════════════════════════════════════
    - name: deactivate_user
      actions: ["deactivate"]
      effect: EFFECT_ALLOW
      derivedRoles:
        - tenant_owner
      condition:
        match:
          # No puede desactivarse a sí mismo
          expr: request.resource.id != request.principal.id
```

### Policy para Services (Servicios configurables)

```yaml
# policies/resource_policies/service.yaml
---
apiVersion: "api.cerbos.dev/v1"
resourcePolicy:
  resource: "service"
  version: "default"
  importDerivedRoles:
    - serveflow_common_roles

  rules:
    # ═══════════════════════════════════════════════════════════════════
    # READ - Ver servicios (público dentro del tenant)
    # ═══════════════════════════════════════════════════════════════════
    - name: read_active_services
      actions: ["read", "list"]
      effect: EFFECT_ALLOW
      roles: ["*"]  # Cualquier rol autenticado
      condition:
        match:
          any:
            of:
              # O es público/activo
              - expr: request.resource.attr.status == "active"
              # O es admin/owner (puede ver drafts)
              - expr: '"admin" in request.principal.roles || "owner" in request.principal.roles'

    # ═══════════════════════════════════════════════════════════════════
    # CREATE/UPDATE/DELETE - Solo admin/owner
    # ═══════════════════════════════════════════════════════════════════
    - name: manage_services
      actions: ["create", "update", "delete", "publish", "unpublish"]
      effect: EFFECT_ALLOW
      derivedRoles:
        - organization_admin
        - tenant_owner
```

### Policy para Resources (Pistas, Salas, etc.)

```yaml
# policies/resource_policies/resource.yaml
---
apiVersion: "api.cerbos.dev/v1"
resourcePolicy:
  resource: "resource"
  version: "default"
  importDerivedRoles:
    - serveflow_common_roles

  rules:
    # ═══════════════════════════════════════════════════════════════════
    # READ - Ver recursos disponibles
    # ═══════════════════════════════════════════════════════════════════
    - name: read_resources
      actions: ["read", "list", "check_availability"]
      effect: EFFECT_ALLOW
      roles: ["*"]
      condition:
        match:
          expr: request.resource.attr.status == "active"

    # ═══════════════════════════════════════════════════════════════════
    # MANAGE - Gestionar recursos
    # ═══════════════════════════════════════════════════════════════════
    - name: manage_resources
      actions: ["create", "update", "delete", "activate", "deactivate"]
      effect: EFFECT_ALLOW
      derivedRoles:
        - organization_admin
        - tenant_owner

    # ═══════════════════════════════════════════════════════════════════
    # MAINTENANCE - Marcar en mantenimiento
    # ═══════════════════════════════════════════════════════════════════
    - name: maintenance_mode
      actions: ["set_maintenance", "clear_maintenance"]
      effect: EFFECT_ALLOW
      derivedRoles:
        - organization_staff
        - organization_admin
```

---

## 7. Condiciones CEL

### Sintaxis de Condiciones

Cerbos usa **Common Expression Language (CEL)** para expresiones condicionales.

### Variables Disponibles

```yaml
# Top-level identifiers
request.principal       # Usuario que hace la petición
request.resource        # Recurso sobre el que actúa
request.auxData         # Datos auxiliares (JWT completo, etc.)

# Shortcuts (aliases)
P                       # = request.principal
R                       # = request.resource

# Campos del Principal
P.id                    # ID del usuario
P.roles                 # Array de roles
P.attr.tenantId         # Atributo custom
P.attr.organizationIds  # Array de orgs

# Campos del Resource
R.id                    # ID del recurso
R.kind                  # Tipo (booking, user, etc.)
R.attr.ownerId          # Atributo del recurso
R.attr.status           # Estado del recurso
```

### Operadores Comunes

```yaml
# Comparación
expr: R.attr.ownerId == P.id
expr: R.attr.price > 100
expr: R.attr.status != "cancelled"

# Membership
expr: "admin" in P.roles
expr: R.attr.organizationId in P.attr.organizationIds

# Lógicos
expr: R.attr.status == "pending" && R.attr.ownerId == P.id
expr: "admin" in P.roles || "owner" in P.roles
expr: !("cancelled" == R.attr.status)

# Strings
expr: R.attr.name.startsWith("VIP")
expr: R.attr.email.contains("@company.com")
expr: R.attr.code.matches("^[A-Z]{3}[0-9]{4}$")

# Timestamps
expr: timestamp(R.attr.startTime) > now
expr: timestamp(R.attr.createdAt) > now - duration("24h")
expr: timestamp(R.attr.expiresAt) < now

# Durations
expr: duration("24h")
expr: duration("30m")
expr: duration("7d")  # No válido, usar: duration("168h")

# Lists
expr: size(R.attr.participants) < 10
expr: R.attr.tags.all(t, t != "banned")
expr: R.attr.invitees.exists(i, i == P.id)
```

### Operadores de Conjuntos

```yaml
# ALL - Todas las condiciones deben cumplirse
condition:
  match:
    all:
      of:
        - expr: R.attr.status == "pending"
        - expr: R.attr.ownerId == P.id
        - expr: timestamp(R.attr.startTime) > now

# ANY - Al menos una condición debe cumplirse
condition:
  match:
    any:
      of:
        - expr: "admin" in P.roles
        - expr: "owner" in P.roles
        - expr: R.attr.ownerId == P.id

# NONE - Ninguna condición debe cumplirse
condition:
  match:
    none:
      of:
        - expr: R.attr.status == "cancelled"
        - expr: R.attr.status == "completed"
```

### Ejemplos Avanzados

```yaml
# Booking: Cancelación con política de 24h
- name: cancel_with_policy
  actions: ["cancel"]
  effect: EFFECT_ALLOW
  derivedRoles:
    - booking_creator
  condition:
    match:
      all:
        of:
          - expr: R.attr.status == "confirmed"
          - expr: timestamp(R.attr.startTime) > now + duration("24h")
          - expr: R.attr.cancellationPolicy != "non_refundable"

# Event: Solo participantes pueden ver detalles
- name: view_private_event
  actions: ["read:details"]
  effect: EFFECT_ALLOW
  roles: ["*"]
  condition:
    match:
      any:
        of:
          - expr: R.attr.visibility == "public"
          - expr: P.id in R.attr.participantIds
          - expr: P.id == R.attr.organizerId

# User: No puede cambiar rol a superior
- name: update_role_restricted
  actions: ["update:role"]
  effect: EFFECT_ALLOW
  roles: ["admin"]
  condition:
    match:
      all:
        of:
          # El target no es owner
          - expr: '!("owner" in R.attr.roles)'
          # El nuevo rol no es owner
          - expr: 'request.auxData.attr.newRole != "owner"'
          # No se está auto-promocionando
          - expr: R.id != P.id
```

---

## 8. Scoped Policies (Multi-tenancy)

### Customización por Tenant

Cerbos permite crear políticas específicas por tenant que extienden o restringen las políticas base.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     SCOPED POLICIES HIERARCHY                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   policies/resource_policies/booking.yaml          ← Base (todos)       │
│          │                                                               │
│          ├── policies/scoped/acme/booking.yaml     ← Tenant "acme"      │
│          │                                                               │
│          └── policies/scoped/clubvip/booking.yaml  ← Tenant "clubvip"   │
│                                                                          │
│   La política más específica puede:                                      │
│   • OVERRIDE_PARENT: Sobrescribir completamente                         │
│   • REQUIRE_PARENTAL_CONSENT: Solo restringir (no ampliar)              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Ejemplo: Política Base vs Tenant Específico

```yaml
# policies/resource_policies/booking.yaml (Base)
---
apiVersion: "api.cerbos.dev/v1"
resourcePolicy:
  resource: "booking"
  version: "default"

  rules:
    - name: cancel_booking
      actions: ["cancel"]
      effect: EFFECT_ALLOW
      derivedRoles:
        - booking_creator
      condition:
        match:
          expr: timestamp(R.attr.startTime) > now + duration("24h")
```

```yaml
# policies/scoped/clubvip/booking.yaml (Tenant específico)
---
apiVersion: "api.cerbos.dev/v1"
resourcePolicy:
  resource: "booking"
  version: "default"
  scope: "clubvip"   # ← Scope del tenant
  scopePermissions: SCOPE_PERMISSIONS_OVERRIDE_PARENT

  rules:
    # ClubVIP permite cancelar con solo 2h de antelación
    - name: cancel_booking_relaxed
      actions: ["cancel"]
      effect: EFFECT_ALLOW
      derivedRoles:
        - booking_creator
      condition:
        match:
          expr: timestamp(R.attr.startTime) > now + duration("2h")
```

### Uso del Scope en Requests

```typescript
// Al hacer check, incluir el scope del tenant
const decision = await cerbos.checkResources({
  principal: {
    id: userId,
    roles: ['member'],
    attr: { tenantId, organizationIds },
    scope: tenantSlug  // ← "clubvip" para usar políticas custom
  },
  resources: [{
    resource: {
      kind: 'booking',
      id: bookingId,
      attr: { ... },
      scope: tenantSlug  // ← Scope también en el recurso
    },
    actions: ['cancel']
  }]
});
```

---

## 9. Integración FusionAuth + Cerbos

### JWT Claims para Cerbos

FusionAuth genera el JWT con los claims necesarios:

```typescript
// JWT de FusionAuth (después de JWT Populate Lambda)
interface FusionAuthJWT {
  sub: string;              // User ID
  aud: string;              // Application ID
  iss: string;              // FusionAuth issuer
  exp: number;              // Expiration
  iat: number;              // Issued at

  // Claims custom (del Lambda)
  roles: string[];          // ['admin', 'staff']
  tenantId: string;         // Serveflow Tenant ID
  organizationIds: string[]; // Org IDs donde tiene membresía
  email: string;
  name: string;
}
```

### Mapeo JWT → Cerbos Principal

```typescript
// packages/authorization/src/utils/jwt-to-principal.ts
import { Principal } from '@cerbos/core';

export function jwtToCerbosPrincipal(jwt: FusionAuthJWT): Principal {
  return {
    id: jwt.sub,
    roles: jwt.roles,
    attr: {
      tenantId: jwt.tenantId,
      organizationIds: jwt.organizationIds,
      email: jwt.email,
    },
    // Scope para políticas tenant-specific
    scope: jwt.tenantSlug, // Si existe
  };
}
```

### Flujo Completo

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FLUJO FUSIONAUTH + CERBOS                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   1. Usuario hace login (FusionAuth)                                    │
│      └─▶ JWT con roles[], tenantId, organizationIds[]                   │
│                                                                          │
│   2. Request a API con JWT                                              │
│      └─▶ FusionAuthGuard valida JWT                                     │
│                                                                          │
│   3. CerbosGuard extrae Principal del JWT                               │
│      └─▶ { id: sub, roles: roles, attr: { tenantId, ... } }            │
│                                                                          │
│   4. CerbosGuard construye Resource                                     │
│      └─▶ { kind: "booking", id: "123", attr: { ownerId, ... } }        │
│                                                                          │
│   5. Cerbos evalúa policies                                             │
│      └─▶ Base + Scoped (si hay) + Derived Roles + Conditions           │
│                                                                          │
│   6. Decisión: ALLOW o DENY                                             │
│      └─▶ Si DENY → 403 Forbidden                                        │
│      └─▶ Si ALLOW → Continuar al controller                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Implementación NestJS

### Cliente Cerbos

```typescript
// packages/authorization/src/cerbos.client.ts
import { GRPC as Cerbos } from '@cerbos/grpc';

let cerbosClient: Cerbos | null = null;

export function getCerbosClient(): Cerbos {
  if (!cerbosClient) {
    cerbosClient = new Cerbos(
      process.env.CERBOS_URL || 'localhost:3593',
      { tls: process.env.NODE_ENV === 'production' }
    );
  }
  return cerbosClient;
}
```

### Servicio de Autorización

```typescript
// packages/authorization/src/cerbos.service.ts
import { Injectable } from '@nestjs/common';
import { getCerbosClient } from './cerbos.client';
import { Principal, Resource } from '@cerbos/core';

export interface AuthorizationContext {
  principal: Principal;
  tenantSlug?: string;
}

@Injectable()
export class CerbosService {
  private cerbos = getCerbosClient();

  async isAllowed(
    ctx: AuthorizationContext,
    resource: { kind: string; id: string; attr?: Record<string, unknown> },
    action: string
  ): Promise<boolean> {
    const decision = await this.cerbos.checkResource({
      principal: {
        ...ctx.principal,
        scope: ctx.tenantSlug,
      },
      resource: {
        kind: resource.kind,
        id: resource.id,
        attr: resource.attr || {},
        scope: ctx.tenantSlug,
      },
      actions: [action],
    });

    return decision.isAllowed(action);
  }

  async checkMultiple(
    ctx: AuthorizationContext,
    checks: Array<{
      resource: { kind: string; id: string; attr?: Record<string, unknown> };
      actions: string[];
    }>
  ): Promise<Map<string, Map<string, boolean>>> {
    const decision = await this.cerbos.checkResources({
      principal: {
        ...ctx.principal,
        scope: ctx.tenantSlug,
      },
      resources: checks.map((c) => ({
        resource: {
          kind: c.resource.kind,
          id: c.resource.id,
          attr: c.resource.attr || {},
          scope: ctx.tenantSlug,
        },
        actions: c.actions,
      })),
    });

    // Construir mapa de resultados
    const results = new Map<string, Map<string, boolean>>();
    for (const check of checks) {
      const actionResults = new Map<string, boolean>();
      for (const action of check.actions) {
        actionResults.set(
          action,
          decision.isAllowed({
            resource: { kind: check.resource.kind, id: check.resource.id },
            action,
          })
        );
      }
      results.set(`${check.resource.kind}:${check.resource.id}`, actionResults);
    }
    return results;
  }
}
```

### Guard Decorador

```typescript
// packages/authorization/src/decorators/check-permission.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'cerbos_permission';

export interface PermissionCheck {
  resource: string;                    // 'booking', 'user', etc.
  action: string;                      // 'read', 'update', etc.
  resourceIdParam?: string;            // Nombre del param en la ruta
  getResourceAttr?: (req: any) => Record<string, unknown>;
}

export const CheckPermission = (check: PermissionCheck) =>
  SetMetadata(PERMISSION_KEY, check);
```

### Guard de Autorización

```typescript
// packages/authorization/src/guards/cerbos.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CerbosService } from '../cerbos.service';
import { PERMISSION_KEY, PermissionCheck } from '../decorators/check-permission.decorator';

@Injectable()
export class CerbosGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private cerbosService: CerbosService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissionCheck = this.reflector.get<PermissionCheck>(
      PERMISSION_KEY,
      context.getHandler()
    );

    if (!permissionCheck) {
      // No permission decorator, allow (autenticado es suficiente)
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // Del FusionAuthGuard

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Construir principal desde JWT
    const principal = {
      id: user.sub,
      roles: user.roles || [],
      attr: {
        tenantId: user.tenantId,
        organizationIds: user.organizationIds || [],
        email: user.email,
      },
    };

    // Obtener ID del recurso de los params
    const resourceId = permissionCheck.resourceIdParam
      ? request.params[permissionCheck.resourceIdParam]
      : 'new';

    // Obtener atributos adicionales del recurso
    const resourceAttr = permissionCheck.getResourceAttr
      ? permissionCheck.getResourceAttr(request)
      : {};

    const allowed = await this.cerbosService.isAllowed(
      { principal, tenantSlug: user.tenantSlug },
      {
        kind: permissionCheck.resource,
        id: resourceId,
        attr: resourceAttr,
      },
      permissionCheck.action
    );

    if (!allowed) {
      throw new ForbiddenException(
        `Permission denied: ${permissionCheck.action} on ${permissionCheck.resource}`
      );
    }

    return true;
  }
}
```

### Uso en Controllers

```typescript
// apps/api/src/modules/bookings/bookings.controller.ts
import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { FusionAuthGuard } from '@serveflow/auth';
import { CerbosGuard, CheckPermission } from '@serveflow/authorization';

@Controller('bookings')
@UseGuards(FusionAuthGuard, CerbosGuard)
export class BookingsController {
  constructor(
    private bookingsService: BookingsService,
    private cerbosService: CerbosService
  ) {}

  @Get()
  @CheckPermission({ resource: 'booking', action: 'list' })
  async list() {
    return this.bookingsService.list();
  }

  @Get(':id')
  @CheckPermission({
    resource: 'booking',
    action: 'read',
    resourceIdParam: 'id'
  })
  async findOne(@Param('id') id: string) {
    return this.bookingsService.findOne(id);
  }

  @Post()
  @CheckPermission({
    resource: 'booking',
    action: 'create',
    getResourceAttr: (req) => ({
      organizationId: req.body.organizationId,
    })
  })
  async create(@Body() dto: CreateBookingDto) {
    return this.bookingsService.create(dto);
  }

  @Put(':id')
  @CheckPermission({
    resource: 'booking',
    action: 'update',
    resourceIdParam: 'id'
  })
  async update(@Param('id') id: string, @Body() dto: UpdateBookingDto) {
    return this.bookingsService.update(id, dto);
  }

  @Delete(':id/cancel')
  @CheckPermission({
    resource: 'booking',
    action: 'cancel',
    resourceIdParam: 'id'
  })
  async cancel(@Param('id') id: string) {
    return this.bookingsService.cancel(id);
  }
}
```

### Verificación Manual (para lógica compleja)

```typescript
// Cuando necesitas verificar permisos dentro de la lógica de negocio
@Injectable()
export class BookingsService {
  constructor(private cerbosService: CerbosService) {}

  async cancelBooking(bookingId: string, user: AuthenticatedUser) {
    const booking = await this.findOne(bookingId);

    // Verificar permiso con atributos del booking real
    const canCancel = await this.cerbosService.isAllowed(
      {
        principal: {
          id: user.sub,
          roles: user.roles,
          attr: {
            tenantId: user.tenantId,
            organizationIds: user.organizationIds,
          },
        },
        tenantSlug: user.tenantSlug,
      },
      {
        kind: 'booking',
        id: booking._id,
        attr: {
          ownerId: booking.ownerId,
          createdById: booking.createdById,
          organizationId: booking.organizationId,
          status: booking.status,
          startTime: booking.startTime.toISOString(),
        },
      },
      'cancel'
    );

    if (!canCancel) {
      throw new ForbiddenException('No tienes permiso para cancelar esta reserva');
    }

    // Proceder con la cancelación
    return this.update(bookingId, { status: 'cancelled' });
  }
}
```

---

## 11. Implementación Next.js

### Hook de Autorización

```typescript
// packages/authorization/src/hooks/use-permission.ts
'use client';

import { useCallback } from 'react';
import { useAuth } from '@serveflow/auth/client';

export function usePermission() {
  const { user, getAccessToken } = useAuth();

  const checkPermission = useCallback(
    async (
      resource: { kind: string; id: string; attr?: Record<string, unknown> },
      action: string
    ): Promise<boolean> => {
      if (!user) return false;

      try {
        const token = await getAccessToken();
        const response = await fetch('/api/auth/check-permission', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ resource, action }),
        });

        const { allowed } = await response.json();
        return allowed;
      } catch {
        return false;
      }
    },
    [user, getAccessToken]
  );

  // Helper para checks comunes
  const can = useCallback(
    (action: string, resourceKind: string, resourceId?: string) =>
      checkPermission(
        { kind: resourceKind, id: resourceId || 'any' },
        action
      ),
    [checkPermission]
  );

  return { checkPermission, can };
}
```

### Componente de Autorización

```tsx
// packages/authorization/src/components/can.tsx
'use client';

import { useEffect, useState, ReactNode } from 'react';
import { usePermission } from '../hooks/use-permission';

interface CanProps {
  action: string;
  resource: string;
  resourceId?: string;
  resourceAttr?: Record<string, unknown>;
  children: ReactNode;
  fallback?: ReactNode;
  loading?: ReactNode;
}

export function Can({
  action,
  resource,
  resourceId,
  resourceAttr,
  children,
  fallback = null,
  loading = null,
}: CanProps) {
  const { checkPermission } = usePermission();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    checkPermission(
      { kind: resource, id: resourceId || 'any', attr: resourceAttr },
      action
    ).then(setAllowed);
  }, [action, resource, resourceId, resourceAttr, checkPermission]);

  if (allowed === null) return <>{loading}</>;
  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
```

### Uso en Componentes

```tsx
// apps/dashboard/src/app/bookings/[id]/page.tsx
import { Can } from '@serveflow/authorization/client';
import { CancelBookingButton, EditBookingButton } from './components';

export default function BookingDetailPage({ params }: { params: { id: string } }) {
  const booking = await getBooking(params.id);

  return (
    <div>
      <h1>Reserva #{booking.id}</h1>

      {/* Mostrar botón solo si tiene permiso */}
      <Can
        action="update"
        resource="booking"
        resourceId={booking.id}
        resourceAttr={{
          ownerId: booking.ownerId,
          organizationId: booking.organizationId,
          status: booking.status,
        }}
      >
        <EditBookingButton bookingId={booking.id} />
      </Can>

      <Can
        action="cancel"
        resource="booking"
        resourceId={booking.id}
        resourceAttr={{
          ownerId: booking.ownerId,
          createdById: booking.createdById,
          status: booking.status,
          startTime: booking.startTime,
        }}
        fallback={<p className="text-muted">No puedes cancelar esta reserva</p>}
      >
        <CancelBookingButton bookingId={booking.id} />
      </Can>
    </div>
  );
}
```

### API Route para Check

```typescript
// apps/dashboard/src/app/api/auth/check-permission/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCerbosClient } from '@serveflow/authorization';
import { validateJWT } from '@serveflow/auth/server';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ allowed: false }, { status: 401 });
    }

    const jwt = await validateJWT(token);
    const { resource, action } = await req.json();

    const cerbos = getCerbosClient();
    const decision = await cerbos.checkResource({
      principal: {
        id: jwt.sub,
        roles: jwt.roles,
        attr: {
          tenantId: jwt.tenantId,
          organizationIds: jwt.organizationIds,
        },
        scope: jwt.tenantSlug,
      },
      resource: {
        kind: resource.kind,
        id: resource.id,
        attr: resource.attr || {},
        scope: jwt.tenantSlug,
      },
      actions: [action],
    });

    return NextResponse.json({ allowed: decision.isAllowed(action) });
  } catch (error) {
    console.error('Permission check error:', error);
    return NextResponse.json({ allowed: false }, { status: 500 });
  }
}
```

---

## 12. MCP Server Authorization

### Context: AI Agents con MCP

Los AI Agents que usan Model Context Protocol (MCP) necesitan autorización para ejecutar tools.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    MCP SERVER AUTHORIZATION FLOW                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                 │
│   │  AI Agent   │───▶│ MCP Server  │───▶│   Cerbos    │                 │
│   │  (Claude)   │    │ (Serveflow) │    │  (AuthZ)    │                 │
│   └─────────────┘    └──────┬──────┘    └─────────────┘                 │
│                             │                                            │
│                             ▼                                            │
│                    ┌─────────────────┐                                  │
│                    │  API Backend    │                                  │
│                    │   (NestJS)      │                                  │
│                    └─────────────────┘                                  │
│                                                                          │
│   El MCP Server:                                                        │
│   1. Recibe tool call del AI Agent                                      │
│   2. Extrae el token/session del contexto                               │
│   3. Verifica permisos con Cerbos ANTES de ejecutar                     │
│   4. Ejecuta solo si está autorizado                                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Policy para MCP Tools

```yaml
# policies/resource_policies/mcp_tool.yaml
---
apiVersion: "api.cerbos.dev/v1"
resourcePolicy:
  resource: "mcp_tool"
  version: "default"
  importDerivedRoles:
    - serveflow_common_roles

  rules:
    # ═══════════════════════════════════════════════════════════════════
    # READ TOOLS - Consultas de información
    # ═══════════════════════════════════════════════════════════════════
    - name: read_tools
      actions:
        - "list_bookings"
        - "get_booking"
        - "list_services"
        - "get_availability"
        - "get_user_profile"
      effect: EFFECT_ALLOW
      roles:
        - member
        - staff
        - admin
        - owner

    # ═══════════════════════════════════════════════════════════════════
    # MEMBER TOOLS - Acciones de cliente
    # ═══════════════════════════════════════════════════════════════════
    - name: member_tools
      actions:
        - "create_booking"
        - "cancel_own_booking"
        - "update_profile"
      effect: EFFECT_ALLOW
      roles:
        - member
        - staff
        - admin
        - owner

    # ═══════════════════════════════════════════════════════════════════
    # STAFF TOOLS - Gestión operativa
    # ═══════════════════════════════════════════════════════════════════
    - name: staff_tools
      actions:
        - "manage_bookings"
        - "check_in_user"
        - "view_schedule"
        - "send_notification"
      effect: EFFECT_ALLOW
      roles:
        - staff
        - admin
        - owner

    # ═══════════════════════════════════════════════════════════════════
    # ADMIN TOOLS - Configuración
    # ═══════════════════════════════════════════════════════════════════
    - name: admin_tools
      actions:
        - "manage_services"
        - "manage_resources"
        - "manage_users"
        - "view_reports"
        - "export_data"
      effect: EFFECT_ALLOW
      roles:
        - admin
        - owner

    # ═══════════════════════════════════════════════════════════════════
    # DANGEROUS TOOLS - Solo owner
    # ═══════════════════════════════════════════════════════════════════
    - name: dangerous_tools
      actions:
        - "delete_data"
        - "bulk_operations"
        - "system_config"
      effect: EFFECT_ALLOW
      roles:
        - owner
```

### MCP Server con Cerbos

```typescript
// packages/mcp-server/src/authorization.ts
import { getCerbosClient } from '@serveflow/authorization';

interface MCPContext {
  userId: string;
  roles: string[];
  tenantId: string;
  organizationIds: string[];
  tenantSlug?: string;
}

export async function authorizeToolCall(
  context: MCPContext,
  toolName: string
): Promise<boolean> {
  const cerbos = getCerbosClient();

  const decision = await cerbos.checkResource({
    principal: {
      id: context.userId,
      roles: context.roles,
      attr: {
        tenantId: context.tenantId,
        organizationIds: context.organizationIds,
      },
      scope: context.tenantSlug,
    },
    resource: {
      kind: 'mcp_tool',
      id: toolName,
      attr: {},
      scope: context.tenantSlug,
    },
    actions: [toolName],
  });

  return decision.isAllowed(toolName);
}
```

```typescript
// packages/mcp-server/src/tools/booking-tools.ts
import { authorizeToolCall } from '../authorization';

export const createBookingTool = {
  name: 'create_booking',
  description: 'Create a new booking for a service',
  inputSchema: { ... },

  async execute(input: CreateBookingInput, context: MCPContext) {
    // 1. Verificar autorización
    const allowed = await authorizeToolCall(context, 'create_booking');
    if (!allowed) {
      throw new Error('Not authorized to create bookings');
    }

    // 2. Ejecutar la acción
    const booking = await bookingsService.create({
      ...input,
      createdById: context.userId,
    });

    return booking;
  }
};
```

---

## 13. Testing de Policies

### Estructura de Tests

```
packages/authorization/
└── tests/
    └── policies/
        ├── booking.test.yaml
        ├── user.test.yaml
        └── derived_roles.test.yaml
```

### Test de Booking Policy

```yaml
# tests/policies/booking.test.yaml
---
name: BookingPolicyTests
description: Tests for booking resource policy

principals:
  member_alice:
    id: "alice-123"
    roles: ["member"]
    attr:
      tenantId: "tenant-1"
      organizationIds: ["org-1"]

  staff_bob:
    id: "bob-456"
    roles: ["staff"]
    attr:
      tenantId: "tenant-1"
      organizationIds: ["org-1", "org-2"]

  admin_carol:
    id: "carol-789"
    roles: ["admin"]
    attr:
      tenantId: "tenant-1"
      organizationIds: ["org-1"]

resources:
  alice_pending_booking:
    kind: "booking"
    id: "booking-1"
    attr:
      ownerId: "alice-123"
      createdById: "alice-123"
      organizationId: "org-1"
      status: "pending"
      startTime: "2025-12-20T10:00:00Z"

  bob_confirmed_booking:
    kind: "booking"
    id: "booking-2"
    attr:
      ownerId: "bob-456"
      createdById: "bob-456"
      organizationId: "org-1"
      status: "confirmed"
      startTime: "2025-12-15T14:00:00Z"

tests:
  - name: "Member can read own booking"
    input:
      principal: member_alice
      resource: alice_pending_booking
      actions: ["read"]
    expected:
      read: EFFECT_ALLOW

  - name: "Member cannot read others booking"
    input:
      principal: member_alice
      resource: bob_confirmed_booking
      actions: ["read"]
    expected:
      read: EFFECT_DENY

  - name: "Staff can read any org booking"
    input:
      principal: staff_bob
      resource: alice_pending_booking
      actions: ["read", "list"]
    expected:
      read: EFFECT_ALLOW
      list: EFFECT_ALLOW

  - name: "Owner can cancel own pending booking (24h before)"
    input:
      principal: member_alice
      resource: alice_pending_booking
      actions: ["cancel"]
    expected:
      cancel: EFFECT_ALLOW

  - name: "Admin can cancel any booking in org"
    input:
      principal: admin_carol
      resource: bob_confirmed_booking
      actions: ["cancel"]
    expected:
      cancel: EFFECT_ALLOW
```

### Ejecutar Tests

```bash
# Usando Cerbos CLI
cerbos compile --tests=tests/policies policies/

# Output esperado:
# Test results:
# BookingPolicyTests
#   ✓ Member can read own booking
#   ✓ Member cannot read others booking
#   ✓ Staff can read any org booking
#   ✓ Owner can cancel own pending booking
#   ✓ Admin can cancel any booking in org
#
# 5 tests, 5 passed, 0 failed
```

### CI Integration

```yaml
# .github/workflows/test-policies.yaml
name: Test Cerbos Policies

on:
  push:
    paths:
      - 'packages/authorization/policies/**'
      - 'packages/authorization/tests/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Cerbos
        uses: cerbos/cerbos-setup-action@v1
        with:
          version: latest

      - name: Compile and Test Policies
        run: |
          cd packages/authorization
          cerbos compile --tests=tests/policies policies/
```

---

## 14. Decisiones Tomadas

| Decisión | Opción Elegida | Alternativas Consideradas | Justificación |
|----------|----------------|---------------------------|---------------|
| **Motor de autorización** | Cerbos | OPA, Casbin, Custom | Policies YAML legibles, derived roles, SDKs oficiales, alto rendimiento |
| **Deployment Cerbos** | Sidecar/Pod | Embedded, Servicio centralizado | Balance entre latencia y simplicidad operativa |
| **Roles base** | owner/admin/staff/member | Más granulares, Jerárquicos complejos | Simplicidad, cubren 95% de casos, extensible con derived roles |
| **Scoped policies** | Por tenant (slug) | Por organización, Sin scopes | Permite customización sin complejidad excesiva |
| **Comunicación SDK** | gRPC | REST | Mejor rendimiento, tipado fuerte |
| **Testing** | YAML test files | Unit tests código | Nativo de Cerbos, más declarativo |
| **MCP Tools auth** | Policies dedicadas | Reusar resource policies | Separación clara, tools son diferentes a CRUD |

---

## Próximos Pasos

- [ ] Implementar package `@serveflow/authorization`
- [ ] Definir todas las resource policies (booking, user, service, resource, event)
- [ ] Configurar Cerbos en Docker Compose para desarrollo
- [ ] Integrar CerbosGuard en API NestJS
- [ ] Implementar hook `usePermission` en frontend
- [ ] Escribir tests para todas las policies
- [ ] Documentar customización de policies por tenant
