'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { empresasService, Empresa } from '@/services/empresas.service';
import { areasService, Area } from '@/services/areas.service';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Edit, Trash2, ArrowLeft, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UsuarioRol } from '@/types';
import Link from 'next/link';

const areaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  descripcion: z.string().optional().or(z.literal('')),
  activo: z.boolean().optional(),
});

type AreaFormData = z.infer<typeof areaSchema>;

export default function EmpresaAreasPage() {
  const params = useParams();
  const router = useRouter();
  const { hasRole } = useAuth();
  const empresaId = params.id as string;

  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AreaFormData>({
    resolver: zodResolver(areaSchema),
    defaultValues: {
      nombre: '',
      descripcion: '',
      activo: true,
    },
  });

  const canManage = hasRole(UsuarioRol.SUPER_ADMIN) || hasRole(UsuarioRol.ADMIN_EMPRESA);

  useEffect(() => {
    if (empresaId) {
      loadEmpresa();
      loadAreas();
    }
  }, [empresaId]);

  useEffect(() => {
    if (editingArea) {
      reset({
        nombre: editingArea.nombre,
        descripcion: editingArea.descripcion || '',
        activo: editingArea.activo,
      });
    } else {
      reset({
        nombre: '',
        descripcion: '',
        activo: true,
      });
    }
  }, [editingArea, reset]);

  const loadEmpresa = async () => {
    try {
      const data = await empresasService.findOne(empresaId);
      setEmpresa(data);
    } catch (error: any) {
      toast.error('Error al cargar empresa', {
        description: error.response?.data?.message || 'No se pudo cargar la empresa',
      });
      router.push('/empresas');
    }
  };

  const loadAreas = async () => {
    try {
      setIsLoading(true);
      const data = await areasService.findAll(empresaId);
      setAreas(data);
    } catch (error: any) {
      toast.error('Error al cargar áreas', {
        description: error.response?.data?.message || 'No se pudieron cargar las áreas',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: AreaFormData) => {
    try {
      if (editingArea) {
        await areasService.update(editingArea.id, {
          nombre: data.nombre,
          descripcion: data.descripcion || undefined,
          activo: data.activo,
          empresa_id: empresaId,
        });
        toast.success('Área actualizada', {
          description: 'El área se ha actualizado correctamente',
        });
      } else {
        await areasService.create({
          nombre: data.nombre,
          descripcion: data.descripcion || undefined,
          activo: data.activo,
          empresa_id: empresaId,
        });
        toast.success('Área creada', {
          description: 'El área se ha creado correctamente',
        });
      }
      setIsModalOpen(false);
      setEditingArea(null);
      loadAreas();
    } catch (error: any) {
      toast.error('Error al guardar área', {
        description: error.response?.data?.message || 'No se pudo guardar el área',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta área?')) return;

    try {
      await areasService.remove(id);
      toast.success('Área eliminada', {
        description: 'El área se ha eliminado correctamente',
      });
      loadAreas();
    } catch (error: any) {
      toast.error('Error al eliminar área', {
        description: error.response?.data?.message || 'No se pudo eliminar el área',
      });
    }
  };

  const openCreateModal = () => {
    setEditingArea(null);
    setIsModalOpen(true);
  };

  const openEditModal = (area: Area) => {
    setEditingArea(area);
    setIsModalOpen(true);
  };

  return (

        <div className="space-y-6 w-full">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <Link
                href="/empresas"
                className="text-sm text-slate-600 hover:text-slate-900 mb-2 inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver a Empresas
              </Link>
              <h1 className="text-3xl font-bold text-slate-900 mt-0">
                Gestión de Áreas
              </h1>
              <p className="text-slate-600 mt-2">
                {empresa ? `Áreas de trabajo de ${empresa.nombre}` : 'Cargando...'}
              </p>
            </div>
            {canManage && (
              <div className="flex-shrink-0">
                <Button onClick={openCreateModal}>
                  <Plus className="w-5 h-5 mr-2" />
                  Nueva Área
                </Button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden w-full">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : areas.length === 0 ? (
              <div className="p-12 text-center">
                <Building2 className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">No hay áreas registradas</p>
                {canManage && (
                  <Button onClick={openCreateModal} className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Crear primera área
                  </Button>
                )}
              </div>
            ) : (
              <div className="w-full overflow-hidden">
                <div className="overflow-x-auto w-full">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px]">Nombre</TableHead>
                        <TableHead className="min-w-[250px]">Descripción</TableHead>
                        <TableHead className="min-w-[120px]">Estado</TableHead>
                        <TableHead className="min-w-[140px]">Fecha Creación</TableHead>
                        {canManage && (
                          <TableHead className="min-w-[140px] text-right">Acciones</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {areas.map((area) => (
                        <TableRow key={area.id}>
                          <TableCell className="font-medium">
                            {area.nombre}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            <span className="line-clamp-2">
                              {area.descripcion || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-medium rounded whitespace-nowrap ${
                                area.activo
                                  ? 'bg-success-light/20 text-success'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {area.activo ? 'Activa' : 'Inactiva'}
                            </span>
                          </TableCell>
                          <TableCell className="text-slate-600 whitespace-nowrap">
                            {new Date(area.createdAt).toLocaleDateString('es-PE')}
                          </TableCell>
                          {canManage && (
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditModal(area)}
                                  className="flex-shrink-0"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleDelete(area.id)}
                                  className="flex-shrink-0"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>

          <Modal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingArea(null);
            }}
            title={editingArea ? 'Editar Área' : 'Nueva Área'}
            size="md"
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nombre *
                </label>
                <Input
                  {...register('nombre')}
                  placeholder="Ej: Producción, Mantenimiento, Administración"
                />
                {errors.nombre && (
                  <p className="mt-1 text-sm text-danger">{errors.nombre.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Descripción
                </label>
                <textarea
                  {...register('descripcion')}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Descripción opcional del área de trabajo"
                />
                {errors.descripcion && (
                  <p className="mt-1 text-sm text-danger">{errors.descripcion.message}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activo"
                  {...register('activo')}
                  className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <label htmlFor="activo" className="text-sm font-medium text-slate-700">
                  Área activa
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingArea(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Guardando...' : editingArea ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </Modal>
        </div>

  );
}
