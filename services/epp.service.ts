import apiClient from '@/lib/axios';

export enum EstadoSolicitudEPP {
  Pendiente = 'PENDIENTE',
  Aprobada = 'APROBADA',
  Entregada = 'ENTREGADA',
  Observada = 'OBSERVADA',
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
  adjunto_pdf_url: string | null;
  stock: number;
  empresa_id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISolicitudEPPDetalle {
  id: string;
  epp_id: string;
  epp_nombre: string;
  epp_imagen_url: string | null;
  cantidad: number;
}

export interface SolicitudEPP {
  id: string;
  codigo_correlativo: string | null;
  fecha_solicitud: string;
  usuario_epp_id: string;
  usuario_epp_nombre: string | null;
  solicitante_id: string;
  solicitante_nombre: string | null;
  solicitante_documento: string | null;
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
  firma_recepcion_url?: string;
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
  adjunto_pdf_url?: string;
  stock?: number;
  empresa_id: string;
}

export interface UpdateEppDto {
  nombre?: string;
  tipo_proteccion?: TipoProteccionEPP;
  categoria?: CategoriaEPP;
  descripcion?: string;
  imagen_url?: string;
  vigencia?: VigenciaEPP;
  adjunto_pdf_url?: string;
  stock?: number;
}

export const eppService = {
  // ========== CRUD EPP (Catálogo) ==========

  async findAllEpp(empresaId?: string): Promise<IEPP[]> {
    const params: any = {};
    if (empresaId) params.empresa_id = empresaId;
    const response = await apiClient.get<IEPP[]>('/epp/catalogo', { params });
    return response.data;
  },

  async findOneEpp(id: string): Promise<IEPP> {
    const response = await apiClient.get<IEPP>(`/epp/catalogo/${id}`);
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

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/epp/solicitudes/${id}`);
  },

  // ========== Kardex ==========

  async getKardexPorTrabajador(trabajadorId: string): Promise<IKardex> {
    const response = await apiClient.get<IKardex>(`/epp/kardex/${trabajadorId}`);
    return response.data;
  },
};
