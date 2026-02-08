import apiClient from '@/lib/axios';

export enum TipoTrabajoPETAR {
  TrabajoAltura = 'Trabajo en Altura',
  EspacioConfinado = 'Espacio Confinado',
  TrabajosCaliente = 'Trabajos en Caliente',
  IzajeCargas = 'Izaje de Cargas',
  TrabajosElectricos = 'Trabajos Eléctricos',
  Excavaciones = 'Excavaciones',
  Otro = 'Otro',
}

export enum EstadoPETAR {
  Borrador = 'Borrador',
  PendienteAprobacion = 'Pendiente de Aprobación',
  Aprobado = 'Aprobado',
  EnEjecucion = 'En Ejecución',
  Cerrado = 'Cerrado',
  Anulado = 'Anulado',
}

export interface TrabajadorPetarDto {
  trabajador_id?: string;
  nombre: string;
  documento: string;
  email?: string;
}

export interface PeligroPetarDto {
  peligro: string;
  riesgo: string;
  nivel_inicial: string;
  medida_control: string;
  nivel_residual: string;
}

export interface CondicionPreviaDto {
  condicion: string;
  verificado: boolean;
}

export interface ChecklistVerificacionDto {
  item: string;
  cumple: boolean;
  observacion?: string;
}

export interface PETAR {
  id: string;
  codigo: string;
  tipo_trabajo: TipoTrabajoPETAR;
  descripcion_tarea: string;
  area: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: EstadoPETAR;
  equipos_herramientas: string | null;
  epp_requerido: string[] | null;
  condiciones_previas: CondicionPreviaDto[] | null;
  checklist_verificacion: ChecklistVerificacionDto[] | null;
  peligros: PeligroPetarDto[] | null;
  observaciones: string | null;
  supervisor_responsable: string | null;
  firma_supervisor_url: string | null;
  fecha_firma_supervisor: string | null;
  aprobador_sst: string | null;
  firma_sst_url: string | null;
  fecha_firma_sst: string | null;
  empresa_contratista: string | null;
  trabajadores: TrabajadorPetarDto[];
  empresa_id: string;
  supervisor_responsable_id: string;
  aprobador_sst_id: string | null;
  empresa_contratista_id: string | null;
  creado_por_id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePetarDto {
  codigo?: string;
  tipo_trabajo: TipoTrabajoPETAR;
  descripcion_tarea: string;
  area: string;
  fecha_inicio: string;
  fecha_fin: string;
  equipos_herramientas?: string;
  epp_requerido?: string[];
  condiciones_previas?: CondicionPreviaDto[];
  checklist_verificacion?: ChecklistVerificacionDto[];
  peligros?: PeligroPetarDto[];
  observaciones?: string;
  supervisor_responsable_id: string;
  empresa_contratista_id?: string;
  firma_supervisor_url?: string;
  firma_sst_url?: string;
  aprobador_sst?: string;
  estado?: EstadoPETAR;
  empresa_id: string;
  creado_por_id: string;
  trabajadores?: TrabajadorPetarDto[];
}

export interface UpdatePetarDto extends Partial<CreatePetarDto> {}

export const petarService = {
  async findAll(empresaId?: string): Promise<PETAR[]> {
    const params = empresaId ? { empresa_id: empresaId } : {};
    const response = await apiClient.get<PETAR[]>('/petar', { params });
    return response.data;
  },

  async findOne(id: string): Promise<PETAR> {
    const response = await apiClient.get<PETAR>(`/petar/${id}`);
    return response.data;
  },

  async create(dto: CreatePetarDto): Promise<PETAR> {
    const response = await apiClient.post<PETAR>('/petar', dto);
    return response.data;
  },

  async update(id: string, dto: UpdatePetarDto): Promise<PETAR> {
    const response = await apiClient.patch<PETAR>(`/petar/${id}`, dto);
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/petar/${id}`);
  },
};
