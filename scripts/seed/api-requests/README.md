# API Testing - Serveflow Multi-tenant

Guía para probar el flujo completo de la API de Serveflow.

## Requisitos Previos

1. **Servicios corriendo:**
   - MongoDB: `mongodb://localhost:27017`
   - FusionAuth: `http://localhost:9011`
   - Admin Server: `http://localhost:3100`
   - Tenant Server: `http://localhost:3000`

2. **Variables de entorno configuradas:**
   ```env
   MONGODB_URI=mongodb://localhost:27017
   FUSIONAUTH_URL=http://localhost:9011
   FUSIONAUTH_API_KEY=<tu_api_key>
   FUSIONAUTH_JWT_POPULATE_LAMBDA_ID=1dedcb62-57bb-49b6-8c45-debafc9c7469
   ```

3. **hosts file** (para subdominios locales):
   ```
   127.0.0.1 gimnasio-fitmax.localhost
   127.0.0.1 gimnasio-fitmax.app.localhost
   ```

## Flujo de Testing

### Paso 1: Crear Tenant

```bash
curl -X POST http://localhost:3100/api/admin/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "gimnasio-fitmax",
    "name": "Gimnasio FitMax",
    "plan": "enterprise",
    "branding": { "appName": "FitMax" },
    "settings": { "locale": "es-ES", "timezone": "Europe/Madrid", "currency": "EUR" }
  }'
```

**Guardar de la respuesta:**
- `fusionauthTenantId`
- `fusionauthApplications.dashboard.id`
- `fusionauthApplications.webapp.id`

### Paso 2: Crear Organizaciones

Para cada organización:

```bash
curl -X POST http://gimnasio-fitmax.localhost:3000/api/organizations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "slug": "madrid-centro",
    "name": "Madrid Centro",
    "address": {
      "street": "Calle Gran Vía 28",
      "city": "Madrid",
      "postalCode": "28013",
      "country": "Spain"
    },
    "settings": { "timezone": "Europe/Madrid", "currency": "EUR" }
  }'
```

**Nota:** El endpoint POST /api/organizations requiere rol 'admin'. Si aún no tienes token, el endpoint de usuarios está marcado @Public() para testing inicial.

**Guardar de cada respuesta:** El `_id` de MongoDB para usar en los usuarios.

### Paso 3: Crear Usuarios

```bash
# Admin (acceso total)
curl -X POST http://gimnasio-fitmax.localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@fitmax.es",
    "password": "Test1234!",
    "firstName": "Carlos",
    "lastName": "López",
    "roles": ["admin"],
    "organizationIds": []
  }'

# Empleado Madrid (acceso limitado)
curl -X POST http://gimnasio-fitmax.localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "empleado.madrid@fitmax.es",
    "password": "Test1234!",
    "firstName": "Juan",
    "lastName": "García",
    "roles": ["employee"],
    "organizationIds": ["<org_id_madrid_centro>", "<org_id_madrid_norte>", "<org_id_madrid_sur>"],
    "primaryOrganizationId": "<org_id_madrid_centro>"
  }'
```

### Paso 4: Obtener Token

```bash
# Login con FusionAuth API
curl -X POST http://localhost:9011/api/login \
  -H "Content-Type: application/json" \
  -H "X-FusionAuth-TenantId: <fusionauth_tenant_id>" \
  -d '{
    "loginId": "admin@fitmax.es",
    "password": "Test1234!",
    "applicationId": "<dashboard_app_id>"
  }'
```

El `token` en la respuesta es el JWT a usar en Authorization.

### Paso 5: Probar Control de Acceso

```bash
# Admin ve todos los usuarios
curl http://gimnasio-fitmax.localhost:3000/api/users \
  -H "Authorization: Bearer <admin_token>"

# Empleado Madrid solo ve usuarios de Madrid
curl http://gimnasio-fitmax.localhost:3000/api/users \
  -H "Authorization: Bearer <empleado_madrid_token>"

# Ver organizaciones accesibles
curl http://gimnasio-fitmax.localhost:3000/api/organizations/accessible \
  -H "Authorization: Bearer <any_token>"
```

## Archivos JSON de Referencia

| Archivo | Descripción |
|---------|-------------|
| [01-create-tenant.json](./01-create-tenant.json) | Crear tenant en admin-server |
| [02-create-organizations.json](./02-create-organizations.json) | Crear 5 organizaciones |
| [03-create-users.json](./03-create-users.json) | Crear 6 usuarios de prueba |
| [04-login.json](./04-login.json) | Opciones de login |
| [05-test-organization-filtering.json](./05-test-organization-filtering.json) | Escenarios de prueba |

## Usuarios de Prueba

| Email | Rol | Organizaciones | App |
|-------|-----|----------------|-----|
| admin@fitmax.es | admin | TODAS | Dashboard |
| empleado.madrid@fitmax.es | employee | Madrid (3 sedes) | Dashboard |
| empleado.barcelona@fitmax.es | employee | Barcelona | Dashboard |
| trainer@fitmax.es | provider | Madrid Centro/Norte | WebApp |
| cliente.premium@fitmax.es | client | TODAS | WebApp |
| cliente@fitmax.es | client | Madrid Centro | WebApp |

**Password para todos:** `Test1234!`

## Principio Clave

`organizationIds: []` (array vacío) = **Acceso a TODAS las organizaciones**

Esto se aplica tanto a admins como a clientes premium.

## URLs de las Apps

- **Dashboard:** `http://gimnasio-fitmax.localhost:4200`
- **WebApp:** `http://gimnasio-fitmax.app.localhost:4201`
