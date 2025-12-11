'use client';

import { VerifyEmailView } from '@serveflow/ui';

export default function VerifyPage() {
  return <VerifyEmailView redirectPath="/" signInPath="/sign-in" />;
}
