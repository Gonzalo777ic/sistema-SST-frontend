'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  saludService,
  ExamenMedico,
  ComentarioMedico,
  ResultadoExamen,
} from '@/services/salud.service';
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
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText,
  Calendar,
  Building2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  MessageSquare,
  Download,
  Stethoscope,
  Activity,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  Settings,
  Upload,
  CalendarPlus,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { UsuarioRol } from '@/types';
import Link from 'next/link';

export default function MisExamenesPage() {
  const { usuario, hasRole } = useAuth();
  const [examenes, setExamenes] = useState<ExamenMedico[]>([]);
  const [comentarios, setComentarios] = useState<ComentarioMedico[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedExamen, setSelectedExamen] = useState<ExamenMedico | null>(null);
  const [isDetalleModalOpen, setIsDetalleModalOpen] = useState(false);
  const [isComentariosModalOpen, setIsComentariosModalOpen] = useState(false);
  const [examenComentarios, setExamenComentarios] = useState<ComentarioMedico[]>(
    [],
  );
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  const isSuperAdmin = hasRole(UsuarioRol.SUPER_ADMIN);
  const tieneTrabajadorId = !!usuario?.trabajadorId;

  useEffect(() => {
    // Cargar datos si tiene trabajadorId, o si es SUPER_ADMIN (aunque no tenga trabajadorId)
    if (tieneTrabajadorId || isSuperAdmin) {
      loadData();
    } else {
      // Si no tiene trabajadorId y no es SUPER_ADMIN, marcar como no cargando
      setIsLoading(false);
    }
  }, [usuario?.trabajadorId, isSuperAdmin]);

  const loadData = async () => {
    // Si es SUPER_ADMIN sin trabajadorId, mostrar mensaje informativo
    if (isSuperAdmin && !tieneTrabajadorId) {
      setIsLoading(false);
      setExamenes([]);
      setComentarios([]);
      return;
    }

    // Si no tiene trabajadorId, no cargar datos
    if (!tieneTrabajadorId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const [examenesData, comentariosData] = await Promise.all([
        saludService.findAllExamenes(usuario!.trabajadorId!),
        saludService.findAllComentarios(undefined, usuario!.trabajadorId!),
      ]);
      setExamenes(examenesData);
      setComentarios(comentariosData);
    } catch (error: any) {
      console.error('Error al cargar datos de salud:', {
        error,
        response: error.response,
        message: error.message,
        trabajadorId: usuario?.trabajadorId,
        isSuperAdmin,
      });
      toast.error('Error al cargar datos', {
        description:
          error.response?.data?.message || 'No se pudieron cargar los exámenes',
      });
      setExamenes([]);
      setComentarios([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerDetalle = (examen: ExamenMedico) => {
    setSelectedExamen(examen);
    setIsDetalleModalOpen(true);
  };

  const handleVerComentarios = async (examen: ExamenMedico) => {
    setSelectedExamen(examen);
    try {
      // Obtener comentarios - el backend marca automáticamente como leído al obtenerlos
      const comentariosData = await saludService.findAllComentarios(examen.id);
      
      // Marcar cada comentario no leído como leído llamando a findOne
      // Esto activa la lógica del backend que marca automáticamente como leído
      const comentariosNoLeidos = comentariosData.filter(
        (c) => !c.leido_por_paciente,
      );
      for (const comentario of comentariosNoLeidos) {
        try {
          await saludService.findOneComentario(comentario.id);
        } catch (error) {
          console.error('Error al marcar comentario como leído:', error);
        }
      }

      // Recargar comentarios para obtener el estado actualizado
      const comentariosActualizados = await saludService.findAllComentarios(examen.id);
      setExamenComentarios(comentariosActualizados);
      setIsComentariosModalOpen(true);
      
      // Recargar datos generales para actualizar badges
      await loadData();
    } catch (error: any) {
      toast.error('Error al cargar comentarios', {
        description:
          error.response?.data?.message ||
          'No se pudieron cargar los comentarios',
      });
    }
  };

  const handleDescargarResultado = (url: string | null) => {
    if (!url) {
      toast.error('No hay archivo disponible');
      return;
    }
    window.open(url, '_blank');
  };

  const getResultadoBadgeColor = (resultado: ResultadoExamen) => {
    switch (resultado) {
      case ResultadoExamen.Apto:
        return 'bg-green-100 text-green-800 border-green-200';
      case ResultadoExamen.AptoConRestricciones:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case ResultadoExamen.NoApto:
        return 'bg-red-100 text-red-800 border-red-200';
      case ResultadoExamen.Pendiente:
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getResultadoIcon = (resultado: ResultadoExamen) => {
    switch (resultado) {
      case ResultadoExamen.Apto:
        return <CheckCircle2 className="w-5 h-5" />;
      case ResultadoExamen.AptoConRestricciones:
        return <AlertCircle className="w-5 h-5" />;
      case ResultadoExamen.NoApto:
        return <XCircle className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const tieneComentariosNoLeidos = (examenId: string) => {
    return comentarios.some(
      (c) => c.examen_id === examenId && !c.leido_por_paciente,
    );
  };

  const getEstadoBadge = (revisado: boolean) => {
    if (revisado) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Revisado
        </span>
      );
    }
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        Pendiente
      </span>
    );
  };

  const handleExportarExcel = () => {
    console.log('Exportar a Excel');
    toast.info('Funcionalidad en desarrollo');
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
        <Button
          onClick={handleExportarExcel}
          className="bg-orange-500 hover:bg-orange-600 text-white rounded-md gap-2"
        >
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
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <Select>
                  <option value="">Todos</option>
                  <option value="Revisado">Revisado</option>
                  <option value="Pendiente">Pendiente</option>
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
          ) : isSuperAdmin && !tieneTrabajadorId ? (
            <div className="p-12 text-center">
              <Stethoscope className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Acceso de Administrador
              </h3>
              <p className="text-gray-600 mb-4">
                Como administrador, puedes acceder a este módulo para revisar la interfaz.
              </p>
              <p className="text-sm text-gray-500">
                Para ver tus propios registros médicos, necesitas tener un trabajador vinculado a tu cuenta.
              </p>
            </div>
          ) : examenes.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No hay exámenes médicos registrados</p>
            </div>
          ) : (
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
                {examenes.map((examen) => (
                  <TableRow key={examen.id} className="hover:bg-gray-50">
                    <TableCell className="text-sm font-medium">
                      {examen.trabajador_nombre || usuario?.dni || '-'}
                    </TableCell>
                    <TableCell className="text-sm">{usuario?.dni || '-'}</TableCell>
                    <TableCell className="text-sm">{examen.centro_medico}</TableCell>
                    <TableCell className="text-sm">-</TableCell>
                    <TableCell className="text-sm">-</TableCell>
                    <TableCell className="text-sm">{examen.tipo_examen}</TableCell>
                    <TableCell className="text-sm">
                      {examen.fecha_realizado
                        ? new Date(examen.fecha_realizado).toLocaleDateString('es-PE')
                        : examen.fecha_programada
                          ? new Date(examen.fecha_programada).toLocaleDateString('es-PE')
                          : '-'}
                    </TableCell>
                    <TableCell>
                      <div
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium ${getResultadoBadgeColor(
                          examen.resultado,
                        )}`}
                      >
                        {getResultadoIcon(examen.resultado)}
                        <span>{examen.resultado}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {examen.fecha_vencimiento
                        ? new Date(examen.fecha_vencimiento).toLocaleDateString('es-PE')
                        : '-'}
                    </TableCell>
                    <TableCell>{getEstadoBadge(examen.revisado_por_doctor)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVerDetalle(examen)}
                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVerComentarios(examen)}
                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 relative"
                        >
                          <MessageSquare className="h-4 w-4" />
                          {tieneComentariosNoLeidos(examen.id) && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                          )}
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

          {/* Modal de Detalle Clínico */}
          <Modal
            isOpen={isDetalleModalOpen}
            onClose={() => setIsDetalleModalOpen(false)}
            title="Detalle Clínico"
            size="lg"
          >
            {selectedExamen && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Tipo de Examen
                    </label>
                    <p className="text-slate-900">{selectedExamen.tipo_examen}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Centro Médico
                    </label>
                    <p className="text-slate-900">{selectedExamen.centro_medico}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Fecha Realizado
                    </label>
                    <p className="text-slate-900">
                      {selectedExamen.fecha_realizado
                        ? new Date(selectedExamen.fecha_realizado).toLocaleDateString(
                            'es-PE',
                          )
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Fecha Vencimiento
                    </label>
                    <p className="text-slate-900">
                      {selectedExamen.fecha_vencimiento
                        ? new Date(
                            selectedExamen.fecha_vencimiento,
                          ).toLocaleDateString('es-PE')
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Resultado
                    </label>
                    <div
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-sm font-medium ${getResultadoBadgeColor(
                        selectedExamen.resultado,
                      )}`}
                    >
                      {getResultadoIcon(selectedExamen.resultado)}
                      <span>{selectedExamen.resultado}</span>
                    </div>
                  </div>
                </div>

                {selectedExamen.restricciones && (
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Restricciones
                    </label>
                    <p className="text-slate-900 mt-1 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      {selectedExamen.restricciones}
                    </p>
                  </div>
                )}

                {selectedExamen.observaciones && (
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Observaciones
                    </label>
                    <p className="text-slate-900 mt-1 p-3 bg-slate-50 border border-slate-200 rounded-md">
                      {selectedExamen.observaciones}
                    </p>
                  </div>
                )}

                {selectedExamen.resultado_archivo_url && (
                  <div className="pt-4 border-t border-slate-200">
                    <Button
                      onClick={() =>
                        handleDescargarResultado(selectedExamen.resultado_archivo_url)
                      }
                      className="w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Descargar Certificado de Aptitud
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Modal>

          {/* Modal de Comentarios del Doctor */}
          <Modal
            isOpen={isComentariosModalOpen}
            onClose={() => setIsComentariosModalOpen(false)}
            title="Comentarios del Doctor"
            size="lg"
          >
            {examenComentarios.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">
                  No hay comentarios médicos para este examen
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {examenComentarios.map((comentario) => (
                  <div
                    key={comentario.id}
                    className="p-4 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {comentario.doctor_nombre}
                        </p>
                        <p className="text-sm text-slate-600">
                          {new Date(comentario.fecha_comentario).toLocaleDateString(
                            'es-PE',
                            {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            },
                          )}
                        </p>
                      </div>
                      {comentario.leido_por_paciente && (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                    {comentario.comentario && (
                      <div className="mb-3">
                        <label className="text-sm font-medium text-slate-700">
                          Comentario:
                        </label>
                        <p className="text-slate-900 mt-1">{comentario.comentario}</p>
                      </div>
                    )}
                    {comentario.recomendaciones && (
                      <div>
                        <label className="text-sm font-medium text-slate-700">
                          Recomendaciones:
                        </label>
                        <p className="text-slate-900 mt-1 p-2 bg-white border border-blue-200 rounded">
                          {comentario.recomendaciones}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Modal>
        </div>

  );
}
