import apiClient from '@/lib/axios';

export enum EstadoTrabajador {
  Activo = 'Activo',
  Inactivo = 'Inactivo',
  Vacaciones = 'Vacaciones',
  Licencia = 'Licencia',
}

export enum GrupoSanguineo {
  'A+' = 'A+',
  'A-' = 'A-',
  'B+' = 'B+',
  'B-' = 'B-',
  'AB+' = 'AB+',
  'AB-' = 'AB-',
  'O+' = 'O+',
  'O-' = 'O-',
}

export interface Trabajador {
  id: string;
  nombre_completo: string;
  documento_identidad: string;
  cargo: string;
  area_id: string | null;
  telefono: string | null;
  email_personal: string | null;
  fecha_ingreso: string;
  estado: EstadoTrabajador;
  grupo_sanguineo: GrupoSanguineo | null;
  contacto_emergencia_nombre: string | null;
  contacto_emergencia_telefono: string | null;
  foto_url: string | null;
  empresa_id: string;
  usuario_id: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTrabajadorDto {
  nombre_completo: string;
  documento_identidad: string;
  cargo: string;
  area_id?: string;
  telefono?: string;
  email?: string;
  fecha_ingreso: string;
  estado?: EstadoTrabajador;
  grupo_sanguineo?: GrupoSanguineo;
  contacto_emergencia?: string;
  foto_url?: string;
  empresa_id: string;
}

export interface UpdateTrabajadorDto {
  nombre_completo?: string;
  documento_identidad?: string;
  cargo?: string;
  area_id?: string;
  telefono?: string;
  email?: string;
  fecha_ingreso?: string;
  estado?: EstadoTrabajador;
  grupo_sanguineo?: GrupoSanguineo;
  contacto_emergencia_nombre?: string;
  contacto_emergencia_telefono?: string;
  foto_url?: string;
}

export const trabajadoresService = {
  async findAll(empresaId?: string): Promise<Trabajador[]> {
    const params = empresaId ? { empresa_id: empresaId } : {};
    const response = await apiClient.get<Trabajador[]>('/trabajadores', {
      params,
    });
    return response.data;
  },

  async findOne(id: string): Promise<Trabajador> {
    const response = await apiClient.get<Trabajador>(`/trabajadores/${id}`);
    return response.data;
  },

  async create(data: CreateTrabajadorDto): Promise<Trabajador> {
    const response = await apiClient.post<Trabajador>('/trabajadores', data);
    return response.data;
  },

  async update(id: string, data: UpdateTrabajadorDto): Promise<Trabajador> {
    const response = await apiClient.patch<Trabajador>(
      `/trabajadores/${id}`,
      data
    );
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/trabajadores/${id}`);
  },
};
