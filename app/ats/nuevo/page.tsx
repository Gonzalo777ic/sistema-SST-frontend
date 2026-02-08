'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  atsService,
  CreateAtsDto,
  EstadoATS,
  PersonalInvolucradoDto,
  PasoTrabajoDto,
} from '@/services/ats.service';
import { empresasService } from '@/services/empresas.service';
import { areasService } from '@/services/areas.service';
import { trabajadoresService, Trabajador } from '@/services/trabajadores.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import {
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  FileText,
  Users,
  Shield,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UsuarioRol } from '@/types';
import { cn } from '@/lib/utils';

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

const atsSchema = z.object({
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
  empresa_id: z.string().uuid('Debe seleccionar una empresa'),
  supervisor_id: z.string().uuid().optional(),
  personal_involucrado: z.array(personalSchema).optional(),
  pasos_trabajo: z.array(pasoSchema).min(1, 'Debe agregar al menos un paso de trabajo'),
});

type AtsFormData = z.infer<typeof atsSchema>;

const steps = [
  { id: 1, label: 'Datos Generales', icon: FileText },
  { id: 2, label: 'Análisis de Riesgos', icon: AlertCircle },
  { id: 3, label: 'Personal Involucrado', icon: Users },
  { id: 4, label: 'Permisos Especiales', icon: Shield },
];

