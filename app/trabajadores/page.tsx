'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  trabajadoresService,
  Trabajador,
  EstadoTrabajador,
  GrupoSanguineo,
  CreateTrabajadorDto,
  UpdateTrabajadorDto,
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
  rol_usuario: z.nativeEnum(UsuarioRol).optional(),
}).refine((data) => {
  // Si habilitar_acceso es true, rol_usuario es obligatorio
  if (data.habilitar_acceso && !data.rol_usuario) {
    return false;
  }
  return true;
}, {
  message: 'Debe seleccionar un rol cuando se habilita el acceso al sistema',
  path: ['rol_usuario'],
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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [trabajadorToDelete, setTrabajadorToDelete] = useState<string | null>(null);

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
      rol_usuario: undefined,
    },
  });

  const selectedEmpresaId = watch('empresa_id');
  const habilitarAcceso = watch('habilitar_acceso');

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
    const loadEditingData = async () => {
      if (editingTrabajador) {
        let rolUsuario: UsuarioRol | undefined = undefined;
        
        // Si tiene usuario vinculado, obtener el rol
        if (editingTrabajador.usuario_id) {
          try {
            const { usuariosService } = await import('@/services/usuarios.service');
            const usuario = await usuariosService.findOne(editingTrabajador.usuario_id);
            // Tomar el primer rol (ya que ahora solo permitimos un rol)
            rolUsuario = usuario.roles?.[0] as UsuarioRol | undefined;
          } catch (error) {
            console.error('Error al cargar datos del usuario:', error);
          }
        }

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
          rol_usuario: rolUsuario,
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
          rol_usuario: undefined,
        });
      }
    };

    loadEditingData();
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
      let trabajadorCreado: Trabajador | null = null;

      if (editingTrabajador) {
        // Para actualización, usar UpdateTrabajadorDto (no incluir empresa_id ni documento_identidad)
        const updatePayload: UpdateTrabajadorDto = {
          nombre_completo: data.nombre_completo,
          cargo: data.cargo,
          // Incluir area_id explícitamente: enviar null si está vacío para que se pueda actualizar
          area_id: data.area_id && data.area_id.trim() !== '' ? data.area_id : null,
          telefono: data.telefono || undefined,
          email: data.email || undefined,
          fecha_ingreso: data.fecha_ingreso,
          estado: data.estado,
          grupo_sanguineo: data.grupo_sanguineo || undefined,
          contacto_emergencia_nombre: data.contacto_emergencia_nombre || undefined,
          contacto_emergencia_telefono: data.contacto_emergencia_telefono || undefined,
          foto_url: data.foto_url || undefined,
        };
        
        await trabajadoresService.update(editingTrabajador.id, updatePayload);
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
      if (data.habilitar_acceso && trabajadorCreado && data.rol_usuario) {
        // Verificar si ya tiene usuario vinculado
        if (!trabajadorCreado.usuario_id) {
          try {
            const { usuariosService } = await import('@/services/usuarios.service');
            
            // Buscar si ya existe un usuario con ese DNI
            const usuarioExistente = await usuariosService.findByDni(data.documento_identidad);
            
            if (usuarioExistente) {
              // Si existe, vincularlo al trabajador
              await usuariosService.update(usuarioExistente.id, {
                trabajadorId: trabajadorCreado.id,
                roles: [data.rol_usuario],
                empresaId: data.empresa_id,
              });
              toast.success('Acceso vinculado', {
                description: `Se ha vinculado el usuario existente con DNI: ${data.documento_identidad} al trabajador.`,
              });
            } else {
              // Si no existe, crear nuevo usuario
              await usuariosService.create({
                dni: data.documento_identidad,
                trabajadorId: trabajadorCreado.id, // Vinculación automática 1:1
                roles: [data.rol_usuario], // Usar el rol seleccionado (sin SUPER_ADMIN)
                empresaId: data.empresa_id,
              });
              toast.success('Acceso creado', {
                description: `Se ha creado el acceso al sistema con DNI: ${data.documento_identidad} y rol ${data.rol_usuario}. La contraseña temporal es el DNI.`,
              });
            }
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

  const handleOpenDeleteModal = (id: string) => {
    setTrabajadorToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!trabajadorToDelete) return;

    try {
      await trabajadoresService.remove(trabajadorToDelete);
      toast.success('Trabajador eliminado', {
        description: 'El trabajador se ha eliminado correctamente',
      });
      setIsDeleteModalOpen(false);
      setTrabajadorToDelete(null);
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
                                  onClick={() => handleOpenDeleteModal(trabajador.id)}
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
                <Input
                  {...register('documento_identidad')}
                  placeholder="12345678"
                  disabled={!!editingTrabajador}
                  className={editingTrabajador ? 'bg-slate-50 cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed' : ''}
                />
                {errors.documento_identidad && (
                  <p className="mt-1 text-sm text-danger">
                    {errors.documento_identidad.message}
                  </p>
                )}
                {editingTrabajador && (
                  <p className="mt-1 text-xs text-slate-500">
                    Para corregir el DNI, es necesario eliminar y volver a crear el registro.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Empresa *
                </label>
                <Select
                  {...register('empresa_id')}
                  disabled={!!editingTrabajador}
                  className={editingTrabajador ? 'bg-slate-50 cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed' : ''}
                >
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
                {editingTrabajador && (
                  <p className="mt-1 text-xs text-slate-500">
                    La empresa no puede ser modificada después de la creación.
                  </p>
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

              {(canCreate || (editingTrabajador && !editingTrabajador.usuario_id)) && (
                <>
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
                        {editingTrabajador && !editingTrabajador.usuario_id
                          ? 'Al activar, se creará automáticamente un usuario con el DNI como credencial. La contraseña temporal será el DNI.'
                          : 'Al activar, se creará automáticamente un usuario con el DNI como credencial. La contraseña temporal será el DNI.'}
                      </p>
                    </div>
                  </div>
                  
                  {habilitarAcceso && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Rol de Usuario *
                      </label>
                      <Select {...register('rol_usuario')}>
                        <option value="">Seleccione un rol</option>
                        {(() => {
                          // Jerarquía de roles según el creador
                          const isSuperAdmin = hasRole(UsuarioRol.SUPER_ADMIN);
                          const isAdminEmpresa = hasRole(UsuarioRol.ADMIN_EMPRESA) && !isSuperAdmin;
                          
                          // Roles operativos base
                          const rolesOperativos = [
                            UsuarioRol.SUPERVISOR,
                            UsuarioRol.EMPLEADO,
                            UsuarioRol.MEDICO,
                            UsuarioRol.INGENIERO_SST,
                            UsuarioRol.AUDITOR,
                          ];
                          
                          // Si es SUPER_ADMIN o ADMIN (Sistema), puede crear ADMIN_EMPRESA también
                          const rolesDisponibles = isSuperAdmin || !isAdminEmpresa
                            ? [...rolesOperativos, UsuarioRol.ADMIN_EMPRESA]
                            : rolesOperativos;
                          
                          return rolesDisponibles
                            .filter((rol) => rol !== UsuarioRol.SUPER_ADMIN) // Nunca permitir SUPER_ADMIN
                            .map((rol) => (
                              <option key={rol} value={rol}>
                                {rol.replace(/_/g, ' ')}
                              </option>
                            ));
                        })()}
                      </Select>
                      {errors.rol_usuario && (
                        <p className="mt-1 text-sm text-danger">{errors.rol_usuario.message}</p>
                      )}
                      {watch('rol_usuario') === UsuarioRol.ADMIN_EMPRESA && (
                        <p className="mt-2 text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                          ⚠️ Advertencia: Los administradores sin ficha de trabajador vinculada no podrán firmar registros legales de SST.
                        </p>
                      )}
                    </div>
                  )}
                </>
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

        {/* Modal de Confirmación de Eliminación */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setTrabajadorToDelete(null);
          }}
          title="Confirmar Eliminación"
          size="md"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-700">
              ¿Estás seguro de eliminar este trabajador? Esta acción no se puede deshacer.
            </p>
            <p className="text-xs text-slate-500">
              Si el trabajador tiene un usuario vinculado, el acceso al sistema también será afectado.
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setTrabajadorToDelete(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Eliminar
              </Button>
            </div>
          </div>
        </Modal>
      </div>
  );
}
