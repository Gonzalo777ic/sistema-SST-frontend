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
  TRABAJADOR = 'TRABAJADOR',
  AUDITOR = 'AUDITOR',
}

export interface Usuario {
  id: string;
  dni: string;
  authProvider: AuthProvider;
  roles: UsuarioRol[];
  activo: boolean;
  debe_cambiar_password: boolean;
  ultimoAcceso: Date | null;
  empresaId: string | null;
  trabajadorId: string | null;
  perfil_completado?: boolean;
  createdAt: Date;
}

export interface LoginResponse {
  access_token: string;
  usuario: Usuario;
}

export interface LoginRequest {
  dni: string;
  password: string;
}
