'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { capacitacionesService, Capacitacion } from '@/services/capacitaciones.service';
import { empresasService, Empresa } from '@/services/empresas.service';
import { estructuraService } from '@/services/estructura.service';
import { configCapacitacionesService } from '@/services/config-capacitaciones.service';
import { areasService } from '@/services/areas.service';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { Package, Search } from 'lucide-react';
import { toast } from 'sonner';

const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  gray: '#6b7280',
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function getMesKey(fecha: string): string {
  const d = new Date(fecha);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMesLabel(key: string): string {
  const [y, m] = key.split('-');
  return `${MESES[parseInt(m, 10) - 1]} ${y}`;
}

export default function ReportesCapacitacionesPage() {
  const { usuario, empresasVinculadas } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [fechaDesde, setFechaDesde] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
  );
  const [fechaHasta, setFechaHasta] = useState(new Date().toISOString().split('T')[0]);

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [unidades, setUnidades] = useState<{ id: string; nombre: string }[]>([]);
  const [sedes, setSedes] = useState<{ id: string; nombre: string }[]>([]);
  const [gerencias, setGerencias] = useState<{ id: string; nombre: string }[]>([]);
  const [configGrupos, setConfigGrupos] = useState<string[]>([]);
  const [areas, setAreas] = useState<{ id: string; nombre: string }[]>([]);

  const [filtros, setFiltros] = useState({
    empresa_id: '',
    unidad: '',
    area: '',
    gerencia: '',
    sede: '',
    grupo: '',
  });

  const [capacitaciones, setCapacitaciones] = useState<Capacitacion[]>([]);

  const empresaId = filtros.empresa_id || usuario?.empresaId || '';

  useEffect(() => {
    empresasService.findAll().then(setEmpresas).catch(() => []);
  }, [empresasVinculadas?.length]);

  useEffect(() => {
    configCapacitacionesService.getConfig().then((c) => {
      setConfigGrupos(c.grupos ?? []);
    }).catch(() => setConfigGrupos([]));
  }, []);

  useEffect(() => {
    if (!empresaId) {
      setAreas([]);
      return;
    }
    areasService.findAll(empresaId).then(setAreas).catch(() => []);
  }, [empresaId]);

  useEffect(() => {
    if (!empresaId) {
      setUnidades([]);
      setSedes([]);
      setGerencias([]);
      return;
    }
    Promise.all([
      estructuraService.findUnidades(empresaId),
      estructuraService.findSedes(empresaId),
      estructuraService.findGerencias(empresaId),
    ]).then(([u, s, g]) => {
      setUnidades(u);
      setSedes(s);
      setGerencias(g);
    }).catch(() => {
      setUnidades([]);
      setSedes([]);
      setGerencias([]);
    });
  }, [empresaId]);

  useEffect(() => {
    loadCapacitaciones();
  }, [fechaDesde, fechaHasta, filtros, usuario?.empresaId]);

  const loadCapacitaciones = async () => {
    try {
      setIsLoading(true);
      const data = await capacitacionesService.findAll({
        empresaId: filtros.empresa_id || usuario?.empresaId || undefined,
        fechaDesde,
        fechaHasta,
        unidad: filtros.unidad || undefined,
        area: filtros.area || undefined,
        sede: filtros.sede || undefined,
        grupo: filtros.grupo || undefined,
        gerencia: filtros.gerencia || undefined,
      });
      setCapacitaciones(data);
    } catch (error: any) {
      toast.error('Error al cargar capacitaciones', {
        description: error.response?.data?.message || 'No se pudieron cargar los datos',
      });
      setCapacitaciones([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Matriz: % ejecución por tipo (asistencia), tooltip con fecha inicio
  const matrizEjecucion = (() => {
    const porTipo: Record<string, { total: number; ejecutadas: number; items: { titulo: string; fecha: string; porcentaje: number }[] }> = {};
    capacitaciones.forEach((cap) => {
      const tipo = cap.tipo || 'Otra';
      if (!porTipo[tipo]) {
        porTipo[tipo] = { total: 0, ejecutadas: 0, items: [] };
      }
      const participantes = cap.participantes?.length || 0;
      const asistentes = cap.participantes?.filter((p) => p.asistencia).length || 0;
      const pct = participantes > 0 ? Math.round((asistentes / participantes) * 100) : 0;
      porTipo[tipo].total += 1;
      if (participantes > 0 && asistentes > 0) porTipo[tipo].ejecutadas += 1;
      porTipo[tipo].items.push({
        titulo: cap.titulo,
        fecha: cap.fecha,
        porcentaje: pct,
      });
    });
    return Object.entries(porTipo).map(([tipo, d]) => ({
      tipo,
      porcentaje: d.total > 0 ? Math.round((d.ejecutadas / d.total) * 100) : 0,
      cantidad: d.total,
      items: d.items,
    })).sort((a, b) => b.porcentaje - a.porcentaje);
  })();

  // 2. Cantidad por mes y tipo - Y=tipo, X=mes, tooltip con capacitaciones
  const porMesYTipo = (() => {
    const mesTipo: Record<string, Record<string, { count: number; items: string[] }>> = {};
    const tiposSet = new Set<string>();
    capacitaciones.forEach((cap) => {
      const mesKey = getMesKey(cap.fecha);
      const tipo = cap.tipo || 'Otra';
      tiposSet.add(tipo);
      if (!mesTipo[mesKey]) mesTipo[mesKey] = {};
      if (!mesTipo[mesKey][tipo]) mesTipo[mesKey][tipo] = { count: 0, items: [] };
      mesTipo[mesKey][tipo].count += 1;
      mesTipo[mesKey][tipo].items.push(`${cap.titulo} (${cap.fecha})`);
    });
    const meses = Object.keys(mesTipo).sort();
    const tipos = Array.from(tiposSet).sort();
    return { meses, tipos, data: mesTipo };
  })();

  const chartPorMesData = porMesYTipo.meses.map((mes) => {
    const row: Record<string, number | string> = { mes: getMesLabel(mes) };
    porMesYTipo.tipos.forEach((tipo) => {
      row[tipo] = porMesYTipo.data[mes]?.[tipo]?.count ?? 0;
    });
    return row;
  });

  // 3. Cantidad por tipo (solo los que tienen registros)
  const porTipoCount = matrizEjecucion.map((m) => ({
    tipo: m.tipo,
    cantidad: m.cantidad,
  }));

  // 4. Estado de capacitaciones
  const porEstado = (() => {
    const counts: Record<string, number> = {};
    capacitaciones.forEach((c) => {
      const e = c.estado || 'Sin estado';
      counts[e] = (counts[e] || 0) + 1;
    });
    return Object.entries(counts).map(([estado, cantidad]) => ({ estado, cantidad }));
  })();

  const CustomTooltipMatriz = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    const d = payload[0].payload;
    const items = d.items || [];
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 max-w-xs">
        <p className="font-semibold text-slate-800 mb-2">{d.tipo}: {d.porcentaje}% ejecución</p>
        <p className="text-xs text-slate-600 mb-1">Al hacer hover sobre la barra, fecha de inicio:</p>
        <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
          {items.slice(0, 5).map((it: any, i: number) => (
            <li key={i}>
              {it.titulo} — Inicio: {it.fecha} ({it.porcentaje}% asist.)
            </li>
          ))}
          {items.length > 5 && <li className="text-slate-500">... y {items.length - 5} más</li>}
        </ul>
      </div>
    );
  };

  const CustomTooltipMes = ({ active, payload, label }: any) => {
    if (!active || !payload?.length || !label) return null;
    const mesKey = porMesYTipo.meses.find((m) => getMesLabel(m) === label);
    if (!mesKey) return null;
    const itemsByTipo: string[] = [];
    porMesYTipo.tipos.forEach((tipo) => {
      const d = porMesYTipo.data[mesKey]?.[tipo];
      if (d?.items?.length) itemsByTipo.push(...d.items);
    });
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 max-w-sm max-h-64 overflow-y-auto">
        <p className="font-semibold text-slate-800 mb-2">{label}</p>
        <p className="text-xs text-slate-600 mb-1">Capacitaciones registradas:</p>
        <ul className="text-xs space-y-1">
          {itemsByTipo.slice(0, 8).map((it, i) => (
            <li key={i}>• {it}</li>
          ))}
          {itemsByTipo.length > 8 && <li className="text-slate-500">... y {itemsByTipo.length - 8} más</li>}
        </ul>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reporte de Capacitaciones</h1>
        <p className="text-slate-600 mt-1">Análisis de ejecución, cumplimiento y tendencias</p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Filtros</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Fecha desde</label>
            <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Fecha hasta</label>
            <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Empresa</label>
            <Select
              value={filtros.empresa_id}
              onChange={(e) => setFiltros((f) => ({ ...f, empresa_id: e.target.value }))}
            >
              <option value="">Todas</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Unidad</label>
            <Select
              value={filtros.unidad}
              onChange={(e) => setFiltros((f) => ({ ...f, unidad: e.target.value }))}
            >
              <option value="">Todas</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.nombre}>{u.nombre}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Área</label>
            <Select
              value={filtros.area}
              onChange={(e) => setFiltros((f) => ({ ...f, area: e.target.value }))}
            >
              <option value="">Todas</option>
              {areas.map((a) => (
                <option key={a.id} value={a.nombre}>{a.nombre}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Gerencia</label>
            <Select
              value={filtros.gerencia}
              onChange={(e) => setFiltros((f) => ({ ...f, gerencia: e.target.value }))}
            >
              <option value="">Todas</option>
              {gerencias.map((g) => (
                <option key={g.id} value={g.nombre}>{g.nombre}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Sede</label>
            <Select
              value={filtros.sede}
              onChange={(e) => setFiltros((f) => ({ ...f, sede: e.target.value }))}
            >
              <option value="">Todas</option>
              {sedes.map((s) => (
                <option key={s.id} value={s.nombre}>{s.nombre}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Grupo</label>
            <Select
              value={filtros.grupo}
              onChange={(e) => setFiltros((f) => ({ ...f, grupo: e.target.value }))}
            >
              <option value="">Todos</option>
              {configGrupos.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </Select>
          </div>
        </div>
        <div className="mt-4">
          <Button variant="primary" size="sm" onClick={loadCapacitaciones}>
            <Search className="h-4 w-4 mr-2" />
            Aplicar filtros
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      ) : capacitaciones.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <Package className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">No hay capacitaciones registradas</p>
          <p className="text-sm text-slate-500 mt-1">Ajuste los filtros o registre capacitaciones</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* 1. Gráfico matriz: % ejecución por tipo */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              % de avance por tipo de capacitación (ejecución según asistencia)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Pase el cursor sobre cada barra para ver la fecha de inicio de las capacitaciones
            </p>
            <ResponsiveContainer width="100%" height={Math.max(300, matrizEjecucion.length * 36)}>
              <BarChart
                data={matrizEjecucion}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} unit="%" />
                <YAxis type="category" dataKey="tipo" width={110} />
                <Tooltip content={<CustomTooltipMatriz />} />
                <Bar dataKey="porcentaje" name="% Ejecución" radius={[0, 4, 4, 0]}>
                  {matrizEjecucion.map((_, i) => (
                    <Cell
                      key={i}
                      fill={
                        matrizEjecucion[i].porcentaje >= 80
                          ? COLORS.success
                          : matrizEjecucion[i].porcentaje >= 50
                            ? COLORS.warning
                            : COLORS.primary
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 2. Cantidad por mes - tipo en Y, meses en X */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Capacitaciones registradas por mes
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Pase el cursor sobre las barras para ver el detalle de capacitaciones
            </p>
            {chartPorMesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartPorMesData} margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip content={<CustomTooltipMes />} />
                  <Legend />
                  {porMesYTipo.tipos.slice(0, 10).map((tipo, i) => (
                    <Bar key={tipo} dataKey={tipo} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} name={tipo} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400">
                No hay datos para el período seleccionado
              </div>
            )}
          </div>

          {/* 3. Gráficos adicionales */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Por tipo (solo con registros) */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Cantidad por tipo de capacitación
              </h3>
              {porTipoCount.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={porTipoCount} layout="vertical" margin={{ left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="tipo" width={95} />
                    <Tooltip />
                    <Bar dataKey="cantidad" fill={COLORS.primary} name="Cantidad" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-400">Sin datos</div>
              )}
            </div>

            {/* Por estado */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Distribución por estado
              </h3>
              {porEstado.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={porEstado}
                      dataKey="cantidad"
                      nameKey="estado"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ estado, cantidad }) => `${estado}: ${cantidad}`}
                    >
                      {porEstado.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-400">Sin datos</div>
              )}
            </div>
          </div>

          {/* Resumen numérico */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Indicadores base</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-2xl font-bold text-slate-900">{capacitaciones.length}</p>
                <p className="text-sm text-slate-600">Total capacitaciones</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-2xl font-bold text-green-600">
                  {capacitaciones.filter((c) => c.estado === 'COMPLETADA').length}
                </p>
                <p className="text-sm text-slate-600">Completadas</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-2xl font-bold text-sky-600">
                  {capacitaciones.filter((c) => c.estado === 'PROGRAMADA').length}
                </p>
                <p className="text-sm text-slate-600">Programadas</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-2xl font-bold text-amber-600">
                  {capacitaciones.reduce((s, c) => s + (c.participantes?.length || 0), 0)}
                </p>
                <p className="text-sm text-slate-600">Participantes totales</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
