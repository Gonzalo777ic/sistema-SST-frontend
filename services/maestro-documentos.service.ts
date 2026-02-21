import apiClient from '@/lib/axios';

export interface MaestroDocumento {
  id: string;
  nombre: string;
  proceso: string;
  subproceso: string;
  empresa_id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMaestroDocumentoDto {
  nombre: string;
  proceso: string;
  subproceso: string;
  empresa_id: string;
}

export interface UpdateMaestroDocumentoDto {
  nombre?: string;
  proceso?: string;
  subproceso?: string;
}

export const maestroDocumentosService = {
  async findAll(
    empresaId?: string,
    nombre?: string,
    proceso?: string,
  ): Promise<MaestroDocumento[]> {
    const params: Record<string, string> = {};
    if (empresaId) params.empresa_id = empresaId;
    if (nombre) params.nombre = nombre;
    if (proceso) params.proceso = proceso;
    const response = await apiClient.get<MaestroDocumento[]>('/maestro-documentos', {
      params,
    });
    return response.data;
  },

  async findOne(id: string): Promise<MaestroDocumento> {
    const response = await apiClient.get<MaestroDocumento>(`/maestro-documentos/${id}`);
    return response.data;
  },

  async create(data: CreateMaestroDocumentoDto): Promise<MaestroDocumento> {
    const response = await apiClient.post<MaestroDocumento>('/maestro-documentos', data);
    return response.data;
  },

  async update(id: string, data: UpdateMaestroDocumentoDto): Promise<MaestroDocumento> {
    const response = await apiClient.patch<MaestroDocumento>(`/maestro-documentos/${id}`, data);
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/maestro-documentos/${id}`);
  },
};
