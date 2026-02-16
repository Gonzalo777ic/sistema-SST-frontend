'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { capacitacionesService, Capacitacion, ParticipanteDto } from '@/services/capacitaciones.service';
import { configCapacitacionesService } from '@/services/config-capacitaciones.service';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  GraduationCap,
  ChevronDown,
  ChevronRight,
  Calendar,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function MisCapacitacionesPage() {
  const { usuario } = useAuth();
  const [capacitaciones, setCapacitaciones] = useState<Capacitacion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [filtroGrupo, setFiltroGrupo] = useState<string>('');
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [config, setConfig] = useState<{ tipos: string[]; grupos: string[] } | null>(null);

  const tieneTrabajadorId = !!usuario?.trabajadorId;

  const loadData = async () => {
    if (!tieneTrabajadorId) return;
    try {
      setIsLoading(true);
      const data = await capacitacionesService.findMisCapacitaciones({
        estadoRegistro: filtroEstado === 'pendiente' ? 'pendiente' : filtroEstado === 'completado' ? 'completado' : undefined,
        grupo: filtroGrupo || undefined,
        tipo: filtroTipo || undefined,
      });
      setCapacitaciones(data);
    } catch (error: any) {
      toast.error('Error al cargar capacitaciones', {
        description: error.response?.data?.message || 'No se pudieron cargar las capacitaciones',
      });
      setCapacitaciones([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (tieneTrabajadorId) {
      loadData();
      configCapacitacionesService.getConfig().then((c) => setConfig({ tipos: c.tipos || [], grupos: c.grupos || [] })).catch(() => setConfig({ tipos: [], grupos: [] }));
    } else {
      setIsLoading(false);
    }
  }, [usuario?.trabajadorId, filtroEstado, filtroGrupo, filtroTipo]);

  const getParticipanteActual = (c: Capacitacion): ParticipanteDto | undefined => {
    return c.participantes?.find((p) => p.trabajador_id === usuario?.trabajadorId);
  };

  const getEstadoRegistro = (c: Capacitacion) => {
    const p = getParticipanteActual(c);
    if (!p) return { label: 'Sin registro', completado: false };
    const firmo = (p as any).firmo ?? false;
    return firmo ? { label: 'Completado', completado: true } : { label: 'Pendiente', completado: false };
  };

  if (!tieneTrabajadorId) {
    return (
      <div className="p-6">
        <div className="p-12 text-center">
          <GraduationCap className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Acceso restringido</h3>
          <p className="text-slate-600">Debes tener un trabajador vinculado para ver tus capacitaciones.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Mis capacitaciones</h1>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setFiltrosAbiertos(!filtrosAbiertos)}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
        >
          <span className="text-sm font-semibold text-slate-700">
            {filtrosAbiertos ? <ChevronDown className="h-4 w-4 inline mr-2" /> : <ChevronRight className="h-4 w-4 inline mr-2" />}
            Filtros
          </span>
        </button>
        {filtrosAbiertos && (
          <div className="border-t border-slate-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Estado</label>
                <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="pendiente">Pendientes</option>
                  <option value="completado">Completados</option>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Grupo</label>
                <Select value={filtroGrupo} onChange={(e) => setFiltroGrupo(e.target.value)}>
                  <option value="">Todos</option>
                  {(config?.grupos || []).map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tipo</label>
                <Select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                  <option value="">Todos</option>
                  {(config?.tipos || []).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lista */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        ) : capacitaciones.length === 0 ? (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-lg">
            <GraduationCap className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">No hay capacitaciones registradas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {capacitaciones.map((c) => {
              const estado = getEstadoRegistro(c);
              return (
                <Link key={c.id} href={`/mis-capacitaciones/${c.id}`}>
                  <div className="bg-white border border-slate-200 rounded-lg p-4 hover:border-primary hover:shadow-md transition-all cursor-pointer">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-slate-900 line-clamp-2">{c.titulo}</h3>
                      <span
                        className={`shrink-0 px-2 py-1 rounded-full text-xs font-medium ${
                          estado.completado ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {estado.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                      <Calendar className="w-4 h-4 shrink-0" />
                      {c.fecha} {c.fecha_fin && c.fecha_fin !== c.fecha ? ` - ${c.fecha_fin}` : ''}
                    </div>
                    {c.hora_inicio && (
                      <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                        <Clock className="w-4 h-4 shrink-0" />
                        {c.hora_inicio}
                      </div>
                    )}
                    {c.grupo && (
                      <div className="text-xs text-slate-500 mt-1">{c.grupo}</div>
                    )}
                    <div className="flex items-center gap-2 mt-3 text-primary text-sm font-medium">
                      Ver instrucciones
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
