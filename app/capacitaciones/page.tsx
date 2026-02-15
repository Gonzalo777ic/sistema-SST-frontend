'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { capacitacionesService, Capacitacion, CreateCapacitacionDto, TipoCapacitacion, EstadoCapacitacion } from '@/services/capacitaciones.service';
import { empresasService, Empresa } from '@/services/empresas.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Monitor,
  ChevronDown,
  ChevronRight,
  FileText,
  Settings,
  Search,
  Upload,
  Plus,
  Package,
  Eye,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Modal } from '@/components/ui/modal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const TIPOS_ACTIVIDAD = [
  TipoCapacitacion.Capacitacion,
  TipoCapacitacion.CapacitacionObligatoria,
  TipoCapacitacion.Charla,
  TipoCapacitacion.Charla5Minutos,
  TipoCapacitacion.CharlaSST,
  TipoCapacitacion.PausasActivas,
  TipoCapacitacion.SimulacroEmergencia,
  TipoCapacitacion.TomaConsciencia,
];

const ESTADOS = [
  { value: '', label: 'Todos' },
  { value: EstadoCapacitacion.Pendiente, label: 'PENDIENTE' },
  { value: EstadoCapacitacion.Programada, label: 'PROGRAMADA' },
  { value: EstadoCapacitacion.Completada, label: 'COMPLETADA' },
  { value: EstadoCapacitacion.Cancelada, label: 'Cancelada' },
];

const registrarSchema = z.object({
  empresa_id: z.string().optional(),
  tipo: z.nativeEnum(TipoCapacitacion),
  descripcion: z.string().optional(),
  tema: z.string().min(1, 'El tema es obligatorio'),
  fecha_inicio: z.string().min(1, 'La fecha de inicio es obligatoria'),
  fecha_fin: z.string().min(1, 'La fecha de fin es obligatoria'),
  duracion_hhmm: z.string().min(1, 'La duración es obligatoria'),
  nombre_capacitador: z.string().optional(),
});

type RegistrarFormData = z.infer<typeof registrarSchema>;

function getInicioAnio(): string {
  const d = new Date();
  d.setMonth(0, 1);
  return d.toISOString().split('T')[0];
}

