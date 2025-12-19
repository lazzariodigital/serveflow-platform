'use client';

import { AuthSplitLayout } from '@serveflow/ui';

// ════════════════════════════════════════════════════════════════
// Auth Layout for Webapp
// ════════════════════════════════════════════════════════════════

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthSplitLayout
      slotProps={{section:{
        title: 'Tu espacio personal',
        subtitle: 'Accede a tu cuenta',
      }}}
    >
      {children}
    </AuthSplitLayout>
  );
}
