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
  const [cumplimientoAnual, setCumplimientoAnual] = useState<{
    total_trabajadores_activos: number;
    trabajadores: Array<{
      trabajador_id: string;
      nombre: string;
      documento: string;
      area: string | null;
      cantidad_certificados: number;
      capacitaciones: Array<{ titulo: string; fecha: string; tipo: string }>;
    }>;
  } | null>(null);
  const [anioCumplimiento, setAnioCumplimiento] = useState(new Date().getFullYear());
  const [umbralMinimo, setUmbralMinimo] = useState(4);
  const [sliceCumplimientoActivo, setSliceCumplimientoActivo] = useState<string | null>(null);
  const [loadingCumplimiento, setLoadingCumplimiento] = useState(false);
  const [trabajadorDetalleExpandido, setTrabajadorDetalleExpandido] = useState<{
    trabajador_id: string;
    nombre: string;
    capacitaciones: Array<{ titulo: string; fecha: string; tipo: string }>;
  } | null>(null);

  const empresaId = filtros.empresa_id || usuario?.empresaId || '';
  const empresasParaCumplimiento =
    filtros.empresa_id
      ? [filtros.empresa_id]
      : empresas.length > 0
        ? empresas.map((e) => e.id)
        : usuario?.empresaId
          ? [usuario.empresaId]
          : [];

  const trabajadoresSinUmbral = cumplimientoAnual?.trabajadores.filter((t) => t.cantidad_certificados < umbralMinimo) ?? [];
  const trabajadoresConUmbral = cumplimientoAnual?.trabajadores.filter((t) => t.cantidad_certificados >= umbralMinimo) ?? [];
  const todosTrabajadores = [...trabajadoresSinUmbral, ...trabajadoresConUmbral];
  const trabajadoresFiltrados =
    sliceCumplimientoActivo === 'nocumplen'
      ? trabajadoresSinUmbral
      : sliceCumplimientoActivo === 'cumplen'
        ? trabajadoresConUmbral
        : todosTrabajadores;
  const pieCumplimientoData = cumplimientoAnual
    ? [
        { name: `Cumplen (≥${umbralMinimo})`, value: trabajadoresConUmbral.length, fill: COLORS.success },
        { name: `No cumplen (<${umbralMinimo})`, value: trabajadoresSinUmbral.length, fill: COLORS.danger },
      ].filter((d) => d.value > 0)
    : [];

  useEffect(() => {
    empresasService.findAll().then(setEmpresas).catch(() => []);
  }, [empresasVinculadas?.length]);

  useEffect(() => {
    configCapacitacionesService.getConfig().then((c) => {
      setConfigGrupos(c.grupos ?? []);
    }).catch(() => setConfigGrupos([]));
  }, []);

  const empresaIdParaEstructura = empresaId || (empresas.length > 0 ? empresas[0].id : '');

  useEffect(() => {
    if (!empresaIdParaEstructura) {
      setAreas([]);
      return;
    }
    areasService.findAll(empresaIdParaEstructura).then(setAreas).catch(() => []);
  }, [empresaIdParaEstructura]);

  useEffect(() => {
    if (!empresaIdParaEstructura) {
      setUnidades([]);
      setSedes([]);
      setGerencias([]);
      return;
    }
    Promise.all([
      estructuraService.findUnidades(empresaIdParaEstructura),
      estructuraService.findSedes(empresaIdParaEstructura),
      estructuraService.findGerencias(empresaIdParaEstructura),
    ]).then(([u, s, g]) => {
      setUnidades(u);
      setSedes(s);
      setGerencias(g);
    }).catch(() => {
      setUnidades([]);
      setSedes([]);
      setGerencias([]);
    });
  }, [empresaIdParaEstructura]);

  useEffect(() => {
    loadCapacitaciones();
  }, [fechaDesde, fechaHasta, filtros, usuario?.empresaId]);

  useEffect(() => {
    if (empresasParaCumplimiento.length > 0) {
      setLoadingCumplimiento(true);
      const filtrosCumplimiento = {
        unidad: filtros.unidad || undefined,
        area: filtros.area || undefined,
        sede: filtros.sede || undefined,
        gerencia: filtros.gerencia || undefined,
      };
      Promise.all(
        empresasParaCumplimiento.map((empId) =>
          capacitacionesService.getCumplimientoAnual(empId, anioCumplimiento, filtrosCumplimiento),
        ),
      )
        .then((results) => {
          const merged = {
            total_trabajadores_activos: results.reduce((s, r) => s + r.total_trabajadores_activos, 0),
            trabajadores: results.flatMap((r) => r.trabajadores),
          };
          setCumplimientoAnual(merged);
        })
        .catch(() => setCumplimientoAnual(null))
        .finally(() => setLoadingCumplimiento(false));
    } else {
      setCumplimientoAnual(null);
    }
  }, [empresasParaCumplimiento.join(','), anioCumplimiento, filtros.unidad, filtros.area, filtros.sede, filtros.gerencia]);

  // Limpiar detalle expandido cuando cambian los datos
  useEffect(() => {
    setTrabajadorDetalleExpandido(null);
  }, [cumplimientoAnual, umbralMinimo]);

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

  // 4. Estado de capacitaciones (Cancelada se muestra como Cerrada)
  const porEstado = (() => {
    const counts: Record<string, number> = {};
    capacitaciones.forEach((c) => {
      const e = c.estado || 'Sin estado';
      const displayEstado = e === 'Cancelada' ? 'Cerrada' : e;
      counts[displayEstado] = (counts[displayEstado] || 0) + 1;
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

      {/* Cumplimiento anual: 4 capacitaciones con certificado (regla SUNAFIL) */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Cumplimiento anual por trabajador (Plan Anual)
          </h2>
          <p className="text-sm text-slate-600 mb-4">
            Regla: cada trabajador debe completar al menos 4 capacitaciones anuales con certificado (año calendario). Haga clic en cada segmento del gráfico para filtrar la tabla (cumplen / no cumplen). Vuelva a hacer clic para mostrar todos.
          </p>
          <div className="flex flex-wrap gap-4 items-center mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Año calendario</label>
              <Select
                value={String(anioCumplimiento)}
                onChange={(e) => setAnioCumplimiento(parseInt(e.target.value, 10))}
                className="w-28"
              >
                {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Umbral mínimo de capacitaciones: {umbralMinimo}
              </label>
              <input
                type="range"
                min={1}
                max={10}
                value={umbralMinimo}
                onChange={(e) => setUmbralMinimo(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>1</span>
                <span>10</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              {loadingCumplimiento ? (
                <Skeleton className="h-64 w-full" />
              ) : cumplimientoAnual && cumplimientoAnual.total_trabajadores_activos === 0 ? (
                <div className="h-64 flex items-center justify-center text-slate-400">
                  No hay trabajadores activos en la empresa
                </div>
              ) : pieCumplimientoData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieCumplimientoData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      style={{ cursor: 'pointer' }}
                      onClick={(data: any) => {
                        const name = data?.name ?? '';
                        if (name.includes('No cumplen')) {
                          setSliceCumplimientoActivo((prev) => (prev === 'nocumplen' ? null : 'nocumplen'));
                        } else if (name.includes('Cumplen')) {
                          setSliceCumplimientoActivo((prev) => (prev === 'cumplen' ? null : 'cumplen'));
                        }
                      }}
                    >
                      {pieCumplimientoData.map((entry, i) => {
                        const esNoCumplen = entry.name.includes('No cumplen');
                        const esCumplen = entry.name.includes('Cumplen');
                        const seleccionado = sliceCumplimientoActivo === 'nocumplen' ? esNoCumplen : sliceCumplimientoActivo === 'cumplen' ? esCumplen : true;
                        const opacidad = seleccionado ? 1 : 0.35;
                        return (
                          <Cell
                            key={i}
                            fill={entry.fill}
                            fillOpacity={opacidad}
                            stroke="#fff"
                            strokeWidth={2}
                          />
                        );
                      })}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${value} trabajadores`, '']}
                      contentStyle={{ fontSize: '13px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-400">
                  {empresasParaCumplimiento.length > 0 ? 'No hay datos de cumplimiento' : 'Seleccione una empresa para ver el cumplimiento'}
                </div>
              )}
            </div>
            <div>
              {todosTrabajadores.length > 0 ? (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <p className="bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
                    {sliceCumplimientoActivo === 'nocumplen'
                      ? `No cumplen (${trabajadoresSinUmbral.length})`
                      : sliceCumplimientoActivo === 'cumplen'
                        ? `Cumplen (${trabajadoresConUmbral.length})`
                        : `Trabajadores (${todosTrabajadores.length}) — ${trabajadoresConUmbral.length} cumplen, ${trabajadoresSinUmbral.length} no cumplen`}
                  </p>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 sticky top-0 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-slate-600">Trabajador</th>
                          <th className="px-3 py-2 text-left font-medium text-slate-600">Área</th>
                          <th className="px-3 py-2 text-center font-medium text-slate-600 w-20">Cantidad</th>
                          <th className="px-3 py-2 text-center font-medium text-slate-600">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {trabajadoresFiltrados.map((t) => {
                          const cumple = t.cantidad_certificados >= umbralMinimo;
                          return (
                            <tr
                              key={t.trabajador_id}
                              className={`hover:bg-slate-50 cursor-pointer ${trabajadorDetalleExpandido?.trabajador_id === t.trabajador_id ? 'bg-slate-100' : ''}`}
                              onClick={() =>
                                setTrabajadorDetalleExpandido((prev) =>
                                  prev?.trabajador_id === t.trabajador_id ? null : { trabajador_id: t.trabajador_id, nombre: t.nombre, capacitaciones: t.capacitaciones },
                                )
                              }
                            >
                              <td className="px-3 py-2">{t.nombre} ({t.documento})</td>
                              <td className="px-3 py-2">{t.area || '-'}</td>
                              <td className="px-3 py-2 text-center align-middle w-20">
                                <div className="relative group inline-block w-8">
                                  <span
                                    className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-medium cursor-help shrink-0 ${
                                      cumple ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {t.cantidad_certificados}
                                  </span>
                                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50 w-64 max-h-48 overflow-y-auto bg-slate-800 text-white text-xs rounded-lg shadow-xl p-3 pointer-events-none">
                                    <p className="font-semibold mb-2">Capacitaciones completadas:</p>
                                    {t.capacitaciones.length > 0 ? (
                                      <ul className="space-y-1">
                                        {t.capacitaciones.map((c, i) => (
                                          <li key={i}>• {c.titulo} ({c.fecha}) — {c.tipo}</li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p className="text-slate-400">Sin capacitaciones</p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${cumple ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                  {cumple ? 'Cumple' : 'No cumple'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-slate-500 px-4 py-2 border-t border-slate-100">
                    Pase el cursor sobre la cantidad para ver las capacitaciones. Haga clic en una fila para ver el detalle.
                  </p>
                  {trabajadorDetalleExpandido && (
                    <div className="border-t border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-700 mb-2">
                        Detalle de capacitaciones — {trabajadorDetalleExpandido.nombre}
                      </p>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="px-3 py-2 text-left font-medium text-slate-600">Capacitación</th>
                            <th className="px-3 py-2 text-left font-medium text-slate-600">Fecha de realización</th>
                            <th className="px-3 py-2 text-left font-medium text-slate-600">Tipo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {trabajadorDetalleExpandido.capacitaciones.length > 0 ? (
                            trabajadorDetalleExpandido.capacitaciones.map((c, i) => (
                              <tr key={i}>
                                <td className="px-3 py-2">{c.titulo}</td>
                                <td className="px-3 py-2">{c.fecha}</td>
                                <td className="px-3 py-2">{c.tipo}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={3} className="px-3 py-2 text-slate-500">
                                Sin capacitaciones registradas
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : cumplimientoAnual && cumplimientoAnual.total_trabajadores_activos === 0 ? (
                <div className="h-64 flex items-center justify-center text-slate-500 border border-slate-200 rounded-lg">
                  No hay trabajadores activos
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-lg">
                  Haga clic en el gráfico para ver la lista de trabajadores
                </div>
              )}
            </div>
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
