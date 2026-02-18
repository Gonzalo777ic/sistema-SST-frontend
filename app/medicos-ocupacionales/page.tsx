'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  trabajadoresService,
  Trabajador,
  TipoDocumento,
  CreateTrabajadorDto,
} from '@/services/trabajadores.service';
import { usuariosService, CreateUsuarioDto } from '@/services/usuarios.service';
import { empresasService, Empresa } from '@/services/empresas.service';
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
import { Plus, Stethoscope } from 'lucide-react';
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

const VALOR_TODAS_EMPRESAS = 'TODAS';

const medicoSchema = z.object({
  nombres: z.string().min(1, 'Los nombres son obligatorios'),
  apellido_paterno: z.string().min(1, 'El apellido paterno es obligatorio'),
  apellido_materno: z.string().min(1, 'El apellido materno es obligatorio'),
  tipo_documento: z.nativeEnum(TipoDocumento),
  numero_documento: z.string().min(1, 'El número de documento es obligatorio'),
  empresa_id: z.string().min(1, 'Debe seleccionar una empresa o Todas las empresas'),
  habilitar_acceso: z.boolean().optional(),
});

type MedicoFormData = z.infer<typeof medicoSchema>;

interface MedicoListItem {
  id: string;
  nombre_completo: string;
  documento_identidad: string;
  cmp: string | null;
  rne: string | null;
  empresa_nombre: string | null;
  acceso_todas_empresas?: boolean;
  usuario_id: string | null;
}

