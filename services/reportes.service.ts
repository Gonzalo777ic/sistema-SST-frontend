import apiClient from '@/lib/axios';

export interface CumplimientoCapacitaciones {
  porcentaje_cumplimiento: number;
  total_trabajadores: number;
  trabajadores_con_capacitacion: number;
  por_area: Array<{
    area_id: string;
    area_nombre: string;
    trabajadores_con_capacitacion: number;
    total_trabajadores: number;
    porcentaje_cumplimiento: number;
  }>;
}

export interface AccidentesVsIncidentes {
  mes: string;
  accidentes: number;
  incidentes: number;
}

export interface MedidasCorrectivas {
  mes: string;
  programadas: number;
  ejecutadas: number;
}

export interface InspeccionesPorMes {
  mes: string;
  [tipo: string]: string | number;
}

export interface PorcentajeLevantamiento {
  porcentaje_levantamiento: number;
  total_hallazgos: number;
  hallazgos_cerrados: number;
}

export interface ActosCondiciones {
  deteccion_vs_reporte: Array<{
    area: string;
    detecta: number;
    reporta: number;
  }>;
  por_estado: Array<{
    estado: string;
    cantidad: number;
  }>;
}

export const reportesService = {
  async getCumplimientoCapacitaciones(
    empresaId: string,
    fechaDesde?: string,
    fechaHasta?: string,
  ): Promise<CumplimientoCapacitaciones> {
    const params: any = { empresa_id: empresaId };
    if (fechaDesde) params.fecha_desde = fechaDesde;
    if (fechaHasta) params.fecha_hasta = fechaHasta;
    const response = await apiClient.get<CumplimientoCapacitaciones>(
      '/reportes/cumplimiento-capacitaciones',
      { params },
    );
    return response.data;
  },

  async getAccidentesVsIncidentes(
    empresaId: string,
    fechaDesde?: string,
    fechaHasta?: string,
  ): Promise<AccidentesVsIncidentes[]> {
    const params: any = { empresa_id: empresaId };
    if (fechaDesde) params.fecha_desde = fechaDesde;
    if (fechaHasta) params.fecha_hasta = fechaHasta;
    const response = await apiClient.get<AccidentesVsIncidentes[]>(
      '/reportes/accidentes-vs-incidentes',
      { params },
    );
    return response.data;
  },

  async getMedidasCorrectivas(
    empresaId: string,
    fechaDesde?: string,
    fechaHasta?: string,
  ): Promise<MedidasCorrectivas[]> {
    const params: any = { empresa_id: empresaId };
    if (fechaDesde) params.fecha_desde = fechaDesde;
    if (fechaHasta) params.fecha_hasta = fechaHasta;
    const response = await apiClient.get<MedidasCorrectivas[]>(
      '/reportes/medidas-correctivas',
      { params },
    );
    return response.data;
  },

  async getInspeccionesPorMes(
    empresaId: string,
    fechaDesde?: string,
    fechaHasta?: string,
  ): Promise<InspeccionesPorMes[]> {
    const params: any = { empresa_id: empresaId };
    if (fechaDesde) params.fecha_desde = fechaDesde;
    if (fechaHasta) params.fecha_hasta = fechaHasta;
    const response = await apiClient.get<InspeccionesPorMes[]>(
      '/reportes/inspecciones-por-mes',
      { params },
    );
    return response.data;
  },

  async getPorcentajeLevantamiento(
    empresaId: string,
  ): Promise<PorcentajeLevantamiento> {
    const response = await apiClient.get<PorcentajeLevantamiento>(
      '/reportes/porcentaje-levantamiento',
      { params: { empresa_id: empresaId } },
    );
    return response.data;
  },

  async getActosCondiciones(
    empresaId: string,
    fechaDesde?: string,
    fechaHasta?: string,
  ): Promise<ActosCondiciones> {
    const params: any = { empresa_id: empresaId };
    if (fechaDesde) params.fecha_desde = fechaDesde;
    if (fechaHasta) params.fecha_hasta = fechaHasta;
    const response = await apiClient.get<ActosCondiciones>(
      '/reportes/actos-condiciones',
      { params },
    );
    return response.data;
  },

  // ========== REPORTES DE ACCIDENTES E INCIDENTES ==========

  async getDiasUltimoIncidente(
    empresaId: string,
    fechaDesde?: string,
    fechaHasta?: string,
  ) {
    const params: any = { empresa_id: empresaId };
    if (fechaDesde) params.fecha_desde = fechaDesde;
    if (fechaHasta) params.fecha_hasta = fechaHasta;
    const response = await apiClient.get('/reportes/accidentes/dias-ultimo-incidente', {
      params,
    });
    return response.data;
  },

  async getTendenciaTemporal(
    empresaId: string,
    sede?: string,
    fechaDesde?: string,
    fechaHasta?: string,
  ) {
    const params: any = { empresa_id: empresaId };
    if (sede) params.sede = sede;
    if (fechaDesde) params.fecha_desde = fechaDesde;
    if (fechaHasta) params.fecha_hasta = fechaHasta;
    const response = await apiClient.get('/reportes/accidentes/tendencia-temporal', {
      params,
    });
    return response.data;
  },

  async getAnalisisCausas(
    empresaId: string,
    sede?: string,
    fechaDesde?: string,
    fechaHasta?: string,
  ) {
    const params: any = { empresa_id: empresaId };
    if (sede) params.sede = sede;
    if (fechaDesde) params.fecha_desde = fechaDesde;
    if (fechaHasta) params.fecha_hasta = fechaHasta;
    const response = await apiClient.get('/reportes/accidentes/analisis-causas', {
      params,
    });
    return response.data;
  },

  async getDistribucionDemografica(
    empresaId: string,
    sede?: string,
    fechaDesde?: string,
    fechaHasta?: string,
  ) {
    const params: any = { empresa_id: empresaId };
    if (sede) params.sede = sede;
    if (fechaDesde) params.fecha_desde = fechaDesde;
    if (fechaHasta) params.fecha_hasta = fechaHasta;
    const response = await apiClient.get(
      '/reportes/accidentes/distribucion-demografica',
      { params },
    );
    return response.data;
  },

  async getPartesCuerpo(
    empresaId: string,
    sede?: string,
    fechaDesde?: string,
    fechaHasta?: string,
  ) {
    const params: any = { empresa_id: empresaId };
    if (sede) params.sede = sede;
    if (fechaDesde) params.fecha_desde = fechaDesde;
    if (fechaHasta) params.fecha_hasta = fechaHasta;
    const response = await apiClient.get('/reportes/accidentes/partes-cuerpo', {
      params,
    });
    return response.data;
  },

  async getMedidasCorrectivasIncidentes(
    empresaId: string,
    sede?: string,
    fechaDesde?: string,
    fechaHasta?: string,
  ) {
    const params: any = { empresa_id: empresaId };
    if (sede) params.sede = sede;
    if (fechaDesde) params.fecha_desde = fechaDesde;
    if (fechaHasta) params.fecha_hasta = fechaHasta;
    const response = await apiClient.get(
      '/reportes/accidentes/medidas-correctivas',
      { params },
    );
    return response.data;
  },

  async getImpactoOperativo(
    empresaId: string,
    sede?: string,
    fechaDesde?: string,
    fechaHasta?: string,
  ) {
    const params: any = { empresa_id: empresaId };
    if (sede) params.sede = sede;
    if (fechaDesde) params.fecha_desde = fechaDesde;
    if (fechaHasta) params.fecha_hasta = fechaHasta;
    const response = await apiClient.get('/reportes/accidentes/impacto-operativo', {
      params,
    });
    return response.data;
  },

  async getRankingSiniestralidad(
    empresaId: string,
    sede?: string,
    fechaDesde?: string,
    fechaHasta?: string,
  ) {
    const params: any = { empresa_id: empresaId };
    if (sede) params.sede = sede;
    if (fechaDesde) params.fecha_desde = fechaDesde;
    if (fechaHasta) params.fecha_hasta = fechaHasta;
    const response = await apiClient.get('/reportes/accidentes/ranking-siniestralidad', {
      params,
    });
    return response.data;
  },

  async getEstadisticaHistorica(
    empresaId: string,
    sede?: string,
  ) {
    const params: any = { empresa_id: empresaId };
    if (sede) params.sede = sede;
    const response = await apiClient.get('/reportes/accidentes/estadistica-historica', {
      params,
    });
    return response.data;
  },
};
