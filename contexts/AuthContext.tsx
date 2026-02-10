'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Usuario, UsuarioRol, EmpresaVinculada } from '@/types';
import { authService } from '@/services/auth.service';
import { toast } from 'sonner';

interface AuthContextType {
  usuario: Usuario | null;
  empresasVinculadas: EmpresaVinculada[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (dni: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUserProfile: () => Promise<Usuario | null>;
  hasRole: (role: UsuarioRol) => boolean;
  hasAnyRole: (roles: UsuarioRol[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [empresasVinculadas, setEmpresasVinculadas] = useState<EmpresaVinculada[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Cargar usuario desde localStorage al iniciar
    const storedUsuario = authService.getStoredUsuario();
    const storedEmpresas = authService.getStoredEmpresasVinculadas();
    if (storedUsuario && authService.getStoredToken()) {
      setUsuario(storedUsuario);
      if (storedEmpresas) {
        setEmpresasVinculadas(storedEmpresas);
      }
      
      // CRÍTICO: Si el usuario debe cambiar contraseña y NO está en /auth/reset-password,
      // redirigir automáticamente (solo si estamos en el cliente)
      if (typeof window !== 'undefined' && storedUsuario.debe_cambiar_password) {
        const currentPath = window.location.pathname;
        // Solo redirigir si NO está ya en /auth/reset-password o /login
        if (currentPath !== '/auth/reset-password' && currentPath !== '/login') {
          window.location.href = '/auth/reset-password';
          return; // No continuar con setIsLoading para evitar renderizado innecesario
        }
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (dni: string, password: string) => {
    try {
      const response = await authService.login({ dni, password });
      authService.setAuthData(response.access_token, response.usuario, response.empresasVinculadas);
      setUsuario(response.usuario);
      setEmpresasVinculadas(response.empresasVinculadas || []);
      
      // CRÍTICO: Redirigir a reset password si debe cambiar contraseña
      // Usar router.push en lugar de window.location para mejor control
      if (response.usuario.debe_cambiar_password === true) {
        if (typeof window !== 'undefined') {
          // Usar window.location para forzar recarga completa y evitar navegación
          window.location.href = '/auth/reset-password';
        }
        return;
      }
      
      // Redirigir a setup si el perfil no está completado
      if (response.usuario.perfil_completado === false) {
        if (typeof window !== 'undefined') {
          window.location.href = '/perfil/setup';
        }
        return;
      }
      
      // Si todo está bien, redirigir al dashboard
      if (typeof window !== 'undefined') {
        window.location.href = '/dashboard';
      }
    } catch (error: any) {
      // Re-lanzar el error para que el componente de login lo maneje
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setUsuario(null);
    setEmpresasVinculadas([]);
  };

  const refreshUserProfile = async (): Promise<Usuario | null> => {
    if (!usuario?.id) return null;
  
    try {
      // 1. Obtener los datos más frescos del servidor
      const updatedUsuario = await authService.getProfile(usuario.id);
      
      // 2. Sincronizar persistencia (esto evita que al recargar la página se pierdan los cambios)
      const currentToken = authService.getStoredToken();
      if (currentToken) {
        authService.setAuthData(currentToken, updatedUsuario);
      }
      
      // 3. Actualizar el estado global para disparar re-renders en Sidebar y Pages
      setUsuario(updatedUsuario);
      
      console.log('Perfil sincronizado con éxito:', updatedUsuario.trabajadorId);
      return updatedUsuario;
    } catch (error) {
      console.error('Error al sincronizar perfil:', error);
      toast.error('Sesión desactualizada. Por favor, re-ingresa.');
      return null;
    }
  };

  const hasRole = (role: UsuarioRol): boolean => {
    return usuario?.roles.includes(role) ?? false;
  };

  const hasAnyRole = (roles: UsuarioRol[]): boolean => {
    return roles.some((role) => usuario?.roles.includes(role)) ?? false;
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        empresasVinculadas,
        isAuthenticated: !!usuario,
        isLoading,
        login,
        logout,
        refreshUserProfile,
        hasRole,
        hasAnyRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
