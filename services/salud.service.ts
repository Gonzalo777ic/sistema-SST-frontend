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
  PruebasCargadas = 'Pruebas Cargadas',
  Completado = 'Completado',
  Entregado = 'Entregado',
  Reprogramado = 'Reprogramado',
  Cancelado = 'Cancelado',
  Vencido = 'Vencido',
  PorVencer = 'Por Vencer',
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
  diagnosticos_cie10: Array<{ code: string; description: string }> | null;
  programas_vigilancia: string[] | null;
  resultado_archivo_url: string | null;
  resultado_archivo_existe?: boolean;
  estado: EstadoExamen;
  visto_por_admin?: boolean;
  revisado_por_doctor: boolean;
  doctor_interno_id: string | null;
  fecha_revision_doctor: string | null;
  cargado_por: string | null;
  cargado_por_id: string;
  /** Seguimientos (interconsultas y vigilancias) del EMO */
  seguimientos?: Array<{
    id: string;
    tipo: string;
    cie10_code: string;
    cie10_description: string | null;
    especialidad: string;
    estado: string;
    plazo: string;
    motivo: string | null;
  }>;
  /** Documentos subidos por centro médico (incluidos en findOneExamen) */
  documentos?: Array<{
    id: string;
    tipo_etiqueta: string;
    prueba_medica?: { id: string; nombre: string };
    nombre_archivo: string;
    url: string;
    created_at: string;
  }>;
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

  async getPruebasMedicas(incluirInactivos = false): Promise<Array<{ id: string; nombre: string; activo?: boolean }>> {
    const params = incluirInactivos ? { incluir_inactivos: 'true' } : {};
    const response = await apiClient.get<Array<{ id: string; nombre: string; activo?: boolean }>>('/salud/pruebas-medicas', { params });
    return response.data;
  },

  async createPruebaMedica(nombre: string): Promise<{ id: string; nombre: string; activo: boolean }> {
    const response = await apiClient.post<{ id: string; nombre: string; activo: boolean }>('/salud/pruebas-medicas', { nombre });
    return response.data;
  },

  async updatePruebaMedica(
    id: string,
    dto: { nombre?: string; activo?: boolean },
  ): Promise<{ id: string; nombre: string; activo: boolean }> {
    const response = await apiClient.patch<{ id: string; nombre: string; activo: boolean }>(`/salud/pruebas-medicas/${id}`, dto);
    return response.data;
  },

  async findDocumentosExamen(examenId: string): Promise<
    Array<{
      id: string;
      tipo_etiqueta: string;
      prueba_medica?: { id: string; nombre: string };
      nombre_archivo: string;
      url: string;
      created_at: string;
    }>
  > {
    const response = await apiClient.get(`/salud/examenes/${examenId}/documentos`);
    return response.data;
  },

  async uploadDocumentoExamen(
    examenId: string,
    file: File,
    pruebaMedicaId: string,
  ): Promise<{ id: string; url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('prueba_medica_id', pruebaMedicaId);
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

  /** Sube la Ficha EMO (Anexo 02) como PDF externo. Solo profesional de salud. */
  async uploadResultadoExamen(examenId: string, file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<{ url: string }>(
      `/salud/examenes/${examenId}/upload-resultado`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  /** Obtiene URL firmada para ver documento (bucket privado GCS). Expira en 10 min. */
  async getSignedUrlDocumentoExamen(
    examenId: string,
    docId: string,
  ): Promise<{ url: string }> {
    const response = await apiClient.get<{ url: string }>(
      `/salud/examenes/${examenId}/documentos/${docId}/url-firmada`,
    );
    return response.data;
  },

  /** Obtiene URL firmada para el archivo de resultado del examen (bucket privado GCS). */
  async getSignedUrlResultadoExamen(examenId: string): Promise<{ url: string }> {
    const response = await apiClient.get<{ url: string }>(
      `/salud/examenes/${examenId}/resultado/url-firmada`,
    );
    return response.data;
  },

  async notificarResultadosListos(examenId: string): Promise<ExamenMedico> {
    const response = await apiClient.post<ExamenMedico>(`/salud/examenes/${examenId}/notificar-resultados`);
    return response.data;
  },

  // Seguimientos (Interconsultas y Vigilancia)
  async createSeguimiento(
    examenId: string,
    dto: {
      tipo: 'INTERCONSULTA' | 'VIGILANCIA';
      cie10_code: string;
      cie10_description?: string;
      especialidad: string;
      plazo: string;
      motivo?: string;
      estado?: string;
    },
  ): Promise<ExamenMedico['seguimientos']> {
    const response = await apiClient.post(
      `/salud/examenes/${examenId}/seguimientos`,
      dto,
    );
    return response.data;
  },

  async updateSeguimiento(
    examenId: string,
    segId: string,
    dto: Partial<{
      cie10_code: string;
      cie10_description: string;
      especialidad: string;
      estado: string;
      plazo: string;
      motivo: string;
    }>,
  ): Promise<ExamenMedico['seguimientos']> {
    const response = await apiClient.patch(
      `/salud/examenes/${examenId}/seguimientos/${segId}`,
      dto,
    );
    return response.data;
  },

  async removeSeguimiento(examenId: string, segId: string): Promise<void> {
    await apiClient.delete(`/salud/examenes/${examenId}/seguimientos/${segId}`);
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
