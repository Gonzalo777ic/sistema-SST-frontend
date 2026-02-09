'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { usuariosService, CreateUsuarioDto } from '@/services/usuarios.service';
import { trabajadoresService, Trabajador } from '@/services/trabajadores.service';
import { empresasService, Empresa } from '@/services/empresas.service';
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
  UserCheck,
  Link as LinkIcon,
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
  dni: z.string().min(8, 'El DNI debe tener 8 dígitos').max(8, 'El DNI debe tener 8 dígitos').regex(/^\d+$/, 'El DNI debe contener solo números'),
  trabajador_id: z.string().uuid().optional().or(z.literal('')),
  roles: z.array(z.nativeEnum(UsuarioRol)).min(1, 'Debe seleccionar al menos un rol'),
  empresa_id: z.string().uuid().optional().or(z.literal('')),
});

type CreateUsuarioFormData = z.infer<typeof createUsuarioSchema>;

export default function GestionUsuariosPage() {
  const router = useRouter();
  const { usuario: currentUser, hasRole } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioConTrabajador[]>([]);
  const [usuariosFiltrados, setUsuariosFiltrados] = useState<UsuarioConTrabajador[]>([]);
  const [trabajadoresDisponibles, setTrabajadoresDisponibles] = useState<Trabajador[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTrabajadores, setIsLoadingTrabajadores] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTrabajador, setSelectedTrabajador] = useState<Trabajador | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<UsuarioConTrabajador | null>(null);
  const [isEditRolesModalOpen, setIsEditRolesModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkingUsuario, setLinkingUsuario] = useState<UsuarioConTrabajador | null>(null);
  const [selectedTrabajadorToLink, setSelectedTrabajadorToLink] = useState<string>('');
  // Filtros
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activo' | 'inactivo'>('todos');
  const [filtroVinculacion, setFiltroVinculacion] = useState<'todos' | 'vinculado' | 'sin-vinculacion'>('todos');

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
      dni: '',
      trabajador_id: '',
      roles: [],
      empresa_id: '',
    },
  });

  const selectedTrabajadorId = watch('trabajador_id');
  const selectedRoles = watch('roles');
  const dniValue = watch('dni');

  // Validación de acceso - solo SUPER_ADMIN
  useEffect(() => {
    if (currentUser && !hasRole(UsuarioRol.SUPER_ADMIN)) {
      toast.error('Acceso Denegado', {
        description: 'Solo los administradores del sistema pueden acceder a esta página',
      });
      router.push('/dashboard');
      return;
    }
  }, [currentUser, router]);

  useEffect(() => {
    if (hasRole(UsuarioRol.SUPER_ADMIN)) {
      loadUsuarios();
      loadTrabajadoresDisponibles();
      loadEmpresas();
    }
  }, [hasRole]);

  const loadEmpresas = async () => {
    try {
      const data = await empresasService.findAll();
      setEmpresas(data.filter((e) => e.activo));
    } catch (error: any) {
      toast.error('Error al cargar empresas', {
        description: error.response?.data?.message || 'No se pudieron cargar las empresas',
      });
    }
  };

  useEffect(() => {
    if (selectedTrabajadorId) {
      const trabajador = trabajadoresDisponibles.find((t) => t.id === selectedTrabajadorId);
      setSelectedTrabajador(trabajador || null);
      if (trabajador) {
        // Auto-completar DNI desde trabajador si está disponible
        setValue('dni', trabajador.documento_identidad);
      }
    } else {
      setSelectedTrabajador(null);
    }
  }, [selectedTrabajadorId, trabajadoresDisponibles, setValue]);

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
      aplicarFiltros(usuariosConTrabajador);
    } catch (error: any) {
      toast.error('Error al cargar usuarios', {
        description: error.response?.data?.message || 'No se pudieron cargar los usuarios',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const aplicarFiltros = (listaUsuarios: UsuarioConTrabajador[]) => {
    let filtrados = [...listaUsuarios];

    // Filtro por empresa
    if (filtroEmpresa) {
      filtrados = filtrados.filter((u) => u.empresaId === filtroEmpresa);
    }

    // Filtro por estado
    if (filtroEstado === 'activo') {
      filtrados = filtrados.filter((u) => u.activo === true);
    } else if (filtroEstado === 'inactivo') {
      filtrados = filtrados.filter((u) => u.activo === false);
    }

    // Filtro por vinculación
    if (filtroVinculacion === 'vinculado') {
      filtrados = filtrados.filter((u) => u.trabajadorId !== null);
    } else if (filtroVinculacion === 'sin-vinculacion') {
      filtrados = filtrados.filter((u) => u.trabajadorId === null);
    }

    setUsuariosFiltrados(filtrados);
  };

  useEffect(() => {
    aplicarFiltros(usuarios);
  }, [filtroEmpresa, filtroEstado, filtroVinculacion, usuarios]);

  const loadTrabajadoresDisponibles = async () => {
    try {
      setIsLoadingTrabajadores(true);
      // Cargar todos los trabajadores sin usuario vinculado
      const todosTrabajadores = await trabajadoresService.findAll();
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
    setIsSubmitting(true);
    try {
      const payload: CreateUsuarioDto = {
        dni: data.dni,
        trabajadorId: data.trabajador_id && data.trabajador_id !== '' ? data.trabajador_id : undefined,
        roles: data.roles,
        empresaId: data.empresa_id && data.empresa_id !== '' ? data.empresa_id : undefined,
      };

      await usuariosService.create(payload);
      toast.success('Usuario creado exitosamente', {
        description: `Se ha creado el acceso con DNI: ${data.dni}. El usuario deberá cambiar su contraseña al iniciar sesión.`,
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

  const handleResetPassword = async (usuarioId: string, dni: string) => {
    if (!confirm(`¿Estás seguro de resetear la contraseña? La nueva contraseña será el DNI: ${dni}`)) {
      return;
    }

    try {
      await usuariosService.resetPassword(usuarioId);
      toast.success('Contraseña reseteada', {
        description: `La contraseña ha sido establecida como el DNI: ${dni}. El usuario deberá cambiarla al iniciar sesión.`,
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

  const handleOpenLinkModal = async (usuario: UsuarioConTrabajador) => {
    setLinkingUsuario(usuario);
    setSelectedTrabajadorToLink('');
    await loadTrabajadoresDisponibles();
    setIsLinkModalOpen(true);
  };

  const handleLinkTrabajador = async () => {
    if (!linkingUsuario || !selectedTrabajadorToLink) {
      toast.error('Error', {
        description: 'Debe seleccionar un trabajador para vincular',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await usuariosService.update(linkingUsuario.id, {
        trabajadorId: selectedTrabajadorToLink,
      });

      toast.success('Trabajador vinculado', {
        description: 'El trabajador ha sido vinculado exitosamente al usuario',
      });

      setIsLinkModalOpen(false);
      setLinkingUsuario(null);
      setSelectedTrabajadorToLink('');
      loadUsuarios();
      loadTrabajadoresDisponibles();
    } catch (error: any) {
      toast.error('Error al vincular trabajador', {
        description: error.response?.data?.message || 'No se pudo vincular el trabajador',
      });
    } finally {
      setIsSubmitting(false);
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

  if (!hasRole(UsuarioRol.SUPER_ADMIN)) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <div className="p-12 text-center">
            <Shield className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">Solo los administradores del sistema pueden acceder a esta página</p>
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
                Administra usuarios del sistema, roles y permisos
              </p>
            </div>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Crear Usuario
            </Button>
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Filtrar por Empresa
                </label>
                <Select
                  value={filtroEmpresa}
                  onChange={(e) => setFiltroEmpresa(e.target.value)}
                >
                  <option value="">Todas las empresas</option>
                  {empresas.map((empresa) => (
                    <option key={empresa.id} value={empresa.id}>
                      {empresa.nombre}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Estado de Cuenta
                </label>
                <Select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value as 'todos' | 'activo' | 'inactivo')}
                >
                  <option value="todos">Todos</option>
                  <option value="activo">Activos</option>
                  <option value="inactivo">Inactivos</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Vinculación
                </label>
                <Select
                  value={filtroVinculacion}
                  onChange={(e) => setFiltroVinculacion(e.target.value as 'todos' | 'vinculado' | 'sin-vinculacion')}
                >
                  <option value="todos">Todos</option>
                  <option value="vinculado">Con Trabajador</option>
                  <option value="sin-vinculacion">Sin Trabajador</option>
                </Select>
              </div>
            </div>
          </div>

          {/* Listado */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : usuariosFiltrados.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-lg shadow-sm border border-slate-200">
              <Users className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">
                {usuarios.length === 0 
                  ? 'No hay usuarios registrados' 
                  : 'No hay usuarios que coincidan con los filtros seleccionados'}
              </p>
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
                        Trabajador Vinculado
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
                    {usuariosFiltrados.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-slate-900">{u.dni}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {u.trabajador_nombre ? (
                            <div className="flex items-center gap-2">
                              <UserCheck className="w-4 h-4 text-green-600" />
                              <span className="text-sm text-slate-900">{u.trabajador_nombre}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">Sin vinculación</span>
                          )}
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
                            {!u.trabajadorId && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenLinkModal(u)}
                                title="Vincular trabajador"
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <LinkIcon className="w-4 h-4" />
                              </Button>
                            )}
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
          title="Crear Usuario"
          size="lg"
        >
          <form onSubmit={handleSubmit(onSubmitCreate)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                DNI <span className="text-red-500">*</span>
              </label>
              <Input
                {...register('dni')}
                placeholder="12345678"
                maxLength={8}
                disabled={!!selectedTrabajador}
                className={selectedTrabajador ? 'bg-slate-50 cursor-not-allowed' : ''}
              />
              {errors.dni && (
                <p className="mt-1 text-sm text-red-600">{errors.dni.message}</p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                El DNI será usado como credencial de acceso. El usuario deberá cambiar su contraseña al iniciar sesión.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Trabajador (Opcional)
              </label>
              <Select
                {...register('trabajador_id')}
                disabled={isLoadingTrabajadores}
                onChange={(e) => {
                  setValue('trabajador_id', e.target.value);
                }}
              >
                <option value="">Sin vinculación</option>
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
                Empresa (Opcional)
              </label>
              <Select
                {...register('empresa_id')}
                onChange={(e) => {
                  setValue('empresa_id', e.target.value);
                }}
              >
                <option value="">Sin empresa asignada</option>
                {empresas.map((empresa) => (
                  <option key={empresa.id} value={empresa.id}>
                    {empresa.nombre}
                  </option>
                ))}
              </Select>
              {errors.empresa_id && (
                <p className="mt-1 text-sm text-red-600">{errors.empresa_id.message}</p>
              )}
            </div>

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
                {isSubmitting ? 'Creando...' : 'Crear Usuario'}
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

        {/* Modal de Vinculación de Trabajador */}
        <Modal
          isOpen={isLinkModalOpen}
          onClose={() => {
            setIsLinkModalOpen(false);
            setLinkingUsuario(null);
            setSelectedTrabajadorToLink('');
          }}
          title="Vincular Trabajador"
          size="md"
        >
          <div className="space-y-6">
            {linkingUsuario && (
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-slate-700">Usuario</p>
                <p className="text-sm text-slate-900">DNI: {linkingUsuario.dni}</p>
                {linkingUsuario.roles.length > 0 && (
                  <p className="text-sm text-slate-600">
                    Roles: {linkingUsuario.roles.map(r => r.replace('_', ' ')).join(', ')}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Seleccionar Trabajador <span className="text-red-500">*</span>
              </label>
              <Select
                value={selectedTrabajadorToLink}
                onChange={(e) => setSelectedTrabajadorToLink(e.target.value)}
                disabled={isLoadingTrabajadores}
              >
                <option value="">Seleccione un trabajador</option>
                {trabajadoresDisponibles.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre_completo} - DNI: {t.documento_identidad}
                    {t.empresa_id && ` - ${t.cargo}`}
                  </option>
                ))}
              </Select>
              {trabajadoresDisponibles.length === 0 && !isLoadingTrabajadores && (
                <p className="mt-2 text-sm text-slate-500">
                  No hay trabajadores disponibles sin usuario vinculado
                </p>
              )}
              {isLoadingTrabajadores && (
                <p className="mt-2 text-sm text-slate-500">Cargando trabajadores...</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsLinkModalOpen(false);
                  setLinkingUsuario(null);
                  setSelectedTrabajadorToLink('');
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleLinkTrabajador}
                disabled={isSubmitting || !selectedTrabajadorToLink || isLoadingTrabajadores}
              >
                {isSubmitting ? 'Vinculando...' : 'Vincular Trabajador'}
              </Button>
            </div>
          </div>
        </Modal>
      </MainLayout>
    </ProtectedRoute>
  );
}
