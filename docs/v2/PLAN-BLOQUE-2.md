# Plan de Implementación - Bloque 2: Identidad (Autenticación)

## Resumen

Implementar el sistema de autenticación completo con Clerk, incluyendo:
- Custom UI de login (reutilizando componentes de tenant-dashboard)
- Integración Clerk con hooks (useSignIn, useUser) - NO componentes de Clerk
- Flujo directo: API crea en Clerk + MongoDB en el mismo request
- Webhooks solo para flujos externos (OAuth signup, cambios en Clerk Dashboard)
- Modelo User en MongoDB (RBAC-ready, sin tipo hardcodeado)
- CRUD de usuarios desde dashboards (sin registro público)
- Auth en las 5 apps (tenant/dashboard, tenant/api, tenant/webapp, admin/dashboard, admin/api)

**Duración estimada:** 12-14 tareas principales
**Complejidad global:** Alta

---

## Decisiones de Arquitectura

### Mapeo Clerk ↔ Serveflow

```
┌─────────────────────────────────────────────────────────────────┐
│  CLERK                           │  SERVEFLOW                   │
├─────────────────────────────────────────────────────────────────┤
│  Clerk Organization              │  Tenant                      │
│  Clerk User                      │  User (en db_tenant_{slug})  │
│  Clerk Org Membership            │  User.organizationIds[]      │
│  Clerk Org Roles (org:admin)     │  → Bloque 3 (RBAC)           │
└─────────────────────────────────────────────────────────────────┘
```

**Decisión:** 1 Clerk Organization = 1 Tenant. Las "sedes" (Organization en nuestro modelo) se manejan solo en MongoDB.

### Flujo de Datos

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  FLUJO PRINCIPAL (sin webhook)                                               │
│                                                                              │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐               │
│  │  Dashboard   │ ──── │  tenant/api  │ ──── │    Clerk     │               │
│  │  (crear user)│      │  Backend SDK │      │   Backend    │               │
│  └──────────────┘      └──────────────┘      └──────────────┘               │
│                              │                      │                        │
│                              │                      │                        │
│                              ▼                      │                        │
│                        ┌──────────────┐             │                        │
│                        │   MongoDB    │ ◄───────────┘                        │
│                        │  db_tenant_  │    (API crea en ambos)               │
│                        └──────────────┘                                      │
│                                                                              │
│  ✓ Un solo request: API → Clerk.createUser() → MongoDB.insertUser()         │
│  ✓ Respuesta inmediata, sin esperar webhook                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Webhooks (solo para flujos externos)

| Escenario | ¿Webhook? | Acción |
|-----------|-----------|--------|
| Admin crea usuario desde Dashboard | ❌ No | API crea en Clerk + MongoDB directamente |
| Usuario hace OAuth signup (Google) | ✅ Sí | Webhook `user.created` → crear en MongoDB |
| Usuario cambia email en Clerk | ✅ Sí | Webhook `user.updated` → actualizar MongoDB |
| Admin de Clerk elimina user | ✅ Sí | Webhook `user.deleted` → archivar en MongoDB |

---

## Modelo de Datos

### User (db_tenant_{slug}.users)

```typescript
interface User {
  _id: ObjectId;

  // ════════════════════════════════════════════════════════════════
  // IDENTIDAD - Vínculos externos
  // ════════════════════════════════════════════════════════════════

  clerkId: string;                    // ID en Clerk (único)
  unifiedId?: string;                 // ID de @serveflow/identity (para WhatsApp, etc.)

  // ════════════════════════════════════════════════════════════════
  // DATOS BÁSICOS - Sincronizados desde Clerk
  // ════════════════════════════════════════════════════════════════

  email: string;
  firstName: string;
  lastName: string;
  imageUrl?: string;

  // ════════════════════════════════════════════════════════════════
  // DATOS ADICIONALES - Solo en MongoDB (Clerk no los tiene)
  // ════════════════════════════════════════════════════════════════

  phoneNumber?: string;               // Para WhatsApp/SMS
  idNumber?: string;                  // DNI/Pasaporte
  idType?: 'dni' | 'passport' | 'nie' | 'other';
  birthDate?: Date;

  // ════════════════════════════════════════════════════════════════
  // MULTI-ORGANIZACIÓN (sedes dentro del tenant)
  // ════════════════════════════════════════════════════════════════

  organizationIds: string[];          // ObjectIds de organizations a las que pertenece
  primaryOrganizationId?: string;     // Sede por defecto

  // ════════════════════════════════════════════════════════════════
  // ESTADO
  // ════════════════════════════════════════════════════════════════

  status: 'active' | 'inactive' | 'suspended' | 'pending' | 'archived';
  isVerified: boolean;                // Email verificado en Clerk

  // ════════════════════════════════════════════════════════════════
  // PREFERENCIAS
  // ════════════════════════════════════════════════════════════════

  preferences: {
    language: string;                 // 'es', 'en', etc.
    timezone: string;                 // 'Europe/Madrid'
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
      whatsapp: boolean;
    };
  };

  // ════════════════════════════════════════════════════════════════
  // LEGAL
  // ════════════════════════════════════════════════════════════════

  legal: {
    acceptedTerms: boolean;
    acceptedPrivacy: boolean;
    acceptedMarketing: boolean;
    consentDate?: Date;
  };

  // ════════════════════════════════════════════════════════════════
  // PROVIDER PROFILE (opcional - solo para proveedores de servicios)
  // ════════════════════════════════════════════════════════════════

  providerProfile?: {
    bio?: string;
    specializations: string[];
    certifications?: string[];
    schedule?: WeeklySchedule;        // Disponibilidad
  };

  // ════════════════════════════════════════════════════════════════
  // METADATA
  // ════════════════════════════════════════════════════════════════

  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;                 // clerkId del admin que lo creó
}
```

### GlobalUser (db_serveflow_sys.global_users)

