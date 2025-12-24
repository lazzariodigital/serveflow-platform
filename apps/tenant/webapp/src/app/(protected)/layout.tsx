import { redirect } from 'next/navigation';
import { CurrentUserProvider } from '../../context/CurrentUserContext';
import { DashboardLayoutWrapper } from '../../components/dashboard-layout-wrapper';
import { getCurrentUser } from '../../lib/get-current-user';
import { getTenantFromHeaders } from '../../lib/get-tenant';
import { getOrganizations } from '../../lib/get-organizations';
import { OrganizationProvider } from '@serveflow/authorization/client';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// ════════════════════════════════════════════════════════════════
// Protected Routes Layout - Requires authentication
// ════════════════════════════════════════════════════════════════

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Get tenant from headers
  const { tenant, error: tenantError } = await getTenantFromHeaders();

  if (!tenant) {
    console.error('[ProtectedLayout] Tenant not found:', tenantError);
    redirect('/');
  }

  // 2. Get current user
  const { user, error } = await getCurrentUser(tenant);

  // 3. Handle errors - redirect to sign-in for any auth issue
  if (error) {
    console.error('[ProtectedLayout] Auth error:', error.type, error.message);
    redirect('/sign-in');
  }

  // 4. Get organizations for the OrganizationProvider
  const { organizations } = await getOrganizations();

  // 5. User is valid - render protected content with dashboard layout
  if (!user) {
    redirect('/sign-in');
  }

  return (
    <CurrentUserProvider user={user}>
      <OrganizationProvider organizations={organizations}>
        <DashboardLayoutWrapper
          user={{
            id: user._id?.toString(),
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            displayName: `${user.firstName} ${user.lastName}`.trim(),
            photoURL: user.imageUrl,
          }}
          slots={{
            hideLanguage: true,
          }}
        >
          {children}
        </DashboardLayoutWrapper>
      </OrganizationProvider>
    </CurrentUserProvider>
  );
}
