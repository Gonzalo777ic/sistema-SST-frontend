'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// Rutas que NO deben usar MainLayout (layout simple)
const PUBLIC_ROUTES = ['/login', '/auth/reset-password'];

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { usuario, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    // CRÍTICO: Manejar debe_cambiar_password ANTES de verificar autenticación
    if (!isLoading && usuario && usuario.debe_cambiar_password) {
      // Si el usuario debe cambiar contraseña y NO está en /auth/reset-password, redirigir
      if (pathname !== '/auth/reset-password') {
        router.push('/auth/reset-password');
        return;
      }
      return;
    }

    // Verificar autenticación normal solo si no debe cambiar contraseña y no es ruta pública
    if (!isLoading && !isAuthenticated && !isPublicRoute) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, usuario, pathname, router, isPublicRoute]);

  // Si es ruta pública, renderizar sin layout
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Si el usuario debe cambiar contraseña y está en reset-password, layout simple
  if (usuario && usuario.debe_cambiar_password && pathname === '/auth/reset-password') {
    return <>{children}</>;
  }

  // Si no está autenticado, no mostrar nada (será redirigido)
  if (!isLoading && !isAuthenticated) {
    return null;
  }

  // Para todas las demás rutas, usar MainLayout persistente
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-3 text-sm text-slate-600">Cargando...</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 px-4 lg:px-8 pt-6 pb-4 lg:pb-8">{children}</div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
