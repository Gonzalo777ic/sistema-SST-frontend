'use client';

import { useState, useEffect } from 'react';
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
  Activity,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Settings,
  Upload,
  CalendarPlus,
  Eye,
  Plus,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
} from 'lucide-react';
import { toast } from 'sonner';

// Interfaz para la tabla según las columnas especificadas
interface IExamenMedicoTable {
  id: string;
  nombres: string;
  documento: string;
  centro_medico: string;
  proyecto: string;
  sede: string;
  tipo_examen: string;
  fecha_programacion: string;
  resultado: 'Apto' | 'No Apto' | 'Pendiente';
  vigencia: string;
  estado: string;
}

export default function ExamenesMedicosPage() {
  const [examenes, setExamenes] = useState<IExamenMedicoTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const registrosPorPagina = 10;

  // Datos mock para visualización inmediata
  const datosMock: IExamenMedicoTable[] = [
    {
      id: '1',
      nombres: 'Juan Pérez García',
      documento: '12345678',
      centro_medico: 'Clínica San José',
      proyecto: 'Proyecto A',
      sede: 'Lima',
      tipo_examen: 'Ingreso',
      fecha_programacion: '2024-01-15',
      resultado: 'Apto',
      vigencia: '2025-01-15',
      estado: 'Completado',
    },
    {
      id: '2',
      nombres: 'María López Sánchez',
      documento: '87654321',
      centro_medico: 'Centro Médico Nacional',
      proyecto: 'Proyecto B',
      sede: 'Arequipa',
      tipo_examen: 'Periódico',
      fecha_programacion: '2024-02-20',
      resultado: 'No Apto',
      vigencia: '2025-02-20',
      estado: 'Completado',
    },
    {
      id: '3',
      nombres: 'Carlos Rodríguez Torres',
      documento: '11223344',
      centro_medico: 'Hospital Regional',
      proyecto: 'Proyecto A',
      sede: 'Lima',
      tipo_examen: 'Retiro',
      fecha_programacion: '2024-03-10',
      resultado: 'Pendiente',
      vigencia: '-',
      estado: 'Programado',
    },
  ];

  useEffect(() => {
    // Simular carga de datos
    setTimeout(() => {
      setExamenes(datosMock);
      setIsLoading(false);
    }, 500);
  }, []);

  const totalRegistros = examenes.length;
  const totalPaginas = Math.ceil(totalRegistros / registrosPorPagina);
  const inicioRegistro = (paginaActual - 1) * registrosPorPagina + 1;
  const finRegistro = Math.min(paginaActual * registrosPorPagina, totalRegistros);
  const examenesPaginados = examenes.slice(inicioRegistro - 1, finRegistro);

  const getResultadoBadge = (resultado: string) => {
    const styles: Record<string, string> = {
      Apto: 'bg-green-100 text-green-800',
      'No Apto': 'bg-red-100 text-red-800',
      Pendiente: 'bg-yellow-100 text-yellow-800',
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          styles[resultado] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {resultado}
      </span>
    );
  };

  const getEstadoBadge = (estado: string) => {
    const styles: Record<string, string> = {
      Completado: 'bg-green-100 text-green-800',
      Programado: 'bg-blue-100 text-blue-800',
      Cancelado: 'bg-red-100 text-red-800',
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
      {/* A. CABECERA PRINCIPAL */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">
            Exámenes médicos ocupacionales - EMO
          </h1>
          <Activity className="h-6 w-6 text-blue-600" />
        </div>
        <Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-md gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Excel
        </Button>
      </div>

      {/* B. SECCIÓN DE FILTROS */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setFiltrosAbiertos(!filtrosAbiertos)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <span className="text-sm font-semibold text-gray-700">
            {filtrosAbiertos ? (
              <ChevronDown className="h-4 w-4 inline mr-2" />
            ) : (
              <ChevronRight className="h-4 w-4 inline mr-2" />
            )}
            Filtros de búsqueda
          </span>
        </button>
        {filtrosAbiertos && (
          <div className="border-t border-gray-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Buscar
                </label>
                <Input placeholder="Nombre, DNI..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Centro Médico
                </label>
                <Select>
                  <option value="">Todos</option>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Tipo Examen
                </label>
                <Select>
                  <option value="">Todos</option>
                  <option value="Ingreso">Ingreso</option>
                  <option value="Periodico">Periódico</option>
                  <option value="Retiro">Retiro</option>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <Select>
                  <option value="">Todos</option>
                  <option value="Completado">Completado</option>
                  <option value="Programado">Programado</option>
                  <option value="Cancelado">Cancelado</option>
                </Select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* C. BARRA DE HERRAMIENTAS */}
      <div className="flex items-center gap-2">
        <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-md">
          <FileText className="h-4 w-4 mr-2" />
          Formato DIGESA
        </Button>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-md">
          <Settings className="h-4 w-4 mr-2" />
          Configuración
        </Button>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-md">
          <Upload className="h-4 w-4 mr-2" />
          Importar
        </Button>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-md">
          <CalendarPlus className="h-4 w-4 mr-2" />
          Programar EMO
        </Button>
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
          ) : examenesPaginados.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-600">No hay exámenes médicos registrados</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-gray-600 text-xs font-semibold">
                      Nombres
                    </TableHead>
                    <TableHead className="text-gray-600 text-xs font-semibold">
                      Documento
                    </TableHead>
                    <TableHead className="text-gray-600 text-xs font-semibold">
                      Centro Médico
                    </TableHead>
                    <TableHead className="text-gray-600 text-xs font-semibold">
                      Proyecto
                    </TableHead>
                    <TableHead className="text-gray-600 text-xs font-semibold">Sede</TableHead>
                    <TableHead className="text-gray-600 text-xs font-semibold">
                      Tipo Examen
                    </TableHead>
                    <TableHead className="text-gray-600 text-xs font-semibold">
                      Fecha Programación
                    </TableHead>
                    <TableHead className="text-gray-600 text-xs font-semibold">
                      Resultado
                    </TableHead>
                    <TableHead className="text-gray-600 text-xs font-semibold">Vigencia</TableHead>
                    <TableHead className="text-gray-600 text-xs font-semibold">Estado</TableHead>
                    <TableHead className="text-gray-600 text-xs font-semibold">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {examenesPaginados.map((examen) => (
                    <TableRow key={examen.id} className="hover:bg-gray-50">
                      <TableCell className="text-sm font-medium">{examen.nombres}</TableCell>
                      <TableCell className="text-sm">{examen.documento}</TableCell>
                      <TableCell className="text-sm">{examen.centro_medico}</TableCell>
                      <TableCell className="text-sm">{examen.proyecto}</TableCell>
                      <TableCell className="text-sm">{examen.sede}</TableCell>
                      <TableCell className="text-sm">{examen.tipo_examen}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(examen.fecha_programacion).toLocaleDateString('es-PE')}
                      </TableCell>
                      <TableCell>{getResultadoBadge(examen.resultado)}</TableCell>
                      <TableCell className="text-sm">{examen.vigencia}</TableCell>
                      <TableCell>{getEstadoBadge(examen.estado)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => {
                              // TODO: Implementar ver detalle
                              toast.info('Funcionalidad en desarrollo');
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => {
                              // TODO: Implementar agregar resultado
                              toast.info('Funcionalidad en desarrollo');
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* F. PAGINACIÓN */}
              {totalPaginas > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    {inicioRegistro}-{finRegistro} de {totalRegistros} registros
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                      disabled={paginaActual === 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-sm text-gray-600">
                      Página {paginaActual} de {totalPaginas}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                      disabled={paginaActual === totalPaginas}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRightIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
