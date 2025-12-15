# Implementar Sistema de Identidad: Frontegg → FusionAuth

## Contexto del Proyecto

Serveflow es una plataforma SaaS multi-tenant para clubes deportivos. Estamos migrando el sistema de autenticación de Frontegg (cloud) a FusionAuth (self-hosted).

### Documentos de Referencia (LEER PRIMERO)

Antes de hacer nada, lee y comprende estos documentos:

1. `docs/v2/PLAN-IMPLEMENTACION-IDENTIDAD.md` - Plan detallado de la migración
2. `docs/v2/02-IDENTIDAD.md` - Arquitectura de autenticación objetivo
3. `docs/v2/01-FUNDACION.md` - Arquitectura base del proyecto (multi-tenant, schemas)

### Documentación Externa

Para consultar APIs y SDKs, usa estos recursos:

- **FusionAuth**: https://fusionauth.io/docs (o busca en web si necesitas ejemplos específicos)
- **FusionAuth TypeScript SDK**: `@fusionauth/typescript-client`
- **JWKS/JWT**: Librería `jwks-rsa` y `jsonwebtoken`

---

## Objetivo

Implementar la migración de Frontegg a FusionAuth siguiendo el plan en `PLAN-IMPLEMENTACION-IDENTIDAD.md`.

**IMPORTANTE**: NO implementar Cerbos ni autorización avanzada. Eso está en el Bloque 3 (03-PERMISOS.md) y se hará después.

---

## Modo de Trabajo

### FASE 1: Planificación (OBLIGATORIA)

Antes de escribir código, DEBES:

1. **Explorar el código existente** usando subagentes:
   - Explora `packages/auth/src/` completo
   - Explora `packages/db/src/schemas/` (user, global-user, tenant)
   - Explora `apps/tenant/dashboard/src/` (middleware, lib, hooks)
   - Explora `apps/tenant/server/src/` (app.module, users)

2. **Crear un plan detallado** con TODAS las tareas:
   - Lista cada archivo a crear/modificar
   - Describe los cambios específicos en cada archivo
   - Identifica dependencias entre tareas
   - Agrupa por fase según el plan de implementación

3. **Presentar el plan** para aprobación antes de continuar

### FASE 2: Implementación (Solo después de aprobación)

Una vez aprobado el plan:

1. Implementa fase por fase, en orden
2. Después de cada fase, verifica que compila (`npm run build`)
3. No avances a la siguiente fase si hay errores
4. Usa el TodoWrite tool para trackear progreso

---

## Reglas de Implementación

### Código

- **NO inventes**: Basa todo en el código existente y los documentos
- **Mantén la estructura**: Sigue los patrones ya establecidos en el repo
- **TypeScript estricto**: Sin `any`, tipos explícitos
- **Imports**: Usa los alias existentes (`@serveflow/auth`, etc.)
- **Nombres**: Renombra `frontegg` → `fusionauth` consistentemente

### Cambios en Schemas

```typescript
// PATRÓN: Renombrar campos
fronteggUserId → fusionauthUserId
fronteggTenantId → fusionauthTenantId
fronteggConfig → (eliminar, FusionAuth es self-hosted)
```

### Cambios en Types

```typescript
// PATRÓN: AuthenticatedUser
interface AuthenticatedUser {
  fusionauthUserId: string;  // antes: fronteggUserId
  email: string;
  firstName?: string;
  lastName?: string;
  tenantId: string;
  roles: string[];
  // permissions ELIMINADO - se manejará en Cerbos
}
```

### Guard

- Mismo patrón que FronteggAuthGuard
- JWKS endpoint: `${FUSIONAUTH_URL}/.well-known/jwks.json`
- Algoritmo: RS256
- Mantener decoradores existentes (@Public, @Roles, etc.)

### Frontend

- Cookie: `fa_access_token` (antes: `fe_access_token`)
- Hook: `useFusionAuth` (antes: `useFronteggAuth`)
- Login API: `POST ${FUSIONAUTH_URL}/api/login`

---

## Orden de Implementación

Sigue este orden estricto:

```
1. packages/auth/src/types.ts
2. packages/auth/src/fusionauth/client.ts (NUEVO)
3. packages/auth/src/fusionauth/users.ts (NUEVO)
4. packages/auth/src/fusionauth/index.ts (NUEVO)
5. packages/auth/src/guards/fusionauth-auth.guard.ts (renombrar)
6. packages/auth/src/index.ts (actualizar exports)
7. packages/auth/src/server.ts (actualizar exports)
8. packages/core/src/types/user.ts
9. packages/core/src/types/tenant.ts
10. packages/db/src/schemas/user.schema.ts
11. packages/db/src/schemas/global-user.schema.ts
12. packages/db/src/schemas/tenant.schema.ts
13. packages/ui/src/hooks/use-fusionauth.ts (NUEVO)
14. apps/tenant/dashboard/src/middleware.ts
15. apps/tenant/dashboard/src/lib/get-current-user.ts
16. apps/tenant/server/src/app/app.module.ts
17. apps/tenant/server/src/users/users.service.ts
18. scripts/migrate-to-fusionauth.ts (NUEVO)
```

---

## Verificación

Después de implementar, verifica:

```bash
# 1. Compila sin errores
npm run build

# 2. Lint pasa
npm run lint

# 3. Types correctos
npm run typecheck
```

---

## Notas Adicionales

- Si encuentras código que no entiendes, usa un subagente para explorarlo
- Si necesitas documentación de FusionAuth, usa WebSearch o WebFetch
- No modifiques archivos fuera del alcance de la migración
- Mantén los archivos de Frontegg hasta que la migración esté completa (por si hay rollback)
- Añade comentarios `// TODO: Remove after migration` donde sea necesario

---

## Comenzar

1. Lee los documentos de referencia
2. Explora el código existente
3. Presenta el plan de tareas
4. Espera aprobación
5. Implementa fase por fase
