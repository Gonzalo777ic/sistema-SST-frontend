'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { IComite, UpdateComiteDto } from '@/types';
import { comitesService } from '@/services/comites.service';
import { empresasService, Empresa } from '@/services/empresas.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Save, Calendar, Building2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { MiembrosManager } from '@/components/comites/MiembrosManager';
import { DocumentosManager } from '@/components/comites/DocumentosManager';

const comiteUpdateSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  fecha_inicio: z.string().min(1, 'La fecha de inicio es obligatoria'),
  fecha_fin: z.string().min(1, 'La fecha de fin es obligatoria'),
  descripcion: z.string().optional(),
  activo: z.boolean().optional(),
}).refine((data) => {
  const inicio = new Date(data.fecha_inicio);
  const fin = new Date(data.fecha_fin);
  return fin >= inicio;
}, {
  message: 'La fecha de fin debe ser posterior a la fecha de inicio',
  path: ['fecha_fin'],
});

type ComiteUpdateFormData = z.infer<typeof comiteUpdateSchema>;

export default function ComiteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const comiteId = params.id as string;

  const [comite, setComite] = useState<IComite | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ComiteUpdateFormData>({
    resolver: zodResolver(comiteUpdateSchema),
  });

  useEffect(() => {
    if (comiteId) {
      loadComite();
    }
  }, [comiteId]);

  const loadComite = async () => {
    try {
      setIsLoading(true);
      const [comiteData, empresasData] = await Promise.all([
        comitesService.findOne(comiteId),
        empresasService.findAll(),
      ]);

      setComite(comiteData);
      const empresaData = empresasData.find((e) => e.id === comiteData.empresa_id);
      setEmpresa(empresaData || null);

      // Cargar datos en el formulario
      reset({
        nombre: comiteData.nombre,
        fecha_inicio: comiteData.fecha_inicio,
        fecha_fin: comiteData.fecha_fin,
        descripcion: comiteData.descripcion || '',
        activo: comiteData.activo,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'No se pudo cargar la información del comité';
      toast.error('Error al cargar el comité', {
        description: errorMessage,
      });
      router.push('/comites');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: ComiteUpdateFormData) => {
    if (!comite) return;

    try {
      setIsSaving(true);
      const updateData: UpdateComiteDto = {
        nombre: data.nombre,
        fecha_inicio: data.fecha_inicio,
        fecha_fin: data.fecha_fin,
        descripcion: data.descripcion || undefined,
        activo: data.activo,
      };

      const updated = await comitesService.update(comite.id, updateData);
      setComite(updated);
      toast.success('Comité actualizado exitosamente');
      reset(data, { keepDirty: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'No se pudo actualizar el comité';
      toast.error('Error al actualizar el comité', {
        description: errorMessage,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-white min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!comite) {
    return null;
  }

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/comites')}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Regresar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{comite.nombre}</h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                {empresa && (
                  <div className="flex items-center gap-1">
                    <Building2 className="w-4 h-4" />
                    <span>{empresa.nombre}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(comite.fecha_inicio).toLocaleDateString('es-PE')} -{' '}
                    {new Date(comite.fecha_fin).toLocaleDateString('es-PE')}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{comite.nro_miembros} miembros</span>
                </div>
              </div>
            </div>
          </div>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={!isDirty || isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>

        {/* Datos Generales */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Datos Generales</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Comité <span className="text-red-500">*</span>
                </label>
                <Input
                  {...register('nombre')}
                  className={errors.nombre ? 'border-red-500' : ''}
                />
                {errors.nombre && (
                  <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <div className="flex items-center mt-2">
                  <input
                    type="checkbox"
                    {...register('activo')}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label className="ml-2 text-sm text-gray-700">Comité activo</label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Inicio <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  {...register('fecha_inicio')}
                  className={errors.fecha_inicio ? 'border-red-500' : ''}
                />
                {errors.fecha_inicio && (
                  <p className="text-red-500 text-xs mt-1">{errors.fecha_inicio.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Fin <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  {...register('fecha_fin')}
                  className={errors.fecha_fin ? 'border-red-500' : ''}
                />
                {errors.fecha_fin && (
                  <p className="text-red-500 text-xs mt-1">{errors.fecha_fin.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                {...register('descripcion')}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Descripción del comité..."
              />
            </div>
          </form>
        </div>

        {/* Gestor de Miembros */}
        <MiembrosManager comiteId={comite.id} empresaId={comite.empresa_id} />

        {/* Gestor Documental */}
        <DocumentosManager comiteId={comite.id} />
      </div>
    </div>
  );
}
