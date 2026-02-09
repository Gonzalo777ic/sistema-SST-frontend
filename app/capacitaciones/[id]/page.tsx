'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  capacitacionesService,
  Capacitacion,
  EstadoCapacitacion,
} from '@/services/capacitaciones.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  GraduationCap,
  Calendar,
  Clock,
  User,
  Users,
  FileText,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { UsuarioRol } from '@/types';
import { cn } from '@/lib/utils';

export default function CapacitacionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { usuario, hasAnyRole } = useAuth();
  const id = params.id as string;

  const [capacitacion, setCapacitacion] = useState<Capacitacion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const canManage = hasAnyRole([
    UsuarioRol.SUPER_ADMIN,
    UsuarioRol.ADMIN_EMPRESA,
    UsuarioRol.INGENIERO_SST,
    UsuarioRol.SUPERVISOR,
  ]);

  useEffect(() => {
    if (id) {
      loadCapacitacion();
    }
  }, [id]);

  const loadCapacitacion = async () => {
    try {
      setIsLoading(true);
      const data = await capacitacionesService.findOne(id);
      setCapacitacion(data);
    } catch (error: any) {
      toast.error('Error al cargar capacitación', {
        description: error.response?.data?.message || 'No se pudo cargar la capacitación',
      });
      router.push('/capacitaciones');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAsistenciaChange = async (
    trabajadorId: string,
    asistencia: boolean,
  ) => {
    if (!capacitacion) return;

    try {
      await capacitacionesService.actualizarAsistencia(
        capacitacion.id,
        trabajadorId,
        asistencia,
      );
      toast.success('Asistencia actualizada');
      loadCapacitacion();
    } catch (error: any) {
      toast.error('Error al actualizar asistencia', {
        description: error.response?.data?.message || 'No se pudo actualizar la asistencia',
      });
    }
  };

  const handleCalificacionChange = async (
    trabajadorId: string,
    calificacion: number,
  ) => {
    if (!capacitacion) return;

    try {
      setIsSaving(true);
      await capacitacionesService.actualizarAsistencia(
        capacitacion.id,
        trabajadorId,
        true,
        calificacion,
      );
      toast.success('Calificación guardada');
      loadCapacitacion();
    } catch (error: any) {
      toast.error('Error al guardar calificación', {
        description: error.response?.data?.message || 'No se pudo guardar la calificación',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (

          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>

    );
  }

  if (!capacitacion) {
    return null;
  }

  return (

        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Link href="/capacitaciones">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-900">{capacitacion.titulo}</h1>
              <p className="text-slate-600 mt-2">{capacitacion.descripcion}</p>
            </div>
          </div>

          {/* Información General */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Información General</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Fecha</p>
                  <p className="font-medium text-slate-900">
                    {new Date(capacitacion.fecha).toLocaleDateString('es-PE')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Horario</p>
                  <p className="font-medium text-slate-900">
                    {capacitacion.hora_inicio} - {capacitacion.hora_fin}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Instructor</p>
                  <p className="font-medium text-slate-900">
                    {capacitacion.instructor || 'No asignado'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Participantes</p>
                  <p className="font-medium text-slate-900">
                    {capacitacion.participantes.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de Participantes */}
          {canManage && capacitacion.estado === EstadoCapacitacion.Programada && (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-900">Control de Asistencia</h2>
                {capacitacion.examenes && capacitacion.examenes.length === 0 && (
                  <p className="text-sm text-slate-600">
                    Sin examen digital - Puede registrar calificaciones manualmente
                  </p>
                )}
              </div>
              <div className="space-y-4">
                {capacitacion.participantes.map((participante) => (
                  <div
                    key={participante.trabajador_id}
                    className="flex items-center justify-between p-4 border border-slate-200 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{participante.nombre}</p>
                      {participante.calificacion !== null && (
                        <p className="text-sm text-slate-600">
                          Calificación: {participante.calificacion}%
                          {participante.aprobado && (
                            <span className="ml-2 text-success">✓ Aprobado</span>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={participante.asistencia}
                            onChange={(e) =>
                              handleAsistenciaChange(participante.trabajador_id, e.target.checked)
                            }
                            className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                          />
                          <span className="text-sm text-slate-700">Asistió</span>
                        </label>
                      </div>
                      {participante.asistencia && capacitacion.examenes && capacitacion.examenes.length === 0 && (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="Calificación"
                            defaultValue={participante.calificacion || undefined}
                            onBlur={(e) => {
                              const calificacion = parseFloat(e.target.value);
                              if (!isNaN(calificacion) && calificacion >= 0 && calificacion <= 100) {
                                handleCalificacionChange(participante.trabajador_id, calificacion);
                              }
                            }}
                            className="w-24"
                          />
                          <span className="text-sm text-slate-600">%</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vista de Solo Lectura para No Administradores */}
          {!canManage && (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Participantes</h2>
              <div className="space-y-2">
                {capacitacion.participantes.map((participante) => (
                  <div
                    key={participante.trabajador_id}
                    className="flex items-center justify-between p-3 border border-slate-200 rounded-lg"
                  >
                    <span className="text-slate-900">{participante.nombre}</span>
                    <div className="flex items-center gap-4">
                      {participante.asistencia ? (
                        <span className="text-success flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          Asistió
                        </span>
                      ) : (
                        <span className="text-slate-400 flex items-center gap-1">
                          <XCircle className="w-4 h-4" />
                          No asistió
                        </span>
                      )}
                      {participante.calificacion !== null && (
                        <span className="text-sm text-slate-600">
                          {participante.calificacion}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

  );
}
