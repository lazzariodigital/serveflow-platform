# Guía Completa de Configuración de Frontegg

Guía paso a paso para configurar Frontegg en Serveflow desde cero.

---

## PASO 1: Crear Cuenta en Frontegg

### 1.1 Registro

1. Ir a **https://portal.frontegg.com/signup**
2. Registrarse con email o cuenta de Google
3. Verificar el email si es necesario

### 1.2 Crear Workspace

Al iniciar sesión por primera vez:

1. Te pedirá crear un **Workspace**
2. Nombre: `Serveflow` (o el nombre de tu proyecto)
3. Seleccionar región: **EU** (para cumplir GDPR) o **US**

---

## PASO 2: Crear Environment de Desarrollo

Cada tenant necesita su propio Environment en Frontegg. Para desarrollo, crearemos uno de prueba.

### 2.1 Crear Environment

1. En el menú lateral, ir a **Environments**
2. Click en **+ Create Environment**
3. Configurar:
   - **Name**: `dev-demo` (para el tenant demo)
   - **Type**: `Development`
4. Click **Create**

### 2.2 Obtener Credenciales

Una vez creado el environment, ir a **Settings** > **General**:

```
┌─────────────────────────────────────────────────────────────┐
│  Environment Settings                                        │
├─────────────────────────────────────────────────────────────┤
│  Client ID:     xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx        │
│  API Key:       sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx         │
│  Base URL:      https://app-xxxxxxxx.frontegg.com           │
└─────────────────────────────────────────────────────────────┘
```

**Apunta estos 3 valores**, los necesitarás en el archivo `.env`.

---

## PASO 3: Configurar Autenticación en Frontegg

### 3.1 Habilitar Login con Email/Password

1. Ir a **Authentication** > **Login Methods**
2. En la sección **Password**, verificar que está **Enabled**
3. Click en **Password** para configurar:
   - Minimum length: `8`
   - Require uppercase: `Yes`
   - Require number: `Yes`
   - Require special character: `Optional`

### 3.2 Configurar Allowed Origins (CORS)

1. Ir a **Settings** > **Security**
2. En **Allowed Origins**, añadir:
   ```
   http://localhost:3000
   http://demo.localhost:3000
   ```

### 3.3 Configurar Redirect URIs

1. Ir a **Authentication** > **Login Method**
2. En la sección **Redirect URIs**, añadir:
   ```
   http://localhost:3000/oauth/callback
   http://localhost:3000/sso-callback
   http://localhost:3000/
   http://demo.localhost:3000/oauth/callback
   http://demo.localhost:3000/sso-callback
   http://demo.localhost:3000/
   ```

### 3.4 (Opcional) Habilitar Google Login

