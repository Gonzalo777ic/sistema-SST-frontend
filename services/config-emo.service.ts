import { apiClient } from '@/lib/axios';

export interface PerfilEmo {
  id: string;
  fecha_registro: string;
  nombre: string;
  registrado_por: string;
}

export interface CentroMedico {
  id: string;
  fecha_registro: string;
  centro_medico: string;
  direccion: string | null;
  archivo_pdf_url: string | null;
}

export interface ResultadoAdicional {
  id: string;
  nombre: string;
}

export interface EmoDiferido {
  id: string;
  nombre_apellido: string;
  tipo_documento: string;
  numero_documento: string;
}

export const configEmoService = {
  async getPerfiles(): Promise<PerfilEmo[]> {
    const { data } = await apiClient.get<PerfilEmo[]>('/config-emo/perfiles');
    return data;
  },

  async createPerfil(dto: { nombre: string; descripcion?: string; costo_unitario: number }): Promise<PerfilEmo> {
    const { data } = await apiClient.post<PerfilEmo>('/config-emo/perfiles', dto);
    return data;
  },

  async getPerfil(id: string): Promise<{ id: string; nombre: string; descripcion: string | null; costoUnitario: number; registradoPorNombre: string }> {
    const { data } = await apiClient.get(`/config-emo/perfiles/${id}`);
    return data;
  },

  async updatePerfil(id: string, dto: { nombre?: string; descripcion?: string; costo_unitario?: number }): Promise<PerfilEmo> {
    const { data } = await apiClient.patch<PerfilEmo>(`/config-emo/perfiles/${id}`, dto);
    return data;
  },

  async getCentros(): Promise<CentroMedico[]> {
    const { data } = await apiClient.get<CentroMedico[]>('/config-emo/centros');
    return data;
  },

  async createCentro(dto: {
    nombre: string;
    direccion?: string;
    archivo_pdf_base64?: string;
    usuario_crear?: {
      dni: string;
      password?: string;
      nombres?: string;
      apellido_paterno?: string;
      apellido_materno?: string;
    };
  }): Promise<CentroMedico & { usuario_creado?: { dni: string; mensaje: string } }> {
    const { data } = await apiClient.post('/config-emo/centros', dto);
    return data;
  },

  async updateCentro(id: string, dto: { nombre?: string; direccion?: string; archivo_pdf_base64?: string }): Promise<CentroMedico> {
    const { data } = await apiClient.patch<CentroMedico>(`/config-emo/centros/${id}`, dto);
    return data;
  },

  async removeCentro(id: string): Promise<void> {
    await apiClient.delete(`/config-emo/centros/${id}`);
  },

  async getResultados(): Promise<ResultadoAdicional[]> {
    const { data } = await apiClient.get<ResultadoAdicional[]>('/config-emo/resultados');
    return data;
  },

  async createResultado(dto: { nombre: string }): Promise<ResultadoAdicional> {
    const { data } = await apiClient.post<ResultadoAdicional>('/config-emo/resultados', dto);
    return data;
  },

  async updateResultado(id: string, dto: { nombre: string }): Promise<ResultadoAdicional> {
    const { data } = await apiClient.patch<ResultadoAdicional>(`/config-emo/resultados/${id}`, dto);
    return data;
  },

  async removeResultado(id: string): Promise<void> {
    await apiClient.delete(`/config-emo/resultados/${id}`);
  },

  async getRecomendaciones(): Promise<string> {
    const { data } = await apiClient.get<{ recomendaciones: string }>('/config-emo/recomendaciones');
    return data.recomendaciones;
  },

  async updateRecomendaciones(recomendaciones: string): Promise<string> {
    const { data } = await apiClient.patch<{ recomendaciones: string }>('/config-emo/recomendaciones', { recomendaciones });
    return data.recomendaciones;
  },

  async getDiferidos(q?: string): Promise<EmoDiferido[]> {
    const params = q ? { q } : {};
    const { data } = await apiClient.get<EmoDiferido[]>('/config-emo/diferidos', { params });
    return data;
  },
};
