'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Sidebar } from './Sidebar';

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { usuario, isAuthenticated, isLoading } = useAuth();
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
      // Si ya está en /auth/reset-password, NO usar MainLayout (debe usar layout simple)
      // Este componente no debería renderizarse en /auth/reset-password
      return;
    }

    // Verificar autenticación normal solo si no debe cambiar contraseña
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, usuario, pathname, router]);

  // Si el usuario debe cambiar contraseña, NO mostrar MainLayout (incluye Sidebar)
  // La página de reset-password debe tener su propio layout simple
  if (usuario && usuario.debe_cambiar_password && pathname === '/auth/reset-password') {
    return null; // No renderizar MainLayout para esta ruta
  }

  // Si no está autenticado, no mostrar nada
  if (!isLoading && !isAuthenticated) {
    return null;
  }

  return (
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
  );
}
