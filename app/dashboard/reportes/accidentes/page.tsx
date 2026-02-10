'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { reportesService } from '@/services/reportes.service';
import { incidentesService } from '@/services/incidentes.service';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Package, TrendingUp, AlertTriangle, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  gray: '#6b7280',
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function ReportesAccidentesPage() {
  const { usuario } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [fechaDesde, setFechaDesde] = useState('2025-02-10');
  const [fechaHasta, setFechaHasta] = useState('2027-02-10');
  const [sedeSeleccionada, setSedeSeleccionada] = useState<string>('');
  const [sedesDisponibles, setSedesDisponibles] = useState<string[]>([]);

  // Datos de reportes
  const [diasUltimoIncidente, setDiasUltimoIncidente] = useState<any[]>([]);
  const [tendenciaTemporal, setTendenciaTemporal] = useState<any[]>([]);
  const [analisisCausas, setAnalisisCausas] = useState<any[]>([]);
  const [distribucionDemografica, setDistribucionDemografica] = useState<any>(null);
  const [partesCuerpo, setPartesCuerpo] = useState<any[]>([]);
  const [medidasCorrectivas, setMedidasCorrectivas] = useState<any>(null);
  const [impactoOperativo, setImpactoOperativo] = useState<any>(null);
  const [rankingSiniestralidad, setRankingSiniestralidad] = useState<any[]>([]);
  const [estadisticaHistorica, setEstadisticaHistorica] = useState<any[]>([]);

  useEffect(() => {
    if (usuario?.empresaId) {
      loadSedes();
      loadReportes();
    }
  }, [usuario?.empresaId, fechaDesde, fechaHasta, sedeSeleccionada]);

  const loadSedes = async () => {
    if (!usuario?.empresaId) return;
    try {
      const incidentes = await incidentesService.findAll(usuario.empresaId);
      const sedes = Array.from(
        new Set(incidentes.map((inc: any) => inc.area_trabajo || inc.sede).filter(Boolean)),
      ) as string[];
      setSedesDisponibles(sedes);
    } catch (error) {
      console.error('Error loading sedes:', error);
    }
  };

  const loadReportes = async () => {
    if (!usuario?.empresaId) return;

    try {
      setIsLoading(true);
      const [
        diasUltimo,
        tendencia,
        causas,
        demografica,
        partes,
        medidas,
        impacto,
        ranking,
        historica,
      ] = await Promise.all([
        reportesService
          .getDiasUltimoIncidente(usuario.empresaId, fechaDesde, fechaHasta)
          .catch(() => []),
        reportesService
          .getTendenciaTemporal(
            usuario.empresaId,
            sedeSeleccionada || undefined,
            fechaDesde,
            fechaHasta,
          )
          .catch(() => []),
        reportesService
          .getAnalisisCausas(
            usuario.empresaId,
            sedeSeleccionada || undefined,
            fechaDesde,
            fechaHasta,
          )
          .catch(() => []),
        reportesService
          .getDistribucionDemografica(
            usuario.empresaId,
            sedeSeleccionada || undefined,
            fechaDesde,
            fechaHasta,
          )
          .catch(() => null),
        reportesService
          .getPartesCuerpo(
            usuario.empresaId,
            sedeSeleccionada || undefined,
            fechaDesde,
            fechaHasta,
          )
          .catch(() => []),
        reportesService
          .getMedidasCorrectivasIncidentes(
            usuario.empresaId,
            sedeSeleccionada || undefined,
            fechaDesde,
            fechaHasta,
          )
          .catch(() => null),
        reportesService
          .getImpactoOperativo(
            usuario.empresaId,
            sedeSeleccionada || undefined,
            fechaDesde,
            fechaHasta,
          )
          .catch(() => null),
        reportesService
          .getRankingSiniestralidad(
            usuario.empresaId,
            sedeSeleccionada || undefined,
            fechaDesde,
            fechaHasta,
          )
          .catch(() => []),
        reportesService
          .getEstadisticaHistorica(usuario.empresaId, sedeSeleccionada || undefined)
          .catch(() => []),
      ]);

      setDiasUltimoIncidente(diasUltimo);
      setTendenciaTemporal(tendencia);
      setAnalisisCausas(causas);
      setDistribucionDemografica(demografica);
      setPartesCuerpo(partes);
      setMedidasCorrectivas(medidas);
      setImpactoOperativo(impacto);
      setRankingSiniestralidad(ranking);
      setEstadisticaHistorica(historica);
    } catch (error: any) {
      toast.error('Error al cargar reportes');
    } finally {
      setIsLoading(false);
    }
  };

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
      <Package className="w-12 h-12 mb-2" />
      <p>No hay datos disponibles</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Barra Superior de Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Desde
            </label>
            <Input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hasta
            </label>
            <Input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sede
            </label>
            <Select
              value={sedeSeleccionada}
              onChange={(e) => setSedeSeleccionada(e.target.value)}
              className="w-full"
            >
              <option value="">Todas las sedes</option>
              {sedesDisponibles.map((sede) => (
                <option key={sede} value={sede}>
                  {sede}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* KPIs: Días desde último incidente */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Días desde el último Incidente
        </h2>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : diasUltimoIncidente.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {diasUltimoIncidente.map((item) => (
              <div
                key={item.sede}
                className="bg-gray-50 rounded-lg p-4 border border-gray-200"
              >
                <p className="text-sm text-gray-600 mb-1">{item.sede}</p>
                <p className="text-3xl font-bold text-blue-600">
                  {item.dias_desde_ultimo}
                </p>
                <p className="text-xs text-gray-500">días</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Tendencia Temporal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Accidentes/Incidentes por mes y tipo
          </h3>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : tendenciaTemporal.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={tendenciaTemporal.map((item) => ({
                  mes: item.mes,
                  ...item.por_tipo,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Legend />
                {Object.keys(tendenciaTemporal[0]?.por_tipo || {}).map((tipo, index) => (
                  <Bar
                    key={tipo}
                    dataKey={tipo}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                    name={tipo}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Estado de incidentes por mes
          </h3>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : tendenciaTemporal.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={tendenciaTemporal.map((item) => ({
                  mes: item.mes,
                  ...item.por_estado,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Legend />
                {Object.keys(tendenciaTemporal[0]?.por_estado || {}).map((estado, index) => (
                  <Line
                    key={estado}
                    type="monotone"
                    dataKey={estado}
                    stroke={CHART_COLORS[index % CHART_COLORS.length]}
                    name={estado}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>

      {/* Análisis de Causas */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Análisis de Causas
        </h2>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : analisisCausas.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={analisisCausas.slice(0, 10)}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ causa, cantidad }) => `${causa}: ${cantidad}`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="cantidad"
              >
                {analisisCausas.slice(0, 10).map((entry: any, index: number) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Distribución Demográfica */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {['por_unidad', 'por_area', 'por_sede'].map((tipo) => (
          <div
            key={tipo}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Distribución por {tipo.replace('por_', '').replace('_', ' ')}
            </h3>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : distribucionDemografica?.[tipo]?.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={distribucionDemografica[tipo]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="cantidad" fill={COLORS.primary} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState />
            )}
          </div>
        ))}
      </div>

      {/* Partes del Cuerpo Lesionado */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Partes del Cuerpo Lesionado
        </h2>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : partesCuerpo.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={partesCuerpo}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ parte, cantidad }) => `${parte}: ${cantidad}`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="cantidad"
              >
                {partesCuerpo.map((entry: any, index: number) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Medidas Correctivas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Medidas Correctivas por Estado
          </h3>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : medidasCorrectivas?.por_estado?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={medidasCorrectivas.por_estado}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="estado" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="cantidad" fill={COLORS.success} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Tendencia Mensual de Medidas Aprobadas
          </h3>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : medidasCorrectivas?.tendencia_mensual?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={medidasCorrectivas.tendencia_mensual}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="cantidad"
                  stroke={COLORS.success}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>

      {/* Impacto Operativo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Días de Descanso por Unidad
          </h3>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : impactoOperativo?.por_unidad?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={impactoOperativo.por_unidad}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total_dias" fill={COLORS.danger} name="Total días" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Días de Descanso por Área
          </h3>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : impactoOperativo?.por_area?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={impactoOperativo.por_area}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total_dias" fill={COLORS.warning} name="Total días" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>

      {/* Ranking de Siniestralidad */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Ranking de Siniestralidad
        </h2>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : rankingSiniestralidad.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                    Nombre
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                    Documento
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                    Unidad
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                    Área
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                    Sede
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                    Días Descanso
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                    Cant. Eventos
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rankingSiniestralidad.map((item, index) => (
                  <tr key={item.trabajador_id}>
                    <td className="px-4 py-2 text-sm text-gray-900">{item.nombre}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {item.documento}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">{item.unidad}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{item.area}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{item.sede}</td>
                    <td className="px-4 py-2 text-sm font-medium text-red-600">
                      {item.total_dias_descanso}
                    </td>
                    <td className="px-4 py-2 text-sm font-medium text-orange-600">
                      {item.cantidad_eventos}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Estadística Histórica RACS */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Estadística Histórica (RACS)
        </h2>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : estadisticaHistorica.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                    Año
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                    Ocupacional
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                    Propiedad
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                    Ambiente
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                    Otros
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {estadisticaHistorica.map((item) => (
                  <tr key={item.anio}>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">
                      {item.anio}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {item.ocupacional}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {item.propiedad}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {item.ambiente}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">{item.otros}</td>
                    <td className="px-4 py-2 text-sm font-medium text-blue-600">
                      {item.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}
