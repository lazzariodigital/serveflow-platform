import { ForbiddenError, UserNotFoundError } from '../../components/errors';

import { redirect } from 'next/navigation';
import { CurrentUserProvider } from '../../context/CurrentUserContext';
import { DashboardLayoutWrapper } from '../../components/dashboard-layout-wrapper';
import { getCurrentUser } from '../../lib/get-current-user';
import { getTenantFromHeaders } from '../../lib/get-tenant';

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
    // Redirect to a generic error or landing page
    redirect('/');
  }

  // 2. Get current user (verifies membership + fetches from MongoDB)
  const { user, error } = await getCurrentUser(tenant);

  // 3. Handle errors
  if (error) {
    switch (error.type) {
      case 'UNAUTHORIZED':
        // User not logged in - redirect to sign-in
        redirect('/sign-in');
        
      case 'FORBIDDEN':
        // User not a member of this organization
        return <ForbiddenError message={error.message} />;

      case 'USER_NOT_FOUND':
        // User exists in Clerk but not in MongoDB
        return <UserNotFoundError message={error.message} />;

      case 'INTERNAL':
      default:
        // Internal error - show forbidden with generic message
        return <ForbiddenError message="Error interno. Por favor, intenta de nuevo." />;
    }
  }

  // 4. User is valid - render the dashboard
  return (
    <CurrentUserProvider user={user!}>
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
    </CurrentUserProvider>
  );
}
