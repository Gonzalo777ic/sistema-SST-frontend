import apiClient from '@/lib/axios';
import { LoginRequest, LoginResponse, Usuario, EmpresaVinculada } from '@/types';
import { usuariosService } from './usuarios.service';

export const authService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>(
      '/auth/login',
      credentials
    );
    return response.data;
  },

  async register(data: {
    dni: string;
    password: string;
    roles: string[];
    empresaId?: string;
  }): Promise<{ id: string; dni: string }> {
    const response = await apiClient.post('/auth/register', {
      ...data,
      authProvider: 'LOCAL',
    });
    return response.data;
  },

  async getProfile(userId: string): Promise<Usuario> {
    const usuario = await usuariosService.findOne(userId);
    return usuario;
  },

  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('usuario');
      localStorage.removeItem('empresas_vinculadas');
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

  getStoredEmpresasVinculadas(): EmpresaVinculada[] | null {
    if (typeof window !== 'undefined') {
      const empresasStr = localStorage.getItem('empresas_vinculadas');
      return empresasStr ? JSON.parse(empresasStr) : null;
    }
    return null;
  },

  setAuthData(accessToken: string, usuario: any, empresasVinculadas?: EmpresaVinculada[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('usuario', JSON.stringify(usuario));
      if (empresasVinculadas) {
        localStorage.setItem('empresas_vinculadas', JSON.stringify(empresasVinculadas));
      }
    }
  },
};
