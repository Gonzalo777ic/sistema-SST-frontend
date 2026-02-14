import apiClient from '@/lib/axios';

export enum EstadoTrabajador {
  Activo = 'Activo',
  Inactivo = 'Inactivo',
  Vacaciones = 'Vacaciones',
  Licencia = 'Licencia',
}

export enum TipoDocumento {
  DNI = 'DNI',
  CARNE_EXTRANJERIA = 'CARNE_EXTRANJERIA',
  PASAPORTE = 'PASAPORTE',
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
  nombres: string | null;
  apellido_paterno: string | null;
  apellido_materno: string | null;
  nombre_completo: string;
  tipo_documento: TipoDocumento | null;
  numero_documento: string | null;
  documento_identidad: string;
  cargo: string;
  puesto?: string | null;
  area_id: string | null;
  area_nombre?: string | null;
  telefono: string | null;
  email_personal: string | null;
  email_corporativo?: string | null;
  fecha_ingreso: string;
  estado: EstadoTrabajador;
  grupo_sanguineo: GrupoSanguineo | null;
  contacto_emergencia_nombre: string | null;
  contacto_emergencia_telefono: string | null;
  foto_url: string | null;
  firma_digital_url?: string | null;
  talla_casco?: string | null;
  talla_camisa?: string | null;
  talla_pantalon?: string | null;
  talla_calzado?: number | null;
  empresa_id: string;
  empresa_nombre?: string | null;
  usuario_id: string | null;
  sede?: string | null;
  unidad?: string | null;
  jefe_directo?: string | null;
  centro_costos?: string | null;
  nivel_exposicion?: string | null;
  tipo_usuario?: string | null;
  seguro_atencion_medica?: string | null;
  fecha_nacimiento?: string | null;
  sexo?: string | null;
  pais?: string | null;
  departamento?: string | null;
  provincia?: string | null;
  distrito?: string | null;
  direccion?: string | null;
  modalidad_contrato?: string | null;
  gerencia?: string | null;
  puesto_capacitacion?: string | null;
  protocolos_emo?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTrabajadorDto {
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  tipo_documento: TipoDocumento;
  numero_documento: string;
  cargo: string;
  area_id?: string;
  telefono?: string;
  email?: string;
  email_corporativo?: string;
  fecha_ingreso: string;
  estado?: EstadoTrabajador;
  grupo_sanguineo?: GrupoSanguineo;
  contacto_emergencia_nombre?: string;
  contacto_emergencia_telefono?: string;
  foto_url?: string;
  sede?: string;
  unidad?: string;
  empresa_id: string;
}

export interface UpdateTrabajadorDto {
  nombres?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  cargo?: string;
  puesto?: string;
  area_id?: string;
  telefono?: string;
  email?: string;
  email_corporativo?: string;
  fecha_ingreso?: string;
  fecha_nacimiento?: string;
  sexo?: string;
  estado?: EstadoTrabajador;
  grupo_sanguineo?: GrupoSanguineo;
  contacto_emergencia_nombre?: string;
  contacto_emergencia_telefono?: string;
  foto_url?: string;
  firma_digital_url?: string;
  sede?: string;
  unidad?: string;
  jefe_directo?: string;
  centro_costos?: string;
  nivel_exposicion?: string;
  tipo_usuario?: string;
  seguro_atencion_medica?: string;
  modalidad_contrato?: string;
  gerencia?: string;
  puesto_capacitacion?: string;
  protocolos_emo?: string;
  pais?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  direccion?: string;
  talla_casco?: string;
  talla_camisa?: string;
  talla_pantalon?: string;
  talla_calzado?: string;
}

export interface UpdatePersonalDataDto {
  talla_casco?: string;
  talla_camisa?: string;
  talla_pantalon?: string;
  talla_calzado?: string;
  firma_digital_url?: string;
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

  async uploadFoto(id: string, file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<{ url: string }>(
      `/trabajadores/${id}/upload-foto`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/trabajadores/${id}`);
  },

  async desactivar(id: string): Promise<Trabajador> {
    const response = await apiClient.patch<Trabajador>(
      `/trabajadores/${id}`,
      { estado: EstadoTrabajador.Inactivo }
    );
    return response.data;
  },

  async activar(id: string): Promise<Trabajador> {
    const response = await apiClient.patch<Trabajador>(
      `/trabajadores/${id}`,
      { estado: EstadoTrabajador.Activo }
    );
    return response.data;
  },

  async updatePersonalData(id: string, data: UpdatePersonalDataDto): Promise<Trabajador> {
    const response = await apiClient.patch<Trabajador>(
      `/trabajadores/${id}/personal-data`,
      data
    );
    return response.data;
  },

  async buscarPorDni(dni: string): Promise<Trabajador | null> {
    try {
      const response = await apiClient.get<Trabajador | null>(`/trabajadores/buscar`, {
        params: { dni },
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.status === 400) {
        return null;
      }
      throw error;
    }
  },

  async buscar(empresaId?: string, q?: string): Promise<Trabajador[]> {
    const params: Record<string, string> = { q: (q || '').trim() };
    if (empresaId) params.empresa_id = empresaId;
    const response = await apiClient.get<Trabajador[]>(`/trabajadores/search`, {
      params,
    });
    return response.data;
  },
};
