'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  ipercService,
  IPERC,
  EstadoIPERC,
  NivelRiesgo,
  CreateIpercDto,
  LineaIpercDto,
  calcularIndiceProbabilidad,
  calcularValorRiesgo,
  calcularNivelRiesgo,
} from '@/services/iperc.service';
import { empresasService } from '@/services/empresas.service';
import { areasService } from '@/services/areas.service';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import SignatureCanvas from '@/components/ui/signature-canvas';
import {
  FileText,
  Plus,
  Eye,
  Calendar,
  Building2,
  User,
  X,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UsuarioRol } from '@/types';

const lineaSchema = z.object({
  numero: z.number().int().min(1),
  actividad: z.string().min(1, 'La actividad es obligatoria'),
  tarea: z.string().min(1, 'La tarea es obligatoria'),
  puesto_trabajo: z.string().optional().or(z.literal('')),
  peligro: z.string().min(1, 'El peligro es obligatorio'),
  riesgo: z.string().min(1, 'El riesgo es obligatorio'),
  requisito_legal: z.string().optional().or(z.literal('')),
  probabilidad_a: z.number().int().min(1).max(5),
  probabilidad_b: z.number().int().min(1).max(5),
  probabilidad_c: z.number().int().min(1).max(5),
  probabilidad_d: z.number().int().min(1).max(5),
  indice_severidad: z.number().int().min(1).max(5),
  jerarquia_eliminacion: z.boolean().optional(),
  jerarquia_sustitucion: z.boolean().optional(),
  jerarquia_controles_ingenieria: z.boolean().optional(),
  jerarquia_controles_admin: z.boolean().optional(),
  jerarquia_epp: z.boolean().optional(),
  medidas_control: z.string().min(1, 'Las medidas de control son obligatorias'),
  responsable: z.string().optional().or(z.literal('')),
});

// Schema base - empresa_id es opcional pero se validará manualmente para SUPER_ADMIN
const ipercSchema = z.object({
  razon_social: z.string().optional(), // Opcional porque se obtiene automáticamente del backend
  empresa_id: z.string().uuid().optional().or(z.literal('')), // Para SUPER_ADMIN seleccionar empresa
  area_id: z.string().uuid().optional().or(z.literal('')),
  proceso: z.string().min(1, 'El proceso es obligatorio'),
  fecha_elaboracion: z.string().min(1, 'La fecha de elaboración es obligatoria'),
  lineas_iperc: z.array(lineaSchema).min(1, 'Debe haber al menos una línea de riesgo'),
});

type IpercFormData = z.infer<typeof ipercSchema>;

