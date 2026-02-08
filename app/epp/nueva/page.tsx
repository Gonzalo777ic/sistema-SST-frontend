'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  eppService,
  CreateSolicitudEppDto,
  TipoEPP,
  MotivoEPP,
} from '@/services/epp.service';
import { trabajadoresService, Trabajador } from '@/services/trabajadores.service';
import { areasService } from '@/services/areas.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UsuarioRol } from '@/types';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const solicitudSchema = z.object({
  tipo_epp: z.nativeEnum(TipoEPP, { message: 'Debe seleccionar un tipo de EPP' }),
  cantidad: z.number().min(1, 'La cantidad debe ser al menos 1').default(1),
  talla: z.string().min(1, 'La talla es obligatoria'),
  motivo: z.nativeEnum(MotivoEPP, { message: 'Debe seleccionar un motivo' }),
  descripcion_motivo: z.string().optional(),
  trabajador_id: z.string().uuid('Debe seleccionar un trabajador'),
  area_id: z.string().uuid().optional(),
  empresa_id: z.string().uuid('Debe seleccionar una empresa'),
}).refine((data) => {
  if (data.motivo === MotivoEPP.Otro) {
    return !!data.descripcion_motivo && data.descripcion_motivo.trim().length > 0;
  }
  return true;
}, {
  message: 'La descripción del motivo es obligatoria cuando el motivo es "Otro"',
  path: ['descripcion_motivo'],
});

type SolicitudFormData = z.infer<typeof solicitudSchema>;

export default function NuevaSolicitudEPPPage() {
  const router = useRouter();
  const { usuario, hasRole } = useAuth();
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [areas, setAreas] = useState<{ id: string; nombre: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = hasRole(UsuarioRol.SUPER_ADMIN) || hasRole(UsuarioRol.ADMIN_EMPRESA);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SolicitudFormData>({
    resolver: zodResolver(solicitudSchema),
    defaultValues: {
      tipo_epp: TipoEPP.Casco,
      cantidad: 1,
      talla: '',
      motivo: MotivoEPP.NuevoIngreso,
      descripcion_motivo: '',
      trabajador_id: usuario?.trabajadorId || '',
      area_id: '',
      empresa_id: usuario?.empresaId || '',
    },
  });

  const selectedMotivo = watch('motivo');
  const selectedEmpresaId = watch('empresa_id');

  useEffect(() => {
    if (usuario?.empresaId) {
      loadTrabajadores();
      loadAreas();
    }
  }, [usuario?.empresaId]);

  useEffect(() => {
    if (selectedEmpresaId) {
      loadTrabajadores();
      loadAreas();
    }
  }, [selectedEmpresaId]);

  useEffect(() => {
    // Si el usuario tiene trabajadorId vinculado, autocompletar
    if (usuario?.trabajadorId && !isAdmin) {
      setValue('trabajador_id', usuario.trabajadorId);
    }
  }, [usuario, isAdmin, setValue]);

  const loadTrabajadores = async () => {
    try {
      const empresaId = selectedEmpresaId || usuario?.empresaId;
      if (!empresaId) return;

      const data = await trabajadoresService.findAll(empresaId);
      setTrabajadores(data.filter((t) => t.estado === 'Activo'));
    } catch (error: any) {
      toast.error('Error al cargar trabajadores');
    }
  };

  const loadAreas = async () => {
    try {
      const empresaId = selectedEmpresaId || usuario?.empresaId;
      if (!empresaId) return;

      const data = await areasService.findAll(empresaId);
      setAreas(data.filter((a) => a.activo).map((a) => ({ id: a.id, nombre: a.nombre })));
    } catch (error: any) {
      setAreas([]);
    }
  };

  const onSubmit = async (data: SolicitudFormData) => {
    setIsSubmitting(true);
    try {
      const payload: CreateSolicitudEppDto = {
        tipo_epp: data.tipo_epp,
        cantidad: data.cantidad,
        talla: data.talla,
        motivo: data.motivo,
        descripcion_motivo: data.descripcion_motivo || undefined,
        trabajador_id: data.trabajador_id,
        area_id: data.area_id || undefined,
        empresa_id: data.empresa_id,
      };

      await eppService.create(payload);
      toast.success('Solicitud creada', {
        description: 'La solicitud de EPP se ha creado correctamente',
      });
      router.push('/epp');
    } catch (error: any) {
      toast.error('Error al crear solicitud', {
        description: error.response?.data?.message || 'No se pudo crear la solicitud',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={Object.values(UsuarioRol)}>
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Link href="/epp">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Nueva Solicitud de EPP</h1>
              <p className="text-slate-600 mt-2">Complete el formulario para solicitar un Equipo de Protección Personal</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tipo de EPP *
                  </label>
                  <Select {...register('tipo_epp')}>
                    {Object.values(TipoEPP).map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </Select>
                  {errors.tipo_epp && (
                    <p className="mt-1 text-sm text-danger">{errors.tipo_epp.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Cantidad *
                  </label>
                  <Input
                    type="number"
                    min="1"
                    {...register('cantidad', { valueAsNumber: true })}
                  />
                  {errors.cantidad && (
                    <p className="mt-1 text-sm text-danger">{errors.cantidad.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Talla *
                  </label>
                  <Input
                    {...register('talla')}
                    placeholder="Ej: M, L, 42, 43..."
                  />
                  {errors.talla && (
                    <p className="mt-1 text-sm text-danger">{errors.talla.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Motivo *
                  </label>
                  <Select {...register('motivo')}>
                    {Object.values(MotivoEPP).map((motivo) => (
                      <option key={motivo} value={motivo}>
                        {motivo}
                      </option>
                    ))}
                  </Select>
                  {errors.motivo && (
                    <p className="mt-1 text-sm text-danger">{errors.motivo.message}</p>
                  )}
                </div>

                {selectedMotivo === MotivoEPP.Otro && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Descripción del Motivo *
                    </label>
                    <textarea
                      {...register('descripcion_motivo')}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Describa el motivo de la solicitud..."
                    />
                    {errors.descripcion_motivo && (
                      <p className="mt-1 text-sm text-danger">{errors.descripcion_motivo.message}</p>
                    )}
                  </div>
                )}

                {isAdmin && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Trabajador *
                      </label>
                      <Select {...register('trabajador_id')} disabled={!selectedEmpresaId}>
                        <option value="">Seleccione un trabajador</option>
                        {trabajadores.map((trabajador) => (
                          <option key={trabajador.id} value={trabajador.id}>
                            {trabajador.nombre_completo} - {trabajador.documento_identidad}
                          </option>
                        ))}
                      </Select>
                      {errors.trabajador_id && (
                        <p className="mt-1 text-sm text-danger">{errors.trabajador_id.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Área
                      </label>
                      <Select {...register('area_id')} disabled={!selectedEmpresaId}>
                        <option value="">Seleccione un área (opcional)</option>
                        {areas.map((area) => (
                          <option key={area.id} value={area.id}>
                            {area.nombre}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </>
                )}

                {!isAdmin && usuario?.trabajadorId && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-slate-600">
                      <span className="font-medium">Trabajador:</span>{' '}
                      {trabajadores.find((t) => t.id === usuario.trabajadorId)?.nombre_completo || 'N/A'}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Link href="/epp">
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                </Link>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Guardando...' : 'Crear Solicitud'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
