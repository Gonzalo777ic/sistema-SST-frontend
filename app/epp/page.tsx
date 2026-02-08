'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  eppService,
  SolicitudEPP,
  EstadoSolicitudEPP,
  TipoEPP,
} from '@/services/epp.service';
import { trabajadoresService, Trabajador } from '@/services/trabajadores.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  FileSignature,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { UsuarioRol } from '@/types';
import SignatureCanvas from '@/components/ui/signature-canvas';

export default function EPPPage() {
  const { usuario, hasAnyRole } = useAuth();
  const [solicitudes, setSolicitudes] = useState<SolicitudEPP[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEstado, setSelectedEstado] = useState<EstadoSolicitudEPP | ''>('');
  const [selectedSolicitud, setSelectedSolicitud] = useState<SolicitudEPP | null>(null);
  const [showFirmaModal, setShowFirmaModal] = useState(false);
  const [firmaUrl, setFirmaUrl] = useState<string>('');

  const canCreate = hasAnyRole([
    UsuarioRol.SUPER_ADMIN,
    UsuarioRol.ADMIN_EMPRESA,
    UsuarioRol.INGENIERO_SST,
    UsuarioRol.SUPERVISOR,
    UsuarioRol.TRABAJADOR,
  ]);

  const canApprove = hasAnyRole([
    UsuarioRol.SUPER_ADMIN,
    UsuarioRol.ADMIN_EMPRESA,
    UsuarioRol.SUPERVISOR,
  ]);

  const canDeliver = hasAnyRole([
    UsuarioRol.SUPER_ADMIN,
    UsuarioRol.ADMIN_EMPRESA,
  ]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadSolicitudes();
  }, [selectedEstado]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      if (usuario?.empresaId) {
        const trabajadoresData = await trabajadoresService.findAll(usuario.empresaId);
        setTrabajadores(trabajadoresData);
      }
      await loadSolicitudes();
    } catch (error: any) {
      toast.error('Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSolicitudes = async () => {
    try {
      const empresaId = usuario?.empresaId || undefined;
      const trabajadorId = usuario?.trabajadorId || undefined;
      const estado = selectedEstado || undefined;
      const data = await eppService.findAll(empresaId, trabajadorId, estado);
      setSolicitudes(data);
    } catch (error: any) {
      toast.error('Error al cargar solicitudes', {
        description: error.response?.data?.message || 'No se pudieron cargar las solicitudes',
      });
    }
  };

  const handleAprobar = async (id: string) => {
    try {
      await eppService.updateEstado(id, {
        estado: EstadoSolicitudEPP.Aprobada,
      });
      toast.success('Solicitud aprobada');
      loadSolicitudes();
    } catch (error: any) {
      toast.error('Error al aprobar solicitud', {
        description: error.response?.data?.message || 'No se pudo aprobar la solicitud',
      });
    }
  };

  const handleRechazar = async (id: string) => {
    try {
      await eppService.updateEstado(id, {
        estado: EstadoSolicitudEPP.Rechazada,
      });
      toast.success('Solicitud rechazada');
      loadSolicitudes();
    } catch (error: any) {
      toast.error('Error al rechazar solicitud', {
        description: error.response?.data?.message || 'No se pudo rechazar la solicitud',
      });
    }
  };

  const handleConfirmarEntrega = async () => {
    if (!selectedSolicitud || !firmaUrl) {
      toast.error('Debe capturar la firma de recepción');
      return;
    }

    try {
      await eppService.updateEstado(selectedSolicitud.id, {
        estado: EstadoSolicitudEPP.Entregada,
        firma_recepcion_url: firmaUrl,
      });
      toast.success('Entrega confirmada');
      setShowFirmaModal(false);
      setSelectedSolicitud(null);
      setFirmaUrl('');
      loadSolicitudes();
    } catch (error: any) {
      toast.error('Error al confirmar entrega', {
        description: error.response?.data?.message || 'No se pudo confirmar la entrega',
      });
    }
  };

  const filteredSolicitudes = solicitudes.filter((solicitud) => {
    const matchesSearch =
      !searchTerm ||
      solicitud.trabajador_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      solicitud.tipo_epp.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const kpis = {
    pendientes: solicitudes.filter((s) => s.estado === EstadoSolicitudEPP.Pendiente).length,
    aprobadas: solicitudes.filter((s) => s.estado === EstadoSolicitudEPP.Aprobada).length,
    entregadas: solicitudes.filter((s) => s.estado === EstadoSolicitudEPP.Entregada).length,
    total: solicitudes.length,
  };

  const getEstadoBadge = (estado: EstadoSolicitudEPP) => {
    switch (estado) {
      case EstadoSolicitudEPP.Pendiente:
        return (
          <span className="px-2 py-1 text-xs font-medium rounded bg-warning-light/20 text-warning">
            Pendiente
          </span>
        );
      case EstadoSolicitudEPP.Aprobada:
        return (
          <span className="px-2 py-1 text-xs font-medium rounded bg-success-light/20 text-success">
            Aprobada
          </span>
        );
      case EstadoSolicitudEPP.Rechazada:
        return (
          <span className="px-2 py-1 text-xs font-medium rounded bg-danger-light/20 text-danger">
            Rechazada
          </span>
        );
      case EstadoSolicitudEPP.Entregada:
        return (
          <span className="px-2 py-1 text-xs font-medium rounded bg-primary/20 text-primary">
            Entregada
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <ProtectedRoute allowedRoles={Object.values(UsuarioRol)}>
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Gestión de EPP</h1>
              <p className="text-slate-600 mt-2">Solicitudes de Equipos de Protección Personal</p>
            </div>
            {canCreate && (
              <Link href="/epp/nueva">
                <Button>
                  <Plus className="w-5 h-5 mr-2" />
                  Nueva Solicitud
                </Button>
              </Link>
            )}
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Pendientes</p>
                  <p className="text-2xl font-bold text-warning mt-1">{kpis.pendientes}</p>
                </div>
                <Clock className="w-8 h-8 text-warning" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Aprobadas</p>
                  <p className="text-2xl font-bold text-success mt-1">{kpis.aprobadas}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Entregadas</p>
                  <p className="text-2xl font-bold text-primary mt-1">{kpis.entregadas}</p>
                </div>
                <Package className="w-8 h-8 text-primary" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{kpis.total}</p>
                </div>
                <FileSignature className="w-8 h-8 text-slate-600" />
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <Input
                    placeholder="Buscar por trabajador o tipo de EPP..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="md:w-48">
                <Select
                  value={selectedEstado}
                  onChange={(e) => setSelectedEstado(e.target.value as EstadoSolicitudEPP | '')}
                >
                  <option value="">Todos los estados</option>
                  {Object.values(EstadoSolicitudEPP).map((estado) => (
                    <option key={estado} value={estado}>
                      {estado}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          {/* Lista de Solicitudes */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : filteredSolicitudes.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">No hay solicitudes registradas</p>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {filteredSolicitudes.map((solicitud) => (
                  <div
                    key={solicitud.id}
                    className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-slate-900">
                              {solicitud.trabajador_nombre || 'N/A'}
                            </h3>
                            <p className="text-sm text-slate-600">
                              {solicitud.tipo_epp} - Talla: {solicitud.talla} - Cantidad: {solicitud.cantidad}
                            </p>
                          </div>
                          {getEstadoBadge(solicitud.estado)}
                        </div>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-slate-600">
                            <span className="font-medium">Motivo:</span> {solicitud.motivo}
                          </p>
                          {solicitud.descripcion_motivo && (
                            <p className="text-sm text-slate-600">
                              {solicitud.descripcion_motivo}
                            </p>
                          )}
                          <p className="text-sm text-slate-500">
                            Fecha: {new Date(solicitud.fecha_solicitud).toLocaleDateString('es-PE')}
                          </p>
                          {solicitud.fecha_aprobacion && (
                            <p className="text-sm text-slate-500">
                              Aprobada: {new Date(solicitud.fecha_aprobacion).toLocaleDateString('es-PE')}
                            </p>
                          )}
                          {solicitud.fecha_entrega && (
                            <p className="text-sm text-slate-500">
                              Entregada: {new Date(solicitud.fecha_entrega).toLocaleDateString('es-PE')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {canApprove && solicitud.estado === EstadoSolicitudEPP.Pendiente && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAprobar(solicitud.id)}
                              className="text-success border-success hover:bg-success hover:text-white"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Aprobar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRechazar(solicitud.id)}
                              className="text-danger border-danger hover:bg-danger hover:text-white"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Rechazar
                            </Button>
                          </>
                        )}
                        {canDeliver && solicitud.estado === EstadoSolicitudEPP.Aprobada && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedSolicitud(solicitud);
                              setShowFirmaModal(true);
                            }}
                          >
                            <FileSignature className="w-4 h-4 mr-1" />
                            Confirmar Entrega
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal de Firma */}
        <Modal
          isOpen={showFirmaModal}
          onClose={() => {
            setShowFirmaModal(false);
            setSelectedSolicitud(null);
            setFirmaUrl('');
          }}
          title="Confirmar Entrega - Firma de Recepción"
          size="md"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Capture la firma del trabajador para confirmar la entrega del EPP.
            </p>
            <SignatureCanvas
              onSave={(url) => setFirmaUrl(url)}
              initialValue={selectedSolicitud?.firma_recepcion_url || ''}
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowFirmaModal(false);
                  setSelectedSolicitud(null);
                  setFirmaUrl('');
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleConfirmarEntrega} disabled={!firmaUrl}>
                Confirmar Entrega
              </Button>
            </div>
          </div>
        </Modal>
      </MainLayout>
    </ProtectedRoute>
  );
}
