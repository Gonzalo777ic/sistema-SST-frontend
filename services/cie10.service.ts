import apiClient from '@/lib/axios';

export interface Cie10Item {
  id: string;
  code: string;
  description: string;
  level: number;
  code0?: string | null;
  code1?: string | null;
  code2?: string | null;
}

export const cie10Service = {
  /** Busca códigos CIE10 por código o descripción. Máx 20 resultados. */
  async search(q: string): Promise<Cie10Item[]> {
    const trimmed = (q || '').trim();
    if (!trimmed) return [];
    const response = await apiClient.get<Cie10Item[]>('/cie10', {
      params: { q: trimmed },
    });
    return response.data;
  },
};
