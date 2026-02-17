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
  Package,
  Star,
  History,
  Sparkles,
  Grid3X3,
} from 'lucide-react';
import { EppImage } from '@/components/epp/EppImage';
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

export default function NuevaSolicitudEmpleadoPage() {
  const router = useRouter();
  const { usuario, hasAnyRole } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showEppModal, setShowEppModal] = useState(false);

  const [fechaRegistro] = useState(() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  });
  const [trabajador, setTrabajador] = useState<Trabajador | null>(null);
  const [motivo, setMotivo] = useState<MotivoSolicitudEPP | ''>('');
  const [motivoOtro, setMotivoOtro] = useState('');
  const [centroCostos, setCentroCostos] = useState('');
  const [comentarios, setComentarios] = useState('');
  const [detalles, setDetalles] = useState<CreateSolicitudEppDetalleDto[]>([]);

  const [epps, setEpps] = useState<IEPP[]>([]);
  const [favoritosIds, setFavoritosIds] = useState<string[]>([]);
  const [anteriormenteSolicitados, setAnteriormenteSolicitados] = useState<IEPP[]>([]);

  const esSoloEmpleado =
    hasAnyRole([UsuarioRol.EMPLEADO]) &&
    !hasAnyRole([UsuarioRol.SUPER_ADMIN, UsuarioRol.ADMIN_EMPRESA, UsuarioRol.INGENIERO_SST, UsuarioRol.SUPERVISOR]);

  useEffect(() => {
    if (!esSoloEmpleado || !usuario?.trabajadorId || !usuario?.empresaId) {
      router.replace('/epp');
      return;
    }
    trabajadoresService
      .findOne(usuario.trabajadorId)
      .then(setTrabajador)
      .catch(() => router.replace('/epp'));
  }, [esSoloEmpleado, usuario?.trabajadorId, usuario?.empresaId, router]);

  useEffect(() => {
    if (!usuario?.trabajadorId || !usuario?.empresaId) return;
    Promise.all([
      eppService.findAllEpp(usuario.empresaId),
      eppService.getFavoritosEpp(usuario.trabajadorId),
      eppService.getEppsAnteriormenteSolicitados(usuario.trabajadorId, usuario.empresaId),
    ]).then(([eppsData, favIds, antData]) => {
      setEpps(eppsData);
      setFavoritosIds(favIds);
      setAnteriormenteSolicitados(antData);
    });
  }, [usuario?.trabajadorId, usuario?.empresaId]);

  const eppsFavoritos = epps.filter((e) => favoritosIds.includes(e.id));
  const eppsAnteriormente = anteriormenteSolicitados.filter(
    (e) => !favoritosIds.includes(e.id),
  );
  const eppsRecomendados = epps.filter(
    (e) =>
      !favoritosIds.includes(e.id) &&
      !anteriormenteSolicitados.some((a) => a.id === e.id),
  ).slice(0, 6);
  const eppsResto = epps.filter(
    (e) =>
      !favoritosIds.includes(e.id) &&
      !anteriormenteSolicitados.some((a) => a.id === e.id) &&
      !eppsRecomendados.some((r) => r.id === e.id),
  );

  const handleToggleFavorito = async (eppId: string) => {
    try {
      const res = await eppService.toggleFavoritoEpp(eppId);
      setFavoritosIds((prev) =>
        res.es_favorito ? [...prev, eppId] : prev.filter((id) => id !== eppId),
      );
      toast.success(res.es_favorito ? 'Agregado a favoritos' : 'Quitado de favoritos');
    } catch {
      toast.error('Error al actualizar favoritos');
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
    nuevosDetalles[index].cantidad = Math.max(1, cantidad);
    setDetalles(nuevosDetalles);
  };

  const handleSubmit = async () => {
    if (!trabajador || !usuario?.id) {
      toast.error('Error de autenticación');
      return;
    }
    if (detalles.length === 0) {
      toast.error('Debe agregar al menos un item de EPP');
      return;
    }
    const empresaId = trabajador.empresa_id || usuario?.empresaId;
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
        solicitante_id: trabajador.id,
        motivo: motivoFinal,
        centro_costos: centroCostos || undefined,
        comentarios: comentarios || undefined,
        empresa_id: empresaId,
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

  const EppCard = ({
    epp,
    showFavorito = true,
  }: {
    epp: IEPP;
    showFavorito?: boolean;
  }) => (
    <button
      type="button"
      onClick={() => handleAgregarEPP(epp)}
      className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left flex items-start gap-3"
    >
      <EppImage src={epp.imagen_url} alt={epp.nombre} className="w-16 h-16 object-cover rounded flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900">{epp.nombre}</h3>
        <p className="text-sm text-gray-600">{epp.tipo_proteccion}</p>
        {epp.descripcion && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{epp.descripcion}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">Vigencia: {epp.vigencia || 'N/A'}</p>
      </div>
      {showFavorito && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleFavorito(epp.id);
          }}
          className="p-1 rounded hover:bg-gray-100"
        >
          <Star
            className={`w-5 h-5 ${
              favoritosIds.includes(epp.id) ? 'fill-amber-400 text-amber-500' : 'text-gray-400'
            }`}
          />
        </button>
      )}
    </button>
  );

  if (!trabajador) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Skeleton className="h-64 w-full max-w-md" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/epp">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Regresar
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          Nueva solicitud de EPP
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de registro (*)
                </label>
                <Input value={fechaRegistro} readOnly className="bg-gray-50" />
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

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Solicitante
            </h2>
            <p className="text-gray-700">{trabajador.nombre_completo}</p>
            <p className="text-sm text-gray-500">
              {trabajador.area_nombre || '-'} / {trabajador.sede || '-'}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Agregar EPP</h2>
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
                <p>No hay items seleccionados</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 text-sm font-medium text-gray-700">
                        EPP
                      </th>
                      <th className="text-left py-2 px-2 text-sm font-medium text-gray-700">
                        Tipo
                      </th>
                      <th className="text-center py-2 px-2 text-sm font-medium text-gray-700">
                        Cantidad
                      </th>
                      <th className="w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalles.map((detalle, index) => {
                      const epp = epps.find((e) => e.id === detalle.epp_id);
                      return (
                        <tr
                          key={index}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              <EppImage src={epp?.imagen_url} alt={epp?.nombre || 'EPP'} className="w-12 h-12 object-cover rounded flex-shrink-0" />
                              <span className="font-medium">{epp?.nombre || 'EPP'}</span>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-sm text-gray-600">
                            {epp?.tipo_proteccion}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <Input
                              type="number"
                              min={1}
                              value={detalle.cantidad}
                              onChange={(e) =>
                                handleCambiarCantidad(
                                  index,
                                  parseInt(e.target.value) || 1,
                                )
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

        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-4">
            <Button
              onClick={handleSubmit}
              disabled={isLoading || detalles.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? 'Guardando...' : 'Enviar solicitud'}
            </Button>
            <Link href="/epp">
              <Button variant="outline" className="w-full mt-2">
                Cancelar
              </Button>
            </Link>
            <div className="pt-4 border-t border-gray-200 mt-4">
              <p className="text-sm text-gray-600">
                Total items: <span className="font-medium">{detalles.length}</span>
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

      <Modal
        isOpen={showEppModal}
        onClose={() => setShowEppModal(false)}
        title="Seleccionar EPP"
        size="lg"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto">
          {eppsFavoritos.length > 0 && (
            <section>
              <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                Favoritos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {eppsFavoritos.map((epp) => (
                  <EppCard key={epp.id} epp={epp} showFavorito={true} />
                ))}
              </div>
            </section>
          )}

          {eppsAnteriormente.length > 0 && (
            <section>
              <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
                <History className="w-5 h-5 text-blue-600" />
                Anteriormente solicitados
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {eppsAnteriormente.map((epp) => (
                  <EppCard key={epp.id} epp={epp} showFavorito={true} />
                ))}
              </div>
            </section>
          )}

          {eppsRecomendados.length > 0 && (
            <section>
              <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
                <Sparkles className="w-5 h-5 text-purple-500" />
                Recomendados
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {eppsRecomendados.map((epp) => (
                  <EppCard key={epp.id} epp={epp} showFavorito={true} />
                ))}
              </div>
            </section>
          )}

          {eppsResto.length > 0 && (
            <section>
              <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
                <Grid3X3 className="w-5 h-5 text-gray-600" />
                Todos los EPPs
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {eppsResto.map((epp) => (
                  <EppCard key={epp.id} epp={epp} showFavorito={true} />
                ))}
              </div>
            </section>
          )}

          {epps.length === 0 && (
            <p className="text-center py-8 text-gray-500">
              No hay EPPs disponibles para su empresa
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
