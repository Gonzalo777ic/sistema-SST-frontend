import apiClient from '@/lib/axios';

export interface IConfigEpp {
  umbral_vigencia_meses: number;
  umbral_costo: number;
}

export type RecomendacionCriticidad = 'Core' | 'Recurrente' | 'Indeterminado';

export const configEppService = {
  async getConfig(): Promise<IConfigEpp> {
    const response = await apiClient.get<IConfigEpp>('/config-epp');
    return response.data;
  },

  async updateConfig(data: Partial<IConfigEpp>): Promise<IConfigEpp> {
    const response = await apiClient.patch<IConfigEpp>('/config-epp', data);
    return response.data;
  },

  async getRecomendacion(
    vigenciaMeses: number,
    costo: number
  ): Promise<RecomendacionCriticidad> {
    const response = await apiClient.get<{ recomendacion: RecomendacionCriticidad }>(
      '/config-epp/recomendacion',
      { params: { vigencia_meses: vigenciaMeses, costo } }
    );
    return response.data.recomendacion;
  },
};
