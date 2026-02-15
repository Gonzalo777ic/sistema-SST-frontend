import apiClient from '@/lib/axios';

export interface ResponsableCertificacion {
  nombre_completo: string;
  numero_documento: string;
  tipo_documento: string;
}

export interface RegistroAsistenciaItem {
  codigo_documento: string;
  version: string;
  fecha_version: string;
  vigencia_inicio: string;
  vigencia_fin: string;
}

export interface FirmasCertificado {
  responsable_rrhh: boolean;
  responsable_sst: boolean;
  capacitador: boolean;
  responsable_certificacion: boolean;
}

export interface IConfigCapacitaciones {
  id: string;
  nota_minima_aprobatoria: number;
  bloquear_evaluacion_nota_menor_igual: number;
  limite_intentos: number;
  bloquear_despues_aprobacion: boolean;
  habilitar_firma_solo_aprobados: boolean;
  habilitar_encuesta_satisfaccion: boolean;
  tipos: string[];
  grupos: string[];
  ubicaciones: string[];
  responsables_certificacion: ResponsableCertificacion[];
  registro_asistencia: RegistroAsistenciaItem[] | null;
  firmas_certificado: FirmasCertificado | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateConfigCapacitacionesDto {
  nota_minima_aprobatoria?: number;
  bloquear_evaluacion_nota_menor_igual?: number;
  limite_intentos?: number;
  bloquear_despues_aprobacion?: boolean;
  habilitar_firma_solo_aprobados?: boolean;
  habilitar_encuesta_satisfaccion?: boolean;
  tipos?: string[];
  grupos?: string[];
  ubicaciones?: string[];
  responsables_certificacion?: ResponsableCertificacion[];
  registro_asistencia?: RegistroAsistenciaItem[];
  firmas_certificado?: Partial<FirmasCertificado>;
}

export const configCapacitacionesService = {
  async getConfig(): Promise<IConfigCapacitaciones> {
    const response = await apiClient.get<IConfigCapacitaciones>('/config-capacitaciones');
    return response.data;
  },

  async updateConfig(data: UpdateConfigCapacitacionesDto): Promise<IConfigCapacitaciones> {
    const response = await apiClient.patch<IConfigCapacitaciones>('/config-capacitaciones', data);
    return response.data;
  },
};
