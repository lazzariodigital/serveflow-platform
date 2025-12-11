# Serveflow - Arquitectura V2

**Estado:** En desarrollo
**Última actualización:** 2025-12-02
**Branch:** feature/architecture-v2

---

## Metodología de Trabajo

Trabajamos por **bloques lógicos** porque las decisiones están acopladas:

```
┌─────────────────────────────────────────────────────────────────┐
│  BLOQUE 1: FUNDACIÓN                                            │
│  ├── Multi-tenancy (patrón Database per Tenant)                 │
│  └── Modelo: Tenant + Organization                              │
│                           ↓                                     │
├─────────────────────────────────────────────────────────────────┤
│  BLOQUE 2: IDENTIDAD (Autenticación)                            │
│  ├── Auth (Clerk) + Webhooks                                    │
│  └── Modelo: User + GlobalUser                                  │
│                           ↓                                     │
├─────────────────────────────────────────────────────────────────┤
│  BLOQUE 3: PERMISOS                                             │
│  ├── RBAC (Roles + Policies)                                    │
│  └── Modelo: Role + actualizar User                             │
│                           ↓                                     │
├─────────────────────────────────────────────────────────────────┤
│  BLOQUE 4: DOMINIO DE NEGOCIO                                   │
│  ├── Servicios y Recursos                                       │
│  └── Modelo: Service + Resource + Event                         │
│                           ↓                                     │
├─────────────────────────────────────────────────────────────────┤
│  BLOQUE 5: PAGOS                                                │
│  ├── Integración Stripe                                         │
│  └── Modelo: Order + Subscription + Voucher                     │
└─────────────────────────────────────────────────────────────────┘
```

**En cada bloque:**
1. Definimos modelo de datos
2. Actualizamos el pilar correspondiente
3. Borramos lo que ya no aplica

---

## Progreso

| Bloque | Pilar | Modelo | Estado |
|--------|-------|--------|--------|
| 0 | Análisis V1 | [00-MODELO-DATOS-ACTUAL.md](./00-MODELO-DATOS-ACTUAL.md) | ✅ Completado |
| 1 | Multi-tenancy | Tenant, Organization | ✅ Completado |
| 2 | Autenticación | User, GlobalUser | 📋 Planificado → [PLAN](./PLAN-BLOQUE-2.md) |
| 3 | RBAC | Role, Policy | ⏳ Pendiente |
| 4 | Negocio | Service, Resource, Event | ⏳ Pendiente |
| 5 | Pagos | Order, Subscription, Voucher | ⏳ Pendiente |

---

## Documentos

### Por Bloque

| Bloque | Documento | Plan | Contenido |
|--------|-----------|------|-----------|
| 1 | [01-FUNDACION.md](./01-FUNDACION.md) | [PLAN](./PLAN-BLOQUE-1.md) | Multi-tenancy + Tenant + Organization |
| 2 | [02-IDENTIDAD.md](./02-IDENTIDAD.md) | [PLAN](./PLAN-BLOQUE-2.md) | Auth + User + GlobalUser |
| 3 | [03-PERMISOS.md](./03-PERMISOS.md) | - | RBAC + Roles + Policies |
| 4 | [04-NEGOCIO.md](./04-NEGOCIO.md) | - | Service + Resource + Event |
| 5 | [05-PAGOS.md](./05-PAGOS.md) | - | Order + Subscription + Voucher |

### Referencia

| Documento | Contenido |
|-----------|-----------|
| [00-MODELO-DATOS-ACTUAL.md](./00-MODELO-DATOS-ACTUAL.md) | Análisis modelo V1 (Firestore) |
| [06-STACK.md](./06-STACK.md) | Stack tecnológico |
| [07-MIGRACION.md](./07-MIGRACION.md) | Plan de migración |

---

## Principios de Diseño

| Principio | Descripción |
|-----------|-------------|
| **Agnóstico** | Nada hardcodeado. Todo configurable. |
| **Flexible** | Adaptable a diferentes casos de uso sin cambiar código |
| **Escalable** | Preparado para 500+ tenants |
| **Compliant** | GDPR, datos financieros, aislamiento total |
| **Simple** | Menos código = menos bugs = más mantenible |

---

## Filosofía Core

```
TENANT → ORGANIZATION → SERVICE → RESOURCE → EVENT
```

**Todo es un Evento.** Una reserva de pista, una clase grupal, un partido... son todos Events con diferentes configuraciones definidas por el Service.

---

## Decisiones Tomadas

| Aspecto | Decisión | Justificación |
|---------|----------|---------------|
| **Base de datos** | MongoDB Atlas | Familiaridad + schema flexible |
| **Patrón multi-tenant** | Database per Tenant | Escalabilidad + aislamiento total |
| **Autenticación** | Clerk | Organizations nativo para multi-tenant |
| **Backend** | Node.js + NestJS | Estructura + familiaridad |
| **Frontend** | Next.js 15 | Ya implementado |

---

## Documentos Legacy (V1)

> Estos documentos son de referencia. El contenido relevante se está migrando a los documentos por bloque.

- [ARQUITECTURA_REAL.md](../ARQUITECTURA_REAL.md) - Análisis del estado actual
- [Serveflow_KB.md](../Serveflow_KB.md) - Knowledge Base original
- [PROPUESTA_ARQUITECTURA_V2.md](../PROPUESTA_ARQUITECTURA_V2.md) - Propuesta inicial completa
