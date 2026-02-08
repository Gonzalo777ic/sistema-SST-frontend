import apiClient from '@/lib/axios';

export enum EstadoATS {
  Borrador = 'Borrador',
  Completado = 'Completado',
  Aprobado = 'Aprobado',
  EnEjecucion = 'En Ejecución',
  Finalizado = 'Finalizado',
}

export interface PersonalInvolucradoDto {
  nombre: string;
  documento: string;
  firma_url?: string;
}

export interface PasoTrabajoDto {
  numero: number;
  paso_tarea: string;
  peligros_riesgos: string;
  medidas_control: string;
  responsable?: string;
}

export interface PermisosEspecialesDto {
  trabajo_altura?: boolean;
  trabajo_caliente?: boolean;
  espacio_confinado?: boolean;
  excavacion?: boolean;
  energia_electrica?: boolean;
}

export interface CreateAtsDto {
  numero_ats?: string;
  fecha: string;
  area_id: string;
  ubicacion?: string;
  trabajo_a_realizar: string;
  hora_inicio?: string;
  hora_fin?: string;
  herramientas_equipos?: string;
  condiciones_climaticas?: string;
  observaciones?: string;
  epp_requerido?: string[];
  permisos_especiales?: PermisosEspecialesDto;
  elaborado_por?: string;
  supervisor?: string;
  firma_elaborador?: string;
  firma_supervisor_url?: string;
  personal_involucrado?: PersonalInvolucradoDto[];
  pasos_trabajo?: PasoTrabajoDto[];
  estado?: EstadoATS;
  empresa_id: string;
  elaborado_por_id: string;
  supervisor_id?: string;
}

export interface UpdateAtsDto extends Partial<CreateAtsDto> {}

export interface PersonalInvolucradoResponseDto {
  nombre: string;
  documento: string;
  firma_url: string | null;
}

export interface PasoTrabajoResponseDto {
  numero: number;
  paso_tarea: string;
  peligros_riesgos: string;
  medidas_control: string;
  responsable: string | null;
}

export interface ATS {
  id: string;
  numero_ats: string;
  fecha: string;
  area: string;
  area_id: string;
  ubicacion: string | null;
  estado: EstadoATS;
  hora_inicio: string | null;
  hora_fin: string | null;
  fecha_aprobacion: string | null;
  trabajo_a_realizar: string;
  herramientas_equipos: string | null;
  condiciones_climaticas: string | null;
  observaciones: string | null;
  epp_requerido: string[] | null;
  trabajo_altura: boolean;
  trabajo_caliente: boolean;
  espacio_confinado: boolean;
  excavacion: boolean;
  energia_electrica: boolean;
  firma_elaborador: string | null;
  firma_supervisor_url: string | null;
  pdf_url: string | null;
  historial_versiones: any[] | null;
  elaborado_por: string | null;
  supervisor: string | null;
  aprobado_por: string | null;
  personal_involucrado: PersonalInvolucradoResponseDto[];
  pasos_trabajo: PasoTrabajoResponseDto[];
  empresa_id: string;
  elaborado_por_id: string;
  supervisor_id: string | null;
  aprobado_por_id: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const atsService = {
  async findAll(empresaId?: string): Promise<ATS[]> {
    const params = empresaId ? { empresa_id: empresaId } : {};
    const response = await apiClient.get<ATS[]>('/ats', { params });
    return response.data;
  },

  async findOne(id: string): Promise<ATS> {
    const response = await apiClient.get<ATS>(`/ats/${id}`);
    return response.data;
  },

  async create(dto: CreateAtsDto): Promise<ATS> {
    const response = await apiClient.post<ATS>('/ats', dto);
    return response.data;
  },

  async update(id: string, dto: UpdateAtsDto): Promise<ATS> {
    const response = await apiClient.patch<ATS>(`/ats/${id}`, dto);
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/ats/${id}`);
  },
};
