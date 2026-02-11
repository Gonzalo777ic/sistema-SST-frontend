'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  trabajadoresService,
  Trabajador,
  EstadoTrabajador,
  GrupoSanguineo,
  CreateTrabajadorDto,
} from '@/services/trabajadores.service';
import { empresasService, Empresa } from '@/services/empresas.service';
import { areasService } from '@/services/areas.service';
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
import { Plus, Edit, Trash2, Users, Filter, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UsuarioRol } from '@/types';

const trabajadorSchema = z.object({
  nombre_completo: z.string().min(1, 'El nombre completo es obligatorio'),
  documento_identidad: z.string().min(1, 'El documento de identidad es obligatorio'),
  cargo: z.string().min(1, 'El cargo es obligatorio'),
  empresa_id: z.string().uuid('Debe seleccionar una empresa'),
  area_id: z.string().uuid().optional().or(z.literal('')),
  telefono: z.string().optional().or(z.literal('')),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  fecha_ingreso: z.string().min(1, 'La fecha de ingreso es obligatoria'),
  estado: z.nativeEnum(EstadoTrabajador).optional(),
  grupo_sanguineo: z.nativeEnum(GrupoSanguineo).optional().or(z.literal('')),
  contacto_emergencia_nombre: z.string().optional().or(z.literal('')),
  contacto_emergencia_telefono: z.string().optional().or(z.literal('')),
  foto_url: z.string().url('Debe ser una URL válida').optional().or(z.literal('')),
  habilitar_acceso: z.boolean().optional(),
});

type TrabajadorFormData = z.infer<typeof trabajadorSchema>;

