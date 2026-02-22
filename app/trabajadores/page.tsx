'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  trabajadoresService,
  Trabajador,
  EstadoTrabajador,
  GrupoSanguineo,
  TipoDocumento,
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
import { Plus, Eye, UserX, UserCheck, Users, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UsuarioRol } from '@/types';

const LABEL_TIPO_DOC: Record<TipoDocumento, string> = {
  [TipoDocumento.DNI]: 'DNI',
  [TipoDocumento.CARNE_EXTRANJERIA]: 'Carné Extranjería',
  [TipoDocumento.PASAPORTE]: 'Pasaporte',
};

const ROLES_ASIGNABLES: UsuarioRol[] = [
  UsuarioRol.INGENIERO_SST,
  UsuarioRol.SUPERVISOR,
  UsuarioRol.EMPLEADO,
  UsuarioRol.AUDITOR,
];

const LABEL_ROL: Record<UsuarioRol, string> = {
  [UsuarioRol.SUPER_ADMIN]: 'Super Admin',
  [UsuarioRol.ADMIN_EMPRESA]: 'Admin Empresa',
  [UsuarioRol.INGENIERO_SST]: 'Ingeniero SST',
  [UsuarioRol.SUPERVISOR]: 'Supervisor',
  [UsuarioRol.MEDICO]: 'Médico',
  [UsuarioRol.EMPLEADO]: 'Empleado',
  [UsuarioRol.AUDITOR]: 'Auditor',
  [UsuarioRol.CENTRO_MEDICO]: 'Centro Médico',
};

const trabajadorSchema = z.object({
  nombres: z.string().min(1, 'Los nombres son obligatorios'),
  apellido_paterno: z.string().min(1, 'El apellido paterno es obligatorio'),
  apellido_materno: z.string().min(1, 'El apellido materno es obligatorio'),
  tipo_documento: z.nativeEnum(TipoDocumento),
  numero_documento: z.string().min(1, 'El número de documento es obligatorio'),
  cargo: z.string().min(1, 'El cargo es obligatorio'),
  empresa_id: z.string().uuid('Debe seleccionar una empresa'),
  area_id: z.string().uuid().optional().or(z.literal('')),
  sede: z.string().optional().or(z.literal('')),
  telefono: z.string().optional().or(z.literal('')),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  fecha_ingreso: z.string().min(1, 'La fecha de ingreso es obligatoria'),
  estado: z.nativeEnum(EstadoTrabajador).optional(),
  grupo_sanguineo: z.nativeEnum(GrupoSanguineo).optional().or(z.literal('')),
  contacto_emergencia_nombre: z.string().optional().or(z.literal('')),
  contacto_emergencia_telefono: z.string().optional().or(z.literal('')),
  foto_url: z.string().url('Debe ser una URL válida').optional().or(z.literal('')),
  habilitar_acceso: z.boolean().optional(),
  rol_asignado: z.nativeEnum(UsuarioRol).optional(),
});

type TrabajadorFormData = z.infer<typeof trabajadorSchema>;

function formatApellidosNombres(t: Trabajador): string {
  if (t.apellido_paterno || t.apellido_materno || t.nombres) {
    return [t.apellido_paterno, t.apellido_materno, t.nombres].filter(Boolean).join(' ');
  }
  return t.nombre_completo;
}

