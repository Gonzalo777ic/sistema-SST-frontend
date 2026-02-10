import apiClient from '@/lib/axios';

export enum FuenteAccion {
  Accidentes = 'Accidentes',
  Inspecciones = 'Inspecciones',
  ActosCondiciones = 'Actos y Condiciones',
  Acuerdos = 'Acuerdos',
  Monitoreo = 'Monitoreo',
}

export enum EstadoAccion {
  PorAprobar = 'POR APROBAR',
  Aprobado = 'APROBADO',
  Atrasado = 'ATRASADO',
  Pendiente = 'PENDIENTE',
  Desaprobado = 'DESAPROBADO',
}

export interface AccionCorrectiva {
  id: string;
  fuente: FuenteAccion;
  titulo: string;
  descripcion: string | null;
  fecha_programada: string;
  fecha_ejecucion: string | null;
  fecha_aprobacion: string | null;
  estado: EstadoAccion;
  sede: string | null;
  unidad: string | null;
  empresa_id: string;
  empresa_nombre: string | null;
  area_id: string | null;
  area_nombre: string | null;
  elaborado_por_id: string;
  elaborado_por_nombre: string | null;
  responsable_levantamiento_id: string;
  responsable_levantamiento_nombre: string | null;
  contratista_id: string | null;
  contratista_nombre: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccionesKPIs {
  aprobados: number;
  pendientes: number;
  total: number;
}

export interface CreateAccionCorrectivaDto {
  fuente: FuenteAccion;
  titulo: string;
  descripcion?: string;
  fecha_programada: string;
  fecha_ejecucion?: string;
  fecha_aprobacion?: string;
  empresa_id: string;
  area_id?: string;
  elaborado_por_id: string;
  responsable_levantamiento_id: string;
  contratista_id?: string;
  sede?: string;
  unidad?: string;
}

export interface UpdateAccionCorrectivaDto {
  fuente?: FuenteAccion;
  titulo?: string;
  descripcion?: string;
  fecha_programada?: string;
  fecha_ejecucion?: string;
  fecha_aprobacion?: string;
  estado?: EstadoAccion;
  area_id?: string;
  responsable_levantamiento_id?: string;
  contratista_id?: string;
  sede?: string;
  unidad?: string;
}

export const accionesCorrectivasService = {
  async findAll(
    empresaId?: string,
    fuente?: FuenteAccion,
    estado?: EstadoAccion,
    responsableNombre?: string,
    titulo?: string,
    unidad?: string,
    areaId?: string,
    sede?: string,
    contratistaId?: string,
    fechaProgramadaDesde?: string,
    fechaProgramadaHasta?: string,
    page?: number,
    limit?: number,
  ): Promise<{ data: AccionCorrectiva[]; total: number; page: number; limit: number }> {
    const params: any = {};
    if (empresaId) params.empresa_id = empresaId;
    if (fuente) params.fuente = fuente;
    if (estado) params.estado = estado;
    if (responsableNombre) params.responsable = responsableNombre;
    if (titulo) params.titulo = titulo;
    if (unidad) params.unidad = unidad;
    if (areaId) params.area_id = areaId;
    if (sede) params.sede = sede;
    if (contratistaId) params.contratista_id = contratistaId;
    if (fechaProgramadaDesde) params.fecha_programada_desde = fechaProgramadaDesde;
    if (fechaProgramadaHasta) params.fecha_programada_hasta = fechaProgramadaHasta;
    if (page) params.page = page;
    if (limit) params.limit = limit;

    const response = await apiClient.get<{
      data: AccionCorrectiva[];
      total: number;
      page: number;
      limit: number;
    }>('/acciones-correctivas', { params });
    return response.data;
  },

  async findOne(id: string): Promise<AccionCorrectiva> {
    const response = await apiClient.get<AccionCorrectiva>(
      `/acciones-correctivas/${id}`,
    );
    return response.data;
  },

  async getKPIs(empresaId?: string): Promise<AccionesKPIs> {
    const params: any = {};
    if (empresaId) params.empresa_id = empresaId;
    const response = await apiClient.get<AccionesKPIs>('/acciones-correctivas/kpis', {
      params,
    });
    return response.data;
  },

  async create(data: CreateAccionCorrectivaDto): Promise<AccionCorrectiva> {
    const response = await apiClient.post<AccionCorrectiva>(
      '/acciones-correctivas',
      data,
    );
    return response.data;
  },

  async update(
    id: string,
    data: UpdateAccionCorrectivaDto,
  ): Promise<AccionCorrectiva> {
    const response = await apiClient.patch<AccionCorrectiva>(
      `/acciones-correctivas/${id}`,
      data,
    );
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/acciones-correctivas/${id}`);
  },
};
