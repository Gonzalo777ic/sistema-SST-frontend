'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { comitesService } from '@/services/comites.service';
import { empresasService } from '@/services/empresas.service';
import { IReunion, EstadoReunion, TipoReunion } from '@/types';
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
  Plus,
  FileText,
  Calendar,
  Filter,
  Download,
  Eye,
  List,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import ReunionFormModal from '@/components/comites/ReunionFormModal';

export default function ReunionesPage() {
  const router = useRouter();
  const [reuniones, setReuniones] = useState<IReunion[]>([]);
  const [comites, setComites] = useState<{ id: string; nombre: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reunionDetalle, setReunionDetalle] = useState<IReunion | null>(null);
  const [filters, setFilters] = useState<{
    descripcion?: string;
    estado?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
    comite_id?: string;
  }>({});

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [reunionesData, comitesData] = await Promise.all([
        comitesService.findAllReuniones({
          comite_id: filters.comite_id,
          estado: filters.estado,
          fecha_desde: filters.fecha_desde,
          fecha_hasta: filters.fecha_hasta,
        }),
        comitesService.findAll(),
      ]);

      setReuniones(reunionesData);
      setComites(comitesData.map((c) => ({ id: c.id, nombre: c.nombre })));
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || 'Error al cargar las reuniones'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportarActa = (reunion: IReunion) => {
    // TODO: Implementar exportación de acta
    console.log('Exportar acta de reunión:', reunion.id);
    toast.info('Funcionalidad de exportación en desarrollo');
  };

  const handleVerDetalle = async (reunionId: string) => {
    try {
      const reunion = await comitesService.findOneReunion(reunionId);
      setReunionDetalle(reunion);
    } catch (error: any) {
      toast.error('Error al cargar los detalles de la reunión');
    }
  };

  const getEstadoBadge = (estado: EstadoReunion) => {
    const styles = {
      [EstadoReunion.PENDIENTE]: 'bg-yellow-100 text-yellow-800',
      [EstadoReunion.COMPLETADA]: 'bg-green-100 text-green-800',
      [EstadoReunion.CANCELADA]: 'bg-red-100 text-red-800',
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${styles[estado]}`}
      >
        {estado}
      </span>
    );
  };

  const getTipoBadge = (tipo: TipoReunion) => {
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        {tipo === TipoReunion.ORDINARIA ? 'Ordinaria' : 'Extraordinaria'}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Reuniones</h1>
          <p className="text-sm text-gray-600 mt-1">
            Administra las sesiones y actas del comité
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/comites/acuerdos">
            <Button variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              Seguimiento de Acuerdos
            </Button>
          </Link>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            <Plus className="h-4 w-4" />
            Nueva Reunión
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700">Filtros de búsqueda</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <Input
              placeholder="Buscar por descripción..."
              value={filters.descripcion || ''}
              onChange={(e) =>
                setFilters({ ...filters, descripcion: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Estado
            </label>
            <Select
              value={filters.estado || ''}
              onChange={(e) =>
                setFilters({ ...filters, estado: e.target.value || undefined })
              }
            >
              <option value="">Todos</option>
              <option value={EstadoReunion.PENDIENTE}>Pendiente</option>
              <option value={EstadoReunion.COMPLETADA}>Completada</option>
              <option value={EstadoReunion.CANCELADA}>Cancelada</option>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Comité
            </label>
            <Select
              value={filters.comite_id || ''}
              onChange={(e) =>
                setFilters({ ...filters, comite_id: e.target.value || undefined })
              }
            >
              <option value="">Todos</option>
              {comites.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Fecha Desde
            </label>
            <Input
              type="date"
              value={filters.fecha_desde || ''}
              onChange={(e) =>
                setFilters({ ...filters, fecha_desde: e.target.value || undefined })
              }
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Fecha Hasta
            </label>
            <Input
              type="date"
              value={filters.fecha_hasta || ''}
              onChange={(e) =>
                setFilters({ ...filters, fecha_hasta: e.target.value || undefined })
              }
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => setFilters({})}
              className="w-full"
            >
              Limpiar Filtros
            </Button>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : reuniones.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No hay reuniones registradas</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-gray-600 font-semibold">Sesión</TableHead>
                <TableHead className="text-gray-600 font-semibold">Comité</TableHead>
                <TableHead className="text-gray-600 font-semibold">Fecha</TableHead>
                <TableHead className="text-gray-600 font-semibold">Tipo</TableHead>
                <TableHead className="text-gray-600 font-semibold">Estado</TableHead>
                <TableHead className="text-gray-600 font-semibold">Acuerdos</TableHead>
                <TableHead className="text-gray-600 font-semibold">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reuniones.map((reunion) => (
                <TableRow key={reunion.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{reunion.sesion}</TableCell>
                  <TableCell className="text-gray-600">
                    {comites.find((c) => c.id === reunion.comite_id)?.nombre || '-'}
                  </TableCell>
                  <TableCell>
                    {new Date(reunion.fecha_realizacion).toLocaleDateString('es-PE')}
                  </TableCell>
                  <TableCell>{getTipoBadge(reunion.tipo_reunion)}</TableCell>
                  <TableCell>{getEstadoBadge(reunion.estado)}</TableCell>
                  <TableCell className="text-center">
                    {reunion.nro_acuerdos || 0}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExportarActa(reunion)}
                        className="h-8 w-8 p-0"
                        title="Exportar Acta"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Link href={`/comites/reuniones/${reunion.id}/acuerdos`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="Ver Acuerdos"
                        >
                          <List className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/comites/reuniones/${reunion.id}/acuerdos`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="Agregar Acuerdo"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleVerDetalle(reunion.id)}
                        className="h-8 w-8 p-0"
                        title="Ver Detalle"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Modal de Nueva Reunión */}
      <ReunionFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
      />

      {/* Modal de Detalle */}
      {reunionDetalle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Detalle de Reunión</h2>
              <Button variant="ghost" onClick={() => setReunionDetalle(null)}>
                ✕
              </Button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Sesión</p>
                  <p className="font-medium">{reunionDetalle.sesion}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Comité</p>
                  <p className="font-medium">{reunionDetalle.comite_nombre || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fecha</p>
                  <p className="font-medium">
                    {new Date(reunionDetalle.fecha_realizacion).toLocaleDateString('es-PE')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Hora</p>
                  <p className="font-medium">{reunionDetalle.hora_registro || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Lugar</p>
                  <p className="font-medium">{reunionDetalle.lugar || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tipo</p>
                  <p className="font-medium">{getTipoBadge(reunionDetalle.tipo_reunion)}</p>
                </div>
              </div>
              {reunionDetalle.descripcion && (
                <div>
                  <p className="text-sm text-gray-600">Descripción</p>
                  <p className="text-sm">{reunionDetalle.descripcion}</p>
                </div>
              )}
              {reunionDetalle.agenda && reunionDetalle.agenda.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Agenda</p>
                  <ol className="list-decimal list-inside space-y-1">
                    {reunionDetalle.agenda.map((item, index) => (
                      <li key={item.id} className="text-sm">
                        {item.descripcion}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
