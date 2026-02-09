'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  incidentesService,
  Incidente,
  SeveridadIncidente,
  TipoIncidente,
  EstadoIncidente,
  CreateIncidenteDto,
} from '@/services/incidentes.service';
import { empresasService } from '@/services/empresas.service';
import { trabajadoresService } from '@/services/trabajadores.service';
import { areasService } from '@/services/areas.service';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle,
  Plus,
  Search,
  Calendar,
  MapPin,
  User,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UsuarioRol } from '@/types';

const incidenteSchema = z.object({
  tipo: z.nativeEnum(TipoIncidente),
  severidad: z.nativeEnum(SeveridadIncidente),
  fecha_hora: z.string().min(1, 'La fecha y hora son obligatorias'),
  area_trabajo: z.string().min(1, 'El área de trabajo es obligatoria'),
  descripcion: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
  trabajador_afectado_id: z
    .string()
    .uuid('Debe ser un UUID válido')
    .optional()
    .or(z.literal('')),
  trabajador_afectado: z.string().optional().or(z.literal('')),
  parte_cuerpo_afectada: z.string().optional().or(z.literal('')),
  dias_perdidos: z
    .number()
    .int('Debe ser un número entero')
    .min(0, 'No puede ser negativo')
    .optional()
    .or(z.literal('')),
  causas: z.string().optional().or(z.literal('')),
  testigos: z.string().optional().or(z.literal('')),
  acciones_inmediatas: z.string().optional().or(z.literal('')),
});

type IncidenteFormData = z.infer<typeof incidenteSchema>;

