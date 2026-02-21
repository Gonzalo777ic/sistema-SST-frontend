import apiClient from '@/lib/axios';

export enum TipoExamen {
  Ingreso = 'Ingreso',
  Periodico = 'Periódico',
  PreOcupacional = 'Pre-Ocupacional',
  Retiro = 'Retiro',
  Reingreso = 'Reingreso',
  PorExposicion = 'Por Exposición',
  Otros = 'Otros',
  Reubicacion = 'Reubicación',
}

export enum ResultadoExamen {
  Apto = 'Apto',
  AptoConRestricciones = 'Apto con Restricciones',
  NoApto = 'No Apto',
  Pendiente = 'Pendiente',
}

export enum EstadoExamen {
  Programado = 'Programado',
  Realizado = 'Realizado',
  Vencido = 'Vencido',
  PorVencer = 'Por Vencer',
  Revisado = 'Revisado',
}

export enum EstadoCita {
  Programada = 'Programada',
  Confirmada = 'Confirmada',
  Completada = 'Completada',
  Cancelada = 'Cancelada',
  NoAsistio = 'No Asistió',
}

export enum DiaSemana {
  Lunes = 'Lunes',
  Martes = 'Martes',
  Miercoles = 'Miércoles',
  Jueves = 'Jueves',
  Viernes = 'Viernes',
  Sabado = 'Sábado',
  Domingo = 'Domingo',
}

