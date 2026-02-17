'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { saludService, ExamenMedico } from '@/services/salud.service';
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

export default function ExamenesMedicosPage() {
  const [examenes, setExamenes] = useState<ExamenMedico[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const registrosPorPagina = 10;

  useEffect(() => {
    let cancelled = false;
    saludService
      .findAllExamenes()
      .then((data) => {
        if (!cancelled) {
          setExamenes(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast.error('Error al cargar los exámenes médicos');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const totalRegistros = examenes.length;
  const totalPaginas = Math.ceil(totalRegistros / registrosPorPagina);
  const inicioRegistro = (paginaActual - 1) * registrosPorPagina + 1;
  const finRegistro = Math.min(paginaActual * registrosPorPagina, totalRegistros);
  const examenesPaginados = examenes.slice(inicioRegistro - 1, finRegistro);

  const getResultadoBadge = (resultado: string) => {
    const styles: Record<string, string> = {
      Apto: 'bg-green-100 text-green-800',
      'Apto con Restricciones': 'bg-amber-100 text-amber-800',
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
      Realizado: 'bg-green-100 text-green-800',
      Revisado: 'bg-green-100 text-green-800',
      Programado: 'bg-blue-100 text-blue-800',
      PorVencer: 'bg-yellow-100 text-yellow-800',
      Vencido: 'bg-red-100 text-red-800',
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nombres y Apellidos
                </label>
                <Input placeholder="Nombre, apellidos..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nro Documento
                </label>
                <Input placeholder="Documento..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Tipo de EMO
                </label>
                <Select>
                  <option value="">Todos</option>
                  <option value="PERIODICO">PERIÓDICO</option>
                  <option value="PRE_OCUPACIONAL">PRE-OCUPACIONAL</option>
                  <option value="RETIRO">RETIRO</option>
                  <option value="REUBICACION">REUBICACIÓN</option>
                  <option value="OTROS">OTROS</option>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Aptitud EMO
                </label>
                <Select>
                  <option value="">Todos</option>
                  <option value="SIN_RESULTADO">SIN RESULTADO</option>
                  <option value="APTO">APTO</option>
                  <option value="APTO_CON_RESTRICCIONES">APTO CON RESTRICCIONES</option>
                  <option value="OBSERVADO">OBSERVADO</option>
                  <option value="NO_APTO">NO APTO</option>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Unidad
                </label>
                <Select>
                  <option value="">Todos</option>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Área
                </label>
                <Select>
                  <option value="">Todos</option>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Sede
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
                  <option value="ENTREGADO">ENTREGADO</option>
                  <option value="PROXIMO">PRÓXIMO</option>
                  <option value="ATRASADO">ATRASADO</option>
                  <option value="ASISTIO">ASISTIÓ</option>
                  <option value="LEIDO">LEIDO</option>
                  <option value="DIFERIDO">DIFERIDO</option>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Vigencia
                </label>
                <Select>
                  <option value="">Todos</option>
                  <option value="POR_VENCER">Por Vencer</option>
                  <option value="SIN_REGISTRO">Sin registro</option>
                  <option value="VENCIDO">Vencido</option>
                  <option value="VIGENTE">Vigente</option>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Estado trabajador
                </label>
                <Select>
                  <option value="">Todos</option>
                  <option value="HABILITADO">Habilitado</option>
                  <option value="DESHABILITADO">Deshabilitado</option>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Programación
                </label>
                <Select defaultValue="PROGRAMADO">
                  <option value="">Todos</option>
                  <option value="PROGRAMADO">Programado</option>
                  <option value="NO_PROGRAMADO">No Programado</option>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Fecha Programación
                </label>
                <div className="flex gap-2 items-center">
                  <Input type="date" placeholder="Fecha inicial" className="flex-1" />
                  <span className="text-gray-400">-</span>
                  <Input type="date" placeholder="Fecha final" className="flex-1" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Centro Médico
                </label>
                <Input placeholder="Centro médico..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Proyecto
                </label>
                <Input placeholder="Proyecto..." />
              </div>
              <div className="flex items-center justify-start md:col-span-2 lg:col-span-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Mostrar EMO más reciente
                  </span>
                </label>
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
        <Link href="/salud/examenes/configuracion">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-md">
            <Settings className="h-4 w-4 mr-2" />
            Configuración
          </Button>
        </Link>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-md">
          <Upload className="h-4 w-4 mr-2" />
          Importar
        </Button>
        <Link href="/salud/examenes/nuevo">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-md">
            <CalendarPlus className="h-4 w-4 mr-2" />
            Programar EMO
          </Button>
        </Link>
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
                      <TableCell className="text-sm font-medium">
                        {examen.trabajador_nombre ?? '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {examen.trabajador_documento ?? '-'}
                      </TableCell>
                      <TableCell className="text-sm">{examen.centro_medico}</TableCell>
                      <TableCell className="text-sm">{examen.proyecto ?? '-'}</TableCell>
                      <TableCell className="text-sm">{examen.sede ?? '-'}</TableCell>
                      <TableCell className="text-sm">{examen.tipo_examen}</TableCell>
                      <TableCell className="text-sm">
                        {examen.fecha_programada
                          ? new Date(examen.fecha_programada).toLocaleDateString('es-PE')
                          : '-'}
                      </TableCell>
                      <TableCell>{getResultadoBadge(examen.resultado)}</TableCell>
                      <TableCell className="text-sm">
                        {examen.fecha_vencimiento
                          ? new Date(examen.fecha_vencimiento).toLocaleDateString('es-PE')
                          : '-'}
                      </TableCell>
                      <TableCell>{getEstadoBadge(examen.estado)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Link href={`/salud/examenes/${examen.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
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
