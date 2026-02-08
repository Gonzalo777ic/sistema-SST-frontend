import apiClient from '@/lib/axios';

export enum CategoriaDocumento {
  Politicas = 'Políticas',
  Reglamentos = 'Reglamentos',
  Procedimientos = 'Procedimientos',
  Manuales = 'Manuales',
  Matrices = 'Matrices',
  Planes = 'Planes',
  Estandares = 'Estándares',
}

export interface DocumentoSST {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: CategoriaDocumento;
  version: string;
  fecha_publicacion: string;
  archivo_url: string;
  formato: string;
  tamano: number | null;
  activo: boolean;
  descargas_count: number;
  empresa_id: string;
  subido_por_id: string;
  subido_por: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDocumentoSstDto {
  titulo: string;
  descripcion: string;
  categoria: CategoriaDocumento;
  version: string;
  fecha_publicacion: string;
  archivo_url: string;
  formato: string;
  tamano?: number;
  activo?: boolean;
  empresa_id: string;
  subido_por_id: string;
}

export interface UpdateDocumentoSstDto {
  titulo?: string;
  descripcion?: string;
  categoria?: CategoriaDocumento;
  version?: string;
  fecha_publicacion?: string;
  archivo_url?: string;
  formato?: string;
  tamano?: number;
  activo?: boolean;
}

/**
 * Convierte bytes a formato legible (MB, KB, etc.)
 */
export function formatFileSize(bytes: number | null): string {
  if (!bytes) return 'N/A';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const documentosSstService = {
  async findAll(
    empresaId?: string,
    activo?: boolean,
    categoria?: CategoriaDocumento,
  ): Promise<DocumentoSST[]> {
    const params: any = {};
    if (empresaId) params.empresa_id = empresaId;
    if (activo !== undefined) params.activo = activo.toString();
    if (categoria) params.categoria = categoria;
    const response = await apiClient.get<DocumentoSST[]>('/documentos', { params });
    return response.data;
  },

  async findOne(id: string): Promise<DocumentoSST> {
    const response = await apiClient.get<DocumentoSST>(`/documentos/${id}`);
    return response.data;
  },

  async create(data: CreateDocumentoSstDto): Promise<DocumentoSST> {
    const response = await apiClient.post<DocumentoSST>('/documentos', data);
    return response.data;
  },

  async update(id: string, data: UpdateDocumentoSstDto): Promise<DocumentoSST> {
    const response = await apiClient.patch<DocumentoSST>(`/documentos/${id}`, data);
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/documentos/${id}`);
  },
};
