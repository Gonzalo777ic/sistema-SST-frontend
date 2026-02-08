'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { usuariosService } from '@/services/usuarios.service';
import { Usuario } from '@/types';
import { empresasService, Empresa } from '@/services/empresas.service';
import { trabajadoresService, Trabajador } from '@/services/trabajadores.service';
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
import { Link2, UserX, UserCheck, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UsuarioRol } from '@/types';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const vinculacionSchema = z.object({
  empresa_id: z.string().uuid().optional().or(z.literal('')),
  trabajador_id: z.string().uuid().optional().or(z.literal('')),
  roles: z.array(z.nativeEnum(UsuarioRol)).min(1, 'Debe seleccionar al menos un rol'),
  activo: z.boolean(),
});

type VinculacionFormData = z.infer<typeof vinculacionSchema>;

export default function VinculacionUsuariosPage() {
  const { hasRole, usuario: currentUser } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<VinculacionFormData>({
    resolver: zodResolver(vinculacionSchema),
    defaultValues: {
      empresa_id: '',
      trabajador_id: '',
      roles: [],
      activo: true,
    },
  });

  const selectedEmpresaId = watch('empresa_id');

  const canAccess = hasRole(UsuarioRol.SUPER_ADMIN) || hasRole(UsuarioRol.ADMIN_EMPRESA);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedEmpresaId) {
      loadTrabajadores(selectedEmpresaId);
    } else {
      setTrabajadores([]);
    }
  }, [selectedEmpresaId]);

  useEffect(() => {
    if (selectedUsuario) {
      reset({
        empresa_id: selectedUsuario.empresaId || '',
        trabajador_id: selectedUsuario.trabajadorId || '',
        roles: selectedUsuario.roles,
        activo: selectedUsuario.activo,
      });
      if (selectedUsuario.empresaId) {
        loadTrabajadores(selectedUsuario.empresaId);
      }
    } else {
      reset({
        empresa_id: '',
        trabajador_id: '',
        roles: [],
        activo: true,
      });
    }
  }, [selectedUsuario, reset]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([loadUsuarios(), loadEmpresas()]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsuarios = async () => {
    try {
      const data = await usuariosService.findAll();
      setUsuarios(data);
    } catch (error: any) {
      toast.error('Error al cargar usuarios', {
        description: error.response?.data?.message || 'No se pudieron cargar los usuarios',
      });
    }
  };

  const loadEmpresas = async () => {
    try {
      const data = await empresasService.findAll();
      setEmpresas(data.filter((e) => e.activo));
    } catch (error: any) {
      toast.error('Error al cargar empresas');
    }
  };

  const loadTrabajadores = async (empresaId: string) => {
    try {
      const data = await trabajadoresService.findAll(empresaId);
      setTrabajadores(data);
    } catch (error: any) {
      setTrabajadores([]);
    }
  };

  const onSubmit = async (data: VinculacionFormData) => {
    if (!selectedUsuario) return;

    try {
      await usuariosService.update(selectedUsuario.id, {
        empresaId: data.empresa_id || undefined,
        trabajadorId: data.trabajador_id || undefined,
        roles: data.roles,
        activo: data.activo,
      });
      toast.success('Usuario actualizado', {
        description: 'La vinculación se ha actualizado correctamente',
      });
      setIsModalOpen(false);
      setSelectedUsuario(null);
      loadUsuarios();
    } catch (error: any) {
      // Manejo específico del error 412 (Precondition Failed)
      if (error.response?.status === 412) {
        toast.error('Operación no permitida', {
          description:
            error.response?.data?.message ||
            'No se puede realizar esta operación por restricciones de seguridad del sistema',
        });
      } else {
        toast.error('Error al actualizar usuario', {
          description:
            error.response?.data?.message || 'No se pudo actualizar la vinculación',
        });
      }
    }
  };

  const handleRoleToggle = (role: UsuarioRol, currentRoles: UsuarioRol[]) => {
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter((r) => r !== role)
      : [...currentRoles, role];
    setValue('roles', newRoles);
  };

  return (
    <ProtectedRoute
      allowedRoles={[UsuarioRol.SUPER_ADMIN, UsuarioRol.ADMIN_EMPRESA]}
    >
      <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Vinculación de Usuarios</h1>
          <p className="text-slate-600 mt-2">
            Gestiona la vinculación entre usuarios, empresas y trabajadores
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : usuarios.length === 0 ? (
            <div className="p-12 text-center">
              <UserX className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">No hay usuarios registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Trabajador</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.map((usuario) => (
                    <TableRow key={usuario.id}>
                      <TableCell className="font-medium">{usuario.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {usuario.roles.map((role: UsuarioRol) => (
                            <span
                              key={role}
                              className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded"
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {usuario.empresaId
                          ? empresas.find((e) => e.id === usuario.empresaId)?.nombre || 'N/A'
                          : 'Sin vincular'}
                      </TableCell>
                      <TableCell>
                        {usuario.trabajadorId ? 'Vinculado' : 'Sin vincular'}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            usuario.activo
                              ? 'bg-success-light/20 text-success'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {usuario.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUsuario(usuario);
                            setIsModalOpen(true);
                          }}
                        >
                          <Link2 className="w-4 h-4 mr-2" />
                          Vincular
                        </Button>
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
            setSelectedUsuario(null);
          }}
          title="Vincular Usuario"
          size="lg"
        >
          {selectedUsuario && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-md">
                <p className="text-sm font-medium text-slate-700">Usuario</p>
                <p className="text-lg text-slate-900">{selectedUsuario.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Empresa
                </label>
                <Select {...register('empresa_id')}>
                  <option value="">Sin vincular</option>
                  {empresas.map((empresa) => (
                    <option key={empresa.id} value={empresa.id}>
                      {empresa.nombre}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Trabajador
                </label>
                <Select
                  {...register('trabajador_id')}
                  disabled={!selectedEmpresaId}
                >
                  <option value="">Sin vincular</option>
                  {trabajadores.map((trabajador) => (
                    <option key={trabajador.id} value={trabajador.id}>
                      {trabajador.nombre_completo} - {trabajador.documento_identidad}
                    </option>
                  ))}
                </Select>
                {!selectedEmpresaId && (
                  <p className="mt-1 text-sm text-slate-500">
                    Seleccione una empresa primero para ver los trabajadores
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Roles *
                </label>
                {currentUser?.id === selectedUsuario.id && (
                  <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-start gap-2">
                    <Info className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-800">
                      No puedes modificar tus propios roles administrativos por seguridad.
                    </p>
                  </div>
                )}
                <div className="space-y-2 border border-slate-200 rounded-md p-4">
                  {Object.values(UsuarioRol).map((role) => {
                    const currentRoles = watch('roles');
                    const isSelected = currentRoles.includes(role);
                    const isCurrentUser = currentUser?.id === selectedUsuario.id;
                    const isSuperAdminRole = role === UsuarioRol.SUPER_ADMIN;
                    const isDisabled = isCurrentUser && isSuperAdminRole;

                    return (
                      <Tooltip
                        key={role}
                        content={
                          isDisabled
                            ? 'No puedes modificar tus propios roles administrativos por seguridad'
                            : ''
                        }
                      >
                        <label
                          className={cn(
                            'flex items-center gap-2 p-2 rounded',
                            isDisabled
                              ? 'cursor-not-allowed opacity-50'
                              : 'cursor-pointer hover:bg-slate-50',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleRoleToggle(role, currentRoles)}
                            disabled={isDisabled}
                            className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary disabled:cursor-not-allowed"
                          />
                          <span className="text-sm text-slate-700">{role}</span>
                          {isDisabled && (
                            <Info className="w-4 h-4 text-slate-400 ml-auto" />
                          )}
                        </label>
                      </Tooltip>
                    );
                  })}
                </div>
                {errors.roles && (
                  <p className="mt-1 text-sm text-danger">{errors.roles.message}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activo"
                  {...register('activo')}
                  disabled={currentUser?.id === selectedUsuario.id}
                  className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                />
                <label
                  htmlFor="activo"
                  className={cn(
                    'text-sm font-medium',
                    currentUser?.id === selectedUsuario.id
                      ? 'text-slate-400 cursor-not-allowed'
                      : 'text-slate-700',
                  )}
                >
                  Usuario activo
                </label>
                {currentUser?.id === selectedUsuario.id && (
                  <Tooltip content="No puedes desactivar tu propia cuenta por seguridad">
                    <Info className="w-4 h-4 text-slate-400" />
                  </Tooltip>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedUsuario(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Guardando...
                    </>
                  ) : (
                    'Guardar Vinculación'
                  )}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    </MainLayout>
    </ProtectedRoute>
  );
}
