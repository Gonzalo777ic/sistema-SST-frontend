'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, User } from 'lucide-react';
import { trabajadoresService, Trabajador } from '@/services/trabajadores.service';
import {
  TipoMiembro,
  RolComite,
  Representacion,
  CreateMiembroComiteDto,
} from '@/types';
import { toast } from 'sonner';

const miembroSchema = z.object({
  trabajador_id: z.string().uuid('Debe seleccionar un trabajador'),
  tipo_miembro: z.nativeEnum(TipoMiembro),
  rol_comite: z.nativeEnum(RolComite),
  representacion: z.nativeEnum(Representacion),
});

type MiembroFormData = z.infer<typeof miembroSchema>;

interface MiembroFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateMiembroComiteDto) => Promise<void>;
  empresaId: string;
}

export function MiembroFormModal({
  isOpen,
  onClose,
  onSubmit,
  empresaId,
}: MiembroFormModalProps) {
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingTrabajadores, setIsLoadingTrabajadores] = useState(false);
  const [selectedTrabajador, setSelectedTrabajador] = useState<Trabajador | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MiembroFormData>({
    resolver: zodResolver(miembroSchema),
    defaultValues: {
      trabajador_id: '',
      tipo_miembro: TipoMiembro.TITULAR,
      rol_comite: RolComite.MIEMBRO,
      representacion: Representacion.TRABAJADOR,
    },
  });

  useEffect(() => {
    if (isOpen && empresaId) {
      loadTrabajadores();
    }
  }, [isOpen, empresaId]);

  const loadTrabajadores = async () => {
    try {
      setIsLoadingTrabajadores(true);
      const data = await trabajadoresService.findAll(empresaId);
      setTrabajadores(data);
    } catch (error: any) {
      toast.error('Error al cargar trabajadores', {
        description: error.message,
      });
    } finally {
      setIsLoadingTrabajadores(false);
    }
  };

  const filteredTrabajadores = trabajadores.filter(
    (t) =>
      t.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.documento_identidad.includes(searchTerm)
  );

  const handleSelectTrabajador = (trabajador: Trabajador) => {
    setSelectedTrabajador(trabajador);
    setValue('trabajador_id', trabajador.id);
    setSearchTerm('');
  };

  const onFormSubmit = async (data: MiembroFormData) => {
    try {
      await onSubmit(data);
      reset();
      setSelectedTrabajador(null);
      setSearchTerm('');
      onClose();
    } catch (error: any) {
      // El error ya fue manejado en MiembrosManager, solo cerramos el modal si fue exitoso
      // No hacemos nada aquí porque el error ya fue mostrado
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        reset();
        setSelectedTrabajador(null);
        setSearchTerm('');
      }}
      title="Agregar Miembro al Comité"
      size="lg"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        {/* Buscador de Trabajadores */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Buscar Trabajador <span className="text-red-500">*</span>
          </label>
          {!selectedTrabajador ? (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar por nombre o DNI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              {searchTerm && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {isLoadingTrabajadores ? (
                    <div className="p-4 text-center text-gray-500">Cargando...</div>
                  ) : filteredTrabajadores.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No se encontraron trabajadores
                    </div>
                  ) : (
                    filteredTrabajadores.map((trabajador) => (
                      <button
                        key={trabajador.id}
                        type="button"
                        onClick={() => handleSelectTrabajador(trabajador)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center gap-3"
                      >
                        <User className="w-5 h-5 text-gray-400" />
                        <div>
                          <div className="font-medium text-gray-900">
                            {trabajador.nombre_completo}
                          </div>
                          <div className="text-sm text-gray-500">
                            DNI: {trabajador.documento_identidad} • {trabajador.cargo}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-md border border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="font-medium text-gray-900">
                    {selectedTrabajador.nombre_completo}
                  </div>
                  <div className="text-sm text-gray-500">
                    DNI: {selectedTrabajador.documento_identidad} • {selectedTrabajador.cargo}
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedTrabajador(null);
                  setValue('trabajador_id', '');
                }}
                className="text-red-600 hover:text-red-700"
              >
                Cambiar
              </Button>
            </div>
          )}
          {errors.trabajador_id && (
            <p className="text-red-500 text-xs mt-1">{errors.trabajador_id.message}</p>
          )}
        </div>

        {/* Tipo de Miembro */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Miembro <span className="text-red-500">*</span>
          </label>
          <Select {...register('tipo_miembro')} className={errors.tipo_miembro ? 'border-red-500' : ''}>
            <option value="">Seleccione un tipo</option>
            <option value={TipoMiembro.TITULAR}>Titular</option>
            <option value={TipoMiembro.SUPLENTE}>Suplente</option>
          </Select>
          {errors.tipo_miembro && (
            <p className="text-red-500 text-xs mt-1">{errors.tipo_miembro.message}</p>
          )}
        </div>

        {/* Rol en el Comité */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rol en el Comité <span className="text-red-500">*</span>
          </label>
          <Select {...register('rol_comite')} className={errors.rol_comite ? 'border-red-500' : ''}>
            <option value="">Seleccione un rol</option>
            <option value={RolComite.PRESIDENTE}>Presidente</option>
            <option value={RolComite.SECRETARIO}>Secretario</option>
            <option value={RolComite.MIEMBRO}>Miembro</option>
            <option value={RolComite.OBSERVADOR}>Observador</option>
          </Select>
          {errors.rol_comite && (
            <p className="text-red-500 text-xs mt-1">{errors.rol_comite.message}</p>
          )}
        </div>

        {/* Representación */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Representación <span className="text-red-500">*</span>
          </label>
          <Select {...register('representacion')} className={errors.representacion ? 'border-red-500' : ''}>
            <option value="">Seleccione representación</option>
            <option value={Representacion.EMPLEADOR}>Empleador</option>
            <option value={Representacion.TRABAJADOR}>Trabajador</option>
          </Select>
          {errors.representacion && (
            <p className="text-red-500 text-xs mt-1">{errors.representacion.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              onClose();
              reset();
              setSelectedTrabajador(null);
              setSearchTerm('');
            }}
            className="border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !selectedTrabajador}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting ? 'Agregando...' : 'Agregar Miembro'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
