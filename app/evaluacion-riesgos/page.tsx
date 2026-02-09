'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  evaluacionRiesgosService,
  EvaluacionRiesgo,
  TipoPeligro,
  Probabilidad,
  Consecuencia,
  NivelRiesgo,
  EstadoEvaluacionRiesgo,
  CreateEvaluacionRiesgoDto,
  calcularNivelRiesgo,
} from '@/services/evaluacion-riesgos.service';
import { areasService } from '@/services/areas.service';
import { trabajadoresService } from '@/services/trabajadores.service';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ShieldAlert,
  Plus,
  Search,
  Calendar,
  MapPin,
  User,
  AlertTriangle,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const evaluacionSchema = z.object({
  actividad: z.string().min(1, 'La actividad es obligatoria'),
  peligro_identificado: z.string().min(1, 'El peligro identificado es obligatorio'),
  tipo_peligro: z.nativeEnum(TipoPeligro),
  fecha_evaluacion: z.string().min(1, 'La fecha de evaluación es obligatoria'),
  probabilidad: z.nativeEnum(Probabilidad),
  consecuencia: z.nativeEnum(Consecuencia),
  nivel_riesgo: z.nativeEnum(NivelRiesgo),
  controles_actuales: z.string().optional().or(z.literal('')),
  area_id: z.string().uuid().optional().or(z.literal('')),
  evaluador_id: z.string().uuid('ID de evaluador inválido'),
});

type EvaluacionFormData = z.infer<typeof evaluacionSchema>;

