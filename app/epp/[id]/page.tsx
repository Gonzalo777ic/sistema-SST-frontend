'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  eppService,
  SolicitudEPP,
  UpdateSolicitudEppDto,
  EstadoSolicitudEPP,
  IEPP,
} from '@/services/epp.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Modal } from '@/components/ui/modal';
import {
  ArrowLeft,
  Package,
  Save,
  Edit,
  EyeOff,
  Eye,
  XCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { UsuarioRol } from '@/types';

const LABEL_SEXO: Record<string, string> = {
  MASCULINO: 'Masculino',
  FEMENINO: 'Femenino',
  OTRO: 'Otro',
};

const getEstadoColor = (estado: EstadoSolicitudEPP) => {
  switch (estado) {
    case EstadoSolicitudEPP.Aprobada:
      return 'text-green-700 bg-green-50 border-green-200';
    case EstadoSolicitudEPP.Entregada:
      return 'text-blue-700 bg-blue-50 border-blue-200';
    case EstadoSolicitudEPP.Observada:
      return 'text-amber-700 bg-amber-50 border-amber-200';
    case EstadoSolicitudEPP.Rechazada:
      return 'text-red-700 bg-red-50 border-red-200';
    case EstadoSolicitudEPP.Pendiente:
      return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    default:
      return 'text-gray-700 bg-gray-50 border-gray-200';
  }
};

const ESTADOS_SIGUIENTES: Record<EstadoSolicitudEPP, EstadoSolicitudEPP[]> = {
  [EstadoSolicitudEPP.Pendiente]: [
    EstadoSolicitudEPP.Observada,
    EstadoSolicitudEPP.Aprobada,
    EstadoSolicitudEPP.Rechazada,
  ],
  [EstadoSolicitudEPP.Observada]: [
    EstadoSolicitudEPP.Pendiente,
    EstadoSolicitudEPP.Aprobada,
    EstadoSolicitudEPP.Rechazada,
  ],
  [EstadoSolicitudEPP.Aprobada]: [EstadoSolicitudEPP.Entregada],
  [EstadoSolicitudEPP.Entregada]: [],
  [EstadoSolicitudEPP.Rechazada]: [],
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
  const [rechazarModal, setRechazarModal] = useState(false);
  const [comentariosRechazo, setComentariosRechazo] = useState('');
  const [confirmEstadoModal, setConfirmEstadoModal] = useState<{
    open: boolean;
    targetState: EstadoSolicitudEPP | null;
  }>({ open: false, targetState: null });
  const [agregarEppModal, setAgregarEppModal] = useState(false);
  const [epps, setEpps] = useState<IEPP[]>([]);

  const [observaciones, setObservaciones] = useState('');
  const [comentarios, setComentarios] = useState('');

  const [pendingAgregados, setPendingAgregados] = useState<Array<{ epp: IEPP; cantidad: number }>>([]);
  const [exceptuadosOverrides, setExceptuadosOverrides] = useState<Record<string, boolean>>({});

  const canEdit = hasAnyRole([
    UsuarioRol.SUPER_ADMIN,
    UsuarioRol.ADMIN_EMPRESA,
    UsuarioRol.INGENIERO_SST,
    UsuarioRol.SUPERVISOR,
  ]);

  const esObservada = solicitud?.estado === EstadoSolicitudEPP.Observada;
  const esAprobada = solicitud?.estado === EstadoSolicitudEPP.Aprobada;
  const esInmutable =
    solicitud?.estado === EstadoSolicitudEPP.Entregada ||
    solicitud?.estado === EstadoSolicitudEPP.Rechazada;
  const puedeExceptuar = canEdit && esObservada;
  const puedeAgregarItem = canEdit && (esObservada || esAprobada);

  useEffect(() => {
    if (solicitudId) {
      loadSolicitud();
    }
  }, [solicitudId]);

  useEffect(() => {
    if (solicitud?.empresa_id && agregarEppModal) {
      eppService.findAllEpp(solicitud.empresa_id).then(setEpps).catch(() => setEpps([]));
    }
  }, [solicitud?.empresa_id, agregarEppModal]);

  const loadSolicitud = async () => {
    try {
      setIsLoading(true);
      const data = await eppService.findOne(solicitudId);
      setSolicitud(data);
      setObservaciones(data.observaciones || '');
      setComentarios(data.comentarios || '');
      setPendingAgregados([]);
      setExceptuadosOverrides({});
    } catch (error: any) {
      toast.error('Error al cargar solicitud', {
        description: error.response?.data?.message || 'No se pudo cargar la solicitud',
      });
      router.push('/epp');
    } finally {
      setIsLoading(false);
    }
  };

  const hayCambiosDatos =
    esObservada &&
    (comentarios !== (solicitud?.comentarios || '') || observaciones !== (solicitud?.observaciones || ''));

  const hayCambiosEPPs =
    pendingAgregados.length > 0 || Object.keys(exceptuadosOverrides).length > 0;

  const hayCambiosPendientes = hayCambiosDatos || hayCambiosEPPs;

  const handleSaveDatos = async () => {
    if (!solicitud || !hayCambiosDatos) return;

    try {
      setIsSaving(true);
      await eppService.update(solicitud.id, {
        observaciones: observaciones || undefined,
        comentarios: comentarios || undefined,
      });
      toast.success('Comentarios y observaciones guardados');
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

  const handleCancelarDatos = () => {
    setComentarios(solicitud?.comentarios || '');
    setObservaciones(solicitud?.observaciones || '');
    setIsEditing(false);
    toast.info('Cambios descartados');
  };

  const handleSaveEPPs = async () => {
    if (!solicitud || !hayCambiosEPPs) return;

    try {
      setIsSaving(true);

      for (const detalle of solicitud.detalles) {
        const desiredExceptuado = exceptuadosOverrides[detalle.id] ?? detalle.exceptuado;
        if (desiredExceptuado !== detalle.exceptuado) {
          await eppService.toggleExceptuar(solicitud.id, detalle.id);
        }
      }

      for (const item of pendingAgregados) {
        await eppService.agregarDetalle(solicitud.id, item.epp.id, item.cantidad);
      }

      toast.success('Cambios en EPPs guardados');
      setPendingAgregados([]);
      setExceptuadosOverrides({});
      loadSolicitud();
    } catch (error: any) {
      toast.error('Error al guardar', {
        description: error.response?.data?.message || 'No se pudieron guardar los cambios',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelarEPPs = () => {
    setPendingAgregados([]);
    setExceptuadosOverrides({});
    toast.info('Cambios en EPPs descartados');
  };

  const handleUpdateEstado = async (nuevoEstado: EstadoSolicitudEPP) => {
    if (!solicitud) return;

    try {
      await eppService.updateEstado(solicitud.id, { estado: nuevoEstado });
      toast.success(`Estado actualizado a ${nuevoEstado}`);
      setConfirmEstadoModal({ open: false, targetState: null });
      loadSolicitud();
    } catch (error: any) {
      toast.error('Error al actualizar estado', {
        description: error.response?.data?.message || 'No se pudo actualizar el estado',
      });
    }
  };

  const handleSelectEstado = (nuevoEstado: EstadoSolicitudEPP) => {
    if (nuevoEstado === EstadoSolicitudEPP.Aprobada) {
      setConfirmEstadoModal({ open: true, targetState: EstadoSolicitudEPP.Aprobada });
      return;
    }
    if (nuevoEstado === EstadoSolicitudEPP.Rechazada) {
      setRechazarModal(true);
      return;
    }
    handleUpdateEstado(nuevoEstado);
  };

  const handleAgregarEPP = (epp: IEPP, cantidad: number = 1) => {
    if (!solicitud) return;
    setPendingAgregados((prev) => [...prev, { epp, cantidad }]);
    setAgregarEppModal(false);
    toast.success('Item agregado. Use Guardar o Cancelar a la derecha.');
  };

  const handleQuitarPendingAgregado = (index: number) => {
    setPendingAgregados((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRechazar = async () => {
    if (!solicitud) return;

    try {
      await eppService.updateEstado(solicitud.id, {
        estado: EstadoSolicitudEPP.Rechazada,
        comentarios_aprobacion: comentariosRechazo || undefined,
      });
      toast.success('Solicitud rechazada');
      setRechazarModal(false);
      setComentariosRechazo('');
      loadSolicitud();
    } catch (error: any) {
      toast.error('Error al rechazar', {
        description: error.response?.data?.message || 'No se pudo rechazar la solicitud',
      });
    }
  };

  const handleToggleExceptuar = (detalleId: string) => {
    const detalle = solicitud?.detalles.find((d) => d.id === detalleId);
    if (!detalle) return;
    const currentValue = exceptuadosOverrides[detalleId] ?? detalle.exceptuado;
    setExceptuadosOverrides((prev) => ({ ...prev, [detalleId]: !currentValue }));
    toast.success('Cambio registrado. Use Guardar o Cancelar a la derecha.');
  };

  const getEffectiveExceptuado = (detalle: { id: string; exceptuado: boolean }) =>
    exceptuadosOverrides[detalle.id] ?? detalle.exceptuado;

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

  const estadosDisponibles = ESTADOS_SIGUIENTES[solicitud.estado] || [];

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/epp">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Regresar
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Detalle solicitud de EPP
            </h1>
            <p className="text-sm text-gray-600">
              {solicitud.codigo_correlativo || 'Sin código'} •{' '}
              {new Date(solicitud.fecha_solicitud).toLocaleDateString('es-PE', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium text-gray-700">Estado:</span>
            <Select
              value={solicitud.estado}
              onChange={(e) =>
                handleSelectEstado(e.target.value as EstadoSolicitudEPP)
              }
              disabled={estadosDisponibles.length === 0}
              className={`border-2 rounded-md font-medium min-w-[140px] ${getEstadoColor(solicitud.estado)}`}
            >
              <option value={solicitud.estado}>{solicitud.estado}</option>
              {estadosDisponibles.map((est) => (
                <option key={est} value={est}>
                  {est}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contenido principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Datos del Solicitante */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Datos del Solicitante
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-700">Nombres y apellidos:</span>
                <p className="text-gray-900">{solicitud.solicitante_nombre || '-'}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Sexo:</span>
                <p className="text-gray-900">
                  {solicitud.solicitante_sexo
                    ? LABEL_SEXO[solicitud.solicitante_sexo] || solicitud.solicitante_sexo
                    : '-'}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Documento:</span>
                <p className="text-gray-900">{solicitud.solicitante_documento || '-'}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Razón social:</span>
                <p className="text-gray-900">{solicitud.empresa_nombre || '-'}</p>
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
                <span className="text-sm font-medium text-gray-700">Puesto:</span>
                <p className="text-gray-900">{solicitud.solicitante_puesto || '-'}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Centro de costos:</span>
                <p className="text-gray-900">{solicitud.solicitante_centro_costos || solicitud.centro_costos || '-'}</p>
              </div>
              <div className="col-span-2">
                <span className="text-sm font-medium text-gray-700">Jefe directo:</span>
                <p className="text-gray-900">{solicitud.solicitante_jefe_directo || '-'}</p>
              </div>
            </div>
          </div>

          {/* Datos de la Solicitud */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-lg font-semibold text-gray-900">
                Datos de la solicitud
              </h2>
              <div className="flex items-center gap-2">
                {canEdit && esObservada && !isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar comentarios/observaciones
                  </Button>
                )}
                {canEdit && esObservada && isEditing && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelarDatos}
                      disabled={isSaving}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveDatos}
                      disabled={isSaving || !hayCambiosDatos}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Guardar
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-sm font-medium text-gray-700">Quien registró:</span>
                <p className="text-gray-900">{solicitud.usuario_epp_nombre || '-'}</p>
                <p className="text-xs text-gray-500">Usuario que creó el registro (puede ser distinto al solicitante)</p>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-700">Solicitante:</span>
                <p className="text-gray-900">{solicitud.solicitante_nombre || '-'}</p>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-700">Fecha de solicitud:</span>
                <p className="text-gray-900">
                  {new Date(solicitud.fecha_solicitud).toLocaleDateString('es-PE')}
                </p>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-700">Motivo:</span>
                <p className="text-gray-900">{solicitud.motivo || '-'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comentarios
                </label>
                {isEditing && esObservada ? (
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
                {isEditing && esObservada ? (
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

            </div>
          </div>

          {/* Tabla EPPs solicitados */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-lg font-semibold text-gray-900">
                EPPs solicitados
              </h2>
              <div className="flex items-center gap-2">
                {puedeAgregarItem && (
                  <Button
                    onClick={() => setAgregarEppModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar EPP
                  </Button>
                )}
                {canEdit && hayCambiosEPPs && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelarEPPs}
                      disabled={isSaving}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveEPPs}
                      disabled={isSaving}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Guardar
                    </Button>
                  </>
                )}
              </div>
            </div>
            {solicitud.detalles.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hay items</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-blue-50 border-b border-blue-100">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">N°</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Nombre</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Tipo de protección</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Descripción</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Tiempo de vida</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">Cantidad</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Imagen</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Auditoría</th>
                      {(puedeExceptuar || (puedeAgregarItem && pendingAgregados.length > 0)) && (
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 w-16">
                          {puedeExceptuar ? 'Exceptuar' : 'Quitar'}
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {solicitud.detalles.map((detalle, idx) => {
                      const efectivoExceptuado = getEffectiveExceptuado(detalle);
                      return (
                        <tr
                          key={detalle.id}
                          className={`border-b border-gray-100 ${
                            efectivoExceptuado ? 'bg-gray-50 opacity-75' : ''
                          }`}
                        >
                          <td className="px-3 py-3 text-sm text-gray-900">{idx + 1}</td>
                          <td className="px-3 py-3 text-sm">
                            <span className={efectivoExceptuado ? 'line-through text-gray-500' : 'font-medium text-gray-900'}>
                              {detalle.epp_nombre}
                            </span>
                            {efectivoExceptuado && (
                              <span className="ml-2 text-xs text-amber-600 font-medium">(exceptuado)</span>
                            )}
                            {detalle.agregado && (
                              <span className="ml-2 text-xs text-blue-600 font-medium">(agregado)</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600">{detalle.epp_tipo_proteccion || '-'}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 max-w-xs truncate">
                            {detalle.epp_descripcion || '-'}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600">{detalle.epp_vigencia || '-'}</td>
                          <td className="px-3 py-3 text-sm text-center text-gray-900">{detalle.cantidad}</td>
                          <td className="px-3 py-3">
                            {detalle.epp_imagen_url ? (
                              <img
                                src={detalle.epp_imagen_url}
                                alt={detalle.epp_nombre}
                                className="w-12 h-12 object-cover rounded"
                              />
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-600">
                            {efectivoExceptuado && (
                              <div>
                                {exceptuadosOverrides[detalle.id] !== undefined
                                  ? 'Pendiente de guardar'
                                  : detalle.exceptuado_por_nombre
                                    ? `Exceptuado por: ${detalle.exceptuado_por_nombre}`
                                    : '-'}
                              </div>
                            )}
                            {detalle.agregado && detalle.agregado_por_nombre && (
                              <div>Agregado por: {detalle.agregado_por_nombre}</div>
                            )}
                            {!efectivoExceptuado && !detalle.agregado && '-'}
                          </td>
                          {(puedeExceptuar || (puedeAgregarItem && pendingAgregados.length > 0)) && (
                            <td className="px-3 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleExceptuar(detalle.id)}
                                className="p-1.5 rounded hover:bg-amber-100 text-amber-600"
                                title={efectivoExceptuado ? 'Incluir en aprobación' : 'Exceptuar de la solicitud'}
                              >
                                {efectivoExceptuado ? (
                                  <Eye className="w-4 h-4" />
                                ) : (
                                  <EyeOff className="w-4 h-4" />
                                )}
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                    {pendingAgregados.map((item, idx) => (
                      <tr key={`pending-${idx}`} className="border-b border-gray-100 bg-blue-50/50">
                        <td className="px-3 py-3 text-sm text-gray-900">{solicitud.detalles.length + idx + 1}</td>
                        <td className="px-3 py-3 text-sm">
                          <span className="font-medium text-gray-900">{item.epp.nombre}</span>
                          <span className="ml-2 text-xs text-blue-600 font-medium">(pendiente de guardar)</span>
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600">{item.epp.tipo_proteccion || '-'}</td>
                        <td className="px-3 py-3 text-sm text-gray-600 max-w-xs truncate">
                          {item.epp.descripcion || '-'}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600">{item.epp.vigencia || '-'}</td>
                        <td className="px-3 py-3 text-sm text-center text-gray-900">{item.cantidad}</td>
                        <td className="px-3 py-3">
                          {item.epp.imagen_url ? (
                            <img
                              src={item.epp.imagen_url}
                              alt={item.epp.nombre}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-500">Pendiente</td>
                        {(puedeExceptuar || (puedeAgregarItem && pendingAgregados.length > 0)) && (
                          <td className="px-3 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleQuitarPendingAgregado(idx)}
                              className="p-1.5 rounded hover:bg-red-100 text-red-600"
                              title="Quitar de la lista"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Comentarios y Observaciones (reiterados debajo) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Comentarios y Observaciones
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comentarios</label>
                <p className="text-gray-900 bg-gray-50 p-3 rounded">{solicitud.comentarios || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <p className="text-gray-900 bg-gray-50 p-3 rounded">{solicitud.observaciones || '-'}</p>
              </div>
            </div>
          </div>

          {/* Rechazar solicitud */}
          {!esInmutable && canEdit && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-600 mb-2">
                ¿Deseas rechazar esta solicitud? La solicitud quedará en estado RECHAZADA para auditoría.
              </p>
              <Button
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50"
                onClick={() => setRechazarModal(true)}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Rechazar solicitud
              </Button>
            </div>
          )}
        </div>

        {/* Panel lateral */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4 sticky top-4">
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
                Items aprobados:{' '}
                <span className="font-medium">
                  {solicitud.detalles.filter((d) => !getEffectiveExceptuado(d)).length + pendingAgregados.length}
                </span>
                {pendingAgregados.length > 0 && (
                  <span className="text-amber-600"> ({pendingAgregados.length} pendiente(s))</span>
                )}
              </p>
              <p className="text-sm text-gray-600">
                Items exceptuados:{' '}
                <span className="font-medium">
                  {solicitud.detalles.filter((d) => getEffectiveExceptuado(d)).length}
                </span>
              </p>
              <p className="text-sm text-gray-600">
                Items agregados:{' '}
                <span className="font-medium">
                  {solicitud.detalles.filter((d) => d.agregado).length}
                  {pendingAgregados.length > 0 && ` + ${pendingAgregados.length} pendiente(s)`}
                </span>
              </p>
              <p className="text-sm text-gray-600">
                Cantidad total aprobada:{' '}
                <span className="font-medium">
                  {solicitud.detalles
                    .filter((d) => !getEffectiveExceptuado(d))
                    .reduce((sum, d) => sum + d.cantidad, 0) +
                    pendingAgregados.reduce((s, p) => s + p.cantidad, 0)}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Confirmar Aprobada */}
      {confirmEstadoModal.open && confirmEstadoModal.targetState === EstadoSolicitudEPP.Aprobada && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ¿Desea aprobar esta solicitud?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Si lo hace no podrá revertirlo. La solicitud pasará a estado APROBADA y solo podrá avanzar a ENTREGADA.
            </p>
            {hayCambiosPendientes && (
              <p className="text-sm text-amber-600 mb-4">
                Tiene cambios sin guardar (agregados o exceptuados). Si aprueba sin guardar primero, perderá esos cambios.
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setConfirmEstadoModal({ open: false, targetState: null })}
              >
                Cancelar
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  if (confirmEstadoModal.targetState) {
                    setPendingAgregados([]);
                    setExceptuadosOverrides({});
                    handleUpdateEstado(confirmEstadoModal.targetState);
                  }
                }}
              >
                Aprobar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rechazar */}
      {rechazarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Rechazar solicitud
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              ¿Desea rechazar esta solicitud? Si lo hace no podrá revertirlo. La solicitud quedará en estado RECHAZADA para auditoría.
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comentario de rechazo (opcional)
            </label>
            <textarea
              value={comentariosRechazo}
              onChange={(e) => setComentariosRechazo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
              rows={3}
              placeholder="Indique el motivo del rechazo..."
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setRechazarModal(false)}>
                Cancelar
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleRechazar}
              >
                Rechazar solicitud
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Agregar EPP */}
      <Modal
        isOpen={agregarEppModal}
        onClose={() => setAgregarEppModal(false)}
        title="Agregar EPP a la solicitud"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Seleccione un EPP para agregar. Quedará registrado como item agregado (auditoría).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
            {epps.map((epp) => (
              <button
                key={epp.id}
                type="button"
                onClick={() => handleAgregarEPP(epp)}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left disabled:opacity-50"
              >
                <div className="flex items-start gap-3">
                  {epp.imagen_url && (
                    <img
                      src={epp.imagen_url}
                      alt={epp.nombre}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{epp.nombre}</h3>
                    <p className="text-sm text-gray-600">{epp.tipo_proteccion}</p>
                    {epp.descripcion && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{epp.descripcion}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Stock: {epp.stock} | Vigencia: {epp.vigencia || 'N/A'}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {epps.length === 0 && (
            <p className="text-center py-8 text-gray-500">No hay EPPs disponibles para esta empresa</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
