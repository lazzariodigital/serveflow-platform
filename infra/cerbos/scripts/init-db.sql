-- Cerbos crea automáticamente sus tablas para policies
-- Este script añade extensiones y tablas de tracking

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla para tracking de policies por tenant (para admin UI)
CREATE TABLE IF NOT EXISTS policy_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_slug VARCHAR(255) NOT NULL,
    resource_type VARCHAR(255) NOT NULL,
    policy_version VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_slug, resource_type)
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_policy_metadata_tenant ON policy_metadata(tenant_slug);
