'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  petarService,
  PETAR,
  TipoTrabajoPETAR,
  EstadoPETAR,
  CreatePetarDto,
  TrabajadorPetarDto,
  PeligroPetarDto,
  CondicionPreviaDto,
  ChecklistVerificacionDto,
} from '@/services/petar.service';
import { trabajadoresService, Trabajador } from '@/services/trabajadores.service';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import SignatureCanvas from '@/components/ui/signature-canvas';
import {
  AlertTriangle,
  Plus,
  Calendar,
  MapPin,
  X,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UsuarioRol } from '@/types';

// EPP comunes predefinidos
const EPP_OPCIONES = [
  'Casco de Seguridad',
  'Lentes de Protección',
  'Protector Auditivo',
  'Mascarilla',
  'Guantes',
  'Botas de Seguridad',
  'Arnés de Seguridad',
  'Chaleco Reflectante',
  'Máscara de Soldadura',
  'Ropa de Protección',
];

const peligroSchema = z.object({
  peligro: z.string().min(1, 'El peligro es obligatorio'),
  riesgo: z.string().min(1, 'El riesgo es obligatorio'),
  nivel_inicial: z.string().min(1, 'El nivel inicial es obligatorio'),
  medida_control: z.string().min(1, 'La medida de control es obligatoria'),
  nivel_residual: z.string().min(1, 'El nivel residual es obligatorio'),
});

