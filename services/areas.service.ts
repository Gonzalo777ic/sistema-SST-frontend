import apiClient from '@/lib/axios';

export interface Area {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  empresa_id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAreaDto {
  nombre: string;
  descripcion?: string;
  activo?: boolean;
  empresa_id: string;
}

export interface UpdateAreaDto {
  nombre?: string;
  descripcion?: string;
  activo?: boolean;
  empresa_id?: string;
}

export const areasService = {
  async findAll(empresaId?: string): Promise<Area[]> {
    const params = empresaId ? { empresa_id: empresaId } : {};
    const response = await apiClient.get<Area[]>('/areas', { params });
    return response.data;
  },

  async findOne(id: string): Promise<Area> {
    const response = await apiClient.get<Area>(`/areas/${id}`);
    return response.data;
  },

  async create(data: CreateAreaDto): Promise<Area> {
    const response = await apiClient.post<Area>('/areas', data);
    return response.data;
  },

  async update(id: string, data: UpdateAreaDto): Promise<Area> {
    const response = await apiClient.patch<Area>(`/areas/${id}`, data);
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/areas/${id}`);
  },
};
