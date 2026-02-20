export enum AuthProvider {
  LOCAL = 'LOCAL',
  GOOGLE = 'GOOGLE',
  MICROSOFT = 'MICROSOFT',
}

export enum UsuarioRol {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN_EMPRESA = 'ADMIN_EMPRESA',
  INGENIERO_SST = 'INGENIERO_SST',
  SUPERVISOR = 'SUPERVISOR',
  MEDICO = 'MEDICO',
  EMPLEADO = 'EMPLEADO',
  AUDITOR = 'AUDITOR',
  CENTRO_MEDICO = 'CENTRO_MEDICO',
}

export interface ParticipacionCentroInfo {
  id: string;
  centroMedicoId: string;
  centroMedicoNombre: string;
  estado: string;
  fechaInicio: string;
  fechaFin: string | null;
}

export interface Usuario {
  id: string;
  dni: string;
  nombres?: string | null;
  apellido_paterno?: string | null;
  apellido_materno?: string | null;
  firma_url?: string | null;
  authProvider: AuthProvider;
  roles: UsuarioRol[];
  activo: boolean;
  debe_cambiar_password: boolean;
  ultimoAcceso: Date | null;
  empresaId: string | null;
  trabajadorId: string | null;
  centroMedicoId?: string | null;
  centroMedicoNombre?: string | null;
  participacionesCentroMedico?: ParticipacionCentroInfo[];
  perfil_completado?: boolean;
  createdAt: Date;
}

export interface EmpresaVinculada {
  id: string;
  nombre: string;
  logoUrl: string | null;
}

export interface LoginResponse {
  access_token: string;
  usuario: Usuario;
  empresasVinculadas: EmpresaVinculada[];
}

export interface LoginRequest {
  dni: string;
  password: string;
}

// Enums para Comités
export enum TipoMiembro {
  TITULAR = 'TITULAR',
  SUPLENTE = 'SUPLENTE',
}

export enum RolComite {
  PRESIDENTE = 'PRESIDENTE',
  SECRETARIO = 'SECRETARIO',
  MIEMBRO = 'MIEMBRO',
  OBSERVADOR = 'OBSERVADOR',
}

export enum Representacion {
  EMPLEADOR = 'EMPLEADOR',
  TRABAJADOR = 'TRABAJADOR',
}

// Interfaces para Comités
export interface IComite {
  id: string;
  empresa_id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  descripcion: string | null;
  nro_miembros: number;
  activo: boolean;
  empresa_nombre?: string; // Para mostrar en la tabla
  createdAt: Date;
  updatedAt: Date;
}

export interface IMiembro {
  id: string;
  comite_id: string;
  trabajador_id: string;
  trabajador_nombre: string | null;
  trabajador_dni?: string;
  trabajador_cargo?: string;
  tipo_miembro: TipoMiembro;
  rol_comite: RolComite;
  representacion: Representacion;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDocumento {
  id: string;
  comite_id: string;
  titulo: string;
  url: string;
  fecha_registro: string;
}

// Enums para Reuniones y Acuerdos
export enum EstadoReunion {
  PENDIENTE = 'PENDIENTE',
  COMPLETADA = 'COMPLETADA',
  CANCELADA = 'CANCELADA',
}

export enum TipoReunion {
  ORDINARIA = 'ORDINARIA',
  EXTRAORDINARIA = 'EXTRAORDINARIA',
}

export enum TipoAcuerdo {
  INFORMATIVO = 'INFORMATIVO',
  CON_SEGUIMIENTO = 'CON_SEGUIMIENTO',
}

export enum EstadoAcuerdo {
  PENDIENTE = 'PENDIENTE',
  EN_PROCESO = 'EN_PROCESO',
  APROBADO = 'APROBADO',
  ANULADO = 'ANULADO',
}

// Interfaces para Agenda
export interface IAgendaReunion {
  id: string;
  reunion_id: string;
  descripcion: string;
  orden: number;
  createdAt: Date;
  updatedAt: Date;
}

// Interfaces para Reuniones
export interface IReunion {
  id: string;
  comite_id: string;
  comite_nombre?: string;
  sesion: string;
  fecha_realizacion: string;
  hora_registro: string | null;
  lugar: string | null;
  descripcion: string | null;
  estado: EstadoReunion;
  tipo_reunion: TipoReunion;
  enviar_alerta: boolean;
  nro_acuerdos?: number;
  agenda?: IAgendaReunion[];
  registrado_por?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Interfaces para Acuerdos
export interface IAcuerdo {
  id: string;
  reunion_id: string;
  titulo: string;
  descripcion?: string;
  tipo_acuerdo: TipoAcuerdo;
  fecha_programada: string | null;
  fecha_real: string | null;
  estado: EstadoAcuerdo;
  responsables: Array<{
    id: string;
    nombre: string;
    dni?: string;
    puesto?: string;
    area?: string;
  }>;
  responsable_nombre?: string;
  observaciones: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// DTOs para crear/actualizar
export interface CreateReunionComiteDto {
  comites_ids: string[];
  sesion: string;
  fecha_realizacion: string;
  hora_registro?: string;
  lugar?: string;
  descripcion?: string;
  estado?: EstadoReunion;
  tipo_reunion?: TipoReunion;
  enviar_alerta?: boolean;
  agenda?: string[];
}

export interface UpdateReunionComiteDto {
  sesion?: string;
  fecha_realizacion?: string;
  hora_registro?: string;
  lugar?: string;
  descripcion?: string;
  estado?: EstadoReunion;
  tipo_reunion?: TipoReunion;
  enviar_alerta?: boolean;
  agenda?: string[];
}

export interface CreateAcuerdoComiteDto {
  reunion_id: string;
  titulo: string;
  descripcion?: string;
  tipo_acuerdo?: TipoAcuerdo;
  fecha_programada?: string;
  fecha_real?: string;
  estado?: EstadoAcuerdo;
  responsables_ids: string[];
  observaciones?: string;
}

export interface UpdateAcuerdoComiteDto {
  titulo?: string;
  tipo_acuerdo?: TipoAcuerdo;
  fecha_programada?: string;
  fecha_real?: string;
  estado?: EstadoAcuerdo;
  responsable_id?: string;
  observaciones?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateComiteDto {
  empresa_id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  descripcion?: string;
  nro_miembros?: number;
  activo?: boolean;
}

export interface UpdateComiteDto {
  nombre?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  descripcion?: string;
  nro_miembros?: number;
  activo?: boolean;
}

export interface CreateMiembroComiteDto {
  trabajador_id: string;
  tipo_miembro: TipoMiembro;
  rol_comite: RolComite;
  representacion: Representacion;
}

export interface CreateDocumentoComiteDto {
  titulo: string;
  url: string;
  fecha_registro?: string;
}
