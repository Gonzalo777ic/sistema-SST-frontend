import apiClient from '@/lib/axios';

export enum TipoDocumentoContratista {
  RUC = 'RUC',
  SCTR = 'SCTR',
  Poliza = 'Póliza',
  ISO = 'ISO',
  PlanSST = 'Plan SST',
  Otro = 'Otro',
}

export enum EstadoDocumento {
  Vigente = 'Vigente',
  PorVencer = 'Por Vencer',
  Vencido = 'Vencido',
  Pendiente = 'Pendiente',
}

export interface DocumentoContratista {
  id: string;
  tipo_documento: TipoDocumentoContratista;
  archivo_url: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  estado_doc: EstadoDocumento;
}

export interface Contratista {
  id: string;
  ruc: string;
  razon_social: string;
  tipo_servicio: string;
  representante_legal: string;
  contacto_principal: string;
  telefono: string;
  email: string;
  estado: string;
  evaluacion_desempeno: number | null;
  observaciones: string | null;
  supervisor_asignado_id: string | null;
  supervisor_asignado_nombre: string | null;
  empresa_id: string;
  documentos: DocumentoContratista[];
  createdAt: Date;
  updatedAt: Date;
}

export const contratistasService = {
  async findAll(empresaId?: string): Promise<Contratista[]> {
    const params: Record<string, string> = {};
    if (empresaId) params.empresa_id = empresaId;
    const response = await apiClient.get<Contratista[]>('/contratistas', {
      params,
    });
    return response.data;
  },

  async findOne(id: string): Promise<Contratista> {
    const response = await apiClient.get<Contratista>(`/contratistas/${id}`);
    return response.data;
  },
};
