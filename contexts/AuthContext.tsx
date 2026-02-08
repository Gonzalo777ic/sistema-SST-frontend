'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Usuario, UsuarioRol } from '@/types';
import { authService } from '@/services/auth.service';

interface AuthContextType {
  usuario: Usuario | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
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

  const login = async (email: string, password: string) => {
    const response = await authService.login({ email, password });
    authService.setAuthData(response.access_token, response.usuario);
    setUsuario(response.usuario);
  };

  const logout = () => {
    authService.logout();
    setUsuario(null);
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
