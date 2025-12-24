/**
 * Environment configuration for Serveflow
 * All environment variables are centralized here
 */

// Check if we're in a build/static generation context (no runtime env)
const isBuildTime = typeof process === 'undefined' || !process.env;

function getEnvVar(key: string, defaultValue?: string): string {
  if (isBuildTime) {
    return defaultValue || `BUILD_TIME_${key}`;
  }
  const value = process.env[key] || defaultValue;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getOptionalEnvVar(key: string, defaultValue?: string): string | undefined {
  if (isBuildTime) {
    return defaultValue;
  }
  return process.env[key] || defaultValue;
}

export const env = {
  // Node environment
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),

  // MongoDB
  MONGODB_URI: getEnvVar('MONGODB_URI'),

  // FusionAuth Authentication
  FUSIONAUTH_URL: getEnvVar('FUSIONAUTH_URL', 'http://localhost:9011'),
  FUSIONAUTH_API_KEY: getEnvVar('FUSIONAUTH_API_KEY'),
  FUSIONAUTH_ADMIN_TENANT_ID: getOptionalEnvVar('FUSIONAUTH_ADMIN_TENANT_ID'),

  // Base domain for tenant resolution
  BASE_DOMAIN: getEnvVar('NEXT_PUBLIC_BASE_DOMAIN', 'localhost'),

  // API URLs (internal)
  TENANT_API_URL: getEnvVar('TENANT_API_URL', 'http://localhost:3001'),
  ADMIN_API_URL: getEnvVar('ADMIN_API_URL', 'http://localhost:3002'),
  AI_ASSISTANT_URL: getOptionalEnvVar('AI_ASSISTANT_URL', 'http://localhost:3010'),
  MCP_SERVER_URL: getOptionalEnvVar('MCP_SERVER_URL', 'http://localhost:3011'),

  // Internal service token for service-to-service communication
  INTERNAL_SERVICE_TOKEN: getOptionalEnvVar('INTERNAL_SERVICE_TOKEN'),

  // Cerbos PDP (Authorization)
  CERBOS_GRPC_URL: getEnvVar('CERBOS_GRPC_URL', 'localhost:3593'),
  CERBOS_TLS_ENABLED: getEnvVar('CERBOS_TLS_ENABLED', 'false') === 'true',
} as const;

export type Env = typeof env;
