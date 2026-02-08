'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  saludService,
  ExamenMedico,
  ComentarioMedico,
  ResultadoExamen,
} from '@/services/salud.service';
import { Button } from '@/components/ui/button';
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

  return (
    <ProtectedRoute
      allowedRoles={[
        UsuarioRol.SUPER_ADMIN,
        UsuarioRol.ADMIN_EMPRESA,
        UsuarioRol.INGENIERO_SST,
        UsuarioRol.MEDICO,
        UsuarioRol.TRABAJADOR,
      ]}
    >
      <MainLayout>
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Mis Exámenes Médicos
              </h1>
              <p className="text-slate-600 mt-2">
                Historial de salud ocupacional y certificados de aptitud
              </p>
            </div>
            <Link href="/mis-examenes/citas">
              <Button>
                <Calendar className="w-5 h-5 mr-2" />
                Agendar Cita
              </Button>
            </Link>
          </div>

          {/* Listado de Exámenes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? (
              <>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-64 w-full" />
                ))}
              </>
            ) : isSuperAdmin && !tieneTrabajadorId ? (
              <div className="col-span-full p-12 text-center bg-white rounded-lg shadow-sm border border-slate-200">
                <Stethoscope className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Acceso de Administrador
                </h3>
                <p className="text-slate-600 mb-4">
                  Como administrador, puedes acceder a este módulo para revisar la interfaz.
                </p>
                <p className="text-sm text-slate-500">
                  Para ver tus propios registros médicos, necesitas tener un trabajador vinculado a tu cuenta.
                </p>
              </div>
            ) : examenes.length === 0 ? (
              <div className="col-span-full p-12 text-center bg-white rounded-lg shadow-sm border border-slate-200">
                <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">No hay exámenes médicos registrados</p>
              </div>
            ) : (
              examenes.map((examen) => (
                <div
                  key={examen.id}
                  className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
                >
                  {/* Header con Tipo y Badge de Revisión */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 text-lg">
                        {examen.tipo_examen}
                      </h3>
                      {examen.revisado_por_doctor && (
                        <div className="mt-2 flex items-center gap-1 text-blue-600 text-sm">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Validado por Medicina Ocupacional</span>
                        </div>
                      )}
                    </div>
                    <div
                      className={`flex items-center gap-1 px-2 py-1 rounded-md border text-sm font-medium ${getResultadoBadgeColor(
                        examen.resultado,
                      )}`}
                    >
                      {getResultadoIcon(examen.resultado)}
                      <span>{examen.resultado}</span>
                    </div>
                  </div>

                  {/* Información del Examen */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Building2 className="w-4 h-4" />
                      <span>{examen.centro_medico}</span>
                    </div>
                    {examen.fecha_realizado && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Realizado:{' '}
                          {new Date(examen.fecha_realizado).toLocaleDateString(
                            'es-PE',
                          )}
                        </span>
                      </div>
                    )}
                    {examen.fecha_vencimiento && (
                      <div className="text-sm text-slate-600">
                        Vence:{' '}
                        {new Date(examen.fecha_vencimiento).toLocaleDateString(
                          'es-PE',
                        )}
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleVerDetalle(examen)}
                      className="flex-1"
                    >
                      <Stethoscope className="w-4 h-4 mr-1" />
                      Detalle
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleVerComentarios(examen)}
                      className="flex-1 relative"
                    >
                      <MessageSquare className="w-4 h-4 mr-1" />
                      Comentarios
                      {tieneComentariosNoLeidos(examen.id) && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                      )}
                    </Button>
                    {examen.resultado_archivo_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleDescargarResultado(examen.resultado_archivo_url)
                        }
                        className="flex-1"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Descargar
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
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
      </MainLayout>
    </ProtectedRoute>
  );
}
