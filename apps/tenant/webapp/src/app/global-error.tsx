'use client';

// Global error boundary - renders outside the root layout, cannot use providers/context
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '20px',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
            Algo salio mal
          </h1>
          <p style={{ color: '#666', marginBottom: '2rem' }}>
            Ha ocurrido un error inesperado. Por favor intenta de nuevo.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: '12px 24px',
              fontSize: '1rem',
              cursor: 'pointer',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
            }}
          >
            Intentar de nuevo
          </button>
        </div>
      </body>
    </html>
  );
}
