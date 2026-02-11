'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  eppService,
  SolicitudEPP,
  UpdateSolicitudEppDto,
  EstadoSolicitudEPP,
} from '@/services/epp.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Package,
  Save,
  Edit,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { UsuarioRol } from '@/types';

const getEstadoColor = (estado: EstadoSolicitudEPP) => {
  switch (estado) {
    case EstadoSolicitudEPP.Aprobada:
      return 'text-green-700 bg-green-50 border-green-200';
    case EstadoSolicitudEPP.Entregada:
      return 'text-blue-700 bg-blue-50 border-blue-200';
    case EstadoSolicitudEPP.Observada:
      return 'text-red-700 bg-red-50 border-red-200';
    case EstadoSolicitudEPP.Pendiente:
      return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    default:
      return 'text-gray-700 bg-gray-50 border-gray-200';
  }
};

export default function DetalleSolicitudEPPPage() {
  const params = useParams();
  const router = useRouter();
  const { usuario, hasAnyRole } = useAuth();
  const solicitudId = params.id as string;

  const [solicitud, setSolicitud] = useState<SolicitudEPP | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Campos editables
  const [observaciones, setObservaciones] = useState('');
  const [comentarios, setComentarios] = useState('');

  const canEdit = hasAnyRole([
    UsuarioRol.SUPER_ADMIN,
    UsuarioRol.ADMIN_EMPRESA,
    UsuarioRol.INGENIERO_SST,
    UsuarioRol.SUPERVISOR,
  ]);

  useEffect(() => {
    if (solicitudId) {
      loadSolicitud();
    }
  }, [solicitudId]);

  const loadSolicitud = async () => {
    try {
      setIsLoading(true);
      const data = await eppService.findOne(solicitudId);
      setSolicitud(data);
      setObservaciones(data.observaciones || '');
      setComentarios(data.comentarios || '');
    } catch (error: any) {
      toast.error('Error al cargar solicitud', {
        description: error.response?.data?.message || 'No se pudo cargar la solicitud',
      });
      router.push('/epp');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!solicitud) return;

    try {
      setIsSaving(true);
      const payload: UpdateSolicitudEppDto = {
        observaciones: observaciones || undefined,
        comentarios: comentarios || undefined,
      };

      await eppService.update(solicitud.id, payload);
      toast.success('Cambios guardados');
      setIsEditing(false);
      loadSolicitud();
    } catch (error: any) {
      toast.error('Error al guardar', {
        description: error.response?.data?.message || 'No se pudieron guardar los cambios',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateEstado = async (nuevoEstado: EstadoSolicitudEPP) => {
    if (!solicitud) return;

    try {
      await eppService.updateEstado(solicitud.id, { estado: nuevoEstado });
      toast.success(`Estado actualizado a ${nuevoEstado}`);
      loadSolicitud();
    } catch (error: any) {
      toast.error('Error al actualizar estado', {
        description: error.response?.data?.message || 'No se pudo actualizar el estado',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!solicitud) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Solicitud no encontrada</p>
        <Link href="/epp">
          <Button className="mt-4">Regresar</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/epp">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Regresar
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Solicitud EPP: {solicitud.codigo_correlativo || 'Sin código'}
            </h1>
            <p className="text-sm text-gray-600">
              Fecha: {new Date(solicitud.fecha_solicitud).toLocaleDateString('es-PE', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={solicitud.estado}
            onChange={(e) =>
              handleUpdateEstado(e.target.value as EstadoSolicitudEPP)
            }
            className={`border-2 rounded-md font-medium ${getEstadoColor(solicitud.estado)}`}
          >
            <option value={EstadoSolicitudEPP.Pendiente}>PENDIENTE</option>
            <option value={EstadoSolicitudEPP.Aprobada}>APROBADA</option>
            <option value={EstadoSolicitudEPP.Observada}>OBSERVADA</option>
            <option value={EstadoSolicitudEPP.Entregada}>ENTREGADA</option>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Datos del Solicitante */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Datos del Solicitante
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-700">Nombre:</span>
                <p className="text-gray-900">{solicitud.solicitante_nombre || '-'}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">DNI:</span>
                <p className="text-gray-900">{solicitud.solicitante_documento || '-'}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Área:</span>
                <p className="text-gray-900">{solicitud.area_nombre || '-'}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Sede:</span>
                <p className="text-gray-900">{solicitud.sede || '-'}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Unidad:</span>
                <p className="text-gray-900">{solicitud.unidad || '-'}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Empresa:</span>
                <p className="text-gray-900">{solicitud.empresa_nombre || '-'}</p>
              </div>
            </div>
          </div>

          {/* Datos de la Solicitud */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Datos de la Solicitud
              </h2>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  {isEditing ? 'Cancelar' : 'Editar'}
                </Button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-sm font-medium text-gray-700">Usuario EPP:</span>
                <p className="text-gray-900">{solicitud.usuario_epp_nombre || '-'}</p>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-700">Motivo:</span>
                <p className="text-gray-900">{solicitud.motivo || '-'}</p>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-700">Centro de Costos:</span>
                <p className="text-gray-900">{solicitud.centro_costos || '-'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comentarios
                </label>
                {isEditing ? (
                  <textarea
                    value={comentarios}
                    onChange={(e) => setComentarios(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                ) : (
                  <p className="text-gray-900">{solicitud.comentarios || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones
                </label>
                {isEditing ? (
                  <textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                ) : (
                  <p className="text-gray-900">{solicitud.observaciones || '-'}</p>
                )}
              </div>

              {isEditing && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Cambios
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Items de EPP */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Items de EPP</h2>
            {solicitud.detalles.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hay items</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {solicitud.detalles.map((detalle) => (
                  <div
                    key={detalle.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {detalle.epp_imagen_url && (
                        <img
                          src={detalle.epp_imagen_url}
                          alt={detalle.epp_nombre}
                          className="w-20 h-20 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{detalle.epp_nombre}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Cantidad: <span className="font-medium">{detalle.cantidad}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Panel Lateral */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Información de Estado</h3>

            {solicitud.fecha_aprobacion && (
              <div>
                <span className="text-sm font-medium text-gray-700">Fecha Aprobación:</span>
                <p className="text-sm text-gray-900">
                  {new Date(solicitud.fecha_aprobacion).toLocaleDateString('es-PE')}
                </p>
                {solicitud.supervisor_aprobador_nombre && (
                  <p className="text-xs text-gray-600">
                    Por: {solicitud.supervisor_aprobador_nombre}
                  </p>
                )}
              </div>
            )}

            {solicitud.fecha_entrega && (
              <div>
                <span className="text-sm font-medium text-gray-700">Fecha Entrega:</span>
                <p className="text-sm text-gray-900">
                  {new Date(solicitud.fecha_entrega).toLocaleDateString('es-PE')}
                </p>
                {solicitud.entregado_por_nombre && (
                  <p className="text-xs text-gray-600">
                    Por: {solicitud.entregado_por_nombre}
                  </p>
                )}
              </div>
            )}

            {solicitud.comentarios_aprobacion && (
              <div>
                <span className="text-sm font-medium text-gray-700">Comentarios Aprobación:</span>
                <p className="text-sm text-gray-900">{solicitud.comentarios_aprobacion}</p>
              </div>
            )}

            {solicitud.firma_recepcion_url && (
              <div>
                <span className="text-sm font-medium text-gray-700">Firma de Recepción:</span>
                <img
                  src={solicitud.firma_recepcion_url}
                  alt="Firma"
                  className="mt-2 border border-gray-200 rounded"
                />
              </div>
            )}

            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Total Items: <span className="font-medium">{solicitud.detalles.length}</span>
              </p>
              <p className="text-sm text-gray-600">
                Cantidad Total:{' '}
                <span className="font-medium">
                  {solicitud.detalles.reduce((sum, d) => sum + d.cantidad, 0)}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
