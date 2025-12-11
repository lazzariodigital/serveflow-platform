# Serveflow - Arquitectura Real del Sistema

**Fecha de Auditoría:** 2025-01-25
**Estado:** Documento generado por análisis de código real
**Propósito:** Documentar el estado REAL de la implementación (no el diseño teórico)

---

## 1. Resumen Ejecutivo

### Estado General del Proyecto

| Aspecto | Estado | Notas |
|---------|--------|-------|
| **Monorepo** | Funcional | Nx 21 + pnpm, bien estructurado |
| **Apps** | 6 apps | 2 principales (tenant-dashboard, ai-assistant), 4 secundarias |
| **Packages** | 7 packages | 2 desarrollados (@identity, @tenants), 5 stubs |
| **Multi-tenancy** | Implementado | 4 tenants Firebase configurados |
| **Sistema IA** | 70% | Supervisor pattern funcional, agentes parcialmente integrados |
| **State Machines** | PROBLEMA | XState definido pero NO usado, lógica duplicada |
| **Modelos de Datos** | PROBLEMA | Múltiples definiciones inconsistentes |

### Problemas Críticos Detectados

1. **XState machines definidas pero NUNCA usadas** - Código muerto
2. **3 definiciones diferentes de BookingStatus** - Inconsistencia de tipos
3. **Flujos Web y AI completamente separados** - No convergen
4. **Agentes definidos pero no integrados** - echo-agent, identity-agent no usados
5. **Código duplicado en /nodes/ y /agents/** - Dos implementaciones del booking agent

---

## 2. Estructura del Monorepo

```
serveflow/
├── apps/
│   ├── tenant-dashboard/     # Next.js 15 - Dashboard principal (PRINCIPAL)
│   ├── ai-assistant/         # LangGraph - Sistema IA (PRINCIPAL)
│   ├── admin-dashboard/      # Next.js 15 - Admin panel (BÁSICO)
│   ├── admin-api/            # NestJS - API admin (BÁSICO)
│   ├── whatsapp-gateway/     # Express - Gateway WhatsApp (STUB)
│   └── mcp-server/           # Next.js - Servidor MCP (BÁSICO)
│
├── packages/
│   ├── identity/             # Resolución identidad cross-canal (COMPLETO)
│   ├── tenants/              # Gestión multi-tenant (COMPLETO)
│   ├── auth/                 # Autenticación (STUB)
│   ├── core/                 # Lógica negocio (STUB)
│   ├── ui/                   # Componentes React (STUB)
│   ├── config/               # Configuración (STUB)
│   └── data-firestore/       # Acceso datos (STUB)
│
├── firebase-configs/
│   ├── club-padel-madrid/    # ADVERTENCIA: Reglas abiertas hasta Oct 2025
│   ├── club-tenis-barcelona/
│   └── club-futbol-valencia/
│
├── docs/                     # Documentación
└── tools/                    # Generadores Nx
```

### Dependencias Entre Apps

```
tenant-dashboard
    ├── @tenants (config multi-tenant)
    ├── @auth (autenticación)
    ├── @identity (resolución identidad)
    └── Firebase SDK

ai-assistant
    ├── @identity (resolución identidad)
    ├── @tenants (config multi-tenant)
    ├── LangGraph/LangChain
    └── Firebase Admin SDK

mcp-server
    └── @vercel/mcp-adapter
```

---

## 3. Sistema de IA (LangGraph)

### Patrón: SUPERVISOR (No Swarm)

A pesar de que algunos archivos mencionan "Swarm Pattern", la implementación real usa **Supervisor Pattern**:

```
                    ┌─────────────┐
                    │   START     │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  SUPERVISOR │◄────────────────┐
                    │  (Router)   │                 │
                    └──────┬──────┘                 │
                           │                        │
              ┌────────────┼────────────┐          │
              │            │            │          │
        ┌─────▼─────┐ ┌────▼────┐ ┌────▼────┐     │
        │  BOOKING  │ │  SYNC   │ │  OPT    │     │
        │  (Tools)  │ │ (TODO)  │ │ (TODO)  │     │
        └─────┬─────┘ └────┬────┘ └────┬────┘     │
              │            │            │          │
              └────────────┴────────────┴──────────┘
                           │
                    ┌──────▼──────┐
                    │    END      │
                    └─────────────┘
```

### Agentes Implementados

| Agente | Archivo | LLM | Estado | En Graph |
|--------|---------|-----|--------|----------|
| **Supervisor** | `agents/supervisor-agent.ts` | Claude Sonnet 4.5 | ACTIVO | SI |
| **Booking** | `agents/booking-agent.ts` | Claude Sonnet 4.5 | ACTIVO | SI |
| **Identity** | `agents/identity-agent.ts` | Claude Sonnet 4.5 | DEFINIDO | NO |
| **Echo** | `agents/echo-agent.ts` | Claude Sonnet 4.5 | DEFINIDO | NO |
| **Orchestrator** | `agents/orchestrator-agent.ts` | Claude Sonnet 4.5 | REDUNDANTE | NO |

### PROBLEMA: Código Duplicado

Existen DOS implementaciones del Booking Agent:

```
apps/ai-assistant/src/
├── agents/
│   └── booking-agent.ts      # Implementación nueva (createReactAgent)
└── nodes/
    └── booking-agent.ts      # Implementación vieja (node-based) ← CÓDIGO MUERTO
```

**La carpeta `/nodes/` contiene código obsoleto que debería eliminarse.**

### PROBLEMA: Agentes No Integrados

Los agentes `identity-agent.ts`, `echo-agent.ts` y `orchestrator-agent.ts` están implementados con herramientas de handoff pero **NO están conectados al grafo principal**. Solo `supervisor` y `booking` están activos.

### Persistencia (FirebaseSaver)

```typescript
// Estado: IMPLEMENTADO pero NO ACTIVADO
// Ubicación: checkpointers/firebase-saver.ts

// El código usa MemorySaver por defecto:
const checkpointer = new MemorySaver();  // ← En producción

// FirebaseSaver está listo pero comentado:
// const checkpointer = createFirebaseSaver(db);
```

### Integración MCP

```typescript
// Ubicación: tools/mcp-client.ts
// Conexión: HTTP a http://localhost:3000/api/mcp

// Tools disponibles via MCP:
- listBookings
- getBooking
- makeBooking
- getAvailableSlots
- checkAvailability
- listResources
- getResource
- getService
```

---

## 4. Modelos de Datos (Firestore)

### Colecciones Principales

| Colección | Multi-tenant | Subcollections | Estado |
|-----------|--------------|----------------|--------|
| `bookings` | Si (tenantId, organizationId) | No | Estable |
| `users` | Si (scope-based) | No | Estable |
| `services` | Si | No | Estable |
| `resources` | Si | No | Estable |
| `orders` | Parcial | No | Estable |
| `events` | Parcial | No | Estable |
| `vouchers` | No | No | Estable |
| `roles` | No | No | Estable |
| `organizations` | Si | No | Estable |
| `conversations` | Si | `checkpoints` | Nuevo |

### PROBLEMA CRÍTICO: Booking Status (3 Definiciones)

#### Definición 1: `types/booking.ts` (Usada en interfaces)
```typescript
export type BookingStatus =
  | 'draft' | 'pending' | 'confirmed'
  | 'in_progress' | 'completed' | 'cancelled' | 'expired';
// 7 estados
```

#### Definición 2: `types/booking-lifecycle.ts` (Config Firestore)
```typescript
interface BookingStatus {
  id: string;           // 'draft', 'pending', etc.
  name: string;
  label: TranslatableString;
  color: string;
  icon: string;
  isActive: boolean;
  isFinal?: boolean;
}
// Objeto configurable, no string literal
```

#### Definición 3: `machines/booking-machine.ts` (XState)
```typescript
type BookingStateValue =
  | 'draft' | 'pending' | 'confirmed'
  | { confirmed: 'idle' | 'active' }  // Estados anidados
  | 'modified' | 'completed' | 'cancelled'
  | 'no_show' | 'expired';
// 9 estados (incluye 'modified' y 'no_show' que NO existen en otras definiciones)
```

**IMPACTO:** Type errors cuando XState devuelve 'modified' o 'no_show' pero el tipo espera BookingStatus.

### PROBLEMA: Payment Status (2+ Definiciones)

#### Definición 1: `types/booking.ts`
```typescript
export type PaymentStatus =
  | 'unpaid' | 'pending' | 'paid'
  | 'failed' | 'refunded' | 'partial_refund';
// 6 estados
```

#### Definición 2: `machines/booking-machine.ts` (Payment Machine)
```typescript
// Estados: unpaid, pending, partial, paid, overdue,
//          failed, refund_pending, partial_refund, refunded, disputed
// 10 estados (incluye 'partial', 'overdue', 'disputed' que NO existen en tipo)
```

### Modelo de Booking Completo

```typescript
interface Booking {
  // Identificación
  docId: string;
  bookingNumber: string;           // "BK-2025-00123"

  // Relaciones
  userId: string;
  resourceId: string;
  serviceId: string;
  providerId?: string;
  organizationId?: string;

  // Tiempo
  startTime: Date;
  endTime: Date;
  reservationDate: Date;

  // Precio
  priceOption: IServicePriceOption;
  price: number;

  // Estados
  status: BookingStatus;           // PROBLEMA: 3 definiciones
  paymentStatus: PaymentStatus;    // PROBLEMA: 2 definiciones
  paymentId?: string;

  // Guest (usuarios no registrados)
  guestInfo?: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
  };

  // Metadata
  metadata?: {
    source: 'web' | 'admin' | 'api' | 'kiosk' | 'mcp';
    conversationId?: string;       // Link con IA
    channel?: 'whatsapp' | 'copilot';
  };

  // Audit
  createdAt: Date;
  updatedAt?: Date;
  statusHistory?: StatusChange[];  // Historial de cambios
}
```

### Modelo de Usuario

```typescript
interface IUser {
  docId: string;
  uid?: string;                    // Firebase UID

  // Datos básicos
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;

  // Estado
  status: 'active' | 'inactive' | 'suspended' | 'pending' | 'archived';
  isVerified: boolean;

  // Autenticación
  authProvider: 'firebase' | 'google' | 'apple' | 'microsoft' | 'local';
  hasAuthCredentials: boolean;
  twoFactorEnabled: boolean;

  // Multi-tenancy
  scope: 'tenant' | 'organization';
  organizations?: string[];
  primaryOrganizationId?: string;

  // Roles
  roleIds?: string[];
  teams?: string[];

  // Provider (si es proveedor de servicios)
  schedule?: WeeklySchedule;
  providerProfile?: ProviderProfile;
  services?: string[];

  // Familia
  familyGroupId?: string;

  // Timestamps
  createdAt: Date;
  updatedAt?: Date;
  lastLoginAt?: Date;
}
```

---

## 5. State Machines y Flujos de Booking

### PROBLEMA PRINCIPAL: XState Definido pero NO Usado

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   XSTATE MACHINE (booking-machine.ts)                          │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ draft → pending → confirmed → in_progress → completed   │  │
│   │                 ↘ cancelled                              │  │
│   │                 ↘ expired                                │  │
│   │                 ↘ modified                               │  │
│   │                 ↘ no_show                                │  │
│   └─────────────────────────────────────────────────────────┘  │
│                           │                                     │
│                           │ NUNCA SE USA                        │
│                           ▼                                     │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ Hook: useBookingMachine()                               │  │
│   │ - canTransition(), transition()                          │  │
│   │ - SOLO usado en componentes aislados                     │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   FIRESTORE TRANSITIONS (Lo que REALMENTE se usa)              │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ Collection: booking_transitions                          │  │
│   │ Function: transitionBooking(bookingId, event)           │  │
│   │                                                          │  │
│   │ - Consulta transiciones válidas desde Firestore          │  │
│   │ - Actualiza booking.status directamente                  │  │
│   │ - Guarda en statusHistory                                │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Dos Flujos de Booking Completamente Separados

#### Flujo Web (tenant-dashboard)

```
use-booking-process.ts
        │
        ▼
  createBooking()  ─────────────► Firestore: bookings (status: draft)
        │
        ▼
  transitionBooking(BOOKING_SUBMITTED) ──► Firestore: status → pending
        │
        ▼
use-payment-process.ts
        │
        ▼
  createOrder() ───────────────► Firestore: orders
        │
        ▼
  processPayment() (Stripe) ───► Stripe API
        │
        ▼
  transitionBooking(BOOKING_CONFIRMED) ─► Firestore: status → confirmed
        │
        ▼
  updateBooking({ paymentStatus: 'paid' }) ◄── BYPASS de transitions!
```

#### Flujo AI Agent (ai-assistant)

```
LangGraph invocation
        │
        ▼
  supervisorNode() ────────────► Intent detection
        │
        ▼
  bookingAgentNode() ──────────► createReactAgent with MCP tools
        │
        ▼
  getMCPTools() ───────────────► Connect to MCP Server
        │
        ▼
  llmWithTools.invoke() ───────► Claude Sonnet calls tools:
        │                         - getAvailableSlots()
        │                         - makeBooking()
        │                         - etc.
        ▼
  MCP Server handles ──────────► Firestore operations (separadas!)
```

**PROBLEMA:** Los dos flujos NO comparten lógica. El MCP Server tiene su propia implementación de crear bookings.

### Eventos Inconsistentes

| XState Event | Firestore Event | Problema |
|--------------|-----------------|----------|
| `SUBMIT` | `BOOKING_SUBMITTED` | Nombres diferentes |
| `CONFIRM` | `BOOKING_CONFIRMED` | Nombres diferentes |
| `CANCEL` | `BOOKING_CANCELLED` | Nombres diferentes |
| `PAY` | (ninguno) | No existe equivalente |
| `MODIFY` | (ninguno) | No existe equivalente |
| `NO_SHOW` | (ninguno) | No existe equivalente |

---

## 6. Packages Compartidos

### @repo/identity (Completo)

```typescript
// Funcionalidad: Resolución de identidad cross-canal
// Estado: Producción

import { getIdentityService } from '@repo/identity';

const service = getIdentityService();
const unifiedUserId = await service.resolveUnifiedId(
  '+34612345678',
  'phone',
  'club-padel-madrid'
);
// → 'a1b2c3d4e5f6...' (SHA-256 determinístico)
```

**Características:**
- Genera Unified User ID (SHA-256)
- Resuelve desde phone, email o userId
- Crea identity mappings en Firestore
- Cache in-memory (TTL 5 min)
- 23/24 tests passing

### @repo/tenants (Completo)

```typescript
// Funcionalidad: Gestión multi-tenant
// Estado: Producción

import { TenantConfigService } from '@repo/tenants';

const service = new TenantConfigService();
const tenant = await service.getTenantConfig('club-padel-madrid');
```

**Características:**
- CRUD de configuraciones tenant
- Resolución por hostname
- Sample tenants para desarrollo
- Provisioning automatizado

### Packages Stub (Solo Estructura)

| Package | Propósito Esperado | Estado |
|---------|-------------------|--------|
| `@repo/auth` | Wrappers Firebase Auth | Solo estructura |
| `@repo/core` | Lógica negocio compartida | Solo estructura |
| `@repo/ui` | Componentes React | Solo estructura |
| `@repo/config` | Variables de entorno | Solo estructura |
| `@repo/data-firestore` | Acceso datos | Solo estructura |

---

## 7. Resumen de Duplicaciones e Inconsistencias

### Tabla de Duplicaciones

| Elemento | Ubicación 1 | Ubicación 2 | Ubicación 3 | Problema |
|----------|-------------|-------------|-------------|----------|
| BookingStatus | `types/booking.ts` | `types/booking-lifecycle.ts` | `machines/booking-machine.ts` | 3 definiciones incompatibles |
| PaymentStatus | `types/booking.ts` | `machines/booking-machine.ts` | - | 2 definiciones incompatibles |
| Booking Agent | `agents/booking-agent.ts` | `nodes/booking-agent.ts` | - | Código duplicado |
| Transition Logic | XState machine | Firestore queries | - | XState no usado |
| Evento nombres | XState events | Firestore events | - | Naming inconsistente |

### Código Muerto Identificado

| Archivo/Carpeta | Razón |
|-----------------|-------|
| `apps/ai-assistant/src/nodes/` | Implementación vieja, reemplazada por `/agents/` |
| `agents/orchestrator-agent.ts` | Redundante, solo transfiere a booking |
| `agents/echo-agent.ts` | Definido pero no conectado al grafo |
| `agents/identity-agent.ts` | Definido pero no conectado al grafo |
| XState machines | Definidas pero nunca ejecutadas |

### Funcionalidad Incompleta

| Componente | Estado | Falta |
|------------|--------|-------|
| FirebaseSaver | Implementado | Activar en producción |
| Message Accumulator | No existe | Implementar para WhatsApp |
| Payment Machine | Definido | Integrar con Stripe webhooks |
| Identity Agent | Definido | Conectar al grafo |
| Monitoring | No existe | Cloud Logging, alertas |

---

## 8. Recomendaciones

### Prioridad Alta

1. **Eliminar código muerto:**
   - Borrar carpeta `apps/ai-assistant/src/nodes/`
   - Borrar `agents/orchestrator-agent.ts`

2. **Unificar BookingStatus:**
   - Elegir UNA definición como source of truth
   - Generar las demás desde esa fuente

3. **Decidir sobre XState:**
   - OPCIÓN A: Eliminar XState completamente, usar solo Firestore
   - OPCIÓN B: Integrar XState en el flujo real de booking

4. **Activar FirebaseSaver:**
   - Cambiar de MemorySaver a FirebaseSaver en producción
   - Testear persistencia cross-session

### Prioridad Media

5. **Conectar agentes faltantes:**
   - Integrar identity-agent al grafo
   - Integrar echo-agent o eliminarlo

6. **Convergir flujos Web y AI:**
   - Crear capa de servicio compartida
   - Ambos flujos llaman mismas funciones

7. **Actualizar Security Rules:**
   - Migrar club-padel-madrid de reglas abiertas a producción

### Prioridad Baja

8. **Implementar packages stub:**
   - Desarrollar @repo/core, @repo/ui, etc.

9. **Documentación:**
   - Mantener este documento actualizado
   - Generar API docs automáticos

---

## 9. Comandos de Desarrollo

```bash
# Desarrollo
pnpm nx serve tenant-dashboard          # Puerto 8083
pnpm nx serve ai-assistant              # Puerto 3000
pnpm nx serve mcp-server                # Puerto 3001

# Por tenant
pnpm nx dev:lazzario tenant-dashboard   # Puerto 3001
pnpm nx dev:barcelona tenant-dashboard  # Puerto 3002
pnpm nx dev:valencia tenant-dashboard   # Puerto 3003

# Tests
pnpm nx test ai-assistant
pnpm nx test identity

# Build
pnpm nx build tenant-dashboard
pnpm nx run-many --target=build --all

# LangGraph Studio
cd apps/ai-assistant && langgraph dev
```

---

## Changelog

| Fecha | Cambio |
|-------|--------|
| 2025-01-25 | Documento inicial basado en análisis de código |

