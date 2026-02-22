import apiClient from '@/lib/axios';

export interface AntecedenteOcupacional {
  id: string;
  empresa: string;
  area_trabajo: string | null;
  ocupacion: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  tiempo_total: string | null;
  riesgos: string | null;
  epp_utilizado: string | null;
  trabajador_id: string;
}

export interface CreateAntecedenteOcupacionalDto {
  empresa: string;
  area_trabajo?: string;
  ocupacion: string;
  fecha_inicio: string;
  fecha_fin?: string;
  tiempo_total?: string;
  riesgos?: string;
  epp_utilizado?: string;
}

export interface UpsertAntecedenteItem {
  id?: string;
  empresa: string;
  area_trabajo?: string;
  ocupacion: string;
  fecha_inicio: string;
  fecha_fin?: string;
  riesgos?: string;
  epp_utilizado?: string;
}

export const antecedentesOcupacionalesService = {
  findByTrabajadorId(trabajadorId: string): Promise<AntecedenteOcupacional[]> {
    return apiClient
      .get<AntecedenteOcupacional[]>(`/trabajadores/${trabajadorId}/antecedentes-ocupacionales`)
      .then((r) => r.data);
  },

  create(trabajadorId: string, dto: CreateAntecedenteOcupacionalDto): Promise<AntecedenteOcupacional> {
    return apiClient
      .post<AntecedenteOcupacional>(`/trabajadores/${trabajadorId}/antecedentes-ocupacionales`, dto)
      .then((r) => r.data);
  },

  update(
    trabajadorId: string,
    id: string,
    dto: Partial<CreateAntecedenteOcupacionalDto>,
  ): Promise<AntecedenteOcupacional> {
    return apiClient
      .patch<AntecedenteOcupacional>(
        `/trabajadores/${trabajadorId}/antecedentes-ocupacionales/${id}`,
        dto,
      )
      .then((r) => r.data);
  },

  remove(trabajadorId: string, id: string): Promise<void> {
    return apiClient.delete(
      `/trabajadores/${trabajadorId}/antecedentes-ocupacionales/${id}`,
    );
  },

  upsertBulk(
    trabajadorId: string,
    items: UpsertAntecedenteItem[],
  ): Promise<AntecedenteOcupacional[]> {
    return apiClient
      .post<AntecedenteOcupacional[]>(
        `/trabajadores/${trabajadorId}/antecedentes-ocupacionales/upsert-bulk`,
        { items },
      )
      .then((r) => r.data);
  },
};
