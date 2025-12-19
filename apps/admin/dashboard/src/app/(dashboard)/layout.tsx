import { redirect } from 'next/navigation';

import { ForbiddenError, UserNotFoundError } from '../../components/errors';
import { CurrentUserProvider } from '../../context/CurrentUserContext';
import { DashboardLayoutWrapper } from '../../components/dashboard-layout-wrapper';
import { getCurrentUser } from '../../lib/get-current-user';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// ════════════════════════════════════════════════════════════════
// Dashboard Layout for Admin - Requires authentication
// ════════════════════════════════════════════════════════════════

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get current admin user
  const { user, error } = await getCurrentUser();

  // Handle errors
  if (error) {
    switch (error.type) {
      case 'UNAUTHORIZED':
        redirect('/sign-in');

      case 'FORBIDDEN':
        return <ForbiddenError message={error.message} />;

      case 'USER_NOT_FOUND':
        return <UserNotFoundError message={error.message} />;

      case 'INTERNAL':
      default:
        return <ForbiddenError message="Error interno. Por favor, intenta de nuevo." />;
    }
  }

  // User is valid - render dashboard
  return (
    <CurrentUserProvider user={user!}>
      <DashboardLayoutWrapper
        user={{
          id: user!.fusionauthUserId,
          email: user!.email,
          firstName: user!.firstName,
          lastName: user!.lastName,
          displayName: `${user!.firstName} ${user!.lastName}`.trim(),
          photoURL: user!.imageUrl,
        }}
        slots={{
          hideLanguage: true,
        }}
      >
        {children}
      </DashboardLayoutWrapper>
    </CurrentUserProvider>
  );
}
