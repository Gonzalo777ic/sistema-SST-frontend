import apiClient from '@/lib/axios';

export enum EstadoIPERC {
  Borrador = 'Borrador',
  Completado = 'Completado',
  Aprobado = 'Aprobado',
  Rechazado = 'Rechazado',
}

export enum NivelRiesgo {
  Trivial = 'Trivial',
  Tolerable = 'Tolerable',
  Moderado = 'Moderado',
  Importante = 'Importante',
  Intolerable = 'Intolerable',
}

export interface LineaIpercDto {
  numero: number;
  actividad: string;
  tarea: string;
  puesto_trabajo?: string;
  peligro: string;
  riesgo: string;
  requisito_legal?: string;
  probabilidad_a: number;
  probabilidad_b: number;
  probabilidad_c: number;
  probabilidad_d: number;
  indice_severidad: number;
  indice_probabilidad?: number; // Campo calculado (A+B+C+D)
  valor_riesgo?: number; // Campo calculado (indice_probabilidad * indice_severidad)
  nivel_riesgo?: NivelRiesgo; // Campo calculado basado en valor_riesgo
  jerarquia_eliminacion?: boolean;
  jerarquia_sustitucion?: boolean;
  jerarquia_controles_ingenieria?: boolean;
  jerarquia_controles_admin?: boolean;
  jerarquia_epp?: boolean;
  medidas_control: string;
  responsable?: string;
}

export interface IPERC {
  id: string;
  razon_social: string;
  area: string | null;
  proceso: string;
  fecha_elaboracion: string;
  estado: EstadoIPERC;
  pdf_url: string | null;
  historial_versiones: any[] | null;
  firma_elaborador: string | null;
  elaborado_por: string | null;
  aprobado_por: string | null;
  firma_aprobador: string | null;
  lineas_iperc: LineaIpercDto[];
  empresa_id: string;
  area_id: string | null;
  elaborado_por_id: string;
  aprobado_por_id: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateIpercDto {
  razon_social: string;
  area_id?: string;
  proceso: string;
  fecha_elaboracion: string;
  elaborado_por?: string;
  estado?: EstadoIPERC;
  firma_elaborador?: string;
  aprobado_por?: string;
  firma_aprobador?: string;
  lineas_iperc?: LineaIpercDto[];
  empresa_id: string;
  elaborado_por_id: string;
  aprobado_por_id?: string;
}

export interface UpdateIpercDto extends Partial<CreateIpercDto> {
  estado?: EstadoIPERC;
}

// Funciones de cálculo (matching backend logic)
export const calcularIndiceProbabilidad = (
  a: number,
  b: number,
  c: number,
  d: number,
): number => {
  return a + b + c + d;
};

export const calcularValorRiesgo = (
  indiceProbabilidad: number,
  indiceSeveridad: number,
): number => {
  return indiceProbabilidad * indiceSeveridad;
};

export const calcularNivelRiesgo = (valorRiesgo: number): NivelRiesgo => {
  if (valorRiesgo <= 5) return NivelRiesgo.Trivial;
  if (valorRiesgo <= 10) return NivelRiesgo.Tolerable;
  if (valorRiesgo <= 15) return NivelRiesgo.Moderado;
  if (valorRiesgo <= 20) return NivelRiesgo.Importante;
  return NivelRiesgo.Intolerable;
};

export const ipercService = {
  async findAll(empresaId?: string): Promise<IPERC[]> {
    const params = empresaId ? { empresa_id: empresaId } : {};
    const response = await apiClient.get<IPERC[]>('/iperc', { params });
    return response.data;
  },

  async findOne(id: string): Promise<IPERC> {
    const response = await apiClient.get<IPERC>(`/iperc/${id}`);
    return response.data;
  },

  async create(dto: CreateIpercDto): Promise<IPERC> {
    const response = await apiClient.post<IPERC>('/iperc', dto);
    return response.data;
  },

  async update(id: string, dto: UpdateIpercDto): Promise<IPERC> {
    const response = await apiClient.patch<IPERC>(`/iperc/${id}`, dto);
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/iperc/${id}`);
  },
};