const trabajadorSchema = z.object({
  trabajador_id: z.string().uuid().optional().or(z.literal('')),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  documento: z.string().min(1, 'El documento es obligatorio'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
});

const condicionPreviaSchema = z.object({
  condicion: z.string().min(1, 'La condición es obligatoria'),
  verificado: z.boolean(),
});

const checklistSchema = z.object({
  item: z.string().min(1, 'El ítem es obligatorio'),
  cumple: z.boolean(),
  observacion: z.string().optional().or(z.literal('')),
});

const petarSchema = z
  .object({
    tipo_trabajo: z.nativeEnum(TipoTrabajoPETAR),
    descripcion_tarea: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
    area: z.string().min(1, 'El área es obligatoria'),
    fecha_inicio: z.string().min(1, 'La fecha de inicio es obligatoria'),
    fecha_fin: z.string().min(1, 'La fecha de fin es obligatoria'),
    equipos_herramientas: z.string().optional().or(z.literal('')),
    observaciones: z.string().optional().or(z.literal('')),
    epp_requerido: z.array(z.string()).optional(),
    condiciones_previas: z.array(condicionPreviaSchema).optional(),
    checklist_verificacion: z.array(checklistSchema).optional(),
    peligros: z.array(peligroSchema).optional(),
    trabajadores: z.array(trabajadorSchema).optional(),
    firma_supervisor_url: z.string().optional(),
  })
  .refine((data) => new Date(data.fecha_fin) > new Date(data.fecha_inicio), {
    message: 'La fecha de fin debe ser posterior a la fecha de inicio',
    path: ['fecha_fin'],
  });

type PetarFormData = z.infer<typeof petarSchema>;

export default function PetarPage() {
  const { usuario } = useAuth();
  const [petarList, setPetarList] = useState<PETAR[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [trabajadorSearchTerm, setTrabajadorSearchTerm] = useState('');
  const [firmaSupervisor, setFirmaSupervisor] = useState<string>('');

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PetarFormData>({
    resolver: zodResolver(petarSchema),
    defaultValues: {
      tipo_trabajo: TipoTrabajoPETAR.TrabajoAltura,
      descripcion_tarea: '',
      area: '',
      fecha_inicio: new Date().toISOString().slice(0, 16),
      fecha_fin: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      equipos_herramientas: '',
      observaciones: '',
      epp_requerido: [],
      condiciones_previas: [],
      checklist_verificacion: [],
      peligros: [],
      trabajadores: [],
      firma_supervisor_url: '',
    },
  });

  const {
    fields: peligrosFields,
    append: appendPeligro,
    remove: removePeligro,
  } = useFieldArray({
    control,
    name: 'peligros',
  });

  const {
    fields: trabajadoresFields,
    append: appendTrabajador,
    remove: removeTrabajador,
  } = useFieldArray({
    control,
    name: 'trabajadores',
  });

  const {
    fields: condicionesFields,
    append: appendCondicion,
    remove: removeCondicion,
  } = useFieldArray({
    control,
    name: 'condiciones_previas',
  });

  const {
    fields: checklistFields,
    append: appendChecklist,
    remove: removeChecklist,
  } = useFieldArray({
    control,
    name: 'checklist_verificacion',
  });

  const eppSeleccionados = watch('epp_requerido') || [];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (usuario?.empresaId) {
      loadTrabajadores();
    }
  }, [usuario?.empresaId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      await loadPetar();
    } catch (error: any) {
      toast.error('Error al cargar datos', {
        description: error.response?.data?.message || 'No se pudieron cargar los datos',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadPetar = async () => {
    try {
      const empresaId = usuario?.empresaId || undefined;
      const data = await petarService.findAll(empresaId);
      setPetarList(data);
    } catch (error: any) {
      toast.error('Error al cargar PETAR', {
        description:
          error.response?.data?.message || 'No se pudieron cargar los permisos PETAR',
      });
    }
  };

  const loadTrabajadores = async () => {
    try {
      if (!usuario?.empresaId) return;
      const data = await trabajadoresService.findAll(usuario.empresaId);
      setTrabajadores(data);
    } catch (error) {
      console.error('Error al cargar trabajadores:', error);
      setTrabajadores([]);
    }
  };

  const trabajadoresFiltrados = trabajadores.filter(
    (t) =>
      !trabajadoresFields.some((tf) => tf.trabajador_id === t.id) &&
      (t.nombre_completo.toLowerCase().includes(trabajadorSearchTerm.toLowerCase()) ||
        t.documento_identidad.includes(trabajadorSearchTerm)),
  );

  const agregarTrabajador = (trabajador: Trabajador) => {
    appendTrabajador({
      trabajador_id: trabajador.id,
      nombre: trabajador.nombre_completo,
      documento: trabajador.documento_identidad,
      email: trabajador.email_personal || '',
    });
    setTrabajadorSearchTerm('');
  };

  const toggleEPP = (epp: string) => {
    const actual = eppSeleccionados || [];
    if (actual.includes(epp)) {
      setValue(
        'epp_requerido',
        actual.filter((e) => e !== epp),
      );
    } else {
      setValue('epp_requerido', [...actual, epp]);
    }
  };

  const onSubmit = async (data: PetarFormData) => {
    if (!usuario?.id || !usuario?.empresaId) {
      toast.error('Error', {
        description: 'No se pudo identificar al usuario o la empresa',
      });
      return;
    }

    // Si hay firma, actualizar el estado automáticamente
    const estadoFinal = firmaSupervisor
      ? EstadoPETAR.PendienteAprobacion
      : EstadoPETAR.Borrador;

    try {
      const payload: CreatePetarDto = {
        tipo_trabajo: data.tipo_trabajo,
        descripcion_tarea: data.descripcion_tarea,
        area: data.area,
        fecha_inicio: new Date(data.fecha_inicio).toISOString(),
        fecha_fin: new Date(data.fecha_fin).toISOString(),
        equipos_herramientas: data.equipos_herramientas || undefined,
        observaciones: data.observaciones || undefined,
        epp_requerido: data.epp_requerido && data.epp_requerido.length > 0 ? data.epp_requerido : undefined,
        condiciones_previas:
          data.condiciones_previas && data.condiciones_previas.length > 0
            ? data.condiciones_previas
            : undefined,
        checklist_verificacion:
          data.checklist_verificacion && data.checklist_verificacion.length > 0
            ? data.checklist_verificacion
            : undefined,
        peligros: data.peligros && data.peligros.length > 0 ? data.peligros : undefined,
        trabajadores:
          data.trabajadores && data.trabajadores.length > 0 ? data.trabajadores : undefined,
        supervisor_responsable_id: usuario.id,
        empresa_id: usuario.empresaId,
        creado_por_id: usuario.id,
        estado: estadoFinal,
        firma_supervisor_url: firmaSupervisor || undefined,
      };

      await petarService.create(payload);
      toast.success('PETAR creado', {
        description: firmaSupervisor
          ? 'El permiso ha sido creado y enviado para aprobación'
          : 'El permiso ha sido creado como borrador',
      });
      setIsModalOpen(false);
      reset();
      setFirmaSupervisor('');
      loadPetar();
    } catch (error: any) {
      toast.error('Error al crear PETAR', {
        description:
          error.response?.data?.message || 'No se pudo crear el permiso PETAR',
      });
    }
  };

  const getEstadoColor = (estado: EstadoPETAR) => {
    switch (estado) {
      case EstadoPETAR.Borrador:
        return 'bg-slate-200 text-slate-700 border-slate-300';
      case EstadoPETAR.PendienteAprobacion:
        return 'bg-red-100 text-red-800 border-red-200';
      case EstadoPETAR.Aprobado:
        return 'bg-green-100 text-green-800 border-green-200';
      case EstadoPETAR.EnEjecucion:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case EstadoPETAR.Cerrado:
        return 'bg-slate-600 text-white border-slate-700';
      case EstadoPETAR.Anulado:
        return 'bg-gray-400 text-white border-gray-500';
      default:
        return 'bg-slate-200 text-slate-700 border-slate-300';
    }
  };

  const filteredPetar = petarList.filter((petar) => {
    const matchesSearch =
      !searchTerm ||
      petar.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      petar.descripcion_tarea.toLowerCase().includes(searchTerm.toLowerCase()) ||
      petar.area.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

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
        <div className="space-y-6 w-full">
          {/* Cabecera */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-slate-900 mt-0">
                Gestión de PETAR
              </h1>
              <p className="text-slate-600 mt-2">
                Permisos Escritos de Trabajo de Alto Riesgo
              </p>
            </div>
            <div className="flex-shrink-0">
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="w-5 h-5 mr-2" />
                Nuevo PETAR
              </Button>
            </div>
          </div>

          {/* Búsqueda */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="relative">
              <Input
                placeholder="Buscar por código, descripción o área..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Listado de PETAR */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              <>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-48 w-full" />
                ))}
              </>
            ) : filteredPetar.length === 0 ? (
              <div className="col-span-full p-12 text-center bg-white rounded-lg shadow-sm border border-slate-200">
                <AlertTriangle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">No hay permisos PETAR registrados</p>
              </div>
            ) : (
              filteredPetar.map((petar) => (
                <div
                  key={petar.id}
                  className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-slate-900 mb-1">
                        {petar.codigo}
                      </h3>
                      <p className="text-sm text-slate-600 mb-2">
                        {petar.tipo_trabajo}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded border flex-shrink-0 ${getEstadoColor(
                        petar.estado,
                      )}`}
                    >
                      {petar.estado}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-slate-600 mb-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{petar.area}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(petar.fecha_inicio).toLocaleDateString('es-PE', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}{' '}
                        -{' '}
                        {new Date(petar.fecha_fin).toLocaleDateString('es-PE', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-slate-700 line-clamp-2">
                    {petar.descripcion_tarea}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Modal de Creación */}
          <Modal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              reset();
              setFirmaSupervisor('');
            }}
            title="Nuevo PETAR"
            size="xl"
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Sección: Datos Generales */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
                  Datos Generales
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Tipo de Trabajo <span className="text-red-500">*</span>
                    </label>
                    <Select {...register('tipo_trabajo')}>
                      {Object.values(TipoTrabajoPETAR).map((tipo) => (
                        <option key={tipo} value={tipo}>
                          {tipo}
                        </option>
                      ))}
                    </Select>
                    {errors.tipo_trabajo && (
                      <p className="mt-1 text-sm text-danger">
                        {errors.tipo_trabajo.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Área <span className="text-red-500">*</span>
                    </label>
                    <Input {...register('area')} placeholder="Ej: Planta de Producción" />
                    {errors.area && (
                      <p className="mt-1 text-sm text-danger">{errors.area.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Fecha y Hora de Inicio <span className="text-red-500">*</span>
                    </label>
                    <Input type="datetime-local" {...register('fecha_inicio')} />
                    {errors.fecha_inicio && (
                      <p className="mt-1 text-sm text-danger">
                        {errors.fecha_inicio.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Fecha y Hora de Fin <span className="text-red-500">*</span>
                    </label>
                    <Input type="datetime-local" {...register('fecha_fin')} />
                    {errors.fecha_fin && (
                      <p className="mt-1 text-danger text-sm">
                        {errors.fecha_fin.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Descripción de la Tarea <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    {...register('descripcion_tarea')}
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Describe detalladamente la tarea a realizar..."
                  />
                  {errors.descripcion_tarea && (
                    <p className="mt-1 text-sm text-danger">
                      {errors.descripcion_tarea.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Equipos y Herramientas
                  </label>
                  <textarea
                    {...register('equipos_herramientas')}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Lista de equipos y herramientas necesarias..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Observaciones
                  </label>
                  <textarea
                    {...register('observaciones')}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Observaciones adicionales..."
                  />
                </div>
              </div>

              {/* Sección: Trabajadores */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
                  Trabajadores Involucrados
                </h3>
                <div className="space-y-2">
                  <Input
                    placeholder="Buscar trabajador por nombre o documento..."
                    value={trabajadorSearchTerm}
                    onChange={(e) => setTrabajadorSearchTerm(e.target.value)}
                  />
                  {trabajadorSearchTerm && trabajadoresFiltrados.length > 0 && (
                    <div className="border border-slate-200 rounded-lg max-h-40 overflow-y-auto">
                      {trabajadoresFiltrados.map((trabajador) => (
                        <button
                          key={trabajador.id}
                          type="button"
                          onClick={() => agregarTrabajador(trabajador)}
                          className="w-full text-left px-4 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                        >
                          <div className="font-medium text-slate-900">
                            {trabajador.nombre_completo}
                          </div>
                          <div className="text-sm text-slate-600">
                            {trabajador.documento_identidad}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {trabajadoresFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">
                          {watch(`trabajadores.${index}.nombre`)}
                        </div>
                        <div className="text-sm text-slate-600">
                          {watch(`trabajadores.${index}.documento`)}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeTrabajador(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <input
                        type="hidden"
                        {...register(`trabajadores.${index}.trabajador_id`)}
                      />
                      <input
                        type="hidden"
                        {...register(`trabajadores.${index}.nombre`)}
                      />
                      <input
                        type="hidden"
                        {...register(`trabajadores.${index}.documento`)}
                      />
                      <input
                        type="hidden"
                        {...register(`trabajadores.${index}.email`)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Sección: Peligros */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2 flex-1">
                    Peligros y Riesgos
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      appendPeligro({
                        peligro: '',
                        riesgo: '',
                        nivel_inicial: '',
                        medida_control: '',
                        nivel_residual: '',
                      })
                    }
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Agregar Peligro
                  </Button>
                </div>

                <div className="space-y-4">
                  {peligrosFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="p-4 border border-slate-200 rounded-lg space-y-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">
                          Peligro {index + 1}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removePeligro(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Peligro
                          </label>
                          <Input
                            {...register(`peligros.${index}.peligro`)}
                            placeholder="Ej: Caída de altura"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Riesgo
                          </label>
                          <Input
                            {...register(`peligros.${index}.riesgo`)}
                            placeholder="Ej: Muerte o lesiones graves"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Nivel Inicial
                          </label>
                          <Input
                            {...register(`peligros.${index}.nivel_inicial`)}
                            placeholder="Ej: Alto"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Medida de Control
                          </label>
                          <Input
                            {...register(`peligros.${index}.medida_control`)}
                            placeholder="Ej: Arnés de seguridad"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Nivel Residual
                          </label>
                          <Input
                            {...register(`peligros.${index}.nivel_residual`)}
                            placeholder="Ej: Bajo"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sección: EPP Requerido */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
                  EPP Requerido
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {EPP_OPCIONES.map((epp) => (
                    <label
                      key={epp}
                      className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={eppSeleccionados.includes(epp)}
                        onChange={() => toggleEPP(epp)}
                        className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-slate-700">{epp}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Sección: Condiciones Previas */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2 flex-1">
                    Condiciones Previas
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      appendCondicion({
                        condicion: '',
                        verificado: false,
                      })
                    }
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Agregar Condición
                  </Button>
                </div>

                <div className="space-y-2">
                  {condicionesFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg"
                    >
                      <input
                        type="checkbox"
                        {...register(`condiciones_previas.${index}.verificado`)}
                        className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      <Input
                        {...register(`condiciones_previas.${index}.condicion`)}
                        placeholder="Ej: Bloqueo y etiquetado realizado"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeCondicion(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sección: Checklist de Verificación */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2 flex-1">
                    Checklist de Verificación
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      appendChecklist({
                        item: '',
                        cumple: false,
                        observacion: '',
                      })
                    }
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Agregar Ítem
                  </Button>
                </div>

                <div className="space-y-3">
                  {checklistFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="p-4 border border-slate-200 rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">
                          Ítem {index + 1}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeChecklist(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <Input
                        {...register(`checklist_verificacion.${index}.item`)}
                        placeholder="Descripción del ítem"
                      />
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            {...register(`checklist_verificacion.${index}.cumple`)}
                            className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                          />
                          Cumple
                        </label>
                      </div>
                      <Input
                        {...register(`checklist_verificacion.${index}.observacion`)}
                        placeholder="Observación (opcional)"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Sección: Firma del Supervisor */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
                  Firma del Supervisor
                </h3>
                <p className="text-sm text-slate-600">
                  Al firmar, el estado cambiará automáticamente a &quot;Pendiente de Aprobación&quot;
                </p>
                <SignatureCanvas
                  onSave={(dataUrl) => setFirmaSupervisor(dataUrl)}
                  initialValue={firmaSupervisor}
                />
              </div>

              {/* Botones de Acción */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsModalOpen(false);
                    reset();
                    setFirmaSupervisor('');
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Guardando...' : 'Guardar PETAR'}
                </Button>
              </div>
            </form>
          </Modal>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
