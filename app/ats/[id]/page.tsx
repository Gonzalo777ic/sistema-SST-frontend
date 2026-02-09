'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  atsService,
  ATS,
  EstadoATS,
  UpdateAtsDto,
  PersonalInvolucradoDto,
  PasoTrabajoDto,
} from '@/services/ats.service';
import { empresasService } from '@/services/empresas.service';
import { areasService } from '@/services/areas.service';
import { trabajadoresService, Trabajador } from '@/services/trabajadores.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Edit,
  Save,
  X,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  FileText,
  Users,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UsuarioRol } from '@/types';
import Link from 'next/link';

const pasoSchema = z.object({
  numero: z.number().min(1),
  paso_tarea: z.string().min(1, 'El paso de tarea es obligatorio'),
  peligros_riesgos: z.string().min(1, 'Los peligros son obligatorios'),
  medidas_control: z.string().min(1, 'Las medidas de control son obligatorias'),
  responsable: z.string().optional().or(z.literal('')),
});

const personalSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  documento: z.string().min(1, 'El documento es obligatorio'),
  firma_url: z.string().optional(),
});

const atsUpdateSchema = z.object({
  fecha: z.string().min(1, 'La fecha es obligatoria'),
  area_id: z.string().uuid('Debe seleccionar un área'),
  ubicacion: z.string().optional(),
  trabajo_a_realizar: z.string().min(1, 'El trabajo a realizar es obligatorio'),
  hora_inicio: z.string().optional(),
  hora_fin: z.string().optional(),
  herramientas_equipos: z.string().optional(),
  condiciones_climaticas: z.string().optional(),
  observaciones: z.string().optional(),
  epp_requerido: z.array(z.string()).optional(),
  trabajo_altura: z.boolean().optional(),
  trabajo_caliente: z.boolean().optional(),
  espacio_confinado: z.boolean().optional(),
  excavacion: z.boolean().optional(),
  energia_electrica: z.boolean().optional(),
  supervisor_id: z.string().uuid().optional(),
  personal_involucrado: z.array(personalSchema).optional(),
  pasos_trabajo: z.array(pasoSchema).min(1, 'Debe agregar al menos un paso de trabajo'),
});

type AtsUpdateFormData = z.infer<typeof atsUpdateSchema>;

