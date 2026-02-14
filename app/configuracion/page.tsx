'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usuariosService } from '@/services/usuarios.service';
import { trabajadoresService, Trabajador, UpdatePersonalDataDto } from '@/services/trabajadores.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Settings, Lock, Eye, EyeOff, UserPlus, FileSignature } from 'lucide-react';
import { UsuarioRol } from '@/types';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SignaturePad } from '@/components/ui/signature-pad';

const changePasswordSchema = z.object({
  password_actual: z.string().min(1, 'La contraseña actual es obligatoria'),
  nueva_password: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
  confirmacion_password: z.string().min(8, 'La confirmación es obligatoria'),
}).refine((data) => data.nueva_password === data.confirmacion_password, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmacion_password'],
});

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

const personalDataSchema = z.object({
  talla_casco: z.string().optional(),
  talla_camisa: z.string().optional(),
  talla_pantalon: z.string().optional(),
  talla_calzado: z.string().optional(),
  firma_digital_url: z.string().optional(),
  password_actual: z.string().min(1, 'La contraseña es obligatoria para guardar cambios'),
});

type PersonalDataFormData = z.infer<typeof personalDataSchema>;

const tallasCasco = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const tallasRopa = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
const tallasCalzado = Array.from({ length: 20 }, (_, i) => (i + 35).toString());

