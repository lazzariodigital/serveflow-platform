# Prompt: Implementar Sistema de Identidad

Copia y pega este prompt en una nueva sesión de Claude Code.

---

## PROMPT

```
Necesito implementar la migración del sistema de autenticación de Frontegg a FusionAuth en el proyecto Serveflow.

## CONTEXTO

Lee estos documentos antes de hacer nada:
1. docs/v2/PLAN-IMPLEMENTACION-IDENTIDAD.md - Plan detallado de migración
2. docs/v2/02-IDENTIDAD.md - Arquitectura de autenticación
3. docs/v2/01-FUNDACION.md - Arquitectura base (multi-tenant)

## RECURSOS EXTERNOS

Si necesitas documentación:
- FusionAuth SDK: @fusionauth/typescript-client (npm)
- FusionAuth Docs: https://fusionauth.io/docs
- JWKS: librería jwks-rsa

## MODO DE TRABAJO

### FASE 1: PLANIFICACIÓN (obligatoria antes de codear)

1. Usa subagentes para explorar el código actual:
   - packages/auth/src/ (guards, frontegg/, types, decorators)
   - packages/db/src/schemas/ (user, global-user, tenant)
   - packages/core/src/types/ (user, tenant)
   - apps/tenant/dashboard/src/ (middleware, lib/get-current-user, hooks)
   - apps/tenant/server/src/ (app.module, users/)
   - packages/ui/src/hooks/ (use-frontegg-auth)

2. Crea un plan detallado listando:
   - Cada archivo a crear o modificar
   - Los cambios específicos en cada uno
   - El orden de implementación
   - Agrupa por las fases del plan de implementación

3. Preséntame el plan para que lo apruebe ANTES de escribir código

### FASE 2: IMPLEMENTACIÓN (solo después de mi aprobación)

1. Implementa en el orden del plan
2. Después de cada grupo de archivos, verifica que compila: npm run build
3. Usa TodoWrite para trackear el progreso
4. Si hay errores de compilación, arréglalos antes de continuar

## REGLAS

- NO implementar Cerbos ni autorización (eso es Bloque 3, se hará después)
- NO inventar código, basarte en lo existente
- Renombrar consistentemente: frontegg → fusionauth
- Mantener los decoradores existentes (@Public, @Roles, @CurrentUser, etc.)
- TypeScript estricto, sin any
- Mantener la estructura de archivos existente

## CAMBIOS CLAVE

```typescript
// Campos a renombrar
fronteggUserId → fusionauthUserId
fronteggTenantId → fusionauthTenantId
fronteggConfig → eliminar (FusionAuth es self-hosted, URL única)

// Cookies
fe_access_token → fa_access_token

// Guard
FronteggAuthGuard → FusionAuthGuard
JWKS: ${FUSIONAUTH_URL}/.well-known/jwks.json

// Types
interface AuthenticatedUser {
  fusionauthUserId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  tenantId: string;
  roles: string[];
  // permissions eliminado - vendrá de Cerbos
}
```

## ORDEN DE ARCHIVOS

1. packages/auth/src/types.ts
2. packages/auth/src/fusionauth/ (nuevo directorio)
3. packages/auth/src/guards/fusionauth-auth.guard.ts
4. packages/auth/src/index.ts, server.ts
5. packages/core/src/types/
6. packages/db/src/schemas/
7. packages/ui/src/hooks/use-fusionauth.ts
8. apps/tenant/dashboard/src/
9. apps/tenant/server/src/
10. scripts/migrate-to-fusionauth.ts

## COMENZAR

Empieza leyendo los documentos y explorando el código.
Luego preséntame el plan de tareas.
NO escribas código hasta que yo apruebe el plan.
```

---

## Uso

1. Abre una nueva sesión de Claude Code
2. Copia el prompt de arriba
3. Pégalo como primer mensaje
4. Claude explorará, creará plan, esperará aprobación, e implementará

## Alternativa: Slash Command

Si guardaste el archivo `.claude/commands/implementar-identidad.md`, puedes usar:

```
/implementar-identidad
```
