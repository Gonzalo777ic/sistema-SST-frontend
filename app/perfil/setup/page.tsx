'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { trabajadoresService, UpdatePersonalDataDto } from '@/services/trabajadores.service';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { User, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const personalDataSchema = z.object({
  talla_casco: z.string().min(1, 'La talla de casco es obligatoria'),
  talla_camisa: z.string().min(1, 'La talla de camisa es obligatoria'),
  talla_pantalon: z.string().min(1, 'La talla de pantalón es obligatoria'),
  talla_calzado: z.string().min(1, 'La talla de calzado es obligatoria'),
});

type PersonalDataFormData = z.infer<typeof personalDataSchema>;

// Opciones de tallas comunes
const tallasCasco = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const tallasRopa = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
const tallasCalzado = Array.from({ length: 20 }, (_, i) => (i + 35).toString()); // 35-54

export default function PerfilSetupPage() {
  const router = useRouter();
  const { usuario, refreshUserProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const personalDataForm = useForm<PersonalDataFormData>({
    resolver: zodResolver(personalDataSchema),
    defaultValues: {
      talla_casco: '',
      talla_camisa: '',
      talla_pantalon: '',
      talla_calzado: '',
    },
  });

  useEffect(() => {
    // Si el perfil ya está completado, redirigir al dashboard
    if (usuario?.perfil_completado === true) {
      router.push('/dashboard');
    }
  }, [usuario, router]);

  const handleSubmit = async (data: PersonalDataFormData) => {
    if (!usuario?.id || !usuario?.trabajadorId) {
      toast.error('Error', {
        description: 'No se pudo identificar al usuario o trabajador',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const personalData: UpdatePersonalDataDto = {
        talla_casco: data.talla_casco,
        talla_camisa: data.talla_camisa,
        talla_pantalon: data.talla_pantalon,
        talla_calzado: data.talla_calzado,
      };

      // Actualizar datos personales del trabajador
      // El backend automáticamente marca perfilCompletado: true en el trabajador
      await trabajadoresService.updatePersonalData(usuario.trabajadorId, personalData);

      // Refrescar perfil del usuario para obtener el estado actualizado
      // El perfil_completado se mapea desde trabajador.perfilCompletado
      await refreshUserProfile();

      toast.success('Perfil completado', {
        description: 'Tu perfil ha sido configurado correctamente',
      });

      // Redirigir al dashboard
      router.push('/dashboard');
    } catch (error: any) {
      toast.error('Error al completar perfil', {
        description: error.response?.data?.message || 'No se pudo completar el perfil',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (

        <div className="max-w-2xl mx-auto py-8">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
            <div className="text-center mb-8">
              <User className="w-12 h-12 text-primary mx-auto mb-3" />
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Completar Tallas de EPP
              </h1>
              <p className="text-slate-600">
                Registra tus tallas para la asignación de Equipos de Protección Personal
              </p>
            </div>

            <form
              onSubmit={personalDataForm.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Talla de Casco <span className="text-red-500">*</span>
                  </label>
                  <Select {...personalDataForm.register('talla_casco')}>
                    <option value="">Seleccione una talla</option>
                    {tallasCasco.map((talla) => (
                      <option key={talla} value={talla}>
                        {talla}
                      </option>
                    ))}
                  </Select>
                  {personalDataForm.formState.errors.talla_casco && (
                    <p className="mt-1 text-sm text-danger">
                      {personalDataForm.formState.errors.talla_casco.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Talla de Pantalón <span className="text-red-500">*</span>
                  </label>
                  <Select {...personalDataForm.register('talla_pantalon')}>
                    <option value="">Seleccione una talla</option>
                    {tallasRopa.map((talla) => (
                      <option key={talla} value={talla}>
                        {talla}
                      </option>
                    ))}
                  </Select>
                  {personalDataForm.formState.errors.talla_pantalon && (
                    <p className="mt-1 text-sm text-danger">
                      {personalDataForm.formState.errors.talla_pantalon.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Talla de Calzado <span className="text-red-500">*</span>
                  </label>
                  <Select {...personalDataForm.register('talla_calzado')}>
                    <option value="">Seleccione una talla</option>
                    {tallasCalzado.map((talla) => (
                      <option key={talla} value={talla}>
                        {talla}
                      </option>
                    ))}
                  </Select>
                  {personalDataForm.formState.errors.talla_calzado && (
                    <p className="mt-1 text-sm text-danger">
                      {personalDataForm.formState.errors.talla_calzado.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Talla de Camisa <span className="text-red-500">*</span>
                  </label>
                  <Select {...personalDataForm.register('talla_camisa')}>
                    <option value="">Seleccione una talla</option>
                    {tallasRopa.map((talla) => (
                      <option key={talla} value={talla}>
                        {talla}
                      </option>
                    ))}
                  </Select>
                  {personalDataForm.formState.errors.talla_camisa && (
                    <p className="mt-1 text-sm text-danger">
                      {personalDataForm.formState.errors.talla_camisa.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isSubmitting} className="min-w-[200px]">
                  {isSubmitting ? 'Guardando...' : 'Completar Perfil'}
                  <CheckCircle2 className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </form>
          </div>
        </div>

  );
}
