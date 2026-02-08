import apiClient from '@/lib/axios';

export enum TipoIncidente {
  Accidente = 'Accidente',
  Incidente = 'Incidente',
  CasiAccidente = 'Casi-Accidente',
  EnfermedadOcupacional = 'Enfermedad Ocupacional',
}

export enum SeveridadIncidente {
  Leve = 'Leve',
  Moderado = 'Moderado',
  Grave = 'Grave',
  Fatal = 'Fatal',
}

export enum EstadoIncidente {
  Reportado = 'Reportado',
  EnInvestigacion = 'En Investigación',
  AccionesEnCurso = 'Acciones en Curso',
  Cerrado = 'Cerrado',
}

export interface TestigoDto {
  nombre: string;
  documento?: string;
  contacto?: string;
}

export interface Incidente {
  id: string;
  tipo: TipoIncidente;
  severidad: SeveridadIncidente;
  fecha_hora: string;
  descripcion: string;
  parte_cuerpo_afectada: string | null;
  dias_perdidos: number;
  fotos: string[] | null;
  causas: string | null;
  acciones_inmediatas: string | null;
  testigos: TestigoDto[] | null;
  acciones_correctivas: string | null;
  estado: EstadoIncidente;
  area_trabajo: string;
  trabajador_afectado: string | null;
  trabajador_afectado_id: string | null;
  area_id: string | null;
  responsable_investigacion: string | null;
  responsable_investigacion_id: string | null;
  empresa_id: string;
  reportado_por: string | null;
  reportado_por_id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateIncidenteDto {
  tipo: TipoIncidente;
  severidad: SeveridadIncidente;
  fecha_hora: string;
  descripcion: string;
  area_trabajo: string;
  empresa_id: string;
  reportado_por_id: string;
  parte_cuerpo_afectada?: string;
  dias_perdidos?: number;
  fotos?: string[];
  causas?: string;
  acciones_inmediatas?: string;
  testigos?: TestigoDto[];
  acciones_correctivas?: string;
  estado?: EstadoIncidente;
  trabajador_afectado_id?: string;
  trabajador_afectado?: string;
  area_id?: string;
  responsable_investigacion_id?: string;
}

export interface UpdateIncidenteDto extends Partial<CreateIncidenteDto> {}

export const incidentesService = {
  async findAll(
    empresaId?: string,
    severidad?: SeveridadIncidente,
    search?: string,
  ): Promise<Incidente[]> {
    const params: Record<string, string> = {};
    if (empresaId) params.empresa_id = empresaId;
    if (severidad) params.severidad = severidad;
    if (search) params.search = search;
    const response = await apiClient.get<Incidente[]>('/incidentes', { params });
    return response.data;
  },

  async findOne(id: string): Promise<Incidente> {
    const response = await apiClient.get<Incidente>(`/incidentes/${id}`);
    return response.data;
  },

  async create(dto: CreateIncidenteDto): Promise<Incidente> {
    const response = await apiClient.post<Incidente>('/incidentes', dto);
    return response.data;
  },

  async update(id: string, dto: UpdateIncidenteDto): Promise<Incidente> {
    const response = await apiClient.patch<Incidente>(`/incidentes/${id}`, dto);
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/incidentes/${id}`);
  },
};
