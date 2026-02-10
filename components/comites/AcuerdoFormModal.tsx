'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { comitesService } from '@/services/comites.service';
import { trabajadoresService, Trabajador } from '@/services/trabajadores.service';
import { IReunion, CreateAcuerdoComiteDto, TipoAcuerdo } from '@/types';
import { Search, X, Plus, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const acuerdoSchema = z.object({
  fecha_programada: z.string().min(1, 'La fecha de programación es obligatoria'),
  titulo: z.string().min(1, 'El título es obligatorio'),
  descripcion: z.string().min(1, 'La descripción es obligatoria'),
  tipo_acuerdo: z.nativeEnum(TipoAcuerdo).optional(),
  observaciones: z.string().optional(),
});

type AcuerdoFormData = z.infer<typeof acuerdoSchema>;

interface AcuerdoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  reunion: IReunion;
}

export default function AcuerdoFormModal({
  isOpen,
  onClose,
  onSuccess,
  reunion,
}: AcuerdoFormModalProps) {
  const { usuario } = useAuth();
  const [dniBusqueda, setDniBusqueda] = useState('');
  const [trabajadorEncontrado, setTrabajadorEncontrado] = useState<Trabajador | null>(null);
  const [responsables, setResponsables] = useState<Trabajador[]>([]);
  const [isBuscando, setIsBuscando] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<AcuerdoFormData>({
    resolver: zodResolver(acuerdoSchema),
    defaultValues: {
      tipo_acuerdo: TipoAcuerdo.CON_SEGUIMIENTO,
    },
  });

  const buscarTrabajador = async () => {
    if (!dniBusqueda.trim()) {
      toast.error('Ingrese un número de documento');
      return;
    }

    setIsBuscando(true);
    try {
      const trabajador = await trabajadoresService.buscarPorDni(dniBusqueda.trim());
      if (trabajador) {
        setTrabajadorEncontrado(trabajador);
      } else {
        toast.error('No se encontró un trabajador con ese DNI');
        setTrabajadorEncontrado(null);
      }
    } catch (error: any) {
      toast.error('Error al buscar el trabajador');
      setTrabajadorEncontrado(null);
    } finally {
      setIsBuscando(false);
    }
  };

  const agregarResponsable = () => {
    if (trabajadorEncontrado) {
      // Verificar que no esté ya agregado
      if (responsables.some((r) => r.id === trabajadorEncontrado.id)) {
        toast.warning('Este trabajador ya está en la lista de responsables');
        return;
      }
      setResponsables([...responsables, trabajadorEncontrado]);
      setTrabajadorEncontrado(null);
      setDniBusqueda('');
    }
  };

  const quitarResponsable = (id: string) => {
    setResponsables(responsables.filter((r) => r.id !== id));
  };

  const limpiarBusqueda = () => {
    setDniBusqueda('');
    setTrabajadorEncontrado(null);
  };

  const onSubmit = async (data: AcuerdoFormData) => {
    if (responsables.length === 0) {
      toast.error('Debe agregar al menos un responsable');
      return;
    }

    try {
      const payload: CreateAcuerdoComiteDto = {
        reunion_id: reunion.id,
        titulo: data.titulo,
        descripcion: data.descripcion,
        fecha_programada: data.fecha_programada,
        tipo_acuerdo: data.tipo_acuerdo,
        responsables_ids: responsables.map((r) => r.id),
        observaciones: data.observaciones,
      };

      await comitesService.createAcuerdo(payload);
      toast.success('Acuerdo creado exitosamente');
      reset();
      setResponsables([]);
      setTrabajadorEncontrado(null);
      setDniBusqueda('');
      onClose();
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al crear el acuerdo');
    }
  };

  if (!isOpen) return null;

  const formatearFechaHora = (fecha: string, hora?: string | null) => {
    const date = new Date(fecha);
    const fechaStr = date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    if (hora) {
      // Convertir hora HH:mm a formato 12h
      const [hours, minutes] = hora.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'pm' : 'am';
      const hour12 = hour % 12 || 12;
      return `${fechaStr} ${hour12}:${minutes} ${ampm}`;
    }
    return fechaStr;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* HEADER */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Agregar Nuevo Acuerdo</h2>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Regresar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>

        {/* CONTENT - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* SECCIÓN A: DATOS DE LA REUNIÓN (Read-Only) */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase">
                DATOS DE LA REUNIÓN
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 font-medium">FECHA:</span>{' '}
                  <span className="font-semibold">
                    {formatearFechaHora(reunion.fecha_realizacion, reunion.hora_registro)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 font-medium">SESIÓN:</span>{' '}
                  <span className="font-semibold">
                    {reunion.tipo_reunion === 'ORDINARIA' ? 'Ordinaria' : 'Extraordinaria'}
                  </span>
                </div>
                {reunion.descripcion && (
                  <div className="md:col-span-3">
                    <span className="text-gray-600 font-medium">DESCRIPCIÓN:</span>
                    <p className="mt-1 text-gray-900">{reunion.descripcion}</p>
                  </div>
                )}
              </div>
            </div>

            {/* SECCIÓN B: DATOS DEL ACUERDO */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase">
                DATOS DEL ACUERDO
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha Programación *
                  </label>
                  <Input type="date" {...register('fecha_programada')} />
                  {errors.fecha_programada && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.fecha_programada.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Registrado Por
                  </label>
                  <Input
                    value={usuario?.dni || 'Usuario actual'}
                    readOnly
                    className="bg-gray-100 cursor-not-allowed"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título *
                  </label>
                  <Input {...register('titulo')} placeholder="Título del acuerdo" />
                  {errors.titulo && (
                    <p className="text-red-500 text-xs mt-1">{errors.titulo.message}</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    DESCRIPCIÓN DEL ACUERDO *
                  </label>
                  <textarea
                    {...register('descripcion')}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={5}
                    placeholder="Descripción detallada del acuerdo..."
                  />
                  {errors.descripcion && (
                    <p className="text-red-500 text-xs mt-1">{errors.descripcion.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comité
                  </label>
                  <Input
                    value={reunion.comite_nombre || '-'}
                    readOnly
                    className="bg-gray-100 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN C: RESPONSABLES */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase">
                RESPONSABLES
              </h3>

              {/* Buscador */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ingresa el Nro de documento del responsable:
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Número de documento"
                    value={dniBusqueda}
                    onChange={(e) => setDniBusqueda(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        buscarTrabajador();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={buscarTrabajador}
                    disabled={isBuscando || !dniBusqueda.trim()}
                    className="bg-blue-600 hover:bg-blue-700 gap-2"
                  >
                    <Search className="h-4 w-4" />
                    BUSCAR
                  </Button>
                </div>
              </div>

              {/* Grid de Resultados del Trabajador Encontrado */}
              {trabajadorEncontrado && (
                <div className="bg-white border-2 border-gray-300 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-900">Datos del Trabajador</h4>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={agregarResponsable}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Agregar a Lista
                      </Button>
                      <Button
                        type="button"
                        onClick={limpiarBusqueda}
                        variant="outline"
                        size="sm"
                      >
                        Limpiar
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Nombres y Apellidos</label>
                      <Input
                        value={trabajadorEncontrado.nombre_completo}
                        readOnly
                        className="bg-gray-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Correo</label>
                      <Input
                        value={trabajadorEncontrado.email_personal || '-'}
                        readOnly
                        className="bg-gray-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Teléfono</label>
                      <Input
                        value={trabajadorEncontrado.telefono || '-'}
                        readOnly
                        className="bg-gray-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Sexo</label>
                      <Input
                        value={trabajadorEncontrado.sexo || '-'}
                        readOnly
                        className="bg-gray-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Fecha Nacimiento</label>
                      <Input
                        value={trabajadorEncontrado.fecha_nacimiento || '-'}
                        readOnly
                        className="bg-gray-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">País</label>
                      <Input
                        value={trabajadorEncontrado.pais || '-'}
                        readOnly
                        className="bg-gray-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Departamento</label>
                      <Input
                        value={trabajadorEncontrado.departamento || '-'}
                        readOnly
                        className="bg-gray-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Provincia</label>
                      <Input
                        value={trabajadorEncontrado.provincia || '-'}
                        readOnly
                        className="bg-gray-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Distrito</label>
                      <Input
                        value={trabajadorEncontrado.distrito || '-'}
                        readOnly
                        className="bg-gray-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Unidad</label>
                      <Input
                        value={trabajadorEncontrado.unidad || '-'}
                        readOnly
                        className="bg-gray-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Área</label>
                      <Input
                        value={trabajadorEncontrado.area_nombre || '-'}
                        readOnly
                        className="bg-gray-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Sede</label>
                      <Input
                        value={trabajadorEncontrado.sede || '-'}
                        readOnly
                        className="bg-gray-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Puesto</label>
                      <Input
                        value={trabajadorEncontrado.puesto || trabajadorEncontrado.cargo || '-'}
                        readOnly
                        className="bg-gray-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Centro de Costos</label>
                      <Input
                        value={trabajadorEncontrado.centro_costos || '-'}
                        readOnly
                        className="bg-gray-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Jefe Directo</label>
                      <Input
                        value={trabajadorEncontrado.jefe_directo || '-'}
                        readOnly
                        className="bg-gray-100 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Lista de Responsables Agregados */}
              {responsables.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-700">
                      Responsables Asignados ({responsables.length})
                    </h4>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDniBusqueda('');
                        setTrabajadorEncontrado(null);
                      }}
                      className="gap-2 border-dashed"
                      size="sm"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar Otro Responsable
                    </Button>
                  </div>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                            Nombre Completo
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                            DNI
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                            Cargo
                          </th>
                          <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">
                            Acción
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {responsables.map((responsable) => (
                          <tr
                            key={responsable.id}
                            className="border-t border-gray-200 hover:bg-gray-50"
                          >
                            <td className="px-4 py-2 font-medium">{responsable.nombre_completo}</td>
                            <td className="px-4 py-2 text-gray-600">
                              {responsable.documento_identidad}
                            </td>
                            <td className="px-4 py-2 text-gray-600">{responsable.cargo}</td>
                            <td className="px-4 py-2 text-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => quitarResponsable(responsable.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