```typescript
interface GlobalUser {
  _id: ObjectId;

  // Identidad
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  imageUrl?: string;

  // Estado
  status: 'active' | 'inactive' | 'suspended';

  // Acceso a tenants (para soporte/partners)
  accessibleTenants?: {
    tenantId: string;
    tenantSlug: string;
    grantedAt: Date;
    grantedBy: string;
  }[];

  // Metadata
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// NOTA: El "tipo" (admin, soporte, partner) vendrá del ROL en Bloque 3
// No hardcodeamos tipos aquí - mantenemos el modelo flexible
```

### Índices

```typescript
// db_tenant_{slug}.users
{ clerkId: 1 }                        // unique
{ unifiedId: 1 }                      // sparse, para identity resolution
{ email: 1 }                          // unique
{ phoneNumber: 1 }                    // sparse
{ organizationIds: 1 }                // para queries por sede
{ status: 1 }
{ 'providerProfile.specializations': 1 }  // para buscar proveedores

// db_serveflow_sys.global_users
{ clerkId: 1 }                        // unique
{ email: 1 }                          // unique
{ type: 1 }
{ 'accessibleTenants.tenantId': 1 }
```

---

## Patrones de Implementación por App

### Next.js Apps (Dashboard, Webapp, Admin Dashboard)

#### Estructura de Archivos

```
apps/tenant/dashboard/
├── src/
│   ├── app/
│   │   ├── layout.tsx              ← ClerkProvider aquí
│   │   ├── (auth)/                 ← Rutas públicas de auth
│   │   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   │   └── layout.tsx
│   │   └── (dashboard)/            ← Rutas protegidas
│   │       ├── layout.tsx          ← Verificar auth aquí
│   │       ├── page.tsx
│   │       └── users/
│   ├── middleware.ts               ← clerkMiddleware + tenant resolution
│   ├── lib/
│   │   └── auth.ts                 ← Helpers de auth
│   └── hooks/
│       └── use-current-user.ts     ← Hook para obtener usuario
```

#### middleware.ts (Clerk + Tenant)

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  // 1. Rutas públicas: permitir sin auth
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // 2. Resolver tenant por subdomain
  const host = req.headers.get('host') || '';
  const tenantSlug = extractTenantSlug(host);

  if (!tenantSlug) {
    return NextResponse.redirect(new URL('/error/no-tenant', req.url));
  }

  // 3. Verificar autenticación
  const { userId, orgId } = await auth();

  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  // 4. Inyectar tenant en headers para uso en server components
  const response = NextResponse.next();
  response.headers.set('x-tenant-slug', tenantSlug);
  response.headers.set('x-clerk-user-id', userId);
  if (orgId) {
    response.headers.set('x-clerk-org-id', orgId);
  }

  return response;
});

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
};
```

#### layout.tsx (Root)

```typescript
import { ClerkProvider } from '@clerk/nextjs';
import { esES } from '@clerk/localizations';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider localization={esES}>
      <html lang="es">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

#### Server Components - Obtener Usuario

```typescript
// app/(dashboard)/page.tsx
import { auth, currentUser } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { getTenantDb } from '@serveflow/db';
import { getUserByClerkId } from '@serveflow/db';

export default async function DashboardPage() {
  // Datos de Clerk
  const { userId, orgId } = await auth();
  const clerkUser = await currentUser();

  // Datos del tenant
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug');

  // Datos de MongoDB
  const db = await getTenantDb(`db_tenant_${tenantSlug}`);
  const user = await getUserByClerkId(db, userId!);

  return (
    <div>
      <h1>Bienvenido, {user.firstName}</h1>
      <p>Tenant: {tenantSlug}</p>
    </div>
  );
}
```

#### Client Components - Hook useCurrentUser

```typescript
// hooks/use-current-user.ts
'use client';

import { useUser, useOrganization } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import type { User } from '@serveflow/core';

export function useCurrentUser() {
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const { organization } = useOrganization();
  const [mongoUser, setMongoUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isClerkLoaded || !clerkUser) {
      setIsLoading(false);
      return;
    }

    // Fetch user data from our API
    fetch('/api/users/me')
      .then(res => res.json())
      .then(data => {
        setMongoUser(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [clerkUser, isClerkLoaded]);

  return {
    clerkUser,
    user: mongoUser,
    organization,
    isLoading: !isClerkLoaded || isLoading,
    isAuthenticated: !!clerkUser,
  };
}
```

#### Server Actions - CRUD Usuarios (Flujo Directo)

```typescript
// actions/users.ts
'use server';

import { auth } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { createClerkClient } from '@serveflow/auth';
import { getTenantDb, createUser } from '@serveflow/db';
import { revalidatePath } from 'next/cache';
import type { CreateUserInput } from '@serveflow/core';

export async function createUserAction(input: CreateUserInput) {
  const { userId } = await auth();
  if (!userId) throw new Error('Not authenticated');

  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug')!;

  // 1. Crear en Clerk
  const clerk = createClerkClient();
  const clerkUser = await clerk.users.createUser({
    emailAddress: [input.email],
    firstName: input.firstName,
    lastName: input.lastName,
  });

  // 2. Añadir a organización de Clerk
  const tenant = await getTenantBySlug(tenantSlug);
  await clerk.organizations.createOrganizationMembership({
    organizationId: tenant.clerkOrgId,
    userId: clerkUser.id,
    role: 'org:member',
  });

  // 3. Crear en MongoDB (FLUJO DIRECTO - no esperamos webhook)
  const db = await getTenantDb(`db_tenant_${tenantSlug}`);
  const mongoUser = await createUser(db, {
    clerkId: clerkUser.id,
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    status: 'active',
    isVerified: false,
    organizationIds: [],
    createdBy: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  revalidatePath('/users');
  return { success: true, user: mongoUser };
}
```

---

### NestJS APIs (tenant/api, admin/api)

#### Estructura de Archivos

```
apps/tenant/api/
├── src/
│   ├── main.ts
│   ├── app/
│   │   └── app.module.ts           ← Módulos globales
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.guard.ts           ← ClerkAuthGuard
│   │   ├── auth.decorator.ts       ← @Public(), @CurrentUser()
│   │   └── auth.service.ts
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   └── users.service.ts
│   └── webhooks/
│       ├── webhooks.module.ts
│       └── clerk.controller.ts     ← Webhook handler
```

