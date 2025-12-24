import Link from 'next/link';

export const metadata = {
  title: 'Unauthorized | Dashboard',
  description: 'You do not have permission to access this page',
};

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md text-center">
        <div className="space-y-2">
          <div className="text-6xl text-amber-500">403</div>
          <h1 className="text-2xl font-bold text-gray-900">
            Acceso Denegado
          </h1>
          <p className="text-gray-600">
            No tienes permiso para acceder a esta página.
            Tu rol actual no tiene acceso a esta sección del dashboard.
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Si crees que esto es un error, contacta con tu administrador.
          </p>

          <div className="flex flex-col gap-3">
            <Link
              href="/"
              className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Volver al inicio
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Iniciar sesión con otra cuenta
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
