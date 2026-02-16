'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  empresasService,
  Empresa,
  FirmaGerente,
  CandidatoGerente,
  CreateFirmaGerenteDto,
} from '@/services/empresas.service';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { SignaturePad } from '@/components/ui/signature-pad';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Edit, Trash2, Building2, Upload, UserPlus, UserMinus, UserCheck, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UsuarioRol } from '@/types';

const empresaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  ruc: z.string().length(11, 'El RUC debe tener 11 dígitos').regex(/^\d{11}$/, 'El RUC debe contener solo números'),
  direccion: z.string().min(1, 'La dirección es obligatoria'),
  actividad_economica: z.string().min(1, 'La actividad económica es obligatoria'),
  numero_trabajadores: z.coerce.number().min(0, 'Debe ser 0 o mayor').optional(),
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

  const [gerentesPorEmpresa, setGerentesPorEmpresa] = useState<Record<string, FirmaGerente[]>>({});
  const [isModalGerenteOpen, setIsModalGerenteOpen] = useState(false);
  const [empresaParaGerente, setEmpresaParaGerente] = useState<Empresa | null>(null);
  const [busquedaGerente, setBusquedaGerente] = useState('');
  const [candidatosGerente, setCandidatosGerente] = useState<CandidatoGerente[]>([]);
  const [isBuscandoGerente, setIsBuscandoGerente] = useState(false);
  const [candidatoSeleccionado, setCandidatoSeleccionado] = useState<CandidatoGerente | null>(null);
  const [rolGerente, setRolGerente] = useState('RRHH');
  const [cargoGerente, setCargoGerente] = useState('');
  const [firmaGerenteDataUrl, setFirmaGerenteDataUrl] = useState<string>('');
  const [firmaGerenteFile, setFirmaGerenteFile] = useState<File | null>(null);
  const [isGuardandoGerente, setIsGuardandoGerente] = useState(false);

  const [editingGerente, setEditingGerente] = useState<FirmaGerente | null>(null);
  const [empresaParaEditarGerente, setEmpresaParaEditarGerente] = useState<Empresa | null>(null);
  const [editRolGerente, setEditRolGerente] = useState('RRHH');
  const [editCargoGerente, setEditCargoGerente] = useState('');
  const [editFirmaGerenteDataUrl, setEditFirmaGerenteDataUrl] = useState<string>('');
  const [editFirmaGerenteFile, setEditFirmaGerenteFile] = useState<File | null>(null);
  const [isGuardandoEdicionGerente, setIsGuardandoEdicionGerente] = useState(false);

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
      direccion: '',
      actividad_economica: '',
      numero_trabajadores: 0,
      logoUrl: '',
      activo: true,
    },
  });

  const canCreate = hasRole(UsuarioRol.SUPER_ADMIN);
  const canEdit = hasRole(UsuarioRol.SUPER_ADMIN) || hasRole(UsuarioRol.ADMIN_EMPRESA);

  const ROLES_GERENTE = ['RRHH', 'SST', 'MO', 'CERTIFICACION'];

  useEffect(() => {
    loadEmpresas();
  }, []);

  useEffect(() => {
    if (empresas.length > 0) {
      empresas.forEach((e) => {
        empresasService.listarGerentes(e.id).then((list) => {
          setGerentesPorEmpresa((prev) => ({ ...prev, [e.id]: list }));
        }).catch(() => {});
      });
    }
  }, [empresas]);

  useEffect(() => {
    const q = busquedaGerente.trim();
    if (q.length < 2 || !empresaParaGerente) {
      setCandidatosGerente([]);
      return;
    }
    const t = setTimeout(async () => {
      setIsBuscandoGerente(true);
      try {
        const res = await empresasService.buscarCandidatosGerente(empresaParaGerente.id, q);
        setCandidatosGerente(res);
      } catch {
        setCandidatosGerente([]);
      } finally {
        setIsBuscandoGerente(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [busquedaGerente, empresaParaGerente]);

  useEffect(() => {
    if (editingEmpresa) {
      reset({
        nombre: editingEmpresa.nombre,
        ruc: editingEmpresa.ruc,
        direccion: editingEmpresa.direccion || '',
        actividad_economica: editingEmpresa.actividad_economica || '',
        numero_trabajadores: editingEmpresa.numero_trabajadores ?? 0,
        logoUrl: editingEmpresa.logoUrl || '',
        activo: editingEmpresa.activo,
      });
    } else {
      reset({
        nombre: '',
        ruc: '',
        direccion: '',
        actividad_economica: '',
        numero_trabajadores: 0,
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
          direccion: data.direccion || undefined,
          actividad_economica: data.actividad_economica || undefined,
          numero_trabajadores: data.numero_trabajadores,
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
          direccion: data.direccion,
          actividad_economica: data.actividad_economica,
          numero_trabajadores: data.numero_trabajadores,
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

  const openModalGerente = (empresa: Empresa) => {
    setEmpresaParaGerente(empresa);
    setCandidatoSeleccionado(null);
    setBusquedaGerente('');
    setCandidatosGerente([]);
    setRolGerente('RRHH');
    setCargoGerente('');
    setFirmaGerenteDataUrl('');
    setFirmaGerenteFile(null);
    setIsModalGerenteOpen(true);
  };

  const closeModalGerente = () => {
    setIsModalGerenteOpen(false);
    setEmpresaParaGerente(null);
    setCandidatoSeleccionado(null);
  };

  const openModalEditarGerente = (gerente: FirmaGerente, empresa: Empresa) => {
    setEditingGerente(gerente);
    setEmpresaParaEditarGerente(empresa);
    setEditRolGerente(gerente.rol);
    setEditCargoGerente(gerente.cargo);
    setEditFirmaGerenteDataUrl('');
    setEditFirmaGerenteFile(null);
  };

  const closeModalEditarGerente = () => {
    setEditingGerente(null);
    setEmpresaParaEditarGerente(null);
  };

  const handleGuardarEditarGerente = async () => {
    if (!editingGerente || !empresaParaEditarGerente) return;
    if (!editCargoGerente.trim()) {
      toast.error('El cargo es obligatorio');
      return;
    }

    setIsGuardandoEdicionGerente(true);
    try {
      let firmaBase64: string | null | undefined = undefined;
      if (editFirmaGerenteDataUrl?.startsWith('data:image/')) {
        firmaBase64 = editFirmaGerenteDataUrl;
      } else if (editFirmaGerenteFile) {
        if (editFirmaGerenteFile.size > 10 * 1024 * 1024) {
          toast.error('La imagen de firma no debe superar 10 MB');
          setIsGuardandoEdicionGerente(false);
          return;
        }
        firmaBase64 = await new Promise<string>((res, rej) => {
          const reader = new FileReader();
          reader.onload = () => res(reader.result as string);
          reader.onerror = rej;
          reader.readAsDataURL(editFirmaGerenteFile!);
        });
      }
      await empresasService.actualizarGerente(editingGerente.id, {
        rol: editRolGerente,
        cargo: editCargoGerente.trim(),
        firma_base64: firmaBase64,
      });
      toast.success('Gerente actualizado');
      const list = await empresasService.listarGerentes(empresaParaEditarGerente.id);
      setGerentesPorEmpresa((prev) => ({ ...prev, [empresaParaEditarGerente.id]: list }));
      closeModalEditarGerente();
    } catch (error: any) {
      toast.error('Error al actualizar', {
        description: error.response?.data?.message || 'No se pudo guardar',
      });
    } finally {
      setIsGuardandoEdicionGerente(false);
    }
  };

  const agregarCandidatoComoGerente = (c: CandidatoGerente) => {
    setCandidatoSeleccionado(c);
    setCandidatosGerente([]);
    setBusquedaGerente('');
  };

  const handleGuardarGerente = async () => {
    if (!empresaParaGerente || !candidatoSeleccionado) {
      toast.error('Seleccione un usuario o trabajador');
      return;
    }
    if (!cargoGerente.trim()) {
      toast.error('El cargo es obligatorio');
      return;
    }
    const tieneFirma = !!firmaGerenteDataUrl || !!firmaGerenteFile || !!candidatoSeleccionado.firma_url;
    if (!tieneFirma) {
      toast.error('Debe adjuntar una imagen de firma o dibujarla');
      return;
    }
    if (firmaGerenteFile && firmaGerenteFile.size > 10 * 1024 * 1024) {
      toast.error('La imagen de firma no debe superar 10 MB');
      return;
    }

    setIsGuardandoGerente(true);
    try {
      let firmaBase64: string | null = null;
      if (firmaGerenteDataUrl?.startsWith('data:image/')) {
        firmaBase64 = firmaGerenteDataUrl;
      } else if (firmaGerenteFile) {
        const reader = new FileReader();
        firmaBase64 = await new Promise<string>((res, rej) => {
          reader.onload = () => res(reader.result as string);
          reader.onerror = rej;
          reader.readAsDataURL(firmaGerenteFile!);
        });
      }
      const dto: CreateFirmaGerenteDto = {
        empresa_id: empresaParaGerente.id,
        nombre_completo: candidatoSeleccionado.nombre_completo,
        numero_documento: candidatoSeleccionado.numero_documento,
        tipo_documento: candidatoSeleccionado.tipo_documento || 'DNI',
        rol: rolGerente,
        cargo: cargoGerente.trim(),
        firma_base64: firmaBase64,
      };
      if (candidatoSeleccionado.tipo === 'usuario') {
        dto.usuario_id = candidatoSeleccionado.id;
      } else {
        dto.trabajador_id = candidatoSeleccionado.id;
      }
      if (!firmaBase64 && candidatoSeleccionado.firma_url) {
        dto.firma_base64 = undefined;
      }
      await empresasService.crearGerente(dto);
      toast.success('Gerente registrado correctamente');
      const list = await empresasService.listarGerentes(empresaParaGerente.id);
      setGerentesPorEmpresa((prev) => ({ ...prev, [empresaParaGerente.id]: list }));
      closeModalGerente();
    } catch (error: any) {
      toast.error('Error al registrar gerente', {
        description: error.response?.data?.message || 'No se pudo guardar',
      });
    } finally {
      setIsGuardandoGerente(false);
    }
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
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Configuración de Razón Social</h2>
          </div>
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
                      <TableCell className="w-24">
                        <div className="flex items-center justify-center min-h-[4rem]">
                          {empresa.logoUrl ? (
                            <>
                              <img
                                src={empresa.logoUrl}
                                alt={`Logo ${empresa.nombre}`}
                                className="h-16 w-16 object-contain rounded border bg-slate-50"
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

        {/* Configuración de firmas de gerente */}
        {empresas.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Configuración de firmas de gerente</h2>
              <p className="text-sm text-slate-600 mt-1">
                Asigne usuarios (ADMIN/SUPER_ADMIN) o trabajadores como responsables de firma por razón social.
              </p>
            </div>
            <div className="p-6 space-y-8">
              {empresas.map((empresa) => (
                <div key={empresa.id}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-slate-900">{empresa.nombre}</h3>
                    <Button variant="primary" size="sm" onClick={() => openModalGerente(empresa)}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Nuevo Gerente
                    </Button>
                  </div>
                  <div className="overflow-x-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Nro</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Rol</TableHead>
                          <TableHead>Cargo</TableHead>
                          <TableHead>Firma</TableHead>
                          <TableHead className="w-24 text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(gerentesPorEmpresa[empresa.id] ?? []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                              No hay gerentes configurados. Haga clic en &quot;Nuevo Gerente&quot; para agregar.
                            </TableCell>
                          </TableRow>
                        ) : (
                          (gerentesPorEmpresa[empresa.id] ?? []).map((g, i) => (
                            <TableRow
                              key={g.id}
                              className={!g.activo ? 'bg-slate-50 opacity-75' : ''}
                            >
                              <TableCell>{i + 1}</TableCell>
                              <TableCell className="font-medium">
                                {g.nombre_completo}
                                {!g.activo && (
                                  <span className="ml-2 text-xs text-slate-500 font-normal">
                                    (Anteriormente gerente)
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>{g.rol}</TableCell>
                              <TableCell>{g.cargo}</TableCell>
                              <TableCell>
                                {g.firma_url ? (
                                  <img
                                    src={g.firma_url}
                                    alt="Firma"
                                    className="h-12 object-contain border rounded bg-slate-50"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <span className="text-slate-400 text-sm">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                {g.activo && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-slate-600"
                                    title="Editar rol, cargo y firma"
                                    onClick={() => openModalEditarGerente(g, empresa)}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                )}
                                {g.activo ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-amber-600"
                                    title="Desactivar"
                                    onClick={async () => {
                                      if (!confirm('¿Desactivar este gerente? El registro se mantendrá como "Anteriormente gerente".')) return;
                                      try {
                                        await empresasService.desactivarGerente(g.id);
                                        const list = await empresasService.listarGerentes(empresa.id);
                                        setGerentesPorEmpresa((prev) => ({ ...prev, [empresa.id]: list }));
                                        toast.success('Gerente desactivado');
                                      } catch (e: any) {
                                        toast.error(e.response?.data?.message || 'Error al desactivar');
                                      }
                                    }}
                                  >
                                    <UserMinus className="w-4 h-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-green-600"
                                    title="Reactivar"
                                    onClick={async () => {
                                      try {
                                        await empresasService.reactivarGerente(g.id);
                                        const list = await empresasService.listarGerentes(empresa.id);
                                        setGerentesPorEmpresa((prev) => ({ ...prev, [empresa.id]: list }));
                                        toast.success('Gerente reactivado');
                                      } catch (e: any) {
                                        toast.error(e.response?.data?.message || 'Error al reactivar');
                                      }
                                    }}
                                  >
                                    <UserCheck className="w-4 h-4" />
                                  </Button>
                                )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
                Dirección (legal) *
              </label>
              <Input
                {...register('direccion')}
                placeholder="Ej: Av. Principal 123"
              />
              {errors.direccion && (
                <p className="mt-1 text-sm text-danger">{errors.direccion.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Actividad económica *
              </label>
              <Input
                {...register('actividad_economica')}
                placeholder="Ej: Elaboración de productos"
              />
              {errors.actividad_economica && (
                <p className="mt-1 text-sm text-danger">{errors.actividad_economica.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                N° de trabajadores
              </label>
              <Input
                type="number"
                min={0}
                {...register('numero_trabajadores')}
                placeholder="0"
              />
              <p className="mt-1 text-xs text-slate-500">
                Número fijo de trabajadores (para registros y kardex)
              </p>
              {errors.numero_trabajadores && (
                <p className="mt-1 text-sm text-danger">{errors.numero_trabajadores.message}</p>
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

        {/* Modal Registrar nuevo gerente */}
        <Modal
          isOpen={isModalGerenteOpen}
          onClose={closeModalGerente}
          title="Registrar nuevo gerente"
          size="lg"
        >
          <div className="space-y-4">
            {!candidatoSeleccionado ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Buscar por nombre o DNI <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-slate-500 mb-2">
                    Busque usuarios (ADMIN, SUPER_ADMIN) o trabajadores de la empresa. Los ADMIN deben tener nombres y apellidos registrados.
                  </p>
                  <div className="relative">
                    <Input
                      placeholder="Nombre o DNI (mín. 2 caracteres)"
                      value={busquedaGerente}
                      onChange={(e) => setBusquedaGerente(e.target.value)}
                    />
                    {isBuscandoGerente && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">Buscando...</span>
                    )}
                  </div>
                  {candidatosGerente.length > 0 && (
                    <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto">
                      {candidatosGerente.map((c) => (
                        <button
                          key={`${c.tipo}-${c.id}`}
                          type="button"
                          className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b last:border-0"
                          onClick={() => agregarCandidatoComoGerente(c)}
                        >
                          <p className="font-medium">{c.nombre_completo}</p>
                          <p className="text-sm text-slate-600">
                            {c.numero_documento} · {c.tipo_documento} · {c.tipo === 'usuario' ? 'Usuario' : 'Trabajador'}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="font-medium text-slate-900">{candidatoSeleccionado.nombre_completo}</p>
                  <p className="text-sm text-slate-600">
                    N° documento: {candidatoSeleccionado.numero_documento} · Tipo: {candidatoSeleccionado.tipo_documento}
                  </p>
                  <Button variant="ghost" size="sm" className="mt-2" onClick={() => setCandidatoSeleccionado(null)}>
                    Cambiar selección
                  </Button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Rol del gerente <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={rolGerente}
                    onChange={(e) => setRolGerente(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  >
                    {ROLES_GERENTE.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Cargo del gerente <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="Ej: Coordinador del SGC"
                    value={cargoGerente}
                    onChange={(e) => setCargoGerente(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Firma <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-slate-500 mb-2">
                    Cargue una imagen (JPG, PNG, máx. 10 MB) o dibuje abajo. Si el usuario tiene firma registrada, puede usarla o reemplazarla.
                  </p>
                  {candidatoSeleccionado.firma_url && !firmaGerenteDataUrl && !firmaGerenteFile && (
                    <div className="mb-3 p-2 border rounded-lg bg-slate-50">
                      <p className="text-xs font-medium text-slate-600 mb-2">Firma actual del usuario:</p>
                      <img
                        src={candidatoSeleccionado.firma_url}
                        alt="Firma"
                        className="max-h-20 object-contain"
                        referrerPolicy="no-referrer"
                      />
                      <p className="text-xs text-slate-500 mt-2">Puede usar esta firma o adjuntar/dibujar una nueva abajo.</p>
                    </div>
                  )}
                  <div className="mb-3">
                    <label
                      htmlFor="firma-gerente-upload"
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-slate-300 bg-slate-50 hover:bg-slate-100 text-sm font-medium text-slate-700 cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      Subir imagen (JPG, PNG, máx. 10 MB)
                    </label>
                    <input
                      id="firma-gerente-upload"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f && f.size <= 10 * 1024 * 1024) {
                          setFirmaGerenteFile(f);
                          setFirmaGerenteDataUrl('');
                        } else if (f) {
                          toast.error('El archivo no debe superar 10 MB');
                        }
                        e.target.value = '';
                      }}
                    />
                    {firmaGerenteFile && (
                      <p className="text-sm text-slate-600 mt-1">{firmaGerenteFile.name}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-2">O dibuje su firma:</p>
                    <SignaturePad
                      width={400}
                      height={120}
                      value={firmaGerenteDataUrl}
                      onChange={(url) => {
                        setFirmaGerenteDataUrl(url);
                        setFirmaGerenteFile(null);
                      }}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <Button variant="outline" onClick={closeModalGerente}>
                    Cancelar
                  </Button>
                  <Button onClick={handleGuardarGerente} disabled={isGuardandoGerente}>
                    {isGuardandoGerente ? 'Guardando...' : 'Confirmar'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>

        {/* Modal Editar gerente */}
        <Modal
          isOpen={!!editingGerente}
          onClose={closeModalEditarGerente}
          title="Editar gerente"
          size="lg"
        >
          {editingGerente && empresaParaEditarGerente && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium text-slate-900">{editingGerente.nombre_completo}</p>
                <p className="text-sm text-slate-600">
                  N° documento: {editingGerente.numero_documento} · Tipo: {editingGerente.tipo_documento}
                </p>
                <p className="text-xs text-slate-500 mt-1">El nombre no se puede modificar.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Rol del gerente *</label>
                <select
                  value={editRolGerente}
                  onChange={(e) => setEditRolGerente(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                >
                  {ROLES_GERENTE.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Cargo del gerente *</label>
                <Input
                  placeholder="Ej: Coordinador del SGC"
                  value={editCargoGerente}
                  onChange={(e) => setEditCargoGerente(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Firma</label>
                <p className="text-xs text-slate-500 mb-2">
                  Cargue una imagen (JPG, PNG, máx. 10 MB) o dibuje abajo para actualizar. Si no cambia nada, se mantiene la firma actual.
                </p>
                {editingGerente.firma_url && !editFirmaGerenteDataUrl && !editFirmaGerenteFile && (
                  <div className="mb-3 p-2 border rounded-lg bg-slate-50">
                    <p className="text-xs font-medium text-slate-600 mb-2">Firma actual:</p>
                    <img
                      src={editingGerente.firma_url}
                      alt="Firma"
                      className="max-h-20 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                <div className="mb-3">
                  <label
                    htmlFor="firma-gerente-edit-upload"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-slate-300 bg-slate-50 hover:bg-slate-100 text-sm font-medium text-slate-700 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    Subir nueva imagen (JPG, PNG, máx. 10 MB)
                  </label>
                  <input
                    id="firma-gerente-edit-upload"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f && f.size <= 10 * 1024 * 1024) {
                        setEditFirmaGerenteFile(f);
                        setEditFirmaGerenteDataUrl('');
                      } else if (f) {
                        toast.error('El archivo no debe superar 10 MB');
                      }
                      e.target.value = '';
                    }}
                  />
                  {editFirmaGerenteFile && (
                    <p className="text-sm text-slate-600 mt-1">{editFirmaGerenteFile.name}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-2">O dibuje una nueva firma:</p>
                  <SignaturePad
                    width={400}
                    height={120}
                    value={editFirmaGerenteDataUrl}
                    onChange={(url) => {
                      setEditFirmaGerenteDataUrl(url);
                      setEditFirmaGerenteFile(null);
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button variant="outline" onClick={closeModalEditarGerente}>
                  Cancelar
                </Button>
                <Button onClick={handleGuardarEditarGerente} disabled={isGuardandoEdicionGerente}>
                  {isGuardandoEdicionGerente ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>

  );
}
