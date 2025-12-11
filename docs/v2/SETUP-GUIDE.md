# Guia de Configuracion - Serveflow V2

## Requisitos Previos

### Software
- Node.js v20+
- pnpm v9+
- MongoDB 7+ (local o Atlas)
- Git

### Opcional
- Docker (para MongoDB local)
- MongoDB Compass (GUI)

---

## 1. Instalar Dependencias

```bash
cd repo
pnpm install
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
# CLERK AUTHENTICATION (opcional para desarrollo inicial)
# Obtener en: https://dashboard.clerk.com
# ═══════════════════════════════════════════════════════════════
CLERK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx

# ═══════════════════════════════════════════════════════════════
# DOMINIO BASE
# ═══════════════════════════════════════════════════════════════
NEXT_PUBLIC_BASE_DOMAIN=localhost

# ═══════════════════════════════════════════════════════════════
# URLs INTERNAS (defaults para desarrollo)
# ═══════════════════════════════════════════════════════════════
TENANT_API_URL=http://localhost:3001
AI_ASSISTANT_URL=http://localhost:3010
MCP_SERVER_URL=http://localhost:3011

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
pnpm ts-node scripts/init-system.ts
```

Esto crea:
- Base de datos `db_serveflow_sys`
- Coleccion `tenants` con indices
- Coleccion `global_users` con indices

### 5.2 Provisionar tenant de prueba

```bash
pnpm ts-node scripts/provision-tenant.ts \
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
pnpm nx serve tenant-api
```
- URL: http://localhost:3000/api
- Con tenant: http://demo.localhost:3000/api

### 6.2 Dashboard del Tenant (Next.js)

```bash
pnpm nx serve dashboard
```
- URL: http://localhost:4200
- Con tenant: http://demo.localhost:4200

### 6.3 Ejecutar ambos en paralelo

Terminal 1:
```bash
pnpm nx serve tenant-api
```

Terminal 2:
```bash
pnpm nx serve dashboard
```

---

## 7. Verificar Instalacion

### 7.1 Health check API

```bash
curl http://localhost:3000/api
```

Respuesta esperada:
```json
{"message":"Hello API"}
```

### 7.2 Con tenant (usando header)

```bash
curl -H "X-Tenant-Slug: demo" http://localhost:3000/api
```

### 7.3 Con tenant (usando subdomain)

```bash
curl http://demo.localhost:3000/api
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
| tenant-api | 3000 | http://localhost:3000/api |
| dashboard | 4200 | http://localhost:4200 |
| admin-api | 3002 | http://localhost:3002/api |
| admin-dashboard | 4201 | http://localhost:4201 |
| ai-assistant | 3010 | http://localhost:3010 |
| mcp-server | 3011 | http://localhost:3011 |

---

## 9. Comandos Utiles

### Build
```bash
# Compilar todo
pnpm nx run-many -t build

# Compilar app especifica
pnpm nx build tenant-api
pnpm nx build dashboard
```

### Test
```bash
# Tests de todos los proyectos
pnpm nx run-many -t test

# Test especifico
pnpm nx test tenant-api
```

### Lint
```bash
pnpm nx run-many -t lint
```

### Ver proyectos NX
```bash
pnpm nx show projects
```

### Grafo de dependencias
```bash
pnpm nx graph
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
pnpm nx reset
rm -rf node_modules/.cache
```

2. Reinstalar dependencias:
```bash
rm -rf node_modules
pnpm install
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

1. **Configurar Clerk** - Para autenticacion real
2. **Crear mas tenants** - Usar script provision-tenant
3. **Desarrollar features** - Seguir documentacion en docs/v2/

---

## Referencia Rapida

```bash
# Setup inicial (una vez)
pnpm install
pnpm ts-node scripts/init-system.ts
pnpm ts-node scripts/provision-tenant.ts --slug=demo --name="Demo" --email=demo@test.com

# Desarrollo diario
pnpm nx serve tenant-api   # Terminal 1
pnpm nx serve dashboard    # Terminal 2

# Acceso
http://demo.localhost:3000/api  # API
http://demo.localhost:4200      # Dashboard
```
