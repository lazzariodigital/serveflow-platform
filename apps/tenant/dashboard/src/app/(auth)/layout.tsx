'use client';

import { AuthSplitLayout } from '@serveflow/ui';

// ════════════════════════════════════════════════════════════════
// Auth Layout
// ════════════════════════════════════════════════════════════════
// AuthSplitLayout automatically uses useTenant() internally
// to get the logo and branding from the tenant context

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthSplitLayout
      slotProps={{section:{
        title: 'Gestiona tu club',
        subtitle: 'Accede a tu cuenta',
      }}}
    >
      {children}
    </AuthSplitLayout>
  );
}
