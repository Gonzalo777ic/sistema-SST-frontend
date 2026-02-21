import {
  Users,
  GraduationCap,
  Stethoscope,
  HardHat,
  FileText,
  ClipboardCheck,
  AlertTriangle,
  ShieldAlert,
  TrendingUp,
  FolderOpen,
  Users2,
  BarChart3,
  Bell,
  Smartphone,
  Phone,
  Palette,
  UserCog,
  Building2,
  MapPin,
  Database,
  Settings,
  CheckCircle2,
  CalendarDays,
  ListTodo,
} from 'lucide-react';
import { UsuarioRol } from '@/types';

export interface SidebarItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: UsuarioRol[];
  requiresTrabajadorId?: boolean; // Para items que requieren trabajador vinculado
  dynamicHref?: (empresaId: string | null) => string | null;
}

export interface SidebarItemWithChildren {
  label: string;
  icon: React.ElementType;
  items: SidebarItem[];
}

export type SidebarItemType = SidebarItem | SidebarItemWithChildren;

export interface SidebarGroup {
  title: string;
  items: SidebarItemType[];
}

const ROLES_NO_EMPLEADO: UsuarioRol[] = [
  UsuarioRol.SUPER_ADMIN,
  UsuarioRol.ADMIN_EMPRESA,
  UsuarioRol.INGENIERO_SST,
  UsuarioRol.SUPERVISOR,
  UsuarioRol.MEDICO,
  UsuarioRol.AUDITOR,
  UsuarioRol.CENTRO_MEDICO,
];

/** Sidebar mínimo para usuario centro médico: solo Citas y Configuración. */
export const centroMedicoSidebarConfig: SidebarGroup[] = [
  {
    title: 'CENTRO MÉDICO',
    items: [
      {
        label: 'Citas',
        href: '/salud/citas',
        icon: CalendarDays,
        roles: [UsuarioRol.CENTRO_MEDICO],
      },
    ],
  },
];

