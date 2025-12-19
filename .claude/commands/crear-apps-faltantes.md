# Crear Apps Faltantes: admin/dashboard y tenant/webapp

## Contexto del Proyecto

Serveflow es una plataforma SaaS multi-tenant. Actualmente tenemos:
- `apps/tenant/dashboard` ✅ (Next.js - Panel de gestión del tenant)
- `apps/tenant/server` ✅ (NestJS - API del tenant)
- `apps/admin/server` ✅ (NestJS - API de admin)

Faltan estas apps que están documentadas:
- `apps/admin/dashboard` ❌ (Next.js - Panel de Serveflow)
- `apps/tenant/webapp` ❌ (Next.js - Web pública para socios)

### Documentos de Referencia (LEER PRIMERO)

1. `docs/v2/01-FUNDACION.md` - Arquitectura completa, sección 5.2 (Apps)
2. `docs/v2/02-IDENTIDAD.md` - Secciones 6.2 y 6.3 (Webapp y Admin Dashboard)

---

## Objetivo

Crear las dos apps faltantes con autenticación FusionAuth configurada, usando `apps/tenant/dashboard` como referencia.

---

## Modo de Trabajo

### FASE 1: Planificación (OBLIGATORIA)

1. **Explorar tenant/dashboard** como referencia:
   ```
   apps/tenant/dashboard/
   ├── src/
   │   ├── app/
   │   │   ├── layout.tsx
   │   │   ├── (auth)/
   │   │   │   ├── sign-in/
   │   │   │   └── sign-up/
   │   │   └── (dashboard)/
   │   ├── middleware.ts
   │   ├── lib/
   │   │   ├── get-tenant.ts
   │   │   └── get-current-user.ts
   │   ├── context/
   │   └── hooks/
   ├── project.json
   ├── next.config.js
   └── tsconfig.json
   ```

2. **Crear plan detallado** listando:
   - Archivos a crear para cada app
   - Diferencias con tenant/dashboard
   - Orden de creación

3. **Presentar plan** para aprobación

### FASE 2: Implementación (Tras aprobación)

1. Crear app por app, verificando que compila
2. Usar `npm run build` después de cada app
3. Usar TodoWrite para trackear progreso

---

## Especificaciones por App

### 1. apps/tenant/webapp

**Propósito:** Web pública para clientes/socios del tenant (booking, perfil)

**Diferencias con tenant/dashboard:**
- Puerto: 3001 (dashboard usa 3000)
- URL: `{slug}.serveflow.com/*` (dashboard usa `{slug}.serveflow.com/admin/*`)
- Rutas: Booking, perfil personal, historial (NO gestión)
- Auth: Opcional para ver disponibilidad, requerida para reservar

**Estructura:**
```
apps/tenant/webapp/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Similar a dashboard
│   │   ├── page.tsx                # Landing/Home del tenant
│   │   ├── (auth)/
│   │   │   ├── sign-in/page.tsx
│   │   │   └── sign-up/page.tsx
│   │   ├── (public)/               # NUEVO: Rutas sin auth
│   │   │   ├── booking/page.tsx    # Ver disponibilidad
│   │   │   └── services/page.tsx   # Ver servicios
│   │   └── (protected)/            # Rutas con auth
│   │       ├── my-bookings/page.tsx
│   │       └── profile/page.tsx
│   ├── middleware.ts               # Igual que dashboard
│   ├── lib/
│   │   ├── get-tenant.ts           # Copiar de dashboard
│   │   └── get-current-user.ts     # Copiar de dashboard
│   └── context/
│       └── CurrentUserContext.tsx  # Copiar de dashboard
├── project.json                    # Configurar puerto 3001
├── next.config.js
└── tsconfig.json
```

**project.json:**
```json
{
  "name": "tenant-webapp",
  "$schema": "../../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "apps/tenant/webapp/src",
  "projectType": "application",
  "targets": {
    "dev": {
      "executor": "@nx/next:server",
      "options": {
        "dev": true,
        "port": 3001
      }
    }
  }
}
```

