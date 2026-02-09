'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usuariosService } from '@/services/usuarios.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings, Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const changePasswordSchema = z.object({
  password_actual: z.string().min(1, 'La contraseña actual es obligatoria'),
  nueva_password: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
  confirmacion_password: z.string().min(8, 'La confirmación es obligatoria'),
}).refine((data) => data.nueva_password === data.confirmacion_password, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmacion_password'],
});

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export default function ConfiguracionPage() {
  const { usuario: currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasswordActual, setShowPasswordActual] = useState(false);
  const [showNuevaPassword, setShowNuevaPassword] = useState(false);
  const [showConfirmacionPassword, setShowConfirmacionPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      password_actual: '',
      nueva_password: '',
      confirmacion_password: '',
    },
  });

  const onSubmit = async (data: ChangePasswordFormData) => {
    if (!currentUser) {
      toast.error('Error', {
        description: 'No se pudo identificar al usuario actual',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Primero validar la contraseña actual haciendo login
      const { authService } = await import('@/services/auth.service');
      
      try {
        await authService.login({
          dni: currentUser.dni,
          password: data.password_actual,
        });
      } catch (error: any) {
        toast.error('Contraseña actual incorrecta', {
          description: 'La contraseña actual no es válida',
        });
        setIsSubmitting(false);
        return;
      }

      // Si la contraseña actual es correcta, cambiar la contraseña
      await usuariosService.changePassword(currentUser.id, {
        nueva_password: data.nueva_password,
        confirmacion_password: data.confirmacion_password,
      });

      toast.success('Contraseña actualizada', {
        description: 'Tu contraseña ha sido cambiada exitosamente',
      });

      reset();
    } catch (error: any) {
      toast.error('Error al cambiar contraseña', {
        description: error.response?.data?.message || 'No se pudo cambiar la contraseña',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-7 h-7 text-primary" />
          Configuración de Cuenta
        </h1>
        <p className="text-slate-600 mt-1">
          Gestiona la configuración de tu cuenta y seguridad
        </p>
      </div>

      {/* Información del Usuario */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Información de la Cuenta</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              DNI
            </label>
            <Input value={currentUser.dni} disabled className="bg-slate-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Roles
            </label>
            <Input 
              value={currentUser.roles.map(r => r.replace('_', ' ')).join(', ')} 
              disabled 
              className="bg-slate-50" 
            />
          </div>
        </div>
      </div>

      {/* Cambio de Contraseña */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5" />
          Cambiar Contraseña
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Contraseña Actual <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                {...register('password_actual')}
                type={showPasswordActual ? 'text' : 'password'}
                placeholder="Ingresa tu contraseña actual"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPasswordActual(!showPasswordActual)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
              >
                {showPasswordActual ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.password_actual && (
              <p className="mt-1 text-sm text-red-600">{errors.password_actual.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nueva Contraseña <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                {...register('nueva_password')}
                type={showNuevaPassword ? 'text' : 'password'}
                placeholder="Mínimo 8 caracteres"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNuevaPassword(!showNuevaPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
              >
                {showNuevaPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.nueva_password && (
              <p className="mt-1 text-sm text-red-600">{errors.nueva_password.message}</p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              La contraseña debe tener al menos 8 caracteres
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Confirmar Nueva Contraseña <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                {...register('confirmacion_password')}
                type={showConfirmacionPassword ? 'text' : 'password'}
                placeholder="Repite la nueva contraseña"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmacionPassword(!showConfirmacionPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
              >
                {showConfirmacionPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.confirmacion_password && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmacion_password.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => reset()}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Cambiando...' : 'Cambiar Contraseña'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
