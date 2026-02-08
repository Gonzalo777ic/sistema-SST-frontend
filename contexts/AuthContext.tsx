'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Usuario, UsuarioRol } from '@/types';
import { authService } from '@/services/auth.service';
import { toast } from 'sonner';


interface AuthContextType {
  usuario: Usuario | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (dni: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUserProfile: () => Promise<void>;
  hasRole: (role: UsuarioRol) => boolean;
  hasAnyRole: (roles: UsuarioRol[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Cargar usuario desde localStorage al iniciar
    const storedUsuario = authService.getStoredUsuario();
    if (storedUsuario && authService.getStoredToken()) {
      setUsuario(storedUsuario);
    }
    setIsLoading(false);
  }, []);

  const login = async (dni: string, password: string) => {
    const response = await authService.login({ dni, password });
    authService.setAuthData(response.access_token, response.usuario);
    setUsuario(response.usuario);
    
    // Redirigir a reset password si debe cambiar contraseña
    if (response.usuario.debe_cambiar_password === true) {
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/reset-password';
      }
      return;
    }
    
    // Redirigir a setup si el perfil no está completado
    if (response.usuario.perfil_completado === false) {
      if (typeof window !== 'undefined') {
        window.location.href = '/perfil/setup';
      }
    }
  };

  const logout = () => {
    authService.logout();
    setUsuario(null);
  };

  const refreshUserProfile = async () => {
    if (!usuario?.id) return;
  
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
    } catch (error) {
      console.error('Error al sincronizar perfil:', error);
      toast.error('Sesión desactualizada. Por favor, re-ingresa.');
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
