'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  inspeccionesService,
  Inspeccion,
  TipoInspeccion,
  EstadoInspeccion,
  CriticidadHallazgo,
  CreateInspeccionDto,
  HallazgoDto,
} from '@/services/inspecciones.service';
import { areasService } from '@/services/areas.service';
import { trabajadoresService } from '@/services/trabajadores.service';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ClipboardCheck,
  Plus,
  Search,
  Calendar,
  MapPin,
  User,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const hallazgoSchema = z.object({
  descripcion: z.string().min(1, 'La descripción es obligatoria'),
  criticidad: z.nativeEnum(CriticidadHallazgo),
  accion_correctiva: z.string().min(1, 'La acción correctiva es obligatoria'),
  responsable_id: z.string().uuid('Debe seleccionar un responsable'),
  fecha_limite: z.string().min(1, 'La fecha límite es obligatoria'),
});

const inspeccionSchema = z.object({
  tipo_inspeccion: z.nativeEnum(TipoInspeccion),
  area_id: z.string().uuid().optional().or(z.literal('')),
  inspector_id: z.string().uuid('Debe seleccionar un inspector'),
  observaciones: z.string().optional().or(z.literal('')),
  puntuacion: z.number().int().min(0).max(100),
  hallazgos: z.array(hallazgoSchema).optional(),
  fecha_inspeccion: z.string().min(1, 'La fecha de inspección es obligatoria'),
});

type InspeccionFormData = z.infer<typeof inspeccionSchema>;