export default function NuevoATSPage() {
  const router = useRouter();
  const { usuario } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [empresas, setEmpresas] = useState<{ id: string; nombre: string }[]>([]);
  const [areas, setAreas] = useState<{ id: string; nombre: string }[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AtsFormData>({
    resolver: zodResolver(atsSchema),
    defaultValues: {
      fecha: new Date().toISOString().split('T')[0],
      area_id: '',
      ubicacion: '',
      trabajo_a_realizar: '',
      hora_inicio: '',
      hora_fin: '',
      herramientas_equipos: '',
      condiciones_climaticas: '',
      observaciones: '',
      epp_requerido: [],
      trabajo_altura: false,
      trabajo_caliente: false,
      espacio_confinado: false,
      excavacion: false,
      energia_electrica: false,
      empresa_id: usuario?.empresaId || '',
      supervisor_id: '',
      personal_involucrado: [],
      pasos_trabajo: [{ numero: 1, paso_tarea: '', peligros_riesgos: '', medidas_control: '', responsable: '' }],
    },
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

  const selectedEmpresaId = watch('empresa_id');
  const selectedAreaId = watch('area_id');

  useEffect(() => {
    loadEmpresas();
  }, []);

  useEffect(() => {
    if (selectedEmpresaId) {
      loadAreas(selectedEmpresaId);
      loadTrabajadores(selectedEmpresaId);
    }
  }, [selectedEmpresaId]);

  const loadEmpresas = async () => {
    try {
      const data = await empresasService.findAll();
      setEmpresas(data.filter((e) => e.activo).map((e) => ({ id: e.id, nombre: e.nombre })));
    } catch (error: any) {
      toast.error('Error al cargar empresas');
    }
  };

  const loadAreas = async (empresaId: string) => {
    try {
      const data = await areasService.findAll(empresaId);
      setAreas(data.filter((a) => a.activo).map((a) => ({ id: a.id, nombre: a.nombre })));
      // Limpiar área seleccionada si cambia la empresa
      setValue('area_id', '');
    } catch (error: any) {
      setAreas([]);
      setValue('area_id', '');
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

  const addPaso = () => {
    const nextNumero = pasosFields.length + 1;
    appendPaso({
      numero: nextNumero,
      paso_tarea: '',
      peligros_riesgos: '',
      medidas_control: '',
      responsable: '',
    });
  };

  const removePasoWithReorder = (index: number) => {
    removePaso(index);
    // Reordenar números
    const currentPasos = watch('pasos_trabajo');
    currentPasos.forEach((paso, idx) => {
      setValue(`pasos_trabajo.${idx}.numero`, idx + 1);
    });
  };

  const onSubmit = async (data: AtsFormData) => {
    if (!usuario) return;

    setIsSubmitting(true);
    try {
      const payload: CreateAtsDto = {
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
        empresa_id: data.empresa_id,
        elaborado_por_id: usuario.id,
        supervisor_id: data.supervisor_id || undefined,
        personal_involucrado: data.personal_involucrado && data.personal_involucrado.length > 0
          ? data.personal_involucrado
          : undefined,
        pasos_trabajo: data.pasos_trabajo.map((paso) => ({
          numero: paso.numero,
          paso_tarea: paso.paso_tarea,
          peligros_riesgos: paso.peligros_riesgos,
          medidas_control: paso.medidas_control,
          responsable: paso.responsable || undefined,
        })),
        estado: EstadoATS.Borrador,
      };

      await atsService.create(payload);
      toast.success('ATS creado exitosamente', {
        description: 'El análisis de trabajo seguro ha sido registrado',
      });
      router.push('/ats');
    } catch (error: any) {
      toast.error('Error al crear ATS', {
        description: error.response?.data?.message || 'No se pudo crear el ATS',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">
              Datos Generales
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Empresa *
                </label>
                <Select {...register('empresa_id')}>
                  <option value="">Seleccione una empresa</option>
                  {empresas.map((empresa) => (
                    <option key={empresa.id} value={empresa.id}>
                      {empresa.nombre}
                    </option>
                  ))}
                </Select>
                {errors.empresa_id && (
                  <p className="mt-1 text-sm text-danger">{errors.empresa_id.message}</p>
                )}
              </div>

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
                <Select {...register('area_id')} disabled={!selectedEmpresaId}>
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
                {selectedEmpresaId && areas.length === 0 && (
                  <p className="mt-1 text-sm text-slate-500">
                    No hay áreas disponibles. <a href={`/empresas/${selectedEmpresaId}/areas`} className="text-primary hover:underline">Crear área</a>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Ubicación
                </label>
                <Input {...register('ubicacion')} placeholder="Ej: Planta 2, Sector A" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Trabajo a Realizar *
                </label>
                <textarea
                  {...register('trabajo_a_realizar')}
                  rows={4}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Describa el trabajo a realizar..."
                />
                {errors.trabajo_a_realizar && (
                  <p className="mt-1 text-sm text-danger">
                    {errors.trabajo_a_realizar.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Hora Inicio
                </label>
                <Input {...register('hora_inicio')} type="time" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Hora Fin
                </label>
                <Input {...register('hora_fin')} type="time" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Herramientas y Equipos
                </label>
                <textarea
                  {...register('herramientas_equipos')}
                  rows={3}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Liste las herramientas y equipos necesarios..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Condiciones Climáticas
                </label>
                <Input
                  {...register('condiciones_climaticas')}
                  placeholder="Ej: Soleado, viento moderado"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Observaciones
                </label>
                <textarea
                  {...register('observaciones')}
                  rows={3}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Observaciones adicionales..."
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-900">
                Análisis de Riesgos - Pasos de Trabajo
              </h3>
              <Button type="button" onClick={addPaso} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Agregar Paso
              </Button>
            </div>

            {pasosFields.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>No hay pasos agregados. Agregue al menos un paso de trabajo.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Vista Desktop - Tabla */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left p-2 text-sm font-medium text-slate-700">
                          #
                        </th>
                        <th className="text-left p-2 text-sm font-medium text-slate-700">
                          Paso de Tarea *
                        </th>
                        <th className="text-left p-2 text-sm font-medium text-slate-700">
                          Peligros/Riesgos *
                        </th>
                        <th className="text-left p-2 text-sm font-medium text-slate-700">
                          Medidas de Control *
                        </th>
                        <th className="text-left p-2 text-sm font-medium text-slate-700">
                          Responsable
                        </th>
                        <th className="w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {pasosFields.map((field, index) => (
                        <tr key={field.id} className="border-b border-slate-100">
                          <td className="p-2">
                            <span className="font-medium">{index + 1}</span>
                          </td>
                          <td className="p-2">
                            <Input
                              {...register(`pasos_trabajo.${index}.paso_tarea`)}
                              placeholder="Descripción del paso"
                              className="text-sm"
                            />
                            {errors.pasos_trabajo?.[index]?.paso_tarea && (
                              <p className="mt-1 text-xs text-danger">
                                {errors.pasos_trabajo[index]?.paso_tarea?.message}
                              </p>
                            )}
                          </td>
                          <td className="p-2">
                            <Input
                              {...register(`pasos_trabajo.${index}.peligros_riesgos`)}
                              placeholder="Peligros identificados"
                              className="text-sm"
                            />
                            {errors.pasos_trabajo?.[index]?.peligros_riesgos && (
                              <p className="mt-1 text-xs text-danger">
                                {errors.pasos_trabajo[index]?.peligros_riesgos?.message}
                              </p>
                            )}
                          </td>
                          <td className="p-2">
                            <Input
                              {...register(`pasos_trabajo.${index}.medidas_control`)}
                              placeholder="Medidas de control"
                              className="text-sm"
                            />
                            {errors.pasos_trabajo?.[index]?.medidas_control && (
                              <p className="mt-1 text-xs text-danger">
                                {errors.pasos_trabajo[index]?.medidas_control?.message}
                              </p>
                            )}
                          </td>
                          <td className="p-2">
                            <Input
                              {...register(`pasos_trabajo.${index}.responsable`)}
                              placeholder="Responsable"
                              className="text-sm"
                            />
                          </td>
                          <td className="p-2">
                            {pasosFields.length > 1 && (
                              <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                onClick={() => removePasoWithReorder(index)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Vista Mobile - Cards */}
                <div className="md:hidden space-y-4">
                  {pasosFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="p-4 border border-slate-200 rounded-lg space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">
                          Paso {index + 1}
                        </span>
                        {pasosFields.length > 1 && (
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => removePasoWithReorder(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Paso de Tarea *
                        </label>
                        <Input
                          {...register(`pasos_trabajo.${index}.paso_tarea`)}
                          placeholder="Descripción del paso"
                        />
                        {errors.pasos_trabajo?.[index]?.paso_tarea && (
                          <p className="mt-1 text-xs text-danger">
                            {errors.pasos_trabajo[index]?.paso_tarea?.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Peligros/Riesgos *
                        </label>
                        <Input
                          {...register(`pasos_trabajo.${index}.peligros_riesgos`)}
                          placeholder="Peligros identificados"
                        />
                        {errors.pasos_trabajo?.[index]?.peligros_riesgos && (
                          <p className="mt-1 text-xs text-danger">
                            {errors.pasos_trabajo[index]?.peligros_riesgos?.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Medidas de Control *
                        </label>
                        <Input
                          {...register(`pasos_trabajo.${index}.medidas_control`)}
                          placeholder="Medidas de control"
                        />
                        {errors.pasos_trabajo?.[index]?.medidas_control && (
                          <p className="mt-1 text-xs text-danger">
                            {errors.pasos_trabajo[index]?.medidas_control?.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Responsable
                        </label>
                        <Input
                          {...register(`pasos_trabajo.${index}.responsable`)}
                          placeholder="Responsable"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {errors.pasos_trabajo && (
                  <p className="text-sm text-danger">
                    {errors.pasos_trabajo.message}
                  </p>
                )}
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-900">
                Personal Involucrado
              </h3>
              <Button
                type="button"
                onClick={() => appendPersonal({ nombre: '', documento: '' })}
                variant="outline"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Personal
              </Button>
            </div>

            {personalFields.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>No hay personal agregado. Puede agregar personal opcionalmente.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {personalFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="p-4 border border-slate-200 rounded-lg grid grid-cols-1 md:grid-cols-3 gap-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        DNI *
                      </label>
                      <Input
                        {...register(`personal_involucrado.${index}.documento`)}
                        placeholder="12345678"
                        onChange={(e) => handleDocumentoChange(index, e.target.value)}
                      />
                      {errors.personal_involucrado?.[index]?.documento && (
                        <p className="mt-1 text-xs text-danger">
                          {errors.personal_involucrado[index]?.documento?.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Nombre Completo *
                      </label>
                      <Input
                        {...register(`personal_involucrado.${index}.nombre`)}
                        placeholder="Nombre completo"
                      />
                      {errors.personal_involucrado?.[index]?.nombre && (
                        <p className="mt-1 text-xs text-danger">
                          {errors.personal_involucrado[index]?.nombre?.message}
                        </p>
                      )}
                    </div>

                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => removePersonal(index)}
                        className="w-full md:w-auto"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">
              Permisos Especiales y EPP
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  EPP Requerido
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    'Casco',
                    'Lentes de Seguridad',
                    'Botas de Seguridad',
                    'Chaleco Reflectivo',
                    'Guantes',
                    'Arnés',
                    'Respirador',
                    'Protección Auditiva',
                  ].map((epp) => {
                    const eppList = watch('epp_requerido') || [];
                    const isSelected = eppList.includes(epp);
                    return (
                      <label
                        key={epp}
                        className="flex items-center gap-2 p-3 border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const current = watch('epp_requerido') || [];
                            if (e.target.checked) {
                              setValue('epp_requerido', [...current, epp]);
                            } else {
                              setValue(
                                'epp_requerido',
                                current.filter((item) => item !== epp),
                              );
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-slate-700">{epp}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Permisos Especiales
                </label>
                <div className="space-y-2 border border-slate-200 rounded-md p-4">
                  {[
                    { key: 'trabajo_altura', label: 'Trabajo en Altura' },
                    { key: 'trabajo_caliente', label: 'Trabajo Caliente' },
                    { key: 'espacio_confinado', label: 'Espacio Confinado' },
                    { key: 'excavacion', label: 'Excavación' },
                    { key: 'energia_electrica', label: 'Energía Eléctrica' },
                  ].map((permiso) => (
                    <label
                      key={permiso.key}
                      className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        {...register(permiso.key as any)}
                        className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-slate-700">{permiso.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Supervisor
                </label>
                <Select {...register('supervisor_id')}>
                  <option value="">Sin asignar</option>
                  {trabajadores
                    .filter((t) => t.usuario_id)
                    .map((trabajador) => (
                      <option key={trabajador.id} value={trabajador.usuario_id || ''}>
                        {trabajador.nombre_completo}
                      </option>
                    ))}
                </Select>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderSummary = () => {
    const formData = watch();
    return (
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-slate-900 mb-4">
          Resumen del ATS
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-slate-700">Empresa</p>
              <p className="text-slate-900">
                {empresas.find((e) => e.id === formData.empresa_id)?.nombre || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">Fecha</p>
              <p className="text-slate-900">
                {new Date(formData.fecha).toLocaleDateString('es-PE')}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">Área</p>
              <p className="text-slate-900">
                {areas.find((a) => a.id === formData.area_id)?.nombre || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">Ubicación</p>
              <p className="text-slate-900">{formData.ubicacion || 'N/A'}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">
              Trabajo a Realizar
            </p>
            <p className="text-slate-900">{formData.trabajo_a_realizar}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">
              Pasos de Trabajo ({formData.pasos_trabajo?.length || 0})
            </p>
            <div className="space-y-2">
              {formData.pasos_trabajo?.map((paso, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-md">
                  <p className="font-medium text-slate-900">
                    Paso {paso.numero}: {paso.paso_tarea}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    <span className="font-medium">Peligros:</span> {paso.peligros_riesgos}
                  </p>
                  <p className="text-sm text-slate-600">
                    <span className="font-medium">Control:</span> {paso.medidas_control}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {formData.personal_involucrado && formData.personal_involucrado.length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">
                Personal Involucrado ({formData.personal_involucrado.length})
              </p>
              <ul className="list-disc list-inside space-y-1">
                {formData.personal_involucrado.map((p, idx) => (
                  <li key={idx} className="text-slate-900">
                    {p.nombre} - DNI: {p.documento}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Permisos Especiales</p>
            <div className="flex flex-wrap gap-2">
              {formData.trabajo_altura && (
                <span className="px-2 py-1 bg-warning-light/20 text-warning rounded text-xs">
                  Trabajo en Altura
                </span>
              )}
              {formData.trabajo_caliente && (
                <span className="px-2 py-1 bg-danger-light/20 text-danger rounded text-xs">
                  Trabajo Caliente
                </span>
              )}
              {formData.espacio_confinado && (
                <span className="px-2 py-1 bg-slate-600 text-white rounded text-xs">
                  Espacio Confinado
                </span>
              )}
              {formData.excavacion && (
                <span className="px-2 py-1 bg-warning-light/20 text-warning rounded text-xs">
                  Excavación
                </span>
              )}
              {formData.energia_electrica && (
                <span className="px-2 py-1 bg-danger-light/20 text-danger rounded text-xs">
                  Energía Eléctrica
                </span>
              )}
              {!formData.trabajo_altura &&
                !formData.trabajo_caliente &&
                !formData.espacio_confinado &&
                !formData.excavacion &&
                !formData.energia_electrica && (
                  <span className="text-slate-500 text-sm">Ninguno</span>
                )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <ProtectedRoute
      allowedRoles={[
        UsuarioRol.SUPER_ADMIN,
        UsuarioRol.ADMIN_EMPRESA,
        UsuarioRol.INGENIERO_SST,
        UsuarioRol.SUPERVISOR,
      ]}
    >
      <MainLayout>
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900">Nuevo ATS</h1>
            <p className="text-slate-600 mt-2">
              Complete el análisis de trabajo seguro paso a paso
            </p>
          </div>

          {/* Stepper */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const StepIcon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;

                return (
                  <div key={step.id} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors',
                          isActive
                            ? 'bg-primary border-primary text-white'
                            : isCompleted
                              ? 'bg-success border-success text-white'
                              : 'bg-white border-slate-300 text-slate-400',
                        )}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <StepIcon className="w-5 h-5" />
                        )}
                      </div>
                      <span
                        className={cn(
                          'mt-2 text-xs font-medium text-center',
                          isActive ? 'text-primary' : 'text-slate-500',
                        )}
                      >
                        {step.label}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={cn(
                          'h-0.5 flex-1 mx-2',
                          currentStep > step.id ? 'bg-success' : 'bg-slate-200',
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
              {showSummary ? renderSummary() : renderStepContent()}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between">
              <div>
                {currentStep > 1 && (
                  <Button type="button" variant="outline" onClick={prevStep}>
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Anterior
                  </Button>
                )}
              </div>

              <div className="flex gap-3">
                {currentStep < steps.length ? (
                  <>
                    {currentStep === steps.length && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowSummary(!showSummary)}
                      >
                        {showSummary ? 'Ocultar Resumen' : 'Ver Resumen'}
                      </Button>
                    )}
                    <Button type="button" onClick={nextStep}>
                      Siguiente
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowSummary(!showSummary)}
                    >
                      {showSummary ? 'Ocultar Resumen' : 'Ver Resumen'}
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Guardando...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Crear ATS
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </form>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
