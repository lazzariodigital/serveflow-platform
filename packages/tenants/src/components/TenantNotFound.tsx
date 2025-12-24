'use client';

// ════════════════════════════════════════════════════════════════
// Tenant Not Found Component
// ════════════════════════════════════════════════════════════════
// Displayed when a tenant slug doesn't exist in the database.
// ════════════════════════════════════════════════════════════════

export interface TenantNotFoundProps {
  slug?: string | null;
  error?: string | null;
}

export function TenantNotFound({ slug, error }: TenantNotFoundProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backgroundColor: '#f5f5f5',
        color: '#333',
        padding: '20px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '48px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)',
          maxWidth: '500px',
          width: '100%',
        }}
      >
        <div
          style={{
            fontSize: '64px',
            marginBottom: '16px',
          }}
        >
          🔍
        </div>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 600,
            marginBottom: '12px',
            margin: '0 0 12px 0',
          }}
        >
          Organizaci&oacute;n no encontrada
        </h1>
        <p
          style={{
            fontSize: '16px',
            color: '#666',
            marginBottom: '24px',
            margin: '0 0 24px 0',
            lineHeight: 1.5,
          }}
        >
          {slug ? (
            <>
              No existe ninguna organizaci&oacute;n con el identificador{' '}
              <code
                style={{
                  backgroundColor: '#f0f0f0',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                }}
              >
                {slug}
              </code>
            </>
          ) : (
            'No se pudo determinar la organizaci\u00f3n desde la URL.'
          )}
        </p>
        <div
          style={{
            fontSize: '14px',
            color: '#999',
          }}
        >
          <p style={{ margin: '0 0 8px 0' }}>
            Verifica que la URL sea correcta o contacta con soporte.
          </p>
          {error && process.env['NODE_ENV'] === 'development' && (
            <p
              style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#fff3cd',
                borderRadius: '4px',
                color: '#856404',
                fontSize: '12px',
                fontFamily: 'monospace',
                textAlign: 'left',
                margin: '16px 0 0 0',
              }}
            >
              Debug: {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