1. Ir a **Authentication** > **Social Logins**
2. Click en **Google**
3. Habilitar y configurar:
   - Ir a [Google Cloud Console](https://console.cloud.google.com)
   - Crear proyecto o seleccionar existente
   - Ir a **APIs & Services** > **Credentials**
   - Crear **OAuth 2.0 Client ID**
   - Tipo: Web application
   - Authorized redirect URIs: `https://app-xxxxxxxx.frontegg.com/oauth/callback` (tu Base URL de Frontegg)
4. Copiar Client ID y Client Secret a Frontegg

---

## PASO 4: Configurar Variables de Entorno

### 4.1 Crear archivo .env

En la raíz del proyecto (`c:\Users\asier\Dev\serveflow\platform`), crear archivo `.env`:

```env
# ══════════════════════════════════════════════════════════════════════════════
# MONGODB
# ══════════════════════════════════════════════════════════════════════════════
MONGODB_URI=mongodb://localhost:27017
MONGODB_SYSTEM_DB=db_serveflow_sys

# ══════════════════════════════════════════════════════════════════════════════
# FRONTEGG - Environment de Desarrollo
# ══════════════════════════════════════════════════════════════════════════════
# Estos valores vienen del PASO 2.2

FRONTEGG_BASE_URL=https://app-xxxxxxxx.frontegg.com
FRONTEGG_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
FRONTEGG_API_KEY=sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ══════════════════════════════════════════════════════════════════════════════
# NEXT.JS PUBLIC VARS (accesibles desde el cliente)
# ══════════════════════════════════════════════════════════════════════════════
NEXT_PUBLIC_FRONTEGG_BASE_URL=https://app-xxxxxxxx.frontegg.com
NEXT_PUBLIC_FRONTEGG_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# ══════════════════════════════════════════════════════════════════════════════
# APP CONFIG
# ══════════════════════════════════════════════════════════════════════════════
NODE_ENV=development
```

### 4.2 Copiar .env a apps que lo necesiten

```powershell
# Copiar a tenant dashboard
copy .env apps\tenant\dashboard\.env.local

# Copiar a tenant server
copy .env apps\tenant\server\.env
```

---

## PASO 5: Instalar Dependencias

### 5.1 Instalar paquetes npm

```powershell
cd c:\Users\asier\Dev\serveflow\platform
npm install --legacy-peer-deps
```

### 5.2 Verificar instalación de Frontegg

```powershell
npm list @frontegg/nextjs @frontegg/rest-api
```

Deberías ver:
```
├── @frontegg/nextjs@9.2.9
└── @frontegg/rest-api@7.79.0
```

---

## PASO 6: Configurar MongoDB

### 6.1 Iniciar MongoDB

**Opción A: Docker (Recomendado)**
```powershell
docker run -d --name mongodb -p 27017:27017 mongo:7.0
```

**Opción B: MongoDB Compass**
Si tienes MongoDB instalado localmente, simplemente inícialo.

### 6.2 Conectar a MongoDB

```powershell
mongosh
```

### 6.3 Crear Base de Datos del Sistema

```javascript
// Cambiar a la base de datos del sistema
use db_serveflow_sys

// Crear colecciones
db.createCollection('tenants')
db.createCollection('global_users')
db.createCollection('billing')
db.createCollection('usage_metrics')

// Crear índices
db.tenants.createIndex({ slug: 1 }, { unique: true })
db.tenants.createIndex({ fronteggTenantId: 1 }, { unique: true, sparse: true })
db.tenants.createIndex({ "company.taxId": 1 }, { unique: true })
db.global_users.createIndex({ fronteggUserId: 1 }, { unique: true })
db.global_users.createIndex({ email: 1 }, { unique: true })
```

### 6.4 Crear Tenant de Prueba "demo"

```javascript
// Asegúrate de estar en db_serveflow_sys
use db_serveflow_sys

// Insertar tenant demo
// IMPORTANTE: Reemplaza los valores de fronteggTenantId y fronteggConfig
// con los valores reales del PASO 2.2
db.tenants.insertOne({
  slug: "demo",
  name: "Demo Company",
  fronteggTenantId: "REEMPLAZAR_CON_ENVIRONMENT_ID",
  fronteggConfig: {
    baseUrl: "https://app-xxxxxxxx.frontegg.com",
    clientId: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  },
  database: {
    name: "db_tenant_demo",
    uri: "mongodb://localhost:27017"
  },
  company: {
    legalName: "Demo Company S.L.",
    tradeName: "Demo",
    taxId: "B12345678",
    address: {
      street: "Calle Demo 123",
      city: "Madrid",
      postalCode: "28001",
      country: "ES"
    }
  },
  contact: {
    email: "admin@demo.com",
    phone: "+34600000000"
  },
  settings: {
    timezone: "Europe/Madrid",
    locale: "es-ES",
    currency: "EUR",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "24h"
  },
  branding: {
    primaryColor: "#1976D2",
    logo: null
  },
  theming: {
    mode: "light",
    direction: "ltr",
    preset: "default"
  },
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date()
})
```

### 6.5 Crear Base de Datos del Tenant

```javascript
// Cambiar a la base de datos del tenant
use db_tenant_demo

// Crear colecciones
db.createCollection('organizations')
db.createCollection('users')
db.createCollection('memberships')
db.createCollection('services')
db.createCollection('resources')
db.createCollection('events')
db.createCollection('ai_config')

// Crear índices
db.organizations.createIndex({ slug: 1 }, { unique: true })
db.users.createIndex({ fronteggUserId: 1 }, { unique: true })
db.users.createIndex({ email: 1 })
db.memberships.createIndex({ userId: 1, organizationId: 1 }, { unique: true })

// Crear organización por defecto
db.organizations.insertOne({
  slug: "sede-principal",
  name: "Sede Principal",
  description: "Organización por defecto",
  status: "active",
  isDefault: true,
  settings: {
    timezone: "Europe/Madrid",
    language: "es",
    currency: "EUR"
  },
  createdAt: new Date(),
  updatedAt: new Date()
})
```

---

## PASO 7: Configurar Hosts para Subdominios

Para que los subdominios funcionen en desarrollo local:

### Windows

1. Abrir Notepad **como Administrador**
2. Abrir archivo: `C:\Windows\System32\drivers\etc\hosts`
3. Añadir al final:
   ```
   127.0.0.1 demo.localhost
   127.0.0.1 acme.localhost
   127.0.0.1 test.localhost
   ```
4. Guardar

### Verificar

```powershell
ping demo.localhost
```

Debería responder desde `127.0.0.1`.

---

## PASO 8: Crear Usuario de Prueba en Frontegg

### 8.1 Crear Usuario

1. Ir al portal de Frontegg
2. Seleccionar el environment `dev-demo`
3. Ir a **Users** en el menú lateral
4. Click **+ Add User**
5. Rellenar:
   - **Email**: `test@demo.com`
   - **Name**: `Test User`
   - **Password**: (crear una contraseña segura)
6. Click **Add**

### 8.2 (Opcional) Asignar Roles

1. Click en el usuario creado
2. Ir a la pestaña **Roles**
3. Asignar rol `Admin` o el que necesites

---

## PASO 9: Iniciar la Aplicación

### 9.1 Terminal 1: Dashboard del Tenant

```powershell
cd c:\Users\asier\Dev\serveflow\platform
npx nx serve tenant-dashboard
```

O alternativamente:
```powershell
cd apps\tenant\dashboard
npm run dev
```

Esperar a que aparezca:
```
✓ Ready in 2.3s
○ Compiling / ...
```

### 9.2 Terminal 2: API del Tenant (opcional)

```powershell
cd c:\Users\asier\Dev\serveflow\platform
npx nx serve tenant-server
```

---

## PASO 10: Probar el Login

### 10.1 Abrir el Navegador

1. Ir a: **http://demo.localhost:3000**
2. Deberías ver la página de login con tu UI personalizada

### 10.2 Iniciar Sesión

1. Introducir las credenciales del usuario creado en el PASO 8:
   - Email: `test@demo.com`
   - Password: (la que configuraste)
2. Click en **Iniciar sesión**

### 10.3 Verificar Autenticación

Si todo está correcto:
- Serás redirigido al dashboard (`/`)
- En las DevTools del navegador (F12 > Application > Cookies), deberías ver:
  - `fe_access_token` - Token JWT de Frontegg
  - `fe_refresh_token` - Token de refresco

### 10.4 Verificar Token JWT

1. Copiar el valor de `fe_access_token`
2. Ir a **https://jwt.io**
3. Pegar el token
4. En el payload deberías ver:
   ```json
   {
     "sub": "uuid-del-usuario",
     "email": "test@demo.com",
     "tenantId": "id-del-environment",
     "roles": ["Admin"],
     ...
   }
   ```

---

## PASO 11: Crear Usuario en MongoDB (Auto-provisioning)

Cuando un usuario hace login por primera vez, necesitas crearlo en MongoDB. Por ahora, hazlo manualmente:

```javascript
// En mongosh
use db_tenant_demo

// Obtener el ID de la organización
const org = db.organizations.findOne({ isDefault: true })

// Crear usuario (reemplaza fronteggUserId con el "sub" del JWT)
db.users.insertOne({
  fronteggUserId: "REEMPLAZAR_CON_SUB_DEL_JWT",
  email: "test@demo.com",
  firstName: "Test",
  lastName: "User",
  organizationIds: [org._id],
  primaryOrganizationId: org._id,
  status: "active",
  isVerified: true,
  createdAt: new Date(),
  updatedAt: new Date()
})

// Crear membership
db.memberships.insertOne({
  userId: db.users.findOne({ email: "test@demo.com" })._id,
  organizationId: org._id,
  role: "admin",
  permissions: ["*"],
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date()
})
```

---

## Troubleshooting

### Error: "No se puede conectar al servidor"

**Verificar:**
1. MongoDB está corriendo: `mongosh` debería conectar
2. El archivo `.env` existe y tiene los valores correctos
3. La aplicación Next.js está corriendo

### Error: "Tenant not found"

**Verificar:**
1. El subdominio en la URL coincide con el `slug` del tenant en MongoDB
2. El tenant existe en `db_serveflow_sys.tenants`

```javascript
use db_serveflow_sys
db.tenants.findOne({ slug: "demo" })
```

### Error: "Invalid token" o "Unauthorized"

**Verificar:**
1. `FRONTEGG_BASE_URL` y `FRONTEGG_CLIENT_ID` son correctos
2. Los valores en `.env` coinciden con los del portal de Frontegg
3. El token no ha expirado (intenta hacer logout y login de nuevo)

### Error: "CORS blocked"

**Verificar:**
1. En Frontegg > Settings > Security > Allowed Origins
2. Debe incluir `http://localhost:3000` y `http://demo.localhost:3000`

### El login no redirige / se queda cargando

**Verificar:**
1. Las Redirect URIs están configuradas en Frontegg
2. La cookie `fe_access_token` se está guardando
3. No hay errores en la consola del navegador (F12)

### Error al hacer signup "User already exists"

**Esto es normal** si el usuario ya existe en Frontegg. Usa login en lugar de signup.

---

## Checklist Final

```
[ ] 1. Cuenta de Frontegg creada
[ ] 2. Environment de desarrollo creado
[ ] 3. Credenciales obtenidas (Client ID, API Key, Base URL)
[ ] 4. Allowed Origins configurados en Frontegg
[ ] 5. Redirect URIs configurados en Frontegg
[ ] 6. Archivo .env creado con valores correctos
[ ] 7. npm install ejecutado sin errores
[ ] 8. MongoDB corriendo
[ ] 9. Base de datos db_serveflow_sys creada
[ ] 10. Tenant "demo" insertado en MongoDB
[ ] 11. Base de datos db_tenant_demo creada
[ ] 12. Organización por defecto creada
[ ] 13. Hosts configurados (demo.localhost)
[ ] 14. Usuario de prueba creado en Frontegg
[ ] 15. Aplicación iniciada (nx serve tenant-dashboard)
[ ] 16. Login probado exitosamente
[ ] 17. Usuario creado en MongoDB
```

---

## Arquitectura del Flujo de Login

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Usuario     │────▶│   Next.js App   │────▶│    Frontegg     │
│  (Navegador)    │◀────│   (Frontend)    │◀────│   (Identity)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               │ JWT Token
                               ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │   NestJS API    │────▶│    MongoDB      │
                        │   (Backend)     │◀────│   (Database)    │
                        └─────────────────┘     └─────────────────┘
```

1. Usuario accede a `demo.localhost:3000`
2. Middleware detecta subdominio `demo` y busca tenant en MongoDB
3. Si no hay token, redirige a `/sign-in`
4. Usuario introduce credenciales en formulario custom (SignInView)
5. Frontegg valida y devuelve JWT token
6. Token se guarda en cookies (`fe_access_token`)
7. Usuario es redirigido al dashboard
8. API valida token JWT con JWKS de Frontegg
