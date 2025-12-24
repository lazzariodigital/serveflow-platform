# Bloque 4: Dominio de Negocio

**Estado:** Pendiente
**Dependencias:** Bloque 3 (Permisos)

---

## Índice

1. [Sistema de Vistas (UI)](#1-sistema-de-vistas-ui)
2. [Recursos de Negocio](#2-recursos-de-negocio)
3. [Modelo: Service](#3-modelo-service)
4. [Modelo: Resource](#4-modelo-resource)
5. [Modelo: Event](#5-modelo-event)
6. [Validación y Conflictos](#6-validación-y-conflictos)

---

## 1. Sistema de Vistas (UI)

> **Nota:** El modelo base `AppRoute` se define en `03-PERMISOS.md` (sección 9.4.1).
> Esta sección extiende ese modelo con el sistema completo de vistas.

### 1.1 Concepto de Vista

Una **Vista** es una configuración de UI que combina:
- **Recurso**: Qué entidad muestra (events, users, bookings)
- **Views**: Cómo se puede visualizar (calendar, list, crm, kanban)
- **Filtros**: Filtros predefinidos (solo mis reservas, solo clases)
- **Roles**: Quién puede ver esta vista

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CONCEPTO DE VISTA                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   EJEMPLO: Tenant "Gimnasio FitMax" quiere estas vistas en su Dashboard:   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────┐       │
│   │  Vista: "Eventos"                                                │       │
│   │  ─────────────────                                               │       │
│   │  resource: events                                                │       │
│   │  views: [calendar, list]                                         │       │
│   │  roles: [admin, employee]                                        │       │
│   │  filters: {}  (todos los eventos)                                │       │
│   └─────────────────────────────────────────────────────────────────┘       │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────┐       │
│   │  Vista: "Clases Grupales"                                        │       │
│   │  ─────────────────────────                                       │       │
│   │  resource: events                     ← Mismo recurso            │       │
│   │  views: [calendar, list]                                         │       │
│   │  roles: [admin, employee, provider]   ← Más roles               │       │
│   │  filters: { serviceType: "class" }    ← Filtro predefinido       │       │
│   └─────────────────────────────────────────────────────────────────┘       │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────┐       │
│   │  Vista: "Clientes"                                               │       │
│   │  ─────────────────                                               │       │
│   │  resource: users                                                 │       │
│   │  views: [crm, list]                   ← Vista CRM disponible    │       │
│   │  roles: [admin]                                                  │       │
│   │  filters: { roles: ["client"] }       ← Solo clientes           │       │
│   └─────────────────────────────────────────────────────────────────┘       │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────┐       │
│   │  Vista: "Mi Equipo"                                              │       │
│   │  ──────────────────                                              │       │
│   │  resource: users                                                 │       │
│   │  views: [list]                                                   │       │
│   │  roles: [admin]                                                  │       │
│   │  filters: { roles: ["employee", "provider"] }                    │       │
│   └─────────────────────────────────────────────────────────────────┘       │
│                                                                              │
│   Dos vistas pueden usar el MISMO recurso con diferentes filtros            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Modelo Completo: ViewConfig

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// ViewConfig: Extensión completa de AppRoute para el sistema de vistas
// Implementar cuando se desarrolle el Bloque 4
// ═══════════════════════════════════════════════════════════════════════════

// Tipos de vista por app
type DashboardViewType = 'list' | 'calendar' | 'kanban' | 'crm' | 'grid' | 'form' | 'timeline';
type WebAppViewType = 'cards' | 'list' | 'calendar' | 'profile' | 'detail' | 'booking-form';
type ViewType = DashboardViewType | WebAppViewType;

// Filtros especiales resueltos en runtime
type SpecialFilter = 'ME' | 'MY_ORGS' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH';

// ═══════════════════════════════════════════════════════════════════════════
// ViewConfig: Modelo completo de Vista
// ═══════════════════════════════════════════════════════════════════════════

interface ViewConfig {
  // ─────────────────────────────────────────────────────────────────────────
  // Identificación (heredado de AppRoute)
  // ─────────────────────────────────────────────────────────────────────────
  id: string;                      // "classes", "clients", "my-bookings"
  path: string;                    // "/classes", "/clients"
  label: string;                   // "Clases Grupales"
  icon?: string;                   // "dumbbell"
  allowedRoles: string[];          // ["admin", "employee", "provider"]
  isEnabled: boolean;
  order: number;

  // ─────────────────────────────────────────────────────────────────────────
  // Recurso asociado (OBLIGATORIO en Bloque 4)
  // ─────────────────────────────────────────────────────────────────────────
  resource: ResourceId;            // Usa ResourceId de @serveflow/core

  // ─────────────────────────────────────────────────────────────────────────
  // Configuración de visualización
  // ─────────────────────────────────────────────────────────────────────────
  availableViews: ViewType[];      // ["calendar", "list", "kanban"]
  defaultView: ViewType;           // "calendar"

  // ─────────────────────────────────────────────────────────────────────────
  // Filtros predefinidos
  // ─────────────────────────────────────────────────────────────────────────
  defaultFilters?: {
    [field: string]: unknown | SpecialFilter;
  };
  // Ejemplos:
  // { serviceType: "class" }           → Solo eventos de tipo clase
  // { roles: ["client"] }              → Solo usuarios con rol client
  // { userId: "ME" }                   → Solo mis recursos
  // { organizationId: "MY_ORGS" }      → Solo de mis organizaciones
  // { date: "TODAY" }                  → Solo de hoy

  // ─────────────────────────────────────────────────────────────────────────
  // Configuración de campos visibles
  // ─────────────────────────────────────────────────────────────────────────
  visibleFields?: string[];        // ["name", "email", "phone", "createdAt"]
  sortableFields?: string[];       // ["name", "createdAt"]
  searchableFields?: string[];     // ["name", "email"]
  defaultSort?: {
    field: string;
    direction: 'asc' | 'desc';
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Acciones disponibles
  // ─────────────────────────────────────────────────────────────────────────
  actions?: {
    create?: boolean;              // Mostrar botón "Crear"
    export?: boolean;              // Mostrar botón "Exportar"
    import?: boolean;              // Mostrar botón "Importar"
    bulkActions?: string[];        // ["delete", "archive", "assign"]
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Sub-vistas (para navegación anidada)
  // ─────────────────────────────────────────────────────────────────────────
  children?: ViewConfig[];
}

// ResourceId viene de @serveflow/core (ver sección 9.5 de 03-PERMISOS.md)
// Recursos disponibles: event, service, resource, user, organization, role, settings
import type { ResourceId } from '@serveflow/core';
```

### 1.3 Ejemplos de Vistas por Caso de Uso

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// EJEMPLO: Gimnasio con múltiples vistas sobre el mismo recurso
// ═══════════════════════════════════════════════════════════════════════════

const gimnasioViews: ViewConfig[] = [
  // Vista general de eventos (admin ve todo)
  {
    id: 'events',
    path: '/events',
    label: 'Todos los Eventos',
    icon: 'calendar',
    allowedRoles: ['admin'],
    isEnabled: true,
    order: 1,
    resource: 'event',
    availableViews: ['calendar', 'list', 'timeline'],
    defaultView: 'calendar',
  },

  // Vista de clases grupales (empleados y providers)
  {
    id: 'classes',
    path: '/classes',
    label: 'Clases Grupales',
    icon: 'users',
    allowedRoles: ['admin', 'employee', 'provider'],
    isEnabled: true,
    order: 2,
    resource: 'event',
    availableViews: ['calendar', 'list'],
    defaultView: 'calendar',
    defaultFilters: {
      serviceType: 'class',
    },
  },

  // Vista de mis clases (solo provider, sus asignadas)
  {
    id: 'my-classes',
    path: '/my-classes',
    label: 'Mis Clases',
    icon: 'dumbbell',
    allowedRoles: ['provider'],
    isEnabled: true,
    order: 3,
    resource: 'event',
    availableViews: ['calendar', 'list'],
    defaultView: 'calendar',
    defaultFilters: {
      serviceType: 'class',
      instructorId: 'ME',  // Filtro especial
    },
  },

  // Vista de reservas de pista
  {
    id: 'court-bookings',
    path: '/court-bookings',
    label: 'Reservas de Pista',
    icon: 'layout-grid',
    allowedRoles: ['admin', 'employee'],
    isEnabled: true,
    order: 4,
    resource: 'event',
    availableViews: ['calendar', 'list'],
    defaultView: 'calendar',
    defaultFilters: {
      serviceType: 'court-rental',
    },
  },

  // Vista CRM de clientes
  {
    id: 'clients',
    path: '/clients',
    label: 'Clientes',
    icon: 'users',
    allowedRoles: ['admin'],
    isEnabled: true,
    order: 5,
    resource: 'user',
    availableViews: ['crm', 'list'],
    defaultView: 'crm',
    defaultFilters: {
      roles: ['client'],
    },
    visibleFields: ['name', 'email', 'phone', 'membershipStatus', 'lastVisit'],
    actions: {
      create: true,
      export: true,
    },
  },

  // Vista de equipo (empleados y providers)
  {
    id: 'team',
    path: '/team',
    label: 'Mi Equipo',
    icon: 'users-cog',
    allowedRoles: ['admin'],
    isEnabled: true,
    order: 6,
    resource: 'user',
    availableViews: ['list', 'grid'],
    defaultView: 'list',
    defaultFilters: {
      roles: ['employee', 'provider'],
    },
  },
];
```

### 1.4 Cómo se Resuelven los Filtros Especiales

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// Resolución de filtros especiales en runtime
// ═══════════════════════════════════════════════════════════════════════════

function resolveFilters(
  defaultFilters: Record<string, unknown>,
  ctx: AuthContext
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};

  for (const [field, value] of Object.entries(defaultFilters)) {
    if (value === 'ME') {
      resolved[field] = ctx.userId;
    } else if (value === 'MY_ORGS') {
      // Array vacío significa todas las orgs
      resolved[field] = ctx.organizationIds.length > 0
        ? { $in: ctx.organizationIds }
        : undefined;  // No filtrar
    } else if (value === 'TODAY') {
      resolved[field] = {
        $gte: startOfDay(new Date()),
        $lt: endOfDay(new Date()),
      };
    } else if (value === 'THIS_WEEK') {
      resolved[field] = {
        $gte: startOfWeek(new Date()),
        $lt: endOfWeek(new Date()),
      };
    } else {
      resolved[field] = value;
    }
  }

  return resolved;
}

// Uso en el backend
async function listEvents(view: ViewConfig, ctx: AuthContext) {
  const filters = resolveFilters(view.defaultFilters || {}, ctx);

  // Además, Cerbos valida que el usuario puede leer estos eventos
  const events = await EventModel.find(filters);

  return events;
}
```

### 1.5 Almacenamiento por Tenant

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// Collection: db_tenant_{slug}.app_configs
// Un documento por app (dashboard, webapp)
// ═══════════════════════════════════════════════════════════════════════════

interface TenantAppConfig {
  _id: ObjectId;
  app: 'dashboard' | 'webapp';

  // Vistas configuradas (extienden o reemplazan defaults)
  views: ViewConfig[];

  // Rutas públicas (solo webapp)
  publicRoutes?: string[];

  // Configuración de home
  homeConfig?: {
    widgets: Record<string, WidgetConfig[]>;  // Por rol
  };

  // Override de tema
  theme?: ThemeConfig;

  updatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// Merge de configuración: Defaults + Tenant Config
// ═══════════════════════════════════════════════════════════════════════════

function getAppViews(
  app: AppType,
  tenantConfig?: TenantAppConfig
): ViewConfig[] {
  const defaults = app === 'dashboard'
    ? DEFAULT_DASHBOARD_VIEWS
    : DEFAULT_WEBAPP_VIEWS;

  if (!tenantConfig?.views) {
    return defaults;
  }

  // Tenant puede:
  // 1. Añadir vistas nuevas
  // 2. Modificar vistas existentes (por id)
  // 3. Deshabilitar vistas (isEnabled: false)

  const merged = [...defaults];

  for (const tenantView of tenantConfig.views) {
    const existingIndex = merged.findIndex(v => v.id === tenantView.id);

    if (existingIndex >= 0) {
      // Override de vista existente
      merged[existingIndex] = { ...merged[existingIndex], ...tenantView };
    } else {
      // Nueva vista del tenant
      merged.push(tenantView);
    }
  }

  return merged.filter(v => v.isEnabled).sort((a, b) => a.order - b.order);
}
```

### 1.6 UI para Configurar Vistas (Admin del Tenant)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CONFIGURACIÓN > VISTAS DEL DASHBOARD                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Personaliza las vistas que aparecen en el menú de tu Dashboard.           │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  ≡  Eventos               calendar  │  ☑ Activa  │  [Editar]       │   │
│   │      Roles: admin, employee                                         │   │
│   ├─────────────────────────────────────────────────────────────────────┤   │
│   │  ≡  Clases Grupales       calendar  │  ☑ Activa  │  [Editar]       │   │
│   │      Roles: admin, employee, provider                               │   │
│   │      Filtro: serviceType = class                                    │   │
│   ├─────────────────────────────────────────────────────────────────────┤   │
│   │  ≡  Clientes              crm       │  ☑ Activa  │  [Editar]       │   │
│   │      Roles: admin                                                   │   │
│   │      Filtro: roles = client                                         │   │
│   ├─────────────────────────────────────────────────────────────────────┤   │
│   │  ≡  Mi Equipo             list      │  ☐ Inactiva│  [Editar]       │   │
│   │      Roles: admin                                                   │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   [+ Añadir Vista]                                                          │
│                                                                              │
│   ─────────────────────────────────────────────────────────────────────     │
│                                                                              │
│   Al hacer clic en [Editar]:                                                │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  Editar Vista: Clases Grupales                                      │   │
│   │                                                                      │   │
│   │  Nombre: [Clases Grupales        ]                                  │   │
│   │  Icono:  [users ▼]                                                  │   │
│   │  Recurso: [events ▼]  (no editable si viene de template)           │   │
│   │                                                                      │   │
│   │  Vistas disponibles:                                                │   │
│   │  ☑ Calendario   ☑ Lista   ☐ Kanban   ☐ Timeline                    │   │
│   │  Vista por defecto: [Calendario ▼]                                  │   │
│   │                                                                      │   │
│   │  Roles que pueden acceder:                                          │   │
│   │  ☑ Admin   ☑ Empleado   ☑ Proveedor   ☐ Cliente                    │   │
│   │                                                                      │   │
│   │  Filtros predefinidos:                                              │   │
│   │  ┌──────────────────────────────────────────────────────────────┐   │   │
│   │  │  Campo: [serviceType ▼]  Valor: [class         ]            │   │   │
│   │  │  [+ Añadir filtro]                                           │   │   │
│   │  └──────────────────────────────────────────────────────────────┘   │   │
│   │                                                                      │   │
│   │  [Cancelar]                                      [Guardar Cambios]  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Recursos de Negocio

> Las siguientes secciones definen las entidades del dominio de negocio.

### Filosofía Core

```
ORGANIZATION → SERVICE → RESOURCE → EVENT
```

**Todo es un Evento:** Reserva de pista, clase grupal, cita médica, partido... todos son Events con diferentes configuraciones definidas por su Service.

---

## 3. Modelo: Service

> Por definir

---

## 4. Modelo: Resource

> Por definir

---

## 5. Modelo: Event

> Por definir

---

## 6. Validación y Conflictos

> Por definir

---

## Decisiones Pendientes

- [ ] ¿Event con participants embebidos o referenciados?
- [ ] ¿Recurrencia: RRULE o instancias explícitas?
- [ ] ¿Histórico de cambios en Event?
- [ ] ¿Cómo manejar disponibilidad de Resources?
- [ ] ¿Integración con calendarios externos (Google, Outlook)?
