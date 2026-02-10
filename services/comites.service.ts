import apiClient from '@/lib/axios';
import {
  IComite,
  IMiembro,
  IDocumento,
  IReunion,
  IAcuerdo,
  CreateComiteDto,
  UpdateComiteDto,
  CreateMiembroComiteDto,
  CreateDocumentoComiteDto,
  CreateReunionComiteDto,
  UpdateReunionComiteDto,
  CreateAcuerdoComiteDto,
  UpdateAcuerdoComiteDto,
} from '@/types';

export const comitesService = {
  async findAll(empresaId?: string): Promise<IComite[]> {
    const params = empresaId ? { empresa_id: empresaId } : {};
    const response = await apiClient.get<IComite[]>('/comites', { params });
    return response.data;
  },

  async findOne(id: string): Promise<IComite> {
    const response = await apiClient.get<IComite>(`/comites/${id}`);
    return response.data;
  },

  async create(data: CreateComiteDto): Promise<IComite> {
    const response = await apiClient.post<IComite>('/comites', data);
    return response.data;
  },

  async update(id: string, data: UpdateComiteDto): Promise<IComite> {
    const response = await apiClient.patch<IComite>(`/comites/${id}`, data);
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/comites/${id}`);
  },

  // Gestión de Miembros
  async listarMiembros(comiteId: string): Promise<IMiembro[]> {
    const response = await apiClient.get<IMiembro[]>(`/comites/${comiteId}/miembros`);
    return response.data;
  },

  async agregarMiembro(
    comiteId: string,
    data: CreateMiembroComiteDto
  ): Promise<IMiembro> {
    const response = await apiClient.post<IMiembro>(
      `/comites/${comiteId}/miembros`,
      data
    );
    return response.data;
  },

  async quitarMiembro(miembroId: string): Promise<void> {
    await apiClient.delete(`/comites/miembros/${miembroId}`);
  },

  // Gestión de Documentos
  async listarDocumentos(comiteId: string): Promise<IDocumento[]> {
    const response = await apiClient.get<IDocumento[]>(
      `/comites/${comiteId}/documentos`
    );
    return response.data;
  },

  async agregarDocumento(
    comiteId: string,
    data: CreateDocumentoComiteDto
  ): Promise<IDocumento> {
    const response = await apiClient.post<IDocumento>(
      `/comites/${comiteId}/documentos`,
      data
    );
    return response.data;
  },

  // Gestión de Reuniones
  async findAllReuniones(filters?: {
    comite_id?: string;
    estado?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
    tipo_reunion?: string;
    descripcion?: string;
  }): Promise<IReunion[]> {
    const params: Record<string, string> = {};
    if (filters?.comite_id) params.comite_id = filters.comite_id;
    if (filters?.estado) params.estado = filters.estado;
    if (filters?.fecha_desde) params.fecha_desde = filters.fecha_desde;
    if (filters?.fecha_hasta) params.fecha_hasta = filters.fecha_hasta;
    if (filters?.tipo_reunion) params.tipo_reunion = filters.tipo_reunion;
    if (filters?.descripcion) params.descripcion = filters.descripcion;

    const response = await apiClient.get<IReunion[]>('/comites/reuniones', { params });
    return response.data;
  },

  async findOneReunion(id: string): Promise<IReunion> {
    const response = await apiClient.get<IReunion>(`/comites/reuniones/${id}`);
    return response.data;
  },

  async createReunion(data: CreateReunionComiteDto): Promise<IReunion[]> {
    const response = await apiClient.post<IReunion[]>('/comites/reuniones', data);
    return response.data;
  },

  async updateReunion(id: string, data: UpdateReunionComiteDto): Promise<IReunion> {
    const response = await apiClient.patch<IReunion>(`/comites/reuniones/${id}`, data);
    return response.data;
  },

  async removeReunion(id: string): Promise<void> {
    await apiClient.delete(`/comites/reuniones/${id}`);
  },

  // Gestión de Acuerdos
  async findAllAcuerdos(filters?: {
    reunion_id?: string;
    comite_id?: string;
    responsable_id?: string;
    estado?: string;
    tipo_acuerdo?: string;
    titulo?: string;
  }): Promise<IAcuerdo[]> {
    const params: Record<string, string> = {};
    if (filters?.reunion_id) params.reunion_id = filters.reunion_id;
    if (filters?.comite_id) params.comite_id = filters.comite_id;
    if (filters?.responsable_id) params.responsable_id = filters.responsable_id;
    if (filters?.estado) params.estado = filters.estado;
    if (filters?.tipo_acuerdo) params.tipo_acuerdo = filters.tipo_acuerdo;
    if (filters?.titulo) params.titulo = filters.titulo;

    const response = await apiClient.get<IAcuerdo[]>('/comites/acuerdos', { params });
    return response.data;
  },

  async findOneAcuerdo(id: string): Promise<IAcuerdo> {
    const response = await apiClient.get<IAcuerdo>(`/comites/acuerdos/${id}`);
    return response.data;
  },

  async createAcuerdo(data: CreateAcuerdoComiteDto): Promise<IAcuerdo> {
    const response = await apiClient.post<IAcuerdo>('/comites/acuerdos', data);
    return response.data;
  },

  async updateAcuerdo(id: string, data: UpdateAcuerdoComiteDto): Promise<IAcuerdo> {
    const response = await apiClient.patch<IAcuerdo>(`/comites/acuerdos/${id}`, data);
    return response.data;
  },

  async removeAcuerdo(id: string): Promise<void> {
    await apiClient.delete(`/comites/acuerdos/${id}`);
  },
};
