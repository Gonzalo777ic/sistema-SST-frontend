'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  eppService,
  SolicitudEPP,
  EstadoSolicitudEPP,
  IEPP,
} from '@/services/epp.service';
import { trabajadoresService, Trabajador } from '@/services/trabajadores.service';
import { empresasService, Empresa } from '@/services/empresas.service';
import { areasService, Area } from '@/services/areas.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Eye,
  FileText,
  Upload,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { UsuarioRol } from '@/types';

const getEstadoColor = (estado: EstadoSolicitudEPP) => {
  switch (estado) {
    case EstadoSolicitudEPP.Aprobada:
      return 'text-green-700 bg-green-50 border-green-200';
    case EstadoSolicitudEPP.Entregada:
      return 'text-blue-700 bg-blue-50 border-blue-200';
    case EstadoSolicitudEPP.Observada:
      return 'text-amber-700 bg-amber-50 border-amber-200';
    case EstadoSolicitudEPP.Rechazada:
      return 'text-red-700 bg-red-50 border-red-200';
    case EstadoSolicitudEPP.Pendiente:
      return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    default:
      return 'text-gray-700 bg-gray-50 border-gray-200';
  }
};

export default function EPPPage() {
  const { usuario, hasAnyRole } = useAuth();
  const [solicitudes, setSolicitudes] = useState<SolicitudEPP[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  // Estados de filtros
  const [filtroUsuarioEPP, setFiltroUsuarioEPP] = useState('');
  const [filtroSolicitante, setFiltroSolicitante] = useState('');
  const [filtroRazonSocial, setFiltroRazonSocial] = useState('');
  const [filtroUnidad, setFiltroUnidad] = useState('');
  const [filtroArea, setFiltroArea] = useState('');
  const [filtroSede, setFiltroSede] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoSolicitudEPP | ''>('');
  const [filtroCodigo, setFiltroCodigo] = useState('');

  const canCreate = hasAnyRole([
    UsuarioRol.SUPER_ADMIN,
    UsuarioRol.ADMIN_EMPRESA,
    UsuarioRol.INGENIERO_SST,
    UsuarioRol.SUPERVISOR,
    UsuarioRol.EMPLEADO,
  ]);

  const esAdmin = hasAnyRole([UsuarioRol.SUPER_ADMIN, UsuarioRol.ADMIN_EMPRESA]);

  useEffect(() => {
    loadData();
  }, [usuario?.empresaId, esAdmin]);

  useEffect(() => {
    if (usuario?.empresaId) {
      loadAreas(usuario.empresaId);
      loadTrabajadores(usuario.empresaId);
    }
  }, [usuario?.empresaId]);

  const loadData = async () => {
    if (!usuario) return;

    try {
      setIsLoading(true);
      const empresaIdFilter = esAdmin ? undefined : (usuario.empresaId ?? undefined);
      const [solicitudesData, empresasData] = await Promise.all([
        eppService.findAll(empresaIdFilter).catch(() => []),
        empresasService.findAll().catch(() => []),
      ]);

      setSolicitudes(solicitudesData);
      setEmpresas(empresasData);
    } catch (error: any) {
      toast.error('Error al cargar solicitudes');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAreas = async (empresaId: string) => {
    try {
      const areasData = await areasService.findAll(empresaId).catch(() => []);
      setAreas(areasData.filter((a) => a.activo));
    } catch (error) {
      console.error('Error loading areas:', error);
    }
  };

  const loadTrabajadores = async (empresaId: string) => {
    try {
      const trabajadoresData = await trabajadoresService.findAll(empresaId).catch(() => []);
      setTrabajadores(trabajadoresData);
    } catch (error) {
      console.error('Error loading trabajadores:', error);
    }
  };

  const handleUpdateEstado = async (
    id: string,
    nuevoEstado: EstadoSolicitudEPP,
  ) => {
    try {
      await eppService.updateEstado(id, { estado: nuevoEstado });
      toast.success(`Estado actualizado a ${nuevoEstado}`);
      loadData();
    } catch (error: any) {
      toast.error('Error al actualizar estado', {
        description: error.response?.data?.message || 'No se pudo actualizar el estado',
      });
    }
  };

  // Filtrado de solicitudes
  const filteredSolicitudes = useMemo(() => {
    return solicitudes.filter((sol) => {
      if (filtroUsuarioEPP && !sol.usuario_epp_nombre?.toLowerCase().includes(filtroUsuarioEPP.toLowerCase())) {
        return false;
      }
      if (filtroSolicitante && !sol.solicitante_nombre?.toLowerCase().includes(filtroSolicitante.toLowerCase())) {
        return false;
      }
      if (filtroRazonSocial && sol.empresa_nombre !== filtroRazonSocial) {
        return false;
      }
      if (filtroArea && sol.area_id !== filtroArea) {
        return false;
      }
      if (filtroSede && sol.sede !== filtroSede) {
        return false;
      }
      if (filtroEstado && sol.estado !== filtroEstado) {
        return false;
      }
      if (filtroCodigo && !sol.codigo_correlativo?.toLowerCase().includes(filtroCodigo.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [
    solicitudes,
    filtroUsuarioEPP,
    filtroSolicitante,
    filtroRazonSocial,
    filtroArea,
    filtroSede,
    filtroEstado,
    filtroCodigo,
  ]);

  // Obtener sedes únicas
  const sedesUnicas = useMemo(() => {
    const sedes = new Set<string>();
    solicitudes.forEach((sol) => {
      if (sol.sede) sedes.add(sol.sede);
    });
    return Array.from(sedes).sort();
  }, [solicitudes]);

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Requerimiento de entrega de EPP
        </h1>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        >
          <span className="font-medium text-gray-700">
            {showFilters ? 'Ocultar' : 'Mostrar'} Filtros de búsqueda
          </span>
          {showFilters ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {showFilters && (
          <div className="px-4 pb-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Usuario EPP
                </label>
                <Input
                  value={filtroUsuarioEPP}
                  onChange={(e) => setFiltroUsuarioEPP(e.target.value)}
                  placeholder="Buscar usuario..."
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Solicitante EPP
                </label>
                <Input
                  value={filtroSolicitante}
                  onChange={(e) => setFiltroSolicitante(e.target.value)}
                  placeholder="Buscar solicitante..."
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Razón social
                </label>
                <Select
                  value={filtroRazonSocial}
                  onChange={(e) => setFiltroRazonSocial(e.target.value)}
                >
                  <option value="">Todas</option>
                  {empresas.map((empresa) => (
                    <option key={empresa.id} value={empresa.nombre}>
                      {empresa.nombre}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Área
                </label>
                <Select
                  value={filtroArea}
                  onChange={(e) => setFiltroArea(e.target.value)}
                >
                  <option value="">Todas</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.nombre}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sede
                </label>
                <Select
                  value={filtroSede}
                  onChange={(e) => setFiltroSede(e.target.value)}
                >
                  <option value="">Todas</option>
                  {sedesUnicas.map((sede) => (
                    <option key={sede} value={sede}>
                      {sede}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <Select
                  value={filtroEstado}
                  onChange={(e) =>
                    setFiltroEstado(e.target.value as EstadoSolicitudEPP | '')
                  }
                >
                  <option value="">Todos</option>
                  <option value={EstadoSolicitudEPP.Pendiente}>PENDIENTE</option>
                  <option value={EstadoSolicitudEPP.Observada}>OBSERVADA</option>
                  <option value={EstadoSolicitudEPP.Aprobada}>APROBADA</option>
                  <option value={EstadoSolicitudEPP.Entregada}>ENTREGADA</option>
                  <option value={EstadoSolicitudEPP.Rechazada}>RECHAZADA</option>
                </Select>
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código correlativo
                </label>
                <Input
                  value={filtroCodigo}
                  onChange={(e) => setFiltroCodigo(e.target.value)}
                  placeholder="Buscar por código..."
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Barra de Herramientas */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <FileText className="w-4 h-4 mr-2" />
            Reporte
          </Button>
          <Link href="/epp/fichas" className="inline-block">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <ClipboardList className="w-4 h-4 mr-2" />
              Fichas EPP
            </Button>
          </Link>
          <Link href="/epp/kardex">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Eye className="w-4 h-4 mr-2" />
              Kardex Por Trabajador
            </Button>
          </Link>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Upload className="w-4 h-4 mr-2" />
            Importar Solicitudes
          </Button>
        </div>

        {canCreate && (
          <Link href="/epp/nueva">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Solicitud
            </Button>
          </Link>
        )}
      </div>

      {/* Tabla de Datos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Código correlativo
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Fecha Solicitud
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Usuario de EPP
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Solicitante
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Razón Social
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Unidad
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Área
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Sede
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((j) => (
                        <td key={j} className="px-4 py-4">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ) : filteredSolicitudes.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center">
                    <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Sin Información</p>
                  </td>
                </tr>
              ) : (
                filteredSolicitudes.map((solicitud) => (
                  <tr key={solicitud.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {solicitud.codigo_correlativo || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(solicitud.fecha_solicitud).toLocaleDateString('es-PE')}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {solicitud.usuario_epp_nombre || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {solicitud.solicitante_nombre || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {solicitud.empresa_nombre || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {solicitud.unidad || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {solicitud.area_nombre || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {solicitud.sede || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Select
                        value={solicitud.estado}
                        onChange={(e) =>
                          handleUpdateEstado(
                            solicitud.id,
                            e.target.value as EstadoSolicitudEPP,
                          )
                        }
                        className={`border-2 rounded-md font-medium text-sm ${getEstadoColor(solicitud.estado)} bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1`}
                        style={{
                          borderColor: getEstadoColor(solicitud.estado).split(' ')[2]?.replace('border-', ''),
                        }}
                      >
                        <option value={EstadoSolicitudEPP.Pendiente}>PENDIENTE</option>
                        <option value={EstadoSolicitudEPP.Observada}>OBSERVADA</option>
                        <option value={EstadoSolicitudEPP.Aprobada}>APROBADA</option>
                        <option value={EstadoSolicitudEPP.Entregada}>ENTREGADA</option>
                        <option value={EstadoSolicitudEPP.Rechazada}>RECHAZADA</option>
                      </Select>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <Link href={`/epp/${solicitud.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
