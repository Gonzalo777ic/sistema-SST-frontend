import apiClient from '@/lib/axios';

export enum EstadoDifusion {
  EnProceso = 'En proceso',
  Cerrada = 'Cerrada',
}

export interface DifusionDocumento {
  id: string;
  documento_id: string;
  documento_nombre: string;
  fecha_difusion: string;
  requiere_firma: boolean;
  estado: EstadoDifusion;
  empresa_id: string;
  empresa_nombre: string;
  responsable_id: string;
  responsable_nombre: string;
  total_trabajadores: number;
  total_firmas: number;
  cumplimiento_porcentaje: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDifusionDocumentoDto {
  documento_id: string;
  fecha_difusion: string;
  requiere_firma?: boolean;
  empresa_id: string;
  responsable_id: string;
}

export interface UpdateDifusionDocumentoDto {
  estado?: EstadoDifusion;
}

export const difusionesService = {
  async findAll(
    empresaId?: string,
    estado?: EstadoDifusion,
    documentoId?: string,
  ): Promise<DifusionDocumento[]> {
    const params: any = {};
    if (empresaId) params.empresa_id = empresaId;
    if (estado) params.estado = estado;
    if (documentoId) params.documento_id = documentoId;

    const response = await apiClient.get<DifusionDocumento[]>(
      '/documentos/difusiones',
      { params },
    );
    return response.data;
  },

  async findOne(id: string): Promise<DifusionDocumento> {
    const response = await apiClient.get<DifusionDocumento>(
      `/documentos/difusiones/${id}`,
    );
    return response.data;
  },

  async create(data: CreateDifusionDocumentoDto): Promise<DifusionDocumento> {
    const response = await apiClient.post<DifusionDocumento>(
      '/documentos/difusiones',
      data,
    );
    return response.data;
  },

  async update(
    id: string,
    data: UpdateDifusionDocumentoDto,
  ): Promise<DifusionDocumento> {
    const response = await apiClient.patch<DifusionDocumento>(
      `/documentos/difusiones/${id}`,
      data,
    );
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/documentos/difusiones/${id}`);
  },
};
