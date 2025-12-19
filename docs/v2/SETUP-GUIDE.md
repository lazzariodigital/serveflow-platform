# Guia de Configuracion - Serveflow V2

## Requisitos Previos

### Software
- Node.js v20+
- npm v10+
- MongoDB 7+ (local o Atlas)
- Git

### Opcional
- Docker (para MongoDB local)
- MongoDB Compass (GUI)

---

## 1. Instalar Dependencias

```bash
cd repo
npm install
```

---

## 2. Configurar MongoDB

### Opcion A: Docker (Recomendado)

```bash
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  mongo:7
```

### Opcion B: MongoDB Atlas (Cloud)

1. Crear cuenta en [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Crear cluster M0 (free tier)
3. Obtener connection string: `mongodb+srv://user:pass@cluster.mongodb.net`

### Opcion C: MongoDB Community (Local)

Descargar e instalar desde [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)

---

## 3. Variables de Entorno

Crear archivo `.env` en la raiz del proyecto:

```bash
# ═══════════════════════════════════════════════════════════════
# MONGODB
# ═══════════════════════════════════════════════════════════════
MONGODB_URI=mongodb://localhost:27017

# ═══════════════════════════════════════════════════════════════
# FUSIONAUTH (self-hosted)
# ═══════════════════════════════════════════════════════════════
FUSIONAUTH_URL=http://localhost:9011
FUSIONAUTH_API_KEY=xxx
FUSIONAUTH_ADMIN_TENANT_ID=xxx
FUSIONAUTH_ADMIN_APPLICATION_ID=xxx

# Public FusionAuth config (exposed to frontend)
NEXT_PUBLIC_FUSIONAUTH_URL=http://localhost:9011

# ═══════════════════════════════════════════════════════════════
# GOOGLE OAUTH (optional - for social login)
# ═══════════════════════════════════════════════════════════════
# Get these from Google Cloud Console -> APIs & Services -> Credentials
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
# The Identity Provider ID from FusionAuth (Settings -> Identity Providers -> Google)
NEXT_PUBLIC_FUSIONAUTH_GOOGLE_IDP_ID=xxx

# ═══════════════════════════════════════════════════════════════
# DOMINIO BASE
# ═══════════════════════════════════════════════════════════════
NEXT_PUBLIC_BASE_DOMAIN=localhost

# ═══════════════════════════════════════════════════════════════
# URLs INTERNAS (defaults para desarrollo)
# ═══════════════════════════════════════════════════════════════
TENANT_API_URL=http://localhost:3100
AI_ASSISTANT_URL=http://localhost:3200
MCP_SERVER_URL=http://localhost:3201

# ═══════════════════════════════════════════════════════════════
# ENTORNO
# ═══════════════════════════════════════════════════════════════
NODE_ENV=development
```

---

## 4. Configurar Subdominios Locales

Para simular multi-tenant en desarrollo, editar el archivo hosts:

### Windows
Abrir como Administrador: `C:\Windows\System32\drivers\etc\hosts`

### macOS/Linux
```bash
sudo nano /etc/hosts
```

### Agregar entradas:
```
127.0.0.1   demo.localhost
127.0.0.1   test.localhost
127.0.0.1   club-padel.localhost
```

---

## 5. Inicializar Sistema

### 5.1 Crear base de datos del sistema

```bash
npx ts-node scripts/init-system.ts
```

Esto crea:
- Base de datos `db_serveflow_sys`
- Coleccion `tenants` con indices
- Coleccion `global_users` con indices

### 5.2 Provisionar tenant de prueba

```bash
npx ts-node scripts/provision-tenant.ts \
  --slug=demo \
  --name="Demo Club" \
  --email=demo@example.com
```

Esto crea:
- Registro en `db_serveflow_sys.tenants`
- Base de datos `db_tenant_demo`
- Organizacion por defecto

---

## 6. Ejecutar Aplicaciones

### 6.1 API del Tenant (NestJS)

```bash
npx nx serve tenant-server
```
- URL: http://localhost:3100/api
- Con tenant: http://demo.localhost:3100/api

### 6.2 Dashboard del Tenant (Next.js)

```bash
npx nx dev dashboard
```
- URL: http://localhost:3000
- Con tenant: http://demo.localhost:3000

### 6.3 Ejecutar ambos en paralelo

Terminal 1:
```bash
npx nx serve tenant-server
```

Terminal 2:
```bash
npx nx dev dashboard
```

---

## 7. Verificar Instalacion

### 7.1 Health check API

```bash
curl http://localhost:3100/api
```

Respuesta esperada:
```json
{"message":"Hello API"}
```

### 7.2 Con tenant (usando header)

```bash
curl -H "X-Tenant-Slug: demo" http://localhost:3100/api
```

### 7.3 Con tenant (usando subdomain)

```bash
curl http://demo.localhost:3100/api
```

### 7.4 Verificar MongoDB

Usando MongoDB Compass o mongosh:

```bash
mongosh mongodb://localhost:27017

# Ver bases de datos
show dbs

# Deberia mostrar:
# db_serveflow_sys
# db_tenant_demo

# Ver tenants
use db_serveflow_sys
db.tenants.find().pretty()
```

---

## 8. Estructura de Puertos

| App | Puerto | URL |
|-----|--------|-----|
| tenant/dashboard | 3000 | http://localhost:3000 |
| tenant/webapp | 3001 | http://localhost:3001 |
| tenant/server | 3100 | http://localhost:3100/api |
| admin/dashboard | 3002 | http://localhost:3002 |
| admin/server | 3102 | http://localhost:3102/api |
| tenant/ai-assistant | 3200 | http://localhost:3200 |
| tenant/mcp-server | 3201 | http://localhost:3201 |

---

## 9. Comandos Utiles

### Build
```bash
# Compilar todo
npm run build

# Compilar app especifica
npx nx build tenant-server
npx nx build dashboard
```

### Test
```bash
# Tests de todos los proyectos
npx nx run-many -t test

# Test especifico
npx nx test tenant-server
```

### Lint
```bash
npm run lint
```

### Typecheck
```bash
npm run typecheck
```

### Ver proyectos NX
```bash
npx nx show projects
```

### Grafo de dependencias
```bash
npx nx graph
```

---

## 10. Troubleshooting

### Error: "Tenant not found"

1. Verificar que el tenant existe en MongoDB:
```bash
mongosh
use db_serveflow_sys
db.tenants.find({slug: "demo"})
```

2. Verificar que el subdomain esta en hosts file

3. Usar header como alternativa:
```bash
curl -H "X-Tenant-Slug: demo" http://localhost:3000/api
```

### Error: "Cannot connect to MongoDB"

1. Verificar que MongoDB esta corriendo:
```bash
docker ps  # si usas Docker
mongosh    # intentar conectar
```

2. Verificar MONGODB_URI en .env

### Error: Build fails

1. Limpiar cache:
```bash
npx nx reset
rm -rf node_modules/.cache
```

2. Reinstalar dependencias:
```bash
rm -rf node_modules
npm install
```

### Puerto en uso

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <pid> /F

# macOS/Linux
lsof -i :3000
kill -9 <pid>
```

---

## 11. Siguiente Pasos

Una vez configurado el sistema base:

1. **Configurar FusionAuth** - Para autenticacion real (ver PLAN-IMPLEMENTACION-IDENTIDAD.md)
2. **Crear mas tenants** - Usar script provision-tenant
3. **Desarrollar features** - Seguir documentacion en docs/v2/

---

## Referencia Rapida

```bash
# Setup inicial (una vez)
npm install
npx ts-node scripts/init-system.ts
npx ts-node scripts/provision-tenant.ts --slug=demo --name="Demo" --email=demo@test.com

# Desarrollo diario
npx nx serve tenant-server   # Terminal 1
npx nx dev dashboard         # Terminal 2

# Acceso
http://demo.localhost:3100/api  # API
http://demo.localhost:3000      # Dashboard
```
