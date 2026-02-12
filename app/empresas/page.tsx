'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { empresasService, Empresa } from '@/services/empresas.service';
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
import { Plus, Edit, Trash2, Building2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UsuarioRol } from '@/types';

const empresaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  ruc: z.string().length(11, 'El RUC debe tener 11 dígitos').regex(/^\d{11}$/, 'El RUC debe contener solo números'),
  logoUrl: z.string().url('Debe ser una URL válida').optional().or(z.literal('')),
  activo: z.boolean().optional(),
});

type EmpresaFormData = z.infer<typeof empresaSchema>;

export default function EmpresasPage() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EmpresaFormData>({
    resolver: zodResolver(empresaSchema),
    defaultValues: {
      nombre: '',
      ruc: '',
      logoUrl: '',
      activo: true,
    },
  });

  const canCreate = hasRole(UsuarioRol.SUPER_ADMIN);
  const canEdit = hasRole(UsuarioRol.SUPER_ADMIN) || hasRole(UsuarioRol.ADMIN_EMPRESA);

  useEffect(() => {
    loadEmpresas();
  }, []);

  useEffect(() => {
    if (editingEmpresa) {
      reset({
        nombre: editingEmpresa.nombre,
        ruc: editingEmpresa.ruc,
        logoUrl: editingEmpresa.logoUrl || '',
        activo: editingEmpresa.activo,
      });
    } else {
      reset({
        nombre: '',
        ruc: '',
        logoUrl: '',
        activo: true,
      });
    }
  }, [editingEmpresa, reset]);

  const loadEmpresas = async () => {
    try {
      setIsLoading(true);
      const data = await empresasService.findAll();
      setEmpresas(data);
    } catch (error: any) {
      toast.error('Error al cargar empresas', {
        description: error.response?.data?.message || 'No se pudieron cargar las empresas',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: EmpresaFormData) => {
    try {
      if (editingEmpresa) {
        await empresasService.update(editingEmpresa.id, {
          nombre: data.nombre,
          ruc: data.ruc,
          logoUrl: data.logoUrl || undefined,
          activo: data.activo,
        });
        toast.success('Empresa actualizada', {
          description: 'La empresa se ha actualizado correctamente',
        });
      } else {
        await empresasService.create({
          nombre: data.nombre,
          ruc: data.ruc,
          logoUrl: data.logoUrl || undefined,
          activo: data.activo,
        });
        toast.success('Empresa creada', {
          description: 'La empresa se ha creado correctamente',
        });
      }
      setIsModalOpen(false);
      setEditingEmpresa(null);
      loadEmpresas();
    } catch (error: any) {
      toast.error('Error al guardar empresa', {
        description: error.response?.data?.message || 'No se pudo guardar la empresa',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta empresa?')) return;

    try {
      await empresasService.remove(id);
      toast.success('Empresa eliminada', {
        description: 'La empresa se ha eliminado correctamente',
      });
      loadEmpresas();
    } catch (error: any) {
      toast.error('Error al eliminar empresa', {
        description: error.response?.data?.message || 'No se pudo eliminar la empresa',
      });
    }
  };

  const openCreateModal = () => {
    setEditingEmpresa(null);
    setIsModalOpen(true);
  };

  const openEditModal = (empresa: Empresa) => {
    setEditingEmpresa(empresa);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Gestión de Empresas</h1>
            <p className="text-slate-600 mt-2">Administra las empresas del sistema</p>
          </div>
          {canCreate && (
            <Button onClick={openCreateModal}>
              <Plus className="w-5 h-5 mr-2" />
              Nueva Empresa
            </Button>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : empresas.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">No hay empresas registradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Imagen</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>RUC</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Áreas</TableHead>
                    <TableHead>Fecha Creación</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empresas.map((empresa) => (
                    <TableRow key={empresa.id}>
                      <TableCell className="w-14">
                        <div className="flex items-center justify-center min-h-[2.5rem]">
                          {empresa.logoUrl ? (
                            <>
                              <img
                                src={empresa.logoUrl}
                                alt={`Logo ${empresa.nombre}`}
                                className="h-10 w-10 object-contain rounded border bg-slate-50"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  const fallback = (e.target as HTMLImageElement).nextElementSibling;
                                  if (fallback) (fallback as HTMLElement).classList.remove('hidden');
                                }}
                              />
                              <span className="hidden text-slate-400 text-sm">-</span>
                            </>
                          ) : (
                            <span className="text-slate-400 text-sm">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {empresa.nombre}
                      </TableCell>
                      <TableCell>{empresa.ruc}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            empresa.activo
                              ? 'bg-success-light/20 text-success'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {empresa.activo ? 'Activa' : 'Inactiva'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {empresa.areas && empresa.areas.length > 0 ? (
                          <ul className="list-disc list-inside text-sm text-slate-700 space-y-0.5">
                            {empresa.areas.map((a) => (
                              <li key={a.id}>{a.nombre}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(empresa.createdAt).toLocaleDateString('es-PE')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/empresas/${empresa.id}/areas`)}
                            title="Gestionar áreas"
                          >
                            <Building2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(empresa)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {canCreate && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDelete(empresa.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingEmpresa(null);
          }}
          title={editingEmpresa ? 'Editar Empresa' : 'Nueva Empresa'}
          size="md"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nombre (Razón Social) *
              </label>
              <Input
                {...register('nombre')}
                placeholder="Ej: Gexim SAC"
              />
              {errors.nombre && (
                <p className="mt-1 text-sm text-danger">{errors.nombre.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                RUC (11 dígitos) *
              </label>
              <Input
                {...register('ruc')}
                placeholder="20123456789"
                maxLength={11}
              />
              {errors.ruc && (
                <p className="mt-1 text-sm text-danger">{errors.ruc.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Logo de la empresa
              </label>
              <p className="text-xs text-slate-500 mb-2">
                Suba una imagen o ingrese la URL manualmente
              </p>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <label className="flex-1 cursor-pointer">
                    <span className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-slate-300 bg-slate-50 hover:bg-slate-100 text-sm font-medium text-slate-700">
                      <Upload className="w-4 h-4" />
                      Subir imagen
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                      className="hidden"
                      disabled={isUploadingLogo || !watch('ruc')}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !watch('ruc')) return;
                        const ruc = watch('ruc');
                        if (ruc.length !== 11 || !/^\d{11}$/.test(ruc)) {
                          toast.error('Complete el RUC (11 dígitos) antes de subir');
                          return;
                        }
                        try {
                          setIsUploadingLogo(true);
                          const { url } = await empresasService.uploadLogo(ruc, file);
                          setValue('logoUrl', url);
                          toast.success('Logo subido correctamente');
                        } catch (err: any) {
                          toast.error('Error al subir logo', {
                            description: err.response?.data?.message || 'No se pudo subir la imagen',
                          });
                        } finally {
                          setIsUploadingLogo(false);
                          e.target.value = '';
                        }
                      }}
                    />
                  </label>
                  {!watch('ruc') && (
                    <span className="text-xs text-slate-500">Ingrese RUC primero</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-sm">o</span>
                </div>
                <div>
                  <Input
                    {...register('logoUrl')}
                    type="url"
                    placeholder="https://ejemplo.com/logo.png"
                  />
                  {errors.logoUrl && (
                    <p className="mt-1 text-sm text-danger">{errors.logoUrl.message}</p>
                  )}
                </div>
                {watch('logoUrl') && (
                  <div className="mt-1 flex items-center gap-2">
                    <img
                      src={watch('logoUrl')}
                      alt="Vista previa logo"
                      className="h-12 object-contain border rounded bg-slate-50"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setValue('logoUrl', '')}
                    >
                      Quitar
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="activo"
                {...register('activo')}
                className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <label htmlFor="activo" className="text-sm font-medium text-slate-700">
                Empresa activa
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingEmpresa(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : editingEmpresa ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>

  );
}
