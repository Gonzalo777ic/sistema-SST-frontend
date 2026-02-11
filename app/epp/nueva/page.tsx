'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  eppService,
  CreateSolicitudEppDto,
  CreateSolicitudEppDetalleDto,
  IEPP,
  EstadoSolicitudEPP,
} from '@/services/epp.service';
import { trabajadoresService, Trabajador } from '@/services/trabajadores.service';
import { areasService, Area } from '@/services/areas.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  Package,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function NuevaSolicitudEPPPage() {
  const router = useRouter();
  const { usuario } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTrabajador, setIsLoadingTrabajador] = useState(false);
  const [showEppModal, setShowEppModal] = useState(false);

  // Datos del formulario
  const [dniBusqueda, setDniBusqueda] = useState('');
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState<Trabajador | null>(null);
  const [motivo, setMotivo] = useState('');
  const [centroCostos, setCentroCostos] = useState('');
  const [comentarios, setComentarios] = useState('');
  const [areaId, setAreaId] = useState('');
  const [detalles, setDetalles] = useState<CreateSolicitudEppDetalleDto[]>([]);

  // Datos de carga
  const [epps, setEpps] = useState<IEPP[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);

  useEffect(() => {
    if (usuario?.empresaId) {
      loadEpps();
      loadAreas();
    }
  }, [usuario?.empresaId]);

  const loadEpps = async () => {
    if (!usuario?.empresaId) return;
    try {
      const eppsData = await eppService.findAllEpp(usuario.empresaId);
      setEpps(eppsData);
    } catch (error) {
      console.error('Error loading EPPs:', error);
    }
  };

  const loadAreas = async () => {
    if (!usuario?.empresaId) return;
    try {
      const areasData = await areasService.findAll(usuario.empresaId);
      setAreas(areasData.filter((a) => a.activo));
    } catch (error) {
      console.error('Error loading areas:', error);
    }
  };

  const handleBuscarTrabajador = async () => {
    if (!dniBusqueda.trim()) {
      toast.error('Ingrese un DNI');
      return;
    }

    try {
      setIsLoadingTrabajador(true);
      const trabajador = await trabajadoresService.buscarPorDni(dniBusqueda);
      if (!trabajador) {
        toast.error('Trabajador no encontrado');
        return;
      }

      setTrabajadorSeleccionado(trabajador);
      setAreaId(trabajador.area_id || '');
      toast.success('Trabajador encontrado');
    } catch (error: any) {
      toast.error('Error al buscar trabajador', {
        description: error.response?.data?.message || 'No se pudo encontrar el trabajador',
      });
    } finally {
      setIsLoadingTrabajador(false);
    }
  };

  const handleAgregarEPP = (epp: IEPP) => {
    const existe = detalles.find((d) => d.epp_id === epp.id);
    if (existe) {
      toast.info('Este EPP ya está en la lista');
      return;
    }

    setDetalles([...detalles, { epp_id: epp.id, cantidad: 1 }]);
    setShowEppModal(false);
    toast.success('EPP agregado');
  };

  const handleEliminarDetalle = (index: number) => {
    setDetalles(detalles.filter((_, i) => i !== index));
  };

  const handleCambiarCantidad = (index: number, cantidad: number) => {
    const nuevosDetalles = [...detalles];
    nuevosDetalles[index].cantidad = cantidad;
    setDetalles(nuevosDetalles);
  };

  const handleSubmit = async () => {
    if (!trabajadorSeleccionado) {
      toast.error('Debe buscar y seleccionar un trabajador');
      return;
    }

    if (detalles.length === 0) {
      toast.error('Debe agregar al menos un item de EPP');
      return;
    }

    if (!usuario?.empresaId || !usuario?.id) {
      toast.error('Error de autenticación');
      return;
    }

    try {
      setIsLoading(true);
      const payload: CreateSolicitudEppDto = {
        usuario_epp_id: usuario.id,
        solicitante_id: trabajadorSeleccionado.id,
        motivo: motivo || undefined,
        centro_costos: centroCostos || undefined,
        comentarios: comentarios || undefined,
        area_id: areaId || undefined,
        empresa_id: usuario.empresaId,
        detalles,
        estado: EstadoSolicitudEPP.Pendiente,
      };

      await eppService.create(payload);
      toast.success('Solicitud creada correctamente');
      router.push('/epp');
    } catch (error: any) {
      toast.error('Error al crear solicitud', {
        description: error.response?.data?.message || 'No se pudo crear la solicitud',
      });
    } finally {
      setIsLoading(false);
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Nueva Solicitud EPP</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Búsqueda de Trabajador */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Datos del Solicitante
            </h2>

            <div className="flex gap-2 mb-4">
              <Input
                value={dniBusqueda}
                onChange={(e) => setDniBusqueda(e.target.value)}
                placeholder="Ingrese DNI del trabajador"
                className="flex-1"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleBuscarTrabajador();
                }}
              />
              <Button
                onClick={handleBuscarTrabajador}
                disabled={isLoadingTrabajador}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Search className="w-4 h-4 mr-2" />
                Buscar
              </Button>
            </div>

            {isLoadingTrabajador && (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            )}

            {trabajadorSeleccionado && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Nombres:</span>
                    <p className="text-gray-900">{trabajadorSeleccionado.nombre_completo}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">DNI:</span>
                    <p className="text-gray-900">{trabajadorSeleccionado.documento_identidad}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Puesto:</span>
                    <p className="text-gray-900">{trabajadorSeleccionado.cargo || '-'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Área:</span>
                    <p className="text-gray-900">
                      {areas.find((a) => a.id === trabajadorSeleccionado.area_id)?.nombre || '-'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Datos de la Solicitud */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Datos de la Solicitud
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo
                </label>
                <Input
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Motivo de la solicitud"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Centro de Costos
                </label>
                <Input
                  value={centroCostos}
                  onChange={(e) => setCentroCostos(e.target.value)}
                  placeholder="Centro de costos"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Área
                </label>
                <Select value={areaId} onChange={(e) => setAreaId(e.target.value)}>
                  <option value="">Seleccione un área</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.nombre}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comentarios
                </label>
                <textarea
                  value={comentarios}
                  onChange={(e) => setComentarios(e.target.value)}
                  placeholder="Comentarios adicionales"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Items de EPP */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Items de EPP</h2>
              <Button
                onClick={() => setShowEppModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar EPP
              </Button>
            </div>

            {detalles.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hay items agregados</p>
              </div>
            ) : (
              <div className="space-y-2">
                {detalles.map((detalle, index) => {
                  const epp = epps.find((e) => e.id === detalle.epp_id);
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                    >
                      {epp?.imagen_url && (
                        <img
                          src={epp.imagen_url}
                          alt={epp.nombre}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{epp?.nombre || 'EPP'}</p>
                        <p className="text-sm text-gray-600">{epp?.tipo_proteccion}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-700">Cantidad:</label>
                        <Input
                          type="number"
                          min="1"
                          value={detalle.cantidad}
                          onChange={(e) =>
                            handleCambiarCantidad(index, parseInt(e.target.value) || 1)
                          }
                          className="w-20"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEliminarDetalle(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Panel de Acciones */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-4">
            <div className="space-y-4">
              <Button
                onClick={handleSubmit}
                disabled={isLoading || detalles.length === 0 || !trabajadorSeleccionado}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? 'Guardando...' : 'Guardar Solicitud'}
              </Button>

              <Link href="/epp">
                <Button variant="outline" className="w-full">
                  Cancelar
                </Button>
              </Link>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Total de items: <span className="font-medium">{detalles.length}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Cantidad total:{' '}
                  <span className="font-medium">
                    {detalles.reduce((sum, d) => sum + d.cantidad, 0)}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Selección EPP */}
      <Modal
        isOpen={showEppModal}
        onClose={() => setShowEppModal(false)}
        title="Seleccionar EPP"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
            {epps.map((epp) => (
              <button
                key={epp.id}
                onClick={() => handleAgregarEPP(epp)}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
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
                      <p className="text-xs text-gray-500 mt-1">{epp.descripcion}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Stock: {epp.stock} | Vigencia: {epp.vigencia || 'N/A'}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