#### ClerkAuthGuard

```typescript
// auth/auth.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { IS_PUBLIC_KEY } from './auth.decorator';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return false;
    }

    const token = authHeader.substring(7);

    try {
      // Verify JWT with Clerk
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!,
      });

      // Attach user info to request
      request.auth = {
        userId: payload.sub,
        sessionId: payload.sid,
        orgId: payload.org_id,
        orgRole: payload.org_role,
      };

      // Optionally fetch full user
      request.clerkUser = await this.clerk.users.getUser(payload.sub);

      return true;
    } catch {
      return false;
    }
  }
}
```

#### Decoradores

```typescript
// auth/auth.decorator.ts
import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.clerkUser;
  },
);

export const Auth = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.auth;
  },
);
```

#### AppModule - Configuración Global

```typescript
// app/app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ClerkAuthGuard } from '../auth/auth.guard';
import { TenantMiddleware } from '@serveflow/tenants';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [AuthModule, UsersModule, WebhooksModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ClerkAuthGuard,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .forRoutes('*');
  }
}
```

#### Users Controller

```typescript
// users/users.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { Public, CurrentUser, Auth } from '../auth/auth.decorator';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, ListUsersDto } from './users.dto';
import { TenantContext } from '@serveflow/tenants';
import type { User as ClerkUser } from '@clerk/backend';

@Controller('api/users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  async getCurrentUser(
    @CurrentUser() clerkUser: ClerkUser,
    @TenantContext() tenant: TenantContext,
  ) {
    return this.usersService.getByClerkId(tenant.dbName, clerkUser.id);
  }

  @Get()
  async listUsers(
    @Query() query: ListUsersDto,
    @TenantContext() tenant: TenantContext,
  ) {
    return this.usersService.list(tenant.dbName, query);
  }

  @Get(':id')
  async getUser(
    @Param('id') id: string,
    @TenantContext() tenant: TenantContext,
  ) {
    return this.usersService.getById(tenant.dbName, id);
  }

  @Post()
  async createUser(
    @Body() dto: CreateUserDto,
    @TenantContext() tenant: TenantContext,
    @Auth() auth: { userId: string },
  ) {
    return this.usersService.create(tenant, dto, auth.userId);
  }

  @Patch(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @TenantContext() tenant: TenantContext,
  ) {
    return this.usersService.update(tenant.dbName, id, dto);
  }

  @Delete(':id')
  async deleteUser(
    @Param('id') id: string,
    @TenantContext() tenant: TenantContext,
  ) {
    return this.usersService.delete(tenant, id);
  }
}
```

#### Webhook Controller (Clerk → MongoDB)

```typescript
// webhooks/clerk.controller.ts
import { Controller, Post, Req, Res, Headers } from '@nestjs/common';
import { Public } from '../auth/auth.decorator';
import { Webhook } from 'svix';
import { handleClerkWebhook } from '@serveflow/webhooks';
import type { Request, Response } from 'express';

@Controller('webhooks')
export class ClerkController {
  @Public()
  @Post('clerk')
  async handleWebhook(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
  ) {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET!;

    // Verify webhook signature
    const wh = new Webhook(webhookSecret);
    let evt: WebhookEvent;

    try {
      evt = wh.verify(JSON.stringify(req.body), {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as WebhookEvent;
    } catch (err) {
      console.error('Webhook verification failed:', err);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Handle the event
    try {
      await handleClerkWebhook(evt);
      return res.status(200).json({ received: true });
    } catch (err) {
      console.error('Webhook handling failed:', err);
      return res.status(500).json({ error: 'Handler failed' });
    }
  }
}
```

---

### Flujo Completo: Crear Usuario (Flujo Directo)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  1. ADMIN EN DASHBOARD                                                    │
│     └── Rellena formulario de nuevo usuario                              │
│         └── Llama a Server Action o API endpoint                         │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  2. API (tenant/api o Server Action)                                      │
│     └── Verifica auth                                                    │
│     └── Obtiene tenantSlug de headers                                    │
│     └── EN EL MISMO REQUEST:                                             │
│         ├── 1. clerk.users.createUser() → obtiene clerkId                │
│         ├── 2. clerk.organizations.createMembership()                    │
│         └── 3. db.users.insertOne({ clerkId, email, ... })               │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  3. RESULTADO INMEDIATO                                                   │
│     └── Usuario existe en Clerk (auth)                                   │
│     └── Usuario existe en MongoDB (datos de negocio)                     │
│     └── Respuesta al admin con User creado                               │
│     └── Usuario puede hacer login inmediatamente                         │
└──────────────────────────────────────────────────────────────────────────┘

NOTA: No esperamos webhook - nosotros controlamos el flujo.
Los webhooks solo se usan para flujos externos (OAuth signup, etc.)
```

---

### Flujo Completo: Login de Usuario

```
┌──────────────────────────────────────────────────────────────────────────┐
│  1. USUARIO ACCEDE A demo.serveflow.app                                   │
│     └── Middleware detecta que no hay sesión                             │
│     └── Redirige a /sign-in                                              │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  2. PÁGINA SIGN-IN (Custom UI)                                            │
│     └── ClerkSignInView (componente custom basado en tenant-dashboard)   │
│     └── Usa hooks: useSignIn() de @clerk/nextjs                          │
│     └── UI: FormHead, Form, Field de @serveflow/auth-ui                  │
│     └── Usuario introduce email + password (o OAuth)                     │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  3. CLERK                                                                 │
│     └── Valida credenciales                                              │
│     └── Genera JWT con claims:                                           │
│         {                                                                │
│           sub: "user_xxx",                                               │
│           org_id: "org_yyy",    // Clerk Org = Tenant                    │
│           org_role: "org:admin"                                          │
│         }                                                                │
│     └── Establece cookie de sesión                                       │
│     └── Redirige a afterSignInUrl (/dashboard)                           │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  4. MIDDLEWARE                                                            │
│     └── clerkMiddleware() valida sesión                                  │
│     └── Extrae tenantSlug de subdomain                                   │
│     └── Verifica que org_id del JWT corresponde al tenant                │
│     └── Añade headers x-tenant-slug, x-clerk-user-id                     │
│     └── Permite acceso                                                   │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  5. DASHBOARD PAGE                                                        │
│     └── Server Component obtiene auth() y headers                        │
│     └── Conecta a db_tenant_{slug}                                       │
│     └── Obtiene User por clerkId                                         │
│     └── Renderiza dashboard con datos del usuario                        │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### Adaptación de Plantilla Legacy (backup/apps/tenant-dashboard)

