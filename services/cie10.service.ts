import apiClient from '@/lib/axios';

export interface Cie10Item {
  id: string;
  code: string;
  description: string;
  level: number;
  code0?: string | null;
  code1?: string | null;
  code2?: string | null;
  categoria_nivel0?: string;
  /** Ancestros para migas de pan (opcional, se obtiene al agregar o al cargar) */
  ancestros?: Array<{ code: string; description: string; level: number }>;
}

export interface Cie10Linaje {
  item: Cie10Item | null;
  ancestros: Array<{ code: string; description: string; level: number }>;
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

  /** Obtiene el linaje (ancestros) de un código para mostrar migas de pan. */
  async getLinaje(code: string): Promise<Cie10Linaje> {
    const response = await apiClient.get<Cie10Linaje>('/cie10/linaje', {
      params: { code },
    });
    return response.data;
  },
};
