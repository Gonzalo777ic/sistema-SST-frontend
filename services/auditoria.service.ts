import apiClient from '@/lib/axios';

export interface LogAcceso {
  id: string;
  fechaHora: string;
  usuarioId: string;
  usuarioNombre: string;
  accion: string;
  recursoTipo: string;
  recursoId: string;
  recursoDescripcion: string;
  examenId: string;
  trabajadorId: string;
  trabajadorNombre: string;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface LogsFiltros {
  fecha_desde?: string;
  fecha_hasta?: string;
  usuario_id?: string;
  trabajador_id?: string;
  page?: number;
  limit?: number;
}

export interface LogsResponse {
  data: LogAcceso[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const auditoriaService = {
  async getLogs(filtros: LogsFiltros = {}): Promise<LogsResponse> {
    const params = new URLSearchParams();
    if (filtros.fecha_desde) params.set('fecha_desde', filtros.fecha_desde);
    if (filtros.fecha_hasta) params.set('fecha_hasta', filtros.fecha_hasta);
    if (filtros.usuario_id) params.set('usuario_id', filtros.usuario_id);
    if (filtros.trabajador_id) params.set('trabajador_id', filtros.trabajador_id);
    if (filtros.page) params.set('page', String(filtros.page));
    if (filtros.limit) params.set('limit', String(filtros.limit));

    const response = await apiClient.get<LogsResponse>(`/auditoria/logs?${params.toString()}`);
    return response.data;
  },

  async exportarLogs(filtros: Omit<LogsFiltros, 'page' | 'limit'> = {}): Promise<LogAcceso[]> {
    const params = new URLSearchParams();
    if (filtros.fecha_desde) params.set('fecha_desde', filtros.fecha_desde);
    if (filtros.fecha_hasta) params.set('fecha_hasta', filtros.fecha_hasta);
    if (filtros.usuario_id) params.set('usuario_id', filtros.usuario_id);
    if (filtros.trabajador_id) params.set('trabajador_id', filtros.trabajador_id);

    const response = await apiClient.get<LogAcceso[]>(`/auditoria/logs/exportar?${params.toString()}`);
    return response.data;
  },
};
