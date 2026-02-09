'use client';

import { useAuth } from '@/contexts/AuthContext';
import { UsuarioRol } from '@/types';
import { useRouter, usePathname } from 'next/navigation';
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
  const { usuario, isAuthenticated, isLoading, hasRole, hasAnyRole } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // CRÍTICO: Manejar debe_cambiar_password ANTES de verificar autenticación
    if (!isLoading && usuario && usuario.debe_cambiar_password) {
      // Si el usuario debe cambiar contraseña y NO está en /auth/reset-password, redirigir
      if (pathname !== '/auth/reset-password') {
        router.push('/auth/reset-password');
        return;
      }
      // Si ya está en /auth/reset-password, permitir el acceso (no redirigir)
      return;
    }

    // Verificar autenticación normal solo si no debe cambiar contraseña
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, usuario, pathname, router]);

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

  // Si el usuario debe cambiar contraseña y está en /auth/reset-password, permitir acceso
  if (usuario && usuario.debe_cambiar_password && pathname === '/auth/reset-password') {
    return <>{children}</>;
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
