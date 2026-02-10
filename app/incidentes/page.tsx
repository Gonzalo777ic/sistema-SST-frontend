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
import { areasService, Area } from '@/services/areas.service';
import { trabajadoresService } from '@/services/trabajadores.service';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle,
  Plus,
  ChevronDown,
  ChevronUp,
  Package,
  Eye,
  FileText,
  ClipboardList,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';

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
  const [areas, setAreas] = useState<Area[]>([]);
  const [trabajadores, setTrabajadores] = useState<
    { id: string; nombre_completo: string; documento_identidad: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estados de filtros
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<TipoIncidente | ''>('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoIncidente | ''>('');
  const [filtroSeveridad, setFiltroSeveridad] = useState<SeveridadIncidente | ''>('');
  const [filtroUnidad, setFiltroUnidad] = useState('');
  const [filtroArea, setFiltroArea] = useState('');
  const [filtroSede, setFiltroSede] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');

  const {
    register,
    handleSubmit,
    reset,
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
    loadIncidentes();
  }, [
    filtroBusqueda,
    filtroTipo,
    filtroEstado,
    filtroSeveridad,
    filtroUnidad,
    filtroArea,
    filtroSede,
    filtroFechaDesde,
    filtroFechaHasta,
  ]);

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
      await loadIncidentes();
    } catch (error: any) {
      toast.error('Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  };

  const loadIncidentes = async () => {
    try {
      const empresaId = usuario?.empresaId || undefined;
      const data = await incidentesService.findAll(
        empresaId,
        filtroSeveridad || undefined,
        filtroBusqueda || undefined,
        filtroTipo || undefined,
        filtroEstado || undefined,
        filtroFechaDesde || undefined,
        filtroFechaHasta || undefined,
        filtroUnidad || undefined,
        filtroArea || undefined,
        filtroSede || undefined,
      );
      setIncidentes(data);
    } catch (error: any) {
      toast.error('Error al cargar incidentes', {
        description:
          error.response?.data?.message || 'No se pudieron cargar los incidentes',
      });
    }
  };

  const loadTrabajadores = async (empresaId: string) => {
    try {
      const data = await trabajadoresService.findAll(empresaId);
      setTrabajadores(
        data.map((t) => ({
          id: t.id,
          nombre_completo: t.nombre_completo,
          documento_identidad: t.documento_identidad,
        })),
      );
    } catch (error) {
      setTrabajadores([]);
    }
  };

  const loadAreas = async (empresaId: string) => {
    try {
      const data = await areasService.findAll(empresaId);
      setAreas(data);
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
        dias_perdidos:
          data.dias_perdidos === '' || data.dias_perdidos === undefined
            ? undefined
            : Number(data.dias_perdidos),
        causas: data.causas && data.causas !== '' ? data.causas : undefined,
        acciones_inmediatas:
          data.acciones_inmediatas && data.acciones_inmediatas !== ''
            ? data.acciones_inmediatas
            : undefined,
        testigos:
          data.testigos && data.testigos !== ''
            ? [{ nombre: data.testigos }]
            : undefined,
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
        return 'bg-yellow-100 text-yellow-800';
      case SeveridadIncidente.Moderado:
        return 'bg-orange-100 text-orange-800';
      case SeveridadIncidente.Grave:
        return 'bg-red-100 text-red-800';
      case SeveridadIncidente.Fatal:
        return 'bg-red-900 text-white';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEstadoColor = (estado: EstadoIncidente) => {
    switch (estado) {
      case EstadoIncidente.Reportado:
        return 'bg-blue-100 text-blue-800';
      case EstadoIncidente.EnInvestigacion:
        return 'bg-purple-100 text-purple-800';
      case EstadoIncidente.AccionesEnCurso:
        return 'bg-yellow-100 text-yellow-800';
      case EstadoIncidente.Cerrado:
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleVerMedidas = (incidente: Incidente) => {
    // Navegar a vista de medidas correctivas filtradas por este incidente
    toast.info('Funcionalidad en desarrollo');
  };

  const handleAgregarMedida = (incidente: Incidente) => {
    // Abrir modal para crear medida correctiva vinculada a este incidente
    toast.info('Funcionalidad en desarrollo');
  };

  const handleVerDetalle = (incidente: Incidente) => {
    // Abrir modal o navegar a página de detalle
    toast.info('Funcionalidad en desarrollo');
  };

  return (
    <>
      <div className="space-y-6">
        {/* Cabecera */}
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-slate-900">Accidentes / Incidentes</h1>
        </div>

        {/* Filtros de Búsqueda (Collapsible) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
          >
            <span className="font-medium text-gray-700">&gt; Filtros de búsqueda</span>
            {showFilters ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>

          {showFilters && (
            <div className="p-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Búsqueda texto (Nombre/DNI, Usuario registrador, Título, Código)
                  </label>
                  <Input
                    value={filtroBusqueda}
                    onChange={(e) => setFiltroBusqueda(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <Select
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value as TipoIncidente | '')}
                  >
                    <option value="">Todos</option>
                    {Object.values(TipoIncidente).map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <Select
                    value={filtroEstado}
                    onChange={(e) =>
                      setFiltroEstado(e.target.value as EstadoIncidente | '')
                    }
                  >
                    <option value="">Todos</option>
                    {Object.values(EstadoIncidente).map((estado) => (
                      <option key={estado} value={estado}>
                        {estado}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gravedad
                  </label>
                  <Select
                    value={filtroSeveridad}
                    onChange={(e) =>
                      setFiltroSeveridad(e.target.value as SeveridadIncidente | '')
                    }
                  >
                    <option value="">Todas</option>
                    {Object.values(SeveridadIncidente).map((severidad) => (
                      <option key={severidad} value={severidad}>
                        {severidad}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jerarquía: Unidad
                  </label>
                  <Input
                    value={filtroUnidad}
                    onChange={(e) => setFiltroUnidad(e.target.value)}
                    placeholder="Buscar unidad..."
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jerarquía: Área
                  </label>
                  <Select
                    value={filtroArea}
                    onChange={(e) => setFiltroArea(e.target.value)}
                  >
                    <option value="">Todas</option>
                    {areas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.nombre}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jerarquía: Sede
                  </label>
                  <Input
                    value={filtroSede}
                    onChange={(e) => setFiltroSede(e.target.value)}
                    placeholder="Buscar sede..."
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de ocurrencia (Desde)
                  </label>
                  <Input
                    type="date"
                    value={filtroFechaDesde}
                    onChange={(e) => setFiltroFechaDesde(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de ocurrencia (Hasta)
                  </label>
                  <Input
                    type="date"
                    value={filtroFechaHasta}
                    onChange={(e) => setFiltroFechaHasta(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Barra de Herramientas */}
        <div className="flex justify-end gap-2">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <FileText className="w-4 h-4 mr-2" />
            Reporte
          </Button>
          <Link href="/acciones-correctivas">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <ClipboardList className="w-4 h-4 mr-2" />
              Medidas correctivas
            </Button>
          </Link>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo registro
          </Button>
        </div>

        {/* Tabla de Datos */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Ubicación
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Clasificación
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Título Compuesto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Involucrado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Medidas
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <tr key={i}>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((j) => (
                          <td key={j} className="px-4 py-4">
                            <Skeleton className="h-4 w-full" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                ) : incidentes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Sin Información</p>
                    </td>
                  </tr>
                ) : (
                  incidentes.map((incidente) => (
                    <tr key={incidente.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(incidente.fecha_hora).toLocaleDateString('es-PE', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {incidente.sede || incidente.area_nombre || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {incidente.tipo}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {incidente.codigo_correlativo
                              ? `COD: ${incidente.codigo_correlativo}`
                              : 'Sin código'}
                          </span>
                          <span className="text-gray-600">
                            {incidente.tipo} - {incidente.descripcion.substring(0, 50)}
                            {incidente.descripcion.length > 50 ? '...' : ''}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex flex-col">
                          <span>
                            {incidente.trabajador_afectado_dni || '-'}
                          </span>
                          <span className="text-gray-600">
                            {incidente.trabajador_afectado || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        {incidente.total_medidas > 0 ? (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-900">
                              {incidente.medidas_aprobadas} aprobadas / {incidente.total_medidas}{' '}
                              totales
                            </span>
                            {incidente.medidas_aprobadas === incidente.total_medidas ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-yellow-600" />
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">Sin medidas</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${getEstadoColor(
                            incidente.estado,
                          )}`}
                        >
                          {incidente.estado}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleVerMedidas(incidente)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Ver Medidas"
                          >
                            <ClipboardList className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAgregarMedida(incidente)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Agregar Medida"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleVerDetalle(incidente)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Ver Detalle"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
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
    </>
  );
}