export interface ExamenMedico {
  id: string;
  trabajador_id: string;
  trabajador_nombre: string | null;
  trabajador_documento?: string | null;
  proyecto?: string | null;
  sede?: string | null;
  tipo_examen: TipoExamen;
  hora_programacion?: string | null;
  perfil_emo_id?: string | null;
  adicionales?: string | null;
  recomendaciones_personalizadas?: string | null;
  fecha_programada: string;
  fecha_realizado: string | null;
  fecha_vencimiento: string | null;
  centro_medico: string;
  medico_evaluador: string;
  resultado: ResultadoExamen;
  restricciones: string | null;
  observaciones: string | null;
  resultado_archivo_url: string | null;
  resultado_archivo_existe?: boolean;
  estado: EstadoExamen;
  revisado_por_doctor: boolean;
  doctor_interno_id: string | null;
  fecha_revision_doctor: string | null;
  cargado_por: string | null;
  cargado_por_id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComentarioMedico {
  id: string;
  examen_id: string;
  trabajador_id: string;
  doctor_id: string;
  doctor_nombre: string;
  comentario: string;
  recomendaciones: string | null;
  fecha_comentario: string;
  es_confidencial: boolean;
  leido_por_paciente: boolean;
  fecha_lectura: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CitaMedica {
  id: string;
  motivo: string;
  estado: EstadoCita;
  fecha_cita: string;
  hora_cita: string;
  duracion_minutos: number;
  fecha_confirmacion: string | null;
  notas_cita: string | null;
  doctor_nombre: string | null;
  trabajador_id: string;
  trabajador_nombre: string | null;
  doctor_id: string | null;
  examen_relacionado_id: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface HorarioDoctor {
  id: string;
  dia_semana: DiaSemana;
  hora_inicio: string;
  hora_fin: string;
  duracion_cita_minutos: number;
  activo: boolean;
  doctor_id: string;
  doctor_nombre: string | null;
  empresa_id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCitaMedicaDto {
  motivo: string;
  fecha_cita: string;
  hora_cita: string;
  duracion_minutos?: number;
  notas_cita?: string;
  doctor_nombre?: string;
  trabajador_id: string;
  doctor_id?: string;
  examen_relacionado_id?: string;
  estado?: EstadoCita;
}

export const saludService = {
  // Exámenes Médicos
  async findAllExamenes(
    trabajadorId?: string,
    centroMedicoId?: string,
  ): Promise<ExamenMedico[]> {
    const params: Record<string, string> = {};
    if (trabajadorId) params.trabajador_id = trabajadorId;
    if (centroMedicoId) params.centro_medico_id = centroMedicoId;
    const response = await apiClient.get<ExamenMedico[]>('/salud/examenes', {
      params,
    });
    return response.data;
  },

  async findOneExamen(id: string): Promise<ExamenMedico> {
    const response = await apiClient.get<ExamenMedico>(`/salud/examenes/${id}`);
    return response.data;
  },

  async updateExamen(
    id: string,
    dto: Partial<{
      tipo_examen: string;
      fecha_programada: string;
      fecha_realizado: string | null;
      fecha_vencimiento: string | null;
      centro_medico: string;
      medico_evaluador: string;
      hora_programacion: string;
      perfil_emo_id: string | null;
      proyecto: string;
      adicionales: string;
      recomendaciones_personalizadas: string;
      resultado: string;
      restricciones: string;
      observaciones: string;
      estado: string;
    }>,
  ): Promise<ExamenMedico> {
    const response = await apiClient.patch<ExamenMedico>(`/salud/examenes/${id}`, dto);
    return response.data;
  },

  async findDocumentosExamen(examenId: string): Promise<
    Array<{ id: string; tipo_etiqueta: string; nombre_archivo: string; url: string; created_at: string }>
  > {
    const response = await apiClient.get(`/salud/examenes/${examenId}/documentos`);
    return response.data;
  },

  async uploadDocumentoExamen(
    examenId: string,
    file: File,
    tipoEtiqueta: string,
  ): Promise<{ id: string; url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tipo_etiqueta', tipoEtiqueta);
    const response = await apiClient.post<{ id: string; url: string }>(
      `/salud/examenes/${examenId}/documentos`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  async removeDocumentoExamen(examenId: string, docId: string): Promise<void> {
    await apiClient.delete(`/salud/examenes/${examenId}/documentos/${docId}`);
  },

  async notificarResultadosListos(examenId: string): Promise<ExamenMedico> {
    const response = await apiClient.post<ExamenMedico>(`/salud/examenes/${examenId}/notificar-resultados`);
    return response.data;
  },

  async createExamen(dto: {
    trabajador_id: string;
    tipo_examen: string;
    fecha_programada: string;
    hora_programacion?: string;
    centro_medico: string;
    medico_evaluador?: string;
    perfil_emo_id?: string;
    proyecto?: string;
    adicionales?: string;
    recomendaciones_personalizadas?: string;
    cargado_por_id: string;
  }): Promise<ExamenMedico> {
    const response = await apiClient.post<ExamenMedico>('/salud/examenes', dto);
    return response.data;
  },

  // Comentarios Médicos
  async findAllComentarios(
    examenId?: string,
    trabajadorId?: string,
  ): Promise<ComentarioMedico[]> {
    const params: Record<string, string> = {};
    if (examenId) params.examen_id = examenId;
    if (trabajadorId) params.trabajador_id = trabajadorId;
    const response = await apiClient.get<ComentarioMedico[]>('/salud/comentarios', {
      params,
    });
    return response.data;
  },

  async findOneComentario(id: string): Promise<ComentarioMedico> {
    // El backend marca automáticamente como leído cuando se obtiene un comentario
    const response = await apiClient.get<ComentarioMedico>(
      `/salud/comentarios/${id}`,
    );
    return response.data;
  },

  // Citas Médicas
  async findAllCitas(
    trabajadorId?: string,
    doctorId?: string,
    centroMedicoId?: string,
  ): Promise<CitaMedica[]> {
    const params: Record<string, string> = {};
    if (trabajadorId) params.trabajador_id = trabajadorId;
    if (doctorId) params.doctor_id = doctorId;
    if (centroMedicoId) params.centro_medico_id = centroMedicoId;
    const response = await apiClient.get<CitaMedica[]>('/salud/citas', {
      params,
    });
    return response.data;
  },

  async findOneCita(id: string): Promise<CitaMedica> {
    const response = await apiClient.get<CitaMedica>(`/salud/citas/${id}`);
    return response.data;
  },

  async createCita(dto: CreateCitaMedicaDto): Promise<CitaMedica> {
    const response = await apiClient.post<CitaMedica>('/salud/citas', dto);
    return response.data;
  },

  // Horarios Doctor
  async findAllHorarios(
    doctorId?: string,
    empresaId?: string,
  ): Promise<HorarioDoctor[]> {
    const params: Record<string, string> = {};
    if (doctorId) params.doctor_id = doctorId;
    if (empresaId) params.empresa_id = empresaId;
    const response = await apiClient.get<HorarioDoctor[]>('/salud/horarios', {
      params,
    });
    return response.data.filter((h) => h.activo);
  },
};
