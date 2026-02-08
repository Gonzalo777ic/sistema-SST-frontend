import apiClient from '@/lib/axios';

export enum TipoEPP {
  Casco = 'Casco',
  ChalecoReflectivo = 'Chaleco Reflectivo',
  Guantes = 'Guantes',
  BotasSeguridad = 'Botas de Seguridad',
  LentesSeguridad = 'Lentes de Seguridad',
  ProteccionAuditiva = 'Protección Auditiva',
  Arnes = 'Arnés',
  Respirador = 'Respirador',
  ProtectorFacial = 'Protector Facial',
  Otro = 'Otro',
}

export enum MotivoEPP {
  NuevoIngreso = 'Nuevo Ingreso',
  ReposicionDesgaste = 'Reposición por Desgaste',
  Perdida = 'Pérdida',
  Dano = 'Daño',
  CambioTalla = 'Cambio de Talla',
  Otro = 'Otro',
}

export enum EstadoSolicitudEPP {
  Pendiente = 'Pendiente',
  Aprobada = 'Aprobada',
  Rechazada = 'Rechazada',
  Entregada = 'Entregada',
}

export interface SolicitudEPP {
  id: string;
  fecha_solicitud: string;
  tipo_epp: TipoEPP;
  cantidad: number;
  talla: string;
  motivo: MotivoEPP;
  descripcion_motivo: string | null;
  estado: EstadoSolicitudEPP;
  supervisor_aprobador: string | null;
  supervisor_aprobador_id: string | null;
  fecha_aprobacion: string | null;
  comentarios_aprobacion: string | null;
  entregado_por: string | null;
  entregado_por_id: string | null;
  fecha_entrega: string | null;
  firma_recepcion_url: string | null;
  trabajador_id: string;
  trabajador_nombre: string | null;
  area_id: string | null;
  empresa_id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSolicitudEppDto {
  tipo_epp: TipoEPP;
  cantidad?: number;
  talla: string;
  motivo: MotivoEPP;
  descripcion_motivo?: string;
  trabajador_id: string;
  area_id?: string;
  empresa_id: string;
}

export interface UpdateEstadoDto {
  estado: EstadoSolicitudEPP;
  comentarios_aprobacion?: string;
  firma_recepcion_url?: string;
}

export const eppService = {
  async findAll(
    empresaId?: string,
    trabajadorId?: string,
    estado?: EstadoSolicitudEPP,
  ): Promise<SolicitudEPP[]> {
    const params: any = {};
    if (empresaId) params.empresa_id = empresaId;
    if (trabajadorId) params.trabajador_id = trabajadorId;
    if (estado) params.estado = estado;

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

  async updateEstado(id: string, data: UpdateEstadoDto): Promise<SolicitudEPP> {
    const response = await apiClient.patch<SolicitudEPP>(`/epp/solicitudes/${id}/estado`, data);
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/epp/solicitudes/${id}`);
  },
};