La plantilla actual en `backup/apps/tenant-dashboard` tiene una arquitectura sólida que reutilizaremos. Los cambios principales son:

#### Estructura de Providers (Root Layout)

```typescript
// ANTES (Firebase)
<AuthProvider>                           // ← Firebase Auth
  <TenantProvider>
    <AuthorizationProvider>              // ← Sistema de permisos custom
      <LocalizationProvider>
        <ConfigurationProvider>
          <SettingsProvider>
            <ThemeProvider>
              {children}
            </ThemeProvider>
          </SettingsProvider>
        </ConfigurationProvider>
      </LocalizationProvider>
    </AuthorizationProvider>
  </TenantProvider>
</AuthProvider>

// DESPUÉS (Clerk)
<ClerkProvider localization={esES}>       // ← Clerk Auth (envuelve todo)
  <TenantProvider>                        // ← Reutilizar, adaptar a nueva API
    <LocalizationProvider>
      <ConfigurationProvider>
        <SettingsProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </SettingsProvider>
      </ConfigurationProvider>
    </LocalizationProvider>
  </TenantProvider>
</ClerkProvider>

// Nota: AuthorizationProvider se mueve al Bloque 3
```

#### Cambios en Guards

```typescript
// ANTES
import { AuthGuard, RoleBasedGuard } from 'src/auth/guard';

// Dashboard layout
<AuthGuard>
  <RoleBasedGuard appId="dashboard">
    <DashboardLayout>{children}</DashboardLayout>
  </RoleBasedGuard>
</AuthGuard>

// DESPUÉS (Bloque 2 - Solo autenticación)
// No usar RoleBasedGuard todavía - eso es Bloque 3

// Opción A: Usar SignedIn de Clerk directamente
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';

<SignedIn>
  <DashboardLayout>{children}</DashboardLayout>
</SignedIn>
<SignedOut>
  <RedirectToSignIn />
</SignedOut>

// Opción B: Crear ClerkAuthGuard compatible
import { ClerkAuthGuard } from 'src/auth/guard';

<ClerkAuthGuard>
  <DashboardLayout>{children}</DashboardLayout>
</ClerkAuthGuard>
```

#### Archivos a Migrar del Backup

| Carpeta | Acción | Notas |
|---------|--------|-------|
| `src/auth/context/firebase/` | Eliminar | Reemplazado por Clerk |
| `src/auth/context/authorization-context.tsx` | Mover a Bloque 3 | RBAC |
| `src/auth/guard/auth-guard.tsx` | Adaptar | Usar hooks de Clerk |
| `src/auth/guard/guest-guard.tsx` | Adaptar | Usar hooks de Clerk |
| `src/auth/guard/role-based-guard.tsx` | Mover a Bloque 3 | RBAC |
| `src/auth/hooks/use-auth-context.ts` | Reescribir | Wrappear useUser de Clerk |
| `src/auth/hooks/use-permissions.ts` | Mover a Bloque 3 | RBAC |
| `src/auth/view/firebase/` | Adaptar | Cambiar a clerk/ con hooks de Clerk |
| `src/contexts/tenant-context.tsx` | Adaptar | Integrar con @serveflow/tenants |
| `src/layouts/dashboard/` | Reutilizar | Solo cambiar UserButton |
| `src/components/` | Reutilizar | La mayoría sin cambios |

#### Hook useAuthContext Adaptado

```typescript
// src/auth/hooks/use-auth-context.ts
'use client';

import { useUser, useAuth, useOrganization } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import type { User } from '@serveflow/core';

interface AuthContextValue {
  // Clerk data
  clerkUser: ReturnType<typeof useUser>['user'];
  isLoaded: boolean;
  isSignedIn: boolean;

  // MongoDB user data
  user: User | null;
  isLoadingUser: boolean;

  // Organization
  organization: ReturnType<typeof useOrganization>['organization'];

  // Helpers
  getToken: () => Promise<string | null>;
}

export function useAuthContext(): AuthContextValue {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const { organization } = useOrganization();
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setUser(null);
      setIsLoadingUser(false);
      return;
    }

    // Fetch MongoDB user
    fetch('/api/users/me')
      .then(res => res.json())
      .then(data => {
        setUser(data);
        setIsLoadingUser(false);
      })
      .catch(() => {
        setUser(null);
        setIsLoadingUser(false);
      });
  }, [isLoaded, isSignedIn, clerkUser?.id]);

  return {
    clerkUser,
    isLoaded,
    isSignedIn: isSignedIn ?? false,
    user,
    isLoadingUser,
    organization,
    getToken,
  };
}
```

#### Dashboard Header - UserButton

```typescript
// ANTES (custom avatar menu)
<AccountPopover />

// DESPUÉS (Clerk UserButton)
import { UserButton } from '@clerk/nextjs';

<UserButton
  appearance={{
    elements: {
      avatarBox: 'w-10 h-10',
    },
  }}
  afterSignOutUrl="/sign-in"
/>
```

#### Estructura Final de Apps

