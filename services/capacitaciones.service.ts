import apiClient from '@/lib/axios';

export enum TipoCapacitacion {
  Induccion = 'Inducción',
  TrabajoAltura = 'Trabajo en Altura',
  EspaciosConfinados = 'Espacios Confinados',
  PrimerosAuxilios = 'Primeros Auxilios',
  ManejoEPP = 'Manejo de EPP',
  PrevencionIncendios = 'Prevención de Incendios',
  ManejoDefensivo = 'Manejo Defensivo',
  IzajeSenalizacion = 'Izaje y Señalización',
  RiesgosElectricos = 'Riesgos Eléctricos',
  Otra = 'Otra',
}

export enum EstadoCapacitacion {
  Programada = 'Programada',
  Completada = 'Completada',
  Cancelada = 'Cancelada',
}

export interface ParticipanteDto {
  trabajador_id: string;
  nombre: string;
  asistencia?: boolean;
  calificacion?: number;
  aprobado?: boolean;
}

export interface PreguntaDto {
  texto_pregunta: string;
  tipo: 'OpcionMultiple' | 'VerdaderoFalso';
  opciones: string[];
  respuesta_correcta_index: number;
  puntaje: number;
}

export interface ExamenDto {
  id: string;
  titulo: string;
  duracion_minutos: number;
  puntaje_minimo_aprobacion: number;
  activo: boolean;
  preguntas_count: number;
}

export interface Capacitacion {
  id: string;
  titulo: string;
  descripcion: string;
  lugar: string;
  tipo: TipoCapacitacion;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  duracion_horas: number;
  estado: EstadoCapacitacion;
  instructor: string | null;
  material_url: string | null;
  certificado_url: string | null;
  participantes: ParticipanteDto[];
  examenes: ExamenDto[];
  empresa_id: string;
  creado_por: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCapacitacionDto {
  titulo: string;
  descripcion: string;
  lugar: string;
  tipo: TipoCapacitacion;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  duracion_horas: number;
  instructor?: string;
  instructor_id?: string;
  material_url?: string;
  certificado_url?: string;
  estado?: EstadoCapacitacion;
  participantes?: ParticipanteDto[];
  empresa_id: string;
  creado_por_id: string;
}

export interface CreateExamenDto {
  capacitacion_id: string;
  titulo: string;
  duracion_minutos?: number;
  puntaje_minimo_aprobacion?: number;
  preguntas: PreguntaDto[];
}

export const capacitacionesService = {
  async findAll(empresaId?: string): Promise<Capacitacion[]> {
    const params = empresaId ? { empresa_id: empresaId } : {};
    const response = await apiClient.get<Capacitacion[]>('/capacitaciones', { params });
    return response.data;
  },

  async findOne(id: string): Promise<Capacitacion> {
    const response = await apiClient.get<Capacitacion>(`/capacitaciones/${id}`);
    return response.data;
  },

  async create(data: CreateCapacitacionDto): Promise<Capacitacion> {
    const response = await apiClient.post<Capacitacion>('/capacitaciones', data);
    return response.data;
  },

  async update(id: string, data: Partial<CreateCapacitacionDto>): Promise<Capacitacion> {
    const response = await apiClient.patch<Capacitacion>(`/capacitaciones/${id}`, data);
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/capacitaciones/${id}`);
  },

  async crearExamen(capacitacionId: string, data: Omit<CreateExamenDto, 'capacitacion_id'>): Promise<any> {
    const response = await apiClient.post(`/capacitaciones/${capacitacionId}/examenes`, {
      ...data,
      capacitacion_id: capacitacionId,
    });
    return response.data;
  },

  async obtenerExamenes(capacitacionId: string): Promise<any[]> {
    const response = await apiClient.get(`/capacitaciones/${capacitacionId}/examenes`);
    return response.data;
  },

  async actualizarAsistencia(
    capacitacionId: string,
    trabajadorId: string,
    asistencia: boolean,
    calificacion?: number,
  ): Promise<void> {
    await apiClient.patch(`/capacitaciones/${capacitacionId}/asistencias/${trabajadorId}`, {
      asistencia,
      calificacion,
    });
  },
};