export default function IncidentesPage() {
  const { usuario } = useAuth();
  const [incidentes, setIncidentes] = useState<Incidente[]>([]);
  const [empresas, setEmpresas] = useState<{ id: string; nombre: string }[]>([]);
  const [trabajadores, setTrabajadores] = useState<
    { id: string; nombre_completo: string }[]
  >([]);
  const [areas, setAreas] = useState<{ id: string; nombre: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeveridad, setSelectedSeveridad] = useState<string>('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<IncidenteFormData>({
    resolver: zodResolver(incidenteSchema),
    defaultValues: {
      tipo: TipoIncidente.Incidente,
      severidad: SeveridadIncidente.Leve,
      fecha_hora: new Date().toISOString().slice(0, 16),
      area_trabajo: '',
      descripcion: '',
      trabajador_afectado_id: '',
      trabajador_afectado: '',
      parte_cuerpo_afectada: '',
      dias_perdidos: 0,
      causas: '',
      testigos: '',
      acciones_inmediatas: '',
    },
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const empresaId = usuario?.empresaId;
    if (empresaId) {
      loadTrabajadores(empresaId);
      loadAreas(empresaId);
    }
  }, [usuario?.empresaId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const empresasData = await empresasService.findAll();
      setEmpresas(empresasData.filter((e) => e.activo).map((e) => ({ id: e.id, nombre: e.nombre })));
      await loadIncidentes();
    } catch (error: any) {
      toast.error('Error al cargar datos', {
        description: error.response?.data?.message || 'No se pudieron cargar los datos',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadIncidentes = async () => {
    try {
      const empresaId = usuario?.empresaId || undefined;
      const severidad = selectedSeveridad
        ? (selectedSeveridad as SeveridadIncidente)
        : undefined;
      const search = searchTerm || undefined;
      const data = await incidentesService.findAll(empresaId, severidad, search);
      setIncidentes(data);
    } catch (error: any) {
      toast.error('Error al cargar incidentes', {
        description:
          error.response?.data?.message || 'No se pudieron cargar los incidentes',
      });
    }
  };

  useEffect(() => {
    loadIncidentes();
  }, [selectedSeveridad, searchTerm]);

  const loadTrabajadores = async (empresaId: string) => {
    try {
      const data = await trabajadoresService.findAll(empresaId);
      setTrabajadores(
        data.map((t) => ({ id: t.id, nombre_completo: t.nombre_completo })),
      );
    } catch (error) {
      setTrabajadores([]);
    }
  };

  const loadAreas = async (empresaId: string) => {
    try {
      const data = await areasService.findAll(empresaId);
      setAreas(data.map((a) => ({ id: a.id, nombre: a.nombre })));
    } catch (error) {
      setAreas([]);
    }
  };

  const onSubmit = async (data: IncidenteFormData) => {
    if (!usuario?.id || !usuario?.empresaId) {
      toast.error('Error', {
        description: 'No se pudo identificar al usuario o la empresa',
      });
      return;
    }

    try {
      const payload: CreateIncidenteDto = {
        tipo: data.tipo,
        severidad: data.severidad,
        fecha_hora: new Date(data.fecha_hora).toISOString(),
        area_trabajo: data.area_trabajo,
        descripcion: data.descripcion,
        empresa_id: usuario.empresaId,
        reportado_por_id: usuario.id,
        trabajador_afectado_id:
          data.trabajador_afectado_id && data.trabajador_afectado_id !== ''
            ? data.trabajador_afectado_id
            : undefined,
        trabajador_afectado:
          data.trabajador_afectado && data.trabajador_afectado !== ''
            ? data.trabajador_afectado
            : undefined,
        parte_cuerpo_afectada:
          data.parte_cuerpo_afectada && data.parte_cuerpo_afectada !== ''
            ? data.parte_cuerpo_afectada
            : undefined,
        dias_perdidos: data.dias_perdidos === '' || data.dias_perdidos === undefined ? undefined : Number(data.dias_perdidos),
        causas: data.causas && data.causas !== '' ? data.causas : undefined,
        acciones_inmediatas:
          data.acciones_inmediatas && data.acciones_inmediatas !== ''
            ? data.acciones_inmediatas
            : undefined,
        testigos: data.testigos && data.testigos !== '' ? [{ nombre: data.testigos }] : undefined,
        estado: EstadoIncidente.Reportado,
      };

      await incidentesService.create(payload);
      toast.success('Incidente reportado', {
        description: 'El incidente se ha registrado correctamente',
      });
      setIsModalOpen(false);
      reset();
      loadIncidentes();
    } catch (error: any) {
      toast.error('Error al reportar incidente', {
        description:
          error.response?.data?.message || 'No se pudo registrar el incidente',
      });
    }
  };

  const getSeveridadColor = (severidad: SeveridadIncidente) => {
    switch (severidad) {
      case SeveridadIncidente.Leve:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case SeveridadIncidente.Moderado:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case SeveridadIncidente.Grave:
        return 'bg-red-100 text-red-800 border-red-200';
      case SeveridadIncidente.Fatal:
        return 'bg-red-900 text-white border-red-950';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEstadoColor = (estado: EstadoIncidente) => {
    switch (estado) {
      case EstadoIncidente.Reportado:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case EstadoIncidente.EnInvestigacion:
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case EstadoIncidente.AccionesEnCurso:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case EstadoIncidente.Cerrado:
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Los incidentes ya vienen filtrados del backend, no necesitamos filtrar de nuevo
  const filteredIncidentes = incidentes;

  return (
    <div className="space-y-6 w-full">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-slate-900 mt-0">
                Gestión de Incidentes
              </h1>
              <p className="text-slate-600 mt-2">
                Registro y seguimiento de eventos no deseados
              </p>
            </div>
            <div className="flex-shrink-0">
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="w-5 h-5 mr-2" />
                Reportar Incidente
              </Button>
            </div>
          </div>

          {/* Barra de búsqueda y filtros */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Buscar por descripción, área o trabajador..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={selectedSeveridad}
                onChange={(e) => setSelectedSeveridad(e.target.value)}
              >
                <option value="">Todas las severidades</option>
                {Object.values(SeveridadIncidente).map((severidad) => (
                  <option key={severidad} value={severidad}>
                    {severidad}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Lista de Incidentes */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden w-full">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : filteredIncidentes.length === 0 ? (
              <div className="p-12 text-center">
                <AlertTriangle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">No hay incidentes registrados</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {filteredIncidentes.map((incidente) => (
                  <div
                    key={incidente.id}
                    className="p-6 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-slate-900 text-lg">
                                {incidente.tipo}
                              </h3>
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded border ${getSeveridadColor(
                                  incidente.severidad,
                                )}`}
                              >
                                {incidente.severidad}
                              </span>
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded border ${getEstadoColor(
                                  incidente.estado,
                                )}`}
                              >
                                {incidente.estado}
                              </span>
                            </div>
                            <p className="text-slate-700 line-clamp-2 mb-2">
                              {incidente.descripcion}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {new Date(incidente.fecha_hora).toLocaleString('es-PE', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{incidente.area_trabajo}</span>
                          </div>
                          {incidente.trabajador_afectado && (
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              <span>{incidente.trabajador_afectado}</span>
                            </div>
                          )}
                          {incidente.dias_perdidos > 0 && (
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              <span>{incidente.dias_perdidos} días perdidos</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal de Reporte */}
          <Modal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              reset();
            }}
            title="Reportar Nuevo Incidente"
            size="xl"
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Sección: Clasificación */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
                  Clasificación del Evento
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Tipo de Evento <span className="text-red-500">*</span>
                    </label>
                    <Select {...register('tipo')}>
                      {Object.values(TipoIncidente).map((tipo) => (
                        <option key={tipo} value={tipo}>
                          {tipo}
                        </option>
                      ))}
                    </Select>
                    {errors.tipo && (
                      <p className="mt-1 text-sm text-danger">{errors.tipo.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Severidad <span className="text-red-500">*</span>
                    </label>
                    <Select {...register('severidad')}>
                      {Object.values(SeveridadIncidente).map((severidad) => (
                        <option key={severidad} value={severidad}>
                          {severidad}
                        </option>
                      ))}
                    </Select>
                    {errors.severidad && (
                      <p className="mt-1 text-sm text-danger">
                        {errors.severidad.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Sección: Detalles del Evento */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
                  Detalles del Evento
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Fecha y Hora <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="datetime-local"
                      {...register('fecha_hora')}
                      required
                    />
                    {errors.fecha_hora && (
                      <p className="mt-1 text-sm text-danger">
                        {errors.fecha_hora.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Área de Trabajo <span className="text-red-500">*</span>
                    </label>
                    <Input
                      {...register('area_trabajo')}
                      placeholder="Ej: Planta de Producción, Almacén..."
                      required
                    />
                    {errors.area_trabajo && (
                      <p className="mt-1 text-sm text-danger">
                        {errors.area_trabajo.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Descripción <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    {...register('descripcion')}
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Describe detalladamente qué ocurrió..."
                    required
                  />
                  {errors.descripcion && (
                    <p className="mt-1 text-sm text-danger">
                      {errors.descripcion.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Sección: Personas Involucradas */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
                  Personas Involucradas
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Trabajador Afectado
                    </label>
                    <Select {...register('trabajador_afectado_id')}>
                      <option value="">Seleccionar trabajador...</option>
                      {trabajadores.map((trabajador) => (
                        <option key={trabajador.id} value={trabajador.id}>
                          {trabajador.nombre_completo}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Trabajador Afectado (Texto libre)
                    </label>
                    <Input
                      {...register('trabajador_afectado')}
                      placeholder="Si no está en la lista, escribir nombre..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Testigos
                  </label>
                  <textarea
                    {...register('testigos')}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Nombres y datos de contacto de testigos..."
                  />
                </div>
              </div>

              {/* Sección: Detalles Médicos/Legales */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
                  Detalles Médicos/Legales
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Parte del Cuerpo Afectada
                    </label>
                    <Input
                      {...register('parte_cuerpo_afectada')}
                      placeholder="Ej: Mano derecha, Ojos, Espalda..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Días Perdidos
                    </label>
                    <Input
                      type="number"
                      {...register('dias_perdidos', {
                        valueAsNumber: true,
                        setValueAs: (v) => (v === '' ? undefined : Number(v)),
                      })}
                      min={0}
                      placeholder="0"
                    />
                    {errors.dias_perdidos && (
                      <p className="mt-1 text-sm text-danger">
                        {errors.dias_perdidos.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Sección: Análisis */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
                  Análisis (Investigación)
                </h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Causas
                  </label>
                  <textarea
                    {...register('causas')}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Análisis preliminar de causas..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Acciones Inmediatas
                  </label>
                  <textarea
                    {...register('acciones_inmediatas')}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Qué se hizo al momento: 'Se detuvo la máquina', 'Se llevó a tópico'..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsModalOpen(false);
                    reset();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Reportando...' : 'Reportar Incidente'}
                </Button>
              </div>
            </form>
          </Modal>
        </div>
  );
}
