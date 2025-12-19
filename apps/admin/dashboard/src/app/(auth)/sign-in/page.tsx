'use client';

import { AdminSignInView } from '../../../views/admin-sign-in-view';

// Admin dashboard: only sign-in (no public sign-up)
export default function SignInPage() {
  return <AdminSignInView redirectPath="/tenants" />;
}
