'use client';

import { SignInView } from '@serveflow/ui';

export default function SignInPage() {
  return <SignInView signUpPath="/sign-up" redirectPath="/profile" appType="webapp" />;
}
