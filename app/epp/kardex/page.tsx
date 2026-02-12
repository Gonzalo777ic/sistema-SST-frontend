'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  eppService,
  EstadoVigenciaKardex,
  IKardexListItem,
} from '@/services/epp.service';
import { empresasService, Empresa } from '@/services/empresas.service';
import { areasService, Area } from '@/services/areas.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FileDown,
  BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { UsuarioRol } from '@/types';

const getEstadoColor = (estado: EstadoVigenciaKardex) => {
  switch (estado) {
    case EstadoVigenciaKardex.Vigente:
      return 'text-green-700 bg-green-50 border-green-200';
    case EstadoVigenciaKardex.Vencido:
      return 'text-orange-700 bg-orange-50 border-orange-200';
    case EstadoVigenciaKardex.VencimientoMenor:
      return 'text-amber-700 bg-amber-50 border-amber-200';
    case EstadoVigenciaKardex.SinRegistro:
      return 'text-gray-700 bg-gray-50 border-gray-200';
    default:
      return 'text-gray-700 bg-gray-50 border-gray-200';
  }
};

export default function KardexPage() {
  const router = useRouter();
  const { usuario, hasAnyRole } = useAuth();
  const [items, setItems] = useState<IKardexListItem[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(true);

  const [filtroNombre, setFiltroNombre] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoVigenciaKardex | ''>('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroUnidad, setFiltroUnidad] = useState('');
  const [filtroSede, setFiltroSede] = useState('');
  const [filtroArea, setFiltroArea] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');

  const esAdmin = hasAnyRole([UsuarioRol.SUPER_ADMIN, UsuarioRol.ADMIN_EMPRESA]);

  useEffect(() => {
    loadData();
  }, [usuario?.empresaId, esAdmin]);

  useEffect(() => {
    if (usuario?.empresaId) {
      loadAreas(usuario.empresaId);
    }
  }, [usuario?.empresaId]);

  const loadData = async () => {
    if (!usuario) return;

    try {
      setIsLoading(true);
      const empresaIds = esAdmin
        ? (await empresasService.findAll()).map((e) => e.id)
        : usuario.empresaId
          ? [usuario.empresaId]
          : undefined;

      const params: Parameters<typeof eppService.getKardexList>[0] = {
        empresa_ids: empresaIds,
      };
      if (filtroNombre) params.nombre = filtroNombre;
      if (filtroEstado) params.estado = filtroEstado;
      if (filtroCategoria) params.categoria = filtroCategoria;
      if (filtroUnidad) params.unidad = filtroUnidad;
      if (filtroSede) params.sede = filtroSede;
      if (filtroArea) params.area_id = filtroArea;
      if (filtroFechaDesde) params.fecha_desde = filtroFechaDesde;
      if (filtroFechaHasta) params.fecha_hasta = filtroFechaHasta;

      const data = await eppService.getKardexList(params);
      setItems(data);
    } catch (error: any) {
      toast.error('Error al cargar kardex', {
        description: error.response?.data?.message || 'No se pudo cargar el kardex',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadAreas = async (empresaId: string) => {
    try {
      const areasData = await areasService.findAll(empresaId).catch(() => []);
      setAreas(areasData.filter((a) => a.activo));
    } catch {
      setAreas([]);
    }
  };

  useEffect(() => {
    empresasService.findAll().then(setEmpresas).catch(() => setEmpresas([]));
  }, []);

  const handleBuscar = () => {
    loadData();
  };

  const unidadesUnicas = [...new Set(items.map((i) => i.unidad).filter((u): u is string => !!u))].sort();
  const sedesUnicas = [...new Set(items.map((i) => i.sede).filter((s): s is string => !!s))].sort();
  const categoriasUnicas = [...new Set(items.map((i) => i.categoria_filtro).filter((c): c is string => !!c))].sort();

  const handleVerKardex = async (trabajadorId: string) => {
    try {
      const kardex = await eppService.getKardexPorTrabajador(trabajadorId);
      const blob = new Blob(
        [JSON.stringify(kardex, null, 2)],
        { type: 'application/json' }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kardex-${kardex.trabajador_nombre.replace(/\s+/g, '-')}-${kardex.trabajador_documento}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Kardex descargado');
    } catch (error: any) {
      toast.error('Error al descargar kardex', {
        description: error.response?.data?.message || 'No se pudo descargar',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/epp">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Regresar
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-primary" />
            <h1 className="text-2xl font-bold text-gray-900">
              Kardex por trabajador
            </h1>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        >
          <span className="font-medium text-gray-700">
            Filtros de búsqueda
          </span>
          {showFilters ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {showFilters && (
          <div className="px-4 pb-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de trabajador
                </label>
                <Input
                  value={filtroNombre}
                  onChange={(e) => setFiltroNombre(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <Select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value as EstadoVigenciaKardex | '')}
                >
                  <option value="">Todos</option>
                  <option value={EstadoVigenciaKardex.Vigente}>Vigente</option>
                  <option value={EstadoVigenciaKardex.Vencido}>Vencido</option>
                  <option value={EstadoVigenciaKardex.VencimientoMenor}>Vencimiento menor</option>
                  <option value={EstadoVigenciaKardex.SinRegistro}>Sin registro</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría
                </label>
                <Select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                >
                  <option value="">Todos</option>
                  {categoriasUnicas.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha
                </label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="date"
                    value={filtroFechaDesde}
                    onChange={(e) => setFiltroFechaDesde(e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-gray-400">-</span>
                  <Input
                    type="date"
                    value={filtroFechaHasta}
                    onChange={(e) => setFiltroFechaHasta(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unidad
                </label>
                <Select
                  value={filtroUnidad}
                  onChange={(e) => setFiltroUnidad(e.target.value)}
                >
                  <option value="">Todos</option>
                  {unidadesUnicas.map((u) => (
                    <option key={u} value={u}>{u}</option>
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
                  <option value="">Todos</option>
                  {sedesUnicas.map((s) => (
                    <option key={s} value={s}>{s}</option>
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
                  <option value="">Todos</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={handleBuscar} className="bg-blue-600 hover:bg-blue-700 text-white">
                Buscar
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Fecha Entrega
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Nombre de trabajador
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
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((j) => (
                        <td key={j} className="px-4 py-4">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Sin registros</p>
                    <p className="text-sm text-gray-500 mt-1">
                      No hay entregas de EPP registradas con los filtros aplicados
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.trabajador_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.fecha_entrega
                        ? new Date(item.fecha_entrega).toLocaleDateString('es-PE')
                        : '-'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {item.trabajador_nombre}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.razon_social || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.unidad || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.area || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.sede || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium border ${getEstadoColor(item.estado)}`}
                      >
                        {item.estado}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        onClick={() => handleVerKardex(item.trabajador_id)}
                      >
                        <FileDown className="w-4 h-4 mr-2" />
                        Ver Kardex
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && items.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-200 text-sm text-gray-600">
            {items.length} registro(s)
          </div>
        )}
      </div>
    </div>
  );
}
