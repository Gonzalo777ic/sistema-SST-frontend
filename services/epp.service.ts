import apiClient from '@/lib/axios';

export enum EstadoSolicitudEPP {
  Pendiente = 'PENDIENTE',
  Observada = 'OBSERVADA',
  Aprobada = 'APROBADA',
  Entregada = 'ENTREGADA',
  Rechazada = 'RECHAZADA',
}

export enum MotivoSolicitudEPP {
  Perdida = 'PÉRDIDA',
  Caduco = 'CADUCÓ',
  Averia = 'AVERÍA',
  NuevoPersonal = 'NUEVO_PERSONAL',
  Otro = 'OTRO',
}

export enum TipoProteccionEPP {
  Manos = 'Manos',
  Cuerpo = 'Cuerpo',
  Auditiva = 'Auditiva',
  Visual = 'Visual',
  Cabeza = 'Cabeza',
  Pies = 'Pies',
  Pierna = 'Pierna',
  Otros = 'Otros',
}

export enum CategoriaEPP {
  EPP = 'EPP',
  Uniforme = 'Uniforme',
}

export enum CategoriaCriticidadEPP {
  Core = 'Core',
  Recurrente = 'Recurrente',
}

export enum EstadoVigenciaKardex {
  Vigente = 'Vigente',
  Vencido = 'Vencido',
  VencimientoMenor = 'Vencimiento menor',
  SinRegistro = 'Sin registro',
}

export enum VigenciaEPP {
  UnMes = '1 mes',
  DosMeses = '2 meses',
  TresMeses = '3 meses',
  CuatroMeses = '4 meses',
  CincoMeses = '5 meses',
  SeisMeses = '6 meses',
  SieteMeses = '7 meses',
  OchoMeses = '8 meses',
  NueveMeses = '9 meses',
  DiezMeses = '10 meses',
  OnceMeses = '11 meses',
  UnAnio = '1 año',
  DosAnios = '2 años',
}

