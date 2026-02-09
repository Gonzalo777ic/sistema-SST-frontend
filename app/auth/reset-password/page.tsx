'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usuariosService, ChangePasswordDto } from '@/services/usuarios.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
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

type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const { usuario, isLoading, refreshUserProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    mode: 'onChange',
    defaultValues: {
      nueva_password: '',
      confirmacion_password: '',
    },
  });

  useEffect(() => {
    // Si está cargando, esperar
    if (isLoading) {
      return;
    }

    // Si no hay usuario autenticado, redirigir al login
    if (!usuario) {
      router.push('/login');
      return;
    }
    
    // Si el usuario NO debe cambiar contraseña, redirigir al dashboard
    // (solo si ya completó el cambio de contraseña)
    if (usuario && !usuario.debe_cambiar_password) {
      // Verificar si viene de un cambio de contraseña exitoso
      // Si no debe cambiar contraseña, puede ir al dashboard o setup de perfil
      if (usuario.perfil_completado === false) {
        router.push('/perfil/setup');
      } else {
        router.push('/dashboard');
      }
    }
  }, [usuario, isLoading, router]);

  const onSubmit = async (data: PasswordFormData) => {
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
        description: 'Tu contraseña ha sido cambiada correctamente. Redirigiendo...',
      });

      // Esperar un momento para que el backend procese el cambio
      await new Promise(resolve => setTimeout(resolve, 500));

      // Refrescar perfil para obtener el estado actualizado (debe_cambiar_password = false)
      const updatedUsuario = await refreshUserProfile();
      
      // Verificar que el perfil se actualizó correctamente
      if (!updatedUsuario) {
        toast.error('Error', {
          description: 'No se pudo actualizar el perfil. Por favor, recarga la página.',
        });
        return;
      }

      // Verificar que debe_cambiar_password sea false antes de redirigir
      if (updatedUsuario.debe_cambiar_password) {
        toast.warning('Advertencia', {
          description: 'El estado de la contraseña no se actualizó correctamente. Por favor, intenta nuevamente.',
        });
        return;
      }
      
      // Redirigir según el estado del perfil
      // Usar window.location para forzar recarga completa y evitar problemas de estado
      if (updatedUsuario.perfil_completado === false) {
        window.location.href = '/perfil/setup';
      } else {
        window.location.href = '/dashboard';
      }
    } catch (error: any) {
      toast.error('Error al cambiar contraseña', {
        description: error.response?.data?.message || 'No se pudo cambiar la contraseña',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mostrar loading mientras se verifica el usuario
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-slate-600">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <Lock className="w-12 h-12 text-primary mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Cambio de Contraseña Requerido
            </h1>
            <p className="text-slate-600">
              Por seguridad, debes cambiar tu contraseña antes de continuar
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nueva Contraseña <span className="text-red-500">*</span>
              </label>
              <Input
                type="password"
                {...register('nueva_password')}
                placeholder="Mínimo 8 caracteres"
              />
              {errors.nueva_password && (
                <p className="mt-1 text-sm text-danger">
                  {errors.nueva_password.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Confirmar Contraseña <span className="text-red-500">*</span>
              </label>
              <Input
                type="password"
                {...register('confirmacion_password')}
                placeholder="Repite la contraseña"
              />
              {errors.confirmacion_password && (
                <p className="mt-1 text-sm text-danger">
                  {errors.confirmacion_password.message}
                </p>
              )}
            </div>

            <Button type="submit" disabled={isSubmitting || !isValid} className="w-full">
              {isSubmitting ? 'Cambiando...' : 'Cambiar Contraseña'}
              <CheckCircle2 className="w-4 h-4 ml-2" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
