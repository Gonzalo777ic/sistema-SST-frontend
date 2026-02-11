'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { comitesService } from '@/services/comites.service';
import { IComite } from '@/types';
import { empresasService, Empresa } from '@/services/empresas.service';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Edit, Trash2, Users, Calendar, Building2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const comiteSchema = z.object({
  empresa_id: z.string().uuid('Debe seleccionar una empresa'),
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

type ComiteFormData = z.infer<typeof comiteSchema>;

export default function ComitesListPage() {
  const router = useRouter();
  const { usuario } = useAuth();
  const [comites, setComites] = useState<IComite[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmpresaFilter, setSelectedEmpresaFilter] = useState<string>('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ComiteFormData>({
    resolver: zodResolver(comiteSchema),
    defaultValues: {
      empresa_id: '',
      nombre: '',
      fecha_inicio: '',
      fecha_fin: '',
      descripcion: '',
      activo: true,
    },
  });

  useEffect(() => {
    loadData();
  }, [selectedEmpresaFilter]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [comitesData, empresasData] = await Promise.all([
        comitesService.findAll(selectedEmpresaFilter || undefined),
        empresasService.findAll(),
      ]);

      // Enriquecer comités con nombre de empresa
      const comitesEnriquecidos = comitesData.map((comite) => {
        const empresa = empresasData.find((e) => e.id === comite.empresa_id);
        return {
          ...comite,
          empresa_nombre: empresa?.nombre || 'Empresa no encontrada',
        };
      });

      setComites(comitesEnriquecidos);
      setEmpresas(empresasData);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'No se pudieron cargar los datos';
      toast.error('Error al cargar los comités', {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: ComiteFormData) => {
    try {
      await comitesService.create({
        empresa_id: data.empresa_id,
        nombre: data.nombre,
        fecha_inicio: data.fecha_inicio,
        fecha_fin: data.fecha_fin,
        descripcion: data.descripcion || undefined,
        activo: data.activo ?? true,
      });
      toast.success('Comité creado exitosamente');
      setIsModalOpen(false);
      reset();
      loadData();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'No se pudo crear el comité';
      toast.error('Error al crear el comité', {
        description: errorMessage,
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este comité?')) {
      return;
    }
    try {
      await comitesService.remove(id);
      toast.success('Comité eliminado exitosamente');
      loadData();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'No se pudo eliminar el comité';
      toast.error('Error al eliminar el comité', {
        description: errorMessage,
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Comités SST</h1>
            <p className="text-sm text-gray-600 mt-1">
              Administra los comités de seguridad y salud en el trabajo
            </p>
          </div>
          <div className="flex gap-2">
            <Select
              value={selectedEmpresaFilter}
              onChange={(e) => setSelectedEmpresaFilter(e.target.value)}
              className="min-w-[200px]"
            >
              <option value="">Todas las empresas</option>
              {empresas.map((empresa) => (
                <option key={empresa.id} value={empresa.id}>
                  {empresa.nombre}
                </option>
              ))}
            </Select>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Comité
            </Button>
          </div>
        </div>

        {/* Tabla de Comités */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : comites.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No hay comités registrados</p>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Crear primer comité
            </Button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-gray-600 font-semibold">Nombre</TableHead>
                  <TableHead className="text-gray-600 font-semibold">Empresa</TableHead>
                  <TableHead className="text-gray-600 font-semibold">Período</TableHead>
                  <TableHead className="text-gray-600 font-semibold">Miembros</TableHead>
                  <TableHead className="text-gray-600 font-semibold">Estado</TableHead>
                  <TableHead className="text-gray-600 font-semibold text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comites.map((comite) => (
                  <TableRow
                    key={comite.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/comites/${comite.id}`)}
                  >
                    <TableCell className="font-medium text-gray-900">
                      {comite.nombre}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {comite.empresa_nombre}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">
                          {formatDate(comite.fecha_inicio)} - {formatDate(comite.fecha_fin)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span>{comite.nro_miembros}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          comite.activo
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {comite.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/comites/${comite.id}`)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(comite.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Modal de Creación */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            reset();
          }}
          title="Nuevo Comité"
          size="lg"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Empresa <span className="text-red-500">*</span>
              </label>
              <Select
                {...register('empresa_id')}
                className={errors.empresa_id ? 'border-red-500' : ''}
              >
                <option value="">Seleccione una empresa</option>
                {empresas.map((empresa) => (
                  <option key={empresa.id} value={empresa.id}>
                    {empresa.nombre}
                  </option>
                ))}
              </Select>
              {errors.empresa_id && (
                <p className="text-red-500 text-xs mt-1">{errors.empresa_id.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Comité <span className="text-red-500">*</span>
              </label>
              <Input
                {...register('nombre')}
                placeholder="Ej: Comité de Seguridad 2024-2026"
                className={errors.nombre ? 'border-red-500' : ''}
              />
              {errors.nombre && (
                <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Descripción del comité..."
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                {...register('activo')}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="ml-2 text-sm text-gray-700">Comité activo</label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsModalOpen(false);
                  reset();
                }}
                className="border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? 'Guardando...' : 'Crear Comité'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}
