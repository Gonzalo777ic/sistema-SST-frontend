'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { reportesService } from '@/services/reportes.service';
import { Input } from '@/components/ui/input';
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
import { Package } from 'lucide-react';
import { toast } from 'sonner';

// Colores para gráficos
const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  gray: '#6b7280',
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ReportesCumplimientoPage() {
  const { usuario } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [fechaDesde, setFechaDesde] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
  );
  const [fechaHasta, setFechaHasta] = useState(
    new Date().toISOString().split('T')[0],
  );

  // Datos de reportes
  const [cumplimientoCapacitaciones, setCumplimientoCapacitaciones] = useState<any>(null);
  const [accidentesVsIncidentes, setAccidentesVsIncidentes] = useState<any[]>([]);
  const [medidasCorrectivas, setMedidasCorrectivas] = useState<any[]>([]);
  const [inspeccionesPorMes, setInspeccionesPorMes] = useState<any[]>([]);
  const [porcentajeLevantamiento, setPorcentajeLevantamiento] = useState<any>(null);
  const [actosCondiciones, setActosCondiciones] = useState<any>(null);

  useEffect(() => {
    if (usuario?.empresaId) {
      loadReportes();
    }
  }, [usuario?.empresaId, fechaDesde, fechaHasta]);

  const loadReportes = async () => {
    if (!usuario?.empresaId) return;

    try {
      setIsLoading(true);
      const [
        cumplimiento,
        accidentes,
        medidas,
        inspecciones,
        levantamiento,
        actos,
      ] = await Promise.all([
        reportesService
          .getCumplimientoCapacitaciones(usuario.empresaId, fechaDesde, fechaHasta)
          .catch(() => null),
        reportesService
          .getAccidentesVsIncidentes(usuario.empresaId, fechaDesde, fechaHasta)
          .catch(() => []),
        reportesService
          .getMedidasCorrectivas(usuario.empresaId, fechaDesde, fechaHasta)
          .catch(() => []),
        reportesService
          .getInspeccionesPorMes(usuario.empresaId, fechaDesde, fechaHasta)
          .catch(() => []),
        reportesService
          .getPorcentajeLevantamiento(usuario.empresaId)
          .catch(() => null),
        reportesService
          .getActosCondiciones(usuario.empresaId, fechaDesde, fechaHasta)
          .catch(() => null),
      ]);

      setCumplimientoCapacitaciones(cumplimiento);
      setAccidentesVsIncidentes(accidentes);
      setMedidasCorrectivas(medidas);
      setInspeccionesPorMes(inspecciones);
      setPorcentajeLevantamiento(levantamiento);
      setActosCondiciones(actos);
    } catch (error: any) {
      toast.error('Error al cargar reportes');
    } finally {
      setIsLoading(false);
    }
  };

  // Componente de Gauge/Donut simplificado
  const DonutChart = ({ percentage }: { percentage: number }) => {
    const data = [
      { name: 'Cumplido', value: percentage },
      { name: 'Pendiente', value: 100 - percentage },
    ];

    return (
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={index === 0 ? COLORS.success : COLORS.gray}
              />
            ))}
          </Pie>
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-3xl font-bold"
            fill={COLORS.primary}
          >
            {percentage}%
          </text>
        </PieChart>
      </ResponsiveContainer>
    );
  };

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
        </div>
      </div>

      {/* Sección: Capacitaciones */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Capacitaciones</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Medidor */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              % de cumplimiento de capacitaciones
            </h3>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : cumplimientoCapacitaciones ? (
              <DonutChart
                percentage={cumplimientoCapacitaciones.porcentaje_cumplimiento}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                <Package className="w-12 h-12 mb-2" />
                <p>No hay datos disponibles</p>
              </div>
            )}
          </div>

          {/* Tabla de Detalle por Área */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              % de cumplimiento de capacitaciones por área
            </h3>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : cumplimientoCapacitaciones?.por_area?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                        Área
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                        1 capacitación o más
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                        Total trabajadores
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                        % Cumplimiento
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {cumplimientoCapacitaciones.por_area.map((area: any) => (
                      <tr key={area.area_id}>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {area.area_nombre}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {area.trabajadores_con_capacitacion}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {area.total_trabajadores}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <span
                            className={`font-medium ${
                              area.porcentaje_cumplimiento >= 80
                                ? 'text-green-600'
                                : area.porcentaje_cumplimiento >= 50
                                  ? 'text-yellow-600'
                                  : 'text-red-600'
                            }`}
                          >
                            {area.porcentaje_cumplimiento}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                <Package className="w-12 h-12 mb-2" />
                <p>No hay datos disponibles</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sección: Accidentes e Incidentes */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Accidentes e Incidentes
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Barras Comparativo */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Gráfico de barras de nro de accidentes vs incidentes al mes
            </h3>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : accidentesVsIncidentes.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={accidentesVsIncidentes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="accidentes" fill={COLORS.danger} name="Accidentes" />
                  <Bar dataKey="incidentes" fill={COLORS.warning} name="Incidentes" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Package className="w-12 h-12 mb-2" />
                <p>No hay datos disponibles</p>
              </div>
            )}
          </div>

          {/* Gráfico de Barras de Gestión */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Gráfico de barras de nro de medidas correctivas ejecutadas vs
              programadas al mes
            </h3>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : medidasCorrectivas.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={medidasCorrectivas}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="programadas"
                    fill={COLORS.gray}
                    name="Programadas"
                  />
                  <Bar
                    dataKey="ejecutadas"
                    fill={COLORS.success}
                    name="Ejecutadas"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Package className="w-12 h-12 mb-2" />
                <p>No hay datos disponibles</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sección: Inspecciones */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Inspecciones</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Tendencia */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Nro de inspecciones por mes por tipo de formulario
            </h3>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : inspeccionesPorMes.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={inspeccionesPorMes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {Object.keys(inspeccionesPorMes[0] || {})
                    .filter((key) => key !== 'mes')
                    .map((tipo, index) => (
                      <Line
                        key={tipo}
                        type="monotone"
                        dataKey={tipo}
                        stroke={CHART_COLORS[index % CHART_COLORS.length]}
                        name={tipo}
                      />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Package className="w-12 h-12 mb-2" />
                <p>No hay datos disponibles</p>
              </div>
            )}
          </div>

          {/* Gráfico de Desempeño */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              % de levantamiento de acciones correctivas
            </h3>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : porcentajeLevantamiento ? (
              <div className="flex flex-col items-center justify-center h-64">
                <DonutChart
                  percentage={porcentajeLevantamiento.porcentaje_levantamiento}
                />
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600">
                    {porcentajeLevantamiento.hallazgos_cerrados} de{' '}
                    {porcentajeLevantamiento.total_hallazgos} hallazgos cerrados
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Package className="w-12 h-12 mb-2" />
                <p>No hay datos disponibles</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sección: Actos y Condiciones */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Actos y Condiciones</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Comparación de Áreas */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Área que detecta vs Área que reporta
            </h3>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : actosCondiciones?.deteccion_vs_reporte?.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={actosCondiciones.deteccion_vs_reporte}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="area" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="detecta" fill={COLORS.primary} name="Detecta" />
                  <Bar dataKey="reporta" fill={COLORS.success} name="Reporta" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Package className="w-12 h-12 mb-2" />
                <p>No hay datos disponibles</p>
              </div>
            )}
          </div>

          {/* Gráfico de Distribución (Pie) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Acciones Correctivas por Estado
            </h3>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : actosCondiciones?.por_estado?.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={actosCondiciones.por_estado}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ estado, cantidad }) => `${estado}: ${cantidad}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="cantidad"
                  >
                    {actosCondiciones.por_estado.map((entry: any, index: number) => (
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
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Package className="w-12 h-12 mb-2" />
                <p>No hay datos disponibles</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
