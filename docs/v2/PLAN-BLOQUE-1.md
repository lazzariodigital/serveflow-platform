# Plan de Implementación - Bloque 1: Fundación

## Resumen

Implementar la infraestructura base del monorepo Serveflow V2, incluyendo:
- Estructura NX con apps y packages organizados por dominio
- Sistema de conexión a MongoDB con aislamiento por tenant
- Resolución de tenant por subdomain
- Tipos e interfaces TypeScript compartidos
- APIs básicas funcionales (tenant/api con NestJS)

**Duración estimada:** 8-10 tareas principales
**Complejidad global:** Media-Alta

---

## Tareas

### 1. Configurar estructura base del monorepo

- **Descripción**: Crear la estructura de carpetas para apps y packages, configurar tsconfig.base.json con path aliases
- **Archivos**:
  - `tsconfig.base.json` (modificar)
  - `apps/admin/.gitkeep`
  - `apps/tenant/.gitkeep`
  - `packages/db/.gitkeep`
  - `packages/auth/.gitkeep`
  - `packages/tenants/.gitkeep`
  - `packages/config/.gitkeep`
  - `packages/core/.gitkeep`
- **Dependencias**: Ninguna
- **Complejidad**: Simple
- **Criterios de aceptación**:
  - [ ] Carpetas apps/admin, apps/tenant creadas
  - [ ] Carpetas packages/* creadas
  - [ ] tsconfig.base.json con paths para @serveflow/*
  - [ ] `pnpm nx show projects` reconoce la estructura

---

### 2. Implementar package @serveflow/config

- **Descripción**: Crear package de configuración con variables de entorno y valores por defecto
- **Archivos**:
  - `packages/config/package.json`
  - `packages/config/tsconfig.json`
  - `packages/config/tsconfig.lib.json`
  - `packages/config/project.json`
  - `packages/config/src/index.ts`
  - `packages/config/src/env.ts`
  - `packages/config/src/defaults.ts`
- **Dependencias**: Tarea 1
- **Complejidad**: Simple
- **Criterios de aceptación**:
  - [ ] Exporta `config` con MONGODB_URI, CLERK_SECRET_KEY, etc.
  - [ ] Exporta DEFAULT_TENANT_SETTINGS, DEFAULT_BRANDING, DEFAULT_THEMING
  - [ ] Exporta DEFAULT_WEEKLY_SCHEDULE
  - [ ] `pnpm nx build config` compila sin errores

---

### 3. Implementar package @serveflow/core

- **Descripción**: Crear tipos TypeScript compartidos, Zod schemas y constantes
- **Archivos**:
  - `packages/core/package.json`
  - `packages/core/tsconfig.json`
  - `packages/core/tsconfig.lib.json`
  - `packages/core/project.json`
  - `packages/core/src/index.ts`
  - `packages/core/src/types/tenant.ts`
  - `packages/core/src/types/organization.ts`
  - `packages/core/src/types/ai-config.ts`
  - `packages/core/src/types/common.ts`
  - `packages/core/src/schemas/tenant.schema.ts`
  - `packages/core/src/schemas/organization.schema.ts`
- **Dependencias**: Tarea 1
- **Complejidad**: Media
- **Criterios de aceptación**:
  - [ ] Exporta interfaces: Tenant, TenantMVP, Organization, OrganizationMVP
  - [ ] Exporta interfaces: TenantBranding, TenantTheming, WeeklySchedule
  - [ ] Exporta interfaces: AIConfig
  - [ ] Exporta Zod schemas para validación
  - [ ] Exporta tipos auxiliares: TenantStatus, TenantPlan, ThemePreset
  - [ ] `pnpm nx build core` compila sin errores

---

### 4. Implementar package @serveflow/db

- **Descripción**: Crear conexión MongoDB con singleton, helpers para tenant DB y sistema DB, y funciones de índices
- **Archivos**:
  - `packages/db/package.json`
  - `packages/db/tsconfig.json`
  - `packages/db/tsconfig.lib.json`
  - `packages/db/project.json`
  - `packages/db/src/index.ts`
  - `packages/db/src/client.ts`
  - `packages/db/src/indexes.ts`
- **Dependencias**: Tareas 1, 2
- **Complejidad**: Media
- **Criterios de aceptación**:
  - [ ] Exporta `getMongoClient()` - singleton con connection pooling
  - [ ] Exporta `getSystemDb()` - retorna db_serveflow_sys
  - [ ] Exporta `getTenantDb(dbName)` - retorna db_tenant_{slug}
  - [ ] Exporta `createSystemIndexes(db)` y `createTenantIndexes(db)`
  - [ ] Valida que dbName empiece con "db_tenant_"
  - [ ] `pnpm nx build db` compila sin errores

---

### 5. Implementar package @serveflow/tenants

- **Descripción**: Crear sistema de resolución de tenant por subdomain, middleware para NestJS y contexto para React
- **Archivos**:
  - `packages/tenants/package.json`
  - `packages/tenants/tsconfig.json`
  - `packages/tenants/tsconfig.lib.json`
  - `packages/tenants/project.json`
  - `packages/tenants/src/index.ts`
  - `packages/tenants/src/resolver.ts`
  - `packages/tenants/src/middleware/tenant.middleware.ts`
  - `packages/tenants/src/decorators/tenant.decorator.ts`
  - `packages/tenants/src/context/TenantContext.tsx`
  - `packages/tenants/src/hooks/useTenant.ts`
- **Dependencias**: Tareas 1, 2, 3, 4
- **Complejidad**: Alta
- **Criterios de aceptación**:
  - [ ] `extractTenantSlug(host)` extrae slug de subdomain
  - [ ] `TenantMiddleware` (NestJS) resuelve tenant e inyecta en request
  - [ ] `@TenantContext()` decorator para controllers
  - [ ] `TenantProvider` y `useTenant()` para React
  - [ ] Soporte para desarrollo local (.localhost)
  - [ ] Soporte para query param fallback en development
  - [ ] `pnpm nx build tenants` compila sin errores

---

### 6. Implementar package @serveflow/auth

- **Descripción**: Crear integración con Clerk para autenticación
- **Archivos**:
  - `packages/auth/package.json`
  - `packages/auth/tsconfig.json`
  - `packages/auth/tsconfig.lib.json`
  - `packages/auth/project.json`
  - `packages/auth/src/index.ts`
  - `packages/auth/src/guards/clerk-auth.guard.ts`
  - `packages/auth/src/decorators/auth.decorator.ts`
- **Dependencias**: Tareas 1, 2
- **Complejidad**: Media
- **Criterios de aceptación**:
  - [ ] `ClerkAuthGuard` para NestJS (valida JWT)
  - [ ] `@RequireAuth()` decorator para marcar rutas protegidas
  - [ ] `@SkipAuth()` decorator para rutas públicas
  - [ ] Extrae userId y orgId del token
  - [ ] `pnpm nx build auth` compila sin errores

---

### 7. Crear app tenant/api (NestJS)

- **Descripción**: Crear API backend central del tenant con NestJS, integrando TenantMiddleware
- **Archivos**:
  - `apps/tenant/api/project.json`
  - `apps/tenant/api/tsconfig.json`
  - `apps/tenant/api/tsconfig.app.json`
  - `apps/tenant/api/webpack.config.js`
  - `apps/tenant/api/src/main.ts`
  - `apps/tenant/api/src/app/app.module.ts`
  - `apps/tenant/api/src/app/app.controller.ts`
  - `apps/tenant/api/src/app/app.service.ts`
  - `apps/tenant/api/src/health/health.controller.ts`
  - `apps/tenant/api/src/organizations/organizations.module.ts`
  - `apps/tenant/api/src/organizations/organizations.controller.ts`
  - `apps/tenant/api/src/organizations/organizations.service.ts`
- **Dependencias**: Tareas 1-6
- **Complejidad**: Alta
- **Criterios de aceptación**:
  - [ ] NestJS app funcional en localhost:3001
  - [ ] TenantMiddleware aplicado globalmente
  - [ ] GET /health responde sin tenant (SkipTenant)
  - [ ] GET /api/organizations retorna organizaciones del tenant
  - [ ] Tenant se resuelve por subdomain o header X-Tenant-Slug
  - [ ] `pnpm nx serve tenant-api` inicia sin errores
  - [ ] `pnpm nx build tenant-api` compila sin errores

---

### 8. Crear app tenant/dashboard (Next.js básico)

- **Descripción**: Crear dashboard de gestión básico con Next.js, integrando resolución de tenant
- **Archivos**:
  - `apps/tenant/dashboard/project.json`
  - `apps/tenant/dashboard/tsconfig.json`
  - `apps/tenant/dashboard/next.config.js`
  - `apps/tenant/dashboard/next-env.d.ts`
  - `apps/tenant/dashboard/src/app/layout.tsx`
  - `apps/tenant/dashboard/src/app/page.tsx`
  - `apps/tenant/dashboard/src/app/api/tenant/route.ts`
  - `apps/tenant/dashboard/src/middleware.ts`
  - `apps/tenant/dashboard/public/.gitkeep`
- **Dependencias**: Tareas 1-6
- **Complejidad**: Media
- **Criterios de aceptación**:
  - [ ] Next.js app funcional en localhost:3000
  - [ ] Middleware resuelve tenant por subdomain
  - [ ] Página muestra nombre del tenant
  - [ ] API route /api/tenant retorna datos del tenant
  - [ ] `pnpm nx dev tenant-dashboard` inicia sin errores
  - [ ] `pnpm nx build tenant-dashboard` compila sin errores

---

### 9. Crear script de provisioning de tenant

- **Descripción**: Crear script para provisionar nuevos tenants (crear registro en sys, crear DB, crear índices, crear org default)
- **Archivos**:
  - `packages/tenants/src/provisioning/provision-tenant.ts`
  - `packages/tenants/src/provisioning/types.ts`
  - `scripts/create-tenant.ts`
- **Dependencias**: Tareas 1-4
- **Complejidad**: Media
- **Criterios de aceptación**:
  - [ ] `provisionTenant(input)` crea tenant completo
  - [ ] Valida slug único
  - [ ] Crea registro en db_serveflow_sys.tenants
  - [ ] Crea database db_tenant_{slug}
  - [ ] Crea índices en la nueva DB
  - [ ] Crea organización por defecto
  - [ ] Script ejecutable: `pnpm tsx scripts/create-tenant.ts`

---

### 10. Crear tenant de prueba y verificar sistema completo

- **Descripción**: Crear un tenant de prueba "demo" y verificar que todo el sistema funciona end-to-end
- **Archivos**:
  - `scripts/seed-demo-tenant.ts`
- **Dependencias**: Tareas 1-9
- **Complejidad**: Simple
- **Criterios de aceptación**:
  - [ ] Tenant "demo" creado en MongoDB
  - [ ] demo.localhost:3000 muestra dashboard
  - [ ] demo.localhost:3001/api/organizations retorna datos
  - [ ] Todos los proyectos compilan: `pnpm nx run-many -t build`
  - [ ] Linting pasa: `pnpm nx run-many -t lint`

---

## Orden de Ejecución

```
1. Configurar estructura base del monorepo
   │
   ├──► 2. @serveflow/config
   │         │
   │         ├──► 3. @serveflow/core
   │         │         │
   │         │         └──► 4. @serveflow/db ──┐
   │         │                                  │
   │         └──► 6. @serveflow/auth ──────────┤
   │                                            │
   └──────────────────────────────────────────►│
                                                │
                                    5. @serveflow/tenants
                                                │
                              ┌─────────────────┴─────────────────┐
                              │                                   │
                    7. tenant/api                      8. tenant/dashboard
                              │                                   │
                              └─────────────────┬─────────────────┘
                                                │
                                    9. Script provisioning
                                                │
                                    10. Verificación final
```

### Tareas Paralelizables

- **Tareas 2 y 3** pueden ejecutarse en paralelo (ambas solo dependen de 1)
- **Tareas 7 y 8** pueden ejecutarse en paralelo (ambas dependen de 1-6)

---

## Riesgos y Consideraciones

### Riesgos Identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| MongoDB no disponible localmente | Media | Alto | Usar MongoDB Atlas free tier o Docker |
| Conflictos con Clerk en desarrollo | Baja | Medio | Configurar Clerk dev keys correctamente |
| Subdominios en Windows | Media | Medio | Usar archivo hosts + instrucciones claras |

### Consideraciones Técnicas

1. **MongoDB**: Necesitamos una instancia de MongoDB disponible. Opciones:
   - MongoDB Atlas (free tier)
   - Docker local: `docker run -d -p 27017:27017 mongo:7`
   - MongoDB Community instalado

2. **Variables de Entorno**: Crear `.env` con:
   ```
   MONGODB_URI=mongodb://localhost:27017
   CLERK_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   NODE_ENV=development
   ```

3. **Desarrollo Local con Subdominios**: Agregar a hosts:
   ```
   127.0.0.1   demo.localhost
   127.0.0.1   club-padel-madrid.localhost
   ```

4. **Dependencias a Instalar**:
   - `mongodb` (driver)
   - `@clerk/nextjs`, `@clerk/backend` (auth)
   - Verificar que NestJS y Next.js ya están en package.json ✓

---

## Definición de Completado (DoD)

El Bloque 1 está **completo** cuando:

- [ ] Estructura NX creada con todas las apps y packages
- [ ] tsconfig.base.json con paths configurados
- [ ] Package @serveflow/db funcional con getTenantDb() y getSystemDb()
- [ ] Package @serveflow/tenants con TenantMiddleware y TenantContext
- [ ] Package @serveflow/config con defaults y env vars
- [ ] Package @serveflow/core con tipos e interfaces base
- [ ] tenant/api básico (NestJS) respondiendo en localhost:3001
- [ ] tenant/dashboard básico (Next.js) con tenant resolution
- [ ] Modelo de tenant en MongoDB definido
- [ ] Todos los proyectos compilan sin errores
- [ ] Linting pasa en todos los proyectos
- [ ] Un tenant de prueba "demo" funciona end-to-end

---

## Notas Adicionales

- **NO implementar** en este bloque: UI components (@serveflow/ui), admin/api, admin/dashboard, tenant/webapp, MCP server, AI assistant
- **NO implementar** features de Fase 2/3 del modelo de datos (billing, limits, features)
- **Mantener** el código lo más simple posible - solo lo necesario para el MVP
- **Seguir exactamente** las interfaces TypeScript del documento 01-FUNDACION.md
