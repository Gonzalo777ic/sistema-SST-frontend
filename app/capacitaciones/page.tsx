'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { capacitacionesService, Capacitacion } from '@/services/capacitaciones.service';
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
  Edit,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

// Interfaz para la tabla según las columnas especificadas
interface ICapacitacionTable {
  id: string;
  sede: string;
  razon_social: string;
  unidad?: string;
  asignacion?: string;
  trabajadores?: number;
  porcentaje?: number;
  tipo: string;
  tema: string;
  grupo?: string;
  fecha_inicio: string;
  fecha_fin?: string;
  estado: string;
}

export default function CapacitacionesPage() {
  const { usuario } = useAuth();
  const [capacitaciones, setCapacitaciones] = useState<Capacitacion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  useEffect(() => {
    loadCapacitaciones();
  }, []);

  const loadCapacitaciones = async () => {
    try {
      setIsLoading(true);
      const empresaId = usuario?.empresaId || undefined;
      const data = await capacitacionesService.findAll(empresaId);
      setCapacitaciones(data);
    } catch (error: any) {
      toast.error('Error al cargar capacitaciones', {
        description: error.response?.data?.message || 'No se pudieron cargar las capacitaciones',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Transformar datos de Capacitacion a ICapacitacionTable
  const transformarDatos = (cap: Capacitacion): ICapacitacionTable => {
    return {
      id: cap.id,
      sede: cap.lugar || '-',
      razon_social: 'Empresa', // TODO: Obtener de empresa_id
      unidad: '-',
      asignacion: '-',
      trabajadores: cap.participantes?.length || 0,
      porcentaje: 0, // TODO: Calcular porcentaje de asistencia
      tipo: cap.tipo,
      tema: cap.titulo,
      grupo: '-',
      fecha_inicio: cap.fecha,
      fecha_fin: cap.fecha,
      estado: cap.estado,
    };
  };

  const datosTabla = capacitaciones.map(transformarDatos);

  const getEstadoBadge = (estado: string) => {
    const styles: Record<string, string> = {
      Programada: 'bg-yellow-100 text-yellow-800',
      Completada: 'bg-green-100 text-green-800',
      Cancelada: 'bg-red-100 text-red-800',
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          styles[estado] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {estado}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* A. CABECERA */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Programación de Capacitaciones</h1>
          <Monitor className="h-6 w-6 text-blue-600" />
        </div>
      </div>

      {/* B. SECCIÓN DE FILTROS (Colapsable) */}
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Buscar
                </label>
                <Input placeholder="Buscar..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Tipo
                </label>
                <Select>
                  <option value="">Todos</option>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <Select>
                  <option value="">Todos</option>
                  <option value="Programada">Programada</option>
                  <option value="Completada">Completada</option>
                  <option value="Cancelada">Cancelada</option>
                </Select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* C. BARRA DE HERRAMIENTAS */}
      <div className="flex flex-col gap-3">
        {/* Fila Superior - Botones Izquierda */}
        <div className="flex items-center gap-2">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-md">
            <FileText className="h-4 w-4 mr-2" />
            Reporte
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-md">
            <Settings className="h-4 w-4 mr-2" />
            Configuración
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-md">
            <Search className="h-4 w-4 mr-2" />
            Buscar por trabajador
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-md">
            <Upload className="h-4 w-4 mr-2" />
            Importar capacitaciones
          </Button>
        </div>

        {/* Fila Inferior - Botón Derecha */}
        <div className="flex justify-end">
          <Link href="/capacitaciones/nueva">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-md">
              <Plus className="h-4 w-4 mr-2" />
              Registrar capacitación
            </Button>
          </Link>
        </div>
      </div>

      {/* D. TABLA DE DATOS */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : datosTabla.length === 0 ? (
            // E. ESTADO VACÍO
            <div className="p-12 text-center">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Sin Información</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-gray-600 text-xs font-semibold">Sede</TableHead>
                  <TableHead className="text-gray-600 text-xs font-semibold">
                    Razón social / Unidad
                  </TableHead>
                  <TableHead className="text-gray-600 text-xs font-semibold">
                    Asignación / Trab. / %
                  </TableHead>
                  <TableHead className="text-gray-600 text-xs font-semibold">
                    Tipo/Tema
                  </TableHead>
                  <TableHead className="text-gray-600 text-xs font-semibold">Grupo</TableHead>
                  <TableHead className="text-gray-600 text-xs font-semibold">Fechas</TableHead>
                  <TableHead className="text-gray-600 text-xs font-semibold">Estado</TableHead>
                  <TableHead className="text-gray-600 text-xs font-semibold">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {datosTabla.map((row) => (
                  <TableRow key={row.id} className="hover:bg-gray-50">
                    <TableCell className="text-sm">{row.sede}</TableCell>
                    <TableCell className="text-sm">
                      <div>
                        <div className="font-medium">{row.razon_social}</div>
                        {row.unidad && (
                          <div className="text-xs text-gray-500">{row.unidad}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="space-y-1">
                        {row.asignacion && <div>{row.asignacion}</div>}
                        {row.trabajadores !== undefined && (
                          <div className="text-xs text-gray-600">
                            Trab: {row.trabajadores}
                          </div>
                        )}
                        {row.porcentaje !== undefined && (
                          <div className="text-xs text-gray-600">
                            {row.porcentaje}%
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>
                        <div className="font-medium">{row.tipo}</div>
                        <div className="text-xs text-gray-600">{row.tema}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{row.grupo || '-'}</TableCell>
                    <TableCell className="text-sm">
                      <div>
                        <div>
                          {new Date(row.fecha_inicio).toLocaleDateString('es-PE')}
                        </div>
                        {row.fecha_fin && row.fecha_fin !== row.fecha_inicio && (
                          <div className="text-xs text-gray-600">
                            {new Date(row.fecha_fin).toLocaleDateString('es-PE')}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getEstadoBadge(row.estado)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link href={`/capacitaciones/${row.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/capacitaciones/${row.id}/editar`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            // TODO: Implementar eliminación
                            toast.info('Funcionalidad en desarrollo');
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
