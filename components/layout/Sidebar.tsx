'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { memo, useState, useMemo, useEffect } from 'react';
import {
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Settings,
} from 'lucide-react';
import { sidebarConfig, SidebarItem, SidebarGroup } from '@/config/sidebar.config';
import { UsuarioRol } from '@/types';

function SidebarComponent() {
  const pathname = usePathname();
  const { usuario, empresasVinculadas, logout, hasAnyRole, hasRole } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Determinar si un item está activo (incluyendo hijos)
  const isItemActive = (item: SidebarItem): boolean => {
    if (!item.href) return false;
    
    // Rutas especiales que necesitan lógica específica
    if (item.href === '/mis-examenes') {
      return pathname === '/mis-examenes' || pathname.startsWith('/mis-examenes/');
    }
    if (item.href === '/riesgos/petar') {
      return pathname === '/riesgos/petar' || pathname.startsWith('/riesgos/petar/');
    }
    if (item.href === '/riesgos/pets') {
      return pathname === '/riesgos/pets' || pathname.startsWith('/riesgos/pets/');
    }
    if (item.href === '/riesgos/iperc') {
      return pathname === '/riesgos/iperc' || pathname.startsWith('/riesgos/iperc/');
    }
    if (item.href === '/ats') {
      return pathname === '/ats' || pathname.startsWith('/ats/');
    }
    if (item.href === '/trabajadores') {
      return pathname === '/trabajadores' || pathname.startsWith('/trabajadores/');
    }
    if (item.href === '/capacitaciones') {
      return pathname === '/capacitaciones' || pathname.startsWith('/capacitaciones/');
    }
    if (item.href === '/epp') {
      return pathname === '/epp' || pathname.startsWith('/epp/');
    }
    if (item.href === '/incidentes') {
      return pathname === '/incidentes' || pathname.startsWith('/incidentes/');
    }
    if (item.href === '/inspecciones') {
      return pathname === '/inspecciones' || pathname.startsWith('/inspecciones/');
    }
    if (item.href === '/documentos') {
      return pathname === '/documentos' || pathname.startsWith('/documentos/');
    }
    if (item.href === '/empresas') {
      return (pathname === '/empresas' || pathname.startsWith('/empresas/')) && !pathname.includes('/areas');
    }
    if (item.href && item.href.includes('/areas')) {
      return pathname.includes('/areas');
    }
    
    // Rutas del dashboard - matching exacto o prefijo
    if (item.href.startsWith('/dashboard/')) {
      return pathname === item.href || pathname.startsWith(item.href + '/');
    }
    
    // Lógica general
    return pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'));
  };

  // Determinar si un grupo padre tiene algún hijo activo
  const hasActiveChild = (items: SidebarItem[]): boolean => {
    return items.some(item => isItemActive(item));
  };

  // Verificar si un item debe mostrarse según roles y condiciones
  const shouldShowItem = (item: SidebarItem): boolean => {
    // Verificar roles
    if (item.roles && !hasAnyRole(item.roles)) {
      return false;
    }

    // Verificar si requiere trabajadorId
    if (item.requiresTrabajadorId) {
      // Si es EMPLEADO, requiere trabajadorId
      if (hasRole(UsuarioRol.EMPLEADO) && !usuario?.trabajadorId) {
        return false;
      }
      // Para otros roles operativos, también verificar
      const rolesOperativos = [
        UsuarioRol.EMPLEADO,
        UsuarioRol.SUPERVISOR,
        UsuarioRol.MEDICO,
        UsuarioRol.INGENIERO_SST,
        UsuarioRol.AUDITOR,
      ];
      if (rolesOperativos.some(rol => hasRole(rol)) && !usuario?.trabajadorId) {
        return false;
      }
    }

    // Verificar href dinámico
    if (item.dynamicHref) {
      const dynamicHref = item.dynamicHref(usuario?.empresaId || null);
      if (!dynamicHref) return false;
    }

    return true;
  };

  // Filtrar y procesar la configuración del sidebar
  const processedGroups = useMemo(() => {
    return sidebarConfig.map((group) => {
      const filteredItems = group.items
        .map((item) => {
          // Si es un item con subitems
          if ('items' in item && Array.isArray(item.items)) {
            const filteredSubItems = item.items.filter(shouldShowItem);
            if (filteredSubItems.length === 0) return null;
            
            return {
              ...item,
              items: filteredSubItems,
            };
          }
          
          // Si es un item simple
          if ('href' in item) {
            if (!shouldShowItem(item)) return null;
            return item;
          }
          
          return null;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      return {
        ...group,
        items: filteredItems,
      };
    }).filter(group => group.items.length > 0);
  }, [usuario?.empresaId, usuario?.trabajadorId, hasAnyRole, hasRole]);

  // Expandir grupos que tienen items activos al cargar
  useEffect(() => {
    const newExpanded = new Set<string>();
    
    processedGroups.forEach((group, groupIndex) => {
      group.items.forEach((item, itemIndex) => {
        const key = `${groupIndex}-${itemIndex}`;
        
        if ('items' in item && Array.isArray(item.items)) {
          // Si algún hijo está activo, expandir el padre
          if (hasActiveChild(item.items)) {
            newExpanded.add(key);
          }
        }
      });
    });
    
    setExpandedGroups(newExpanded);
  }, [pathname, processedGroups]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const renderItem = (item: SidebarItem, level: number = 0) => {
    const Icon = item.icon;
    const isActive = isItemActive(item);
    const paddingLeft = level > 0 ? 'pl-8' : 'pl-4';

    // Resolver href dinámico si existe
    let href = item.href;
    if (item.dynamicHref) {
      const dynamicHref = item.dynamicHref(usuario?.empresaId || null);
      if (dynamicHref) {
        href = dynamicHref;
      }
    }

    return (
      <Link
        key={item.href || item.label}
        href={href || '#'}
        prefetch={true}
        onClick={() => setIsMobileOpen(false)}
        className={`
          flex items-center gap-3 ${paddingLeft} py-2.5 rounded-md transition-colors duration-200 text-sm
          ${
            isActive
              ? 'bg-primary text-white shadow-sm font-medium'
              : 'text-slate-700 hover:bg-primary/10 hover:text-primary'
          }
        `}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1">{item.label}</span>
      </Link>
    );
  };

  const renderGroupItem = (
    item: SidebarItem | { label: string; icon: React.ElementType; items: SidebarItem[] },
    groupIndex: number,
    itemIndex: number
  ) => {
    const key = `${groupIndex}-${itemIndex}`;
    const isExpanded = expandedGroups.has(key);
    
    // Si tiene subitems
    if ('items' in item && Array.isArray(item.items) && !('href' in item)) {
      const Icon = item.icon;
      const hasActive = hasActiveChild(item.items);
      const isParentActive = hasActive;

      return (
        <div key={key} className="space-y-1">
          <button
            onClick={() => toggleGroup(key)}
            className={`
              w-full flex items-center gap-3 px-4 py-2.5 rounded-md transition-colors duration-200 text-sm
              ${
                isParentActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-slate-700 hover:bg-slate-50'
              }
            `}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left">{item.label}</span>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 flex-shrink-0" />
            )}
          </button>
          {isExpanded && (
            <div className="space-y-0.5 ml-2 border-l-2 border-slate-200 pl-2">
              {item.items.map((subItem, subIndex) => (
                <div key={subIndex}>
                  {renderItem(subItem, 1)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Si es un item simple
    if ('href' in item) {
      return <div key={key}>{renderItem(item, 0)}</div>;
    }

    return null;
  };

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
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">SST</h2>
          <p className="text-sm text-slate-600 mt-1">
            {usuario?.dni || 'Usuario'}
          </p>
          {/* Logos de empresas vinculadas */}
          {empresasVinculadas && empresasVinculadas.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {empresasVinculadas.map((empresa) => (
                <div
                  key={empresa.id}
                  className="flex items-center justify-center w-8 h-8 rounded border border-slate-200 bg-white overflow-hidden"
                  title={empresa.nombre}
                >
                  {empresa.logoUrl ? (
                    <img
                      src={empresa.logoUrl}
                      alt={empresa.nombre}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `<span class="text-xs text-slate-500 font-medium">${empresa.nombre.charAt(0).toUpperCase()}</span>`;
                        }
                      }}
                    />
                  ) : (
                    <span className="text-xs text-slate-500 font-medium">
                      {empresa.nombre.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {processedGroups.map((group, groupIndex) => (
            <div key={group.title} className="space-y-2">
              {/* Group Header */}
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4">
                {group.title}
              </h3>
              
              {/* Group Items */}
              <div className="space-y-1">
                {group.items.map((item, itemIndex) =>
                  renderGroupItem(item, groupIndex, itemIndex)
                )}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 space-y-2">
          <Link
            href="/configuracion"
            prefetch={true}
            onClick={() => setIsMobileOpen(false)}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-md transition-colors duration-200
              ${
                pathname === '/configuracion' || pathname.startsWith('/configuracion/')
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-700 hover:bg-primary/10 hover:text-primary'
              }
            `}
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">Configuración</span>
          </Link>
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

// Memoizar el componente para evitar re-renderizados innecesarios
export const Sidebar = memo(SidebarComponent);
