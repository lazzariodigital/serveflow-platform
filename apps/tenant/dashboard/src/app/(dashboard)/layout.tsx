import { redirect } from 'next/navigation';
import { CurrentUserProvider } from '../../context/CurrentUserContext';
import { DashboardLayoutWrapper } from '../../components/dashboard-layout-wrapper';
import { getCurrentUser } from '../../lib/get-current-user';
import { getTenantFromHeaders } from '../../lib/get-tenant';
import { getOrganizations } from '../../lib/get-organizations';
import { OrganizationProvider } from '@serveflow/authorization/client';

// Force dynamic rendering - layout requires runtime database access
export const dynamic = 'force-dynamic';

// ----------------------------------------------------------------------

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Get tenant from headers
  const { tenant, error: tenantError } = await getTenantFromHeaders();

  if (!tenant) {
    console.error('[DashboardLayout] Tenant not found:', tenantError);
    redirect('/');
  }

  // 2. Get current user (verifies membership + fetches from MongoDB)
  const { user, error } = await getCurrentUser(tenant);

  // 3. Handle errors - redirect to sign-in for any auth issue
  if (error) {
    console.error('[DashboardLayout] Auth error:', error.type, error.message);
    redirect('/sign-in');
  }

  // 4. Get organizations for the OrganizationProvider
  const { organizations } = await getOrganizations();

  // 5. User is valid - render the dashboard
  return (
    <CurrentUserProvider user={user!}>
      <OrganizationProvider organizations={organizations}>
        <DashboardLayoutWrapper
          user={{
            id: user!._id?.toString(),
            email: user!.email,
            firstName: user!.firstName,
            lastName: user!.lastName,
            displayName: `${user!.firstName} ${user!.lastName}`.trim(),
            photoURL: user!.imageUrl,
          }}
          slots={{
            hideLanguage: true, // For now, hide language selector
          }}
        >
          {children}
        </DashboardLayoutWrapper>
      </OrganizationProvider>
    </CurrentUserProvider>
  );
}
