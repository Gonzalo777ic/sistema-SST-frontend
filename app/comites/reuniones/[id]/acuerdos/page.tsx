'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { comitesService } from '@/services/comites.service';
import { IReunion, IAcuerdo, EstadoAcuerdo, TipoAcuerdo } from '@/types';
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
import { ArrowLeft, Plus, Filter, CheckCircle, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import AcuerdoFormModal from '@/components/comites/AcuerdoFormModal';

export default function ReunionAcuerdosPage() {
  const params = useParams();
  const router = useRouter();
  const reunionId = params.id as string;

  const [reunion, setReunion] = useState<IReunion | null>(null);
  const [acuerdos, setAcuerdos] = useState<IAcuerdo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState<{
    responsable?: string;
    titulo?: string;
    estado?: string;
  }>({});

  useEffect(() => {
    if (reunionId) {
      loadData();
    }
  }, [reunionId, filters]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [reunionData, acuerdosData] = await Promise.all([
        comitesService.findOneReunion(reunionId),
        comitesService.findAllAcuerdos({
          reunion_id: reunionId,
          responsable_id: filters.responsable,
          titulo: filters.titulo,
          estado: filters.estado,
        }),
      ]);

      setReunion(reunionData);
      setAcuerdos(acuerdosData);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || 'Error al cargar los datos'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getEstadoBadge = (estado: EstadoAcuerdo) => {
    const styles = {
      [EstadoAcuerdo.PENDIENTE]: 'bg-yellow-100 text-yellow-800',
      [EstadoAcuerdo.EN_PROCESO]: 'bg-blue-100 text-blue-800',
      [EstadoAcuerdo.APROBADO]: 'bg-green-100 text-green-800',
      [EstadoAcuerdo.ANULADO]: 'bg-red-100 text-red-800',
    };
    const icons = {
      [EstadoAcuerdo.PENDIENTE]: <Clock className="h-3 w-3" />,
      [EstadoAcuerdo.EN_PROCESO]: <Clock className="h-3 w-3" />,
      [EstadoAcuerdo.APROBADO]: <CheckCircle className="h-3 w-3" />,
      [EstadoAcuerdo.ANULADO]: <XCircle className="h-3 w-3" />,
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${styles[estado]}`}
      >
        {icons[estado]}
        {estado.replace('_', ' ')}
      </span>
    );
  };

  const getTipoBadge = (tipo: TipoAcuerdo) => {
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
        {tipo === TipoAcuerdo.INFORMATIVO ? 'Informativo' : 'Con Seguimiento'}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header con navegación */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/comites/reuniones">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Regresar
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Acuerdos de la Reunión
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Gestión de compromisos y seguimiento
            </p>
          </div>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 gap-2"
        >
          <Plus className="h-4 w-4" />
          Nuevo Acuerdo
        </Button>
      </div>

      {/* Header Informativo de la Reunión */}
      {reunion && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Información de la Reunión
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-600 mb-1">Sesión</p>
              <p className="font-medium text-sm">{reunion.sesion}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Fecha</p>
              <p className="font-medium text-sm">
                {new Date(reunion.fecha_realizacion).toLocaleDateString('es-PE')}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Hora</p>
              <p className="font-medium text-sm">{reunion.hora_registro || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Tipo</p>
              <p className="font-medium text-sm">
                {reunion.tipo_reunion === 'ORDINARIA' ? 'Ordinaria' : 'Extraordinaria'}
              </p>
            </div>
            {reunion.lugar && (
              <div className="col-span-2">
                <p className="text-xs text-gray-600 mb-1">Lugar</p>
                <p className="font-medium text-sm">{reunion.lugar}</p>
              </div>
            )}
            {reunion.descripcion && (
              <div className="col-span-2 md:col-span-4">
                <p className="text-xs text-gray-600 mb-1">Descripción</p>
                <p className="text-sm">{reunion.descripcion}</p>
              </div>
            )}
            {reunion.registrado_por && (
              <div>
                <p className="text-xs text-gray-600 mb-1">Registrado por</p>
                <p className="font-medium text-sm">{reunion.registrado_por}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filtros Locales */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700">Filtros</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Responsable
            </label>
            <Input
              placeholder="Buscar por nombre..."
              value={filters.responsable || ''}
              onChange={(e) =>
                setFilters({ ...filters, responsable: e.target.value || undefined })
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Título
            </label>
            <Input
              placeholder="Buscar por título..."
              value={filters.titulo || ''}
              onChange={(e) =>
                setFilters({ ...filters, titulo: e.target.value || undefined })
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
              <option value={EstadoAcuerdo.PENDIENTE}>Pendiente</option>
              <option value={EstadoAcuerdo.EN_PROCESO}>En Proceso</option>
              <option value={EstadoAcuerdo.APROBADO}>Aprobado</option>
              <option value={EstadoAcuerdo.ANULADO}>Anulado</option>
            </Select>
          </div>
        </div>
        <div className="mt-4">
          <Button
            variant="outline"
            onClick={() => setFilters({})}
            className="w-full md:w-auto"
          >
            Limpiar Filtros
          </Button>
        </div>
      </div>

      {/* Tabla de Acuerdos */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : acuerdos.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No hay acuerdos registrados para esta reunión</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-gray-600 font-semibold">Título</TableHead>
                <TableHead className="text-gray-600 font-semibold">Tipo</TableHead>
                <TableHead className="text-gray-600 font-semibold">Estado</TableHead>
                <TableHead className="text-gray-600 font-semibold">Responsables</TableHead>
                <TableHead className="text-gray-600 font-semibold">Fecha Programada</TableHead>
                <TableHead className="text-gray-600 font-semibold">Fecha Real</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {acuerdos.map((acuerdo) => (
                <TableRow key={acuerdo.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{acuerdo.titulo}</TableCell>
                  <TableCell>{getTipoBadge(acuerdo.tipo_acuerdo)}</TableCell>
                  <TableCell>{getEstadoBadge(acuerdo.estado)}</TableCell>
                  <TableCell className="text-gray-600">
                    {acuerdo.responsables && acuerdo.responsables.length > 0 ? (
                      <div className="space-y-1">
                        {acuerdo.responsables.map((r, idx) => (
                          <div key={r.id} className="text-xs">
                            {r.nombre}
                            {idx < acuerdo.responsables.length - 1 && ','}
                          </div>
                        ))}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {acuerdo.fecha_programada
                      ? new Date(acuerdo.fecha_programada).toLocaleDateString('es-PE')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {acuerdo.fecha_real
                      ? new Date(acuerdo.fecha_real).toLocaleDateString('es-PE')
                      : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Modal de Nuevo Acuerdo */}
      {reunion && (
        <AcuerdoFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={loadData}
          reunion={reunion}
        />
      )}
    </div>
  );
}
