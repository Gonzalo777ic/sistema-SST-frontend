'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  FileText,
  Shield,
  Calendar,
  AlertTriangle,
  Settings,
  LogOut,
  Menu,
  X,
  Building2,
  UserPlus,
  ClipboardCheck,
  MapPin,
  HeartPulse,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { UsuarioRol } from '@/types';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: UsuarioRol[];
  dynamicHref?: (empresaId: string | null) => string | null; // Para rutas dinámicas
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Empresas', href: '/empresas', icon: Building2, roles: [UsuarioRol.SUPER_ADMIN, UsuarioRol.ADMIN_EMPRESA] },
  { 
    label: 'Gestión de Áreas', 
    href: '', 
    icon: MapPin, 
    roles: [UsuarioRol.SUPER_ADMIN, UsuarioRol.ADMIN_EMPRESA],
    dynamicHref: (empresaId) => empresaId ? `/empresas/${empresaId}/areas` : null,
  },
  { label: 'Trabajadores', href: '/trabajadores', icon: Users },
  { label: 'Vinculación de Usuarios', href: '/usuarios/vinculacion', icon: UserPlus, roles: [UsuarioRol.SUPER_ADMIN] },
  { 
    label: 'Análisis de Riesgos (ATS)', 
    href: '/ats', 
    icon: ClipboardCheck,
    roles: [UsuarioRol.SUPER_ADMIN, UsuarioRol.ADMIN_EMPRESA, UsuarioRol.INGENIERO_SST, UsuarioRol.SUPERVISOR, UsuarioRol.TRABAJADOR],
  },
  { label: 'Incidentes', href: '/incidentes', icon: AlertTriangle },
  { label: 'Documentos', href: '/documentos', icon: FileText },
  { label: 'EPP', href: '/epp', icon: Shield },
  { label: 'Capacitaciones', href: '/capacitaciones', icon: Calendar },
  { label: 'Mi Salud', href: '/mis-examenes', icon: HeartPulse },
];

export function Sidebar() {
  const pathname = usePathname();
  const { usuario, logout, hasAnyRole, hasRole } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const filteredNavItems = useMemo(() => {
    return navItems
      .map((item) => {
        // Resolver href dinámico si existe
        if (item.dynamicHref) {
          const dynamicHref = item.dynamicHref(usuario?.empresaId || null);
          if (!dynamicHref) return null; // No mostrar si no hay empresaId
          return { ...item, href: dynamicHref };
        }
        return item;
      })
      .filter((item): item is NavItem => {
        if (!item) return false;
        
        // Filtrar "Mi Salud": visible si tiene trabajadorId O es SUPER_ADMIN
        if (item.href === '/mis-examenes') {
          return !!usuario?.trabajadorId || hasRole(UsuarioRol.SUPER_ADMIN);
        }
        
        // Filtrar por roles
        if (!item.roles) return true;
        return hasAnyRole(item.roles);
      });
  }, [usuario?.empresaId, usuario?.trabajadorId, hasAnyRole, hasRole]);

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 rounded-md bg-white shadow-md text-slate-700 hover:bg-slate-50"
          aria-label="Toggle menu"
        >
          {isMobileOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full bg-white border-r border-slate-200 z-40
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto lg:h-screen
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          w-64 min-w-[16rem] flex flex-col flex-shrink-0
        `}
      >
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">SST</h2>
          <p className="text-sm text-slate-600 mt-1">
            {usuario?.email || 'Usuario'}
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            
            // Lógica mejorada de detección de ruta activa
            let isActive = false;
            
            // Prioridad: Primero verificar rutas específicas que pueden tener subrutas
            // IMPORTANTE: Verificar Gestión de Áreas ANTES que Empresas para evitar conflictos
            if (item.href && item.href.includes('/areas')) {
              // "Gestión de Áreas" solo activo si la ruta contiene /areas
              isActive = pathname.includes('/areas');
            } else if (item.href === '/empresas') {
              // "Empresas" solo activo si es exactamente /empresas o /empresas/[id] pero NO si contiene /areas
              // Esta verificación debe ser explícita para evitar que se active cuando estamos en /areas
              isActive = (pathname === '/empresas' || pathname.startsWith('/empresas/')) && !pathname.includes('/areas');
            } else if (item.href === '/ats') {
              // Caso especial: si estamos en /ats/nuevo o /ats/[id], resaltar ATS
              isActive = pathname === '/ats' || pathname.startsWith('/ats/');
            } else if (item.href === '/mis-examenes') {
              // "Mi Salud" activo si estamos en /mis-examenes o sus subrutas como /mis-examenes/citas
              isActive = pathname === '/mis-examenes' || pathname.startsWith('/mis-examenes/');
            } else {
              // Para otras rutas: exacta o que empiece con la ruta + /
              isActive = pathname === item.href || 
                        (item.href !== '/' && pathname.startsWith(item.href + '/'));
            }
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-md transition-colors duration-200
                  ${
                    isActive
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-700 hover:bg-primary/10 hover:text-primary'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-md text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
}
