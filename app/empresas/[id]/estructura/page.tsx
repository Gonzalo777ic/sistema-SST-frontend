'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { empresasService, Empresa } from '@/services/empresas.service';
import { estructuraService, EstructuraItem } from '@/services/estructura.service';
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
import { Plus, Edit, Trash2, ArrowLeft, Building2, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UsuarioRol } from '@/types';
import Link from 'next/link';

type TabType = 'unidad' | 'sede' | 'gerencia' | 'area';

const estructuraSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  activo: z.boolean().optional(),
});

const areaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  descripcion: z.string().optional().or(z.literal('')),
  activo: z.boolean().optional(),
});

type EstructuraFormData = z.infer<typeof estructuraSchema>;
type AreaFormData = z.infer<typeof areaSchema>;

const TABS: { id: TabType; label: string }[] = [
  { id: 'unidad', label: 'Unidades' },
  { id: 'sede', label: 'Sedes' },
  { id: 'gerencia', label: 'Gerencias' },
  { id: 'area', label: 'Áreas' },
];

export default function EmpresaEstructuraPage() {
  const params = useParams();
  const router = useRouter();
  const { hasRole } = useAuth();
  const empresaId = params.id as string;

  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('unidad');
  const [unidades, setUnidades] = useState<EstructuraItem[]>([]);
  const [sedes, setSedes] = useState<EstructuraItem[]>([]);
  const [gerencias, setGerencias] = useState<EstructuraItem[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EstructuraItem | Area | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EstructuraFormData | AreaFormData>({
    resolver: zodResolver(activeTab === 'area' ? areaSchema : estructuraSchema),
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
      loadAll();
    }
  }, [empresaId]);

  useEffect(() => {
    if (editingItem) {
      if ('descripcion' in editingItem) {
        reset({
          nombre: editingItem.nombre,
          descripcion: (editingItem as Area).descripcion || '',
          activo: editingItem.activo,
        });
      } else {
        reset({
          nombre: editingItem.nombre,
          activo: editingItem.activo ?? true,
        });
      }
    } else {
      reset({
        nombre: '',
        descripcion: '',
        activo: true,
      });
    }
  }, [editingItem, reset, activeTab]);

  const loadEmpresa = async () => {
    try {
      const data = await empresasService.findOne(empresaId);
      setEmpresa(data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error('Error al cargar empresa', {
        description: err.response?.data?.message || 'No se pudo cargar la empresa',
      });
      router.push('/empresas');
    }
  };

  const loadAll = async () => {
    try {
      setIsLoading(true);
      const [u, s, g, a] = await Promise.all([
        estructuraService.findUnidades(empresaId),
        estructuraService.findSedes(empresaId),
        estructuraService.findGerencias(empresaId),
        areasService.findAll(empresaId),
      ]);
      setUnidades(u);
      setSedes(s);
      setGerencias(g);
      setAreas(a);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error('Error al cargar estructura', {
        description: err.response?.data?.message || 'No se pudo cargar la estructura organizacional',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentItems = () => {
    switch (activeTab) {
      case 'unidad': return unidades;
      case 'sede': return sedes;
      case 'gerencia': return gerencias;
      case 'area': return areas;
      default: return [];
    }
  };

  const loadTabData = async () => {
    try {
      setIsLoading(true);
      switch (activeTab) {
        case 'unidad':
          setUnidades(await estructuraService.findUnidades(empresaId));
          break;
        case 'sede':
          setSedes(await estructuraService.findSedes(empresaId));
          break;
        case 'gerencia':
          setGerencias(await estructuraService.findGerencias(empresaId));
          break;
        case 'area':
          setAreas(await areasService.findAll(empresaId));
          break;
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error('Error al cargar', {
        description: err.response?.data?.message || 'No se pudo cargar',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: EstructuraFormData | AreaFormData) => {
    try {
      if (activeTab === 'area') {
        const d = data as AreaFormData;
        if (editingItem && 'descripcion' in editingItem) {
          await areasService.update(editingItem.id, {
            nombre: d.nombre,
            descripcion: d.descripcion || undefined,
            activo: d.activo,
            empresa_id: empresaId,
          });
          toast.success('Área actualizada');
        } else {
          await areasService.create({
            nombre: d.nombre,
            descripcion: d.descripcion || undefined,
            activo: d.activo,
            empresa_id: empresaId,
          });
          toast.success('Área creada');
        }
      } else {
        const d = data as EstructuraFormData;
        const item = editingItem as EstructuraItem | null;
        if (item) {
          switch (activeTab) {
            case 'unidad':
              await estructuraService.updateUnidad(empresaId, item.id, d);
              break;
            case 'sede':
              await estructuraService.updateSede(empresaId, item.id, d);
              break;
            case 'gerencia':
              await estructuraService.updateGerencia(empresaId, item.id, d);
              break;
          }
          toast.success('Actualizado correctamente');
        } else {
          switch (activeTab) {
            case 'unidad':
              await estructuraService.createUnidad(empresaId, d);
              break;
            case 'sede':
              await estructuraService.createSede(empresaId, d);
              break;
            case 'gerencia':
              await estructuraService.createGerencia(empresaId, d);
              break;
          }
          toast.success('Creado correctamente');
        }
      }
      setIsModalOpen(false);
      setEditingItem(null);
      loadTabData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error('Error al guardar', {
        description: err.response?.data?.message || 'No se pudo guardar',
      });
    }
  };

  const handleDelete = async (id: string) => {
    const msg = activeTab === 'area'
      ? '¿Estás seguro de eliminar esta área?'
      : `¿Estás seguro de eliminar este ${activeTab === 'unidad' ? 'registro de unidad' : activeTab === 'sede' ? 'registro de sede' : 'registro de gerencia'}?`;
    if (!confirm(msg)) return;

    try {
      if (activeTab === 'area') {
        await areasService.remove(id);
      } else {
        switch (activeTab) {
          case 'unidad':
            await estructuraService.removeUnidad(empresaId, id);
            break;
          case 'sede':
            await estructuraService.removeSede(empresaId, id);
            break;
          case 'gerencia':
            await estructuraService.removeGerencia(empresaId, id);
            break;
        }
      }
      toast.success('Eliminado correctamente');
      loadTabData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error('Error al eliminar', {
        description: err.response?.data?.message || 'No se pudo eliminar',
      });
    }
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: EstructuraItem | Area) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const getModalTitle = () => {
    const base = activeTab === 'unidad' ? 'Unidad' : activeTab === 'sede' ? 'Sede' : activeTab === 'gerencia' ? 'Gerencia' : 'Área';
    return editingItem ? `Editar ${base}` : `Nueva ${base}`;
  };

  const currentItems = getCurrentItems();
  const isArea = activeTab === 'area';

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
          <h1 className="text-3xl font-bold text-slate-900 mt-0 flex items-center gap-2">
            <Layers className="w-8 h-8" />
            Estructura Organizacional
          </h1>
          <p className="text-slate-600 mt-2">
            {empresa ? `Unidades, sedes, gerencias y áreas de ${empresa.nombre}` : 'Cargando...'}
          </p>
        </div>
        {canManage && (
          <div className="flex-shrink-0">
            <Button onClick={openCreateModal}>
              <Plus className="w-5 h-5 mr-2" />
              Nuevo
            </Button>
          </div>
        )}
      </div>

      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden w-full">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : currentItems.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">No hay registros en esta sección</p>
            {canManage && (
              <Button onClick={openCreateModal} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Crear primer registro
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
                    {isArea && (
                      <TableHead className="min-w-[250px]">Descripción</TableHead>
                    )}
                    <TableHead className="min-w-[120px]">Estado</TableHead>
                    <TableHead className="min-w-[140px]">Fecha Creación</TableHead>
                    {canManage && (
                      <TableHead className="min-w-[140px] text-right">Acciones</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.nombre}</TableCell>
                      {isArea && (
                        <TableCell className="text-slate-600">
                          <span className="line-clamp-2">
                            {'descripcion' in item ? (item.descripcion || '-') : '-'}
                          </span>
                        </TableCell>
                      )}
                      <TableCell>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded whitespace-nowrap ${
                            item.activo !== false
                              ? 'bg-success-light/20 text-success'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {item.activo !== false ? 'Activo' : 'Inactivo'}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-600 whitespace-nowrap">
                        {'createdAt' in item && item.createdAt
                          ? new Date(item.createdAt).toLocaleDateString('es-PE')
                          : '-'}
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditModal(item)}
                              className="flex-shrink-0"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
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
          setEditingItem(null);
        }}
        title={getModalTitle()}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Nombre *</label>
            <Input
              {...register('nombre')}
              placeholder={
                activeTab === 'unidad'
                  ? 'Ej: Unidad Minera, Unidad Industrial'
                  : activeTab === 'sede'
                    ? 'Ej: Planta Lurín, Sede San Isidro'
                    : activeTab === 'gerencia'
                      ? 'Ej: Gerencia de Operaciones'
                      : 'Ej: Producción, Mantenimiento'
              }
            />
            {errors.nombre && (
              <p className="mt-1 text-sm text-danger">{errors.nombre.message}</p>
            )}
          </div>

          {isArea && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Descripción</label>
              <textarea
                {...register('descripcion')}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Descripción opcional"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="activo"
              {...register('activo')}
              className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            <label htmlFor="activo" className="text-sm font-medium text-slate-700">
              Activo
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setEditingItem(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : editingItem ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