```
apps/
├── tenant/
│   ├── dashboard/              ← Para admins del tenant
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx  ← ClerkProvider + TenantProvider
│   │   │   │   ├── (auth)/     ← Sign-in con Clerk
│   │   │   │   └── (dashboard)/
│   │   │   │       ├── layout.tsx  ← ClerkAuthGuard + DashboardLayout
│   │   │   │       ├── users/
│   │   │   │       ├── bookings/
│   │   │   │       └── ...
│   │   │   ├── auth/           ← Guards y hooks adaptados
│   │   │   ├── layouts/        ← Reutilizar de backup
│   │   │   └── components/     ← Reutilizar de backup
│   │   └── middleware.ts       ← Clerk + Tenant resolution
│   │
│   └── webapp/                 ← Para clientes finales
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx  ← ClerkProvider (más simple)
│       │   │   ├── (public)/   ← Home, servicios, etc.
│       │   │   ├── (auth)/     ← Sign-in/up
│       │   │   └── (protected)/
│       │   │       ├── bookings/
│       │   │       └── profile/
│       │   └── components/     ← Subset del dashboard
│       └── middleware.ts
│
└── admin/
    └── dashboard/              ← Para admins de Serveflow
        ├── src/
        │   ├── app/
        │   │   ├── layout.tsx  ← ClerkProvider (sin TenantProvider)
        │   │   ├── (auth)/
        │   │   └── (dashboard)/
        │   │       ├── tenants/
        │   │       └── global-users/
        │   └── ...
        └── middleware.ts       ← Validar que es GlobalUser
```

---

### Consideraciones de Seguridad

| Aspecto | Implementación |
|---------|----------------|
| **JWT Validation** | Siempre verificar con `verifyToken()` de Clerk |
| **Tenant Isolation** | Validar que `org_id` del JWT = `clerkOrgId` del tenant |
| **Webhook Security** | Verificar firma Svix antes de procesar |
| **CORS** | Configurar origins permitidos por tenant |
| **Rate Limiting** | Implementar en APIs (por IP y por usuario) |
| **Headers sensibles** | No exponer `x-tenant-slug` en responses al cliente |

---

## Tareas

### 1. Actualizar @serveflow/core con tipos de User

- **Descripción**: Añadir interfaces TypeScript para User y GlobalUser
- **Archivos**:
  - `packages/core/src/types/user.ts` (nuevo)
  - `packages/core/src/types/global-user.ts` (actualizar si existe)
  - `packages/core/src/types/index.ts` (actualizar exports)
  - `packages/core/src/schemas/user.schema.ts` (nuevo - Zod)
- **Dependencias**: Bloque 1 completado
- **Complejidad**: Media
- **Criterios de aceptación**:
  - [ ] Interface `User` con todos los campos definidos arriba
  - [ ] Interface `GlobalUser` definida
  - [ ] Interface `CreateUserInput`, `UpdateUserInput` DTOs
  - [ ] Zod schemas para validación
  - [ ] `pnpm nx build core` compila sin errores

---

### 2. Actualizar @serveflow/auth con Clerk SDK completo

- **Descripción**: Expandir el package auth con integración completa de Clerk Backend SDK
- **Archivos**:
  - `packages/auth/src/clerk/client.ts` (nuevo)
  - `packages/auth/src/clerk/users.ts` (nuevo - CRUD usuarios)
  - `packages/auth/src/clerk/organizations.ts` (nuevo)
  - `packages/auth/src/guards/clerk-auth.guard.ts` (actualizar)
  - `packages/auth/src/middleware/clerk.middleware.ts` (nuevo - Next.js)
  - `packages/auth/src/types.ts` (actualizar)
  - `packages/auth/src/index.ts` (actualizar exports)
  - `packages/auth/package.json` (añadir @clerk/backend, @clerk/nextjs)
- **Dependencias**: Tarea 1
- **Complejidad**: Alta
- **Criterios de aceptación**:
  - [ ] `createClerkClient()` singleton configurado
  - [ ] `createUser(input)` crea usuario en Clerk
  - [ ] `updateUser(clerkId, input)` actualiza usuario
  - [ ] `deleteUser(clerkId)` elimina usuario
  - [ ] `inviteToOrganization(orgId, email, role)` invita usuario
  - [ ] Guards actualizados para NestJS
  - [ ] Middleware para Next.js App Router
  - [ ] `pnpm nx build auth` compila sin errores

---

### 3. Crear @serveflow/webhooks para Clerk (solo flujos externos)

- **Descripción**: Package para manejar webhooks de Clerk - SOLO para flujos externos que no pasan por nuestra API (OAuth signup, cambios desde Clerk Dashboard)
- **Archivos**:
  - `packages/webhooks/package.json`
  - `packages/webhooks/tsconfig.json`
  - `packages/webhooks/project.json`
  - `packages/webhooks/src/index.ts`
  - `packages/webhooks/src/clerk/handler.ts`
  - `packages/webhooks/src/clerk/events.ts`
  - `packages/webhooks/src/clerk/sync-user.ts`
  - `packages/webhooks/src/clerk/verify.ts`
- **Dependencias**: Tareas 1, 2
- **Complejidad**: Media
- **Criterios de aceptación**:
  - [ ] `verifyClerkWebhook(req)` valida firma del webhook
  - [ ] Handler para `user.created` → crear User SOLO si no existe (OAuth signup)
  - [ ] Handler para `user.updated` → actualizar email, nombre, avatar
  - [ ] Handler para `user.deleted` → archivar User
  - [ ] Verificación de idempotencia (no duplicar si ya creamos el user)
  - [ ] Logging de eventos para debugging
  - [ ] `pnpm nx build webhooks` compila sin errores

**NOTA:** El flujo principal (admin crea usuario) NO usa webhooks.
Los webhooks son backup para flujos que no controlamos.

---

### 4. Actualizar @serveflow/db con operaciones de User

- **Descripción**: Añadir funciones de base de datos para User
- **Archivos**:
  - `packages/db/src/collections/users.ts` (nuevo)
  - `packages/db/src/indexes.ts` (actualizar con índices de User)
  - `packages/db/src/index.ts` (actualizar exports)
