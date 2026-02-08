'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { usuariosService, CreateUsuarioDto } from '@/services/usuarios.service';
import { trabajadoresService, Trabajador } from '@/services/trabajadores.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  RotateCcw,
  UserCog,
  ShieldOff,
  Shield,
  Plus,
  CheckCircle2,
  XCircle,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { UsuarioRol, Usuario } from '@/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface UsuarioConTrabajador extends Usuario {
  trabajador_nombre?: string | null;
  trabajador_dni?: string | null;
}

const createUsuarioSchema = z.object({
  trabajador_id: z.string().uuid('Debe seleccionar un trabajador'),
  roles: z.array(z.nativeEnum(UsuarioRol)).min(1, 'Debe seleccionar al menos un rol'),
});

type CreateUsuarioFormData = z.infer<typeof createUsuarioSchema>;

export default function AdminUsuariosPage() {
  const router = useRouter();
  const { usuario: currentUser, hasRole } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioConTrabajador[]>([]);
  const [trabajadoresDisponibles, setTrabajadoresDisponibles] = useState<Trabajador[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTrabajadores, setIsLoadingTrabajadores] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTrabajador, setSelectedTrabajador] = useState<Trabajador | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<UsuarioConTrabajador | null>(null);
  const [isEditRolesModalOpen, setIsEditRolesModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateUsuarioFormData>({
    resolver: zodResolver(createUsuarioSchema),
    defaultValues: {
      trabajador_id: '',
      roles: [],
    },
  });

  const selectedTrabajadorId = watch('trabajador_id');
  const selectedRoles = watch('roles');

  // Validación de acceso
  useEffect(() => {
    if (currentUser && !hasRole(UsuarioRol.SUPER_ADMIN) && !hasRole(UsuarioRol.ADMIN_EMPRESA)) {
      toast.error('Acceso Denegado', {
        description: 'No tienes permisos para acceder a esta página',
      });
      router.push('/dashboard');
      return;
    }
  }, [currentUser, router]);

  useEffect(() => {
    if (hasRole(UsuarioRol.SUPER_ADMIN) || hasRole(UsuarioRol.ADMIN_EMPRESA)) {
      loadUsuarios();
      loadTrabajadoresDisponibles();
    }
  }, [hasRole]);

  useEffect(() => {
    if (selectedTrabajadorId) {
      const trabajador = trabajadoresDisponibles.find((t) => t.id === selectedTrabajadorId);
      setSelectedTrabajador(trabajador || null);
    } else {
      setSelectedTrabajador(null);
    }
  }, [selectedTrabajadorId, trabajadoresDisponibles]);

  const loadUsuarios = async () => {
    try {
      setIsLoading(true);
      const data = await usuariosService.findAll();

      // Enriquecer con datos de trabajadores vinculados
      const usuariosConTrabajador = await Promise.all(
        data.map(async (u) => {
          if (u.trabajadorId) {
            try {
              const trabajador = await trabajadoresService.findOne(u.trabajadorId);
              return {
                ...u,
                trabajador_nombre: trabajador.nombre_completo,
                trabajador_dni: trabajador.documento_identidad,
              };
            } catch {
              return {
                ...u,
                trabajador_nombre: null,
                trabajador_dni: null,
              };
            }
          }
          return {
            ...u,
            trabajador_nombre: null,
            trabajador_dni: null,
          };
        })
      );

      setUsuarios(usuariosConTrabajador);
    } catch (error: any) {
      toast.error('Error al cargar usuarios', {
        description: error.response?.data?.message || 'No se pudieron cargar los usuarios',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadTrabajadoresDisponibles = async () => {
    try {
      setIsLoadingTrabajadores(true);
      const empresaId = currentUser?.empresaId;
      
      if (!empresaId && !hasRole(UsuarioRol.SUPER_ADMIN)) {
        toast.error('Error', {
          description: 'No se pudo determinar la empresa',
        });
        return;
      }

      // Cargar todos los trabajadores de la empresa
      const todosTrabajadores = await trabajadoresService.findAll(
        hasRole(UsuarioRol.SUPER_ADMIN) ? undefined : empresaId || undefined
      );

      // Filtrar solo los que no tienen usuario vinculado
      const disponibles = todosTrabajadores.filter((t) => !t.usuario_id);
      setTrabajadoresDisponibles(disponibles);
    } catch (error: any) {
      toast.error('Error al cargar trabajadores', {
        description: error.response?.data?.message || 'No se pudieron cargar los trabajadores',
      });
    } finally {
      setIsLoadingTrabajadores(false);
    }
  };

  const onSubmitCreate = async (data: CreateUsuarioFormData) => {
    if (!selectedTrabajador) {
      toast.error('Error', {
        description: 'Debe seleccionar un trabajador',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const empresaId = currentUser?.empresaId || undefined;

      const payload: CreateUsuarioDto = {
        dni: selectedTrabajador.documento_identidad,
        trabajadorId: data.trabajador_id,
        roles: data.roles,
        empresaId: hasRole(UsuarioRol.SUPER_ADMIN) ? undefined : empresaId,
      };

      await usuariosService.create(payload);
      toast.success('Usuario creado exitosamente', {
        description: `Se ha creado el acceso para ${selectedTrabajador.nombre_completo}`,
      });

      setIsModalOpen(false);
      reset();
      setSelectedTrabajador(null);
      loadUsuarios();
      loadTrabajadoresDisponibles();
    } catch (error: any) {
      toast.error('Error al crear usuario', {
        description: error.response?.data?.message || 'No se pudo crear el usuario',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (usuarioId: string, dni: string | null) => {
    if (!dni) {
      toast.error('Error', {
        description: 'El usuario no tiene un DNI asociado',
      });
      return;
    }

    if (!confirm(`¿Estás seguro de resetear la contraseña? La nueva contraseña será el DNI: ${dni}`)) {
      return;
    }

    try {
      await usuariosService.resetPassword(usuarioId);
      toast.success('Contraseña reseteada', {
        description: `La contraseña ha sido establecida como el DNI: ${dni}`,
      });
    } catch (error: any) {
      toast.error('Error al resetear contraseña', {
        description: error.response?.data?.message || 'No se pudo resetear la contraseña',
      });
    }
  };

  const handleEditRoles = (usuario: UsuarioConTrabajador) => {
    setEditingUsuario(usuario);
    setValue('roles', usuario.roles);
    setIsEditRolesModalOpen(true);
  };

  const handleUpdateRoles = async () => {
    if (!editingUsuario) return;

    setIsSubmitting(true);
    try {
      await usuariosService.update(editingUsuario.id, {
        roles: selectedRoles,
      });

      toast.success('Roles actualizados', {
        description: 'Los roles del usuario han sido actualizados exitosamente',
      });

      setIsEditRolesModalOpen(false);
      setEditingUsuario(null);
      reset();
      loadUsuarios();
    } catch (error: any) {
      toast.error('Error al actualizar roles', {
        description: error.response?.data?.message || 'No se pudieron actualizar los roles',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActivo = async (usuario: UsuarioConTrabajador) => {
    const action = usuario.activo ? 'desactivar' : 'activar';
    if (!confirm(`¿Estás seguro de ${action} este usuario?`)) {
      return;
    }

    try {
      await usuariosService.update(usuario.id, {
        activo: !usuario.activo,
      });

      toast.success(`Usuario ${usuario.activo ? 'desactivado' : 'activado'}`, {
        description: `El usuario ha sido ${usuario.activo ? 'desactivado' : 'activado'} exitosamente`,
      });

      loadUsuarios();
    } catch (error: any) {
      toast.error(`Error al ${action} usuario`, {
        description: error.response?.data?.message || `No se pudo ${action} el usuario`,
      });
    }
  };

  const getRolBadgeColor = (rol: UsuarioRol) => {
    switch (rol) {
      case UsuarioRol.SUPER_ADMIN:
        return 'bg-red-100 text-red-800 border-red-300';
      case UsuarioRol.ADMIN_EMPRESA:
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case UsuarioRol.INGENIERO_SST:
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case UsuarioRol.SUPERVISOR:
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case UsuarioRol.MEDICO:
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  if (!currentUser) {
    return null;
  }

  if (!hasRole(UsuarioRol.SUPER_ADMIN) && !hasRole(UsuarioRol.ADMIN_EMPRESA)) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <div className="p-12 text-center">
            <Shield className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">No tienes permisos para acceder a esta página</p>
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-7 h-7 text-primary" />
                Gestión de Usuarios
              </h1>
              <p className="text-slate-600 mt-1">
                Administra usuarios del sistema y sus permisos
              </p>
            </div>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Crear Acceso
            </Button>
          </div>

          {/* Listado */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : usuarios.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-lg shadow-sm border border-slate-200">
              <Users className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">No hay usuarios registrados</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                        DNI
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                        Nombre Completo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                        Roles
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                        Último Acceso
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {usuarios.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-slate-900">{u.dni}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-slate-900">
                            {u.trabajador_nombre || 'Sin trabajador vinculado'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {u.roles.map((rol) => (
                              <span
                                key={rol}
                                className={`px-2 py-1 text-xs font-medium rounded border ${getRolBadgeColor(rol)}`}
                              >
                                {rol.replace('_', ' ')}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {u.activo ? (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800 border border-green-300">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800 border border-red-300">
                              <XCircle className="w-3 h-3 mr-1" />
                              Inactivo
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {u.ultimoAcceso ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(u.ultimoAcceso).toLocaleDateString('es-PE', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          ) : (
                            <span className="text-slate-400">Nunca</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResetPassword(u.id, u.dni)}
                              title="Resetear contraseña usando el DNI"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditRoles(u)}
                              title="Editar roles"
                            >
                              <UserCog className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleActivo(u)}
                              title={u.activo ? 'Desactivar usuario' : 'Activar usuario'}
                              className={u.activo ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                            >
                              <ShieldOff className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal de Creación */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            reset();
            setSelectedTrabajador(null);
          }}
          title="Crear Acceso de Usuario"
          size="lg"
        >
          <form onSubmit={handleSubmit(onSubmitCreate)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Trabajador <span className="text-red-500">*</span>
              </label>
              <Select
                {...register('trabajador_id')}
                disabled={isLoadingTrabajadores}
              >
                <option value="">Seleccione un trabajador</option>
                {trabajadoresDisponibles.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre_completo} - DNI: {t.documento_identidad}
                  </option>
                ))}
              </Select>
              {errors.trabajador_id && (
                <p className="mt-1 text-sm text-red-600">{errors.trabajador_id.message}</p>
              )}
              {trabajadoresDisponibles.length === 0 && !isLoadingTrabajadores && (
                <p className="mt-1 text-sm text-slate-500">
                  No hay trabajadores disponibles sin usuario vinculado
                </p>
              )}
            </div>

            {selectedTrabajador && (
              <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">DNI</label>
                  <Input
                    value={selectedTrabajador.documento_identidad}
                    readOnly
                    className="bg-white cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Nombre Completo</label>
                  <Input
                    value={selectedTrabajador.nombre_completo}
                    readOnly
                    className="bg-white cursor-not-allowed"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Roles <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2 border border-slate-300 rounded-md p-3 max-h-48 overflow-y-auto">
                {Object.values(UsuarioRol).map((rol) => (
                  <label key={rol} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      value={rol}
                      checked={selectedRoles.includes(rol)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setValue('roles', [...selectedRoles, rol]);
                        } else {
                          setValue('roles', selectedRoles.filter((r) => r !== rol));
                        }
                      }}
                      className="rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-slate-700">{rol.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
              {errors.roles && (
                <p className="mt-1 text-sm text-red-600">{errors.roles.message}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsModalOpen(false);
                  reset();
                  setSelectedTrabajador(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creando...' : 'Crear Acceso'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal de Edición de Roles */}
        <Modal
          isOpen={isEditRolesModalOpen}
          onClose={() => {
            setIsEditRolesModalOpen(false);
            setEditingUsuario(null);
            reset();
          }}
          title="Editar Roles"
          size="md"
        >
          <div className="space-y-6">
            {editingUsuario && (
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-slate-700">Usuario</p>
                <p className="text-sm text-slate-900">{editingUsuario.dni}</p>
                {editingUsuario.trabajador_nombre && (
                  <p className="text-sm text-slate-600">{editingUsuario.trabajador_nombre}</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Roles <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2 border border-slate-300 rounded-md p-3 max-h-48 overflow-y-auto">
                {Object.values(UsuarioRol).map((rol) => (
                  <label key={rol} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      value={rol}
                      checked={selectedRoles.includes(rol)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setValue('roles', [...selectedRoles, rol]);
                        } else {
                          setValue('roles', selectedRoles.filter((r) => r !== rol));
                        }
                      }}
                      className="rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-slate-700">{rol.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
              {errors.roles && (
                <p className="mt-1 text-sm text-red-600">{errors.roles.message}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditRolesModalOpen(false);
                  setEditingUsuario(null);
                  reset();
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleUpdateRoles} disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </div>
        </Modal>
      </MainLayout>
    </ProtectedRoute>
  );
}