function getManana(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export default function CapacitacionesPage() {
  const { usuario, empresasVinculadas } = useAuth();
  const [capacitaciones, setCapacitaciones] = useState<Capacitacion[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(true);
  const [modalRegistrar, setModalRegistrar] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [filtros, setFiltros] = useState({
    tipo: '',
    tema: '',
    fecha_desde: getInicioAnio(),
    fecha_hasta: getManana(),
    estado: '',
    razon_social: '',
    grupo: '',
    area: '',
    responsable: '',
    unidad: '',
  });

  const registrarForm = useForm<RegistrarFormData>({
    resolver: zodResolver(registrarSchema),
    defaultValues: {
      empresa_id: '',
      tipo: TipoCapacitacion.Capacitacion,
      descripcion: '',
      tema: '',
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_fin: new Date().toISOString().split('T')[0],
      duracion_hhmm: '02:00',
      nombre_capacitador: '',
    },
  });

  useEffect(() => {
    loadCapacitaciones();
  }, [usuario?.empresaId]);

  useEffect(() => {
    loadEmpresas();
  }, [empresasVinculadas?.length]);

  const loadEmpresas = async () => {
    try {
      const data = await empresasService.findAll();
      setEmpresas(data);
    } catch {
      const fallback: Empresa[] = empresasVinculadas.map((e) => ({
        id: e.id,
        nombre: e.nombre,
        ruc: '',
        direccion: null,
        actividad_economica: null,
        numero_trabajadores: 0,
        logoUrl: e.logoUrl,
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      setEmpresas(fallback);
    }
  };

  const loadCapacitaciones = async () => {
    try {
      setIsLoading(true);
      const data = await capacitacionesService.findAll({
        empresaId: usuario?.empresaId,
        tipo: filtros.tipo || undefined,
        tema: filtros.tema || undefined,
        fechaDesde: filtros.fecha_desde || undefined,
        fechaHasta: filtros.fecha_hasta || undefined,
        estado: filtros.estado || undefined,
        razonSocial: filtros.razon_social || undefined,
        grupo: filtros.grupo || undefined,
        area: filtros.area || undefined,
        responsable: filtros.responsable || undefined,
        unidad: filtros.unidad || undefined,
      });
      setCapacitaciones(data);
    } catch (error: any) {
      toast.error('Error al cargar capacitaciones', {
        description: error.response?.data?.message || 'No se pudieron cargar las capacitaciones',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitRegistrar = async (data: RegistrarFormData) => {
    if (!usuario) return;

    setIsSubmitting(true);
    try {
      const [h, m] = data.duracion_hhmm.split(':').map(Number);
      const payload: CreateCapacitacionDto = {
        titulo: data.tema,
        descripcion: data.descripcion || data.tema,
        tipo: data.tipo,
        fecha: data.fecha_inicio,
        fecha_fin: data.fecha_fin,
        duracion_hhmm: data.duracion_hhmm,
        instructor: data.nombre_capacitador || undefined,
        estado: EstadoCapacitacion.Pendiente,
        empresa_id: data.empresa_id || usuario.empresaId || undefined,
        creado_por_id: usuario.id,
      };

      await capacitacionesService.create(payload);
      toast.success('Capacitación registrada', {
        description: 'La capacitación se ha registrado con estado PENDIENTE',
      });
      setModalRegistrar(false);
      registrarForm.reset();
      loadCapacitaciones();
    } catch (error: any) {
      toast.error('Error al registrar', {
        description: error.response?.data?.message || 'No se pudo registrar la capacitación',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    const styles: Record<string, string> = {
      PENDIENTE: 'bg-amber-100 text-amber-800',
      PROGRAMADA: 'bg-sky-100 text-sky-800',
      COMPLETADA: 'bg-green-100 text-green-800',
      Cancelada: 'bg-red-100 text-red-800',
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${styles[estado] || 'bg-gray-100 text-gray-800'}`}
      >
        {estado}
      </span>
    );
  };

  const puedeDescargar = (estado: string) =>
    estado === EstadoCapacitacion.Completada || estado === EstadoCapacitacion.Programada;


  return (
    <div className="p-6 space-y-6">
      {/* A. CABECERA */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Programación de Capacitaciones</h1>
          <Monitor className="h-6 w-6 text-blue-600" />
        </div>
      </div>

      {/* B. FILTROS */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setFiltrosAbiertos(!filtrosAbiertos)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <span className="text-sm font-semibold text-gray-700">
            {filtrosAbiertos ? <ChevronDown className="h-4 w-4 inline mr-2" /> : <ChevronRight className="h-4 w-4 inline mr-2" />}
            Filtros de búsqueda
          </span>
        </button>
        {filtrosAbiertos && (
          <div className="border-t border-gray-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
                <Select
                  value={filtros.tipo}
                  onChange={(e) => setFiltros((f) => ({ ...f, tipo: e.target.value }))}
                >
                  <option value="">Todos</option>
                  {TIPOS_ACTIVIDAD.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tema</label>
                <Input
                  placeholder="Tema"
                  value={filtros.tema}
                  onChange={(e) => setFiltros((f) => ({ ...f, tema: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Fecha de programación (desde)</label>
                <Input
                  type="date"
                  value={filtros.fecha_desde}
                  onChange={(e) => setFiltros((f) => ({ ...f, fecha_desde: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Fecha de programación (hasta)</label>
                <Input
                  type="date"
                  value={filtros.fecha_hasta}
                  onChange={(e) => setFiltros((f) => ({ ...f, fecha_hasta: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Estado</label>
                <Select
                  value={filtros.estado}
                  onChange={(e) => setFiltros((f) => ({ ...f, estado: e.target.value }))}
                >
                  {ESTADOS.map((e) => (
                    <option key={e.value || 'all'} value={e.value}>{e.label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Razón social</label>
                <Select
                  value={filtros.razon_social}
                  onChange={(e) => setFiltros((f) => ({ ...f, razon_social: e.target.value }))}
                >
                  <option value="">Todos</option>
                  {empresas.map((emp) => (
                    <option key={emp.id} value={emp.nombre}>{emp.nombre}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Grupo</label>
                <Input
                  placeholder="Grupo"
                  value={filtros.grupo}
                  onChange={(e) => setFiltros((f) => ({ ...f, grupo: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Área</label>
                <Input
                  placeholder="Área"
                  value={filtros.area}
                  onChange={(e) => setFiltros((f) => ({ ...f, area: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Responsable de registro</label>
                <Input
                  placeholder="Responsable"
                  value={filtros.responsable}
                  onChange={(e) => setFiltros((f) => ({ ...f, responsable: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Unidad</label>
                <Input
                  placeholder="Unidad"
                  value={filtros.unidad}
                  onChange={(e) => setFiltros((f) => ({ ...f, unidad: e.target.value }))}
                />
              </div>
            </div>
            <div className="mt-4">
              <Button variant="primary" size="sm" onClick={loadCapacitaciones}>
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* C. BARRA DE HERRAMIENTAS */}
      <div className="flex flex-wrap gap-2">
        <Button variant="primary">
          <FileText className="h-4 w-4 mr-2" />
          Reporte
        </Button>
        <Button variant="primary">
          <Settings className="h-4 w-4 mr-2" />
          Configuración
        </Button>
        <Button variant="primary">
          <Search className="h-4 w-4 mr-2" />
          Buscar por trabajador
        </Button>
        <Button variant="primary">
          <Upload className="h-4 w-4 mr-2" />
          Importar capacitaciones
        </Button>
        <Button variant="primary" onClick={() => setModalRegistrar(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Registrar capacitación
        </Button>
      </div>

      {/* Modal Registrar */}
      <Modal
        isOpen={modalRegistrar}
        onClose={() => setModalRegistrar(false)}
        title="Registrar capacitación"
        size="lg"
      >
        <form onSubmit={registrarForm.handleSubmit(onSubmitRegistrar)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Razón social *</label>
            <Select {...registrarForm.register('empresa_id')}>
              <option value="">Todos</option>
              {empresas.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.nombre}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de actividad *</label>
            <Select {...registrarForm.register('tipo')}>
              {TIPOS_ACTIVIDAD.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Descripción</label>
            <Input {...registrarForm.register('descripcion')} placeholder="Descripción de la capacitación" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tema *</label>
            <Input {...registrarForm.register('tema')} placeholder="Tema de la capacitación" />
            {registrarForm.formState.errors.tema && (
              <p className="mt-1 text-sm text-red-600">{registrarForm.formState.errors.tema.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Fecha inicio *</label>
              <Input type="date" {...registrarForm.register('fecha_inicio')} />
              {registrarForm.formState.errors.fecha_inicio && (
                <p className="mt-1 text-sm text-red-600">{registrarForm.formState.errors.fecha_inicio.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Fecha fin *</label>
              <Input type="date" {...registrarForm.register('fecha_fin')} />
              {registrarForm.formState.errors.fecha_fin && (
                <p className="mt-1 text-sm text-red-600">{registrarForm.formState.errors.fecha_fin.message}</p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Nro de horas/minutos *</label>
            <Input
              type="time"
              {...registrarForm.register('duracion_hhmm')}
              placeholder="02:40"
            />
            <p className="text-xs text-slate-500 mt-1">Formato HH:MM (ej: 02:40 = 2h 40min)</p>
            {registrarForm.formState.errors.duracion_hhmm && (
              <p className="mt-1 text-sm text-red-600">{registrarForm.formState.errors.duracion_hhmm.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Nombre del capacitador</label>
            <Input
              {...registrarForm.register('nombre_capacitador')}
              placeholder="Nombre (interno o externo)"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setModalRegistrar(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Registrando...' : 'Registrar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* D. TABLA */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : capacitaciones.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Sin Información</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-gray-600 text-xs font-semibold">Sede</TableHead>
                  <TableHead className="text-gray-600 text-xs font-semibold">Razón social / Unidad</TableHead>
                  <TableHead className="text-gray-600 text-xs font-semibold">Asignación / Trab. / %</TableHead>
                  <TableHead className="text-gray-600 text-xs font-semibold">Tipo/Tema</TableHead>
                  <TableHead className="text-gray-600 text-xs font-semibold">Estado</TableHead>
                  <TableHead className="text-gray-600 text-xs font-semibold">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {capacitaciones.map((cap) => {
                  const participantes = cap.participantes?.length || 0;
                  const asistentes = cap.participantes?.filter((p) => p.asistencia).length || 0;
                  const porcentaje = participantes > 0 ? Math.round((asistentes / participantes) * 100) : 0;
                  return (
                    <TableRow key={cap.id} className="hover:bg-gray-50">
                      <TableCell className="text-sm">{cap.sede || '-'}</TableCell>
                      <TableCell className="text-sm">
                        <div>
                          <div className="font-medium">{cap.empresa_nombre || '-'}</div>
                          <div className="text-xs text-gray-500">{cap.unidad || '-'}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="space-y-1">
                          <div>{participantes}</div>
                          <div className="text-xs text-gray-600">{porcentaje}%</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>
                          <div className="font-medium">{cap.tipo}</div>
                          <div className="text-xs text-gray-600">{cap.titulo}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getEstadoBadge(cap.estado)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {puedeDescargar(cap.estado) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => toast.info('Descarga: Próximamente')}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          <Link href={`/capacitaciones/${cap.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