export default function EvaluacionRiesgosPage() {
  const { usuario } = useAuth();
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionRiesgo[]>([]);
  const [areas, setAreas] = useState<{ id: string; nombre: string }[]>([]);
  const [trabajadores, setTrabajadores] = useState<
    { id: string; nombre_completo: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedEvaluacion, setSelectedEvaluacion] = useState<EvaluacionRiesgo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNivelRiesgo, setSelectedNivelRiesgo] = useState<string>('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting, isValid },
  } = useForm<EvaluacionFormData>({
    resolver: zodResolver(evaluacionSchema),
    mode: 'onChange',
    defaultValues: {
      actividad: '',
      peligro_identificado: '',
      tipo_peligro: TipoPeligro.Fisico,
      fecha_evaluacion: new Date().toISOString().split('T')[0],
      probabilidad: Probabilidad.Media,
      consecuencia: Consecuencia.Moderada,
      nivel_riesgo: NivelRiesgo.Moderado,
      controles_actuales: '',
      area_id: '',
      evaluador_id: usuario?.id || '',
    },
  });

  // Observar cambios en probabilidad y consecuencia para calcular nivel de riesgo
  const probabilidad = watch('probabilidad');
  const consecuencia = watch('consecuencia');

  useEffect(() => {
    if (probabilidad && consecuencia) {
      const nivelCalculado = calcularNivelRiesgo(probabilidad, consecuencia);
      setValue('nivel_riesgo', nivelCalculado, { shouldValidate: true });
    }
  }, [probabilidad, consecuencia, setValue]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (usuario?.empresaId) {
      loadAreas();
      loadTrabajadores();
    }
  }, [usuario?.empresaId]);

  useEffect(() => {
    if (isModalOpen && usuario?.id) {
      setValue('evaluador_id', usuario.id, { shouldValidate: true });
    }
  }, [isModalOpen, usuario?.id, setValue]);

  useEffect(() => {
    if (usuario?.id) {
      setValue('evaluador_id', usuario.id, { shouldValidate: true });
    }
  }, [usuario, setValue]);
  const loadData = async () => {
    try {
      setIsLoading(true);
      await loadEvaluaciones();
    } catch (error: any) {
      toast.error('Error al cargar datos', {
        description: error.response?.data?.message || 'No se pudieron cargar los datos',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadEvaluaciones = async () => {
    try {
      const empresaId = usuario?.empresaId || undefined;
      const data = await evaluacionRiesgosService.findAll(empresaId);
      setEvaluaciones(data);
    } catch (error: any) {
      toast.error('Error al cargar evaluaciones', {
        description:
          error.response?.data?.message || 'No se pudieron cargar las evaluaciones',
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

  // Calcular KPIs
  const kpis = useMemo(() => {
    const intolerables = evaluaciones.filter(
      (e) => e.nivel_riesgo === NivelRiesgo.Intolerable,
    ).length;
    const importantes = evaluaciones.filter(
      (e) => e.nivel_riesgo === NivelRiesgo.Importante,
    ).length;
    const moderados = evaluaciones.filter(
      (e) => e.nivel_riesgo === NivelRiesgo.Moderado,
    ).length;
    const total = evaluaciones.length;

    return { intolerables, importantes, moderados, total };
  }, [evaluaciones]);

  const filteredEvaluaciones = useMemo(() => {
    return evaluaciones.filter((evaluacion) => {
      const matchesSearch =
        searchTerm === '' ||
        evaluacion.actividad.toLowerCase().includes(searchTerm.toLowerCase()) ||
        evaluacion.area_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        evaluacion.peligro_identificado.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesNivel =
        selectedNivelRiesgo === '' || evaluacion.nivel_riesgo === selectedNivelRiesgo;

      return matchesSearch && matchesNivel;
    });
  }, [evaluaciones, searchTerm, selectedNivelRiesgo]);

  const onSubmit = async (data: EvaluacionFormData) => {
    if (!usuario?.id || !usuario?.empresaId) {
      toast.error('Error', {
        description: 'No se pudo identificar al usuario o la empresa',
      });
      return;
    }

    try {
      const payload: CreateEvaluacionRiesgoDto = {
        actividad: data.actividad,
        peligro_identificado: data.peligro_identificado,
        tipo_peligro: data.tipo_peligro,
        fecha_evaluacion: data.fecha_evaluacion,
        probabilidad: data.probabilidad,
        consecuencia: data.consecuencia,
        nivel_riesgo: data.nivel_riesgo,
        controles_actuales:
          data.controles_actuales && data.controles_actuales !== ''
            ? data.controles_actuales
            : undefined,
        area_id: data.area_id && data.area_id !== '' ? data.area_id : undefined,
        evaluador_id: usuario.id,
        empresa_id: usuario.empresaId,
      };

      await evaluacionRiesgosService.create(payload);
      toast.success('Evaluación creada', {
        description: 'La evaluación de riesgo ha sido registrada correctamente',
      });
      setIsModalOpen(false);
      reset({
        actividad: '',
        peligro_identificado: '',
        tipo_peligro: TipoPeligro.Fisico,
        fecha_evaluacion: new Date().toISOString().split('T')[0],
        probabilidad: Probabilidad.Media,
        consecuencia: Consecuencia.Moderada,
        nivel_riesgo: NivelRiesgo.Moderado,
        controles_actuales: '',
        area_id: '',
        evaluador_id: usuario.id,
      });
      loadEvaluaciones();
    } catch (error: any) {
      toast.error('Error al crear evaluación', {
        description:
          error.response?.data?.message || 'No se pudo crear la evaluación de riesgo',
      });
    }
  };

  const getTipoPeligroColor = (tipo: TipoPeligro) => {
    const colors: Record<TipoPeligro, string> = {
      [TipoPeligro.Fisico]: 'bg-blue-100 text-blue-800 border-blue-300',
      [TipoPeligro.Quimico]: 'bg-purple-100 text-purple-800 border-purple-300',
      [TipoPeligro.Biologico]: 'bg-green-100 text-green-800 border-green-300',
      [TipoPeligro.Ergonómico]: 'bg-pink-100 text-pink-800 border-pink-300',
      [TipoPeligro.Psicosocial]: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      [TipoPeligro.Mecanico]: 'bg-orange-100 text-orange-800 border-orange-300',
      [TipoPeligro.Electrico]: 'bg-red-100 text-red-800 border-red-300',
      [TipoPeligro.Locativo]: 'bg-teal-100 text-teal-800 border-teal-300',
    };
    return colors[tipo] || 'bg-slate-100 text-slate-800 border-slate-300';
  };

  const getNivelRiesgoColor = (nivel: NivelRiesgo) => {
    const colors: Record<NivelRiesgo, string> = {
      [NivelRiesgo.Trivial]: 'bg-green-100 text-green-800 border-green-300',
      [NivelRiesgo.Tolerable]: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      [NivelRiesgo.Moderado]: 'bg-orange-100 text-orange-800 border-orange-300',
      [NivelRiesgo.Importante]: 'bg-red-100 text-red-800 border-red-300',
      [NivelRiesgo.Intolerable]: 'bg-red-900 text-white border-red-950',
    };
    return colors[nivel];
  };

  const nivelRiesgoCalculado = watch('nivel_riesgo');

  return (

        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-7 h-7 text-primary" />
                Evaluación de Riesgos
              </h1>
              <p className="text-slate-600 mt-1">
                Registro y seguimiento de evaluaciones de riesgo puntuales
              </p>
            </div>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Evaluación
            </Button>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 font-medium">Intolerables</p>
                  <p className="text-3xl font-bold text-red-900 mt-1">{kpis.intolerables}</p>
                </div>
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 font-medium">Importantes</p>
                  <p className="text-3xl font-bold text-orange-900 mt-1">{kpis.importantes}</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-orange-500" />
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600 font-medium">Moderados</p>
                  <p className="text-3xl font-bold text-yellow-900 mt-1">{kpis.moderados}</p>
                </div>
                <AlertCircle className="w-10 h-10 text-yellow-500" />
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 font-medium">Total</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{kpis.total}</p>
                </div>
                <CheckCircle2 className="w-10 h-10 text-slate-500" />
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Buscar por actividad, área o peligro..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={selectedNivelRiesgo}
              onChange={(e) => setSelectedNivelRiesgo(e.target.value)}
              className="w-full md:w-48"
            >
              <option value="">Todos los niveles</option>
              {Object.values(NivelRiesgo).map((nivel) => (
                <option key={nivel} value={nivel}>
                  {nivel}
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
          ) : filteredEvaluaciones.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-white rounded-lg shadow-sm border border-slate-200">
              <ShieldAlert className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">No hay evaluaciones registradas</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEvaluaciones.map((evaluacion) => (
                <div
                  key={evaluacion.id}
                  className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setSelectedEvaluacion(evaluacion);
                    setIsViewModalOpen(true);
                  }}
                >
                  {/* Header con badges */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-slate-900 mb-2">
                        {evaluacion.actividad}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded border ${getTipoPeligroColor(
                            evaluacion.tipo_peligro,
                          )}`}
                        >
                          {evaluacion.tipo_peligro}
                        </span>
                        <span
                          className={`px-3 py-1 text-sm font-bold rounded border ${getNivelRiesgoColor(
                            evaluacion.nivel_riesgo,
                          )}`}
                        >
                          {evaluacion.nivel_riesgo}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Información */}
                  <div className="space-y-2 text-sm text-slate-600 mb-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="line-clamp-1">{evaluacion.peligro_identificado}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{evaluacion.area_nombre || 'Sin área asignada'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{evaluacion.evaluador_nombre || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(evaluacion.fecha_evaluacion).toLocaleDateString('es-PE', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Botón ver */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEvaluacion(evaluacion);
                      setIsViewModalOpen(true);
                    }}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Ver Detalles
                  </Button>
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
                actividad: '',
                peligro_identificado: '',
                tipo_peligro: TipoPeligro.Fisico,
                fecha_evaluacion: new Date().toISOString().split('T')[0],
                probabilidad: Probabilidad.Media,
                consecuencia: Consecuencia.Moderada,
                nivel_riesgo: NivelRiesgo.Moderado,
                controles_actuales: '',
                area_id: '',
                evaluador_id: usuario?.id || '',
              });
            }}
            title="Nueva Evaluación de Riesgo"
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
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Actividad o Proceso <span className="text-red-500">*</span>
                    </label>
                    <Input {...register('actividad')} />
                    {errors.actividad && (
                      <p className="mt-1 text-sm text-danger">{errors.actividad.message}</p>
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
                      Fecha de Evaluación <span className="text-red-500">*</span>
                    </label>
                    <Input type="date" {...register('fecha_evaluacion')} />
                    {errors.fecha_evaluacion && (
                      <p className="mt-1 text-sm text-danger">
                        {errors.fecha_evaluacion.message}
                      </p>
                    )}
                  </div>

                  <div>
  <label className="block text-sm font-medium text-slate-700 mb-2">
    Evaluador <span className="text-red-500">*</span>
  </label>
  <Input 
    value={usuario?.dni || 'Cargando...'} 
    readOnly 
    className="bg-slate-50 cursor-not-allowed"
  />
  {/* El register asegura que se envíe el UUID del usuario logueado */}
  <input type="hidden" {...register('evaluador_id')} />
</div>
                </div>
              </div>

              {/* Identificación del Peligro */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
                  Identificación del Peligro
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Tipo de Peligro <span className="text-red-500">*</span>
                    </label>
                    <Select {...register('tipo_peligro')}>
                      {Object.values(TipoPeligro).map((tipo) => (
                        <option key={tipo} value={tipo}>
                          {tipo}
                        </option>
                      ))}
                    </Select>
                    {errors.tipo_peligro && (
                      <p className="mt-1 text-sm text-danger">
                        {errors.tipo_peligro.message}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Peligro Identificado <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      {...register('peligro_identificado')}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    {errors.peligro_identificado && (
                      <p className="mt-1 text-sm text-danger">
                        {errors.peligro_identificado.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Valoración */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
                  Valoración
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Probabilidad <span className="text-red-500">*</span>
                    </label>
                    <Select {...register('probabilidad')}>
                      {Object.values(Probabilidad).map((prob) => (
                        <option key={prob} value={prob}>
                          {prob}
                        </option>
                      ))}
                    </Select>
                    {errors.probabilidad && (
                      <p className="mt-1 text-sm text-danger">
                        {errors.probabilidad.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Consecuencia <span className="text-red-500">*</span>
                    </label>
                    <Select {...register('consecuencia')}>
                      {Object.values(Consecuencia).map((cons) => (
                        <option key={cons} value={cons}>
                          {cons}
                        </option>
                      ))}
                    </Select>
                    {errors.consecuencia && (
                      <p className="mt-1 text-sm text-danger">
                        {errors.consecuencia.message}
                      </p>
                    )}
                  </div>

                  {/* Nivel de Riesgo Calculado */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Nivel de Riesgo (Calculado)
                    </label>
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-4 py-2 text-lg font-bold rounded border ${getNivelRiesgoColor(
                          nivelRiesgoCalculado,
                        )}`}
                      >
                        {nivelRiesgoCalculado}
                      </span>
                      <input
                        type="hidden"
                        {...register('nivel_riesgo')}
                        value={nivelRiesgoCalculado}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Calculado automáticamente según la matriz de probabilidad y consecuencia
                    </p>
                  </div>
                </div>
              </div>

              {/* Controles Actuales */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
                  Controles Actuales
                </h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Descripción de Controles
                  </label>
                  <textarea
                    {...register('controles_actuales')}
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              {/* Botones */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsModalOpen(false);
                    reset({
                      actividad: '',
                      peligro_identificado: '',
                      tipo_peligro: TipoPeligro.Fisico,
                      fecha_evaluacion: new Date().toISOString().split('T')[0],
                      probabilidad: Probabilidad.Media,
                      consecuencia: Consecuencia.Moderada,
                      nivel_riesgo: NivelRiesgo.Moderado,
                      controles_actuales: '',
                      area_id: '',
                      evaluador_id: usuario?.id || '',
                    });
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting || !isValid}>
                  {isSubmitting ? 'Guardando...' : 'Guardar Evaluación'}
                </Button>
              </div>
            </form>
          </Modal>

          {/* Modal de Vista Previa */}
          {selectedEvaluacion && (
            <Modal
              isOpen={isViewModalOpen}
              onClose={() => {
                setIsViewModalOpen(false);
                setSelectedEvaluacion(null);
              }}
              title="Detalles de la Evaluación"
              size="xl"
            >
              <div className="space-y-6">
                {/* Cabecera con Nivel de Riesgo */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {selectedEvaluacion.actividad}
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">
                        {selectedEvaluacion.area_nombre || 'Sin área asignada'}
                      </p>
                    </div>
                    <span
                      className={`px-4 py-2 text-lg font-bold rounded border ${getNivelRiesgoColor(
                        selectedEvaluacion.nivel_riesgo,
                      )}`}
                    >
                      {selectedEvaluacion.nivel_riesgo}
                    </span>
                  </div>
                </div>

                {/* Identificación del Peligro */}
                <div className="space-y-3">
                  <h4 className="text-md font-semibold text-slate-900 border-b border-slate-200 pb-2">
                    Identificación del Peligro
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Tipo de Peligro</p>
                      <span
                        className={`inline-block px-2 py-1 text-xs font-medium rounded border mt-1 ${getTipoPeligroColor(
                          selectedEvaluacion.tipo_peligro,
                        )}`}
                      >
                        {selectedEvaluacion.tipo_peligro}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">Fecha de Evaluación</p>
                      <p className="text-sm text-slate-600 mt-1">
                        {new Date(selectedEvaluacion.fecha_evaluacion).toLocaleDateString(
                          'es-PE',
                          {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          },
                        )}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-slate-700">Peligro Identificado</p>
                      <p className="text-sm text-slate-600 mt-1">
                        {selectedEvaluacion.peligro_identificado}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Valoración Técnica */}
                <div className="space-y-3">
                  <h4 className="text-md font-semibold text-slate-900 border-b border-slate-200 pb-2">
                    Valoración Técnica
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Probabilidad</p>
                      <p className="text-sm text-slate-600 mt-1">
                        {selectedEvaluacion.probabilidad}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">Consecuencia</p>
                      <p className="text-sm text-slate-600 mt-1">
                        {selectedEvaluacion.consecuencia}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">Nivel de Riesgo</p>
                      <span
                        className={`inline-block px-3 py-1 text-sm font-bold rounded border mt-1 ${getNivelRiesgoColor(
                          selectedEvaluacion.nivel_riesgo,
                        )}`}
                      >
                        {selectedEvaluacion.nivel_riesgo}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Controles Actuales */}
                {selectedEvaluacion.controles_actuales && (
                  <div className="space-y-3">
                    <h4 className="text-md font-semibold text-slate-900 border-b border-slate-200 pb-2">
                      Controles Actuales
                    </h4>
                    <p className="text-sm text-slate-600">
                      {selectedEvaluacion.controles_actuales}
                    </p>
                  </div>
                )}

                {/* Información Adicional */}
                <div className="space-y-3 pt-4 border-t border-slate-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-slate-700">Evaluador</p>
                      <p className="text-slate-600 mt-1">
                        {selectedEvaluacion.evaluador_nombre || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-slate-700">Estado</p>
                      <p className="text-slate-600 mt-1">{selectedEvaluacion.estado}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Modal>
          )}
        </div>

  );
}