- **Dependencias**: Tarea 1
- **Complejidad**: Media
- **Criterios de aceptación**:
  - [ ] `getUserByClerkId(db, clerkId)`
  - [ ] `getUserByEmail(db, email)`
  - [ ] `getUserByUnifiedId(db, unifiedId)`
  - [ ] `createUser(db, user)`
  - [ ] `updateUser(db, clerkId, updates)`
  - [ ] `listUsers(db, filters, pagination)`
  - [ ] Índices de User creados automáticamente
  - [ ] `pnpm nx build db` compila sin errores

---

### 5. Implementar auth en tenant/api (NestJS)

- **Descripción**: Integrar autenticación Clerk en la API del tenant
- **Archivos**:
  - `apps/tenant/api/src/auth/auth.module.ts`
  - `apps/tenant/api/src/auth/auth.guard.ts`
  - `apps/tenant/api/src/auth/auth.decorator.ts`
  - `apps/tenant/api/src/auth/current-user.decorator.ts`
  - `apps/tenant/api/src/users/users.module.ts`
  - `apps/tenant/api/src/users/users.controller.ts`
  - `apps/tenant/api/src/users/users.service.ts`
  - `apps/tenant/api/src/webhooks/webhooks.module.ts`
  - `apps/tenant/api/src/webhooks/clerk.controller.ts`
  - `apps/tenant/api/src/app/app.module.ts` (actualizar)
- **Dependencias**: Tareas 1-4
- **Complejidad**: Alta
- **Criterios de aceptación**:
  - [ ] `ClerkAuthGuard` aplicado globalmente
  - [ ] `@Public()` decorator para rutas sin auth
  - [ ] `@CurrentUser()` decorator inyecta user en controller
  - [ ] `POST /webhooks/clerk` endpoint para webhooks
  - [ ] `GET /api/users` lista usuarios (paginado)
  - [ ] `GET /api/users/:id` obtiene usuario
  - [ ] `POST /api/users` crea usuario (llama a Clerk)
  - [ ] `PATCH /api/users/:id` actualiza usuario
  - [ ] `DELETE /api/users/:id` elimina usuario
  - [ ] `GET /api/users/me` obtiene usuario actual
  - [ ] Todos los endpoints protegidos por auth
  - [ ] `pnpm nx serve tenant-api` funciona con auth

---

### 6. Implementar auth en tenant/dashboard (Next.js + Custom UI)

- **Descripción**: Integrar Clerk en el dashboard del tenant con Custom UI (reutilizando componentes de backup/tenant-dashboard)
- **Archivos**:
  - `apps/tenant/dashboard/src/app/layout.tsx` (actualizar con ClerkProvider)
  - `apps/tenant/dashboard/src/app/(auth)/sign-in/page.tsx` (Custom UI)
  - `apps/tenant/dashboard/src/app/(auth)/sign-up/page.tsx` (Custom UI)
  - `apps/tenant/dashboard/src/app/(auth)/sso-callback/page.tsx` (OAuth redirect)
  - `apps/tenant/dashboard/src/app/(auth)/layout.tsx` (AuthLayout del backup)
  - `apps/tenant/dashboard/src/app/(dashboard)/layout.tsx`
  - `apps/tenant/dashboard/src/middleware.ts` (actualizar con clerkMiddleware)
  - `apps/tenant/dashboard/src/auth/views/clerk-sign-in-view.tsx` (adaptar de firebase)
  - `apps/tenant/dashboard/src/auth/views/clerk-sign-up-view.tsx` (adaptar de firebase)
  - `apps/tenant/dashboard/src/auth/components/` (del backup, sin cambios)
  - `apps/tenant/dashboard/src/hooks/use-current-user.ts`
  - `apps/tenant/dashboard/package.json` (añadir @clerk/nextjs)
