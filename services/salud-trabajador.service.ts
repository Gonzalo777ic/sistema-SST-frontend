import apiClient from '@/lib/axios';

export interface AntecedentesPatologicos {
  id: string;
  trabajador_id: string;
  alergias: boolean;
  diabetes: boolean;
  tbc: boolean;
  hepatitis_b: boolean;
  asma: boolean;
  hta: boolean;
  its: boolean;
  tifoidea: boolean;
  bronquitis: boolean;
  neoplasia: boolean;
  convulsiones: boolean;
  quemaduras: boolean;
  cirugias: boolean;
  intoxicaciones: boolean;
  otros: boolean;
  detalle_cirugias: string | null;
  detalle_otros: string | null;
  antecedente_padre: string | null;
  antecedente_madre: string | null;
  antecedente_hermanos: string | null;
  antecedente_esposo: string | null;
  nro_hijos_fallecidos: number | null;
  tags_familiares: string[] | null;
}

export type TipoHabitoNocivo = 'Alcohol' | 'Tabaco' | 'Drogas' | 'Medicamentos';

export interface HabitoNocivo {
  id: string;
  tipo: TipoHabitoNocivo;
  cantidad: string | null;
  frecuencia: string | null;
  trabajador_id: string;
}

export interface AusentismoMedico {
  id: string;
  enfermedad_accidente: string;
  asociado_trabajo: boolean;
  anio: number;
  dias_descanso: number;
  trabajador_id: string;
}

export interface SaludTrabajadorResponse {
  antecedentes_patologicos: AntecedentesPatologicos | null;
  habitos_nocivos: HabitoNocivo[];
  ausentismos: AusentismoMedico[];
  nro_hijos_vivos: number | null;
}

export interface UpdateAntecedentesPatologicosDto {
  alergias?: boolean;
  diabetes?: boolean;
  tbc?: boolean;
  hepatitis_b?: boolean;
  asma?: boolean;
  hta?: boolean;
  its?: boolean;
  tifoidea?: boolean;
  bronquitis?: boolean;
  neoplasia?: boolean;
  convulsiones?: boolean;
  quemaduras?: boolean;
  cirugias?: boolean;
  intoxicaciones?: boolean;
  otros?: boolean;
  detalle_cirugias?: string;
  detalle_otros?: string;
  antecedente_padre?: string;
  antecedente_madre?: string;
  antecedente_hermanos?: string;
  antecedente_esposo?: string;
  nro_hijos_fallecidos?: number;
}

export interface UpsertHabitoItem {
  id?: string;
  tipo: TipoHabitoNocivo;
  cantidad?: string;
  frecuencia?: string;
}

export interface UpsertAusentismoItem {
  id?: string;
  enfermedad_accidente: string;
  asociado_trabajo: boolean;
  anio: number;
  dias_descanso: number;
}

export const saludTrabajadorService = {
  findAll(trabajadorId: string): Promise<SaludTrabajadorResponse> {
    return apiClient
      .get<SaludTrabajadorResponse>(`/trabajadores/${trabajadorId}/salud`)
      .then((r) => r.data);
  },

  upsertAntecedentes(
    trabajadorId: string,
    dto: UpdateAntecedentesPatologicosDto,
  ): Promise<AntecedentesPatologicos> {
    return apiClient
      .patch<AntecedentesPatologicos>(
        `/trabajadores/${trabajadorId}/salud/antecedentes`,
        dto,
      )
      .then((r) => r.data);
  },

  upsertHabitosBulk(
    trabajadorId: string,
    items: UpsertHabitoItem[],
  ): Promise<HabitoNocivo[]> {
    return apiClient
      .post<HabitoNocivo[]>(
        `/trabajadores/${trabajadorId}/salud/habitos/upsert-bulk`,
        { items },
      )
      .then((r) => r.data);
  },

  upsertAusentismosBulk(
    trabajadorId: string,
    items: UpsertAusentismoItem[],
  ): Promise<AusentismoMedico[]> {
    return apiClient
      .post<AusentismoMedico[]>(
        `/trabajadores/${trabajadorId}/salud/ausentismos/upsert-bulk`,
        { items },
      )
      .then((r) => r.data);
  },

  sugerenciasEnfermedadAccidente(q: string, limit = 20): Promise<string[]> {
    return apiClient
      .get<string[]>('/salud/sugerencias/enfermedades-ausentismo', {
        params: { q, limit },
      })
      .then((r) => r.data);
  },
};
