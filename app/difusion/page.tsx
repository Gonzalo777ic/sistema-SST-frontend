'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  difusionesService,
  DifusionDocumento,
  EstadoDifusion,
} from '@/services/difusiones.service';
import { documentosSstService, DocumentoSST } from '@/services/documentos-sst.service';
import { empresasService, Empresa } from '@/services/empresas.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  ChevronDown,
  ChevronUp,
  Package,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

export default function DifusionPage() {
  const { usuario } = useAuth();
  const [difusiones, setDifusiones] = useState<DifusionDocumento[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoSST[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estados de filtros
  const [filtroDocumento, setFiltroDocumento] = useState('');
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('');
  const [filtroFechaFin, setFiltroFechaFin] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoDifusion | ''>('');
  const [filtroRazonSocial, setFiltroRazonSocial] = useState('');

  // Estados del modal
  const [selectedDocumento, setSelectedDocumento] = useState('');
  const [fechaDifusion, setFechaDifusion] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [requiereFirma, setRequiereFirma] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const empresaId = usuario?.empresaId;

      const [difusionesData, documentosData, empresasData] = await Promise.all([
        difusionesService.findAll(empresaId).catch(() => []),
        documentosSstService.findAll(empresaId, true).catch(() => []),
        empresasService.findAll().catch(() => []),
      ]);

      // Filtrar solo documentos PDF y activos
      const documentosPDF = documentosData.filter(
        (doc) => doc.formato.toUpperCase() === 'PDF' && doc.activo,
      );

      setDifusiones(difusionesData);
      setDocumentos(documentosPDF);
      setEmpresas(empresasData);
    } catch (error: any) {
      toast.error('Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDifusion = async () => {
    if (!selectedDocumento) {
      toast.error('Debe seleccionar un documento');
      return;
    }

    if (!usuario?.empresaId || !usuario?.id) {
      toast.error('Error: No se pudo obtener la información del usuario');
      return;
    }

    try {
      await difusionesService.create({
        documento_id: selectedDocumento,
        fecha_difusion: fechaDifusion,
        requiere_firma: requiereFirma,
        empresa_id: usuario.empresaId,
        responsable_id: usuario.id,
      });

      toast.success('Difusión creada exitosamente');
      setIsModalOpen(false);
      resetModal();
      loadData();
    } catch (error: any) {
      toast.error('Error al crear difusión', {
        description:
          error.response?.data?.message || 'No se pudo crear la difusión',
      });
    }
  };

  const resetModal = () => {
    setSelectedDocumento('');
    setFechaDifusion(new Date().toISOString().split('T')[0]);
    setRequiereFirma(true);
  };

  // Filtrar difusiones
  const filteredDifusiones = difusiones.filter((difusion) => {
    const matchesDocumento =
      !filtroDocumento ||
      difusion.documento_nombre
        .toLowerCase()
        .includes(filtroDocumento.toLowerCase()) ||
      difusion.documento_id === filtroDocumento;
    const matchesEstado = !filtroEstado || difusion.estado === filtroEstado;
    const matchesRazonSocial =
      !filtroRazonSocial ||
      difusion.empresa_nombre
        .toLowerCase()
        .includes(filtroRazonSocial.toLowerCase()) ||
      difusion.empresa_id === filtroRazonSocial;

    const fechaDifusionDate = new Date(difusion.fecha_difusion);
    const matchesFechaInicio =
      !filtroFechaInicio || fechaDifusionDate >= new Date(filtroFechaInicio);
    const matchesFechaFin =
      !filtroFechaFin || fechaDifusionDate <= new Date(filtroFechaFin);

    return (
      matchesDocumento &&
      matchesEstado &&
      matchesRazonSocial &&
      matchesFechaInicio &&
      matchesFechaFin
    );
  });

  const getEstadoBadge = (estado: EstadoDifusion) => {
    switch (estado) {
      case EstadoDifusion.EnProceso:
        return (
          <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
            {estado}
          </span>
        );
      case EstadoDifusion.Cerrada:
        return (
          <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">
            {estado}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Cabecera */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Difusión</h1>
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
                    Documento
                  </label>
                  <Select
                    value={filtroDocumento}
                    onChange={(e) => setFiltroDocumento(e.target.value)}
                  >
                    <option value="">Todos</option>
                    {documentos.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.titulo}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de difusión (Desde)
                  </label>
                  <Input
                    type="date"
                    value={filtroFechaInicio}
                    onChange={(e) => setFiltroFechaInicio(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de difusión (Hasta)
                  </label>
                  <Input
                    type="date"
                    value={filtroFechaFin}
                    onChange={(e) => setFiltroFechaFin(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <Select
                    value={filtroEstado}
                    onChange={(e) =>
                      setFiltroEstado(e.target.value as EstadoDifusion | '')
                    }
                  >
                    <option value="">Todos</option>
                    <option value={EstadoDifusion.EnProceso}>En proceso</option>
                    <option value={EstadoDifusion.Cerrada}>Cerrada</option>
                  </Select>
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
                      <option key={empresa.id} value={empresa.id}>
                        {empresa.nombre}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Acción Principal */}
        <div className="flex justify-end">
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva difusión
          </Button>
        </div>

        {/* Tabla de Resultados */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Nro.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Documento
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Razón social
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Fecha de difusión
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Usuario responsable
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Requiere Firmar
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Cumplimiento de firmas
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <tr key={i}>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((j) => (
                          <td key={j} className="px-4 py-4">
                            <Skeleton className="h-4 w-full" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                ) : filteredDifusiones.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Sin Información</p>
                    </td>
                  </tr>
                ) : (
                  filteredDifusiones.map((difusion, index) => (
                    <tr key={difusion.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {difusion.documento_nombre}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {difusion.empresa_nombre}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(difusion.fecha_difusion).toLocaleDateString('es-PE')}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {difusion.responsable_nombre}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {difusion.requiere_firma ? 'Sí' : 'No'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {difusion.requiere_firma
                          ? `${difusion.total_firmas}/${difusion.total_trabajadores} (${difusion.cumplimiento_porcentaje}%)`
                          : 'N/A'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {getEstadoBadge(difusion.estado)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Nueva Difusión */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetModal();
        }}
        title="Nueva difusión"
        size="md"
      >
        <div className="space-y-4">
          {/* Alerta Informativa */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <Info className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Nota importante:</p>
                <p>
                  Solo están disponibles los documentos vigentes y aprobados. Ten
                  presente que solo se pueden difundir archivos cargados en PDF.
                </p>
              </div>
            </div>
          </div>

          {/* Formulario */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Documento <span className="text-red-500">*</span>
              </label>
              <Select
                value={selectedDocumento}
                onChange={(e) => setSelectedDocumento(e.target.value)}
                className="w-full"
              >
                <option value="">Seleccione un documento</option>
                {documentos.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.titulo} - {doc.version}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={fechaDifusion}
                onChange={(e) => setFechaDifusion(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="requiereFirma"
                checked={!requiereFirma}
                onChange={(e) => setRequiereFirma(!e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label
                htmlFor="requiereFirma"
                className="ml-2 text-sm text-gray-700"
              >
                No requiere firmar
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                resetModal();
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateDifusion}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Enviar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
