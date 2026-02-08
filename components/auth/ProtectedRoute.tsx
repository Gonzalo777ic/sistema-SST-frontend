'use client';

import { useAuth } from '@/contexts/AuthContext';
import { UsuarioRol } from '@/types';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UsuarioRol[];
  requireAny?: boolean; // Si es true, requiere cualquiera de los roles. Si es false, requiere todos.
}

export function ProtectedRoute({
  children,
  allowedRoles,
  requireAny = true,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasRole, hasAnyRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-slate-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasAccess = requireAny
      ? hasAnyRole(allowedRoles)
      : allowedRoles.every((role) => hasRole(role));

    if (!hasAccess) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center p-8 bg-white rounded-lg shadow-sm border border-slate-200 max-w-md">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Acceso Denegado</h2>
            <p className="text-slate-600 mb-4">
              No tienes permisos para acceder a esta página.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
            >
              Volver al Dashboard
            </button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
