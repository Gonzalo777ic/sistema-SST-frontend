'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  capacitacionesService,
  Capacitacion,
  TipoCapacitacion,
  EstadoCapacitacion,
} from '@/services/capacitaciones.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Search,
  GraduationCap,
  Calendar,
  Clock,
  User,
  Users,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { UsuarioRol } from '@/types';
import { cn } from '@/lib/utils';

export default function CapacitacionesPage() {
  const { usuario, hasAnyRole } = useAuth();
  const [capacitaciones, setCapacitaciones] = useState<Capacitacion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTipo, setSelectedTipo] = useState<TipoCapacitacion | ''>('');
  const [selectedEstado, setSelectedEstado] = useState<EstadoCapacitacion | ''>('');

  const canCreate = hasAnyRole([
    UsuarioRol.SUPER_ADMIN,
    UsuarioRol.ADMIN_EMPRESA,
    UsuarioRol.INGENIERO_SST,
  ]);

  useEffect(() => {
    loadCapacitaciones();
  }, []);

  useEffect(() => {
    loadCapacitaciones();
  }, [selectedTipo, selectedEstado]);

  const loadCapacitaciones = async () => {
    try {
      setIsLoading(true);
      const empresaId = usuario?.empresaId || undefined;
      const data = await capacitacionesService.findAll(empresaId);
      setCapacitaciones(data);
    } catch (error: any) {
      toast.error('Error al cargar capacitaciones', {
        description: error.response?.data?.message || 'No se pudieron cargar las capacitaciones',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCapacitaciones = capacitaciones.filter((cap) => {
    const matchesSearch =
      !searchTerm ||
      cap.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cap.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = !selectedTipo || cap.tipo === selectedTipo;
    const matchesEstado = !selectedEstado || cap.estado === selectedEstado;
    return matchesSearch && matchesTipo && matchesEstado;
  });

  const getTipoBadgeColor = (tipo: TipoCapacitacion) => {
    const colors: Record<TipoCapacitacion, string> = {
      [TipoCapacitacion.Induccion]: 'bg-blue-100 text-blue-800',
      [TipoCapacitacion.TrabajoAltura]: 'bg-red-100 text-red-800',
      [TipoCapacitacion.EspaciosConfinados]: 'bg-orange-100 text-orange-800',
      [TipoCapacitacion.PrimerosAuxilios]: 'bg-green-100 text-green-800',
      [TipoCapacitacion.ManejoEPP]: 'bg-purple-100 text-purple-800',
      [TipoCapacitacion.PrevencionIncendios]: 'bg-yellow-100 text-yellow-800',
      [TipoCapacitacion.ManejoDefensivo]: 'bg-indigo-100 text-indigo-800',
      [TipoCapacitacion.IzajeSenalizacion]: 'bg-pink-100 text-pink-800',
      [TipoCapacitacion.RiesgosElectricos]: 'bg-amber-100 text-amber-800',
      [TipoCapacitacion.Otra]: 'bg-gray-100 text-gray-800',
    };
    return colors[tipo] || 'bg-gray-100 text-gray-800';
  };

  const getEstadoColor = (estado: EstadoCapacitacion) => {
    switch (estado) {
      case EstadoCapacitacion.Programada:
        return 'bg-warning-light/20 text-warning';
      case EstadoCapacitacion.Completada:
        return 'bg-success-light/20 text-success';
      case EstadoCapacitacion.Cancelada:
        return 'bg-danger-light/20 text-danger';
      default:
        return 'bg-slate-200 text-slate-700';
    }
  };

  return (
    <ProtectedRoute allowedRoles={Object.values(UsuarioRol)}>
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Capacitaciones</h1>
              <p className="text-slate-600 mt-2">Gestión de capacitaciones y certificaciones</p>
            </div>
            {canCreate && (
              <Link href="/capacitaciones/nueva">
                <Button>
                  <Plus className="w-5 h-5 mr-2" />
                  Nueva Capacitación
                </Button>
              </Link>
            )}
          </div>

          {/* Filtros */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <Input
                    placeholder="Buscar por título o descripción..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="md:w-48">
                <Select
                  value={selectedTipo}
                  onChange={(e) => setSelectedTipo(e.target.value as TipoCapacitacion | '')}
                >
                  <option value="">Todos los tipos</option>
                  {Object.values(TipoCapacitacion).map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="md:w-48">
                <Select
                  value={selectedEstado}
                  onChange={(e) => setSelectedEstado(e.target.value as EstadoCapacitacion | '')}
                >
                  <option value="">Todos los estados</option>
                  {Object.values(EstadoCapacitacion).map((estado) => (
                    <option key={estado} value={estado}>
                      {estado}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          {/* Cards de Capacitaciones */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              <>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-64 w-full" />
                ))}
              </>
            ) : filteredCapacitaciones.length === 0 ? (
              <div className="col-span-full p-12 text-center">
                <GraduationCap className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">No hay capacitaciones registradas</p>
              </div>
            ) : (
              filteredCapacitaciones.map((capacitacion) => (
                <Link
                  key={capacitacion.id}
                  href={`/capacitaciones/${capacitacion.id}`}
                  className="block"
                >
                  <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow h-full flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <GraduationCap className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900 text-lg line-clamp-2">
                            {capacitacion.titulo}
                          </h3>
                          <span
                            className={cn(
                              'inline-block mt-1 px-2 py-1 text-xs font-medium rounded',
                              getTipoBadgeColor(capacitacion.tipo),
                            )}
                          >
                            {capacitacion.tipo}
                          </span>
                        </div>
                      </div>
                      {capacitacion.examenes && capacitacion.examenes.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-1 rounded">
                          <FileText className="w-3 h-3" />
                          <span>Examen</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 mb-4 flex-1">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(capacitacion.fecha).toLocaleDateString('es-PE')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Clock className="w-4 h-4" />
                        <span>
                          {capacitacion.hora_inicio} - {capacitacion.hora_fin} ({capacitacion.duracion_horas}h)
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <User className="w-4 h-4" />
                        <span>{capacitacion.instructor || 'Sin instructor asignado'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Users className="w-4 h-4" />
                        <span>{capacitacion.participantes.length} participantes</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                      <span
                        className={cn(
                          'px-2 py-1 text-xs font-medium rounded',
                          getEstadoColor(capacitacion.estado),
                        )}
                      >
                        {capacitacion.estado}
                      </span>
                      {capacitacion.participantes.some((p) => p.aprobado) && (
                        <div className="flex items-center gap-1 text-xs text-success">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Certificados emitidos</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
