import Link from 'next/link';

export const metadata = {
  title: 'Unauthorized | Serveflow Admin',
  description: 'You do not have permission to access this page',
};

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md text-center">
        <div className="space-y-2">
          <div className="text-6xl text-red-500">403</div>
          <h1 className="text-2xl font-bold text-gray-900">
            Access Denied
          </h1>
          <p className="text-gray-600">
            You do not have permission to access this page.
            This area is restricted to superadmin users only.
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            If you believe this is an error, please contact your system administrator.
          </p>

          <div className="flex flex-col gap-3">
            <Link
              href="/sign-in"
              className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign in with a different account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
