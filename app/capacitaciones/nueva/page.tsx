'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  capacitacionesService,
  CreateCapacitacionDto,
  TipoCapacitacion,
  EstadoCapacitacion,
  PreguntaDto,
} from '@/services/capacitaciones.service';
import { trabajadoresService, Trabajador } from '@/services/trabajadores.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { toast } from 'sonner';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UsuarioRol } from '@/types';
import { ArrowLeft, Info, Users, FileText, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const preguntaSchema = z.object({
  texto_pregunta: z.string().min(1, 'El texto de la pregunta es obligatorio'),
  tipo: z.enum(['OpcionMultiple', 'VerdaderoFalso']),
  opciones: z.array(z.string().min(1, 'Cada opción debe tener texto')).min(2, 'Debe tener al menos 2 opciones'),
  respuesta_correcta_index: z.number().min(0),
  puntaje: z.number().min(1, 'El puntaje debe ser al menos 1'),
});

const capacitacionSchema = z.object({
  titulo: z.string().min(1, 'El título es obligatorio'),
  descripcion: z.string().min(1, 'La descripción es obligatoria'),
  lugar: z.string().min(1, 'El lugar es obligatorio'),
  tipo: z.nativeEnum(TipoCapacitacion),
  fecha: z.string().min(1, 'La fecha es obligatoria'),
  hora_inicio: z.string().min(1, 'La hora de inicio es obligatoria'),
  hora_fin: z.string().min(1, 'La hora de fin es obligatoria'),
  duracion_horas: z.number().min(0.5, 'La duración debe ser al menos 0.5 horas'),
  instructor: z.string().optional(),
  instructor_id: z.string().uuid().optional(),
  participantes: z.array(z.object({
    trabajador_id: z.string().uuid(),
    nombre: z.string(),
  })).optional(),
  examen: z.object({
    titulo: z.string().min(1, 'El título del examen es obligatorio'),
    duracion_minutos: z.number().min(1).default(30),
    puntaje_minimo_aprobacion: z.number().min(0).max(100).default(70),
    preguntas: z.array(preguntaSchema).min(1, 'Debe agregar al menos una pregunta'),
  }).optional(),
});

type CapacitacionFormData = z.infer<typeof capacitacionSchema>;

const tabs = [
  { id: 1, label: 'Información', icon: Info },
  { id: 2, label: 'Participantes', icon: Users },
  { id: 3, label: 'Examen', icon: FileText },
];

export default function NuevaCapacitacionPage() {
  const router = useRouter();
  const { usuario } = useAuth();
  const [currentTab, setCurrentTab] = useState(1);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CapacitacionFormData>({
    resolver: zodResolver(capacitacionSchema),
    defaultValues: {
      titulo: '',
      descripcion: '',
      lugar: '',
      tipo: TipoCapacitacion.Induccion,
      fecha: new Date().toISOString().split('T')[0],
      hora_inicio: '09:00',
      hora_fin: '17:00',
      duracion_horas: 8,
      instructor: '',
      participantes: [],
      examen: undefined,
    },
  });

  const {
    fields: participantesFields,
    append: appendParticipante,
    remove: removeParticipante,
  } = useFieldArray({
    control,
    name: 'participantes',
  });

  const {
    fields: preguntasFields,
    append: appendPregunta,
    remove: removePregunta,
  } = useFieldArray({
    control,
    name: 'examen.preguntas',
  });

  const selectedTipo = watch('tipo');
  const examenData = watch('examen');

  useEffect(() => {
    if (usuario?.empresaId) {
      loadTrabajadores();
    }
  }, [usuario?.empresaId]);

  const loadTrabajadores = async () => {
    try {
      if (!usuario?.empresaId) return;
      const data = await trabajadoresService.findAll(usuario.empresaId);
      setTrabajadores(data.filter((t) => t.estado === 'Activo'));
    } catch (error: any) {
      toast.error('Error al cargar trabajadores');
    }
  };

  const addParticipante = (trabajadorId: string) => {
    const trabajador = trabajadores.find((t) => t.id === trabajadorId);
    if (!trabajador) return;

    const yaExiste = participantesFields.some((p) => p.trabajador_id === trabajadorId);
    if (yaExiste) {
      toast.warning('Este trabajador ya está agregado');
      return;
    }

    appendParticipante({
      trabajador_id: trabajadorId,
      nombre: trabajador.nombre_completo,
    });
  };

  const addPregunta = () => {
    appendPregunta({
      texto_pregunta: '',
      tipo: 'OpcionMultiple',
      opciones: ['', ''],
      respuesta_correcta_index: 0,
      puntaje: 1,
    });
  };

  const onSubmit = async (data: CapacitacionFormData) => {
    if (!usuario) return;

    setIsSubmitting(true);
    try {
      const payload: CreateCapacitacionDto = {
        titulo: data.titulo,
        descripcion: data.descripcion,
        lugar: data.lugar,
        tipo: data.tipo,
        fecha: data.fecha,
        hora_inicio: data.hora_inicio,
        hora_fin: data.hora_fin,
        duracion_horas: data.duracion_horas,
        instructor: data.instructor || undefined,
        instructor_id: data.instructor_id || undefined,
        participantes: data.participantes,
        empresa_id: usuario.empresaId!,
        creado_por_id: usuario.id,
      };

      const capacitacion = await capacitacionesService.create(payload);

      // Crear examen si existe
      if (data.examen && data.examen.preguntas.length > 0) {
        await capacitacionesService.crearExamen(capacitacion.id, {
          titulo: data.examen.titulo,
          duracion_minutos: data.examen.duracion_minutos,
          puntaje_minimo_aprobacion: data.examen.puntaje_minimo_aprobacion,
          preguntas: data.examen.preguntas,
        });
      }

      toast.success('Capacitación creada', {
        description: 'La capacitación se ha creado correctamente',
      });
      router.push('/capacitaciones');
    } catch (error: any) {
      toast.error('Error al crear capacitación', {
        description: error.response?.data?.message || 'No se pudo crear la capacitación',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (

        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Link href="/capacitaciones">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Nueva Capacitación</h1>
              <p className="text-slate-600 mt-2">Complete el formulario para crear una nueva capacitación</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="border-b border-slate-200">
              <div className="flex">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setCurrentTab(tab.id)}
                      className={cn(
                        'flex items-center gap-2 px-6 py-4 font-medium text-sm transition-colors',
                        currentTab === tab.id
                          ? 'border-b-2 border-primary text-primary'
                          : 'text-slate-600 hover:text-slate-900',
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6">
              {/* Tab Información */}
              {currentTab === 1 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Título *
                      </label>
                      <Input {...register('titulo')} placeholder="Ej: Inducción General de Seguridad" />
                      {errors.titulo && (
                        <p className="mt-1 text-sm text-danger">{errors.titulo.message}</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Descripción *
                      </label>
                      <textarea
                        {...register('descripcion')}
                        rows={4}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Descripción detallada de la capacitación..."
                      />
                      {errors.descripcion && (
                        <p className="mt-1 text-sm text-danger">{errors.descripcion.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Tipo *
                      </label>
                      <Select {...register('tipo')}>
                        {Object.values(TipoCapacitacion).map((tipo) => (
                          <option key={tipo} value={tipo}>
                            {tipo}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Fecha *
                      </label>
                      <Input type="date" {...register('fecha')} />
                      {errors.fecha && (
                        <p className="mt-1 text-sm text-danger">{errors.fecha.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Hora Inicio *
                      </label>
                      <Input type="time" {...register('hora_inicio')} />
                      {errors.hora_inicio && (
                        <p className="mt-1 text-sm text-danger">{errors.hora_inicio.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Hora Fin *
                      </label>
                      <Input type="time" {...register('hora_fin')} />
                      {errors.hora_fin && (
                        <p className="mt-1 text-sm text-danger">{errors.hora_fin.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Duración (horas) *
                      </label>
                      <Input
                        type="number"
                        step="0.5"
                        min="0.5"
                        {...register('duracion_horas', { valueAsNumber: true })}
                      />
                      {errors.duracion_horas && (
                        <p className="mt-1 text-sm text-danger">{errors.duracion_horas.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Lugar *
                      </label>
                      <Input {...register('lugar')} placeholder="Ej: Sala de Conferencias" />
                      {errors.lugar && (
                        <p className="mt-1 text-sm text-danger">{errors.lugar.message}</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Instructor
                      </label>
                      <Input {...register('instructor')} placeholder="Nombre del instructor" />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Participantes */}
              {currentTab === 2 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Agregar Participante
                    </label>
                    <div className="flex gap-2">
                      <Select
                        onChange={(e) => {
                          if (e.target.value) {
                            addParticipante(e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="flex-1"
                      >
                        <option value="">Seleccione un trabajador</option>
                        {trabajadores
                          .filter(
                            (t) =>
                              !participantesFields.some((p) => p.trabajador_id === t.id),
                          )
                          .map((trabajador) => (
                            <option key={trabajador.id} value={trabajador.id}>
                              {trabajador.nombre_completo} - {trabajador.documento_identidad}
                            </option>
                          ))}
                      </Select>
                    </div>
                  </div>

                  {participantesFields.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-medium text-slate-900">
                        Participantes ({participantesFields.length})
                      </h3>
                      <div className="space-y-2">
                        {participantesFields.map((participante, index) => (
                          <div
                            key={participante.id}
                            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                          >
                            <span className="text-sm text-slate-700">
                              {participante.nombre}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeParticipante(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab Examen */}
              {currentTab === 3 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-slate-900">Configuración del Examen</h3>
                      <p className="text-sm text-slate-600">
                        El examen es opcional. Puede crearlo después si lo desea.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (!examenData) {
                          setValue('examen', {
                            titulo: '',
                            duracion_minutos: 30,
                            puntaje_minimo_aprobacion: 70,
                            preguntas: [],
                          });
                        } else {
                          setValue('examen', undefined);
                        }
                      }}
                    >
                      {examenData ? 'Eliminar Examen' : 'Agregar Examen'}
                    </Button>
                  </div>

                  {examenData && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Título del Examen *
                          </label>
                          <Input {...register('examen.titulo')} />
                          {errors.examen?.titulo && (
                            <p className="mt-1 text-sm text-danger">
                              {errors.examen.titulo.message}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Duración (minutos)
                          </label>
                          <Input
                            type="number"
                            {...register('examen.duracion_minutos', { valueAsNumber: true })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Puntaje Mínimo (%)
                          </label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            {...register('examen.puntaje_minimo_aprobacion', {
                              valueAsNumber: true,
                            })}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium text-slate-900">Preguntas</h4>
                          <Button type="button" onClick={addPregunta} size="sm">
                            <Plus className="w-4 h-4 mr-1" />
                            Agregar Pregunta
                          </Button>
                        </div>

                        <div className="space-y-4">
                          {preguntasFields.map((pregunta, index) => (
                            <div
                              key={pregunta.id}
                              className="p-4 border border-slate-200 rounded-lg space-y-4"
                            >
                              <div className="flex items-start justify-between">
                                <h5 className="font-medium text-slate-900">
                                  Pregunta {index + 1}
                                </h5>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removePregunta(index)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                  Texto de la Pregunta *
                                </label>
                                <textarea
                                  {...register(`examen.preguntas.${index}.texto_pregunta`)}
                                  rows={2}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                />
                                {errors.examen?.preguntas?.[index]?.texto_pregunta && (
                                  <p className="mt-1 text-sm text-danger">
                                    {errors.examen.preguntas[index]?.texto_pregunta?.message}
                                  </p>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Tipo *
                                  </label>
                                  <Select
                                    {...register(`examen.preguntas.${index}.tipo`)}
                                    onChange={(e) => {
                                      const tipo = e.target.value;
                                      if (tipo === 'VerdaderoFalso') {
                                        setValue(`examen.preguntas.${index}.opciones`, [
                                          'Verdadero',
                                          'Falso',
                                        ]);
                                      }
                                    }}
                                  >
                                    <option value="OpcionMultiple">Opción Múltiple</option>
                                    <option value="VerdaderoFalso">Verdadero/Falso</option>
                                  </Select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Puntaje *
                                  </label>
                                  <Input
                                    type="number"
                                    min="1"
                                    {...register(`examen.preguntas.${index}.puntaje`, {
                                      valueAsNumber: true,
                                    })}
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                  Opciones *
                                </label>
                                {watch(`examen.preguntas.${index}.tipo`) === 'VerdaderoFalso' ? (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="radio"
                                        {...register(`examen.preguntas.${index}.respuesta_correcta_index`, {
                                          valueAsNumber: true,
                                        })}
                                        value={0}
                                        className="w-4 h-4"
                                      />
                                      <span>Verdadero</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="radio"
                                        {...register(`examen.preguntas.${index}.respuesta_correcta_index`, {
                                          valueAsNumber: true,
                                        })}
                                        value={1}
                                        className="w-4 h-4"
                                      />
                                      <span>Falso</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {watch(`examen.preguntas.${index}.opciones`)?.map(
                                      (opcion: string, opcionIndex: number) => (
                                        <div key={opcionIndex} className="flex items-center gap-2">
                                          <input
                                            type="radio"
                                            {...register(`examen.preguntas.${index}.respuesta_correcta_index`, {
                                              valueAsNumber: true,
                                            })}
                                            value={opcionIndex}
                                            className="w-4 h-4"
                                          />
                                          <Input
                                            {...register(`examen.preguntas.${index}.opciones.${opcionIndex}`)}
                                            placeholder={`Opción ${opcionIndex + 1}`}
                                          />
                                        </div>
                                      ),
                                    )}
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        const opciones = watch(`examen.preguntas.${index}.opciones`) || [];
                                        setValue(`examen.preguntas.${index}.opciones`, [
                                          ...opciones,
                                          '',
                                        ]);
                                      }}
                                    >
                                      <Plus className="w-4 h-4 mr-1" />
                                      Agregar Opción
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Botones de navegación */}
              <div className="flex justify-between pt-6 border-t border-slate-200 mt-6">
                <div>
                  {currentTab > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentTab(currentTab - 1)}
                    >
                      Anterior
                    </Button>
                  )}
                </div>
                <div className="flex gap-3">
                  {currentTab < tabs.length && (
                    <Button
                      type="button"
                      onClick={() => setCurrentTab(currentTab + 1)}
                    >
                      Siguiente
                    </Button>
                  )}
                  {currentTab === tabs.length && (
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Guardando...' : 'Crear Capacitación'}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>

  );
}