export default function ATSDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { usuario } = useAuth();
  const id = params.id as string;

  const [ats, setAts] = useState<ATS | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [empresas, setEmpresas] = useState<{ id: string; nombre: string }[]>([]);
  const [areas, setAreas] = useState<{ id: string; nombre: string }[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AtsUpdateFormData>({
    resolver: zodResolver(atsUpdateSchema),
  });

  const {
    fields: pasosFields,
    append: appendPaso,
    remove: removePaso,
  } = useFieldArray({
    control,
    name: 'pasos_trabajo',
  });

  const {
    fields: personalFields,
    append: appendPersonal,
    remove: removePersonal,
  } = useFieldArray({
    control,
    name: 'personal_involucrado',
  });

  useEffect(() => {
    if (id) {
      loadAts();
    }
  }, [id]);

  useEffect(() => {
    if (ats?.empresa_id) {
      loadAreas(ats.empresa_id);
      loadTrabajadores(ats.empresa_id);
    }
  }, [ats?.empresa_id]);

  const loadAts = async () => {
    try {
      setIsLoading(true);
      const data = await atsService.findOne(id);
      setAts(data);
      await loadEmpresas();
      
      // Cargar datos del formulario
      reset({
        fecha: data.fecha,
        area_id: data.area_id,
        ubicacion: data.ubicacion || '',
        trabajo_a_realizar: data.trabajo_a_realizar,
        hora_inicio: data.hora_inicio || '',
        hora_fin: data.hora_fin || '',
        herramientas_equipos: data.herramientas_equipos || '',
        condiciones_climaticas: data.condiciones_climaticas || '',
        observaciones: data.observaciones || '',
        epp_requerido: data.epp_requerido || [],
        trabajo_altura: data.trabajo_altura,
        trabajo_caliente: data.trabajo_caliente,
        espacio_confinado: data.espacio_confinado,
        excavacion: data.excavacion,
        energia_electrica: data.energia_electrica,
        supervisor_id: data.supervisor_id || '',
        personal_involucrado: data.personal_involucrado.map((p) => ({
          nombre: p.nombre,
          documento: p.documento,
          firma_url: p.firma_url || '',
        })),
        pasos_trabajo: data.pasos_trabajo.map((p) => ({
          numero: p.numero,
          paso_tarea: p.paso_tarea,
          peligros_riesgos: p.peligros_riesgos,
          medidas_control: p.medidas_control,
          responsable: p.responsable || '',
        })),
      });
    } catch (error: any) {
      toast.error('Error al cargar ATS', {
        description: error.response?.data?.message || 'No se pudo cargar el ATS',
      });
      router.push('/ats');
    } finally {
      setIsLoading(false);
    }
  };

  const loadEmpresas = async () => {
    try {
      const data = await empresasService.findAll();
      setEmpresas(data.filter((e) => e.activo).map((e) => ({ id: e.id, nombre: e.nombre })));
      if (ats) {
        loadAreas(ats.empresa_id);
      }
    } catch (error: any) {
      toast.error('Error al cargar empresas');
    }
  };

  const loadAreas = async (empresaId: string) => {
    try {
      const data = await areasService.findAll(empresaId);
      setAreas(data.filter((a) => a.activo).map((a) => ({ id: a.id, nombre: a.nombre })));
    } catch (error: any) {
      setAreas([]);
    }
  };

  const loadTrabajadores = async (empresaId: string) => {
    try {
      const data = await trabajadoresService.findAll(empresaId);
      setTrabajadores(data.filter((t) => t.estado === 'Activo'));
    } catch (error: any) {
      setTrabajadores([]);
    }
  };

  const buscarTrabajadorPorDNI = (dni: string): Trabajador | undefined => {
    return trabajadores.find((t) => t.documento_identidad === dni);
  };

  const handleDocumentoChange = (index: number, documento: string) => {
    const trabajador = buscarTrabajadorPorDNI(documento);
    if (trabajador) {
      setValue(`personal_involucrado.${index}.nombre`, trabajador.nombre_completo);
      toast.success('Trabajador encontrado', {
        description: `Se cargó: ${trabajador.nombre_completo}`,
      });
    }
  };

  const onSubmit = async (data: AtsUpdateFormData) => {
    if (!ats) return;

    // Validar estado
    if (ats.estado === EstadoATS.Finalizado) {
      toast.error('No se puede editar', {
        description: 'Un ATS en estado Finalizado no puede ser editado',
      });
      return;
    }

    try {
      const payload: UpdateAtsDto = {
        fecha: data.fecha,
        area_id: data.area_id,
        ubicacion: data.ubicacion || undefined,
        trabajo_a_realizar: data.trabajo_a_realizar,
        hora_inicio: data.hora_inicio || undefined,
        hora_fin: data.hora_fin || undefined,
        herramientas_equipos: data.herramientas_equipos || undefined,
        condiciones_climaticas: data.condiciones_climaticas || undefined,
        observaciones: data.observaciones || undefined,
        epp_requerido: data.epp_requerido && data.epp_requerido.length > 0 ? data.epp_requerido : undefined,
        permisos_especiales: {
          trabajo_altura: data.trabajo_altura || false,
          trabajo_caliente: data.trabajo_caliente || false,
          espacio_confinado: data.espacio_confinado || false,
          excavacion: data.excavacion || false,
          energia_electrica: data.energia_electrica || false,
        },
        supervisor_id: data.supervisor_id || undefined,
        personal_involucrado: data.personal_involucrado && data.personal_involucrado.length > 0
          ? data.personal_involucrado
          : undefined,
        pasos_trabajo: data.pasos_trabajo,
      };

      await atsService.update(id, payload);
      toast.success('ATS actualizado exitosamente', {
        description: 'Los cambios han sido guardados',
      });
      setIsEditing(false);
      loadAts();
    } catch (error: any) {
      if (error.response?.status === 400) {
        toast.error('No se puede editar', {
          description: error.response?.data?.message || 'Solo se pueden editar ATS en estado Borrador',
        });
      } else {
        toast.error('Error al actualizar ATS', {
          description: error.response?.data?.message || 'No se pudo actualizar el ATS',
        });
      }
    }
  };

  const canEdit = ats && ats.estado === EstadoATS.Borrador && usuario?.id === ats.elaborado_por_id;

  if (isLoading) {
    return (
      
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      
    );
  }

  if (!ats) {
    return (
      
        <div className="text-center py-12">
          <p className="text-slate-600">ATS no encontrado</p>
        </div>
      
    );
  }

  const getEstadoColor = (estado: EstadoATS) => {
    switch (estado) {
      case EstadoATS.Borrador:
        return 'bg-slate-200 text-slate-700';
      case EstadoATS.Completado:
        return 'bg-warning-light/20 text-warning';
      case EstadoATS.Aprobado:
        return 'bg-success-light/20 text-success';
      case EstadoATS.EnEjecucion:
        return 'bg-primary/20 text-primary';
      case EstadoATS.Finalizado:
        return 'bg-slate-600 text-white';
      default:
        return 'bg-slate-200 text-slate-700';
    }
  };

  return (

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/ats">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">{ats.numero_ats}</h1>
                <p className="text-slate-600 mt-1">
                  {ats.trabajo_a_realizar.substring(0, 60)}
                  {ats.trabajo_a_realizar.length > 60 ? '...' : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 text-sm font-medium rounded ${getEstadoColor(
                  ats.estado,
                )}`}
              >
                {ats.estado}
              </span>
              {canEdit && !isEditing && (
                <Button onClick={() => setIsEditing(true)} variant="outline">
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              )}
            </div>
          </div>

          {ats.estado === EstadoATS.Finalizado && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  ATS Finalizado
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Este ATS está en estado Finalizado y no puede ser editado.
                </p>
              </div>
            </div>
          )}

          {ats.estado !== EstadoATS.Borrador && !isEditing && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">
                  Solo se pueden editar ATS en estado Borrador
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Este ATS está en estado {ats.estado} y solo puede ser visualizado.
                </p>
              </div>
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Formulario de edición - Similar al de creación pero simplificado */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Fecha *
                      </label>
                      <Input {...register('fecha')} type="date" />
                      {errors.fecha && (
                        <p className="mt-1 text-sm text-danger">{errors.fecha.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Área *
                      </label>
                      <Select {...register('area_id')} disabled={!ats?.empresa_id}>
                        <option value="">Seleccione un área</option>
                        {areas.map((area) => (
                          <option key={area.id} value={area.id}>
                            {area.nombre}
                          </option>
                        ))}
                      </Select>
                      {errors.area_id && (
                        <p className="mt-1 text-sm text-danger">{errors.area_id.message}</p>
                      )}
                      {ats?.empresa_id && areas.length === 0 && (
                        <p className="mt-1 text-sm text-slate-500">
                          No hay áreas disponibles. <a href={`/empresas/${ats.empresa_id}/areas`} className="text-primary hover:underline">Crear área</a>
                        </p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Trabajo a Realizar *
                      </label>
                      <textarea
                        {...register('trabajo_a_realizar')}
                        rows={4}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                      {errors.trabajo_a_realizar && (
                        <p className="mt-1 text-sm text-danger">
                          {errors.trabajo_a_realizar.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Pasos de trabajo */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-slate-900">
                        Pasos de Trabajo
                      </h3>
                      <Button
                        type="button"
                        onClick={() =>
                          appendPaso({
                            numero: pasosFields.length + 1,
                            paso_tarea: '',
                            peligros_riesgos: '',
                            medidas_control: '',
                            responsable: '',
                          })
                        }
                        variant="outline"
                        size="sm"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar Paso
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {pasosFields.map((field, index) => (
                        <div
                          key={field.id}
                          className="p-4 border border-slate-200 rounded-lg space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">Paso {index + 1}</span>
                            {pasosFields.length > 1 && (
                              <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                onClick={() => removePaso(index)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="md:col-span-2">
                              <Input
                                {...register(`pasos_trabajo.${index}.paso_tarea`)}
                                placeholder="Paso de tarea *"
                              />
                            </div>
                            <div>
                              <Input
                                {...register(`pasos_trabajo.${index}.peligros_riesgos`)}
                                placeholder="Peligros/Riesgos *"
                              />
                            </div>
                            <div>
                              <Input
                                {...register(`pasos_trabajo.${index}.medidas_control`)}
                                placeholder="Medidas de Control *"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <Input
                                {...register(`pasos_trabajo.${index}.responsable`)}
                                placeholder="Responsable"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Personal involucrado */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-slate-900">
                        Personal Involucrado
                      </h3>
                      <Button
                        type="button"
                        onClick={() => appendPersonal({ nombre: '', documento: '' })}
                        variant="outline"
                        size="sm"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {personalFields.map((field, index) => (
                        <div
                          key={field.id}
                          className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 border border-slate-200 rounded-lg"
                        >
                          <Input
                            {...register(`personal_involucrado.${index}.documento`)}
                            placeholder="DNI"
                            onChange={(e) => handleDocumentoChange(index, e.target.value)}
                          />
                          <Input
                            {...register(`personal_involucrado.${index}.nombre`)}
                            placeholder="Nombre completo"
                          />
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => removePersonal(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    loadAts();
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Guardar Cambios
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6">
              {/* Vista de solo lectura */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-slate-700">Fecha</p>
                  <p className="text-slate-900">
                    {new Date(ats.fecha).toLocaleDateString('es-PE')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Área</p>
                  <p className="text-slate-900">{ats.area || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Ubicación</p>
                  <p className="text-slate-900">{ats.ubicacion || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Elaborado por</p>
                  <p className="text-slate-900">{ats.elaborado_por || 'N/A'}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">
                  Trabajo a Realizar
                </p>
                <p className="text-slate-900 whitespace-pre-wrap">
                  {ats.trabajo_a_realizar}
                </p>
              </div>

              {ats.pasos_trabajo && ats.pasos_trabajo.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Pasos de Trabajo
                  </h3>
                  <div className="space-y-4">
                    {ats.pasos_trabajo.map((paso, index) => (
                      <div
                        key={index}
                        className="p-4 border border-slate-200 rounded-lg"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-semibold">
                            {paso.numero}
                          </div>
                          <div className="flex-1 space-y-2">
                            <p className="font-medium text-slate-900">
                              {paso.paso_tarea}
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="font-medium text-slate-700">
                                  Peligros:
                                </span>{' '}
                                <span className="text-slate-900">
                                  {paso.peligros_riesgos}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium text-slate-700">
                                  Control:
                                </span>{' '}
                                <span className="text-slate-900">
                                  {paso.medidas_control}
                                </span>
                              </div>
                              {paso.responsable && (
                                <div className="md:col-span-2">
                                  <span className="font-medium text-slate-700">
                                    Responsable:
                                  </span>{' '}
                                  <span className="text-slate-900">
                                    {paso.responsable}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {ats.personal_involucrado && ats.personal_involucrado.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Personal Involucrado
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {ats.personal_involucrado.map((personal, index) => (
                      <div
                        key={index}
                        className="p-3 border border-slate-200 rounded-lg"
                      >
                        <p className="font-medium text-slate-900">{personal.nombre}</p>
                        <p className="text-sm text-slate-600">DNI: {personal.documento}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(ats.trabajo_altura ||
                ats.trabajo_caliente ||
                ats.espacio_confinado ||
                ats.excavacion ||
                ats.energia_electrica) && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Permisos Especiales
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {ats.trabajo_altura && (
                      <span className="px-3 py-1 bg-warning-light/20 text-warning rounded text-sm">
                        Trabajo en Altura
                      </span>
                    )}
                    {ats.trabajo_caliente && (
                      <span className="px-3 py-1 bg-danger-light/20 text-danger rounded text-sm">
                        Trabajo Caliente
                      </span>
                    )}
                    {ats.espacio_confinado && (
                      <span className="px-3 py-1 bg-slate-600 text-white rounded text-sm">
                        Espacio Confinado
                      </span>
                    )}
                    {ats.excavacion && (
                      <span className="px-3 py-1 bg-warning-light/20 text-warning rounded text-sm">
                        Excavación
                      </span>
                    )}
                    {ats.energia_electrica && (
                      <span className="px-3 py-1 bg-danger-light/20 text-danger rounded text-sm">
                        Energía Eléctrica
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

  );
}
