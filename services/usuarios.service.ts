import apiClient from '@/lib/axios';
import { Usuario, UsuarioRol } from '@/types';

export interface CreateUsuarioDto {
  email: string;
  password?: string;
  roles: UsuarioRol[];
  empresaId?: string;
  trabajadorId?: string;
}

export interface UpdateUsuarioDto {
  roles?: UsuarioRol[];
  activo?: boolean;
  empresaId?: string;
  trabajadorId?: string;
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

  async create(data: CreateUsuarioDto): Promise<Usuario> {
    const response = await apiClient.post<Usuario>('/usuarios', data);
    return response.data;
  },

  async update(id: string, data: UpdateUsuarioDto): Promise<Usuario> {
    const response = await apiClient.patch<Usuario>(`/usuarios/${id}`, data);
    return response.data;
  },
};
