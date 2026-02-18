'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { configEmoService, CentroMedico } from '@/services/config-emo.service';
import { usuariosService, CreateUsuarioDto } from '@/services/usuarios.service';
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
import { Plus, Building2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UsuarioRol, Usuario } from '@/types';

const createUsuarioSchema = z.object({
  dni: z.string().min(8, 'El DNI debe tener 8 dígitos').max(8, 'El DNI debe tener 8 dígitos').regex(/^\d+$/, 'El DNI debe contener solo números'),
  centro_medico_id: z.string().uuid('Debe seleccionar un centro médico'),
});

type CreateUsuarioFormData = z.infer<typeof createUsuarioSchema>;

export default function UsuariosCentroMedicoPage() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const [centros, setCentros] = useState<CentroMedico[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUsuarioFormData>({
    resolver: zodResolver(createUsuarioSchema),
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
      const [centrosData, usuariosData] = await Promise.all([
        configEmoService.getCentros(),
        usuariosService.findAll(),
      ]);
      setCentros(centrosData);
      setUsuarios(usuariosData);
    } catch (error: any) {
      toast.error('Error al cargar datos', {
        description: error.response?.data?.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const usuariosPorCentro = centros.map((c) => ({
    centro: c,
    usuarios: usuarios.filter((u) => u.centroMedicoId === c.id),
  }));

  const onSubmit = async (data: CreateUsuarioFormData) => {
    if (!canCreate) return;
    setIsSubmitting(true);
    try {
      const payload: CreateUsuarioDto = {
        dni: data.dni,
        roles: [UsuarioRol.CENTRO_MEDICO],
        centroMedicoId: data.centro_medico_id,
      };
      await usuariosService.create(payload);
      toast.success('Usuario de centro médico creado', {
        description: `Credencial: ${data.dni}. La contraseña temporal es el número de documento.`,
      });
      setIsModalOpen(false);
      reset();
      loadData();
    } catch (error: any) {
      toast.error('Error al crear usuario', {
        description: error.response?.data?.message || 'No se pudo crear el usuario.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Usuarios Centro Médico</h1>
            <p className="text-slate-600 mt-1">
              Vincule usuarios al rol Centro Médico para que puedan subir resultados de exámenes por citas programadas.
            </p>
          </div>
          {canCreate && (
            <Button onClick={() => { setIsModalOpen(true); reset(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar usuario a centro
            </Button>
          )}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8">
              <Skeleton className="h-8 w-full mb-4" />
              <Skeleton className="h-8 w-full mb-4" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : centros.length === 0 ? (
            <div className="p-12 text-center py-16">
              <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">No hay centros médicos registrados</p>
              <div className="mt-4">
                <Link href="/salud/examenes/configuracion">
                  <Button variant="outline">
                    Ir a configurar centros médicos
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {usuariosPorCentro.map(({ centro, usuarios: u }) => (
                <div key={centro.id} className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className="h-5 w-5 text-slate-600" />
                    <h2 className="text-lg font-semibold text-slate-900">{centro.centro_medico}</h2>
                    <span className="text-sm text-slate-500">({u.length} usuario{u.length !== 1 ? 's' : ''})</span>
                  </div>
                  {u.length === 0 ? (
                    <p className="text-sm text-slate-500">Sin usuarios vinculados</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>DNI</TableHead>
                          <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                        {u.map((us) => (
                          <TableRow key={us.id}>
                            <TableCell className="font-medium">{us.dni}</TableCell>
                            <TableCell>{us.activo ? 'Activo' : 'Inactivo'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Agregar usuario a Centro Médico"
          size="md"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Centro Médico *</label>
              <Select {...register('centro_medico_id')}>
                <option value="">Seleccione un centro</option>
                {centros.map((c) => (
                  <option key={c.id} value={c.id}>{c.centro_medico}</option>
                ))}
              </Select>
              {errors.centro_medico_id && <p className="mt-1 text-sm text-danger">{errors.centro_medico_id.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">DNI *</label>
              <Input {...register('dni')} placeholder="8 dígitos" maxLength={8} />
              {errors.dni && <p className="mt-1 text-sm text-danger">{errors.dni.message}</p>}
              <p className="text-xs text-slate-500 mt-1">La contraseña temporal será el número de documento.</p>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Crear usuario'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}
