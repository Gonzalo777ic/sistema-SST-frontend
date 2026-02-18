import apiClient from '@/lib/axios';
import { Usuario, UsuarioRol } from '@/types';

export interface CreateUsuarioDto {
  dni: string;
  password?: string;
  roles: UsuarioRol[];
  empresaId?: string;
  trabajadorId?: string;
  centroMedicoId?: string;
}

export interface UpdateUsuarioDto {
  roles?: UsuarioRol[];
  activo?: boolean;
  empresaId?: string;
  trabajadorId?: string | null;
  centroMedicoId?: string | null;
  perfil_completado?: boolean;
  debe_cambiar_password?: boolean;
}

export interface UpdatePerfilAdminDto {
  nombres?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  dni?: string;
  firma_base64?: string;
}

export interface ChangePasswordDto {
  nueva_password: string;
  confirmacion_password: string;
}

export interface ResetPasswordDto {
  usuario_id: string;
}

export const usuariosService = {
  async findAll(): Promise<Usuario[]> {
    const response = await apiClient.get<Usuario[]>('/usuarios');
    return response.data;
  },

  async findOne(id: string): Promise<Usuario> {
    const response = await apiClient.get<Usuario>(`/usuarios/${id}`);
    return response.data;
  },

  async findByDni(dni: string): Promise<Usuario | null> {
    try {
      const response = await apiClient.get<Usuario | null>(`/usuarios/dni/${dni}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async create(data: CreateUsuarioDto): Promise<Usuario> {
    const response = await apiClient.post<Usuario>('/usuarios', data);
    return response.data;
  },

  async update(id: string, data: UpdateUsuarioDto): Promise<Usuario> {
    const response = await apiClient.patch<Usuario>(`/usuarios/${id}`, data);
    return response.data;
  },

  async updatePerfilAdmin(data: UpdatePerfilAdminDto): Promise<Usuario> {
    const response = await apiClient.patch<Usuario>('/usuarios/me/perfil-admin', data);
    return response.data;
  },

  async changePassword(id: string, data: ChangePasswordDto): Promise<void> {
    await apiClient.post(`/usuarios/${id}/change-password`, data);
  },

  async resetPassword(id: string): Promise<void> {
    await apiClient.post(`/usuarios/${id}/reset-password`);
  },
};