export default function InspeccionesPage() {
  const { usuario } = useAuth();
  const [inspecciones, setInspecciones] = useState<Inspeccion[]>([]);
  const [areas, setAreas] = useState<{ id: string; nombre: string }[]>([]);
  const [trabajadores, setTrabajadores] = useState<
    { id: string; nombre_completo: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEstado, setSelectedEstado] = useState<string>('');

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting, isValid },
  } = useForm<InspeccionFormData>({
    resolver: zodResolver(inspeccionSchema),
    mode: 'onChange',
    defaultValues: {
      tipo_inspeccion: TipoInspeccion.SeguridadGeneral,
      area_id: '',
      inspector_id: usuario?.id || '',
      observaciones: '',
      puntuacion: 100,
      hallazgos: [],
      fecha_inspeccion: new Date().toISOString().split('T')[0],
    },
  });

  const {
    fields: hallazgosFields,
    append: appendHallazgo,
    remove: removeHallazgo,
  } = useFieldArray({
    control,
    name: 'hallazgos',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (usuario?.empresaId) {
      loadAreas();
      loadTrabajadores();
    }
  }, [usuario?.empresaId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      await loadInspecciones();
    } catch (error: any) {
      toast.error('Error al cargar datos', {
        description: error.response?.data?.message || 'No se pudieron cargar los datos',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadInspecciones = async () => {
    try {
      const empresaId = usuario?.empresaId || undefined;
      const data = await inspeccionesService.findAll(empresaId);
      setInspecciones(data);
    } catch (error: any) {
      toast.error('Error al cargar inspecciones', {
        description:
          error.response?.data?.message || 'No se pudieron cargar las inspecciones',
      });
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

  const loadTrabajadores = async () => {
    try {
      if (!usuario?.empresaId) return;
      const data = await trabajadoresService.findAll(usuario.empresaId);
      setTrabajadores(
        data.map((t) => ({ id: t.id, nombre_completo: t.nombre_completo })),
      );
    } catch (error) {
      console.error('Error al cargar trabajadores:', error);
      setTrabajadores([]);
    }
  };

  const filteredInspecciones = useMemo(() => {
    return inspecciones.filter((inspeccion) => {
      const matchesSearch =
        searchTerm === '' ||
        inspeccion.area_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inspeccion.inspector_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inspeccion.tipo_inspeccion.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesEstado =
        selectedEstado === '' || inspeccion.estado === selectedEstado;

      return matchesSearch && matchesEstado;
    });
  }, [inspecciones, searchTerm, selectedEstado]);

  const onSubmit = async (data: InspeccionFormData) => {
    if (!usuario?.id || !usuario?.empresaId) {
      toast.error('Error', {
        description: 'No se pudo identificar al usuario o la empresa',
      });
      return;
    }

    try {
      // Si hay hallazgos, el estado será automáticamente "Con Hallazgos Pendientes"
      const hallazgos: HallazgoDto[] | undefined =
        data.hallazgos && data.hallazgos.length > 0
          ? data.hallazgos.map((h) => ({
              descripcion: h.descripcion,
              criticidad: h.criticidad,
              accion_correctiva: h.accion_correctiva,
              responsable_id: h.responsable_id,
              fecha_limite: h.fecha_limite,
            }))
          : undefined;

      const payload: CreateInspeccionDto = {
        tipo_inspeccion: data.tipo_inspeccion,
        fecha_inspeccion: data.fecha_inspeccion,
        puntuacion: data.puntuacion,
        observaciones: data.observaciones && data.observaciones !== '' ? data.observaciones : undefined,
        area_id: data.area_id && data.area_id !== '' ? data.area_id : undefined,
        inspector_id: data.inspector_id,
        empresa_id: usuario.empresaId,
        hallazgos,
      };

      await inspeccionesService.create(payload);
      toast.success('Inspección creada', {
        description: 'La inspección ha sido registrada correctamente',
      });
      setIsModalOpen(false);
      reset({
        tipo_inspeccion: TipoInspeccion.SeguridadGeneral,
        area_id: '',
        inspector_id: usuario.id,
        observaciones: '',
        puntuacion: 100,
        hallazgos: [],
        fecha_inspeccion: new Date().toISOString().split('T')[0],
      });
      loadInspecciones();
    } catch (error: any) {
      toast.error('Error al crear inspección', {
        description: error.response?.data?.message || 'No se pudo crear la inspección',
      });
    }
  };

  const getTipoColor = (tipo: TipoInspeccion) => {
    const colors: Record<TipoInspeccion, string> = {
      [TipoInspeccion.SeguridadGeneral]: 'bg-blue-100 text-blue-800 border-blue-300',
      [TipoInspeccion.EPP]: 'bg-purple-100 text-purple-800 border-purple-300',
      [TipoInspeccion.EquiposMaquinaria]: 'bg-orange-100 text-orange-800 border-orange-300',
      [TipoInspeccion.OrdenLimpieza]: 'bg-green-100 text-green-800 border-green-300',
      [TipoInspeccion.Ambiental]: 'bg-teal-100 text-teal-800 border-teal-300',
      [TipoInspeccion.Ergonómica]: 'bg-pink-100 text-pink-800 border-pink-300',
      [TipoInspeccion.Vehiculos]: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    };
    return colors[tipo] || 'bg-slate-100 text-slate-800 border-slate-300';
  };

  const getEstadoColor = (estado: EstadoInspeccion) => {
    const colors: Record<EstadoInspeccion, string> = {
      [EstadoInspeccion.Planificada]: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      [EstadoInspeccion.Completada]: 'bg-green-100 text-green-800 border-green-300',
      [EstadoInspeccion.ConHallazgosPendientes]: 'bg-red-100 text-red-800 border-red-300',
    };
    return colors[estado];
  };

  const getPuntuacionColor = (puntuacion: number) => {
    if (puntuacion >= 90) return 'bg-green-100 text-green-800 border-green-300';
    if (puntuacion >= 70) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const getCriticidadColor = (criticidad: CriticidadHallazgo) => {
    const colors: Record<CriticidadHallazgo, string> = {
      [CriticidadHallazgo.Baja]: 'bg-green-100 text-green-800',
      [CriticidadHallazgo.Media]: 'bg-yellow-100 text-yellow-800',
      [CriticidadHallazgo.Alta]: 'bg-orange-100 text-orange-800',
      [CriticidadHallazgo.Critica]: 'bg-red-100 text-red-800',
    };
    return colors[criticidad];
  };

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <ClipboardCheck className="w-7 h-7 text-primary" />
                Inspecciones de Seguridad
              </h1>
              <p className="text-slate-600 mt-1">
                Registro y seguimiento de inspecciones preventivas
              </p>
            </div>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Inspección
            </Button>
          </div>

          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Buscar por área, inspector o tipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={selectedEstado}
              onChange={(e) => setSelectedEstado(e.target.value)}
              className="w-full md:w-48"
            >
              <option value="">Todos los estados</option>
              {Object.values(EstadoInspeccion).map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </Select>
          </div>

          {/* Listado */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-lg" />
              ))}
            </div>
          ) : filteredInspecciones.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-white rounded-lg shadow-sm border border-slate-200">
              <ClipboardCheck className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">No hay inspecciones registradas</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredInspecciones.map((inspeccion) => (
                <div
                  key={inspeccion.id}
                  className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
                >
                  {/* Header con badges */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded border ${getTipoColor(
                            inspeccion.tipo_inspeccion,
                          )}`}
                        >
                          {inspeccion.tipo_inspeccion}
                        </span>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded border ${getEstadoColor(
                            inspeccion.estado,
                          )}`}
                        >
                          {inspeccion.estado}
                        </span>
                      </div>
                      <h3 className="font-semibold text-lg text-slate-900">
                        Puntuación: {inspeccion.puntuacion}%
                      </h3>
                    </div>
                    <span
                      className={`px-3 py-1 text-sm font-bold rounded border flex-shrink-0 ${getPuntuacionColor(
                        inspeccion.puntuacion,
                      )}`}
                    >
                      {inspeccion.puntuacion}%
                    </span>
                  </div>

                  {/* Información */}
                  <div className="space-y-2 text-sm text-slate-600 mb-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{inspeccion.area_nombre || 'Sin área asignada'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{inspeccion.inspector_nombre || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(inspeccion.fecha_inspeccion).toLocaleDateString('es-PE', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    {inspeccion.hallazgos && inspeccion.hallazgos.length > 0 && (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <span className="text-red-600 font-medium">
                          {inspeccion.hallazgos.length} hallazgo(s)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Observaciones preview */}
                  {inspeccion.observaciones && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {inspeccion.observaciones}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Modal de Creación */}
          <Modal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              reset({
                tipo_inspeccion: TipoInspeccion.SeguridadGeneral,
                area_id: '',
                inspector_id: usuario?.id || '',
                observaciones: '',
                puntuacion: 100,
                hallazgos: [],
                fecha_inspeccion: new Date().toISOString().split('T')[0],
              });
            }}
            title="Nueva Inspección"
            size="xl"
          >
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto"
            >
              {/* Información General */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
                  Información General
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Tipo de Inspección <span className="text-red-500">*</span>
                    </label>
                    <Select {...register('tipo_inspeccion')}>
                      {Object.values(TipoInspeccion).map((tipo) => (
                        <option key={tipo} value={tipo}>
                          {tipo}
                        </option>
                      ))}
                    </Select>
                    {errors.tipo_inspeccion && (
                      <p className="mt-1 text-sm text-danger">
                        {errors.tipo_inspeccion.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Fecha de Inspección <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      {...register('fecha_inspeccion')}
                    />
                    {errors.fecha_inspeccion && (
                      <p className="mt-1 text-sm text-danger">
                        {errors.fecha_inspeccion.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Área
                    </label>
                    <Select {...register('area_id')}>
                      <option value="">Seleccione un área</option>
                      {areas.map((area) => (
                        <option key={area.id} value={area.id}>
                          {area.nombre}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Inspector <span className="text-red-500">*</span>
                    </label>
                    <Select {...register('inspector_id')}>
                      <option value="">Seleccione un inspector</option>
                      {trabajadores.map((trabajador) => (
                        <option key={trabajador.id} value={trabajador.id}>
                          {trabajador.nombre_completo}
                        </option>
                      ))}
                    </Select>
                    {errors.inspector_id && (
                      <p className="mt-1 text-sm text-danger">
                        {errors.inspector_id.message}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Observaciones
                    </label>
                    <textarea
                      {...register('observaciones')}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Puntuación (0-100) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      {...register('puntuacion', { valueAsNumber: true })}
                    />
                    {errors.puntuacion && (
                      <p className="mt-1 text-sm text-danger">
                        {errors.puntuacion.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Hallazgos */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Hallazgos
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      appendHallazgo({
                        descripcion: '',
                        criticidad: CriticidadHallazgo.Media,
                        accion_correctiva: '',
                        responsable_id: '',
                        fecha_limite: new Date().toISOString().split('T')[0],
                      })
                    }
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Agregar Hallazgo
                  </Button>
                </div>

                {hallazgosFields.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">
                    No hay hallazgos registrados. Agrega uno para comenzar.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {hallazgosFields.map((field, index) => (
                      <div
                        key={field.id}
                        className="bg-slate-50 p-4 rounded-lg border border-slate-200"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-slate-900">
                            Hallazgo #{index + 1}
                          </h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeHallazgo(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Descripción <span className="text-red-500">*</span>
                            </label>
                            <textarea
                              {...register(`hallazgos.${index}.descripcion`)}
                              rows={2}
                              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                            {errors.hallazgos?.[index]?.descripcion && (
                              <p className="mt-1 text-xs text-danger">
                                {errors.hallazgos[index]?.descripcion?.message}
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Criticidad <span className="text-red-500">*</span>
                            </label>
                            <Select
                              {...register(`hallazgos.${index}.criticidad`)}
                            >
                              {Object.values(CriticidadHallazgo).map((crit) => (
                                <option key={crit} value={crit}>
                                  {crit}
                                </option>
                              ))}
                            </Select>
                            {errors.hallazgos?.[index]?.criticidad && (
                              <p className="mt-1 text-xs text-danger">
                                {errors.hallazgos[index]?.criticidad?.message}
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Responsable <span className="text-red-500">*</span>
                            </label>
                            <Select
                              {...register(`hallazgos.${index}.responsable_id`)}
                            >
                              <option value="">Seleccione un responsable</option>
                              {trabajadores.map((trabajador) => (
                                <option key={trabajador.id} value={trabajador.id}>
                                  {trabajador.nombre_completo}
                                </option>
                              ))}
                            </Select>
                            {errors.hallazgos?.[index]?.responsable_id && (
                              <p className="mt-1 text-xs text-danger">
                                {errors.hallazgos[index]?.responsable_id?.message}
                              </p>
                            )}
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Acción Correctiva <span className="text-red-500">*</span>
                            </label>
                            <textarea
                              {...register(`hallazgos.${index}.accion_correctiva`)}
                              rows={2}
                              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                            {errors.hallazgos?.[index]?.accion_correctiva && (
                              <p className="mt-1 text-xs text-danger">
                                {errors.hallazgos[index]?.accion_correctiva?.message}
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Fecha Límite <span className="text-red-500">*</span>
                            </label>
                            <Input
                              type="date"
                              {...register(`hallazgos.${index}.fecha_limite`)}
                            />
                            {errors.hallazgos?.[index]?.fecha_limite && (
                              <p className="mt-1 text-xs text-danger">
                                {errors.hallazgos[index]?.fecha_limite?.message}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Botones */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsModalOpen(false);
                    reset({
                      tipo_inspeccion: TipoInspeccion.SeguridadGeneral,
                      area_id: '',
                      inspector_id: usuario?.id || '',
                      observaciones: '',
                      puntuacion: 100,
                      hallazgos: [],
                      fecha_inspeccion: new Date().toISOString().split('T')[0],
                    });
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting || !isValid}>
                  {isSubmitting ? 'Guardando...' : 'Guardar Inspección'}
                </Button>
              </div>
            </form>
          </Modal>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
