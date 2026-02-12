'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  eppService,
  CreateSolicitudEppDto,
  CreateSolicitudEppDetalleDto,
  IEPP,
  EstadoSolicitudEPP,
  MotivoSolicitudEPP,
} from '@/services/epp.service';
import { trabajadoresService, Trabajador } from '@/services/trabajadores.service';
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
import { UsuarioRol } from '@/types';

const LABEL_MOTIVO: Record<MotivoSolicitudEPP, string> = {
  [MotivoSolicitudEPP.Perdida]: 'Pérdida',
  [MotivoSolicitudEPP.Caduco]: 'Caducó',
  [MotivoSolicitudEPP.Averia]: 'Avería',
  [MotivoSolicitudEPP.NuevoPersonal]: 'Nuevo personal',
  [MotivoSolicitudEPP.Otro]: 'Otro (escribir)',
};

function formatApellidosNombres(t: Trabajador): string {
  if (t.apellido_paterno || t.apellido_materno || t.nombres) {
    return [t.apellido_paterno, t.apellido_materno, t.nombres].filter(Boolean).join(' ');
  }
  return t.nombre_completo;
}

export default function NuevaSolicitudEPPPage() {
  const router = useRouter();
  const { usuario, hasRole } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showEppModal, setShowEppModal] = useState(false);
  const [showTrabajadorDropdown, setShowTrabajadorDropdown] = useState(false);

  const [fechaRegistro] = useState(() => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  });
  const [busquedaTrabajador, setBusquedaTrabajador] = useState('');
  const [trabajadoresResultado, setTrabajadoresResultado] = useState<Trabajador[]>([]);
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState<Trabajador | null>(null);
  const [motivo, setMotivo] = useState<MotivoSolicitudEPP | ''>('');
  const [motivoOtro, setMotivoOtro] = useState('');
  const [centroCostos, setCentroCostos] = useState('');
  const [comentarios, setComentarios] = useState('');
  const [detalles, setDetalles] = useState<CreateSolicitudEppDetalleDto[]>([]);

  const [epps, setEpps] = useState<IEPP[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const esAdmin = hasRole(UsuarioRol.SUPER_ADMIN) || hasRole(UsuarioRol.ADMIN_EMPRESA);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowTrabajadorDropdown(false);
      }
    };
    if (showTrabajadorDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTrabajadorDropdown]);

  useEffect(() => {
    const empresaId = (trabajadorSeleccionado?.empresa_id || usuario?.empresaId) ?? undefined;
    eppService.findAllEpp(empresaId).then(setEpps).catch(() => setEpps([]));
  }, [usuario?.empresaId, trabajadorSeleccionado?.empresa_id]);

  const handleBuscarTrabajador = async () => {
    if (!busquedaTrabajador.trim() || busquedaTrabajador.trim().length < 2) {
      toast.error('Ingrese al menos 2 caracteres para buscar (nombre, apellido o documento)');
      return;
    }

    const empresaId = esAdmin ? undefined : (usuario?.empresaId ?? undefined);
    if (!esAdmin && !empresaId) return;

    try {
      setIsSearching(true);
      const results = await trabajadoresService.buscar(empresaId, busquedaTrabajador);
      setTrabajadoresResultado(results);
      setShowTrabajadorDropdown(true);
      if (results.length === 0) {
        toast.info('No se encontraron trabajadores');
      }
    } catch (error: any) {
      toast.error('Error al buscar', {
        description: error.response?.data?.message,
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSeleccionarTrabajador = (t: Trabajador) => {
    setTrabajadorSeleccionado(t);
    setShowTrabajadorDropdown(false);
    setBusquedaTrabajador('');
    setTrabajadoresResultado([]);
    toast.success('Colaborador seleccionado');
  };

  const handleEliminarTrabajador = () => {
    setTrabajadorSeleccionado(null);
    setDetalles([]);
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
    nuevosDetalles[index].cantidad = Math.max(1, cantidad);
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
    if (!usuario?.id) {
      toast.error('Error de autenticación');
      return;
    }

    const empresaId = trabajadorSeleccionado.empresa_id || usuario?.empresaId;
    if (!empresaId) {
      toast.error('No se pudo determinar la empresa');
      return;
    }

    const motivoFinal =
      motivo === MotivoSolicitudEPP.Otro ? motivoOtro : (motivo || undefined);

    try {
      setIsLoading(true);
      const payload: CreateSolicitudEppDto = {
        usuario_epp_id: usuario.id,
        solicitante_id: trabajadorSeleccionado.id,
        motivo: motivoFinal,
        centro_costos: centroCostos || undefined,
        comentarios: comentarios || undefined,
        empresa_id: empresaId,
        detalles,
        estado: EstadoSolicitudEPP.Pendiente,
      };

      await eppService.create(payload);
      toast.success('Requerimiento creado correctamente');
      router.push('/epp');
    } catch (error: any) {
      toast.error('Error al crear requerimiento', {
        description: error.response?.data?.message || 'No se pudo crear el requerimiento',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/epp">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Regresar
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Nuevo requerimiento de entrega de EPP
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Fecha de registro y Motivo */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de registro (*)
                </label>
                <Input
                  value={fechaRegistro}
                  readOnly
                  className="bg-gray-50 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo (*)
                </label>
                <Select
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value as MotivoSolicitudEPP | '')}
                >
                  <option value="">Seleccione</option>
                  {Object.values(MotivoSolicitudEPP).map((m) => (
                    <option key={m} value={m}>
                      {LABEL_MOTIVO[m]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            {motivo === MotivoSolicitudEPP.Otro && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Especifique el motivo
                </label>
                <Input
                  value={motivoOtro}
                  onChange={(e) => setMotivoOtro(e.target.value)}
                  placeholder="Escriba el motivo..."
                />
              </div>
            )}
          </div>

          {/* Datos del Trabajador Solicitante */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Datos de usuarios de EPP
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Buscar colaborador (*)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Búsqueda por nombre, apellido paterno, apellido materno o documento (DNI, Pasaporte, Carné de extranjería). Con rol ADMIN se buscan en todas las empresas.
                </p>
                <div className="flex gap-2 relative" ref={dropdownRef}>
                  <Input
                    id="buscar-colaborador"
                    value={busquedaTrabajador}
                    onChange={(e) => setBusquedaTrabajador(e.target.value)}
                    placeholder="Ingrese nombre, apellido o documento"
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleBuscarTrabajador();
                      }
                    }}
                  />
                  <Button
                    onClick={handleBuscarTrabajador}
                    disabled={isSearching}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Buscar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('buscar-colaborador')?.focus()}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar colaborador
                  </Button>
                  {showTrabajadorDropdown && trabajadoresResultado.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                      {trabajadoresResultado.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleSeleccionarTrabajador(t)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between border-b border-gray-100 last:border-0"
                        >
                          <span className="font-medium">
                            {formatApellidosNombres(t)} - {t.numero_documento || t.documento_identidad}
                          </span>
                          <span className="text-sm text-blue-600">Seleccionar</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {isSearching && (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              )}

              {!trabajadorSeleccionado && !isSearching && (
                <p className="text-center py-4 text-gray-500">Sin solicitantes</p>
              )}

              {trabajadorSeleccionado && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <h3 className="font-medium text-gray-900">Colaborador seleccionado</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleEliminarTrabajador}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Eliminar
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Nombres y apellidos:</span>
                      <p className="text-gray-900">{formatApellidosNombres(trabajadorSeleccionado)}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Área / Sede:</span>
                      <p className="text-gray-900">
                        {trabajadorSeleccionado.area_nombre || '-'} / {trabajadorSeleccionado.sede || '-'}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Puesto:</span>
                      <p className="text-gray-900">{trabajadorSeleccionado.cargo || trabajadorSeleccionado.puesto || '-'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Jefe directo:</span>
                      <p className="text-gray-900">{trabajadorSeleccionado.jefe_directo || '-'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Ingresa tu solicitud de EPPs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-4">
              Ingresa tu solicitud de EPPs. Verás una lista pre-cargada con los EPPs y especificaciones registradas
              para este trabajador. Puedes modificar detalles y cantidades, e incluso agregar más EPPs a tu solicitud
              si lo ves necesario.
            </p>

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Agregar EPP</h2>
              <Button
                onClick={() => setShowEppModal(true)}
                disabled={!trabajadorSeleccionado}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar EPP
              </Button>
            </div>

            {detalles.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hay items seleccionados</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 text-sm font-medium text-gray-700">EPP</th>
                      <th className="text-left py-2 px-2 text-sm font-medium text-gray-700">Tipo</th>
                      <th className="text-center py-2 px-2 text-sm font-medium text-gray-700">Cantidad</th>
                      <th className="w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalles.map((detalle, index) => {
                      const epp = epps.find((e) => e.id === detalle.epp_id);
                      return (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              {epp?.imagen_url && (
                                <img
                                  src={epp.imagen_url}
                                  alt={epp.nombre}
                                  className="w-12 h-12 object-cover rounded"
                                />
                              )}
                              <span className="font-medium">{epp?.nombre || 'EPP'}</span>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-sm text-gray-600">{epp?.tipo_proteccion}</td>
                          <td className="py-3 px-2 text-center">
                            <Input
                              type="number"
                              min={1}
                              value={detalle.cantidad}
                              onChange={(e) =>
                                handleCambiarCantidad(index, parseInt(e.target.value) || 1)
                              }
                              className="w-20 mx-auto text-center"
                            />
                          </td>
                          <td className="py-3 px-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEliminarDetalle(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Comentario */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comentario
            </label>
            <textarea
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              placeholder="Escribe un comentario"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              rows={3}
            />
          </div>
        </div>

        {/* Panel lateral */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-4">
            <div className="space-y-4">
              <Button
                onClick={handleSubmit}
                disabled={isLoading || detalles.length === 0 || !trabajadorSeleccionado}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? 'Guardando...' : 'Enviar requerimiento'}
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
                type="button"
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
