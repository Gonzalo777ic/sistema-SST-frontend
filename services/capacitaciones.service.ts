import apiClient from '@/lib/axios';

export enum TipoCapacitacion {
  Capacitacion = 'Capacitación',
  CapacitacionObligatoria = 'Capacitación obligatoria',
  Charla = 'Charla',
  Charla5Minutos = 'Charla 5 minutos',
  CharlaSST = 'Charla de seguridad y salud en el trabajo',
  PausasActivas = 'Pausas activas',
  SimulacroEmergencia = 'Simulacro de emergencia',
  TomaConsciencia = 'Toma de consciencia',
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
  Pendiente = 'PENDIENTE',
  Programada = 'PROGRAMADA',
  Completada = 'COMPLETADA',
  Cancelada = 'Cancelada',
}

export interface ParticipanteDto {
  trabajador_id: string;
  nombre: string;
  asistencia?: boolean;
  calificacion?: number;
  aprobado?: boolean;
  firmo?: boolean;
  rendio_examen?: boolean;
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

export interface AdjuntoCapacitacion {
  id: string;
  titulo: string;
  archivo_url: string;
  nombre_archivo: string;
  fecha_registro: string;
  registrado_por: string;
}

export interface PreguntaParaTrabajador {
  texto_pregunta: string;
  tipo: 'OpcionMultiple' | 'VerdaderoFalso';
  opciones: string[];
}

export interface PasoInstruccion {
  id: string;
  descripcion: string;
  esEvaluacion: boolean;
  imagenUrl?: string;
  firmaRegistro?: boolean;
  preguntas?: PreguntaParaTrabajador[];
}

export interface Capacitacion {
  id: string;
  titulo: string;
  descripcion: string;
  lugar: string | null;
  tipo: TipoCapacitacion;
  firma_capacitador_url?: string | null;
  fecha: string;
  fecha_fin: string | null;
  sede: string | null;
  unidad: string | null;
  area?: string | null;
  grupo?: string | null;
  instrucciones?: PasoInstruccion[] | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  duracion_horas: number | null;
  duracion_minutos: number | null;
  duracion_hhmm: string | null;
  estado: EstadoCapacitacion;
  instructor: string | null;
  material_url: string | null;
  certificado_url: string | null;
  participantes: ParticipanteDto[];
  examenes: ExamenDto[];
  empresa_id: string;
  empresa_nombre: string | null;
  creado_por: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCapacitacionDto {
  titulo: string;
  descripcion: string;
  lugar?: string;
  tipo: TipoCapacitacion;
  fecha: string;
  fecha_fin?: string;
  sede?: string;
  unidad?: string;
  area?: string;
  grupo?: string;
  instrucciones?: PasoInstruccion[];
  hora_inicio?: string;
  hora_fin?: string;
  duracion_horas?: number;
  duracion_hhmm?: string;
  duracion_minutos?: number;
  instructor?: string;
  instructor_id?: string;
  firma_capacitador_url?: string;
  material_url?: string;
  certificado_url?: string;
  estado?: EstadoCapacitacion;
  participantes?: ParticipanteDto[];
  empresa_id?: string;
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
  async findMisCapacitaciones(filters?: {
    estadoRegistro?: 'pendiente' | 'completado';
    grupo?: string;
    tipo?: string;
  }): Promise<Capacitacion[]> {
    const params: Record<string, string> = {};
    if (filters?.estadoRegistro) params.estado_registro = filters.estadoRegistro;
    if (filters?.grupo) params.grupo = filters.grupo;
    if (filters?.tipo) params.tipo = filters.tipo;
    const response = await apiClient.get<Capacitacion[]>('/capacitaciones/mis-capacitaciones', { params });
    return response.data;
  },

  async findAll(filters?: {
    empresaId?: string;
    tipo?: string;
    tema?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    estado?: string;
    razonSocial?: string;
    grupo?: string;
    area?: string;
    responsable?: string;
    unidad?: string;
  }): Promise<Capacitacion[]> {
    const params: Record<string, string> = {};
    if (filters?.empresaId) params.empresa_id = filters.empresaId;
    if (filters?.tipo) params.tipo = filters.tipo;
    if (filters?.tema) params.tema = filters.tema;
    if (filters?.fechaDesde) params.fecha_desde = filters.fechaDesde;
    if (filters?.fechaHasta) params.fecha_hasta = filters.fechaHasta;
    if (filters?.estado) params.estado = filters.estado;
    if (filters?.razonSocial) params.razon_social = filters.razonSocial;
    if (filters?.grupo) params.grupo = filters.grupo;
    if (filters?.area) params.area = filters.area;
    if (filters?.responsable) params.responsable = filters.responsable;
    if (filters?.unidad) params.unidad = filters.unidad;
    const response = await apiClient.get<Capacitacion[]>('/capacitaciones', { params });
    return response.data;
  },

  async findOne(id: string): Promise<Capacitacion> {
    const response = await apiClient.get<Capacitacion>(`/capacitaciones/${id}`);
    return response.data;
  },

  async findOneParaTrabajador(id: string): Promise<Capacitacion> {
    const response = await apiClient.get<Capacitacion>(`/capacitaciones/${id}/para-trabajador`);
    return response.data;
  },

  async evaluarPaso(capacitacionId: string, pasoId: string, respuestas: { pregunta_index: number; respuesta_seleccionada: number }[]): Promise<{
    aprobado: boolean;
    puntaje: number;
    puntaje_total: number;
    intentos_usados: number;
    intentos_restantes: number;
  }> {
    const response = await apiClient.post(`/capacitaciones/${capacitacionId}/evaluar-paso`, {
      paso_id: pasoId,
      respuestas,
    });
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
    aprobado?: boolean,
    firmo?: boolean,
  ): Promise<void> {
    await apiClient.patch(`/capacitaciones/${capacitacionId}/asistencias/${trabajadorId}`, {
      asistencia,
      calificacion,
      aprobado,
      firmo,
    });
  },

  async retirarParticipante(capacitacionId: string, trabajadorId: string): Promise<void> {
    await apiClient.delete(`/capacitaciones/${capacitacionId}/participantes/${trabajadorId}`);
  },

  async obtenerUrlCertificado(capacitacionId: string, trabajadorId: string): Promise<{ url: string }> {
    const response = await apiClient.get<{ url: string }>(`/capacitaciones/${capacitacionId}/certificado/${trabajadorId}`);
    return response.data;
  },

  async obtenerResultadoEvaluacion(capacitacionId: string, trabajadorId: string): Promise<any> {
    const response = await apiClient.get(`/capacitaciones/${capacitacionId}/resultado-evaluacion/${trabajadorId}`);
    return response.data;
  },

  async obtenerAdjuntos(capacitacionId: string): Promise<AdjuntoCapacitacion[]> {
    const response = await apiClient.get<AdjuntoCapacitacion[]>(`/capacitaciones/${capacitacionId}/adjuntos`);
    return response.data;
  },

  async crearAdjunto(capacitacionId: string, titulo: string, file: File): Promise<{ id: string }> {
    const formData = new FormData();
    formData.append('titulo', titulo);
    formData.append('file', file);
    const response = await apiClient.post<{ id: string }>(`/capacitaciones/${capacitacionId}/adjuntos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async eliminarAdjunto(adjuntoId: string): Promise<void> {
    await apiClient.delete(`/capacitaciones/adjuntos/${adjuntoId}`);
  },

  async obtenerEvaluacionesFavoritas(empresaId?: string): Promise<{ id: string; nombre: string; preguntas: any[] }[]> {
    const params = empresaId ? { empresa_id: empresaId } : {};
    const response = await apiClient.get<{ id: string; nombre: string; preguntas: any[] }[]>('/capacitaciones/evaluaciones-favoritas', { params });
    return response.data;
  },

  async crearEvaluacionFavorita(nombre: string, preguntas: any[]): Promise<{ id: string }> {
    const response = await apiClient.post<{ id: string }>('/capacitaciones/evaluaciones-favoritas', { nombre, preguntas });
    return response.data;
  },

  async eliminarEvaluacionFavorita(id: string): Promise<void> {
    await apiClient.delete(`/capacitaciones/evaluaciones-favoritas/${id}`);
  },

  async agregarParticipante(capacitacionId: string, trabajadorId: string): Promise<Capacitacion> {
    const response = await apiClient.post<Capacitacion>(`/capacitaciones/${capacitacionId}/participantes`, {
      trabajador_id: trabajadorId,
    });
    return response.data;
  },
};
