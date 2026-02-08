import apiClient from '@/lib/axios';

export enum TipoInspeccion {
  SeguridadGeneral = 'Seguridad General',
  EPP = 'EPP',
  EquiposMaquinaria = 'Equipos y Maquinaria',
  OrdenLimpieza = 'Orden y Limpieza',
  Ambiental = 'Ambiental',
  Ergonómica = 'Ergonómica',
  Vehiculos = 'Vehículos',
}

export enum EstadoInspeccion {
  Planificada = 'Planificada',
  Completada = 'Completada',
  ConHallazgosPendientes = 'Con Hallazgos Pendientes',
}

export enum CriticidadHallazgo {
  Baja = 'Baja',
  Media = 'Media',
  Alta = 'Alta',
  Critica = 'Crítica',
}

export enum EstadoHallazgo {
  Pendiente = 'Pendiente',
  EnProceso = 'En Proceso',
  Corregido = 'Corregido/Cerrado',
}

export interface HallazgoDto {
  descripcion: string;
  criticidad: CriticidadHallazgo;
  foto_url?: string;
  accion_correctiva: string;
  responsable_id: string;
  fecha_limite: string;
  estado?: string;
}

export interface HallazgoResponseDto {
  id: string;
  descripcion: string;
  criticidad: CriticidadHallazgo;
  foto_url: string | null;
  accion_correctiva: string;
  responsable_id: string;
  responsable_nombre: string | null;
  fecha_limite: string;
  estado_hallazgo: EstadoHallazgo;
}

export interface Inspeccion {
  id: string;
  tipo_inspeccion: TipoInspeccion;
  fecha_inspeccion: string;
  puntuacion: number;
  observaciones: string | null;
  fotos_generales: string[] | null;
  estado: EstadoInspeccion;
  inspector_id: string;
  inspector_nombre: string | null;
  area_id: string | null;
  area_nombre: string | null;
  empresa_id: string;
  hallazgos: HallazgoResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInspeccionDto {
  tipo_inspeccion: TipoInspeccion;
  fecha_inspeccion: string;
  puntuacion?: number;
  observaciones?: string;
  fotos_generales?: string[];
  estado?: EstadoInspeccion;
  hallazgos?: HallazgoDto[];
  empresa_id: string;
  area_id?: string;
  inspector_id: string;
}

export interface UpdateInspeccionDto {
  tipo_inspeccion?: TipoInspeccion;
  fecha_inspeccion?: string;
  puntuacion?: number;
  observaciones?: string;
  fotos_generales?: string[];
  estado?: EstadoInspeccion;
}

export const inspeccionesService = {
  async findAll(empresaId?: string): Promise<Inspeccion[]> {
    const params = empresaId ? { empresa_id: empresaId } : {};
    const response = await apiClient.get<Inspeccion[]>('/inspecciones', { params });
    return response.data;
  },

  async findOne(id: string): Promise<Inspeccion> {
    const response = await apiClient.get<Inspeccion>(`/inspecciones/${id}`);
    return response.data;
  },

  async create(data: CreateInspeccionDto): Promise<Inspeccion> {
    const response = await apiClient.post<Inspeccion>('/inspecciones', data);
    return response.data;
  },

  async update(id: string, data: UpdateInspeccionDto): Promise<Inspeccion> {
    const response = await apiClient.patch<Inspeccion>(`/inspecciones/${id}`, data);
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/inspecciones/${id}`);
  },
};
