import apiClient from '@/lib/axios';

export interface EstructuraItem {
  id: string;
  nombre: string;
  activo?: boolean;
  createdAt?: string;
}

export interface CreateEstructuraDto {
  nombre: string;
  activo?: boolean;
}

export interface UpdateEstructuraDto {
  nombre?: string;
  activo?: boolean;
}

export const estructuraService = {
  // Unidades
  async findUnidades(empresaId: string): Promise<EstructuraItem[]> {
    const response = await apiClient.get<EstructuraItem[]>(`/empresas/${empresaId}/unidades`);
    return response.data;
  },
  async createUnidad(empresaId: string, data: CreateEstructuraDto): Promise<EstructuraItem> {
    const response = await apiClient.post<EstructuraItem>(`/empresas/${empresaId}/unidades`, data);
    return response.data;
  },
  async updateUnidad(empresaId: string, id: string, data: UpdateEstructuraDto): Promise<EstructuraItem> {
    const response = await apiClient.patch<EstructuraItem>(`/empresas/${empresaId}/unidades/${id}`, data);
    return response.data;
  },
  async removeUnidad(empresaId: string, id: string): Promise<void> {
    await apiClient.delete(`/empresas/${empresaId}/unidades/${id}`);
  },

  // Sedes
  async findSedes(empresaId: string): Promise<EstructuraItem[]> {
    const response = await apiClient.get<EstructuraItem[]>(`/empresas/${empresaId}/sedes`);
    return response.data;
  },
  async createSede(empresaId: string, data: CreateEstructuraDto): Promise<EstructuraItem> {
    const response = await apiClient.post<EstructuraItem>(`/empresas/${empresaId}/sedes`, data);
    return response.data;
  },
  async updateSede(empresaId: string, id: string, data: UpdateEstructuraDto): Promise<EstructuraItem> {
    const response = await apiClient.patch<EstructuraItem>(`/empresas/${empresaId}/sedes/${id}`, data);
    return response.data;
  },
  async removeSede(empresaId: string, id: string): Promise<void> {
    await apiClient.delete(`/empresas/${empresaId}/sedes/${id}`);
  },

  // Gerencias
  async findGerencias(empresaId: string): Promise<EstructuraItem[]> {
    const response = await apiClient.get<EstructuraItem[]>(`/empresas/${empresaId}/gerencias`);
    return response.data;
  },
  async createGerencia(empresaId: string, data: CreateEstructuraDto): Promise<EstructuraItem> {
    const response = await apiClient.post<EstructuraItem>(`/empresas/${empresaId}/gerencias`, data);
    return response.data;
  },
  async updateGerencia(empresaId: string, id: string, data: UpdateEstructuraDto): Promise<EstructuraItem> {
    const response = await apiClient.patch<EstructuraItem>(`/empresas/${empresaId}/gerencias/${id}`, data);
    return response.data;
  },
  async removeGerencia(empresaId: string, id: string): Promise<void> {
    await apiClient.delete(`/empresas/${empresaId}/gerencias/${id}`);
  },
};