function formatTipoDoc(t: Trabajador): string {
  return t.tipo_documento ? LABEL_TIPO_DOC[t.tipo_documento as TipoDocumento] || t.tipo_documento : '-';
}

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
      nombres: '',
      apellido_paterno: '',
      apellido_materno: '',
      tipo_documento: TipoDocumento.DNI,
      numero_documento: '',
      cargo: '',
      empresa_id: '',
      area_id: '',
      sede: '',
      telefono: '',
      email: '',
      fecha_ingreso: '',
      estado: EstadoTrabajador.Activo,
      grupo_sanguineo: undefined,
      contacto_emergencia_nombre: '',
      contacto_emergencia_telefono: '',
      foto_url: '',
      habilitar_acceso: false,
      rol_asignado: UsuarioRol.EMPLEADO,
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
    if (editingTrabajador) {
      reset({
        nombres: editingTrabajador.nombres || '',
        apellido_paterno: editingTrabajador.apellido_paterno || '',
        apellido_materno: editingTrabajador.apellido_materno || '',
        tipo_documento: (editingTrabajador.tipo_documento as TipoDocumento) || TipoDocumento.DNI,
        numero_documento: editingTrabajador.numero_documento || editingTrabajador.documento_identidad || '',
        cargo: editingTrabajador.cargo,
        empresa_id: editingTrabajador.empresa_id,
        area_id: editingTrabajador.area_id || '',
        sede: editingTrabajador.sede || '',
        telefono: editingTrabajador.telefono || '',
        email: editingTrabajador.email_personal || '',
        fecha_ingreso: editingTrabajador.fecha_ingreso,
        estado: editingTrabajador.estado,
        grupo_sanguineo: editingTrabajador.grupo_sanguineo || undefined,
        contacto_emergencia_nombre: editingTrabajador.contacto_emergencia_nombre || '',
        contacto_emergencia_telefono: editingTrabajador.contacto_emergencia_telefono || '',
        foto_url: editingTrabajador.foto_url || '',
        habilitar_acceso: !!editingTrabajador.usuario_id,
        rol_asignado: UsuarioRol.EMPLEADO,
      });
      loadAreas(editingTrabajador.empresa_id);
    } else {
      reset({
        nombres: '',
        apellido_paterno: '',
        apellido_materno: '',
        tipo_documento: TipoDocumento.DNI,
        numero_documento: '',
        cargo: '',
        empresa_id: usuario?.empresaId || '',
        area_id: '',
        sede: '',
        telefono: '',
        email: '',
        fecha_ingreso: '',
        estado: EstadoTrabajador.Activo,
        grupo_sanguineo: undefined,
        contacto_emergencia_nombre: '',
        contacto_emergencia_telefono: '',
        foto_url: '',
        habilitar_acceso: false,
        rol_asignado: UsuarioRol.EMPLEADO,
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
      let trabajadorCreado: Trabajador | null = null;

      if (editingTrabajador) {
        const updatePayload: UpdateTrabajadorDto = {
          nombres: data.nombres,
          apellido_paterno: data.apellido_paterno,
          apellido_materno: data.apellido_materno,
          cargo: data.cargo,
          area_id: data.area_id || undefined,
          sede: data.sede || undefined,
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
        toast.success('Trabajador actualizado');
        trabajadorCreado = await trabajadoresService.findOne(editingTrabajador.id);
      } else {
        const createPayload: CreateTrabajadorDto = {
          nombres: data.nombres,
          apellido_paterno: data.apellido_paterno,
          apellido_materno: data.apellido_materno,
          tipo_documento: data.tipo_documento,
          numero_documento: data.numero_documento,
          cargo: data.cargo,
          empresa_id: data.empresa_id,
          area_id: data.area_id || undefined,
          sede: data.sede || undefined,
          telefono: data.telefono || undefined,
          email: data.email || undefined,
          fecha_ingreso: data.fecha_ingreso,
          estado: data.estado,
          grupo_sanguineo: data.grupo_sanguineo || undefined,
          contacto_emergencia_nombre: data.contacto_emergencia_nombre || undefined,
          contacto_emergencia_telefono: data.contacto_emergencia_telefono || undefined,
          foto_url: data.foto_url || undefined,
        };
        trabajadorCreado = await trabajadoresService.create(createPayload);
        toast.success('Trabajador creado');
      }

      if (data.habilitar_acceso && trabajadorCreado && !trabajadorCreado.usuario_id) {
        try {
          const { usuariosService } = await import('@/services/usuarios.service');
          const doc = trabajadorCreado.numero_documento || trabajadorCreado.documento_identidad;
          await usuariosService.create({
            dni: doc,
            trabajadorId: trabajadorCreado.id,
            roles: [data.rol_asignado ?? UsuarioRol.EMPLEADO],
            empresaId: data.empresa_id,
          });
          toast.success('Acceso creado', {
            description: `Credencial: ${doc}. La contraseña temporal es el número de documento.`,
          });
        } catch (error: any) {
          toast.error('Error al crear acceso', {
            description: error.response?.data?.message,
          });
        }
      } else if (data.habilitar_acceso && trabajadorCreado?.usuario_id) {
        toast.info('El trabajador ya tiene acceso al sistema');
      }

      setIsModalOpen(false);
      setEditingTrabajador(null);
      loadTrabajadores(selectedEmpresaFilter || undefined);
    } catch (error: any) {
      toast.error('Error al guardar trabajador', {
        description: error.response?.data?.message,
      });
    }
  };

  const handleDesactivar = async (id: string) => {
    if (!confirm('¿Desactivar este trabajador? Se bloqueará su acceso al sistema.')) return;
    try {
      await trabajadoresService.desactivar(id);
      toast.success('Trabajador desactivado');
      loadTrabajadores(selectedEmpresaFilter || undefined);
    } catch (error: any) {
      toast.error('Error al desactivar', {
        description: error.response?.data?.message,
      });
    }
  };

  const handleActivar = async (id: string) => {
    if (!confirm('¿Activar este trabajador? Se restaurará su acceso al sistema si tenía usuario vinculado.')) return;
    try {
      await trabajadoresService.activar(id);
      toast.success('Trabajador activado');
      loadTrabajadores(selectedEmpresaFilter || undefined);
    } catch (error: any) {
      toast.error('Error al activar', {
        description: error.response?.data?.message,
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
        UsuarioRol.MEDICO,
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
              <Button onClick={() => { setEditingTrabajador(null); setIsModalOpen(true); }}>
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
                      <TableHead>Tipo Doc</TableHead>
                      <TableHead>Nro Doc</TableHead>
                      <TableHead>Apellidos y Nombres</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha Ingreso</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Área</TableHead>
                      <TableHead>Sede</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trabajadores.map((trabajador) => (
                      <TableRow key={trabajador.id}>
                        <TableCell>{formatTipoDoc(trabajador)}</TableCell>
                        <TableCell>{trabajador.numero_documento || trabajador.documento_identidad}</TableCell>
                        <TableCell className="font-medium">{formatApellidosNombres(trabajador)}</TableCell>
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
                        <TableCell>{trabajador.empresa_nombre || '-'}</TableCell>
                        <TableCell>{trabajador.area_nombre || '-'}</TableCell>
                        <TableCell>{trabajador.sede || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/trabajadores/${trabajador.id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="w-4 h-4 mr-1" />
                                Detalle
                              </Button>
                            </Link>
                            {canEdit && (
                              <>
                                {trabajador.estado === EstadoTrabajador.Activo ? (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setEditingTrabajador(trabajador);
                                        setIsModalOpen(true);
                                      }}
                                    >
                                      Editar
                                    </Button>
                                    <Button
                                      variant="danger"
                                      size="sm"
                                      onClick={() => handleDesactivar(trabajador.id)}
                                    >
                                      <UserX className="w-4 h-4 mr-1" />
                                      Desactivar
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleActivar(trabajador.id)}
                                  >
                                    <UserCheck className="w-4 h-4 mr-1" />
                                    Activar
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
          onClose={() => { setIsModalOpen(false); setEditingTrabajador(null); }}
          title={editingTrabajador ? 'Editar Trabajador' : 'Nuevo Trabajador'}
          size="xl"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nombres *</label>
                <Input {...register('nombres')} placeholder="Juan Carlos" />
                {errors.nombres && <p className="mt-1 text-sm text-danger">{errors.nombres.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Apellido Paterno *</label>
                <Input {...register('apellido_paterno')} placeholder="Pérez" />
                {errors.apellido_paterno && <p className="mt-1 text-sm text-danger">{errors.apellido_paterno.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Apellido Materno *</label>
                <Input {...register('apellido_materno')} placeholder="García" />
                {errors.apellido_materno && <p className="mt-1 text-sm text-danger">{errors.apellido_materno.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Documento *</label>
                <Select {...register('tipo_documento')}>
                  {Object.values(TipoDocumento).map((tipo) => (
                    <option key={tipo} value={tipo}>{LABEL_TIPO_DOC[tipo]}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nro de Documento *</label>
                <Input {...register('numero_documento')} placeholder="12345678" disabled={!!editingTrabajador} />
                {errors.numero_documento && <p className="mt-1 text-sm text-danger">{errors.numero_documento.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Empresa *</label>
                <Select {...register('empresa_id')}>
                  <option value="">Seleccione una empresa</option>
                  {empresas.map((empresa) => (
                    <option key={empresa.id} value={empresa.id}>{empresa.nombre}</option>
                  ))}
                </Select>
                {errors.empresa_id && <p className="mt-1 text-sm text-danger">{errors.empresa_id.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Área</label>
                <Select {...register('area_id')} disabled={!selectedEmpresaId}>
                  <option value="">Seleccione un área</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>{area.nombre}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Sede</label>
                <Input {...register('sede')} placeholder="Sede principal" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Cargo *</label>
                <Input {...register('cargo')} placeholder="Operario" />
                {errors.cargo && <p className="mt-1 text-sm text-danger">{errors.cargo.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Fecha de Ingreso *</label>
                <Input {...register('fecha_ingreso')} type="date" />
                {errors.fecha_ingreso && <p className="mt-1 text-sm text-danger">{errors.fecha_ingreso.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Estado</label>
                <Select {...register('estado')}>
                  {Object.values(EstadoTrabajador).map((estado) => (
                    <option key={estado} value={estado}>{estado}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Teléfono</label>
                <Input {...register('telefono')} type="tel" placeholder="987654321" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email Personal</label>
                <Input {...register('email')} type="email" placeholder="juan@email.com" />
                {errors.email && <p className="mt-1 text-sm text-danger">{errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Contacto Emergencia (Nombre)</label>
                <Input {...register('contacto_emergencia_nombre')} placeholder="María Pérez" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Contacto Emergencia (Teléfono)</label>
                <Input {...register('contacto_emergencia_telefono')} type="tel" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">URL de Foto</label>
                <Input {...register('foto_url')} type="url" placeholder="https://ejemplo.com/foto.jpg" />
                {errors.foto_url && <p className="mt-1 text-sm text-danger">{errors.foto_url.message}</p>}
              </div>

              {canCreate && (
                <div className="md:col-span-2 space-y-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-3">
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
                        Al activar, se creará un usuario con el número de documento como credencial.
                      </p>
                    </div>
                  </div>
                  {habilitarAcceso && !editingTrabajador?.usuario_id && (
                    <div className="pt-2 border-t border-primary/10">
                      <label className="block text-sm font-medium text-slate-700 mb-2">Rol asignado</label>
                      <Select {...register('rol_asignado')} className="w-full max-w-sm">
                        {ROLES_ASIGNABLES.map((rol) => (
                          <option key={rol} value={rol}>{LABEL_ROL[rol]}</option>
                        ))}
                      </Select>
                    </div>
                  )}
                  {habilitarAcceso && editingTrabajador?.usuario_id && (
                    <p className="text-xs text-slate-600 pt-2">
                      El trabajador ya tiene acceso. Para cambiar el rol, use Gestión de Usuarios.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => { setIsModalOpen(false); setEditingTrabajador(null); }}>
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
