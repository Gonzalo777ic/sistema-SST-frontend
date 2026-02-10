'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  eppService,
  SolicitudEPP,
  EstadoSolicitudEPP,
  TipoEPP,
} from '@/services/epp.service';
import { trabajadoresService, Trabajador } from '@/services/trabajadores.service';
import { empresasService, Empresa } from '@/services/empresas.service';
import { areasService, Area } from '@/services/areas.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
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
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { UsuarioRol } from '@/types';
import SignatureCanvas from '@/components/ui/signature-canvas';

// Interfaz extendida para la tabla
interface ISolicitudEPPTable extends SolicitudEPP {
  codigo_correlativo?: string;
  usuario_epp?: string;
  solicitante?: string;
  razon_social?: string;
  unidad?: string;
  area_nombre?: string;
  sede?: string;
}

// Datos mock para visualización inmediata
const MOCK_DATA: ISolicitudEPPTable[] = [
  {
    id: '1',
    fecha_solicitud: '2024-01-15',
    tipo_epp: TipoEPP.Casco,
    cantidad: 2,
    talla: 'M',
    motivo: 'Nuevo Ingreso' as any,
    descripcion_motivo: 'Trabajador nuevo',
    estado: EstadoSolicitudEPP.Pendiente,
    supervisor_aprobador: null,
    supervisor_aprobador_id: null,
    fecha_aprobacion: null,
    comentarios_aprobacion: null,
    entregado_por: null,
    entregado_por_id: null,
    fecha_entrega: null,
    firma_recepcion_url: null,
    trabajador_id: '1',
    trabajador_nombre: 'Juan Pérez',
    area_id: '1',
    empresa_id: '1',
    createdAt: new Date(),
    updatedAt: new Date(),
    codigo_correlativo: 'EPP-2024-001',
    usuario_epp: 'Juan Pérez',
    solicitante: 'Juan Pérez',
    razon_social: 'Empresa ABC S.A.',
    unidad: 'Unidad Operativa 1',
    area_nombre: 'Producción',
    sede: 'Lima',
  },
  {
    id: '2',
    fecha_solicitud: '2024-01-16',
    tipo_epp: TipoEPP.BotasSeguridad,
    cantidad: 1,
    talla: '42',
    motivo: 'ReposicionDesgaste' as any,
    descripcion_motivo: 'Botas desgastadas',
    estado: EstadoSolicitudEPP.Aprobada,
    supervisor_aprobador: 'María González',
    supervisor_aprobador_id: '2',
    fecha_aprobacion: '2024-01-17',
    comentarios_aprobacion: null,
    entregado_por: null,
    entregado_por_id: null,
    fecha_entrega: null,
    firma_recepcion_url: null,
    trabajador_id: '2',
    trabajador_nombre: 'Carlos Rodríguez',
    area_id: '2',
    empresa_id: '1',
    createdAt: new Date(),
    updatedAt: new Date(),
    codigo_correlativo: 'EPP-2024-002',
    usuario_epp: 'Carlos Rodríguez',
    solicitante: 'Carlos Rodríguez',
    razon_social: 'Empresa ABC S.A.',
    unidad: 'Unidad Operativa 2',
    area_nombre: 'Mantenimiento',
    sede: 'Arequipa',
  },
  {
    id: '3',
    fecha_solicitud: '2024-01-18',
    tipo_epp: TipoEPP.Guantes,
    cantidad: 3,
    talla: 'L',
    motivo: 'Perdida' as any,
    descripcion_motivo: 'Guantes perdidos',
    estado: EstadoSolicitudEPP.Entregada,
    supervisor_aprobador: 'María González',
    supervisor_aprobador_id: '2',
    fecha_aprobacion: '2024-01-19',
    comentarios_aprobacion: null,
    entregado_por: 'Ana López',
    entregado_por_id: '3',
    fecha_entrega: '2024-01-20',
    firma_recepcion_url: 'https://example.com/firma.png',
    trabajador_id: '3',
    trabajador_nombre: 'Luis Martínez',
    area_id: '1',
    empresa_id: '1',
    createdAt: new Date(),
    updatedAt: new Date(),
    codigo_correlativo: 'EPP-2024-003',
    usuario_epp: 'Luis Martínez',
    solicitante: 'Luis Martínez',
    razon_social: 'Empresa ABC S.A.',
    unidad: 'Unidad Operativa 1',
    area_nombre: 'Producción',
    sede: 'Lima',
  },
  {
    id: '4',
    fecha_solicitud: '2024-01-20',
    tipo_epp: TipoEPP.LentesSeguridad,
    cantidad: 1,
    talla: 'Única',
    motivo: 'Dano' as any,
    descripcion_motivo: 'Lentes dañados',
    estado: EstadoSolicitudEPP.Rechazada,
    supervisor_aprobador: 'María González',
    supervisor_aprobador_id: '2',
    fecha_aprobacion: '2024-01-21',
    comentarios_aprobacion: 'No cumple requisitos',
    entregado_por: null,
    entregado_por_id: null,
    fecha_entrega: null,
    firma_recepcion_url: null,
    trabajador_id: '4',
    trabajador_nombre: 'Pedro Sánchez',
    area_id: '3',
    empresa_id: '1',
    createdAt: new Date(),
    updatedAt: new Date(),
    codigo_correlativo: 'EPP-2024-004',
    usuario_epp: 'Pedro Sánchez',
    solicitante: 'Pedro Sánchez',
    razon_social: 'Empresa ABC S.A.',
    unidad: 'Unidad Operativa 3',
    area_nombre: 'Logística',
    sede: 'Trujillo',
  },
];

