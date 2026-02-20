import apiClient from '@/lib/axios';

export interface ParticipacionInfo {
  id: string;
  centroMedicoId: string;
  centroMedicoNombre: string;
  estado: string;
  fechaInicio: string;
  fechaFin: string | null;
}

export interface ParticipacionConUsuarioInfo extends ParticipacionInfo {
  usuarioId: string;
  usuarioDni: string;
}

export interface CentroConParticipaciones {
  centroId: string;
  centroNombre: string;
  participaciones: ParticipacionConUsuarioInfo[];
}

export interface CreateParticipacionDto {
  usuario_id: string;
  centro_medico_id: string;
  fecha_inicio?: string;
}

export const usuarioCentroMedicoService = {
  async getParticipaciones(
    usuarioId: string,
    incluirRevocadas = false,
  ): Promise<ParticipacionInfo[]> {
    const params = incluirRevocadas ? '?incluirRevocadas=true' : '';
    const response = await apiClient.get<ParticipacionInfo[]>(
      `/usuario-centro-medico/participaciones/${usuarioId}${params}`,
    );
    return response.data;
  },

  async addParticipacion(dto: CreateParticipacionDto): Promise<ParticipacionInfo> {
    const response = await apiClient.post<ParticipacionInfo>(
      '/usuario-centro-medico/participacion',
      dto,
    );
    return response.data;
  },

  async revocarParticipacion(participacionId: string): Promise<void> {
    await apiClient.delete(`/usuario-centro-medico/participacion/${participacionId}`);
  },

  async vincularUsuarioARegistro(
    participacionId: string,
    usuarioId: string,
  ): Promise<ParticipacionInfo> {
    const response = await apiClient.post<ParticipacionInfo>(
      `/usuario-centro-medico/participacion/${participacionId}/vincular-usuario`,
      { usuario_id: usuarioId },
    );
    return response.data;
  },

  async reactivarParticipacion(participacionId: string): Promise<ParticipacionInfo> {
    const response = await apiClient.post<ParticipacionInfo>(
      `/usuario-centro-medico/participacion/${participacionId}/reactivar`,
    );
    return response.data;
  },

  async desvincular(usuarioId: string, centroMedicoId: string): Promise<void> {
    await apiClient.delete(
      `/usuario-centro-medico/usuario/${usuarioId}/centro/${centroMedicoId}`,
    );
  },

  async getParticipacionesAgrupadas(): Promise<CentroConParticipaciones[]> {
    const response = await apiClient.get<CentroConParticipaciones[]>(
      '/usuario-centro-medico/participaciones-agrupadas',
    );
    return response.data;
  },

  async getParticipacionesPorCentro(centroMedicoId: string): Promise<ParticipacionConUsuarioInfo[]> {
    const response = await apiClient.get<ParticipacionConUsuarioInfo[]>(
      `/usuario-centro-medico/participaciones-por-centro/${centroMedicoId}`,
    );
    return response.data;
  },

  async activarParticipacion(participacionId: string): Promise<ParticipacionInfo> {
    const response = await apiClient.post<ParticipacionInfo>(
      `/usuario-centro-medico/participacion/${participacionId}/activar`,
    );
    return response.data;
  },

  async desactivarParticipacion(participacionId: string): Promise<ParticipacionInfo> {
    const response = await apiClient.post<ParticipacionInfo>(
      `/usuario-centro-medico/participacion/${participacionId}/desactivar`,
    );
    return response.data;
  },

  async agregarUsuarioACentro(dni: string, centroMedicoId: string): Promise<{ usuarioId: string; participacionId: string }> {
    const response = await apiClient.post<{ usuarioId: string; participacionId: string }>(
      '/usuario-centro-medico/agregar-usuario-a-centro',
      { dni, centro_medico_id: centroMedicoId },
    );
    return response.data;
  },
};
