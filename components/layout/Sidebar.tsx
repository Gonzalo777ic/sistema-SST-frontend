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
} from 'lucide-react';
import { useState } from 'react';
import { UsuarioRol } from '@/types';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: UsuarioRol[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Empresas', href: '/empresas', icon: Building2, roles: [UsuarioRol.SUPER_ADMIN, UsuarioRol.ADMIN_EMPRESA] },
  { label: 'Trabajadores', href: '/trabajadores', icon: Users },
  { label: 'Vinculación de Usuarios', href: '/usuarios/vinculacion', icon: UserPlus, roles: [UsuarioRol.SUPER_ADMIN] },
  { label: 'Incidentes', href: '/incidentes', icon: AlertTriangle },
  { label: 'Documentos', href: '/documentos', icon: FileText },
  { label: 'EPP', href: '/epp', icon: Shield },
  { label: 'Capacitaciones', href: '/capacitaciones', icon: Calendar },
];

export function Sidebar() {
  const pathname = usePathname();
  const { usuario, logout, hasAnyRole } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return hasAnyRole(item.roles);
  });

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
          lg:translate-x-0 lg:static lg:z-auto
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          w-64 flex flex-col
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
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-md transition-colors
                  ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-slate-700 hover:bg-slate-100'
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
            className="flex items-center gap-3 px-4 py-3 w-full rounded-md text-slate-700 hover:bg-slate-100 transition-colors"
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
