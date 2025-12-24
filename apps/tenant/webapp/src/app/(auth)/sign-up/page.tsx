'use client';

import { SignUpView } from '@serveflow/ui';

export default function SignUpPage() {
  return <SignUpView signInPath="/sign-in" redirectPath="/" appType="webapp" />;
}
