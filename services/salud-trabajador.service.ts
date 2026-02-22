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
}

export type TipoHabitoNocivo = 'Alcohol' | 'Tabaco' | 'Drogas' | 'Medicamentos';

export interface HabitoNocivo {
  id: string;
  tipo: TipoHabitoNocivo;
  cantidad: string | null;
  frecuencia: string | null;
  trabajador_id: string;
}

export interface SaludTrabajadorResponse {
  antecedentes_patologicos: AntecedentesPatologicos | null;
  habitos_nocivos: HabitoNocivo[];
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
}

export interface UpsertHabitoItem {
  id?: string;
  tipo: TipoHabitoNocivo;
  cantidad?: string;
  frecuencia?: string;
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
};
