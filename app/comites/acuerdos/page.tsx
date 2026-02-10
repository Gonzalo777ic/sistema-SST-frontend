'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { comitesService } from '@/services/comites.service';
import { IAcuerdo, EstadoAcuerdo, TipoAcuerdo } from '@/types';
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
import { ArrowLeft, Filter, CheckCircle, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function AcuerdosPage() {
  const router = useRouter();
  const [acuerdos, setAcuerdos] = useState<IAcuerdo[]>([]);
  const [comites, setComites] = useState<{ id: string; nombre: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<{
    responsable?: string;
    titulo?: string;
    comite_id?: string;
    tipo_acuerdo?: string;
    estado?: string;
  }>({});

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [acuerdosData, comitesData] = await Promise.all([
        comitesService.findAllAcuerdos({
          comite_id: filters.comite_id,
          responsable_id: filters.responsable,
          titulo: filters.titulo,
          tipo_acuerdo: filters.tipo_acuerdo,
          estado: filters.estado,
        }),
        comitesService.findAll(),
      ]);

      setAcuerdos(acuerdosData);
      setComites(comitesData.map((c) => ({ id: c.id, nombre: c.nombre })));
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || 'Error al cargar los acuerdos'
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/comites/reuniones">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Regresar
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Seguimiento de Acuerdos
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Verifica el cumplimiento de los compromisos asignados
          </p>
        </div>
      </div>

      {/* Filtros Avanzados */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700">Filtros de búsqueda</h3>
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
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Tipo de Acuerdo
            </label>
            <Select
              value={filters.tipo_acuerdo || ''}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  tipo_acuerdo: e.target.value || undefined,
                })
              }
            >
              <option value="">Todos</option>
              <option value={TipoAcuerdo.INFORMATIVO}>Informativo</option>
              <option value={TipoAcuerdo.CON_SEGUIMIENTO}>
                Con Seguimiento
              </option>
            </Select>
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
        ) : acuerdos.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No hay acuerdos registrados</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-gray-600 font-semibold">Título</TableHead>
                <TableHead className="text-gray-600 font-semibold">Responsable</TableHead>
                <TableHead className="text-gray-600 font-semibold">Tipo</TableHead>
                <TableHead className="text-gray-600 font-semibold">Estado</TableHead>
                <TableHead className="text-gray-600 font-semibold">Fecha Programada</TableHead>
                <TableHead className="text-gray-600 font-semibold">Fecha Real</TableHead>
                <TableHead className="text-gray-600 font-semibold">Comité</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {acuerdos.map((acuerdo) => (
                <TableRow key={acuerdo.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{acuerdo.titulo}</TableCell>
                  <TableCell className="text-gray-600">
                    {acuerdo.responsable_nombre || '-'}
                  </TableCell>
                  <TableCell>{getTipoBadge(acuerdo.tipo_acuerdo)}</TableCell>
                  <TableCell>{getEstadoBadge(acuerdo.estado)}</TableCell>
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
                  <TableCell className="text-gray-600">
                    {comites.find((c) => {
                      // Necesitamos obtener el comité desde la reunión
                      // Por ahora mostramos un placeholder
                      return false;
                    })?.nombre || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
