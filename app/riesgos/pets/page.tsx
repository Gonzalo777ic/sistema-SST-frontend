'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  petsService,
  PETS,
  EstadoPETS,
  CreatePetsDto,
  PasoDto,
  EquipoMaterialDto,
  RequisitosPreviosDto,
} from '@/services/pets.service';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ClipboardList,
  Plus,
  ChevronRight,
  ChevronLeft,
  X,
  Trash2,
  CheckCircle2,
  FileText,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UsuarioRol } from '@/types';
import Link from 'next/link';

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

const pasoSchema = z.object({
  numero: z.number().int().min(1),
  descripcion: z.string().min(1, 'La descripción es obligatoria'),
  peligros: z.string().optional().or(z.literal('')),
  medidas_control: z.string().optional().or(z.literal('')),
  epp_requerido: z.array(z.string()).optional(),
});

const equipoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  tipo: z.string().min(1, 'El tipo es obligatorio'),
  obligatorio: z.boolean(),
});

const petsSchema = z.object({
  codigo: z.string().min(1, 'El código es obligatorio'),
  titulo: z.string().min(1, 'El título es obligatorio'),
  objetivo: z.string().min(10, 'El objetivo debe tener al menos 10 caracteres'),
  alcance: z.string().min(10, 'El alcance debe tener al menos 10 caracteres'),
  definiciones: z.string().optional().or(z.literal('')),
  area_proceso: z.string().optional().or(z.literal('')),
  referencias_normativas: z.array(z.string()).optional(),
  equipos_materiales: z.array(equipoSchema).optional(),
  requisitos_previos: z
    .object({
      competencias: z.array(z.string()).optional(),
      herramientas: z.array(z.string()).optional(),
      permisos_asociados: z.array(z.string()).optional(),
    })
    .optional(),
  fecha_emision: z.string().min(1, 'La fecha de emisión es obligatoria'),
  fecha_revision: z.string().optional().or(z.literal('')),
  pasos: z.array(pasoSchema).min(1, 'Debe haber al menos un paso'),
});

type PetsFormData = z.infer<typeof petsSchema>;

const STEPS = [
  { id: 1, label: 'General', icon: FileText },
  { id: 2, label: 'Requisitos', icon: CheckCircle2 },
  { id: 3, label: 'Equipos', icon: ClipboardList },
  { id: 4, label: 'Desarrollo', icon: FileText },
  { id: 5, label: 'Anexos', icon: FileText },
];