export default function ConfiguracionPage() {
  const { usuario: currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingPersonal, setIsSubmittingPersonal] = useState(false);
  const [trabajador, setTrabajador] = useState<Trabajador | null>(null);
  const [showPasswordActual, setShowPasswordActual] = useState(false);
  const [showNuevaPassword, setShowNuevaPassword] = useState(false);
  const [showConfirmacionPassword, setShowConfirmacionPassword] = useState(false);
  const [showPasswordPersonal, setShowPasswordPersonal] = useState(false);

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

  const personalDataForm = useForm<PersonalDataFormData>({
    resolver: zodResolver(personalDataSchema),
    defaultValues: {
      talla_casco: '',
      talla_camisa: '',
      talla_pantalon: '',
      talla_calzado: '',
      firma_digital_url: '',
      password_actual: '',
    },
  });

  useEffect(() => {
    if (currentUser?.trabajadorId) {
      trabajadoresService.findOne(currentUser.trabajadorId).then(setTrabajador).catch(() => setTrabajador(null));
    } else {
      setTrabajador(null);
    }
  }, [currentUser?.trabajadorId]);

  useEffect(() => {
    if (trabajador) {
      personalDataForm.reset({
        talla_casco: trabajador.talla_casco ?? '',
        talla_camisa: trabajador.talla_camisa ?? '',
        talla_pantalon: trabajador.talla_pantalon ?? '',
        talla_calzado: trabajador.talla_calzado != null ? String(trabajador.talla_calzado) : '',
        firma_digital_url: trabajador.firma_digital_url ?? '',
        password_actual: '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trabajador?.id]);

  const onSubmitPersonalData = async (data: PersonalDataFormData) => {
    if (!currentUser?.trabajadorId) return;

    setIsSubmittingPersonal(true);
    try {
      const { authService } = await import('@/services/auth.service');
      try {
        await authService.login({
          dni: currentUser.dni,
          password: data.password_actual,
        });
      } catch {
        toast.error('Contraseña incorrecta', {
          description: 'La contraseña actual no es válida',
        });
        setIsSubmittingPersonal(false);
        return;
      }

      const firmaUrl = data.firma_digital_url?.startsWith('data:') ? data.firma_digital_url : undefined;
      if (firmaUrl) {
        const { isValidSignature, getSignatureValidationError } = await import('@/lib/signature-validation');
        if (!isValidSignature(firmaUrl)) {
          toast.error(getSignatureValidationError());
          setIsSubmittingPersonal(false);
          return;
        }
      }

      const personalData: UpdatePersonalDataDto = {
        talla_casco: data.talla_casco || undefined,
        talla_camisa: data.talla_camisa || undefined,
        talla_pantalon: data.talla_pantalon || undefined,
        talla_calzado: data.talla_calzado || undefined,
        firma_digital_url: firmaUrl,
      };

      await trabajadoresService.updatePersonalData(currentUser.trabajadorId, personalData);
      const updated = await trabajadoresService.findOne(currentUser.trabajadorId);
      setTrabajador(updated);

      toast.success('Datos actualizados', {
        description: 'Tallas y firma han sido actualizados correctamente',
      });

      personalDataForm.reset({
        ...personalDataForm.getValues(),
        password_actual: '',
      });
    } catch (error: any) {
      toast.error('Error al actualizar', {
        description: error.response?.data?.message || 'No se pudieron guardar los cambios',
      });
    } finally {
      setIsSubmittingPersonal(false);
    }
  };

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

  const esAdmin = currentUser?.roles?.includes(UsuarioRol.SUPER_ADMIN) || currentUser?.roles?.includes(UsuarioRol.ADMIN_EMPRESA);

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

      {/* Tallas y Firma - Solo empleado con trabajador vinculado */}
      {currentUser.trabajadorId && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <FileSignature className="w-5 h-5" />
            Tallas y Firma (Onboarding)
          </h2>
          <p className="text-slate-600 text-sm mb-4">
            Puedes modificar tus tallas de EPP y tu firma digital. Se requiere tu contraseña para guardar cambios.
          </p>
          {trabajador ? (
            <form onSubmit={personalDataForm.handleSubmit(onSubmitPersonalData)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Talla de Casco</label>
                  <Select {...personalDataForm.register('talla_casco')} className="w-full">
                    <option value="">Seleccione una talla</option>
                    {tallasCasco.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Talla de Camisa</label>
                  <Select {...personalDataForm.register('talla_camisa')} className="w-full">
                    <option value="">Seleccione una talla</option>
                    {tallasRopa.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Talla de Pantalón</label>
                  <Select {...personalDataForm.register('talla_pantalon')} className="w-full">
                    <option value="">Seleccione una talla</option>
                    {tallasRopa.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Talla de Calzado</label>
                  <Select {...personalDataForm.register('talla_calzado')} className="w-full">
                    <option value="">Seleccione una talla</option>
                    {tallasCalzado.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Firma digital</label>
                <p className="text-xs text-slate-500 mb-2">
                  Dibuje su firma. Se usará en registros de entrega de EPP.
                </p>
                <SignaturePad
                  value={personalDataForm.watch('firma_digital_url') || trabajador.firma_digital_url || undefined}
                  onChange={(url) => personalDataForm.setValue('firma_digital_url', url)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Contraseña actual <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    {...personalDataForm.register('password_actual')}
                    type={showPasswordPersonal ? 'text' : 'password'}
                    placeholder="Ingresa tu contraseña para confirmar"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordPersonal(!showPasswordPersonal)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  >
                    {showPasswordPersonal ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {personalDataForm.formState.errors.password_actual && (
                  <p className="mt-1 text-sm text-red-600">
                    {personalDataForm.formState.errors.password_actual.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => personalDataForm.reset({
                    talla_casco: trabajador.talla_casco ?? '',
                    talla_camisa: trabajador.talla_camisa ?? '',
                    talla_pantalon: trabajador.talla_pantalon ?? '',
                    talla_calzado: trabajador.talla_calzado != null ? String(trabajador.talla_calzado) : '',
                    firma_digital_url: trabajador.firma_digital_url ?? '',
                    password_actual: '',
                  })}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmittingPersonal}>
                  {isSubmittingPersonal ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-slate-500 text-sm">Cargando datos...</p>
          )}
        </div>
      )}

      {/* Información de Onboarding - Solo Admin / Super Admin */}
      {esAdmin && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Información del Onboarding
          </h2>
          <p className="text-slate-600 text-sm mb-4">
            Campos que los usuarios registran al completar su perfil inicial. La firma maestra del responsable de entrega es necesaria para que aparezca en los PDF de registro de EPP.
          </p>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-slate-800 mb-2 flex items-center gap-2">
                <FileSignature className="w-4 h-4" />
                Usuarios con trabajador (empleados)
              </h3>
              <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                <li>Talla de casco</li>
                <li>Talla de camisa</li>
                <li>Talla de pantalón</li>
                <li>Talla de calzado</li>
                <li><strong>Firma digital (maestra)</strong> — reutilizable en entregas de EPP</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-slate-800 mb-2 flex items-center gap-2">
                <FileSignature className="w-4 h-4" />
                Admin / Super Admin (sin trabajador vinculado)
              </h3>
              <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                <li>Nombres (opcional)</li>
                <li>Apellido paterno (opcional)</li>
                <li>Apellido materno (opcional)</li>
                <li>DNI (opcional)</li>
                <li><strong>Firma digital (maestra)</strong> — aparece como &quot;Firma responsable&quot; en PDF cuando registra entregas</li>
              </ul>
              <p className="mt-2 text-xs text-amber-700 bg-amber-50 p-2 rounded">
                Si el responsable de entrega no completa su firma en el onboarding, la columna &quot;Firma responsable&quot; aparecerá vacía en los registros de EPP.
              </p>
            </div>
          </div>
        </div>
      )}

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