export default function TrabajadoresPage() {
  const { hasRole, usuario } = useAuth();
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [areas, setAreas] = useState<{ id: string; nombre: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrabajador, setEditingTrabajador] = useState<Trabajador | null>(null);
  const [selectedEmpresaFilter, setSelectedEmpresaFilter] = useState<string>('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TrabajadorFormData>({
    resolver: zodResolver(trabajadorSchema),
    defaultValues: {
      nombre_completo: '',
      documento_identidad: '',
      cargo: '',
      empresa_id: '',
      area_id: '',
      telefono: '',
      email: '',
      fecha_ingreso: '',
      estado: EstadoTrabajador.Activo,
      grupo_sanguineo: undefined,
      contacto_emergencia_nombre: '',
      contacto_emergencia_telefono: '',
      foto_url: '',
      habilitar_acceso: false,
    },
  });

  const selectedEmpresaId = watch('empresa_id');

  const canCreate = hasRole(UsuarioRol.SUPER_ADMIN) || hasRole(UsuarioRol.ADMIN_EMPRESA);
  const canEdit = hasRole(UsuarioRol.SUPER_ADMIN) || hasRole(UsuarioRol.ADMIN_EMPRESA);

  useEffect(() => {
    loadEmpresas();
    loadTrabajadores();
  }, []);

  useEffect(() => {
    if (selectedEmpresaId) {
      loadAreas(selectedEmpresaId);
    } else {
      setAreas([]);
    }
  }, [selectedEmpresaId]);

  useEffect(() => {
    if (editingTrabajador) {
      reset({
        nombre_completo: editingTrabajador.nombre_completo,
        documento_identidad: editingTrabajador.documento_identidad,
        cargo: editingTrabajador.cargo,
        empresa_id: editingTrabajador.empresa_id,
        area_id: editingTrabajador.area_id || '',
        telefono: editingTrabajador.telefono || '',
        email: editingTrabajador.email_personal || '',
        fecha_ingreso: editingTrabajador.fecha_ingreso,
        estado: editingTrabajador.estado,
        grupo_sanguineo: editingTrabajador.grupo_sanguineo || undefined,
        contacto_emergencia_nombre: (editingTrabajador as any).contacto_emergencia_nombre || '',
        contacto_emergencia_telefono: (editingTrabajador as any).contacto_emergencia_telefono || '',
        foto_url: editingTrabajador.foto_url || '',
        habilitar_acceso: !!editingTrabajador.usuario_id,
      });
      loadAreas(editingTrabajador.empresa_id);
    } else {
      reset({
        nombre_completo: '',
        documento_identidad: '',
        cargo: '',
        empresa_id: usuario?.empresaId || '',
        area_id: '',
        telefono: '',
        email: '',
        fecha_ingreso: '',
        estado: EstadoTrabajador.Activo,
        grupo_sanguineo: undefined,
        contacto_emergencia_nombre: '',
        contacto_emergencia_telefono: '',
        foto_url: '',
        habilitar_acceso: false,
      });
    }
  }, [editingTrabajador, reset, usuario]);

  const loadEmpresas = async () => {
    try {
      const data = await empresasService.findAll();
      setEmpresas(data.filter((e) => e.activo));
    } catch (error: any) {
      toast.error('Error al cargar empresas');
    }
  };

  const loadAreas = async (empresaId: string) => {
    try {
      const data = await areasService.findAll(empresaId);
      setAreas(data.filter((a) => a.activo).map((a) => ({ id: a.id, nombre: a.nombre })));
    } catch (error: any) {
      setAreas([]);
    }
  };

  const loadTrabajadores = async (empresaId?: string) => {
    try {
      setIsLoading(true);
      const data = await trabajadoresService.findAll(empresaId);
      setTrabajadores(data);
    } catch (error: any) {
      toast.error('Error al cargar trabajadores', {
        description: error.response?.data?.message || 'No se pudieron cargar los trabajadores',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: TrabajadorFormData) => {
    try {
      const payload: CreateTrabajadorDto = {
        nombre_completo: data.nombre_completo,
        documento_identidad: data.documento_identidad,
        cargo: data.cargo,
        empresa_id: data.empresa_id,
        area_id: data.area_id || undefined,
        telefono: data.telefono || undefined,
        email: data.email || undefined,
        fecha_ingreso: data.fecha_ingreso,
        estado: data.estado,
        grupo_sanguineo: data.grupo_sanguineo || undefined,
        contacto_emergencia_nombre: data.contacto_emergencia_nombre || undefined,
        contacto_emergencia_telefono: data.contacto_emergencia_telefono || undefined,
        foto_url: data.foto_url || undefined,
      };

      let trabajadorCreado: Trabajador | null = null;

      if (editingTrabajador) {
        await trabajadoresService.update(editingTrabajador.id, payload);
        toast.success('Trabajador actualizado', {
          description: 'El trabajador se ha actualizado correctamente',
        });
        trabajadorCreado = await trabajadoresService.findOne(editingTrabajador.id);
      } else {
        trabajadorCreado = await trabajadoresService.create(payload);
        toast.success('Trabajador creado', {
          description: 'El trabajador se ha creado correctamente',
        });
      }

      // Si se activó "Habilitar acceso al sistema" y es creación o edición sin usuario
      if (data.habilitar_acceso && trabajadorCreado) {
        // Verificar si ya tiene usuario vinculado
        if (!trabajadorCreado.usuario_id) {
          try {
            const { usuariosService } = await import('@/services/usuarios.service');
            await usuariosService.create({
              dni: data.documento_identidad,
              trabajadorId: trabajadorCreado.id,
              roles: [UsuarioRol.TRABAJADOR],
              empresaId: data.empresa_id,
            });
            toast.success('Acceso creado', {
              description: `Se ha creado el acceso al sistema con DNI: ${data.documento_identidad}. La contraseña temporal es el DNI.`,
            });
          } catch (error: any) {
            toast.error('Error al crear acceso', {
              description: error.response?.data?.message || 'El trabajador se creó pero no se pudo crear el acceso',
            });
          }
        } else {
          toast.info('El trabajador ya tiene acceso al sistema');
        }
      }

      setIsModalOpen(false);
      setEditingTrabajador(null);
      loadTrabajadores(selectedEmpresaFilter || undefined);
    } catch (error: any) {
      toast.error('Error al guardar trabajador', {
        description: error.response?.data?.message || 'No se pudo guardar el trabajador',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este trabajador?')) return;

    try {
      await trabajadoresService.remove(id);
      toast.success('Trabajador eliminado', {
        description: 'El trabajador se ha eliminado correctamente',
      });
      loadTrabajadores(selectedEmpresaFilter || undefined);
    } catch (error: any) {
      toast.error('Error al eliminar trabajador', {
        description: error.response?.data?.message || 'No se pudo eliminar el trabajador',
      });
    }
  };

  const handleFilterChange = (empresaId: string) => {
    setSelectedEmpresaFilter(empresaId);
    loadTrabajadores(empresaId || undefined);
  };

  return (
    <ProtectedRoute
      allowedRoles={[
        UsuarioRol.SUPER_ADMIN,
        UsuarioRol.ADMIN_EMPRESA,
        UsuarioRol.INGENIERO_SST,
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-slate-900">Gestión de Trabajadores</h1>
            <p className="text-slate-600 mt-2">Directorio maestro del personal</p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-500" />
              <Select
                value={selectedEmpresaFilter}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="min-w-[200px]"
              >
                <option value="">Todas las empresas</option>
                {empresas.map((empresa) => (
                  <option key={empresa.id} value={empresa.id}>
                    {empresa.nombre}
                  </option>
                ))}
              </Select>
            </div>
            {canCreate && (
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="w-5 h-5 mr-2" />
                Nuevo Trabajador
              </Button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden w-full">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : trabajadores.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">No hay trabajadores registrados</p>
            </div>
          ) : (
            <div className="w-full overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>DNI</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Ingreso</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trabajadores.map((trabajador) => (
                    <TableRow key={trabajador.id}>
                      <TableCell className="font-medium">
                        {trabajador.nombre_completo}
                      </TableCell>
                      <TableCell>{trabajador.documento_identidad}</TableCell>
                      <TableCell>{trabajador.cargo}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            trabajador.estado === EstadoTrabajador.Activo
                              ? 'bg-success-light/20 text-success'
                              : trabajador.estado === EstadoTrabajador.Vacaciones ||
                                trabajador.estado === EstadoTrabajador.Licencia
                              ? 'bg-warning-light/20 text-warning'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {trabajador.estado}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(trabajador.fecha_ingreso).toLocaleDateString('es-PE')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canEdit && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingTrabajador(trabajador);
                                  setIsModalOpen(true);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              {canCreate && (
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleDelete(trabajador.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
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
            setEditingTrabajador(null);
          }}
          title={editingTrabajador ? 'Editar Trabajador' : 'Nuevo Trabajador'}
          size="xl"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nombre Completo *
                </label>
                <Input {...register('nombre_completo')} placeholder="Juan Pérez" />
                {errors.nombre_completo && (
                  <p className="mt-1 text-sm text-danger">{errors.nombre_completo.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Documento de Identidad *
                </label>
                <Input {...register('documento_identidad')} placeholder="12345678" />
                {errors.documento_identidad && (
                  <p className="mt-1 text-sm text-danger">
                    {errors.documento_identidad.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Empresa *
                </label>
                <Select {...register('empresa_id')}>
                  <option value="">Seleccione una empresa</option>
                  {empresas.map((empresa) => (
                    <option key={empresa.id} value={empresa.id}>
                      {empresa.nombre}
                    </option>
                  ))}
                </Select>
                {errors.empresa_id && (
                  <p className="mt-1 text-sm text-danger">{errors.empresa_id.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Área
                </label>
                <Select {...register('area_id')} disabled={!selectedEmpresaId}>
                  <option value="">Seleccione un área</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.nombre}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Cargo *
                </label>
                <Input {...register('cargo')} placeholder="Operario" />
                {errors.cargo && (
                  <p className="mt-1 text-sm text-danger">{errors.cargo.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Fecha de Ingreso *
                </label>
                <Input {...register('fecha_ingreso')} type="date" />
                {errors.fecha_ingreso && (
                  <p className="mt-1 text-sm text-danger">{errors.fecha_ingreso.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Teléfono
                </label>
                <Input {...register('telefono')} type="tel" placeholder="987654321" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Personal
                </label>
                <Input {...register('email')} type="email" placeholder="juan@email.com" />
                {errors.email && (
                  <p className="mt-1 text-sm text-danger">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Estado
                </label>
                <Select {...register('estado')}>
                  {Object.values(EstadoTrabajador).map((estado) => (
                    <option key={estado} value={estado}>
                      {estado}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Grupo Sanguíneo
                </label>
                <Select {...register('grupo_sanguineo')}>
                  <option value="">Seleccione</option>
                  {Object.values(GrupoSanguineo).map((grupo) => (
                    <option key={grupo} value={grupo}>
                      {grupo}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Contacto de Emergencia (Nombre)
                </label>
                <Input {...register('contacto_emergencia_nombre')} placeholder="María Pérez" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Contacto de Emergencia (Teléfono)
                </label>
                <Input {...register('contacto_emergencia_telefono')} type="tel" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  URL de Foto
                </label>
                <Input {...register('foto_url')} type="url" placeholder="https://ejemplo.com/foto.jpg" />
                {errors.foto_url && (
                  <p className="mt-1 text-sm text-danger">{errors.foto_url.message}</p>
                )}
              </div>

              {canCreate && (
                <div className="md:col-span-2 flex items-center gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <input
                    type="checkbox"
                    id="habilitar_acceso"
                    {...register('habilitar_acceso')}
                    className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                  />
                  <div className="flex-1">
                    <label htmlFor="habilitar_acceso" className="text-sm font-medium text-slate-900 cursor-pointer">
                      Habilitar acceso al sistema
                    </label>
                    <p className="text-xs text-slate-600 mt-1">
                      Al activar, se creará automáticamente un usuario con el DNI como credencial. La contraseña temporal será el DNI.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingTrabajador(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : editingTrabajador ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}