export default function PetsPage() {
  const { usuario, hasRole } = useAuth();
  const [petsList, setPetsList] = useState<PETS[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedPets, setSelectedPets] = useState<PETS | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedEstado, setSelectedEstado] = useState<string>('');
  const [referenciaInput, setReferenciaInput] = useState('');
  const [competenciaInput, setCompetenciaInput] = useState('');
  const [herramientaInput, setHerramientaInput] = useState('');
  const [permisoInput, setPermisoInput] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PetsFormData>({
    resolver: zodResolver(petsSchema),
    defaultValues: {
      codigo: '',
      titulo: '',
      objetivo: '',
      alcance: '',
      definiciones: '',
      area_proceso: '',
      referencias_normativas: [],
      equipos_materiales: [],
      requisitos_previos: {
        competencias: [],
        herramientas: [],
        permisos_asociados: [],
      },
      fecha_emision: new Date().toISOString().split('T')[0],
      fecha_revision: '',
      pasos: [],
    },
  });

  const {
    fields: pasosFields,
    append: appendPaso,
    remove: removePaso,
  } = useFieldArray({
    control,
    name: 'pasos',
  });

  const {
    fields: equiposFields,
    append: appendEquipo,
    remove: removeEquipo,
  } = useFieldArray({
    control,
    name: 'equipos_materiales',
  });

  const referenciasNormativas = watch('referencias_normativas') || [];
  const requisitosPrevios = watch('requisitos_previos') || {
    competencias: [],
    herramientas: [],
    permisos_asociados: [],
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadPets();
  }, [selectedEstado]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      await loadPets();
    } catch (error: any) {
      toast.error('Error al cargar datos', {
        description: error.response?.data?.message || 'No se pudieron cargar los datos',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadPets = async () => {
    try {
      const empresaId = usuario?.empresaId || undefined;
      const estado = selectedEstado ? (selectedEstado as EstadoPETS) : undefined;
      const data = await petsService.findAll(empresaId, estado);
      setPetsList(data);
    } catch (error: any) {
      toast.error('Error al cargar PETS', {
        description:
          error.response?.data?.message || 'No se pudieron cargar los procedimientos',
      });
    }
  };

  const agregarReferencia = () => {
    if (referenciaInput.trim()) {
      setValue('referencias_normativas', [...referenciasNormativas, referenciaInput.trim()]);
      setReferenciaInput('');
    }
  };

  const eliminarReferencia = (index: number) => {
    setValue(
      'referencias_normativas',
      referenciasNormativas.filter((_, i) => i !== index),
    );
  };

  const agregarCompetencia = () => {
    if (competenciaInput.trim()) {
      const nuevas = [...(requisitosPrevios.competencias || []), competenciaInput.trim()];
      setValue('requisitos_previos', {
        ...requisitosPrevios,
        competencias: nuevas,
      });
      setCompetenciaInput('');
    }
  };

  const eliminarCompetencia = (index: number) => {
    setValue('requisitos_previos', {
      ...requisitosPrevios,
      competencias: requisitosPrevios.competencias?.filter((_, i) => i !== index) || [],
    });
  };

  const agregarHerramienta = () => {
    if (herramientaInput.trim()) {
      const nuevas = [...(requisitosPrevios.herramientas || []), herramientaInput.trim()];
      setValue('requisitos_previos', {
        ...requisitosPrevios,
        herramientas: nuevas,
      });
      setHerramientaInput('');
    }
  };

  const eliminarHerramienta = (index: number) => {
    setValue('requisitos_previos', {
      ...requisitosPrevios,
      herramientas: requisitosPrevios.herramientas?.filter((_, i) => i !== index) || [],
    });
  };

  const agregarPermiso = () => {
    if (permisoInput.trim()) {
      const nuevos = [
        ...(requisitosPrevios.permisos_asociados || []),
        permisoInput.trim(),
      ];
      setValue('requisitos_previos', {
        ...requisitosPrevios,
        permisos_asociados: nuevos,
      });
      setPermisoInput('');
    }
  };

  const eliminarPermiso = (index: number) => {
    setValue('requisitos_previos', {
      ...requisitosPrevios,
      permisos_asociados:
        requisitosPrevios.permisos_asociados?.filter((_, i) => i !== index) || [],
    });
  };

  const onSubmit = async (data: PetsFormData) => {
    if (!usuario?.id || !usuario?.empresaId) {
      toast.error('Error', {
        description: 'No se pudo identificar al usuario o la empresa',
      });
      return;
    }

    try {
      const payload: CreatePetsDto = {
        codigo: data.codigo,
        titulo: data.titulo,
        objetivo: data.objetivo,
        alcance: data.alcance,
        definiciones: data.definiciones || undefined,
        area_proceso: data.area_proceso || undefined,
        referencias_normativas:
          data.referencias_normativas && data.referencias_normativas.length > 0
            ? data.referencias_normativas
            : undefined,
        equipos_materiales:
          data.equipos_materiales && data.equipos_materiales.length > 0
            ? data.equipos_materiales
            : undefined,
        requisitos_previos:
          data.requisitos_previos &&
          (data.requisitos_previos.competencias?.length ||
            data.requisitos_previos.herramientas?.length ||
            data.requisitos_previos.permisos_asociados?.length)
            ? data.requisitos_previos
            : undefined,
        fecha_emision: data.fecha_emision,
        fecha_revision: data.fecha_revision || undefined,
        elaborador_id: usuario.id,
        empresa_id: usuario.empresaId,
        pasos: data.pasos.map((p, index) => ({
          ...p,
          numero: index + 1,
        })),
      };

      await petsService.create(payload);
      toast.success('PETS creado', {
        description: 'El procedimiento ha sido creado correctamente',
      });
      setIsModalOpen(false);
      reset();
      setCurrentStep(1);
      loadPets();
    } catch (error: any) {
      toast.error('Error al crear PETS', {
        description:
          error.response?.data?.message || 'No se pudo crear el procedimiento',
      });
    }
  };

  const handleCrearNuevaVersion = async (codigo: string) => {
    try {
      await petsService.crearNuevaVersion(codigo);
      toast.success('Nueva versión creada', {
        description: 'La versión anterior ha sido marcada como obsoleta',
      });
      loadPets();
    } catch (error: any) {
      toast.error('Error al crear nueva versión', {
        description:
          error.response?.data?.message || 'No se pudo crear la nueva versión',
      });
    }
  };

  const handleConfirmarLectura = async (petsId: string) => {
    if (!usuario?.id || !usuario?.nombreCompleto) {
      toast.error('Error', {
        description: 'No se pudo identificar al usuario',
      });
      return;
    }

    try {
      await petsService.registrarLectura(petsId, {
        usuario_id: usuario.id,
        usuario_nombre: usuario.nombreCompleto || usuario.email || 'Usuario',
      });
      toast.success('Lectura confirmada', {
        description: 'Has confirmado la lectura del procedimiento',
      });
      setIsViewModalOpen(false);
      loadPets();
    } catch (error: any) {
      toast.error('Error al confirmar lectura', {
        description:
          error.response?.data?.message || 'No se pudo registrar la lectura',
      });
    }
  };

  const getEstadoColor = (estado: EstadoPETS) => {
    switch (estado) {
      case EstadoPETS.Borrador:
        return 'bg-slate-200 text-slate-700 border-slate-300';
      case EstadoPETS.PendienteRevision:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case EstadoPETS.EnRevision:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case EstadoPETS.Vigente:
        return 'bg-green-100 text-green-800 border-green-200';
      case EstadoPETS.Obsoleto:
        return 'bg-gray-400 text-white border-gray-500';
      default:
        return 'bg-slate-200 text-slate-700 border-slate-300';
    }
  };

  const yaLeyo = (pets: PETS) => {
    if (!usuario?.id) return false;
    return pets.lecturas.some((l) => l.usuario_id === usuario.id);
  };

  const filteredPets = petsList;

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <ProtectedRoute
      allowedRoles={[
        UsuarioRol.SUPER_ADMIN,
        UsuarioRol.ADMIN_EMPRESA,
        UsuarioRol.INGENIERO_SST,
        UsuarioRol.SUPERVISOR,
        UsuarioRol.TRABAJADOR,
      ]}
    >
      <MainLayout>
        <div className="space-y-6 w-full">
          {/* Cabecera */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-slate-900 mt-0">
                Procedimientos Escritos de Trabajo Seguro (PETS)
              </h1>
              <p className="text-slate-600 mt-2">
                Biblioteca de procedimientos estándar para tareas seguras
              </p>
            </div>
            {usuario &&
              (hasRole(UsuarioRol.SUPER_ADMIN) ||
                hasRole(UsuarioRol.ADMIN_EMPRESA) ||
                hasRole(UsuarioRol.INGENIERO_SST)) && (
                <div className="flex-shrink-0">
                  <Button onClick={() => setIsModalOpen(true)}>
                    <Plus className="w-5 h-5 mr-2" />
                    Nuevo PETS
                  </Button>
                </div>
              )}
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                value={selectedEstado}
                onChange={(e) => setSelectedEstado(e.target.value)}
              >
                <option value="">Todos los estados</option>
                {Object.values(EstadoPETS).map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Tabla/Grid de PETS */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden w-full">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : filteredPets.length === 0 ? (
              <div className="p-12 text-center">
                <ClipboardList className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">No hay procedimientos PETS registrados</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                        Código
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                        Título
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                        Versión
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                        Área
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {filteredPets.map((pets) => (
                      <tr key={pets.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                          {pets.codigo}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-900">{pets.titulo}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          v{pets.version}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded border ${getEstadoColor(
                              pets.estado,
                            )}`}
                          >
                            {pets.estado}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {pets.area_proceso || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedPets(pets);
                              setIsViewModalOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Ver
                          </Button>
                          {pets.estado === EstadoPETS.Vigente &&
                            !hasRole(UsuarioRol.TRABAJADOR) &&
                            (hasRole(UsuarioRol.SUPER_ADMIN) ||
                              hasRole(UsuarioRol.ADMIN_EMPRESA) ||
                              hasRole(UsuarioRol.INGENIERO_SST)) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCrearNuevaVersion(pets.codigo)}
                              >
                                Nueva Versión
                              </Button>
                            )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modal de Creación con Stepper */}
          <Modal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              reset();
              setCurrentStep(1);
            }}
            title="Nuevo PETS"
            size="xl"
          >
            {/* Stepper */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                {STEPS.map((step, index) => {
                  const StepIcon = step.icon;
                  const isActive = currentStep === step.id;
                  const isCompleted = currentStep > step.id;
                  return (
                    <div key={step.id} className="flex items-center flex-1">
                      <div className="flex flex-col items-center flex-1">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                            isActive
                              ? 'bg-primary text-white border-primary'
                              : isCompleted
                                ? 'bg-green-500 text-white border-green-500'
                                : 'bg-white text-slate-400 border-slate-300'
                          }`}
                        >
                          <StepIcon className="w-5 h-5" />
                        </div>
                        <span
                          className={`mt-2 text-xs font-medium ${
                            isActive ? 'text-primary' : 'text-slate-500'
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                      {index < STEPS.length - 1 && (
                        <div
                          className={`h-0.5 flex-1 mx-2 ${
                            isCompleted ? 'bg-green-500' : 'bg-slate-300'
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Paso 1: General */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
                    Información General
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Código <span className="text-red-500">*</span>
                      </label>
                      <Input {...register('codigo')} placeholder="Ej: PETS-MANT-001" />
                      {errors.codigo && (
                        <p className="mt-1 text-sm text-danger">{errors.codigo.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Área de Proceso
                      </label>
                      <Input {...register('area_proceso')} placeholder="Ej: Mantenimiento" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Título <span className="text-red-500">*</span>
                    </label>
                    <Input {...register('titulo')} placeholder="Ej: Operación de Montacargas" />
                    {errors.titulo && (
                      <p className="mt-1 text-sm text-danger">{errors.titulo.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Objetivo <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      {...register('objetivo')}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Describe el objetivo del procedimiento..."
                    />
                    {errors.objetivo && (
                      <p className="mt-1 text-sm text-danger">{errors.objetivo.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Alcance <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      {...register('alcance')}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Describe el alcance del procedimiento..."
                    />
                    {errors.alcance && (
                      <p className="mt-1 text-sm text-danger">{errors.alcance.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Definiciones
                    </label>
                    <textarea
                      {...register('definiciones')}
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Define términos técnicos si es necesario..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Referencias Normativas
                    </label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={referenciaInput}
                        onChange={(e) => setReferenciaInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), agregarReferencia())}
                        placeholder="Ej: NTP 350.001"
                      />
                      <Button type="button" onClick={agregarReferencia}>
                        Agregar
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {referenciasNormativas.map((ref, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm flex items-center gap-2"
                        >
                          {ref}
                          <button
                            type="button"
                            onClick={() => eliminarReferencia(index)}
                            className="hover:text-primary-dark"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Fecha de Emisión <span className="text-red-500">*</span>
                      </label>
                      <Input type="date" {...register('fecha_emision')} />
                      {errors.fecha_emision && (
                        <p className="mt-1 text-sm text-danger">
                          {errors.fecha_emision.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Fecha de Revisión
                      </label>
                      <Input type="date" {...register('fecha_revision')} />
                    </div>
                  </div>
                </div>
              )}

              {/* Paso 2: Requisitos */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
                    Requisitos Previos
                  </h3>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Competencias Requeridas
                    </label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={competenciaInput}
                        onChange={(e) => setCompetenciaInput(e.target.value)}
                        onKeyPress={(e) =>
                          e.key === 'Enter' && (e.preventDefault(), agregarCompetencia())
                        }
                        placeholder="Ej: Certificación de operador de montacargas"
                      />
                      <Button type="button" onClick={agregarCompetencia}>
                        Agregar
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {requisitosPrevios.competencias?.map((comp, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm flex items-center gap-2"
                        >
                          {comp}
                          <button
                            type="button"
                            onClick={() => eliminarCompetencia(index)}
                            className="hover:text-blue-900"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Herramientas Necesarias
                    </label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={herramientaInput}
                        onChange={(e) => setHerramientaInput(e.target.value)}
                        onKeyPress={(e) =>
                          e.key === 'Enter' && (e.preventDefault(), agregarHerramienta())
                        }
                        placeholder="Ej: Llave de torque"
                      />
                      <Button type="button" onClick={agregarHerramienta}>
                        Agregar
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {requisitosPrevios.herramientas?.map((her, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm flex items-center gap-2"
                        >
                          {her}
                          <button
                            type="button"
                            onClick={() => eliminarHerramienta(index)}
                            className="hover:text-green-900"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Permisos Asociados
                    </label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={permisoInput}
                        onChange={(e) => setPermisoInput(e.target.value)}
                        onKeyPress={(e) =>
                          e.key === 'Enter' && (e.preventDefault(), agregarPermiso())
                        }
                        placeholder="Ej: PETAR-001"
                      />
                      <Button type="button" onClick={agregarPermiso}>
                        Agregar
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {requisitosPrevios.permisos_asociados?.map((perm, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm flex items-center gap-2"
                        >
                          {perm}
                          <button
                            type="button"
                            onClick={() => eliminarPermiso(index)}
                            className="hover:text-purple-900"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Paso 3: Equipos */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2 flex-1">
                      Equipos y Materiales
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        appendEquipo({
                          nombre: '',
                          tipo: '',
                          obligatorio: false,
                        })
                      }
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar Equipo
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {equiposFields.map((field, index) => (
                      <div
                        key={field.id}
                        className="p-4 border border-slate-200 rounded-lg space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-700">
                            Equipo {index + 1}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeEquipo(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Nombre
                            </label>
                            <Input {...register(`equipos_materiales.${index}.nombre`)} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Tipo
                            </label>
                            <Input {...register(`equipos_materiales.${index}.tipo`)} />
                          </div>
                          <div className="flex items-center">
                            <label className="flex items-center gap-2 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                {...register(`equipos_materiales.${index}.obligatorio`)}
                                className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                              />
                              Obligatorio
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Paso 4: Desarrollo */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2 flex-1">
                      Pasos del Procedimiento
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        appendPaso({
                          numero: pasosFields.length + 1,
                          descripcion: '',
                          peligros: '',
                          medidas_control: '',
                          epp_requerido: [],
                        })
                      }
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar Paso
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {pasosFields.map((field, index) => {
                      const eppPaso = watch(`pasos.${index}.epp_requerido`) || [];
                      return (
                        <div
                          key={field.id}
                          className="p-4 border border-slate-200 rounded-lg space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-700">
                              Paso {index + 1}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removePaso(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Descripción <span className="text-red-500">*</span>
                            </label>
                            <textarea
                              {...register(`pasos.${index}.descripcion`)}
                              rows={2}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                              placeholder="Describe el paso a realizar..."
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Peligros
                            </label>
                            <textarea
                              {...register(`pasos.${index}.peligros`)}
                              rows={2}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                              placeholder="Identifica los peligros asociados..."
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Medidas de Control
                            </label>
                            <textarea
                              {...register(`pasos.${index}.medidas_control`)}
                              rows={2}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                              placeholder="Describe las medidas de control..."
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              EPP Requerido
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {EPP_OPCIONES.map((epp) => (
                                <label
                                  key={epp}
                                  className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50"
                                >
                                  <input
                                    type="checkbox"
                                    checked={eppPaso.includes(epp)}
                                    onChange={(e) => {
                                      const actual = eppPaso || [];
                                      if (e.target.checked) {
                                        setValue(`pasos.${index}.epp_requerido`, [
                                          ...actual,
                                          epp,
                                        ]);
                                      } else {
                                        setValue(
                                          `pasos.${index}.epp_requerido`,
                                          actual.filter((ep) => ep !== epp),
                                        );
                                      }
                                    }}
                                    className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                                  />
                                  <span className="text-xs text-slate-700">{epp}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Paso 5: Anexos */}
              {currentStep === 5 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
                    Anexos
                  </h3>
                  <div className="p-8 border-2 border-dashed border-slate-300 rounded-lg text-center">
                    <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600 mb-4">
                      La funcionalidad de subida de archivos estará disponible próximamente
                    </p>
                    <p className="text-sm text-slate-500">
                      Por ahora, puedes agregar referencias normativas en el paso 1
                    </p>
                  </div>
                </div>
              )}

              {/* Navegación del Stepper */}
              <div className="flex justify-between pt-4 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Anterior
                </Button>
                {currentStep < STEPS.length ? (
                  <Button type="button" onClick={nextStep}>
                    Siguiente
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Guardando...' : 'Guardar PETS'}
                  </Button>
                )}
              </div>
            </form>
          </Modal>

          {/* Modal de Visualización/Lectura */}
          {selectedPets && (
            <Modal
              isOpen={isViewModalOpen}
              onClose={() => {
                setIsViewModalOpen(false);
                setSelectedPets(null);
              }}
              title={`${selectedPets.titulo} - v${selectedPets.version}`}
              size="xl"
            >
              <div className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-slate-700">Código:</span>{' '}
                    <span className="text-slate-900">{selectedPets.codigo}</span>
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Estado:</span>{' '}
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded border ${getEstadoColor(
                        selectedPets.estado,
                      )}`}
                    >
                      {selectedPets.estado}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Área:</span>{' '}
                    <span className="text-slate-900">
                      {selectedPets.area_proceso || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Fecha Emisión:</span>{' '}
                    <span className="text-slate-900">
                      {new Date(selectedPets.fecha_emision).toLocaleDateString('es-PE')}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">Objetivo</h4>
                  <p className="text-slate-700">{selectedPets.objetivo}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">Alcance</h4>
                  <p className="text-slate-700">{selectedPets.alcance}</p>
                </div>

                {selectedPets.definiciones && (
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">Definiciones</h4>
                    <p className="text-slate-700">{selectedPets.definiciones}</p>
                  </div>
                )}

                {selectedPets.referencias_normativas &&
                  selectedPets.referencias_normativas.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-2">
                        Referencias Normativas
                      </h4>
                      <ul className="list-disc list-inside text-slate-700">
                        {selectedPets.referencias_normativas.map((ref, index) => (
                          <li key={index}>{ref}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                {selectedPets.requisitos_previos && (
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">Requisitos Previos</h4>
                    {selectedPets.requisitos_previos.competencias &&
                      selectedPets.requisitos_previos.competencias.length > 0 && (
                        <div className="mb-2">
                          <span className="font-medium text-slate-700">Competencias: </span>
                          <span className="text-slate-600">
                            {selectedPets.requisitos_previos.competencias.join(', ')}
                          </span>
                        </div>
                      )}
                    {selectedPets.requisitos_previos.herramientas &&
                      selectedPets.requisitos_previos.herramientas.length > 0 && (
                        <div className="mb-2">
                          <span className="font-medium text-slate-700">Herramientas: </span>
                          <span className="text-slate-600">
                            {selectedPets.requisitos_previos.herramientas.join(', ')}
                          </span>
                        </div>
                      )}
                  </div>
                )}

                {selectedPets.equipos_materiales &&
                  selectedPets.equipos_materiales.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-2">
                        Equipos y Materiales
                      </h4>
                      <div className="space-y-2">
                        {selectedPets.equipos_materiales.map((eq, index) => (
                          <div
                            key={index}
                            className="p-2 bg-slate-50 rounded border border-slate-200"
                          >
                            <span className="font-medium text-slate-900">{eq.nombre}</span> -{' '}
                            <span className="text-slate-600">{eq.tipo}</span>
                            {eq.obligatorio && (
                              <span className="ml-2 text-xs text-red-600">(Obligatorio)</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {selectedPets.pasos && selectedPets.pasos.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">
                      Pasos del Procedimiento
                    </h4>
                    <div className="space-y-4">
                      {selectedPets.pasos.map((paso, index) => (
                        <div
                          key={index}
                          className="p-4 border border-slate-200 rounded-lg space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-primary">Paso {paso.numero}</span>
                          </div>
                          <p className="text-slate-700">{paso.descripcion}</p>
                          {paso.peligros && (
                            <div>
                              <span className="font-medium text-slate-700">Peligros: </span>
                              <span className="text-slate-600">{paso.peligros}</span>
                            </div>
                          )}
                          {paso.medidas_control && (
                            <div>
                              <span className="font-medium text-slate-700">
                                Medidas de Control:{' '}
                              </span>
                              <span className="text-slate-600">{paso.medidas_control}</span>
                            </div>
                          )}
                          {paso.epp_requerido && paso.epp_requerido.length > 0 && (
                            <div>
                              <span className="font-medium text-slate-700">EPP Requerido: </span>
                              <span className="text-slate-600">
                                {paso.epp_requerido.join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Botón de Confirmar Lectura para Trabajadores */}
                {usuario &&
                  hasRole(UsuarioRol.TRABAJADOR) &&
                  selectedPets.estado === EstadoPETS.Vigente &&
                  !yaLeyo(selectedPets) && (
                    <div className="pt-4 border-t border-slate-200">
                      <Button
                        onClick={() => handleConfirmarLectura(selectedPets.id)}
                        className="w-full"
                      >
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        Confirmar Lectura
                      </Button>
                    </div>
                  )}

                {usuario && yaLeyo(selectedPets) && (
                  <div className="pt-4 border-t border-slate-200">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-green-800">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-medium">
                          Ya has confirmado la lectura de este procedimiento
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Modal>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}

