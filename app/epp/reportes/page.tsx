'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { eppService } from '@/services/epp.service';
import { empresasService, Empresa } from '@/services/empresas.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ArrowLeft, FileText } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { UsuarioRol } from '@/types';

const COLORS = {
  vencido: '#eab308',
  vigente: '#22c55e',
  porVencer: '#3b82f6',
};

const CHART_COLORS = ['#22c55e', '#3b82f6', '#eab308', '#8b5cf6', '#ec4899'];

export default function EPPReportesPage() {
  const { usuario, hasAnyRole } = useAuth();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaFiltro, setEmpresaFiltro] = useState<string>('');
  const [fechaDesde, setFechaDesde] = useState(
    () => new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
  );
  const [fechaHasta, setFechaHasta] = useState(
    () => new Date().toISOString().split('T')[0],
  );
  const [isLoading, setIsLoading] = useState(true);

  const [estadosEpp, setEstadosEpp] = useState<{
    vencido: number;
    vigente: number;
    por_vencer: number;
    total: number;
  } | null>(null);
  const [entregasPorEmpresa, setEntregasPorEmpresa] = useState<any[]>([]);
  const [entregasPorEmpresaArea, setEntregasPorEmpresaArea] = useState<any[]>([]);
  const [entregasPorMes, setEntregasPorMes] = useState<any[]>([]);
  const [entregasPorSede, setEntregasPorSede] = useState<any[]>([]);
  const [eppsMasSolicitados, setEppsMasSolicitados] = useState<any[]>([]);
  const [trabajadorCosto, setTrabajadorCosto] = useState<any[]>([]);

  const esAdmin = hasAnyRole([UsuarioRol.SUPER_ADMIN, UsuarioRol.ADMIN_EMPRESA]);

  useEffect(() => {
    if (esAdmin) {
      empresasService.findAll().then(setEmpresas).catch(() => setEmpresas([]));
    }
  }, [esAdmin]);

  const empresaIds = (() => {
    if (!esAdmin && usuario?.empresaId) return [usuario.empresaId];
    if (empresaFiltro) return [empresaFiltro];
    return esAdmin ? empresas.map((e) => e.id) : undefined;
  })();

  useEffect(() => {
    loadReportes();
  }, [usuario?.empresaId, esAdmin, empresaFiltro, fechaDesde, fechaHasta, empresas.length]);

  const loadReportes = async () => {
    try {
      setIsLoading(true);
      const ids = empresaIds?.length ? empresaIds : undefined;
      const [
        estados,
        porEmpresa,
        porEmpresaArea,
        porMes,
        porSede,
        masSolicitados,
        costo,
      ] = await Promise.all([
        eppService.getReporteEstadosEpp(ids).catch(() => null),
        eppService.getReporteEntregasPorEmpresa(ids).catch(() => []),
        eppService.getReporteEntregasPorEmpresaArea(ids).catch(() => []),
        eppService
          .getReporteEntregasPorMes({
            empresa_ids: ids,
            fecha_desde: fechaDesde,
            fecha_hasta: fechaHasta,
          })
          .catch(() => []),
        eppService.getReporteEntregasPorSede(ids).catch(() => []),
        eppService.getReporteEppsMasSolicitados(ids).catch(() => []),
        eppService.getReporteTrabajadorCostoHistorico(ids).catch(() => []),
      ]);
      setEstadosEpp(estados);
      setEntregasPorEmpresa(porEmpresa);
      setEntregasPorEmpresaArea(porEmpresaArea);
      setEntregasPorMes(porMes);
      setEntregasPorSede(porSede);
      setEppsMasSolicitados(masSolicitados);
      setTrabajadorCosto(costo);
    } catch (error: any) {
      toast.error('Error al cargar reportes', {
        description: error.response?.data?.message || 'Intente de nuevo',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const datosEstados =
    estadosEpp && estadosEpp.total > 0
      ? [
          { name: 'Vencido', value: estadosEpp.vencido, color: COLORS.vencido },
          { name: 'Vigente', value: estadosEpp.vigente, color: COLORS.vigente },
          {
            name: 'Por vencer',
            value: estadosEpp.por_vencer,
            color: COLORS.porVencer,
          },
        ].filter((d) => d.value > 0)
      : [];

  const datosSede = entregasPorSede.map((s) => ({
    sede: s.sede,
    Vigente: s.vigente,
    'Por vencer': s.por_vencer,
    Vencido: s.vencido,
    total: s.total,
  }));

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/epp">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Regresar
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <FileText className="w-7 h-7 text-primary" />
            <h1 className="text-2xl font-bold text-gray-900">
              Reporte de EPPs
              {empresas.find((e) => e.id === empresaFiltro)?.nombre && (
                <span className="text-lg font-normal text-gray-600 ml-2">
                  - {empresas.find((e) => e.id === empresaFiltro)?.nombre}
                </span>
              )}
            </h1>
          </div>
        </div>
        {esAdmin && (
          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={empresaFiltro}
              onChange={(e) => setEmpresaFiltro(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Todas las empresas</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
            <Input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-36"
            />
            <span className="text-gray-500">-</span>
            <Input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-36"
            />
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          {/* Estados del EPP */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Estados del EPP
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Por vencer: le falta 1 mes o menos de vigencia
            </p>
            {datosEstados.length > 0 ? (
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-full max-w-[280px] h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={datosEstados}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(1)}%`
                        }
                      >
                        {datosEstados.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <p className="text-3xl font-bold text-gray-900">
                    {estadosEpp?.total ?? 0} TOTAL
                  </p>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: COLORS.vencido }}
                      />
                      <span>Vencido: {estadosEpp?.vencido ?? 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: COLORS.vigente }}
                      />
                      <span>Vigente: {estadosEpp?.vigente ?? 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: COLORS.porVencer }}
                      />
                      <span>Por vencer: {estadosEpp?.por_vencer ?? 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 py-8 text-center">
                No hay datos de entregas para mostrar
              </p>
            )}
          </div>

          {/* Entregas por empresa y por área */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Entregas por empresa
              </h2>
              {entregasPorEmpresa.length > 0 ? (
                <div className="max-h-64 overflow-y-auto">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={entregasPorEmpresa.slice(0, 10)}
                      layout="vertical"
                      margin={{ left: 80, right: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis
                        type="category"
                        dataKey="empresa_nombre"
                        width={75}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="vigente" stackId="a" fill={COLORS.vigente} name="Vigente" />
                      <Bar
                        dataKey="por_vencer"
                        stackId="a"
                        fill={COLORS.porVencer}
                        name="Por vencer"
                      />
                      <Bar dataKey="vencido" stackId="a" fill={COLORS.vencido} name="Vencido" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-gray-500 py-8 text-center">Sin datos</p>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Entregas por empresa - áreas
              </h2>
              {entregasPorEmpresaArea.length > 0 ? (
                <div className="max-h-64 overflow-y-auto">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={entregasPorEmpresaArea.slice(0, 10).map((r) => ({
                        ...r,
                        label: `${r.empresa_nombre} - ${r.area_nombre || 'Sin área'}`,
                      }))}
                      layout="vertical"
                      margin={{ left: 100, right: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={95}
                        tick={{ fontSize: 10 }}
                      />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="vigente" stackId="a" fill={COLORS.vigente} name="Vigente" />
                      <Bar
                        dataKey="por_vencer"
                        stackId="a"
                        fill={COLORS.porVencer}
                        name="Por vencer"
                      />
                      <Bar dataKey="vencido" stackId="a" fill={COLORS.vencido} name="Vencido" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-gray-500 py-8 text-center">Sin datos</p>
              )}
            </div>
          </div>

          {/* Entregas por mes - tabla con scroll lateral */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Entregas por mes
            </h2>
            <div className="overflow-x-auto -mx-2">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">
                      Fecha entrega
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">
                      Trabajador
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">
                      Nro documento
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">
                      Fecha vencimiento
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">
                      Razón social
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">
                      Sede
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">
                      Equipo
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">
                      Vigencia
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">
                      Cantidad
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">
                      Costo unit.
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {entregasPorMes.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-3 py-8 text-center text-gray-500">
                        Sin registros
                      </td>
                    </tr>
                  ) : (
                    entregasPorMes.slice(0, 100).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap">
                          {new Date(row.fecha_entrega).toLocaleDateString('es-PE', {
                            dateStyle: 'medium',
                          })}
                        </td>
                        <td className="px-3 py-2">{row.trabajador_nombre}</td>
                        <td className="px-3 py-2">{row.nro_documento}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {row.fecha_vencimiento
                            ? new Date(row.fecha_vencimiento).toLocaleDateString('es-PE')
                            : '-'}
                        </td>
                        <td className="px-3 py-2">{row.razon_social}</td>
                        <td className="px-3 py-2">{row.sede ?? '-'}</td>
                        <td className="px-3 py-2">{row.equipo}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              row.vigencia === 'Vencido'
                                ? 'bg-amber-100 text-amber-800'
                                : row.vigencia === 'Por vencer'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {row.vigencia}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">{row.cantidad}</td>
                        <td className="px-3 py-2 text-right">
                          {row.costo_unitario != null
                            ? `S/ ${Number(row.costo_unitario).toFixed(2)}`
                            : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {entregasPorMes.length > 100 && (
              <p className="text-sm text-gray-500 mt-2">
                Mostrando 100 de {entregasPorMes.length} registros
              </p>
            )}
          </div>

          {/* Entregas por sede */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Entregas por sede
            </h2>
            {datosSede.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={datosSede} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="sede" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Vigente" stackId="a" fill={COLORS.vigente} />
                    <Bar dataKey="Por vencer" stackId="a" fill={COLORS.porVencer} />
                    <Bar dataKey="Vencido" stackId="a" fill={COLORS.vencido} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-gray-500 py-8 text-center">Sin datos</p>
            )}
          </div>

          {/* EPPs más solicitados */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              EPPs más solicitados
            </h2>
            {eppsMasSolicitados.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={eppsMasSolicitados.slice(0, 15)}
                    layout="vertical"
                    margin={{ left: 120, right: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis
                      type="category"
                      dataKey="epp_nombre"
                      width={115}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip />
                    <Bar dataKey="total_solicitado" fill="#3b82f6" name="Cantidad entregada" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-gray-500 py-8 text-center">Sin datos</p>
            )}
          </div>

          {/* Trabajador y costo sumado histórico */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Trabajador y costo sumado de EPPs histórico
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">
                      Trabajador
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">
                      Nro documento
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">
                      Razón social
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">
                      Total items
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">
                      Costo total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {trabajadorCosto.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                        Sin registros
                      </td>
                    </tr>
                  ) : (
                    trabajadorCosto.slice(0, 50).map((row) => (
                      <tr key={row.trabajador_id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">{row.trabajador_nombre}</td>
                        <td className="px-3 py-2">{row.nro_documento}</td>
                        <td className="px-3 py-2">{row.razon_social ?? '-'}</td>
                        <td className="px-3 py-2 text-right">{row.total_items}</td>
                        <td className="px-3 py-2 text-right font-medium">
                          S/ {row.costo_total.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {trabajadorCosto.length > 50 && (
              <p className="text-sm text-gray-500 mt-2">
                Mostrando 50 de {trabajadorCosto.length} trabajadores
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
