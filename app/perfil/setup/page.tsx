'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { usuariosService, ChangePasswordDto } from '@/services/usuarios.service';
import { trabajadoresService, UpdatePersonalDataDto } from '@/services/trabajadores.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  User,
  Lock,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const passwordSchema = z
  .object({
    nueva_password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmacion_password: z.string(),
  })
  .refine((data) => data.nueva_password === data.confirmacion_password, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmacion_password'],
  });

const personalDataSchema = z.object({
  talla_casco: z.string().min(1, 'La talla de casco es obligatoria'),
  talla_camisa: z.string().min(1, 'La talla de camisa es obligatoria'),
  talla_pantalon: z.string().min(1, 'La talla de pantalón es obligatoria'),
  talla_calzado: z.string().min(1, 'La talla de calzado es obligatoria'),
});

type PasswordFormData = z.infer<typeof passwordSchema>;
type PersonalDataFormData = z.infer<typeof personalDataSchema>;

// Opciones de tallas comunes
const tallasCasco = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const tallasRopa = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
const tallasCalzado = Array.from({ length: 20 }, (_, i) => (i + 35).toString()); // 35-54

export default function PerfilSetupPage() {
  const router = useRouter();
  const { usuario, refreshUserProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      nueva_password: '',
      confirmacion_password: '',
    },
  });

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

  const handlePasswordSubmit = async (data: PasswordFormData) => {
    if (!usuario?.id) {
      toast.error('Error', {
        description: 'No se pudo identificar al usuario',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const passwordData: ChangePasswordDto = {
        nueva_password: data.nueva_password,
        confirmacion_password: data.confirmacion_password,
      };
      await usuariosService.changePassword(usuario.id, passwordData);
      toast.success('Contraseña actualizada', {
        description: 'Tu contraseña ha sido cambiada correctamente',
      });
      setCurrentStep(2);
    } catch (error: any) {
      toast.error('Error al cambiar contraseña', {
        description: error.response?.data?.message || 'No se pudo cambiar la contraseña',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePersonalDataSubmit = async (data: PersonalDataFormData) => {
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
      await trabajadoresService.updatePersonalData(usuario.trabajadorId, personalData);

      // Marcar perfil como completado
      await usuariosService.update(usuario.id, {
        perfil_completado: true,
      });

      // Refrescar perfil del usuario
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
    <ProtectedRoute>
      <MainLayout>
        <div className="max-w-2xl mx-auto py-8">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Configuración Inicial del Perfil
              </h1>
              <p className="text-slate-600">
                Completa tu perfil para comenzar a usar el sistema
              </p>
            </div>

            {/* Indicador de pasos */}
            <div className="flex items-center justify-center mb-8">
              <div className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    currentStep >= 1
                      ? 'bg-primary text-white border-primary'
                      : 'bg-slate-100 text-slate-400 border-slate-300'
                  }`}
                >
                  {currentStep > 1 ? <CheckCircle2 className="w-6 h-6" /> : '1'}
                </div>
                <div className={`w-24 h-1 ${currentStep > 1 ? 'bg-primary' : 'bg-slate-300'}`} />
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    currentStep >= 2
                      ? 'bg-primary text-white border-primary'
                      : 'bg-slate-100 text-slate-400 border-slate-300'
                  }`}
                >
                  2
                </div>
              </div>
            </div>

            {/* Paso 1: Seguridad */}
            {currentStep === 1 && (
              <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-6">
                <div className="text-center mb-6">
                  <Lock className="w-12 h-12 text-primary mx-auto mb-3" />
                  <h2 className="text-xl font-semibold text-slate-900">Seguridad</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Establece una nueva contraseña para tu cuenta
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nueva Contraseña <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="password"
                    {...passwordForm.register('nueva_password')}
                    placeholder="Mínimo 8 caracteres"
                  />
                  {passwordForm.formState.errors.nueva_password && (
                    <p className="mt-1 text-sm text-danger">
                      {passwordForm.formState.errors.nueva_password.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Confirmar Contraseña <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="password"
                    {...passwordForm.register('confirmacion_password')}
                    placeholder="Repite la contraseña"
                  />
                  {passwordForm.formState.errors.confirmacion_password && (
                    <p className="mt-1 text-sm text-danger">
                      {passwordForm.formState.errors.confirmacion_password.message}
                    </p>
                  )}
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={isSubmitting}>
                    Continuar
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </form>
            )}

            {/* Paso 2: Datos Físicos */}
            {currentStep === 2 && (
              <form
                onSubmit={personalDataForm.handleSubmit(handlePersonalDataSubmit)}
                className="space-y-6"
              >
                <div className="text-center mb-6">
                  <User className="w-12 h-12 text-primary mx-auto mb-3" />
                  <h2 className="text-xl font-semibold text-slate-900">Datos Físicos</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Registra tus tallas para la asignación de EPP
                  </p>
                </div>

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

                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                    disabled={isSubmitting}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Atrás
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Guardando...' : 'Completar Perfil'}
                    <CheckCircle2 className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