export const sidebarConfig: SidebarGroup[] = [
  {
    title: 'TRABAJADORES',
    items: [
      {
        label: 'Capacitaciones',
        href: '/capacitaciones',
        icon: GraduationCap,
        roles: ROLES_NO_EMPLEADO,
      },
      {
        label: 'Mis capacitaciones',
        href: '/mis-capacitaciones',
        icon: GraduationCap,
        requiresTrabajadorId: true,
        roles: [UsuarioRol.EMPLEADO, UsuarioRol.SUPERVISOR, UsuarioRol.MEDICO, UsuarioRol.INGENIERO_SST, UsuarioRol.AUDITOR, UsuarioRol.CENTRO_MEDICO],
      },
      {
        label: 'EMOs',
        href: '/salud/examenes',
        icon: Stethoscope,
        roles: ROLES_NO_EMPLEADO,
      },
      {
        label: 'Equipos de protección',
        href: '/epp',
        icon: HardHat,
      },
    ],
  },
  {
    title: 'CONTROL DE RIESGOS',
    items: [
      {
        label: 'Seguimiento de acciones',
        href: '/acciones-correctivas',
        icon: CheckCircle2,
        roles: ROLES_NO_EMPLEADO,
      },
      {
        label: 'Accidentes / Incidentes',
        href: '/incidentes',
        icon: AlertTriangle,
        roles: ROLES_NO_EMPLEADO,
      },
      {
        label: 'Herramientas de gestión',
        icon: ClipboardCheck,
        items: [
          {
            label: 'Gestión Documentaria',
            href: '/gestion-documentaria',
            icon: FolderOpen,
            roles: ROLES_NO_EMPLEADO,
          },
          {
            label: 'Análisis de Riesgos (ATS)',
            href: '/ats',
            icon: ClipboardCheck,
            roles: ROLES_NO_EMPLEADO,
          },
          {
            label: 'Permisos (PETAR)',
            href: '/riesgos/petar',
            icon: ShieldAlert,
            roles: ROLES_NO_EMPLEADO,
            requiresTrabajadorId: true,
          },
          {
            label: 'Matriz IPERC',
            href: '/riesgos/iperc',
            icon: TrendingUp,
            roles: ROLES_NO_EMPLEADO,
            requiresTrabajadorId: true,
          },
          {
            label: 'Inspecciones',
            href: '/inspecciones',
            icon: ClipboardCheck,
            roles: ROLES_NO_EMPLEADO,
          },
          {
            label: 'Procedimientos (PETS)',
            href: '/riesgos/pets',
            icon: FileText,
            roles: ROLES_NO_EMPLEADO,
            requiresTrabajadorId: true,
          },
        ],
      },
    ],
  },
  {
    title: 'GESTIÓN DOCUMENTARIA',
    items: [
      {
        label: 'Comité de SST',
        icon: Users2,
        items: [
          {
            label: 'Gestión de Comités',
            href: '/comites',
            icon: Users,
            roles: ROLES_NO_EMPLEADO,
          },
          {
            label: 'Reuniones y Actas',
            href: '/comites/reuniones',
            icon: CalendarDays,
            roles: ROLES_NO_EMPLEADO,
          },
          {
            label: 'Seguimiento de Acuerdos',
            href: '/comites/acuerdos',
            icon: ListTodo,
            roles: ROLES_NO_EMPLEADO,
          },
        ],
      },
    ],
  },
  {
    title: 'REPORTES',
    items: [
      {
        label: 'Cumplimiento',
        href: '/dashboard/reportes/cumplimiento',
        icon: BarChart3,
        roles: ROLES_NO_EMPLEADO,
      },
      {
        label: 'Accidentes / Incidentes',
        href: '/dashboard/reportes/accidentes',
        icon: AlertTriangle,
        roles: ROLES_NO_EMPLEADO,
      },
      {
        label: 'Capacitaciones',
        href: '/dashboard/reportes/capacitaciones',
        icon: GraduationCap,
        roles: ROLES_NO_EMPLEADO,
      },
      {
        label: 'Comité',
        href: '/dashboard/reportes/comite',
        icon: Users2,
        roles: ROLES_NO_EMPLEADO,
      },
    ],
  },
  {
    title: 'APP DE TRABAJADOR',
    items: [
      {
        label: 'Publicar comunicados',
        href: '/dashboard/app/comunicados',
        icon: Smartphone,
        roles: ROLES_NO_EMPLEADO,
      },
      {
        label: 'Contactos SST',
        href: '/dashboard/app/contactos',
        icon: Phone,
        roles: ROLES_NO_EMPLEADO,
      },
      {
        label: 'Menu/Branding',
        href: '/dashboard/app/branding',
        icon: Palette,
        roles: ROLES_NO_EMPLEADO,
      },
    ],
  },
  {
    title: 'CONFIGURACIÓN',
    items: [
      {
        label: 'Usuarios y Accesos',
        icon: Users,
        items: [
          {
            label: 'Usuarios',
            href: '/gestion-usuarios',
            icon: UserCog,
            roles: [UsuarioRol.SUPER_ADMIN, UsuarioRol.ADMIN_EMPRESA],
          },
          {
            label: 'Trabajadores',
            href: '/trabajadores',
            icon: Users,
            roles: [UsuarioRol.SUPER_ADMIN, UsuarioRol.ADMIN_EMPRESA],
          },
          {
            label: 'Médicos Ocupacionales',
            href: '/medicos-ocupacionales',
            icon: Stethoscope,
            roles: [UsuarioRol.SUPER_ADMIN, UsuarioRol.ADMIN_EMPRESA],
          },
          {
            label: 'Auditores',
            href: '/auditores',
            icon: ShieldAlert,
            roles: [UsuarioRol.SUPER_ADMIN, UsuarioRol.ADMIN_EMPRESA],
          },
          {
            label: 'Usuarios Centro Médico',
            href: '/usuarios-centro-medico',
            icon: Building2,
            roles: [UsuarioRol.SUPER_ADMIN, UsuarioRol.ADMIN_EMPRESA],
          },
        ],
      },
      {
        label: 'Alertas',
        href: '/dashboard/config/alertas',
        icon: Bell,
        roles: ROLES_NO_EMPLEADO,
      },
      {
        label: 'Jerarquía Organizacional',
        href: '/empresas',
        icon: Building2,
        roles: [UsuarioRol.SUPER_ADMIN],
      },
      {
        label: 'Gestión de Áreas',
        href: '',
        icon: MapPin,
        roles: [UsuarioRol.SUPER_ADMIN, UsuarioRol.ADMIN_EMPRESA],
        dynamicHref: (empresaId) => empresaId ? `/empresas/${empresaId}/areas` : null,
      },
      {
        label: 'Datos para importación',
        href: '/dashboard/config/importacion',
        icon: Database,
        roles: ROLES_NO_EMPLEADO,
      },
      {
        label: 'Configuración EPP',
        href: '/configuracion/epp',
        icon: Settings,
        roles: ROLES_NO_EMPLEADO,
      },
    ],
  },
];
