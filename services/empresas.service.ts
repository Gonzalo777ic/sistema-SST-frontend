import apiClient from '@/lib/axios';

export interface Empresa {
  id: string;
  nombre: string;
  ruc: string;
  logoUrl: string | null;
  activo: boolean;
  areas?: { id: string; nombre: string }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEmpresaDto {
  nombre: string;
  ruc: string;
  logoUrl?: string;
  activo?: boolean;
}

export interface UpdateEmpresaDto {
  nombre?: string;
  ruc?: string;
  logoUrl?: string;
  activo?: boolean;
}

export interface Area {
  id: string;
  nombre: string;
}

export interface CreateAreaDto {
  nombre: string;
}

export const empresasService = {
  async uploadLogo(ruc: string, file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('ruc', ruc);
    const response = await apiClient.post<{ url: string }>('/empresas/upload-logo', formData);
    return response.data;
  },

  async findAll(): Promise<Empresa[]> {
    const response = await apiClient.get<Empresa[]>('/empresas');
    return response.data;
  },

  async findOne(id: string): Promise<Empresa> {
    const response = await apiClient.get<Empresa>(`/empresas/${id}`);
    return response.data;
  },

  async create(data: CreateEmpresaDto): Promise<Empresa> {
    const response = await apiClient.post<Empresa>('/empresas', data);
    return response.data;
  },

  async update(id: string, data: UpdateEmpresaDto): Promise<Empresa> {
    const response = await apiClient.patch<Empresa>(`/empresas/${id}`, data);
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/empresas/${id}`);
  },

  async findAreas(empresaId: string): Promise<Area[]> {
    const response = await apiClient.get<Area[]>(`/empresas/${empresaId}/areas`);
    return response.data;
  },

  async createArea(empresaId: string, data: CreateAreaDto): Promise<Area> {
    const response = await apiClient.post<Area>(
      `/empresas/${empresaId}/areas`,
      data
    );
    return response.data;
  },
};
