import apiClient from '@/lib/axios';

export enum TipoPeligro {
  Fisico = 'Físico',
  Quimico = 'Químico',
  Biologico = 'Biológico',
  Ergonómico = 'Ergonómico',
  Psicosocial = 'Psicosocial',
  Mecanico = 'Mecánico',
  Electrico = 'Eléctrico',
  Locativo = 'Locativo',
}

export enum Probabilidad {
  MuyBaja = 'Muy Baja',
  Baja = 'Baja',
  Media = 'Media',
  Alta = 'Alta',
  MuyAlta = 'Muy Alta',
}

export enum Consecuencia {
  Insignificante = 'Insignificante',
  Menor = 'Menor',
  Moderada = 'Moderada',
  Mayor = 'Mayor',
  Catastrofica = 'Catastrófica',
}

export enum NivelRiesgo {
  Trivial = 'Trivial',
  Tolerable = 'Tolerable',
  Moderado = 'Moderado',
  Importante = 'Importante',
  Intolerable = 'Intolerable',
}

export enum EstadoEvaluacionRiesgo {
  Pendiente = 'Pendiente',
  EnRevision = 'En Revisión',
  Aprobada = 'Aprobada',
  RequiereActualizacion = 'Requiere Actualización',
}

export interface MedidaControlDto {
  jerarquia: string;
  descripcion: string;
  responsable?: string;
  responsable_id?: string;
  fecha_implementacion?: string;
  estado?: string;
}

export interface EvaluacionRiesgo {
  id: string;
  actividad: string;
  peligro_identificado: string;
  tipo_peligro: TipoPeligro;
  fecha_evaluacion: string;
  probabilidad: Probabilidad;
  consecuencia: Consecuencia;
  nivel_riesgo: NivelRiesgo;
  controles_actuales: string | null;
  riesgo_residual: NivelRiesgo | null;
  estado: EstadoEvaluacionRiesgo;
  area_id: string | null;
  area_nombre: string | null;
  evaluador_id: string;
  evaluador_nombre: string | null;
  iperc_padre_id: string | null;
  empresa_id: string;
  medidas_control: MedidaControlDto[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEvaluacionRiesgoDto {
  actividad: string;
  peligro_identificado: string;
  tipo_peligro: TipoPeligro;
  fecha_evaluacion: string;
  probabilidad: Probabilidad;
  consecuencia: Consecuencia;
  nivel_riesgo: NivelRiesgo;
  controles_actuales?: string;
  riesgo_residual?: NivelRiesgo;
  estado?: EstadoEvaluacionRiesgo;
  medidas_control?: MedidaControlDto[];
  empresa_id: string;
  area_id?: string;
  evaluador_id: string;
  iperc_padre_id?: string;
}

export interface UpdateEvaluacionRiesgoDto {
  actividad?: string;
  peligro_identificado?: string;
  tipo_peligro?: TipoPeligro;
  fecha_evaluacion?: string;
  probabilidad?: Probabilidad;
  consecuencia?: Consecuencia;
  nivel_riesgo?: NivelRiesgo;
  controles_actuales?: string;
  riesgo_residual?: NivelRiesgo;
  estado?: EstadoEvaluacionRiesgo;
  medidas_control?: MedidaControlDto[];
  area_id?: string;
  iperc_padre_id?: string;
}

/**
 * Calcula el nivel de riesgo basado en probabilidad y consecuencia
 * Matriz de riesgo estándar
 */
export function calcularNivelRiesgo(
  probabilidad: Probabilidad,
  consecuencia: Consecuencia,
): NivelRiesgo {
  const matriz: Record<Probabilidad, Record<Consecuencia, NivelRiesgo>> = {
    [Probabilidad.MuyBaja]: {
      [Consecuencia.Insignificante]: NivelRiesgo.Trivial,
      [Consecuencia.Menor]: NivelRiesgo.Trivial,
      [Consecuencia.Moderada]: NivelRiesgo.Tolerable,
      [Consecuencia.Mayor]: NivelRiesgo.Tolerable,
      [Consecuencia.Catastrofica]: NivelRiesgo.Moderado,
    },
    [Probabilidad.Baja]: {
      [Consecuencia.Insignificante]: NivelRiesgo.Trivial,
      [Consecuencia.Menor]: NivelRiesgo.Tolerable,
      [Consecuencia.Moderada]: NivelRiesgo.Tolerable,
      [Consecuencia.Mayor]: NivelRiesgo.Moderado,
      [Consecuencia.Catastrofica]: NivelRiesgo.Importante,
    },
    [Probabilidad.Media]: {
      [Consecuencia.Insignificante]: NivelRiesgo.Tolerable,
      [Consecuencia.Menor]: NivelRiesgo.Tolerable,
      [Consecuencia.Moderada]: NivelRiesgo.Moderado,
      [Consecuencia.Mayor]: NivelRiesgo.Importante,
      [Consecuencia.Catastrofica]: NivelRiesgo.Intolerable,
    },
    [Probabilidad.Alta]: {
      [Consecuencia.Insignificante]: NivelRiesgo.Tolerable,
      [Consecuencia.Menor]: NivelRiesgo.Moderado,
      [Consecuencia.Moderada]: NivelRiesgo.Importante,
      [Consecuencia.Mayor]: NivelRiesgo.Intolerable,
      [Consecuencia.Catastrofica]: NivelRiesgo.Intolerable,
    },
    [Probabilidad.MuyAlta]: {
      [Consecuencia.Insignificante]: NivelRiesgo.Moderado,
      [Consecuencia.Menor]: NivelRiesgo.Importante,
      [Consecuencia.Moderada]: NivelRiesgo.Intolerable,
      [Consecuencia.Mayor]: NivelRiesgo.Intolerable,
      [Consecuencia.Catastrofica]: NivelRiesgo.Intolerable,
    },
  };

  return matriz[probabilidad][consecuencia];
}

export const evaluacionRiesgosService = {
  async findAll(empresaId?: string, areaId?: string): Promise<EvaluacionRiesgo[]> {
    const params: any = {};
    if (empresaId) params.empresa_id = empresaId;
    if (areaId) params.area_id = areaId;
    const response = await apiClient.get<EvaluacionRiesgo[]>('/riesgos', { params });
    return response.data;
  },

  async findOne(id: string): Promise<EvaluacionRiesgo> {
    const response = await apiClient.get<EvaluacionRiesgo>(`/riesgos/${id}`);
    return response.data;
  },

  async create(data: CreateEvaluacionRiesgoDto): Promise<EvaluacionRiesgo> {
    const response = await apiClient.post<EvaluacionRiesgo>('/riesgos', data);
    return response.data;
  },

  async update(id: string, data: UpdateEvaluacionRiesgoDto): Promise<EvaluacionRiesgo> {
    const response = await apiClient.patch<EvaluacionRiesgo>(`/riesgos/${id}`, data);
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/riesgos/${id}`);
  },
};
