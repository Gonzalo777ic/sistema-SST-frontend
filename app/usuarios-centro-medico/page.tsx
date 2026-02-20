'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  usuarioCentroMedicoService,
  CentroConParticipaciones,
  ParticipacionConUsuarioInfo,
} from '@/services/usuario-centro-medico.service';
import {
  configEmoService,
  CentroMedico,
} from '@/services/config-emo.service';
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
import {
  Plus,
  Building2,
  CheckCircle2,
  XCircle,
  Power,
  PowerOff,
  Pencil,
  Trash2,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UsuarioRol } from '@/types';

const agregarUsuarioSchema = z.object({
  dni: z
    .string()
    .min(8, 'El DNI debe tener 8 dígitos')
    .max(8, 'El DNI debe tener 8 dígitos')
    .regex(/^\d+$/, 'El DNI debe contener solo números'),
  centro_medico_id: z.string().uuid('Debe seleccionar un centro médico'),
});

type AgregarUsuarioFormData = z.infer<typeof agregarUsuarioSchema>;

export default function UsuariosCentroMedicoPage() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const [centrosConParticipaciones, setCentrosConParticipaciones] = useState<
    CentroConParticipaciones[]
  >([]);
  const [centros, setCentros] = useState<CentroMedico[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingCentro, setSubmittingCentro] = useState(false);

  // Gestión de centros médicos
  const [modalCentro, setModalCentro] = useState(false);
  const [editingCentro, setEditingCentro] = useState<CentroMedico | null>(null);
  const [formCentro, setFormCentro] = useState({
    nombre: '',
    direccion: '',
    archivo: null as File | null,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AgregarUsuarioFormData>({
    resolver: zodResolver(agregarUsuarioSchema),
    defaultValues: {
      dni: '',
      centro_medico_id: '',
    },
  });

  const canCreate = hasRole(UsuarioRol.SUPER_ADMIN);

  useEffect(() => {
    if (!hasRole(UsuarioRol.SUPER_ADMIN) && !hasRole(UsuarioRol.ADMIN_EMPRESA)) {
      router.push('/dashboard');
      return;
    }
    loadData();
  }, [hasRole, router]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const centros = await configEmoService.getCentros();
      setCentros(centros);
      const participacionesPorCentro = await Promise.all(
        centros.map(async (c) => ({
          centroId: c.id,
          centroNombre: c.centro_medico,
          participaciones: await usuarioCentroMedicoService
            .getParticipacionesPorCentro(c.id)
            .catch(() => []),
        })),
      );
      setCentrosConParticipaciones(participacionesPorCentro);
    } catch (error: any) {
      toast.error('Error al cargar datos', {
        description: error.response?.data?.message || 'No se pudieron cargar los datos.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: AgregarUsuarioFormData) => {
    if (!canCreate) return;
    setIsSubmitting(true);
    try {
      await usuarioCentroMedicoService.agregarUsuarioACentro(
        data.dni,
        data.centro_medico_id,
      );
      toast.success('Usuario agregado al centro médico', {
        description: `Credencial: ${data.dni}. La contraseña temporal es el número de documento.`,
      });
      setIsModalOpen(false);
      reset();
      loadData();
    } catch (error: any) {
      toast.error('Error al agregar usuario', {
        description: error.response?.data?.message || 'No se pudo agregar el usuario.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleEstado = async (p: ParticipacionConUsuarioInfo) => {
    const esActivo = p.estado === 'activo';
    setIsSubmitting(true);
    try {
      if (esActivo) {
        await usuarioCentroMedicoService.desactivarParticipacion(p.id);
        toast.success('Participación desactivada', {
          description: `El usuario ${p.usuarioDni} ya no tendrá acceso a este centro hasta que sea reactivado.`,
        });
      } else {
        await usuarioCentroMedicoService.activarParticipacion(p.id);
        toast.success('Participación activada', {
          description: `El usuario ${p.usuarioDni} puede acceder nuevamente al centro.`,
        });
      }
      loadData();
    } catch (error: any) {
      toast.error('Error al cambiar estado', {
        description: error.response?.data?.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openModalCentro = (centro?: CentroMedico) => {
    setEditingCentro(centro || null);
    setFormCentro({
      nombre: centro?.centro_medico ?? '',
      direccion: centro?.direccion ?? '',
      archivo: null,
    });
    setModalCentro(true);
  };

  const handleSubmitCentro = async () => {
    if (!formCentro.nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    try {
      setSubmittingCentro(true);
      let archivoBase64: string | undefined;
      if (formCentro.archivo) {
        const buf = await formCentro.archivo.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        archivoBase64 = `data:application/pdf;base64,${btoa(binary)}`;
      }
      const dto = {
        nombre: formCentro.nombre.trim(),
        direccion: formCentro.direccion.trim() || undefined,
        archivo_pdf_base64: archivoBase64,
      };
      if (editingCentro) {
        await configEmoService.updateCentro(editingCentro.id, dto);
        toast.success('Centro médico actualizado');
      } else {
        await configEmoService.createCentro(dto);
        toast.success('Centro médico creado', {
          description: 'Use "Agregar usuario a centro" para vincular personas autorizadas.',
        });
      }
      setModalCentro(false);
      loadData();
    } catch (e: any) {
      toast.error('Error', { description: e.response?.data?.message || e.message });
    } finally {
      setSubmittingCentro(false);
    }
  };

  const handleRemoveCentro = async (id: string) => {
    if (!confirm('¿Desactivar este centro médico?')) return;
    try {
      await configEmoService.removeCentro(id);
      toast.success('Centro médico desactivado');
      loadData();
    } catch (e: any) {
      toast.error('Error', { description: e.response?.data?.message || e.message });
    }
  };

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'activo':
        return 'Activo';
      case 'inactivo':
        return 'Inactivo';
      case 'revocado':
        return 'Revocado';
      default:
        return estado;
    }
  };

  return (
    <ProtectedRoute>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Usuarios Centro Médico</h1>
          <p className="text-slate-600 mt-1">
            Gestione centros médicos y las representaciones de usuarios (participaciones). Cada fila
            en &quot;Usuarios vinculados&quot; es una participación (UsuarioCentroMedico): la persona autorizada
            que opera en nombre del centro. El acceso depende de una representación activa, no de un
            vínculo directo usuario-centro. Cada participación puede activarse o desactivarse.
          </p>
        </div>

        {/* Gestión de Centros médicos */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Gestión de Centros médicos</h2>
            {canCreate && (
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => openModalCentro()}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Centro Médico
              </Button>
            )}
          </div>
          <div className="p-4 bg-amber-50 border-b border-amber-200">
            <p className="text-sm text-amber-800">
              <strong>Nota:</strong> La información del centro médico y el PDF adjunto de recomendaciones la
              recibirán por correo electrónico todos los trabajadores en la programación de un nuevo Examen Médico
              Ocupacional
            </p>
          </div>
          {isLoading ? (
            <div className="p-8">
              <Skeleton className="h-8 w-full mb-4" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : centros.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">No hay centros médicos registrados</p>
              {canCreate && (
                <Button className="mt-4" onClick={() => openModalCentro()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primer centro médico
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-slate-600">Nro</TableHead>
                  <TableHead className="text-slate-600">Fecha de registro</TableHead>
                  <TableHead className="text-slate-600">Centro médico</TableHead>
                  <TableHead className="text-slate-600">Dirección</TableHead>
                  <TableHead className="text-slate-600">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {centros.map((c, i) => (
                  <TableRow key={c.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{c.fecha_registro}</TableCell>
                    <TableCell>{c.centro_medico}</TableCell>
                    <TableCell className="max-w-xs truncate">{c.direccion || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {c.archivo_pdf_url && (
                          <a href={c.archivo_pdf_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <FileText className="h-4 w-4 text-blue-600" />
                            </Button>
                          </a>
                        )}
                        {canCreate && (
                          <>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openModalCentro(c)}>
                              <Pencil className="h-4 w-4 text-amber-600" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600" onClick={() => handleRemoveCentro(c.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Usuarios por centro */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Usuarios vinculados por centro</h2>
            {canCreate && (
              <Button
                onClick={() => {
                  setIsModalOpen(true);
                  reset();
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar usuario a centro
              </Button>
            )}
          </div>
          {isLoading ? (
            <div className="p-8">
              <Skeleton className="h-8 w-full mb-4" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : centrosConParticipaciones.length === 0 ? (
            <div className="p-12 text-center py-16">
              <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">No hay centros médicos. Cree uno arriba para vincular usuarios.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {centrosConParticipaciones.map(({ centroId, centroNombre, participaciones }) => (
                <div key={centroId} className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className="h-5 w-5 text-slate-600" />
                    <h3 className="text-lg font-semibold text-slate-900">{centroNombre}</h3>
                    <span className="text-sm text-slate-500">
                      ({participaciones.length} registro{participaciones.length !== 1 ? 's' : ''} usuario centro médico)
                    </span>
                  </div>
                  {participaciones.length === 0 ? (
                    <p className="text-sm text-slate-500">Sin registros de usuario centro médico</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>DNI</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {participaciones.map((p) => {
                          const esActivo = p.estado === 'activo';
                          return (
                            <TableRow key={p.id}>
                              <TableCell className="font-medium">{p.usuarioDni}</TableCell>
                              <TableCell>
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border ${
                                    esActivo
                                      ? 'bg-green-100 text-green-800 border-green-300'
                                      : p.estado === 'revocado'
                                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                                        : 'bg-slate-100 text-slate-700 border-slate-300'
                                  }`}
                                >
                                  {esActivo ? (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  ) : (
                                    <XCircle className="h-3.5 w-3.5" />
                                  )}
                                  {getEstadoLabel(p.estado)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleToggleEstado(p)}
                                  disabled={isSubmitting}
                                  title={esActivo ? 'Desactivar participación' : 'Activar participación'}
                                  className={
                                    esActivo
                                      ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                                      : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                                  }
                                >
                                  {esActivo ? (
                                    <>
                                      <PowerOff className="h-4 w-4 mr-1" />
                                      Desactivar
                                    </>
                                  ) : (
                                    <>
                                      <Power className="h-4 w-4 mr-1" />
                                      Activar
                                    </>
                                  )}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Agregar usuario a centro */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Agregar usuario a Centro Médico"
          size="md"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Centro Médico *
              </label>
              <Select {...register('centro_medico_id')}>
                <option value="">Seleccione un centro</option>
                {centrosConParticipaciones.map((c) => (
                  <option key={c.centroId} value={c.centroId}>
                    {c.centroNombre}
                  </option>
                ))}
              </Select>
              {errors.centro_medico_id && (
                <p className="mt-1 text-sm text-danger">{errors.centro_medico_id.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">DNI *</label>
              <Input {...register('dni')} placeholder="8 dígitos" maxLength={8} />
              {errors.dni && <p className="mt-1 text-sm text-danger">{errors.dni.message}</p>}
              <p className="text-xs text-slate-500 mt-1">
                Si el usuario no existe, se creará con rol Centro Médico. La contraseña temporal
                será el número de documento.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Agregar'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal Centro Médico */}
        <Modal
          isOpen={modalCentro}
          onClose={() => setModalCentro(false)}
          title={editingCentro ? 'Editar Centro Médico' : 'Nuevo Centro Médico'}
          size="lg"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
              <Input
                value={formCentro.nombre}
                onChange={(e) => setFormCentro((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Nombre del centro médico"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
              <Input
                value={formCentro.direccion}
                onChange={(e) => setFormCentro((f) => ({ ...f, direccion: e.target.value }))}
                placeholder="Dirección"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Archivo PDF (opcional - ficha RUC o documento)
              </label>
              <input
                type="file"
                accept=".pdf"
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                onChange={(e) => setFormCentro((f) => ({ ...f, archivo: e.target.files?.[0] ?? null }))}
              />
            </div>
            <p className="text-xs text-slate-500">
              Para vincular personas autorizadas al centro, use &quot;Agregar usuario a centro&quot; después de guardar.
            </p>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setModalCentro(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmitCentro} disabled={submittingCentro}>
                {editingCentro ? 'Actualizar' : 'Guardar'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}
