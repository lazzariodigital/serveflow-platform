'use client';

import { DashboardLayout, type DashboardLayoutProps, useFusionAuth, OrganizationPopover, type Organization } from '@serveflow/ui';
import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganization } from '@serveflow/authorization/client';

// ----------------------------------------------------------------------

type DashboardLayoutWrapperProps = Omit<DashboardLayoutProps, 'onSignOut'>;

export function DashboardLayoutWrapper({ children, slots, ...props }: DashboardLayoutWrapperProps) {
  const { logout } = useFusionAuth();
  const router = useRouter();
  const {
    currentOrganization,
    organizations,
    isLoading,
    setCurrentOrganization,
  } = useOrganization();

  const handleSignOut = useCallback(async () => {
    await logout();
    router.push('/sign-in');
  }, [logout, router]);

  // Convert to UI format
  const uiOrganizations: Organization[] = useMemo(() => {
    return organizations.map((org) => ({
      id: org.id,
      name: org.name,
      logoUrl: null,
      status: 'active' as const,
    }));
  }, [organizations]);

  const scopeType = useMemo(() => {
    // If no organization selected, user is viewing all their organizations
    if (!currentOrganization) return 'tenant';
    return 'organization';
  }, [currentOrganization]);

  const handleSelectOrganization = useCallback(
    (org: Organization) => {
      const authOrg = organizations.find((o) => o.id === org.id);
      if (authOrg) setCurrentOrganization(authOrg);
    },
    [organizations, setCurrentOrganization]
  );

  const handleSelectAllOrganizations = useCallback(() => {
    setCurrentOrganization(null);
  }, [setCurrentOrganization]);

  // Render organization selector (or nothing if no orgs)
  const organizationSelector = useMemo(() => {
    if (!isLoading && organizations.length === 0) return null;

    return (
      <OrganizationPopover
        scopeType={scopeType}
        currentOrganizationId={currentOrganization?.id ?? null}
        organizations={uiOrganizations}
        loading={isLoading}
        onSelectOrganization={handleSelectOrganization}
        onSelectAllOrganizations={handleSelectAllOrganizations}
      />
    );
  }, [isLoading, organizations.length, scopeType, currentOrganization?.id, uiOrganizations, handleSelectOrganization, handleSelectAllOrganizations]);

  return (
    <DashboardLayout
      {...props}
      onSignOut={handleSignOut}
      slots={{
        ...slots,
        beforeAccount: organizationSelector,
      }}
    >
      {children}
    </DashboardLayout>
  );
}
