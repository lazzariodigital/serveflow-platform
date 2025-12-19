'use client';

import { AdminAuthLayout } from '../../layouts/admin-auth-layout';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthLayout
      slotProps={{
        section: {
          title: 'Serveflow Admin',
          subtitle: 'Panel de administración',
        },
      }}
    >
      {children}
    </AdminAuthLayout>
  );
}
