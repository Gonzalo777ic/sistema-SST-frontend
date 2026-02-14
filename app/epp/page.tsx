'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  eppService,
  SolicitudEPP,
  EstadoSolicitudEPP,
} from '@/services/epp.service';
import { authService } from '@/services/auth.service';
import { trabajadoresService, Trabajador } from '@/services/trabajadores.service';
import { empresasService, Empresa } from '@/services/empresas.service';
import { areasService, Area } from '@/services/areas.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Eye,
  FileText,
  Upload,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Package,
  Grid3X3,
} from 'lucide-react';
import { SignaturePad } from '@/components/ui/signature-pad';
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
      return 'text-amber-700 bg-amber-50 border-amber-200';
    case EstadoSolicitudEPP.Rechazada:
      return 'text-red-700 bg-red-50 border-red-200';
    case EstadoSolicitudEPP.Pendiente:
      return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    default:
      return 'text-gray-700 bg-gray-50 border-gray-200';
  }
};

export default function EPPPage() {
  const { usuario, hasAnyRole } = useAuth();
  const [solicitudes, setSolicitudes] = useState<SolicitudEPP[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  // Estados de filtros
  const [filtroUsuarioEPP, setFiltroUsuarioEPP] = useState('');
  const [filtroSolicitante, setFiltroSolicitante] = useState('');
  const [filtroRazonSocial, setFiltroRazonSocial] = useState('');
  const [filtroUnidad, setFiltroUnidad] = useState('');
  const [filtroArea, setFiltroArea] = useState('');
  const [filtroSede, setFiltroSede] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoSolicitudEPP | ''>('');
  const [filtroCodigo, setFiltroCodigo] = useState('');

  // Modales para cambio de estado
  const [modalEstado, setModalEstado] = useState<{
    tipo: 'aprobada' | 'rechazada' | 'observada' | 'entregada';
    solicitud: SolicitudEPP;
  } | null>(null);
  const [observacionesModal, setObservacionesModal] = useState('');
  const [comentariosRechazoModal, setComentariosRechazoModal] = useState('');
  const [passwordEntregada, setPasswordEntregada] = useState('');
  const [firmaEntregada, setFirmaEntregada] = useState('');
  const [entregadaStep, setEntregadaStep] = useState(1);
  const [isSubmittingEstado, setIsSubmittingEstado] = useState(false);

  const canCreate = hasAnyRole([
    UsuarioRol.SUPER_ADMIN,
    UsuarioRol.ADMIN_EMPRESA,
    UsuarioRol.INGENIERO_SST,
    UsuarioRol.SUPERVISOR,
    UsuarioRol.EMPLEADO,
  ]);

  const esAdmin = hasAnyRole([UsuarioRol.SUPER_ADMIN, UsuarioRol.ADMIN_EMPRESA]);
  const esSoloEmpleado =
    hasAnyRole([UsuarioRol.EMPLEADO]) &&
    !hasAnyRole([UsuarioRol.SUPER_ADMIN, UsuarioRol.ADMIN_EMPRESA, UsuarioRol.INGENIERO_SST, UsuarioRol.SUPERVISOR]);

  useEffect(() => {
    loadData();
  }, [usuario?.empresaId, usuario?.trabajadorId, esAdmin, esSoloEmpleado]);

  useEffect(() => {
    if (usuario?.empresaId) {
      loadAreas(usuario.empresaId);
      loadTrabajadores(usuario.empresaId);
    }
  }, [usuario?.empresaId]);

  const loadData = async () => {
    if (!usuario) return;

    try {
      setIsLoading(true);
      if (esSoloEmpleado && usuario.trabajadorId) {
        const solicitudesData = await eppService.findAll(
          usuario.empresaId ?? undefined,
          undefined,
          usuario.trabajadorId,
        );
        setSolicitudes(solicitudesData);
        setEmpresas([]);
      } else {
        const empresaIdFilter = esAdmin ? undefined : (usuario.empresaId ?? undefined);
        const [solicitudesData, empresasData] = await Promise.all([
          eppService.findAll(empresaIdFilter).catch(() => []),
          empresasService.findAll().catch(() => []),
        ]);
        setSolicitudes(solicitudesData);
        setEmpresas(empresasData);
      }
    } catch (error: any) {
      toast.error('Error al cargar solicitudes');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAreas = async (empresaId: string) => {
    try {
      const areasData = await areasService.findAll(empresaId).catch(() => []);
      setAreas(areasData.filter((a) => a.activo));
    } catch (error) {
      console.error('Error loading areas:', error);
    }
  };

  const loadTrabajadores = async (empresaId: string) => {
    try {
      const trabajadoresData = await trabajadoresService.findAll(empresaId).catch(() => []);
      setTrabajadores(trabajadoresData);
    } catch (error) {
      console.error('Error loading trabajadores:', error);
    }
  };

  const handleSelectEstado = (solicitud: SolicitudEPP, nuevoEstado: EstadoSolicitudEPP) => {
    const estadoActual = String(solicitud.estado || '').toUpperCase();
    const estadoNuevo = String(nuevoEstado || '').toUpperCase();
    if (estadoNuevo === estadoActual) return;

    const permitidos: string[] =
      estadoActual === 'PENDIENTE'
        ? ['OBSERVADA', 'APROBADA', 'RECHAZADA']
        : estadoActual === 'OBSERVADA'
          ? ['PENDIENTE', 'APROBADA', 'RECHAZADA']
          : estadoActual === 'APROBADA'
            ? ['ENTREGADA']
            : [];
    if (!permitidos.includes(estadoNuevo)) return;

    if (estadoNuevo === 'OBSERVADA') {
      setObservacionesModal('');
      setModalEstado({ tipo: 'observada', solicitud });
      return;
    }
    if (estadoNuevo === 'APROBADA') {
      setModalEstado({ tipo: 'aprobada', solicitud });
      return;
    }
    if (estadoNuevo === 'RECHAZADA') {
      setComentariosRechazoModal('');
      setModalEstado({ tipo: 'rechazada', solicitud });
      return;
    }
    if (estadoNuevo === 'ENTREGADA') {
      setPasswordEntregada('');
      setFirmaEntregada('');
      setEntregadaStep(1);
      setModalEstado({ tipo: 'entregada', solicitud });
      return;
    }
    handleUpdateEstado(solicitud.id, nuevoEstado as EstadoSolicitudEPP, {});
  };

  const handleUpdateEstado = async (
    id: string,
    nuevoEstado: EstadoSolicitudEPP,
    extra: { observaciones?: string; comentarios_aprobacion?: string; password?: string; firma_recepcion_base64?: string },
  ) => {
    const isEntregada = nuevoEstado === EstadoSolicitudEPP.Entregada;
    const toastId = isEntregada
      ? toast.loading('Registrando entrega... Creando PDF y subiendo a la nube. Puede continuar navegando.', {
          duration: Infinity,
        })
      : undefined;
    try {
      setIsSubmittingEstado(true);
      await eppService.updateEstado(id, {
        estado: nuevoEstado,
        ...extra,
      });
      if (toastId) toast.dismiss(toastId);
      toast.success(`Estado actualizado a ${nuevoEstado}`);
      setModalEstado(null);
      loadData();
    } catch (error: any) {
      if (toastId) toast.dismiss(toastId);
      toast.error('Error al actualizar estado', {
        description: error.response?.data?.message || 'No se pudo actualizar el estado',
      });
    } finally {
      setIsSubmittingEstado(false);
    }
  };

  const handleConfirmarModal = async () => {
    if (!modalEstado) return;
    const { tipo, solicitud } = modalEstado;

    if (tipo === 'observada') {
      await handleUpdateEstado(solicitud.id, EstadoSolicitudEPP.Observada, {
        observaciones: observacionesModal || undefined,
      });
    } else if (tipo === 'aprobada') {
      await handleUpdateEstado(solicitud.id, EstadoSolicitudEPP.Aprobada, {});
    } else if (tipo === 'rechazada') {
      await handleUpdateEstado(solicitud.id, EstadoSolicitudEPP.Rechazada, {
        comentarios_aprobacion: comentariosRechazoModal || undefined,
      });
    } else if (tipo === 'entregada') {
      const esAutoSolicitud = solicitud.es_auto_solicitud === true;
      if (entregadaStep === 1) {
        try {
          const { valid } = await authService.verifyPassword(passwordEntregada);
          if (!valid) {
            toast.error('Contraseña incorrecta');
            return;
          }
          if (esAutoSolicitud) {
            await handleUpdateEstado(solicitud.id, EstadoSolicitudEPP.Entregada, {
              password: passwordEntregada,
            });
          } else {
            setEntregadaStep(2);
          }
        } catch {
          toast.error('Error al validar contraseña');
        }
      } else {
        if (!firmaEntregada) {
          toast.error('Debe ingresar la firma del solicitante');
          return;
        }
        const { isValidSignature, getSignatureValidationError } = await import('@/lib/signature-validation');
        if (!isValidSignature(firmaEntregada)) {
          toast.error(getSignatureValidationError());
          return;
        }
        await handleUpdateEstado(solicitud.id, EstadoSolicitudEPP.Entregada, {
          password: passwordEntregada,
          firma_recepcion_base64: firmaEntregada,
        });
      }
    }
  };

  // Filtrado de solicitudes
  const filteredSolicitudes = useMemo(() => {
    return solicitudes.filter((sol) => {
      if (filtroUsuarioEPP && !sol.usuario_epp_nombre?.toLowerCase().includes(filtroUsuarioEPP.toLowerCase())) {
        return false;
      }
      if (filtroSolicitante && !sol.solicitante_nombre?.toLowerCase().includes(filtroSolicitante.toLowerCase())) {
        return false;
      }
      if (filtroRazonSocial && sol.empresa_nombre !== filtroRazonSocial) {
        return false;
      }
      if (filtroArea && sol.area_id !== filtroArea) {
        return false;
      }
      if (filtroSede && sol.sede !== filtroSede) {
        return false;
      }
      if (filtroEstado && sol.estado !== filtroEstado) {
        return false;
      }
      if (filtroCodigo && !sol.codigo_correlativo?.toLowerCase().includes(filtroCodigo.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [
    solicitudes,
    filtroUsuarioEPP,
    filtroSolicitante,
    filtroRazonSocial,
    filtroArea,
    filtroSede,
    filtroEstado,
    filtroCodigo,
  ]);

  // Obtener sedes únicas
  const sedesUnicas = useMemo(() => {
    const sedes = new Set<string>();
    solicitudes.forEach((sol) => {
      if (sol.sede) sedes.add(sol.sede);
    });
    return Array.from(sedes).sort();
  }, [solicitudes]);

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Requerimiento de entrega de EPP
        </h1>
      </div>

      {/* Filtros - ocultos para empleado */}
      {!esSoloEmpleado && (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        >
          <span className="font-medium text-gray-700">
            {showFilters ? 'Ocultar' : 'Mostrar'} Filtros de búsqueda
          </span>
          {showFilters ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {showFilters && (
          <div className="px-4 pb-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Usuario EPP
                </label>
                <Input
                  value={filtroUsuarioEPP}
                  onChange={(e) => setFiltroUsuarioEPP(e.target.value)}
                  placeholder="Buscar usuario..."
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Solicitante EPP
                </label>
                <Input
                  value={filtroSolicitante}
                  onChange={(e) => setFiltroSolicitante(e.target.value)}
                  placeholder="Buscar solicitante..."
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Razón social
                </label>
                <Select
                  value={filtroRazonSocial}
                  onChange={(e) => setFiltroRazonSocial(e.target.value)}
                >
                  <option value="">Todas</option>
                  {empresas.map((empresa) => (
                    <option key={empresa.id} value={empresa.nombre}>
                      {empresa.nombre}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Área
                </label>
                <Select
                  value={filtroArea}
                  onChange={(e) => setFiltroArea(e.target.value)}
                >
                  <option value="">Todas</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.nombre}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sede
                </label>
                <Select
                  value={filtroSede}
                  onChange={(e) => setFiltroSede(e.target.value)}
                >
                  <option value="">Todas</option>
                  {sedesUnicas.map((sede) => (
                    <option key={sede} value={sede}>
                      {sede}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <Select
                  value={filtroEstado}
                  onChange={(e) =>
                    setFiltroEstado(e.target.value as EstadoSolicitudEPP | '')
                  }
                >
                  <option value="">Todos</option>
                  <option value={EstadoSolicitudEPP.Pendiente}>PENDIENTE</option>
                  <option value={EstadoSolicitudEPP.Observada}>OBSERVADA</option>
                  <option value={EstadoSolicitudEPP.Aprobada}>APROBADA</option>
                  <option value={EstadoSolicitudEPP.Entregada}>ENTREGADA</option>
                  <option value={EstadoSolicitudEPP.Rechazada}>RECHAZADA</option>
                </Select>
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código correlativo
                </label>
                <Input
                  value={filtroCodigo}
                  onChange={(e) => setFiltroCodigo(e.target.value)}
                  placeholder="Buscar por código..."
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Barra de Herramientas */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {!esSoloEmpleado && (
          <div className="flex flex-wrap gap-2">
            <Link href="/epp/reportes">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <FileText className="w-4 h-4 mr-2" />
                Reporte
              </Button>
            </Link>
            <Link href="/epp/fichas" className="inline-block">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <ClipboardList className="w-4 h-4 mr-2" />
                Fichas EPP
              </Button>
            </Link>
            <Link href="/epp/kardex">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Eye className="w-4 h-4 mr-2" />
                Kardex Por Trabajador
              </Button>
            </Link>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Upload className="w-4 h-4 mr-2" />
              Importar Solicitudes
            </Button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {esSoloEmpleado && (
            <Link href="/epp/catalogo">
              <Button variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
                <Grid3X3 className="w-4 h-4 mr-2" />
                Ver catálogo
              </Button>
            </Link>
          )}
          {canCreate && (
            <Link href={esSoloEmpleado ? '/epp/mis-solicitudes/nueva' : '/epp/nueva'}>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Solicitud
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Tabla de Datos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto max-w-full">
          <table className="w-full table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[100px]">
                  Código
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[90px]">
                  Fecha
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-0">
                  Solicitante
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-0 hidden lg:table-cell">
                  Empresa
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[70px] hidden md:table-cell">
                  Área
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[115px]">
                  Estado
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[70px]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i}>
                      {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                        <td key={j} className="px-3 py-4">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ) : filteredSolicitudes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Sin Información</p>
                  </td>
                </tr>
              ) : (
                filteredSolicitudes.map((solicitud) => (
                  <tr key={solicitud.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-4 text-sm text-gray-900">
                      <span className="truncate block" title={solicitud.codigo_correlativo || '-'}>
                        {solicitud.codigo_correlativo || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900 whitespace-nowrap">
                      {new Date(solicitud.fecha_solicitud).toLocaleDateString('es-PE')}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900 min-w-0">
                      <span
                        className="truncate block max-w-[140px] sm:max-w-[200px]"
                        title={
                          solicitud.usuario_epp_nombre !== solicitud.solicitante_nombre
                            ? `${solicitud.solicitante_nombre || '-'} (solicitado por: ${solicitud.usuario_epp_nombre || '-'})`
                            : solicitud.solicitante_nombre || '-'
                        }
                      >
                        {solicitud.solicitante_nombre || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900 hidden lg:table-cell min-w-0">
                      <span
                        className="truncate block max-w-[120px]"
                        title={solicitud.empresa_nombre || '-'}
                      >
                        {solicitud.empresa_nombre || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900 hidden md:table-cell">
                      <span
                        className="truncate block max-w-[80px]"
                        title={solicitud.area_nombre || '-'}
                      >
                        {solicitud.area_nombre || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-4 min-w-[115px]">
                      {esSoloEmpleado ? (
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium border whitespace-nowrap ${getEstadoColor(solicitud.estado)}`}
                        >
                          {solicitud.estado}
                        </span>
                      ) : (
                        <Select
                          value={solicitud.estado}
                          onChange={(e) =>
                            handleSelectEstado(
                              solicitud,
                              e.target.value as EstadoSolicitudEPP,
                            )
                          }
                          className={`w-full min-w-[100px] border-2 rounded-md font-medium text-sm whitespace-nowrap ${getEstadoColor(solicitud.estado)} bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1`}
                          style={{
                            borderColor: getEstadoColor(solicitud.estado).split(' ')[2]?.replace('border-', ''),
                          }}
                        >
                          <option value={EstadoSolicitudEPP.Pendiente}>PENDIENTE</option>
                          <option value={EstadoSolicitudEPP.Observada}>OBSERVADA</option>
                          <option value={EstadoSolicitudEPP.Aprobada}>APROBADA</option>
                          <option value={EstadoSolicitudEPP.Entregada}>ENTREGADA</option>
                          <option value={EstadoSolicitudEPP.Rechazada}>RECHAZADA</option>
                        </Select>
                      )}
                    </td>
                    <td className="px-3 py-4 text-sm">
                      <Link href={`/epp/${solicitud.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modales de confirmación (renderizados en body para evitar problemas de z-index) */}
      {typeof window !== 'undefined' &&
        modalEstado &&
        document.body &&
        createPortal(
          <>
            {/* Modal Observada */}
            {modalEstado.tipo === 'observada' && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Marcar como OBSERVADA
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Ingrese las observaciones (opcional). Este cambio es reversible.
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
            <textarea
              value={observacionesModal}
              onChange={(e) => setObservacionesModal(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 mb-4"
              rows={3}
              placeholder="Indique las observaciones..."
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setModalEstado(null)}>
                Cancelar
              </Button>
              <Button
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={handleConfirmarModal}
                disabled={isSubmittingEstado}
              >
                Confirmar
              </Button>
            </div>
          </div>
              </div>
            )}

            {/* Modal Aprobada */}
            {modalEstado.tipo === 'aprobada' && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ¿Desea aprobar esta solicitud?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Si lo hace no podrá revertirlo. La solicitud pasará a estado APROBADA y solo podrá avanzar a ENTREGADA.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setModalEstado(null)}>
                Cancelar
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={handleConfirmarModal}
                disabled={isSubmittingEstado}
              >
                Aprobar
              </Button>
            </div>
          </div>
              </div>
            )}

            {/* Modal Rechazada */}
            {modalEstado.tipo === 'rechazada' && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
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
              value={comentariosRechazoModal}
              onChange={(e) => setComentariosRechazoModal(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
              rows={3}
              placeholder="Indique el motivo del rechazo..."
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setModalEstado(null)}>
                Cancelar
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleConfirmarModal}
                disabled={isSubmittingEstado}
              >
                Rechazar solicitud
              </Button>
            </div>
          </div>
              </div>
            )}

            {/* Modal Entregada: auto-solicitud = solo password; admin inició = password + firma trabajador */}
            {modalEstado.tipo === 'entregada' && modalEstado.solicitud && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
            {isSubmittingEstado && (
              <div className="bg-blue-50 px-4 py-2 border-b border-blue-100">
                <p className="text-sm text-blue-800 font-medium">
                  Registrando entrega... Creando PDF y subiendo a la nube
                </p>
                <div className="mt-2 h-1.5 bg-blue-200 rounded-full overflow-hidden">
                  <div
                    className="h-full w-1/3 bg-blue-600 rounded-full"
                    style={{ animation: 'progress-indeterminate 1.5s ease-in-out infinite' }}
                  />
                </div>
              </div>
            )}
            <div className="p-6">
            {modalEstado.solicitud.es_auto_solicitud ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Registrar entrega</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Ingrese su contraseña para confirmar que es usted quien registra la entrega. La firma del solicitante se usa automáticamente (ya la envió al crear la solicitud).
                </p>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                <Input
                  type="password"
                  value={passwordEntregada}
                  onChange={(e) => setPasswordEntregada(e.target.value)}
                  placeholder="Su contraseña"
                  className="mb-4"
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setModalEstado(null)}>Cancelar</Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleConfirmarModal}
                    disabled={isSubmittingEstado || !passwordEntregada}
                  >
                    {isSubmittingEstado ? 'Registrando...' : 'Registrar entrega'}
                  </Button>
                </div>
              </>
            ) : entregadaStep === 1 ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Verificar identidad</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Ingrese su contraseña para confirmar que es usted quien registra la entrega (admin/SST).
                </p>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                <Input
                  type="password"
                  value={passwordEntregada}
                  onChange={(e) => setPasswordEntregada(e.target.value)}
                  placeholder="Su contraseña"
                  className="mb-4"
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setModalEstado(null)}>Cancelar</Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleConfirmarModal}
                    disabled={isSubmittingEstado || !passwordEntregada}
                  >
                    Continuar
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Firma del solicitante</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Solicitante: <strong>{modalEstado.solicitud.solicitante_nombre}</strong>
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  El trabajador debe firmar para avalar que estuvo presente en la entrega.
                </p>
                <label className="block text-sm font-medium text-gray-700 mb-1">Firma de recepción</label>
                <SignaturePad
                  value={firmaEntregada}
                  onChange={setFirmaEntregada}
                  width={300}
                  height={120}
                />
                <div className="flex gap-2 justify-end mt-4">
                  <Button variant="outline" onClick={() => setEntregadaStep(1)} disabled={isSubmittingEstado}>
                    Atrás
                  </Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleConfirmarModal}
                    disabled={isSubmittingEstado || !firmaEntregada}
                  >
                    {isSubmittingEstado ? 'Registrando...' : 'Registrar entrega'}
                  </Button>
                </div>
              </>
            )}
            </div>
          </div>
        </div>
            )}
          </>,
          document.body
        )}
    </div>
  );
}