- **Dependencias**: Tareas 1-5
- **Complejidad**: Alta
- **Criterios de aceptación**:
  - [ ] ClerkProvider configurado en layout root
  - [ ] Middleware protege rutas /dashboard/*
  - [ ] Página de sign-in con Custom UI (ClerkSignInView)
  - [ ] Página de sign-up con Custom UI (ClerkSignUpView)
  - [ ] OAuth callback funcional (/sso-callback)
  - [ ] FormHead, FormDivider, Form, Field reutilizados del backup
  - [ ] AuthLayout del backup funcionando
  - [ ] UserButton en header del dashboard
  - [ ] Hook `useCurrentUser()` retorna datos del usuario
  - [ ] Rutas públicas accesibles sin auth
  - [ ] Redirección a sign-in si no autenticado
  - [ ] `pnpm nx dev tenant-dashboard` funciona con auth

---

### 7. Crear tenant/webapp (Next.js - App pública)

- **Descripción**: Crear la webapp pública para clientes finales del tenant
- **Archivos**:
  - `apps/tenant/webapp/project.json`
  - `apps/tenant/webapp/tsconfig.json`
  - `apps/tenant/webapp/next.config.js`
  - `apps/tenant/webapp/src/app/layout.tsx`
  - `apps/tenant/webapp/src/app/page.tsx`
  - `apps/tenant/webapp/src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`
  - `apps/tenant/webapp/src/app/(public)/layout.tsx`
  - `apps/tenant/webapp/src/app/(protected)/layout.tsx`
  - `apps/tenant/webapp/src/app/(protected)/bookings/page.tsx`
  - `apps/tenant/webapp/src/app/(protected)/profile/page.tsx`
  - `apps/tenant/webapp/src/middleware.ts`
  - `apps/tenant/webapp/public/.gitkeep`
- **Dependencias**: Tareas 1-5
- **Complejidad**: Alta
- **Criterios de aceptación**:
  - [ ] Next.js app funcional en localhost:3002
  - [ ] Tenant resolution por subdomain (como dashboard)
  - [ ] Clerk auth integrado con Custom UI
  - [ ] Páginas públicas (home, servicios)
  - [ ] Páginas protegidas (mis reservas, perfil)
  - [ ] Sign-in/sign-up funcional
  - [ ] `pnpm nx dev tenant-webapp` inicia sin errores
  - [ ] `pnpm nx build tenant-webapp` compila sin errores

---

### 8. Crear admin/api (NestJS)

- **Descripción**: Crear API para administración de Serveflow (gestión de tenants)
- **Archivos**:
  - `apps/admin/api/project.json`
  - `apps/admin/api/tsconfig.json`
  - `apps/admin/api/webpack.config.js`
  - `apps/admin/api/src/main.ts`
  - `apps/admin/api/src/app/app.module.ts`
  - `apps/admin/api/src/auth/auth.module.ts`
  - `apps/admin/api/src/auth/auth.guard.ts`
  - `apps/admin/api/src/tenants/tenants.module.ts`
  - `apps/admin/api/src/tenants/tenants.controller.ts`
  - `apps/admin/api/src/tenants/tenants.service.ts`
  - `apps/admin/api/src/global-users/global-users.module.ts`
  - `apps/admin/api/src/global-users/global-users.controller.ts`
  - `apps/admin/api/src/health/health.controller.ts`
- **Dependencias**: Tareas 1-4
- **Complejidad**: Alta
- **Criterios de aceptación**:
  - [ ] NestJS app funcional en localhost:4001
  - [ ] Auth con Clerk (solo GlobalUsers activos)
  - [ ] `GET /api/tenants` lista todos los tenants
  - [ ] `GET /api/tenants/:slug` obtiene un tenant
  - [ ] `POST /api/tenants` crea nuevo tenant
  - [ ] `PATCH /api/tenants/:slug` actualiza tenant
  - [ ] `GET /api/global-users` lista usuarios globales
  - [ ] `POST /api/global-users` crea usuario global
  - [ ] `pnpm nx serve admin-api` inicia sin errores

---

### 9. Crear admin/dashboard (Next.js)

- **Descripción**: Dashboard para administradores de Serveflow
- **Archivos**:
  - `apps/admin/dashboard/project.json`
  - `apps/admin/dashboard/tsconfig.json`
  - `apps/admin/dashboard/next.config.js`
  - `apps/admin/dashboard/src/app/layout.tsx`
  - `apps/admin/dashboard/src/app/page.tsx`
  - `apps/admin/dashboard/src/app/(auth)/sign-in/page.tsx` (Custom UI)
  - `apps/admin/dashboard/src/app/(dashboard)/layout.tsx`
  - `apps/admin/dashboard/src/app/(dashboard)/tenants/page.tsx`
  - `apps/admin/dashboard/src/app/(dashboard)/tenants/[slug]/page.tsx`
  - `apps/admin/dashboard/src/app/(dashboard)/global-users/page.tsx`
  - `apps/admin/dashboard/src/middleware.ts`
- **Dependencias**: Tarea 8
- **Complejidad**: Alta
- **Criterios de aceptación**:
  - [ ] Next.js app funcional en localhost:4000
  - [ ] Auth con Clerk (validar que sea admin de Serveflow)
  - [ ] Lista de tenants con búsqueda
  - [ ] Detalle de tenant con métricas básicas
  - [ ] Crear nuevo tenant desde UI
  - [ ] Lista de usuarios globales
  - [ ] `pnpm nx dev admin-dashboard` inicia sin errores

---

### 10. CRUD de usuarios en tenant/dashboard

- **Descripción**: Implementar UI completa para gestión de usuarios en el dashboard
- **Archivos**:
  - `apps/tenant/dashboard/src/app/(dashboard)/users/page.tsx`
  - `apps/tenant/dashboard/src/app/(dashboard)/users/[id]/page.tsx`
  - `apps/tenant/dashboard/src/app/(dashboard)/users/new/page.tsx`
  - `apps/tenant/dashboard/src/components/users/user-list.tsx`
  - `apps/tenant/dashboard/src/components/users/user-form.tsx`
  - `apps/tenant/dashboard/src/components/users/user-detail.tsx`
  - `apps/tenant/dashboard/src/actions/users.ts` (Server Actions)
  - `apps/tenant/dashboard/src/hooks/use-users.ts`
- **Dependencias**: Tareas 5, 6
- **Complejidad**: Media
- **Criterios de aceptación**:
  - [ ] Lista de usuarios con paginación y búsqueda
  - [ ] Filtros por estado, organización
  - [ ] Crear nuevo usuario (llama a API → Clerk)
  - [ ] Editar usuario existente
  - [ ] Ver detalle de usuario
  - [ ] Cambiar estado de usuario (activar/suspender)
  - [ ] Asignar usuario a organizaciones (sedes)
  - [ ] UI responsive y accesible

---

### 11. Configurar Clerk webhooks en producción

- **Descripción**: Documentar y configurar webhooks de Clerk (solo para flujos externos)
- **Archivos**:
  - `docs/v2/CLERK-SETUP.md` (nuevo)
  - `.env.example` (actualizar)
  - `apps/tenant/api/src/webhooks/clerk.controller.ts` (asegurar seguridad)
- **Dependencias**: Tareas 3, 5
- **Complejidad**: Simple
- **Criterios de aceptación**:
  - [ ] Documentación de cómo configurar webhooks en Clerk Dashboard
  - [ ] Variables de entorno documentadas (CLERK_WEBHOOK_SECRET)
  - [ ] Verificación de firma implementada
  - [ ] Logs de webhooks para debugging
  - [ ] Retry handling documentado

---

### 12. Actualizar provisioning de tenant con Clerk

- **Descripción**: Actualizar script de provisioning para crear Clerk Organization
- **Archivos**:
  - `packages/tenants/src/provisioning/provision-tenant.ts` (actualizar)
  - `packages/tenants/src/provisioning/clerk-org.ts` (nuevo)
  - `scripts/create-tenant.ts` (actualizar)
- **Dependencias**: Tarea 2
- **Complejidad**: Media
- **Criterios de aceptación**:
  - [ ] `provisionTenant()` crea Clerk Organization
  - [ ] Guarda `clerkOrgId` en tenant document
  - [ ] Crea admin user inicial en Clerk
  - [ ] Invita admin a la organización
  - [ ] Rollback si falla cualquier paso
  - [ ] Script actualizado funcionando

---

### 13. Verificación end-to-end

- **Descripción**: Verificar que todo el sistema de auth funciona correctamente
- **Archivos**:
  - `scripts/test-auth-flow.ts` (nuevo)
  - `docs/v2/AUTH-TESTING.md` (nuevo)
- **Dependencias**: Tareas 1-12
- **Complejidad**: Media
- **Criterios de aceptación**:
  - [ ] Crear tenant "test-auth" con provisioning
  - [ ] Login en tenant/dashboard funciona (Custom UI)
  - [ ] CRUD de usuarios desde dashboard funciona (flujo directo)
  - [ ] Webhooks funcionan para OAuth signup
  - [ ] Login en tenant/webapp funciona (Custom UI)
  - [ ] Login en admin/dashboard funciona (como GlobalUser)
  - [ ] API endpoints protegidos correctamente
  - [ ] Todos los proyectos compilan: `pnpm nx run-many -t build`
  - [ ] Linting pasa: `pnpm nx run-many -t lint`

---

## Orden de Ejecución

```
1. @serveflow/core (tipos User)
   │
   ├──► 2. @serveflow/auth (Clerk SDK)
   │         │
   │         ├──► 3. @serveflow/webhooks (solo flujos externos)
   │         │
   │         └──► 4. @serveflow/db (operaciones User)
   │
   └──────────────────────────────────────────────────────────────┐
                                                                   │
   ┌───────────────────────────────────────────────────────────────┤
   │                                                               │
   ├──► 5. tenant/api (auth + CRUD users)                          │
   │         │                                                     │
   │         └──► 6. tenant/dashboard (auth + Custom UI)           │
   │                   │                                           │
   │                   └──► 10. CRUD usuarios UI                   │
   │                                                               │
   ├──► 7. tenant/webapp (crear + auth)                            │
   │                                                               │
   ├──► 8. admin/api (crear + auth)                                │
   │         │                                                     │
   │         └──► 9. admin/dashboard (crear + auth)                │
   │                                                               │
   └──► 11. Clerk webhooks config ─────────────────────────────────┤
                                                                   │
   12. Actualizar provisioning ────────────────────────────────────┤
                                                                   │
   13. Verificación end-to-end ◄───────────────────────────────────┘
```

### Tareas Paralelizables

- **Tareas 5, 7, 8** pueden ejecutarse en paralelo (todas dependen de 1-4)
- **Tareas 6 y 9** pueden ejecutarse en paralelo (dependen de 5 y 8 respectivamente)
- **Tarea 11** puede hacerse en paralelo con cualquier otra después de 3

---

## Riesgos y Consideraciones

### Riesgos Identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Clerk API rate limits | Media | Medio | Implementar retry con backoff |
| Webhooks perdidos | Baja | Alto | Usar Svix retry, logging extensivo |
| Sincronización inconsistente | Media | Alto | Verificación periódica, reconciliación |
| Múltiples apps en desarrollo | Alta | Medio | Usar puertos distintos, documentar |

### Consideraciones Técnicas

1. **Variables de Entorno Clerk**:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   CLERK_WEBHOOK_SECRET=whsec_...
   ```

2. **Puertos de Desarrollo**:
   ```
   tenant/dashboard: 3000
   tenant/api:       3001
   tenant/webapp:    3002
   admin/dashboard:  4000
   admin/api:        4001
   ```

3. **Clerk Organization Setup**:
   - Habilitar Organizations en Clerk Dashboard
   - Configurar roles: `org:admin`, `org:member`
   - Configurar webhooks endpoint

4. **Desarrollo Local**:
   - Usar `ngrok` o similar para recibir webhooks en local
   - O usar Clerk CLI para testing local de webhooks

---

## Definición de Completado (DoD)

El Bloque 2 está **completo** cuando:

- [ ] Package @serveflow/core tiene tipos User y GlobalUser (sin type hardcodeado)
- [ ] Package @serveflow/auth tiene integración completa con Clerk Backend SDK
- [ ] Package @serveflow/webhooks maneja eventos de Clerk (solo flujos externos)
- [ ] Package @serveflow/db tiene operaciones CRUD para User
- [ ] tenant/api tiene auth + endpoints de usuarios (flujo directo, sin webhook)
- [ ] tenant/dashboard tiene login con Custom UI + CRUD de usuarios
- [ ] tenant/webapp creada con auth y Custom UI
- [ ] admin/api creada con auth
- [ ] admin/dashboard creada con gestión de tenants
- [ ] Webhooks de Clerk funcionando para flujos externos (OAuth, etc.)
- [ ] Provisioning de tenant crea Clerk Organization
- [ ] Un flujo completo de crear tenant → crear usuario → login funciona
- [ ] Todos los proyectos compilan sin errores
- [ ] Linting pasa en todos los proyectos

---

## Notas Adicionales

- **NO implementar** en este bloque: Roles custom, permisos granulares, policies, data scoping (todo eso va en Bloque 3)
- **NO implementar** registro público de usuarios (solo creación desde dashboards)
- **NO usar** componentes de Clerk (`<SignIn />`, `<SignUp />`) - usar Custom UI con hooks
- **Reutilizar** código del backup donde sea posible (FormHead, FormDivider, Form, Field, layouts)
- **Flujo directo**: API crea en Clerk + MongoDB en el mismo request, sin esperar webhooks
- **Webhooks**: Solo para flujos externos (OAuth, cambios desde Clerk Dashboard)
- **Seguir** el patrón de Clerk: Organization = Tenant, no inventar abstracciones extra
- **Mantener** el modelo User lo más simple posible - añadir campos solo cuando se necesiten
- **GlobalUser sin type**: El tipo vendrá del rol en Bloque 3

---

## Referencias

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk Next.js SDK](https://clerk.com/docs/references/nextjs/overview)
- [Clerk Backend SDK](https://clerk.com/docs/references/backend/overview)
- [Clerk Webhooks](https://clerk.com/docs/webhooks/overview)
- [Código legacy](../backup/apps/tenant-dashboard/src/auth/)