export default function MedicosOcupacionalesPage() {
  const router = useRouter();
  const { hasRole, usuario } = useAuth();
  const [medicos, setMedicos] = useState<MedicoListItem[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<MedicoFormData>({
    resolver: zodResolver(medicoSchema),
    defaultValues: {
      nombres: '',
      apellido_paterno: '',
      apellido_materno: '',
      tipo_documento: TipoDocumento.DNI,
      numero_documento: '',
      empresa_id: '',
      habilitar_acceso: true,
    },
  });

  const habilitarAcceso = watch('habilitar_acceso');

  const canCreate = hasRole(UsuarioRol.SUPER_ADMIN) || hasRole(UsuarioRol.ADMIN_EMPRESA);

  useEffect(() => {
    if (!hasRole(UsuarioRol.SUPER_ADMIN) && !hasRole(UsuarioRol.ADMIN_EMPRESA)) {
      router.push('/dashboard');
      return;
    }
    loadEmpresas();
    loadMedicos();
  }, [hasRole, router]);

  const loadEmpresas = async () => {
    try {
      const data = await empresasService.findAll();
      setEmpresas(data.filter((e) => e.activo));
    } catch {
      toast.error('Error al cargar empresas');
    }
  };

  const loadMedicos = async () => {
    try {
      setIsLoading(true);
      const todos = await trabajadoresService.findAll();
      const medicos = todos.filter((t) => t.cargo?.toLowerCase().includes('médico') || t.cargo?.toLowerCase().includes('medico'));
      setMedicos(
        medicos.map((t) => ({
          id: t.id,
          nombre_completo: t.nombre_completo,
          documento_identidad: t.documento_identidad,
          cmp: t.cmp ?? null,
          rne: t.rne ?? null,
          empresa_nombre: t.empresa_nombre ?? null,
          acceso_todas_empresas: t.acceso_todas_empresas ?? false,
          usuario_id: t.usuario_id ?? null,
        }))
      );
    } catch (error: any) {
      toast.error('Error al cargar médicos', {
        description: error.response?.data?.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: MedicoFormData) => {
    if (!canCreate) return;
    const accesoGlobal = data.empresa_id === VALOR_TODAS_EMPRESAS;
    if (accesoGlobal && empresas.length === 0) {
      toast.error('Debe existir al menos una empresa activa para asignar a todas las empresas');
      return;
    }
    setIsSubmitting(true);
    try {
      const empresaIdParaBd = accesoGlobal ? empresas[0].id : data.empresa_id;

      const createPayload: CreateTrabajadorDto = {
        nombres: data.nombres,
        apellido_paterno: data.apellido_paterno,
        apellido_materno: data.apellido_materno,
        tipo_documento: data.tipo_documento,
        numero_documento: data.numero_documento,
        cargo: 'Médico',
        empresa_id: empresaIdParaBd,
        acceso_todas_empresas: accesoGlobal,
        fecha_ingreso: new Date().toISOString().split('T')[0],
      };

      const trabajadorCreado = await trabajadoresService.create(createPayload);

      if (data.habilitar_acceso) {
        try {
          await usuariosService.create({
            dni: data.numero_documento,
            trabajadorId: trabajadorCreado.id,
            roles: [UsuarioRol.MEDICO],
            empresaId: empresaIdParaBd,
          });
          toast.success('Médico ocupacional registrado', {
            description: `Credencial: ${data.numero_documento}. Debe completar firma y sello en su perfil.`,
          });
        } catch (error: any) {
          toast.warning('Médico creado pero no se pudo crear el acceso', {
            description: error.response?.data?.message || 'Solo el Super Admin puede crear usuarios.',
          });
        }
      } else {
        toast.success('Médico ocupacional registrado');
      }

      setIsModalOpen(false);
      reset();
      loadMedicos();
    } catch (error: any) {
      toast.error('Error al registrar médico', {
        description: error.response?.data?.message,
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
            <h1 className="text-2xl font-bold text-slate-900">Médicos Ocupacionales</h1>
            <p className="text-slate-600 mt-1">
              Gestión de profesionales de salud ocupacional para certificar exámenes médicos.
            </p>
          </div>
          {canCreate && (
            <Button onClick={() => { setIsModalOpen(true); reset(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Registrar médico
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
          ) : medicos.length === 0 ? (
            <div className="p-12 text-center py-16">
              <Stethoscope className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">No hay médicos ocupacionales registrados</p>
              {canCreate && (
                <Button className="mt-4" onClick={() => setIsModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar el primero
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>DNI</TableHead>
                  <TableHead>CMP</TableHead>
                  <TableHead>RNE</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Acceso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {medicos.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.nombre_completo}</TableCell>
                    <TableCell>{m.documento_identidad}</TableCell>
                    <TableCell>{m.cmp || '-'}</TableCell>
                    <TableCell>{m.rne || '-'}</TableCell>
                    <TableCell>{m.acceso_todas_empresas ? 'Todas las empresas' : (m.empresa_nombre || '-')}</TableCell>
                    <TableCell>{m.usuario_id ? 'Sí' : 'No'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Registrar Médico Ocupacional"
          size="lg"
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
                <Input {...register('numero_documento')} placeholder="12345678" />
                {errors.numero_documento && <p className="mt-1 text-sm text-danger">{errors.numero_documento.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Empresa *</label>
                <Select {...register('empresa_id')}>
                  <option value="">Seleccione una empresa o Todas</option>
                  <option value={VALOR_TODAS_EMPRESAS}>Todas las empresas</option>
                  {empresas.map((empresa) => (
                    <option key={empresa.id} value={empresa.id}>{empresa.nombre}</option>
                  ))}
                </Select>
                {errors.empresa_id && <p className="mt-1 text-sm text-danger">{errors.empresa_id.message}</p>}
              </div>
            </div>

            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="habilitar_acceso"
                  {...register('habilitar_acceso')}
                  className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                />
                <div>
                  <label htmlFor="habilitar_acceso" className="text-sm font-medium text-slate-900 cursor-pointer">
                    Habilitar acceso al sistema
                  </label>
                  <p className="text-xs text-slate-600 mt-1">
                    Creará un usuario con el DNI como credencial. El médico deberá completar firma y sello en su perfil.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Registrar'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}