export interface IEPP {
  id: string;
  nombre: string;
  tipo_proteccion: TipoProteccionEPP;
  categoria: CategoriaEPP;
  descripcion: string | null;
  imagen_url: string | null;
  vigencia: VigenciaEPP | null;
  costo: number | null;
  categoria_criticidad: CategoriaCriticidadEPP | null;
  adjunto_pdf_url: string | null;
  empresa_id: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IKardexListItem {
  trabajador_id: string;
  trabajador_nombre: string;
  razon_social: string | null;
  unidad: string | null;
  area: string | null;
  sede: string | null;
  fecha_entrega: string | null;
  estado: EstadoVigenciaKardex;
  categoria_filtro: string | null;
}

export interface ISolicitudEPPDetalle {
  id: string;
  epp_id: string;
  epp_nombre: string;
  epp_tipo_proteccion: string;
  epp_descripcion: string | null;
  epp_vigencia: string | null;
  epp_imagen_url: string | null;
  cantidad: number;
  exceptuado: boolean;
  exceptuado_por_id: string | null;
  exceptuado_por_nombre: string | null;
  agregado: boolean;
  agregado_por_id: string | null;
  agregado_por_nombre: string | null;
}

export interface SolicitudEPP {
  id: string;
  codigo_correlativo: string | null;
  fecha_solicitud: string;
  usuario_epp_id: string;
  usuario_epp_nombre: string | null;
  es_auto_solicitud?: boolean; // true si el trabajador creó la solicitud desde su cuenta
  solicitante_id: string;
  solicitante_nombre: string | null;
  solicitante_documento: string | null;
  solicitante_sexo: string | null;
  solicitante_puesto: string | null;
  solicitante_centro_costos: string | null;
  solicitante_jefe_directo: string | null;
  motivo: string | null;
  centro_costos: string | null;
  comentarios: string | null;
  observaciones: string | null;
  estado: EstadoSolicitudEPP;
  supervisor_aprobador_id: string | null;
  supervisor_aprobador_nombre: string | null;
  fecha_aprobacion: string | null;
  comentarios_aprobacion: string | null;
  entregado_por_id: string | null;
  entregado_por_nombre: string | null;
  fecha_entrega: string | null;
  firma_recepcion_url: string | null;
  kardex_pdf_url: string | null;
  area_id: string | null;
  area_nombre: string | null;
  empresa_id: string;
  empresa_nombre: string | null;
  unidad: string | null;
  sede: string | null;
  detalles: ISolicitudEPPDetalle[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSolicitudEppDetalleDto {
  epp_id: string;
  cantidad: number;
}

export interface CreateSolicitudEppDto {
  usuario_epp_id: string;
  solicitante_id: string;
  motivo?: string;
  centro_costos?: string;
  comentarios?: string;
  observaciones?: string;
  area_id?: string;
  empresa_id: string;
  detalles: CreateSolicitudEppDetalleDto[];
  estado?: EstadoSolicitudEPP;
}

export interface UpdateSolicitudEppDto {
  motivo?: string;
  centro_costos?: string;
  comentarios?: string;
  observaciones?: string;
  area_id?: string;
  estado?: EstadoSolicitudEPP;
  detalles?: CreateSolicitudEppDetalleDto[];
}

export interface UpdateEstadoDto {
  estado: EstadoSolicitudEPP;
  comentarios_aprobacion?: string;
  observaciones?: string;
  firma_recepcion_url?: string;
  firma_recepcion_base64?: string;
  password?: string;
}

export interface IKardex {
  trabajador_id: string;
  trabajador_nombre: string;
  trabajador_documento: string;
  historial: SolicitudEPP[];
}

export interface CreateEppDto {
  nombre: string;
  tipo_proteccion: TipoProteccionEPP;
  categoria?: CategoriaEPP;
  descripcion?: string;
  imagen_url?: string;
  vigencia?: VigenciaEPP;
  costo?: number;
  categoria_criticidad?: CategoriaCriticidadEPP;
  adjunto_pdf_url?: string;
  empresa_id?: string | null;
}

export interface UpdateEppDto {
  nombre?: string;
  tipo_proteccion?: TipoProteccionEPP;
  categoria?: CategoriaEPP;
  descripcion?: string;
  imagen_url?: string;
  vigencia?: VigenciaEPP;
  costo?: number;
  categoria_criticidad?: CategoriaCriticidadEPP;
  adjunto_pdf_url?: string;
}

export const eppService = {
  // ========== CRUD EPP (Catálogo) ==========

  async findAllEpp(empresaId?: string, empresaIds?: string[]): Promise<IEPP[]> {
    const params: Record<string, string> = {};
    if (empresaIds && empresaIds.length > 0) {
      params.empresa_ids = empresaIds.join(',');
    } else if (empresaId) {
      params.empresa_id = empresaId;
    }
    const response = await apiClient.get<IEPP[]>('/epp/catalogo', { params });
    return response.data;
  },

  async findOneEpp(id: string): Promise<IEPP> {
    const response = await apiClient.get<IEPP>(`/epp/catalogo/${id}`);
    return response.data;
  },

  async uploadEppImagen(empresaId: string, file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('empresa_id', empresaId);
    const response = await apiClient.post<{ url: string }>('/epp/catalogo/upload-imagen', formData);
    return response.data;
  },

  async uploadEppFichaPdf(empresaId: string, file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('empresa_id', empresaId);
    const response = await apiClient.post<{ url: string }>('/epp/catalogo/upload-ficha-pdf', formData);
    return response.data;
  },

  async createEpp(data: CreateEppDto): Promise<IEPP> {
    const response = await apiClient.post<IEPP>('/epp/catalogo', data);
    return response.data;
  },

  async updateEpp(id: string, data: UpdateEppDto): Promise<IEPP> {
    const response = await apiClient.patch<IEPP>(`/epp/catalogo/${id}`, data);
    return response.data;
  },

  // ========== CRUD Solicitudes ==========

  async findAll(
    empresaId?: string,
    usuarioEppId?: string,
    solicitanteId?: string,
    estado?: EstadoSolicitudEPP,
    areaId?: string,
    sede?: string,
  ): Promise<SolicitudEPP[]> {
    const params: any = {};
    if (empresaId) params.empresa_id = empresaId;
    if (usuarioEppId) params.usuario_epp_id = usuarioEppId;
    if (solicitanteId) params.solicitante_id = solicitanteId;
    if (estado) params.estado = estado;
    if (areaId) params.area_id = areaId;
    if (sede) params.sede = sede;

    const response = await apiClient.get<SolicitudEPP[]>('/epp/solicitudes', { params });
    return response.data;
  },

  async findOne(id: string): Promise<SolicitudEPP> {
    const response = await apiClient.get<SolicitudEPP>(`/epp/solicitudes/${id}`);
    return response.data;
  },

  async create(data: CreateSolicitudEppDto): Promise<SolicitudEPP> {
    const response = await apiClient.post<SolicitudEPP>('/epp/solicitudes', data);
    return response.data;
  },

  async update(id: string, data: UpdateSolicitudEppDto): Promise<SolicitudEPP> {
    const response = await apiClient.patch<SolicitudEPP>(`/epp/solicitudes/${id}`, data);
    return response.data;
  },

  async updateEstado(id: string, data: UpdateEstadoDto): Promise<SolicitudEPP> {
    const response = await apiClient.patch<SolicitudEPP>(`/epp/solicitudes/${id}/estado`, data);
    return response.data;
  },

  async toggleExceptuar(solicitudId: string, detalleId: string): Promise<SolicitudEPP> {
    const response = await apiClient.patch<SolicitudEPP>(
      `/epp/solicitudes/${solicitudId}/detalle/${detalleId}/exceptuar`
    );
    return response.data;
  },

  async agregarDetalle(
    solicitudId: string,
    eppId: string,
    cantidad: number = 1
  ): Promise<SolicitudEPP> {
    const response = await apiClient.post<SolicitudEPP>(
      `/epp/solicitudes/${solicitudId}/detalle`,
      { epp_id: eppId, cantidad }
    );
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/epp/solicitudes/${id}`);
  },

  // ========== Kardex ==========

  async getKardexPorTrabajador(trabajadorId: string): Promise<IKardex> {
    const response = await apiClient.get<IKardex>(`/epp/kardex/${trabajadorId}`);
    return response.data;
  },

  async getUltimoKardexPdf(
    trabajadorId: string,
  ): Promise<{ pdf_url: string | null; trabajador_id: string | null }> {
    const response = await apiClient.get<{
      pdf_url: string | null;
      trabajador_id: string | null;
    }>(`/epp/ultimo-kardex-pdf/${trabajadorId}`);
    return response.data;
  },

  async getKardexPdfBlob(trabajadorId: string): Promise<Blob> {
    const response = await apiClient.get(`/epp/kardex-pdf/${trabajadorId}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async getRegistroPdfBlob(solicitudId: string): Promise<Blob> {
    const response = await apiClient.get(`/epp/registro-pdf/${solicitudId}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async getEppsAnteriormenteSolicitados(
    trabajadorId: string,
    empresaId: string,
  ): Promise<IEPP[]> {
    const res = await apiClient.get('/epp/catalogo/epps-anteriormente-solicitados', {
      params: { trabajador_id: trabajadorId, empresa_id: empresaId },
    });
    return res.data;
  },

  async getFavoritosEpp(trabajadorId: string): Promise<string[]> {
    const res = await apiClient.get<{ epp_ids: string[] }>('/epp/catalogo/favoritos', {
      params: { trabajador_id: trabajadorId },
    });
    return res.data.epp_ids;
  },

  async toggleFavoritoEpp(eppId: string): Promise<{ es_favorito: boolean }> {
    const res = await apiClient.post(`/epp/catalogo/favoritos/${eppId}/toggle`);
    return res.data;
  },

  async getKardexPdfBlobBySolicitud(solicitudId: string): Promise<Blob> {
    const response = await apiClient.get(`/epp/kardex-pdf-solicitud/${solicitudId}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async getKardexList(params?: {
    empresa_ids?: string[];
    nombre?: string;
    estado?: EstadoVigenciaKardex;
    categoria?: string;
    unidad?: string;
    sede?: string;
    area_id?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
  }): Promise<IKardexListItem[]> {
    const searchParams: Record<string, string> = {};
    if (params?.empresa_ids?.length) searchParams.empresa_ids = params.empresa_ids.join(',');
    if (params?.nombre) searchParams.nombre = params.nombre;
    if (params?.estado) searchParams.estado = params.estado;
    if (params?.categoria) searchParams.categoria = params.categoria;
    if (params?.unidad) searchParams.unidad = params.unidad;
    if (params?.sede) searchParams.sede = params.sede;
    if (params?.area_id) searchParams.area_id = params.area_id;
    if (params?.fecha_desde) searchParams.fecha_desde = params.fecha_desde;
    if (params?.fecha_hasta) searchParams.fecha_hasta = params.fecha_hasta;
    const response = await apiClient.get<IKardexListItem[]>('/epp/kardex-list', { params: searchParams });
    return response.data;
  },

  // ========== Reportes EPP ==========

  async getReporteEstadosEpp(empresaIds?: string[]) {
    const params = empresaIds?.length ? { empresa_ids: empresaIds.join(',') } : {};
    const res = await apiClient.get('/epp/reportes/estados-epp', { params });
    return res.data as { vencido: number; vigente: number; por_vencer: number; total: number };
  },

  async getReporteEntregasPorEmpresa(empresaIds?: string[]) {
    const params = empresaIds?.length ? { empresa_ids: empresaIds.join(',') } : {};
    const res = await apiClient.get('/epp/reportes/entregas-por-empresa', { params });
    return res.data as Array<{
      empresa_id: string;
      empresa_nombre: string;
      total: number;
      vencido: number;
      vigente: number;
      por_vencer: number;
    }>;
  },

  async getReporteEntregasPorEmpresaArea(empresaIds?: string[]) {
    const params = empresaIds?.length ? { empresa_ids: empresaIds.join(',') } : {};
    const res = await apiClient.get('/epp/reportes/entregas-por-empresa-area', { params });
    return res.data as Array<{
      empresa_id: string;
      empresa_nombre: string;
      area_id: string | null;
      area_nombre: string | null;
      total: number;
      vencido: number;
      vigente: number;
      por_vencer: number;
    }>;
  },

  async getReporteEntregasPorMes(params?: {
    empresa_ids?: string[];
    fecha_desde?: string;
    fecha_hasta?: string;
  }) {
    const searchParams: Record<string, string> = {};
    if (params?.empresa_ids?.length) searchParams.empresa_ids = params.empresa_ids.join(',');
    if (params?.fecha_desde) searchParams.fecha_desde = params.fecha_desde;
    if (params?.fecha_hasta) searchParams.fecha_hasta = params.fecha_hasta;
    const res = await apiClient.get('/epp/reportes/entregas-por-mes', { params: searchParams });
    return res.data as Array<{
      fecha_entrega: string;
      trabajador_id: string;
      trabajador_nombre: string;
      nro_documento: string;
      fecha_vencimiento: string | null;
      razon_social: string;
      sede: string | null;
      equipo: string;
      vigencia: 'Vencido' | 'Vigente' | 'Por vencer';
      cantidad: number;
      costo_unitario: number | null;
    }>;
  },

  async getReporteEntregasPorSede(empresaIds?: string[]) {
    const params = empresaIds?.length ? { empresa_ids: empresaIds.join(',') } : {};
    const res = await apiClient.get('/epp/reportes/entregas-por-sede', { params });
    return res.data as Array<{
      sede: string;
      total: number;
      vencido: number;
      vigente: number;
      por_vencer: number;
    }>;
  },

  async getReporteEppsMasSolicitados(empresaIds?: string[]) {
    const params = empresaIds?.length ? { empresa_ids: empresaIds.join(',') } : {};
    const res = await apiClient.get('/epp/reportes/epps-mas-solicitados', { params });
    return res.data as Array<{
      epp_id: string;
      epp_nombre: string;
      total_solicitado: number;
      cantidad_entregas: number;
    }>;
  },

  async getReporteTrabajadorCostoHistorico(empresaIds?: string[]) {
    const params = empresaIds?.length ? { empresa_ids: empresaIds.join(',') } : {};
    const res = await apiClient.get('/epp/reportes/trabajador-costo-historico', { params });
    return res.data as Array<{
      trabajador_id: string;
      trabajador_nombre: string;
      nro_documento: string;
      razon_social: string | null;
      total_items: number;
      costo_total: number;
    }>;
  },
};
