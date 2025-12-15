'use client';

import { DashboardLayout, type DashboardLayoutProps, useFusionAuth } from '@serveflow/ui';
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ----------------------------------------------------------------------

type DashboardLayoutWrapperProps = Omit<DashboardLayoutProps, 'onSignOut'>;

export function DashboardLayoutWrapper({ children, ...props }: DashboardLayoutWrapperProps) {
  const { logout } = useFusionAuth();
  const router = useRouter();

  const handleSignOut = useCallback(async () => {
    await logout();
    router.push('/sign-in');
  }, [logout, router]);

  return (
    <DashboardLayout {...props} onSignOut={handleSignOut}>
      {children}
    </DashboardLayout>
  );
}
