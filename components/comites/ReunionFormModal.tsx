'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { comitesService } from '@/services/comites.service';
import { empresasService, Empresa } from '@/services/empresas.service';
import { IComite, TipoReunion, EstadoReunion } from '@/types';
import { Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

const reunionSchema = z.object({
  fecha_realizacion: z.string().min(1, 'La fecha es obligatoria'),
  hora_registro: z.string().optional(),
  razon_social_id: z.string().optional(),
  comites_ids: z.array(z.string().uuid()).min(1, 'Debe seleccionar al menos un comité'),
  sesion: z.string().min(1, 'La sesión es obligatoria'),
  tipo_reunion: z.nativeEnum(TipoReunion).default(TipoReunion.ORDINARIA),
  lugar: z.string().optional(),
  descripcion: z.string().optional(),
  enviar_alerta: z.boolean().default(false),
  agenda: z.array(z.object({ descripcion: z.string().min(1, 'La descripción es obligatoria') })).optional(),
});

type ReunionFormData = z.infer<typeof reunionSchema>;

interface ReunionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReunionFormModal({
  isOpen,
  onClose,
  onSuccess,
}: ReunionFormModalProps) {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [comites, setComites] = useState<IComite[]>([]);
  const [comitesFiltrados, setComitesFiltrados] = useState<IComite[]>([]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<ReunionFormData>({
    resolver: zodResolver(reunionSchema),
    defaultValues: {
      comites_ids: [],
      agenda: [],
      enviar_alerta: false,
      tipo_reunion: TipoReunion.ORDINARIA,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'agenda',
  });

  const razonSocialId = watch('razon_social_id');
  const comitesSeleccionados = watch('comites_ids');

  useEffect(() => {
    if (isOpen) {
      loadEmpresas();
      loadComites();
    }
  }, [isOpen]);

  useEffect(() => {
    if (razonSocialId) {
      const filtrados = comites.filter((c) => c.empresa_id === razonSocialId);
      setComitesFiltrados(filtrados);
      // Limpiar selección de comités si cambia la razón social
      setValue('comites_ids', []);
    } else {
      setComitesFiltrados(comites);
    }
  }, [razonSocialId, comites]);

  const loadEmpresas = async () => {
    try {
      const data = await empresasService.findAll();
      setEmpresas(data);
    } catch (error: any) {
      toast.error('Error al cargar las empresas');
    }
  };

  const loadComites = async () => {
    try {
      const data = await comitesService.findAll();
      setComites(data);
      setComitesFiltrados(data);
    } catch (error: any) {
      toast.error('Error al cargar los comités');
    }
  };

  const onSubmit = async (data: ReunionFormData) => {
    try {
      const payload = {
        ...data,
        agenda: data.agenda?.map((item) => item.descripcion) || [],
      };
      const reunionesCreadas = await comitesService.createReunion(payload);
      toast.success(`${reunionesCreadas.length} reunión(es) creada(s) exitosamente`);
      reset();
      onClose();
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al crear la reunión');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Nueva Reunión</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Fila 1: Fecha y Hora */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Programación *
              </label>
              <Input type="date" {...register('fecha_realizacion')} />
              {errors.fecha_realizacion && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.fecha_realizacion.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hora Registro
              </label>
              <Input type="time" {...register('hora_registro')} />
            </div>
          </div>

          {/* Fila 2: Razón Social */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Razón Social
            </label>
            <Select
              {...register('razon_social_id')}
              onChange={(e) => setValue('razon_social_id', e.target.value)}
            >
              <option value="">Todas</option>
              {empresas.map((empresa) => (
                <option key={empresa.id} value={empresa.id}>
                  {empresa.nombre}
                </option>
              ))}
            </Select>
          </div>

          {/* Fila 3: Comités (Multi-Select) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comités *
            </label>
            <div className="border border-gray-300 rounded-md p-2 min-h-[100px] max-h-[150px] overflow-y-auto">
              {comitesFiltrados.length === 0 ? (
                <p className="text-sm text-gray-500">
                  {razonSocialId ? 'No hay comités para esta empresa' : 'Seleccione una razón social primero'}
                </p>
              ) : (
                comitesFiltrados.map((comite) => (
                  <label key={comite.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      value={comite.id}
                      checked={comitesSeleccionados?.includes(comite.id) || false}
                      onChange={(e) => {
                        const current = comitesSeleccionados || [];
                        if (e.target.checked) {
                          setValue('comites_ids', [...current, comite.id]);
                        } else {
                          setValue('comites_ids', current.filter((id) => id !== comite.id));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{comite.nombre}</span>
                  </label>
                ))
              )}
            </div>
            {errors.comites_ids && (
              <p className="text-red-500 text-xs mt-1">
                {errors.comites_ids.message}
              </p>
            )}
          </div>

          {/* Fila 4: Sesión */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sesión *
            </label>
            <Select {...register('tipo_reunion')}>
              <option value={TipoReunion.ORDINARIA}>Ordinaria</option>
              <option value={TipoReunion.EXTRAORDINARIA}>Extraordinaria</option>
            </Select>
          </div>

          {/* Fila 5: Lugar y Descripción */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lugar
              </label>
              <Input {...register('lugar')} placeholder="Ubicación de la reunión" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sesión (Código)
              </label>
              <Input {...register('sesion')} placeholder="Ej: Sesión N° 001-2024" />
              {errors.sesion && (
                <p className="text-red-500 text-xs mt-1">{errors.sesion.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              {...register('descripcion')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              rows={3}
              placeholder="Resumen de la reunión..."
            />
          </div>

          {/* Sección Agenda */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Agenda de las reuniones
            </label>
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-2">
                  <Input
                    {...register(`agenda.${index}.descripcion`)}
                    placeholder={`Punto ${index + 1} de agenda`}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {fields.length > 0 && errors.agenda && (
                <p className="text-red-500 text-xs">
                  {errors.agenda.message as string}
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => append({ descripcion: '' })}
                className="w-full border-dashed"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar agenda
              </Button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...register('enviar_alerta')}
                className="rounded"
              />
              <span className="text-sm text-gray-700">
                ¿Desea enviar alerta a los miembros del comité?
              </span>
            </label>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600">
                {isSubmitting ? 'Registrando...' : 'Registrar'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
