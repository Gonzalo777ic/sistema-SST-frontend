import apiClient from '@/lib/axios';
import { LoginRequest, LoginResponse } from '@/types';

export const authService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>(
      '/auth/login',
      credentials
    );
    return response.data;
  },

  async register(data: {
    email: string;
    password: string;
    roles: string[];
    empresaId?: string;
  }): Promise<{ id: string; email: string }> {
    const response = await apiClient.post('/auth/register', {
      ...data,
      authProvider: 'LOCAL',
    });
    return response.data;
  },

  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('usuario');
    }
  },

  getStoredToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  },

  getStoredUsuario(): any | null {
    if (typeof window !== 'undefined') {
      const usuarioStr = localStorage.getItem('usuario');
      return usuarioStr ? JSON.parse(usuarioStr) : null;
    }
    return null;
  },

  setAuthData(accessToken: string, usuario: any): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('usuario', JSON.stringify(usuario));
    }
  },
};