export default function IpercPage() {
  const { usuario, hasRole } = useAuth();
  const [ipercList, setIpercList] = useState<IPERC[]>([]);
  const [empresas, setEmpresas] = useState<{ id: string; nombre: string }[]>([]);
  const [areas, setAreas] = useState<{ id: string; nombre: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedIperc, setSelectedIperc] = useState<IPERC | null>(null);
  const [firmaElaborador, setFirmaElaborador] = useState<string>('');
  const [firmaAprobador, setFirmaAprobador] = useState<string>('');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('');
  const [selectedEstadoFilter, setSelectedEstadoFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const canAprobar = hasRole(UsuarioRol.INGENIERO_SST) || hasRole(UsuarioRol.SUPER_ADMIN);
  const isSuperAdmin = hasRole(UsuarioRol.SUPER_ADMIN);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting, isValid },
  } = useForm<IpercFormData>({
    resolver: zodResolver(ipercSchema),
    mode: 'onChange', // Validar en tiempo real para habilitar/deshabilitar el botón
    defaultValues: {
      razon_social: '',
      empresa_id: '',
      area_id: '',
      proceso: '',
      fecha_elaboracion: new Date().toISOString().split('T')[0],
      lineas_iperc: [],
    },
  });

  // Cargar empresas cuando se abre el modal (especialmente para SUPER_ADMIN)
  useEffect(() => {
    if (isModalOpen) {
      if (isSuperAdmin) {
        // SUPER_ADMIN necesita todas las empresas
        loadEmpresas();
      } else if (usuario?.empresaId && empresas.length === 0) {
        // Usuarios normales solo cargan su empresa
        loadEmpresas();
      }
    }
  }, [isModalOpen, isSuperAdmin]);

  // Precargar razón social y empresa_id cuando se abre el modal
  useEffect(() => {
    if (isModalOpen && empresas.length > 0) {
      if (isSuperAdmin) {
        // SUPER_ADMIN: no precargar, dejar que seleccione
        // Pero si tiene empresaId vinculado, precargar esa
        if (usuario?.empresaId) {
          const empresa = empresas.find((e) => e.id === usuario.empresaId);
          if (empresa) {
            setValue('empresa_id', empresa.id);
            setValue('razon_social', empresa.nombre);
            loadAreasByEmpresa(empresa.id);
          }
        }
      } else {
        // Usuarios normales: precargar su empresa
        if (usuario?.empresaId) {
          const empresa = empresas.find((e) => e.id === usuario.empresaId);
          if (empresa) {
            setValue('empresa_id', empresa.id);
            setValue('razon_social', empresa.nombre);
            loadAreasByEmpresa(empresa.id);
          }
        }
      }
    }
  }, [isModalOpen, usuario?.empresaId, empresas, setValue, isSuperAdmin]);

  const {
    fields: lineasFields,
    append: appendLinea,
    remove: removeLinea,
  } = useFieldArray({
    control,
    name: 'lineas_iperc',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (usuario?.empresaId) {
      loadAreas();
      loadEmpresas();
    }
  }, [usuario?.empresaId]);

  useEffect(() => {
    loadIperc();
  }, [selectedAreaFilter, selectedEstadoFilter]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      await loadIperc();
    } catch (error: any) {
      toast.error('Error al cargar datos', {
        description: error.response?.data?.message || 'No se pudieron cargar los datos',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadIperc = async () => {
    try {
      const empresaId = usuario?.empresaId || undefined;
      const data = await ipercService.findAll(empresaId);
      setIpercList(data);
    } catch (error: any) {
      toast.error('Error al cargar IPERC', {
        description:
          error.response?.data?.message || 'No se pudieron cargar las matrices IPERC',
      });
    }
  };

  const loadEmpresas = async () => {
    try {
      const data = await empresasService.findAll();
      setEmpresas(data.filter((e) => e.activo).map((e) => ({ id: e.id, nombre: e.nombre })));
    } catch (error) {
      console.error('Error al cargar empresas:', error);
    }
  };

  const loadAreas = async () => {
    try {
      if (!usuario?.empresaId) return;
      const data = await areasService.findAll(usuario.empresaId);
      setAreas(data.map((a) => ({ id: a.id, nombre: a.nombre })));
    } catch (error) {
      console.error('Error al cargar áreas:', error);
      setAreas([]);
    }
  };

  const loadAreasByEmpresa = async (empresaId: string) => {
    try {
      const data = await areasService.findAll(empresaId);
      setAreas(data.map((a) => ({ id: a.id, nombre: a.nombre })));
    } catch (error) {
      console.error('Error al cargar áreas:', error);
      setAreas([]);
    }
  };

  const onSubmit = async (data: IpercFormData) => {
    if (!usuario?.id) {
      toast.error('Error', {
        description: 'No se pudo identificar al usuario',
      });
      return;
    }

    // Determinar empresa_id: SUPER_ADMIN puede seleccionar, otros usan su empresa vinculada
    const empresaId = isSuperAdmin && data.empresa_id
      ? data.empresa_id
      : usuario.empresaId;

    // Validación para SUPER_ADMIN: debe seleccionar una empresa
    if (isSuperAdmin && !data.empresa_id) {
      setError('empresa_id', {
        type: 'manual',
        message: 'Debe seleccionar una empresa',
      });
      toast.error('Error de validación', {
        description: 'Debe seleccionar una empresa',
      });
      return;
    }

    if (!empresaId) {
      toast.error('Error', {
        description: 'Debe seleccionar una empresa',
      });
      return;
    }

    clearErrors('empresa_id');

    try {
      // Obtener razón social del formulario o de la empresa seleccionada
      const empresaSeleccionada = empresas.find((e) => e.id === empresaId);
      const razonSocial =
        data.razon_social ||
        empresaSeleccionada?.nombre ||
        '';

      // Calcular índices y valores para cada línea
      // Nota: El backend recalculará estos valores, pero los enviamos para referencia
      const lineasCalculadas: LineaIpercDto[] = data.lineas_iperc.map((linea, index) => {
        return {
          ...linea,
          numero: index + 1,
        };
      });

      const payload: CreateIpercDto = {
        // razon_social es requerido pero el backend la obtendrá automáticamente de la empresa si viene vacío
        razon_social: razonSocial,
        area_id: data.area_id && data.area_id !== '' ? data.area_id : undefined,
        proceso: data.proceso,
        fecha_elaboracion: data.fecha_elaboracion,
        elaborado_por_id: usuario.id,
        empresa_id: empresaId,
        estado: firmaElaborador ? EstadoIPERC.Completado : EstadoIPERC.Borrador,
        firma_elaborador: firmaElaborador || undefined,
        lineas_iperc: lineasCalculadas,
      };

      await ipercService.create(payload);
      toast.success('Matriz IPERC creada', {
        description: 'La matriz ha sido creada correctamente',
      });
      setIsModalOpen(false);
      reset();
      setFirmaElaborador('');
      loadIperc();
    } catch (error: any) {
      toast.error('Error al crear IPERC', {
        description: error.response?.data?.message || 'No se pudo crear la matriz IPERC',
      });
    }
  };

  const handleAprobar = async (ipercId: string) => {
    if (!usuario?.id || !firmaAprobador) {
      toast.error('Error', {
        description: 'Debes firmar para aprobar la matriz',
      });
      return;
    }

    try {
      await ipercService.update(ipercId, {
        estado: EstadoIPERC.Aprobado,
        aprobado_por_id: usuario.id,
        aprobado_por: usuario.dni,
        firma_aprobador: firmaAprobador,
      });
      toast.success('Matriz IPERC aprobada', {
        description: 'La matriz ha sido aprobada y firmada correctamente',
      });
      setIsViewModalOpen(false);
      setFirmaAprobador('');
      loadIperc();
    } catch (error: any) {
      toast.error('Error al aprobar IPERC', {
        description: error.response?.data?.message || 'No se pudo aprobar la matriz',
      });
    }
  };

  const getEstadoColor = (estado: EstadoIPERC) => {
    switch (estado) {
      case EstadoIPERC.Borrador:
        return 'bg-slate-200 text-slate-700 border-slate-300';
      case EstadoIPERC.Completado:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case EstadoIPERC.Aprobado:
        return 'bg-green-100 text-green-800 border-green-200';
      case EstadoIPERC.Rechazado:
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-slate-200 text-slate-700 border-slate-300';
    }
  };

  const getNivelRiesgoColor = (nivel: NivelRiesgo) => {
    switch (nivel) {
      case NivelRiesgo.Trivial:
        return 'bg-green-100 text-green-800';
      case NivelRiesgo.Tolerable:
        return 'bg-yellow-100 text-yellow-800';
      case NivelRiesgo.Moderado:
        return 'bg-orange-100 text-orange-800';
      case NivelRiesgo.Importante:
        return 'bg-red-100 text-red-800';
      case NivelRiesgo.Intolerable:
        return 'bg-red-900 text-white';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const filteredIperc = useMemo(() => {
    return ipercList.filter((iperc) => {
      const matchesArea = !selectedAreaFilter || iperc.area_id === selectedAreaFilter;
      const matchesEstado = !selectedEstadoFilter || iperc.estado === selectedEstadoFilter;
      const matchesSearch =
        !searchTerm ||
        iperc.razon_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
        iperc.proceso.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (iperc.area && iperc.area.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesArea && matchesEstado && matchesSearch;
    });
  }, [ipercList, selectedAreaFilter, selectedEstadoFilter, searchTerm]);

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
                Matriz IPERC
              </h1>
              <p className="text-slate-600 mt-2">
                Identificación de Peligros, Evaluación de Riesgos y Medidas de Control
              </p>
            </div>
            {usuario &&
              (hasRole(UsuarioRol.SUPER_ADMIN) ||
                hasRole(UsuarioRol.ADMIN_EMPRESA) ||
                hasRole(UsuarioRol.INGENIERO_SST)) && (
                <div className="flex-shrink-0">
                  <Button onClick={() => setIsModalOpen(true)}>
                    <Plus className="w-5 h-5 mr-2" />
                    Nueva Matriz
                  </Button>
                </div>
              )}
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Buscar por razón social, proceso o área..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={selectedAreaFilter}
                onChange={(e) => setSelectedAreaFilter(e.target.value)}
              >
                <option value="">Todas las áreas</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.nombre}
                  </option>
                ))}
              </Select>
              <Select
                value={selectedEstadoFilter}
                onChange={(e) => setSelectedEstadoFilter(e.target.value)}
              >
                <option value="">Todos los estados</option>
                {Object.values(EstadoIPERC).map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Listado de IPERC */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              <>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-48 w-full" />
                ))}
              </>
            ) : filteredIperc.length === 0 ? (
              <div className="col-span-full p-12 text-center bg-white rounded-lg shadow-sm border border-slate-200">
                <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">No hay matrices IPERC registradas</p>
              </div>
            ) : (
              filteredIperc.map((iperc) => (
                <div
                  key={iperc.id}
                  className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-slate-900 mb-1">
                        {iperc.razon_social}
                      </h3>
                      <p className="text-sm text-slate-600 mb-2">{iperc.proceso}</p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded border flex-shrink-0 ${getEstadoColor(
                        iperc.estado,
                      )}`}
                    >
                      {iperc.estado}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-slate-600 mb-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      <span>{iperc.area || 'Sin área asignada'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{iperc.elaborado_por || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(iperc.fecha_elaboracion).toLocaleDateString('es-PE', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {iperc.lineas_iperc.length} línea(s) de riesgo
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setSelectedIperc(iperc);
                      setIsViewModalOpen(true);
                    }}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Ver Matriz
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* Modal de Creación */}
          <Modal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              reset({
                razon_social: '',
                empresa_id: '',
                area_id: '',
                proceso: '',
                fecha_elaboracion: new Date().toISOString().split('T')[0],
                lineas_iperc: [],
              });
              setFirmaElaborador('');
            }}
            title="Nueva Matriz IPERC"
            size="xl"
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Cabecera */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
                  Información General
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Razón Social <span className="text-red-500">*</span>
                    </label>
                    {isSuperAdmin ? (
                      <>
                        <Select
                          {...register('empresa_id', {
                            required: isSuperAdmin ? 'Debe seleccionar una empresa' : false,
                            onChange: (e) => {
                              const selectedEmpresaId = e.target.value;
                              const selectedEmpresa = empresas.find((e) => e.id === selectedEmpresaId);
                              if (selectedEmpresa) {
                                setValue('empresa_id', selectedEmpresaId, { shouldValidate: true });
                                setValue('razon_social', selectedEmpresa.nombre);
                                clearErrors('empresa_id');
                                // Cargar áreas de la empresa seleccionada
                                loadAreasByEmpresa(selectedEmpresaId);
                                // Limpiar área seleccionada al cambiar empresa
                                setValue('area_id', '');
                              } else {
                                setValue('empresa_id', '');
                                setValue('razon_social', '');
                                setAreas([]);
                                setValue('area_id', '');
                              }
                            },
                          })}
                          value={watch('empresa_id') || ''}
                        >
                          <option value="">Seleccione una empresa</option>
                          {empresas.map((empresa) => (
                            <option key={empresa.id} value={empresa.id}>
                              {empresa.nombre}
                            </option>
                          ))}
                        </Select>
                        {errors.empresa_id && (
                          <p className="mt-1 text-sm text-danger">
                            {errors.empresa_id.message}
                          </p>
                        )}
                        <input
                          type="hidden"
                          {...register('razon_social')}
                          value={watch('razon_social') || ''}
                        />
                      </>
                    ) : (
                      <>
                        <Input
                          {...register('razon_social')}
                          value={
                            watch('razon_social') ||
                            empresas.find((e) => e.id === usuario?.empresaId)?.nombre ||
                            ''
                          }
                          readOnly
                          className="bg-slate-50 cursor-not-allowed"
                        />
                        <input
                          type="hidden"
                          {...register('empresa_id')}
                          value={usuario?.empresaId || ''}
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          Se obtendrá automáticamente de la empresa vinculada
                        </p>
                      </>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Área
                    </label>
                    <Select {...register('area_id')}>
                      <option value="">Seleccionar área...</option>
                      {areas.map((area) => (
                        <option key={area.id} value={area.id}>
                          {area.nombre}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Proceso <span className="text-red-500">*</span>
                    </label>
                    <Input {...register('proceso')} placeholder="Ej: Mantenimiento de Planta" />
                    {errors.proceso && (
                      <p className="mt-1 text-sm text-danger">{errors.proceso.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Fecha de Elaboración <span className="text-red-500">*</span>
                    </label>
                    <Input type="date" {...register('fecha_elaboracion')} />
                    {errors.fecha_elaboracion && (
                      <p className="mt-1 text-sm text-danger">
                        {errors.fecha_elaboracion.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Líneas de Riesgo */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2 flex-1">
                    Líneas de Riesgo
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      appendLinea({
                        numero: lineasFields.length + 1,
                        actividad: '',
                        tarea: '',
                        puesto_trabajo: '',
                        peligro: '',
                        riesgo: '',
                        requisito_legal: '',
                        probabilidad_a: 1, // Valor mínimo por defecto
                        probabilidad_b: 1,
                        probabilidad_c: 1,
                        probabilidad_d: 1,
                        indice_severidad: 1,
                        jerarquia_eliminacion: false,
                        jerarquia_sustitucion: false,
                        jerarquia_controles_ingenieria: false,
                        jerarquia_controles_admin: false,
                        jerarquia_epp: false,
                        medidas_control: '',
                        responsable: '',
                      })
                    }
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Agregar Línea
                  </Button>
                </div>

                <div className="space-y-4">
                  {lineasFields.map((field, index) => {
                    const probA = watch(`lineas_iperc.${index}.probabilidad_a`) || 1;
                    const probB = watch(`lineas_iperc.${index}.probabilidad_b`) || 1;
                    const probC = watch(`lineas_iperc.${index}.probabilidad_c`) || 1;
                    const probD = watch(`lineas_iperc.${index}.probabilidad_d`) || 1;
                    const severidad = watch(`lineas_iperc.${index}.indice_severidad`) || 1;

                    const indiceProbabilidad = calcularIndiceProbabilidad(
                      probA,
                      probB,
                      probC,
                      probD,
                    );
                    const valorRiesgo = calcularValorRiesgo(indiceProbabilidad, severidad);
                    const nivelRiesgo = calcularNivelRiesgo(valorRiesgo);

                    return (
                      <div
                        key={field.id}
                        className="p-4 border-2 border-slate-200 rounded-lg space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-700">
                            Línea {index + 1}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeLinea(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Información Básica */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Actividad <span className="text-red-500">*</span>
                            </label>
                            <Input {...register(`lineas_iperc.${index}.actividad`)} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Tarea <span className="text-red-500">*</span>
                            </label>
                            <Input {...register(`lineas_iperc.${index}.tarea`)} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Puesto de Trabajo
                            </label>
                            <Input {...register(`lineas_iperc.${index}.puesto_trabajo`)} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Requisito Legal
                            </label>
                            <Input {...register(`lineas_iperc.${index}.requisito_legal`)} />
                          </div>
                        </div>

                        {/* Identificación */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Peligro <span className="text-red-500">*</span>
                            </label>
                            <Input {...register(`lineas_iperc.${index}.peligro`)} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Riesgo <span className="text-red-500">*</span>
                            </label>
                            <Input {...register(`lineas_iperc.${index}.riesgo`)} />
                          </div>
                        </div>

                        {/* Evaluación de Probabilidad */}
                        <div className="bg-slate-50 p-3 rounded-lg">
                          <label className="block text-xs font-medium text-slate-700 mb-2">
                            Factores de Probabilidad (1-5)
                          </label>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                              <label className="block text-xs text-slate-600 mb-1">
                                A: Personas
                              </label>
                              <Input
                                type="number"
                                min="1"
                                max="5"
                                defaultValue={1}
                                {...register(`lineas_iperc.${index}.probabilidad_a`, {
                                  valueAsNumber: true,
                                })}
                                className="text-center"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-600 mb-1">
                                B: Procedimientos
                              </label>
                              <Input
                                type="number"
                                min="1"
                                max="5"
                                defaultValue={1}
                                {...register(`lineas_iperc.${index}.probabilidad_b`, {
                                  valueAsNumber: true,
                                })}
                                className="text-center"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-600 mb-1">
                                C: Capacitación
                              </label>
                              <Input
                                type="number"
                                min="1"
                                max="5"
                                defaultValue={1}
                                {...register(`lineas_iperc.${index}.probabilidad_c`, {
                                  valueAsNumber: true,
                                })}
                                className="text-center"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-600 mb-1">
                                D: Exposición
                              </label>
                              <Input
                                type="number"
                                min="1"
                                max="5"
                                defaultValue={1}
                                {...register(`lineas_iperc.${index}.probabilidad_d`, {
                                  valueAsNumber: true,
                                })}
                                className="text-center"
                              />
                            </div>
                          </div>
                          <div className="mt-2 text-sm font-medium text-slate-700">
                            Índice Probabilidad: <span className="text-primary">{indiceProbabilidad}</span> (A+B+C+D)
                          </div>
                        </div>

                        {/* Severidad y Cálculo de Riesgo */}
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Índice Severidad (1-5)
                              </label>
                              <Input
                                type="number"
                                min="1"
                                max="5"
                                defaultValue={1}
                                {...register(`lineas_iperc.${index}.indice_severidad`, {
                                  valueAsNumber: true,
                                })}
                                className="text-center"
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs font-medium text-slate-700">
                                Valor del Riesgo:{' '}
                                <span className="text-lg font-bold text-primary">
                                  {valorRiesgo}
                                </span>
                              </div>
                              <div>
                                <span className="text-xs font-medium text-slate-700">Nivel: </span>
                                <span
                                  className={`px-2 py-1 text-xs font-medium rounded ${getNivelRiesgoColor(
                                    nivelRiesgo,
                                  )}`}
                                >
                                  {nivelRiesgo}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Jerarquía de Controles */}
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-2">
                            Jerarquía de Controles
                          </label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            <label className="flex items-center gap-2 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                {...register(`lineas_iperc.${index}.jerarquia_eliminacion`)}
                                className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                              />
                              Eliminación
                            </label>
                            <label className="flex items-center gap-2 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                {...register(`lineas_iperc.${index}.jerarquia_sustitucion`)}
                                className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                              />
                              Sustitución
                            </label>
                            <label className="flex items-center gap-2 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                {...register(`lineas_iperc.${index}.jerarquia_controles_ingenieria`)}
                                className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                              />
                              Controles Ingeniería
                            </label>
                            <label className="flex items-center gap-2 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                {...register(`lineas_iperc.${index}.jerarquia_controles_admin`)}
                                className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                              />
                              Controles Admin
                            </label>
                            <label className="flex items-center gap-2 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                {...register(`lineas_iperc.${index}.jerarquia_epp`)}
                                className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                              />
                              EPP
                            </label>
                          </div>
                        </div>

                        {/* Medidas de Control */}
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Medidas de Control <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            {...register(`lineas_iperc.${index}.medidas_control`)}
                            rows={2}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="Describe las medidas de control implementadas..."
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Responsable
                          </label>
                          <Input {...register(`lineas_iperc.${index}.responsable`)} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {errors.lineas_iperc && (
                  <p className="text-sm text-danger">{errors.lineas_iperc.message}</p>
                )}
              </div>

              {/* Firma del Elaborador */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
                  Firma del Elaborador
                </h3>
                <p className="text-sm text-slate-600">
                  Al firmar, el estado cambiará automáticamente a &quot;Completado&quot;
                </p>
                <SignatureCanvas
                  onSave={(dataUrl) => setFirmaElaborador(dataUrl)}
                  initialValue={firmaElaborador}
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
                    setFirmaElaborador('');
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    !isValid ||
                    (isSuperAdmin && !watch('empresa_id'))
                  }
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Matriz'}
                </Button>
              </div>
            </form>
          </Modal>

          {/* Modal de Visualización/Vista Previa */}
          {selectedIperc && (
            <Modal
              isOpen={isViewModalOpen}
              onClose={() => {
                setIsViewModalOpen(false);
                setSelectedIperc(null);
                setFirmaAprobador('');
              }}
              title={`Matriz IPERC - ${selectedIperc.proceso}`}
              size="xl"
            >
              <div className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                {/* Información de Cabecera */}
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-slate-700">Razón Social:</span>{' '}
                      <span className="text-slate-900">{selectedIperc.razon_social}</span>
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Área:</span>{' '}
                      <span className="text-slate-900">{selectedIperc.area || '-'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Proceso:</span>{' '}
                      <span className="text-slate-900">{selectedIperc.proceso}</span>
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Fecha:</span>{' '}
                      <span className="text-slate-900">
                        {new Date(selectedIperc.fecha_elaboracion).toLocaleDateString('es-PE')}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Elaborado por:</span>{' '}
                      <span className="text-slate-900">
                        {selectedIperc.elaborado_por || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Estado:</span>{' '}
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded border ${getEstadoColor(
                          selectedIperc.estado,
                        )}`}
                      >
                        {selectedIperc.estado}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Vista Previa en Formato Horizontal */}
                <div className="bg-white border-2 border-slate-300 rounded-lg p-4">
                  <div className="overflow-x-auto -mx-4 px-4">
                    <table className="w-full text-xs border-collapse" style={{ minWidth: '1400px' }}>
                      <thead>
                        <tr className="bg-slate-100 border-b-2 border-slate-300">
                          <th className="px-2 py-2 text-left border border-slate-300 font-semibold text-slate-700">
                            #
                          </th>
                          <th className="px-2 py-2 text-left border border-slate-300 font-semibold text-slate-700">
                            Actividad
                          </th>
                          <th className="px-2 py-2 text-left border border-slate-300 font-semibold text-slate-700">
                            Tarea
                          </th>
                          <th className="px-2 py-2 text-left border border-slate-300 font-semibold text-slate-700">
                            Puesto
                          </th>
                          <th className="px-2 py-2 text-left border border-slate-300 font-semibold text-slate-700">
                            Peligro
                          </th>
                          <th className="px-2 py-2 text-left border border-slate-300 font-semibold text-slate-700">
                            Riesgo
                          </th>
                          <th className="px-2 py-2 text-left border border-slate-300 font-semibold text-slate-700">
                            Req. Legal
                          </th>
                          <th className="px-2 py-2 text-center border border-slate-300 font-semibold text-slate-700">
                            A
                          </th>
                          <th className="px-2 py-2 text-center border border-slate-300 font-semibold text-slate-700">
                            B
                          </th>
                          <th className="px-2 py-2 text-center border border-slate-300 font-semibold text-slate-700">
                            C
                          </th>
                          <th className="px-2 py-2 text-center border border-slate-300 font-semibold text-slate-700">
                            D
                          </th>
                          <th className="px-2 py-2 text-center border border-slate-300 font-semibold text-slate-700">
                            IP
                          </th>
                          <th className="px-2 py-2 text-center border border-slate-300 font-semibold text-slate-700">
                            Sev
                          </th>
                          <th className="px-2 py-2 text-center border border-slate-300 font-semibold text-slate-700">
                            VR
                          </th>
                          <th className="px-2 py-2 text-center border border-slate-300 font-semibold text-slate-700">
                            Nivel
                          </th>
                          <th className="px-2 py-2 text-left border border-slate-300 font-semibold text-slate-700">
                            Controles
                          </th>
                          <th className="px-2 py-2 text-left border border-slate-300 font-semibold text-slate-700">
                            Medidas
                          </th>
                          <th className="px-2 py-2 text-left border border-slate-300 font-semibold text-slate-700">
                            Responsable
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedIperc.lineas_iperc.map((linea, index) => (
                          <tr key={index} className="border-b border-slate-200">
                            <td className="px-2 py-2 border border-slate-300 text-center font-medium">
                              {linea.numero}
                            </td>
                            <td className="px-2 py-2 border border-slate-300 text-slate-700">
                              {linea.actividad}
                            </td>
                            <td className="px-2 py-2 border border-slate-300 text-slate-700">
                              {linea.tarea}
                            </td>
                            <td className="px-2 py-2 border border-slate-300 text-slate-700">
                              {linea.puesto_trabajo || '-'}
                            </td>
                            <td className="px-2 py-2 border border-slate-300 text-slate-700">
                              {linea.peligro}
                            </td>
                            <td className="px-2 py-2 border border-slate-300 text-slate-700">
                              {linea.riesgo}
                            </td>
                            <td className="px-2 py-2 border border-slate-300 text-slate-700">
                              {linea.requisito_legal || '-'}
                            </td>
                            <td className="px-2 py-2 border border-slate-300 text-center">
                              {linea.probabilidad_a}
                            </td>
                            <td className="px-2 py-2 border border-slate-300 text-center">
                              {linea.probabilidad_b}
                            </td>
                            <td className="px-2 py-2 border border-slate-300 text-center">
                              {linea.probabilidad_c}
                            </td>
                            <td className="px-2 py-2 border border-slate-300 text-center">
                              {linea.probabilidad_d}
                            </td>
                            <td className="px-2 py-2 border border-slate-300 text-center font-medium">
                              {linea.indice_probabilidad}
                            </td>
                            <td className="px-2 py-2 border border-slate-300 text-center">
                              {linea.indice_severidad}
                            </td>
                            <td className="px-2 py-2 border border-slate-300 text-center font-bold">
                              {linea.valor_riesgo}
                            </td>
                            <td className="px-2 py-2 border border-slate-300 text-center">
                              <span
                                className={`px-1 py-0.5 text-xs font-medium rounded ${getNivelRiesgoColor(
                                  linea.nivel_riesgo,
                                )}`}
                              >
                                {linea.nivel_riesgo}
                              </span>
                            </td>
                            <td className="px-2 py-2 border border-slate-300 text-slate-700 text-xs">
                              {[
                                linea.jerarquia_eliminacion && 'Eliminación',
                                linea.jerarquia_sustitucion && 'Sustitución',
                                linea.jerarquia_controles_ingenieria && 'Ingeniería',
                                linea.jerarquia_controles_admin && 'Admin',
                                linea.jerarquia_epp && 'EPP',
                              ]
                                .filter(Boolean)
                                .join(', ') || '-'}
                            </td>
                            <td className="px-2 py-2 border border-slate-300 text-slate-700 text-xs">
                              {linea.medidas_control}
                            </td>
                            <td className="px-2 py-2 border border-slate-300 text-slate-700 text-xs">
                              {linea.responsable || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Firmas */}
                  <div className="mt-6 grid grid-cols-2 gap-6 pt-4 border-t border-slate-300">
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-2">
                        Elaborado por: {selectedIperc.elaborado_por || '-'}
                      </p>
                      {selectedIperc.firma_elaborador && (
                        <div className="border border-slate-300 rounded p-2">
                          <img
                            src={selectedIperc.firma_elaborador}
                            alt="Firma Elaborador"
                            className="max-h-20 mx-auto"
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-2">
                        Aprobado por: {selectedIperc.aprobado_por || '-'}
                      </p>
                      {selectedIperc.firma_aprobador && (
                        <div className="border border-slate-300 rounded p-2">
                          <img
                            src={selectedIperc.firma_aprobador}
                            alt="Firma Aprobador"
                            className="max-h-20 mx-auto"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Botón de Aprobación (Solo para INGENIERO_SST o SUPER_ADMIN) */}
                {canAprobar &&
                  selectedIperc.estado === EstadoIPERC.Completado &&
                  !selectedIperc.firma_aprobador && (
                    <div className="pt-4 border-t border-slate-200">
                      <h4 className="text-sm font-semibold text-slate-900 mb-3">
                        Aprobar Matriz IPERC
                      </h4>
                      <SignatureCanvas
                        onSave={(dataUrl) => setFirmaAprobador(dataUrl)}
                        initialValue={firmaAprobador}
                      />
                      <div className="mt-4">
                        <Button
                          onClick={() => handleAprobar(selectedIperc.id)}
                          disabled={!firmaAprobador}
                          className="w-full"
                        >
                          <CheckCircle2 className="w-5 h-5 mr-2" />
                          Aprobar y Firmar Matriz
                        </Button>
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
