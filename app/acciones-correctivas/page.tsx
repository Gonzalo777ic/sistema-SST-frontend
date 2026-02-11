'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  accionesCorrectivasService,
  AccionCorrectiva,
  EstadoAccion,
  FuenteAccion,
  AccionesKPIs,
} from '@/services/acciones-correctivas.service';
import { areasService, Area } from '@/services/areas.service';
// import { contratistasService } from '@/services/contratistas.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronDown,
  ChevronUp,
  Package,
  Eye,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AccionesCorrectivasPage() {
  const { usuario } = useAuth();
  const [acciones, setAcciones] = useState<AccionCorrectiva[]>([]);
  const [kpis, setKpis] = useState<AccionesKPIs>({
    aprobados: 0,
    pendientes: 0,
    total: 0,
  });
  const [areas, setAreas] = useState<Area[]>([]);
  // const [contratistas, setContratistas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Estados de filtros
  const [filtroResponsable, setFiltroResponsable] = useState('');
  const [filtroTitulo, setFiltroTitulo] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<FuenteAccion | ''>('');
  const [filtroUnidad, setFiltroUnidad] = useState('');
  const [filtroArea, setFiltroArea] = useState('');
  const [filtroSede, setFiltroSede] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoAccion | ''>('');
  const [filtroContratista, setFiltroContratista] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const empresaId = usuario?.empresaId;

      const [accionesData, kpisData, areasData] = await Promise.all([
        accionesCorrectivasService.findAll(empresaId ?? undefined).catch(() => ({
          data: [],
          total: 0,
          page: 1,
          limit: 50,
        })),
        accionesCorrectivasService.getKPIs(empresaId ?? undefined).catch(() => ({
          aprobados: 0,
          pendientes: 0,
          total: 0,
        })),
        empresaId ? areasService.findAll(empresaId).catch(() => []) : Promise.resolve([]),
      ]);

      setAcciones(accionesData.data);
      setKpis(kpisData);
      setAreas(areasData);
    } catch (error: any) {
      toast.error('Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerDetalle = (accion: AccionCorrectiva) => {
    // Aquí puedes abrir un modal de detalle o navegar a otra página
    toast.info('Funcionalidad de detalle en desarrollo');
  };

  // Filtrar acciones
  const filteredAcciones = acciones.filter((accion) => {
    const matchesResponsable =
      !filtroResponsable ||
      accion.responsable_levantamiento_nombre
        ?.toLowerCase()
        .includes(filtroResponsable.toLowerCase());
    const matchesTitulo =
      !filtroTitulo ||
      accion.titulo.toLowerCase().includes(filtroTitulo.toLowerCase());
    const matchesTipo = !filtroTipo || accion.fuente === filtroTipo;
    const matchesUnidad =
      !filtroUnidad ||
      accion.unidad?.toLowerCase().includes(filtroUnidad.toLowerCase());
    const matchesArea = !filtroArea || accion.area_id === filtroArea;
    const matchesSede =
      !filtroSede || accion.sede?.toLowerCase().includes(filtroSede.toLowerCase());
    const matchesEstado = !filtroEstado || accion.estado === filtroEstado;
    const matchesContratista =
      !filtroContratista || accion.contratista_id === filtroContratista;

    const fechaProgramada = new Date(accion.fecha_programada);
    const matchesFechaDesde =
      !filtroFechaDesde || fechaProgramada >= new Date(filtroFechaDesde);
    const matchesFechaHasta =
      !filtroFechaHasta || fechaProgramada <= new Date(filtroFechaHasta);

    return (
      matchesResponsable &&
      matchesTitulo &&
      matchesTipo &&
      matchesUnidad &&
      matchesArea &&
      matchesSede &&
      matchesEstado &&
      matchesContratista &&
      matchesFechaDesde &&
      matchesFechaHasta
    );
  });

  const getEstadoBadge = (estado: EstadoAccion) => {
    switch (estado) {
      case EstadoAccion.Aprobado:
        return (
          <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">
            {estado}
          </span>
        );
      case EstadoAccion.Pendiente:
        return (
          <span className="px-2 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-800">
            {estado}
          </span>
        );
      case EstadoAccion.Atrasado:
        return (
          <span className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800">
            {estado}
          </span>
        );
      case EstadoAccion.Desaprobado:
        return (
          <span className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800">
            {estado}
          </span>
        );
      case EstadoAccion.PorAprobar:
        return (
          <span className="px-2 py-1 text-xs font-medium rounded bg-orange-100 text-orange-800">
            {estado}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Cabecera */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Seguimiento de Acciones Correctivas
          </h1>
        </div>

        {/* Sección de Métricas (KPI Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center">
            <p className="text-sm text-gray-600 mb-2">Cantidad APROBADO</p>
            <p className="text-4xl font-bold text-green-600">{kpis.aprobados}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center">
            <p className="text-sm text-gray-600 mb-2">Cantidad PENDIENTE</p>
            <p className="text-4xl font-bold text-yellow-600">{kpis.pendientes}</p>
          </div>
        </div>

        {/* Filtros de Búsqueda (Collapsible) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
          >
            <span className="font-medium text-gray-700">&gt; Filtros de búsqueda</span>
            {showFilters ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>

          {showFilters && (
            <div className="p-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Responsable
                  </label>
                  <Input
                    value={filtroResponsable}
                    onChange={(e) => setFiltroResponsable(e.target.value)}
                    placeholder="Buscar responsable..."
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo/Título
                  </label>
                  <Input
                    value={filtroTitulo}
                    onChange={(e) => setFiltroTitulo(e.target.value)}
                    placeholder="Buscar título..."
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <Select
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value as FuenteAccion | '')}
                  >
                    <option value="">Todos</option>
                    {Object.values(FuenteAccion).map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jerarquía: Unidad
                  </label>
                  <Input
                    value={filtroUnidad}
                    onChange={(e) => setFiltroUnidad(e.target.value)}
                    placeholder="Buscar unidad..."
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jerarquía: Área
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
                    Jerarquía: Sede
                  </label>
                  <Input
                    value={filtroSede}
                    onChange={(e) => setFiltroSede(e.target.value)}
                    placeholder="Buscar sede..."
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <Select
                    value={filtroEstado}
                    onChange={(e) =>
                      setFiltroEstado(e.target.value as EstadoAccion | '')
                    }
                  >
                    <option value="">Todos</option>
                    {Object.values(EstadoAccion).map((estado) => (
                      <option key={estado} value={estado}>
                        {estado}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contratista
                  </label>
                  <Select
                    value={filtroContratista}
                    onChange={(e) => setFiltroContratista(e.target.value)}
                  >
                    <option value="">Todos</option>
                    {/* Aquí puedes agregar contratistas si los cargas */}
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha Programada (Desde)
                  </label>
                  <Input
                    type="date"
                    value={filtroFechaDesde}
                    onChange={(e) => setFiltroFechaDesde(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha Programada (Hasta)
                  </label>
                  <Input
                    type="date"
                    value={filtroFechaHasta}
                    onChange={(e) => setFiltroFechaHasta(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Acciones y Tabla */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex justify-end p-4 border-b border-gray-200">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <FileText className="w-4 h-4 mr-2" />
              Reporte
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Título
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Sede
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Elaborado por
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Responsable de levantamiento
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Fecha Programada
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Fecha Ejecución
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Fecha Aprobación
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
                ) : filteredAcciones.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center">
                      <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Sin Información</p>
                    </td>
                  </tr>
                ) : (
                  filteredAcciones.map((accion) => (
                    <tr key={accion.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {accion.fuente}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {accion.titulo}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {accion.sede || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {accion.elaborado_por_nombre || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {accion.responsable_levantamiento_nombre || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(accion.fecha_programada).toLocaleDateString('es-PE')}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {accion.fecha_ejecucion
                          ? new Date(accion.fecha_ejecucion).toLocaleDateString('es-PE')
                          : '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {accion.fecha_aprobacion
                          ? new Date(accion.fecha_aprobacion).toLocaleDateString('es-PE')
                          : '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {getEstadoBadge(accion.estado)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleVerDetalle(accion)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