---

### 2. apps/admin/dashboard

**Propósito:** Panel de administración de Serveflow (gestionar tenants, billing, global users)

**Diferencias con tenant/dashboard:**
- Puerto: 3002
- URL: `admin.serveflow.com/*`
- NO multi-tenant: Usa FusionAuth Tenant fijo "Serveflow Admin"
- NO resuelve tenant por subdomain
- Conecta a `db_serveflow_sys` (no `db_tenant_{slug}`)

**Estructura:**
```
apps/admin/dashboard/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # FusionAuth con tenant fijo
│   │   ├── page.tsx                # Redirect a /tenants
│   │   ├── (auth)/
│   │   │   └── sign-in/page.tsx    # Solo sign-in (no signup público)
│   │   └── (dashboard)/
│   │       ├── layout.tsx          # Admin layout
│   │       ├── tenants/
│   │       │   ├── page.tsx        # Lista de tenants
│   │       │   └── [slug]/page.tsx # Detalle tenant
│   │       ├── users/
│   │       │   └── page.tsx        # Global users
│   │       └── billing/
│   │           └── page.tsx        # Facturación
│   ├── middleware.ts               # Auth sin tenant resolution
│   ├── lib/
│   │   └── get-current-user.ts     # Simplificado (sin tenant)
│   └── context/
│       └── CurrentUserContext.tsx
├── project.json                    # Configurar puerto 3002
├── next.config.js
└── tsconfig.json
```

**Diferencias clave en middleware.ts:**
```typescript
// NO resolver tenant por subdomain
// Usar FusionAuth Tenant ID fijo desde env
const ADMIN_FUSIONAUTH_TENANT_ID = process.env.FUSIONAUTH_ADMIN_TENANT_ID;
const ADMIN_FUSIONAUTH_APP_ID = process.env.FUSIONAUTH_ADMIN_APPLICATION_ID;
```

**Diferencias en layout.tsx:**
```typescript
// NO usar TenantProvider
// Usar configuración fija de FusionAuth
const fusionauthTenantId = process.env.FUSIONAUTH_ADMIN_TENANT_ID;
const fusionauthApplicationId = process.env.FUSIONAUTH_ADMIN_APPLICATION_ID;
```

**project.json:**
```json
{
  "name": "admin-dashboard",
  "$schema": "../../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "apps/admin/dashboard/src",
  "projectType": "application",
  "targets": {
    "dev": {
      "executor": "@nx/next:server",
      "options": {
        "dev": true,
        "port": 3002
      }
    }
  }
}
```

---

## Variables de Entorno Nuevas

```bash
# Para admin/dashboard
FUSIONAUTH_ADMIN_TENANT_ID=xxx
FUSIONAUTH_ADMIN_APPLICATION_ID=xxx
```

---

## Orden de Implementación

1. **tenant/webapp** (más similar a dashboard, más fácil)
   - Copiar estructura de tenant/dashboard
   - Ajustar rutas y puerto
   - Añadir rutas públicas

2. **admin/dashboard** (requiere más cambios)
   - Crear estructura base
   - Modificar auth para tenant fijo
   - Crear páginas de gestión (tenants, users, billing)

---

## Reglas

- **Reutilizar código**: Copiar de tenant/dashboard y modificar
- **Compartir componentes**: Usar `packages/ui` para componentes de auth
- **Mismos patrones**: Mantener estructura de carpetas consistente
- **TypeScript estricto**: Sin `any`
- **NO crear contenido**: Solo estructura y auth, las páginas pueden ser placeholders

---

## Verificación

```bash
# Después de cada app
npm run build

# Verificar que levanta
npx nx dev tenant-webapp
npx nx dev admin-dashboard
```

---

## Comenzar

1. Lee las secciones relevantes de 01-FUNDACION.md y 02-IDENTIDAD.md
2. Explora apps/tenant/dashboard como referencia
3. Presenta el plan de archivos a crear
4. Espera aprobación
5. Implementa tenant/webapp primero, luego admin/dashboard
