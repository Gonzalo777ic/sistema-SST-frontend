import apiClient from '@/lib/axios';

export interface Empresa {
  id: string;
  nombre: string;
  ruc: string;
  direccion: string | null;
  pais: string | null;
  departamento: string | null;
  provincia: string | null;
  distrito: string | null;
  actividad_economica: string | null;
  numero_trabajadores: number;
  logoUrl: string | null;
  activo: boolean;
  areas?: { id: string; nombre: string }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEmpresaDto {
  nombre: string;
  ruc: string;
  direccion: string;
  pais?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  actividad_economica: string;
  numero_trabajadores?: number;
  logoUrl?: string;
  activo?: boolean;
}

export interface UpdateEmpresaDto {
  nombre?: string;
  ruc?: string;
  direccion?: string;
  pais?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  actividad_economica?: string;
  numero_trabajadores?: number;
  logoUrl?: string;
  activo?: boolean;
}

export interface Area {
  id: string;
  nombre: string;
}

export interface CreateAreaDto {
  nombre: string;
}

export interface CandidatoGerente {
  tipo: 'usuario' | 'trabajador';
  id: string;
  nombre_completo: string;
  numero_documento: string;
  tipo_documento: string;
  firma_url?: string | null;
}

export interface FirmaGerente {
  id: string;
  empresa_id: string;
  usuario_id: string | null;
  trabajador_id: string | null;
  nombre_completo: string;
  numero_documento: string;
  tipo_documento: string;
  rol: string;
  cargo: string;
  firma_url: string | null;
  activo: boolean;
}

export interface CreateFirmaGerenteDto {
  empresa_id: string;
  usuario_id?: string | null;
  trabajador_id?: string | null;
  nombre_completo: string;
  numero_documento: string;
  tipo_documento?: string;
  rol: string;
  cargo: string;
  firma_base64?: string | null;
}

export const empresasService = {
  async uploadLogo(ruc: string, file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('ruc', ruc);
    const response = await apiClient.post<{ url: string }>('/empresas/upload-logo', formData);
    return response.data;
  },

  async findAll(): Promise<Empresa[]> {
    const response = await apiClient.get<Empresa[]>('/empresas');
    return response.data;
  },

  async findOne(id: string): Promise<Empresa> {
    const response = await apiClient.get<Empresa>(`/empresas/${id}`);
    return response.data;
  },

  async create(data: CreateEmpresaDto): Promise<Empresa> {
    const response = await apiClient.post<Empresa>('/empresas', data);
    return response.data;
  },

  async update(id: string, data: UpdateEmpresaDto): Promise<Empresa> {
    const response = await apiClient.patch<Empresa>(`/empresas/${id}`, data);
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/empresas/${id}`);
  },

  async findAreas(empresaId: string): Promise<Area[]> {
    const response = await apiClient.get<Area[]>(`/empresas/${empresaId}/areas`);
    return response.data;
  },

  async createArea(empresaId: string, data: CreateAreaDto): Promise<Area> {
    const response = await apiClient.post<Area>(
      `/empresas/${empresaId}/areas`,
      data
    );
    return response.data;
  },

  async buscarCandidatosGerente(empresaId: string, q: string): Promise<CandidatoGerente[]> {
    const response = await apiClient.get<CandidatoGerente[]>(
      `/empresas/${empresaId}/gerentes/candidatos`,
      { params: { q } }
    );
    return response.data;
  },

  async listarGerentes(empresaId: string): Promise<FirmaGerente[]> {
    const response = await apiClient.get<FirmaGerente[]>(
      `/empresas/${empresaId}/gerentes`
    );
    return response.data;
  },

  async crearGerente(data: CreateFirmaGerenteDto): Promise<FirmaGerente> {
    const response = await apiClient.post<FirmaGerente>('/empresas/gerentes', data);
    return response.data;
  },

  async actualizarGerente(id: string, data: { rol?: string; cargo?: string; firma_base64?: string | null }): Promise<FirmaGerente> {
    const response = await apiClient.patch<FirmaGerente>(`/empresas/gerentes/${id}`, data);
    return response.data;
  },

  async desactivarGerente(id: string): Promise<FirmaGerente> {
    const response = await apiClient.patch<FirmaGerente>(`/empresas/gerentes/${id}/desactivar`);
    return response.data;
  },

  async reactivarGerente(id: string): Promise<FirmaGerente> {
    const response = await apiClient.patch<FirmaGerente>(`/empresas/gerentes/${id}/reactivar`);
    return response.data;
  },
};
