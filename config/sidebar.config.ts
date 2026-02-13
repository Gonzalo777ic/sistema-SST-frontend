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
  FolderClosed,
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

export const sidebarConfig: SidebarGroup[] = [
  {
    title: 'TRABAJADORES',
    items: [
      {
        label: 'Trabajadores activos',
        href: '/trabajadores',
        icon: Users,
        roles: [
          UsuarioRol.SUPER_ADMIN,
          UsuarioRol.ADMIN_EMPRESA,
          UsuarioRol.INGENIERO_SST,
          UsuarioRol.SUPERVISOR,
        ],
      },
      {
        label: 'Capacitaciones',
        href: '/capacitaciones',
        icon: GraduationCap,
        roles: [
          UsuarioRol.SUPER_ADMIN,
          UsuarioRol.ADMIN_EMPRESA,
          UsuarioRol.INGENIERO_SST,
          UsuarioRol.SUPERVISOR,
        ],
      },
      {
        label: 'Exámenes médicos',
        href: '/mis-examenes',
        icon: Stethoscope,
        requiresTrabajadorId: true,
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
      },
      {
        label: 'Accidentes / Incidentes',
        href: '/incidentes',
        icon: AlertTriangle,
      },
      {
        label: 'Herramientas de gestión',
        icon: ClipboardCheck,
        items: [
          {
            label: 'Análisis de Riesgos (ATS)',
            href: '/ats',
            icon: ClipboardCheck,
            roles: [
              UsuarioRol.SUPER_ADMIN,
              UsuarioRol.ADMIN_EMPRESA,
              UsuarioRol.INGENIERO_SST,
              UsuarioRol.SUPERVISOR,
              UsuarioRol.EMPLEADO,
            ],
          },
          {
            label: 'Permisos (PETAR)',
            href: '/riesgos/petar',
            icon: ShieldAlert,
            roles: [
              UsuarioRol.SUPER_ADMIN,
              UsuarioRol.ADMIN_EMPRESA,
              UsuarioRol.INGENIERO_SST,
              UsuarioRol.SUPERVISOR,
              UsuarioRol.EMPLEADO,
            ],
            requiresTrabajadorId: true, // Para EMPLEADO
          },
          {
            label: 'Matriz IPERC',
            href: '/riesgos/iperc',
            icon: TrendingUp,
            roles: [
              UsuarioRol.SUPER_ADMIN,
              UsuarioRol.ADMIN_EMPRESA,
              UsuarioRol.INGENIERO_SST,
              UsuarioRol.SUPERVISOR,
              UsuarioRol.EMPLEADO,
            ],
            requiresTrabajadorId: true, // Para EMPLEADO
          },
          {
            label: 'Inspecciones',
            href: '/inspecciones',
            icon: ClipboardCheck,
          },
          {
            label: 'Procedimientos (PETS)',
            href: '/riesgos/pets',
            icon: FileText,
            roles: [
              UsuarioRol.SUPER_ADMIN,
              UsuarioRol.ADMIN_EMPRESA,
              UsuarioRol.INGENIERO_SST,
              UsuarioRol.SUPERVISOR,
              UsuarioRol.EMPLEADO,
            ],
            requiresTrabajadorId: true, // Para EMPLEADO
          },
        ],
      },
    ],
  },
  {
    title: 'GESTIÓN DOCUMENTARIA',
    items: [
      {
        label: 'Documentos SST',
        href: '/documentos',
        icon: FolderClosed,
      },
      {
        label: 'Difusión de documentos',
        href: '/difusion',
        icon: FileText,
      },
      {
        label: 'Comité de SST',
        icon: Users2,
        items: [
          {
            label: 'Gestión de Comités',
            href: '/comites',
            icon: Users,
          },
          {
            label: 'Reuniones y Actas',
            href: '/comites/reuniones',
            icon: CalendarDays,
          },
          {
            label: 'Seguimiento de Acuerdos',
            href: '/comites/acuerdos',
            icon: ListTodo,
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
      },
      {
        label: 'Accidentes / Incidentes',
        href: '/dashboard/reportes/accidentes',
        icon: AlertTriangle,
      },
      {
        label: 'Capacitaciones',
        href: '/dashboard/reportes/capacitaciones',
        icon: GraduationCap,
      },
      {
        label: 'Comité',
        href: '/dashboard/reportes/comite',
        icon: Users2,
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
      },
      {
        label: 'Contactos SST',
        href: '/dashboard/app/contactos',
        icon: Phone,
      },
      {
        label: 'Menu/Branding',
        href: '/dashboard/app/branding',
        icon: Palette,
      },
    ],
  },
  {
    title: 'CONFIGURACIÓN',
    items: [
      {
        label: 'Usuarios',
        href: '/gestion-usuarios',
        icon: UserCog,
        roles: [UsuarioRol.SUPER_ADMIN, UsuarioRol.ADMIN_EMPRESA],
      },
      {
        label: 'Alertas',
        href: '/dashboard/config/alertas',
        icon: Bell,
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
      },
      {
        label: 'Configuración EPP',
        href: '/configuracion/epp',
        icon: Settings,
      },
    ],
  },
];
