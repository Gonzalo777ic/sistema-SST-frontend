import apiClient from '@/lib/axios';

export enum EstadoPETS {
  Borrador = 'Borrador',
  PendienteRevision = 'Pendiente de Revisión',
  EnRevision = 'En Revisión',
  Vigente = 'Vigente',
  Obsoleto = 'Obsoleto',
}

export interface PasoDto {
  numero: number;
  descripcion: string;
  peligros?: string;
  medidas_control?: string;
  epp_requerido?: string[];
}

export interface LecturaDto {
  usuario_id: string;
  usuario_nombre: string;
  fecha_lectura: string;
  aceptado: boolean;
}

export interface EquipoMaterialDto {
  nombre: string;
  tipo: string;
  obligatorio: boolean;
}

export interface RequisitosPreviosDto {
  competencias?: string[];
  herramientas?: string[];
  permisos_asociados?: string[];
}

export interface PETS {
  id: string;
  codigo: string;
  titulo: string;
  version: number;
  estado: EstadoPETS;
  objetivo: string;
  alcance: string;
  definiciones: string | null;
  area_proceso: string | null;
  referencias_normativas: string[] | null;
  equipos_materiales: EquipoMaterialDto[] | null;
  requisitos_previos: RequisitosPreviosDto | null;
  fecha_emision: string;
  fecha_revision: string | null;
  elaborador_id: string;
  elaborador_nombre: string | null;
  revisor_id: string | null;
  revisor_nombre: string | null;
  aprobador_id: string | null;
  aprobador_nombre: string | null;
  empresa_id: string;
  pasos: PasoDto[];
  lecturas: LecturaDto[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePetsDto {
  codigo: string;
  titulo: string;
  objetivo: string;
  alcance: string;
  definiciones?: string;
  area_proceso?: string;
  referencias_normativas?: string[];
  equipos_materiales?: EquipoMaterialDto[];
  requisitos_previos?: RequisitosPreviosDto;
  fecha_emision: string;
  fecha_revision?: string;
  elaborador_id: string;
  empresa_id: string;
  pasos?: PasoDto[];
}

export interface UpdatePetsDto extends Partial<CreatePetsDto> {
  estado?: EstadoPETS;
}

export interface RegistrarLecturaDto {
  usuario_id: string;
  usuario_nombre: string;
}

export const petsService = {
  async findAll(empresaId?: string, estado?: EstadoPETS): Promise<PETS[]> {
    const params: Record<string, string> = {};
    if (empresaId) params.empresa_id = empresaId;
    if (estado) params.estado = estado;
    const response = await apiClient.get<PETS[]>('/pets', { params });
    return response.data;
  },

  async findOne(id: string): Promise<PETS> {
    const response = await apiClient.get<PETS>(`/pets/${id}`);
    return response.data;
  },

  async create(dto: CreatePetsDto): Promise<PETS> {
    const response = await apiClient.post<PETS>('/pets', dto);
    return response.data;
  },

  async update(id: string, dto: UpdatePetsDto): Promise<PETS> {
    const response = await apiClient.patch<PETS>(`/pets/${id}`, dto);
    return response.data;
  },

  async crearNuevaVersion(codigo: string): Promise<PETS> {
    const response = await apiClient.post<PETS>(`/pets/${codigo}/nueva-version`);
    return response.data;
  },

  async registrarLectura(id: string, dto: RegistrarLecturaDto): Promise<void> {
    await apiClient.post(`/pets/${id}/lectura`, dto);
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/pets/${id}`);
  },
};