export default function EPPPage() {
  const { usuario, hasAnyRole } = useAuth();
  const [solicitudes, setSolicitudes] = useState<ISolicitudEPPTable[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSolicitud, setSelectedSolicitud] = useState<SolicitudEPP | null>(null);
  const [showFirmaModal, setShowFirmaModal] = useState(false);
  const [firmaUrl, setFirmaUrl] = useState<string>('');

  // Estados de filtros
  const [filtroUsuarioEPP, setFiltroUsuarioEPP] = useState('');
  const [filtroSolicitante, setFiltroSolicitante] = useState('');
  const [filtroRazonSocial, setFiltroRazonSocial] = useState('');
  const [filtroUnidad, setFiltroUnidad] = useState('');
  const [filtroArea, setFiltroArea] = useState('');
  const [filtroSede, setFiltroSede] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoSolicitudEPP | ''>('');
  const [filtroCodigo, setFiltroCodigo] = useState('');

  const canCreate = hasAnyRole([
    UsuarioRol.SUPER_ADMIN,
    UsuarioRol.ADMIN_EMPRESA,
    UsuarioRol.INGENIERO_SST,
    UsuarioRol.SUPERVISOR,
    UsuarioRol.EMPLEADO,
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

  const loadData = async () => {
    try {
      setIsLoading(true);
      // Cargar datos del backend
      const empresaId = usuario?.empresaId || undefined;
      const trabajadorId = usuario?.trabajadorId || undefined;
      const estado = filtroEstado || undefined;
      
      const [solicitudesData, empresasData, areasData] = await Promise.all([
        eppService.findAll(empresaId, trabajadorId, estado).catch(() => []),
        empresasService.findAll().catch(() => []),
        empresaId ? areasService.findAll(empresaId).catch(() => []) : Promise.resolve([]),
      ]);

      // Transformar solicitudes para incluir datos adicionales
      const solicitudesTransformadas: ISolicitudEPPTable[] = solicitudesData.map((sol, index) => ({
        ...sol,
        codigo_correlativo: `EPP-2024-${String(index + 1).padStart(3, '0')}`,
        usuario_epp: sol.trabajador_nombre || 'N/A',
        solicitante: sol.trabajador_nombre || 'N/A',
        razon_social: empresasData.find(e => e.id === sol.empresa_id)?.nombre || 'N/A',
        unidad: 'Unidad Operativa 1', // Placeholder
        area_nombre: areasData.find(a => a.id === sol.area_id)?.nombre || 'N/A',
        sede: 'Lima', // Placeholder
      }));

      // Si no hay datos del backend, usar mock data
      if (solicitudesTransformadas.length === 0) {
        setSolicitudes(MOCK_DATA);
      } else {
        setSolicitudes(solicitudesTransformadas);
      }

      setEmpresas(empresasData);
      setAreas(areasData);

      if (empresaId) {
        const trabajadoresData = await trabajadoresService.findAll(empresaId).catch(() => []);
        setTrabajadores(trabajadoresData);
      }
    } catch (error: any) {
      toast.error('Error al cargar datos');
      // En caso de error, usar mock data
      setSolicitudes(MOCK_DATA);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateEstado = async (id: string, nuevoEstado: EstadoSolicitudEPP) => {
    try {
      await eppService.updateEstado(id, {
        estado: nuevoEstado,
      });
      toast.success(`Estado actualizado a ${nuevoEstado}`);
      loadData();
    } catch (error: any) {
      toast.error('Error al actualizar estado', {
        description: error.response?.data?.message || 'No se pudo actualizar el estado',
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
      loadData();
    } catch (error: any) {
      toast.error('Error al confirmar entrega', {
        description: error.response?.data?.message || 'No se pudo confirmar la entrega',
      });
    }
  };

  // Filtrar solicitudes
  const filteredSolicitudes = solicitudes.filter((solicitud) => {
    const matchesUsuarioEPP = !filtroUsuarioEPP || 
      solicitud.usuario_epp?.toLowerCase().includes(filtroUsuarioEPP.toLowerCase());
    const matchesSolicitante = !filtroSolicitante || 
      solicitud.solicitante?.toLowerCase().includes(filtroSolicitante.toLowerCase());
    const matchesRazonSocial = !filtroRazonSocial || 
      solicitud.razon_social?.toLowerCase().includes(filtroRazonSocial.toLowerCase());
    const matchesUnidad = !filtroUnidad || 
      solicitud.unidad?.toLowerCase().includes(filtroUnidad.toLowerCase());
    const matchesArea = !filtroArea || 
      solicitud.area_nombre?.toLowerCase().includes(filtroArea.toLowerCase());
    const matchesSede = !filtroSede || 
      solicitud.sede?.toLowerCase().includes(filtroSede.toLowerCase());
    const matchesEstado = !filtroEstado || solicitud.estado === filtroEstado;
    const matchesCodigo = !filtroCodigo || 
      solicitud.codigo_correlativo?.toLowerCase().includes(filtroCodigo.toLowerCase());

    return matchesUsuarioEPP && matchesSolicitante && matchesRazonSocial && 
           matchesUnidad && matchesArea && matchesSede && matchesEstado && matchesCodigo;
  });

  const getEstadoColor = (estado: EstadoSolicitudEPP) => {
    switch (estado) {
      case EstadoSolicitudEPP.Entregada:
        return 'text-green-600 border-green-600';
      case EstadoSolicitudEPP.Pendiente:
        return 'text-orange-600 border-orange-600';
      case EstadoSolicitudEPP.Rechazada:
        return 'text-red-600 border-red-600';
      case EstadoSolicitudEPP.Aprobada:
        return 'text-blue-600 border-blue-600';
      default:
        return 'text-gray-600 border-gray-600';
    }
  };

  const getEstadoLabel = (estado: EstadoSolicitudEPP) => {
    switch (estado) {
      case EstadoSolicitudEPP.Rechazada:
        return 'OBSERVADA';
      case EstadoSolicitudEPP.Pendiente:
        return 'PENDIENTE';
      case EstadoSolicitudEPP.Aprobada:
        return 'APROBADA';
      case EstadoSolicitudEPP.Entregada:
        return 'ENTREGADA';
      default:
        return estado;
    }
  };

  const handleVerDetalle = (solicitud: ISolicitudEPPTable) => {
    setSelectedSolicitud(solicitud);
    // Aquí puedes abrir un modal de detalle o navegar a otra página
    toast.info('Funcionalidad de detalle en desarrollo');
  };

  return (
    <>
      <div className="space-y-6">
        {/* Cabecera */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Requerimiento de entrega de EPP</h1>
        </div>

        {/* Sección de Filtros (Collapsible) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
          >
            <span className="font-medium text-gray-700">&gt; Filtros de búsqueda</span>
            {showFilters ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>

          {showFilters && (
            <div className="p-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    Unidad
                  </label>
                  <Select
                    value={filtroUnidad}
                    onChange={(e) => setFiltroUnidad(e.target.value)}
                  >
                    <option value="">Todas</option>
                    <option value="Unidad Operativa 1">Unidad Operativa 1</option>
                    <option value="Unidad Operativa 2">Unidad Operativa 2</option>
                    <option value="Unidad Operativa 3">Unidad Operativa 3</option>
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
                      <option key={area.id} value={area.nombre}>
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
                    <option value="Lima">Lima</option>
                    <option value="Arequipa">Arequipa</option>
                    <option value="Trujillo">Trujillo</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <Select
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value as EstadoSolicitudEPP | '')}
                  >
                    <option value="">Todos</option>
                    <option value={EstadoSolicitudEPP.Aprobada}>APROBADA</option>
                    <option value={EstadoSolicitudEPP.Entregada}>ENTREGADA</option>
                    <option value={EstadoSolicitudEPP.Rechazada}>OBSERVADA</option>
                    <option value={EstadoSolicitudEPP.Pendiente}>PENDIENTE</option>
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

        {/* Barra de Herramientas */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <FileText className="w-4 h-4 mr-2" />
              Reporte
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <ClipboardList className="w-4 h-4 mr-2" />
              Fichas EPP
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Eye className="w-4 h-4 mr-2" />
              Kardex Por Trabajador
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Upload className="w-4 h-4 mr-2" />
              Importar Solicitudes
            </Button>
          </div>

          {canCreate && (
            <Link href="/epp/nueva">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Solicitud
              </Button>
            </Link>
          )}
        </div>

        {/* Tabla de Datos */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Código correlativo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Fecha Solicitud
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Usuario de EPP
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Solicitante
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Razón Social
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Unidad
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Área
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Sede
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <tr key={i}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((j) => (
                          <td key={j} className="px-4 py-4">
                            <Skeleton className="h-4 w-full" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                ) : filteredSolicitudes.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center">
                      <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Sin Información</p>
                    </td>
                  </tr>
                ) : (
                  filteredSolicitudes.map((solicitud) => (
                    <tr key={solicitud.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {solicitud.codigo_correlativo || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(solicitud.fecha_solicitud).toLocaleDateString('es-PE')}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {solicitud.usuario_epp || solicitud.trabajador_nombre || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {solicitud.solicitante || solicitud.trabajador_nombre || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {solicitud.razon_social || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {solicitud.unidad || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {solicitud.area_nombre || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {solicitud.sede || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <Select
                          value={solicitud.estado}
                          onChange={(e) => handleUpdateEstado(solicitud.id, e.target.value as EstadoSolicitudEPP)}
                          className={`text-sm border-2 rounded-md px-2 py-1 font-medium ${getEstadoColor(solicitud.estado)} bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1`}
                          style={{
                            minWidth: '140px',
                            cursor: 'pointer',
                          }}
                        >
                          <option value={EstadoSolicitudEPP.Pendiente}>PENDIENTE</option>
                          <option value={EstadoSolicitudEPP.Aprobada}>APROBADA</option>
                          <option value={EstadoSolicitudEPP.Entregada}>ENTREGADA</option>
                          <option value={EstadoSolicitudEPP.Rechazada}>OBSERVADA</option>
                        </Select>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleVerDetalle(solicitud)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
    </>
  );
}
