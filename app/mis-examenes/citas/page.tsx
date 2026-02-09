'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  saludService,
  ExamenMedico,
  HorarioDoctor,
  CitaMedica,
  DiaSemana,
  EstadoCita,
} from '@/services/salud.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, ArrowLeft, Clock, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { UsuarioRol } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AgendarCitaPage() {
  const { usuario } = useAuth();
  const router = useRouter();
  const [examenes, setExamenes] = useState<ExamenMedico[]>([]);
  const [horarios, setHorarios] = useState<HorarioDoctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [examenRelacionadoId, setExamenRelacionadoId] = useState<string>('');
  const [doctorId, setDoctorId] = useState<string>('');
  const [fechaCita, setFechaCita] = useState<string>('');
  const [horaCita, setHoraCita] = useState<string>('');
  const [motivo, setMotivo] = useState<string>('');

  // Computed slots disponibles
  const [slotsDisponibles, setSlotsDisponibles] = useState<string[]>([]);
  const [citasExistentes, setCitasExistentes] = useState<CitaMedica[]>([]);

  useEffect(() => {
    if (usuario?.trabajadorId) {
      loadData();
    }
  }, [usuario?.trabajadorId]);

  useEffect(() => {
    if (doctorId && fechaCita && horarios.length > 0) {
      calcularSlotsDisponibles();
    }
  }, [doctorId, fechaCita, horarios]);

  const loadData = async () => {
    if (!usuario?.trabajadorId || !usuario?.empresaId) return;

    try {
      setIsLoading(true);
      // Si no tienes empresaId directa, el backend debería filtrar por la del trabajador
      const [examenesData, horariosData, citasData] = await Promise.all([
        saludService.findAllExamenes(usuario.trabajadorId),
        saludService.findAllHorarios(undefined, usuario.empresaId || undefined), 
        saludService.findAllCitas(usuario.trabajadorId),
      ]);
      setExamenes(examenesData);
      setHorarios(horariosData);
      setCitasExistentes(citasData);
    } catch (error: any) {
      toast.error('Error al cargar datos', {
        description:
          error.response?.data?.message || 'No se pudieron cargar los datos',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calcularSlotsDisponibles = () => {
    if (!doctorId || !fechaCita) return;

    const fecha = new Date(fechaCita);
    const diaSemana = obtenerDiaSemana(fecha);

    // Filtrar horarios del doctor seleccionado para el día de la semana
    const horariosDelDia = horarios.filter(
      (h) => h.doctor_id === doctorId && h.dia_semana === diaSemana,
    );

    if (horariosDelDia.length === 0) {
      setSlotsDisponibles([]);
      return;
    }

    // Generar slots para cada horario
    const todosLosSlots: string[] = [];
    horariosDelDia.forEach((horario) => {
      const inicio = parseTime(horario.hora_inicio);
      const fin = parseTime(horario.hora_fin);
      const duracion = horario.duracion_cita_minutos;

      let horaActual = inicio;
      while (horaActual + duracion <= fin) {
        const slotHora = formatTime(horaActual);
        todosLosSlots.push(slotHora);
        horaActual += duracion;
      }
    });

    // Filtrar slots ocupados
    const slotsOcupados = citasExistentes
      .filter(
        (c) =>
          c.doctor_id === doctorId &&
          c.fecha_cita === fechaCita &&
          c.estado !== 'Cancelada',
      )
      .map((c) => c.hora_cita);

    const slotsLibres = todosLosSlots.filter(
      (slot) => !slotsOcupados.includes(slot),
    );

    setSlotsDisponibles(slotsLibres.sort());
  };

  const obtenerDiaSemana = (fecha: Date): DiaSemana => {
    const dias: DiaSemana[] = [
      DiaSemana.Domingo,
      DiaSemana.Lunes,
      DiaSemana.Martes,
      DiaSemana.Miercoles,
      DiaSemana.Jueves,
      DiaSemana.Viernes,
      DiaSemana.Sabado,
    ];
    return dias[fecha.getDay()];
  };

  const parseTime = (timeString: string): number => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!usuario?.trabajadorId) {
      toast.error('Error', { description: 'No se pudo identificar al trabajador' });
      return;
    }

    if (!doctorId || !fechaCita || !horaCita || !motivo) {
      toast.error('Error de validación', {
        description: 'Por favor completa todos los campos requeridos',
      });
      return;
    }

    // Validar que la fecha no sea en el pasado
    const fechaSeleccionada = new Date(fechaCita);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (fechaSeleccionada < hoy) {
      toast.error('Error de validación', {
        description: 'No puedes agendar una cita en el pasado',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const horarioSeleccionado = horarios.find((h) => h.doctor_id === doctorId);
      const doctorNombre = horarioSeleccionado?.doctor_nombre || '';

      await saludService.createCita({
        motivo,
        fecha_cita: fechaCita,
        hora_cita: horaCita,
        trabajador_id: usuario.trabajadorId,
        doctor_id: doctorId,
        doctor_nombre: doctorNombre,
        examen_relacionado_id: examenRelacionadoId || undefined,
        duracion_minutos: horarioSeleccionado?.duracion_cita_minutos || 30,
        estado: EstadoCita.Programada,
      });

      toast.success('Cita agendada exitosamente', {
        description: 'Tu cita médica ha sido programada correctamente',
      });

      router.push('/mis-examenes');
    } catch (error: any) {
      toast.error('Error al agendar la cita', {
        description:
          error.response?.data?.message ||
          'No se pudo agendar la cita. Intenta nuevamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Obtener doctores únicos de los horarios
  const doctoresUnicos = Array.from(
    new Map(horarios.map((h) => [h.doctor_id, h])).values(),
  );

  // Fecha mínima (hoy)
  const fechaMinima = new Date().toISOString().split('T')[0];

  return (

        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Link href="/mis-examenes">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Agendar Cita Médica
              </h1>
              <p className="text-slate-600 mt-2">
                Programa una cita de seguimiento con medicina ocupacional
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6">
                {/* Examen Relacionado (Opcional) */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Examen Relacionado (Opcional)
                  </label>
                  <Select
                    value={examenRelacionadoId}
                    onChange={(e) => setExamenRelacionadoId(e.target.value)}
                  >
                    <option value="">Seleccionar examen de seguimiento...</option>
                    {examenes.map((examen) => (
                      <option key={examen.id} value={examen.id}>
                        {examen.tipo_examen} -{' '}
                        {examen.fecha_realizado
                          ? new Date(examen.fecha_realizado).toLocaleDateString(
                              'es-PE',
                            )
                          : 'Programado'}
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">
                    Selecciona un examen si esta cita es para seguimiento
                  </p>
                </div>

                {/* Doctor */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Doctor <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={doctorId}
                    onChange={(e) => {
                      setDoctorId(e.target.value);
                      setHoraCita(''); // Reset hora al cambiar doctor
                    }}
                    required
                  >
                    <option value="">Seleccionar doctor...</option>
                    {doctoresUnicos.map((horario) => (
                      <option key={horario.doctor_id} value={horario.doctor_id}>
                        {horario.doctor_nombre || `Doctor ${horario.doctor_id.slice(0, 8)}`}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Fecha */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Fecha de la Cita <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      type="date"
                      value={fechaCita}
                      onChange={(e) => {
                        setFechaCita(e.target.value);
                        setHoraCita(''); // Reset hora al cambiar fecha
                      }}
                      min={fechaMinima}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Hora */}
                {doctorId && fechaCita && slotsDisponibles.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Hora Disponible <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                      {slotsDisponibles.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setHoraCita(slot)}
                          className={`p-3 rounded-lg border-2 transition-colors ${
                            horaCita === slot
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-slate-200 hover:border-primary/50 text-slate-700'
                          }`}
                        >
                          <Clock className="w-4 h-4 mx-auto mb-1" />
                          <span className="text-sm font-medium">{slot}</span>
                        </button>
                      ))}
                    </div>
                    {slotsDisponibles.length === 0 && (
                      <p className="text-sm text-slate-500 mt-2">
                        No hay horarios disponibles para este día. Selecciona otra fecha.
                      </p>
                    )}
                  </div>
                )}

                {doctorId && fechaCita && slotsDisponibles.length === 0 && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      No hay horarios disponibles para el doctor seleccionado en esta
                      fecha. Por favor selecciona otra fecha o doctor.
                    </p>
                  </div>
                )}

                {/* Motivo */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Motivo de la Cita <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Ej: Seguimiento de examen periódico, Consulta por restricciones..."
                    required
                  />
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex justify-end gap-4">
                <Link href="/mis-examenes">
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                </Link>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Agendando...' : 'Agendar Cita'}
                </Button>
              </div>
            </form>
          )}
        </div>

  );
}
