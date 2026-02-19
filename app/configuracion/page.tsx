'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usuariosService, UpdatePerfilAdminDto } from '@/services/usuarios.service';
import { trabajadoresService, Trabajador, UpdatePersonalDataDto, UpdateMedicoPersonalDataDto } from '@/services/trabajadores.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Settings, Lock, Eye, EyeOff, FileSignature, User, HelpCircle } from 'lucide-react';
import { UsuarioRol } from '@/types';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SignaturePad } from '@/components/ui/signature-pad';
import { MedicoSignatureInput } from '@/components/medico/MedicoSignatureInput';
import { MedicoSealInput } from '@/components/medico/MedicoSealInput';
import { Modal } from '@/components/ui/modal';

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

const adminPerfilSchema = z.object({
  nombres: z.string().optional(),
  apellido_paterno: z.string().optional(),
  apellido_materno: z.string().optional(),
  dni: z.string().optional(),
  firma_digital_url: z.string().optional(),
  password_actual: z.string().min(1, 'La contraseña es obligatoria para guardar cambios'),
});

const medicoPerfilSchema = z.object({
  titulo_sello: z.string().optional(),
  password_actual: z.string().min(1, 'La contraseña es obligatoria para guardar cambios'),
});

type PersonalDataFormData = z.infer<typeof personalDataSchema>;
type AdminPerfilFormData = z.infer<typeof adminPerfilSchema>;
type MedicoPerfilFormData = z.infer<typeof medicoPerfilSchema>;

const tallasCasco = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const tallasRopa = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
const tallasCalzado = Array.from({ length: 20 }, (_, i) => (i + 35).toString());

function isAdminSinTrabajador(u: { roles?: string[]; trabajadorId?: string | null } | null): boolean {
  if (!u) return false;
  const esAdmin = u.roles?.includes(UsuarioRol.SUPER_ADMIN) || u.roles?.includes(UsuarioRol.ADMIN_EMPRESA);
  return !!esAdmin && !u.trabajadorId;
}

function isMedicoOcupacional(u: { roles?: string[]; trabajadorId?: string | null } | null): boolean {
  if (!u) return false;
  const esMedico = u.roles?.includes(UsuarioRol.MEDICO) || u.roles?.includes(UsuarioRol.CENTRO_MEDICO);
  return !!esMedico && !!u.trabajadorId;
}

export default function ConfiguracionPage() {
  const { usuario: currentUser, refreshUserProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingPersonal, setIsSubmittingPersonal] = useState(false);
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);
  const [isSubmittingMedico, setIsSubmittingMedico] = useState(false);
  const [trabajador, setTrabajador] = useState<Trabajador | null>(null);
  const [usuarioCompleto, setUsuarioCompleto] = useState<{
    nombres?: string | null;
    apellido_paterno?: string | null;
    apellido_materno?: string | null;
    dni?: string;
    firma_url?: string | null;
  } | null>(null);
  const [showPasswordActual, setShowPasswordActual] = useState(false);
  const [showNuevaPassword, setShowNuevaPassword] = useState(false);
  const [showConfirmacionPassword, setShowConfirmacionPassword] = useState(false);
  const [showPasswordPersonal, setShowPasswordPersonal] = useState(false);
  const [showPasswordAdmin, setShowPasswordAdmin] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [medicoFirmaDibujada, setMedicoFirmaDibujada] = useState('');
  const [medicoFirmaImagen, setMedicoFirmaImagen] = useState('');
  const [medicoSello, setMedicoSello] = useState('');

  const esAdmin = currentUser?.roles?.includes(UsuarioRol.SUPER_ADMIN) || currentUser?.roles?.includes(UsuarioRol.ADMIN_EMPRESA);
  const esAdminSinTrabajador = isAdminSinTrabajador(currentUser ?? null);
  const esMedico = isMedicoOcupacional(currentUser ?? null);

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

  const adminPerfilForm = useForm<AdminPerfilFormData>({
    resolver: zodResolver(adminPerfilSchema),
    defaultValues: {
      nombres: '',
      apellido_paterno: '',
      apellido_materno: '',
      dni: '',
      firma_digital_url: '',
      password_actual: '',
    },
  });

  const medicoPerfilForm = useForm<MedicoPerfilFormData>({
    resolver: zodResolver(medicoPerfilSchema),
    defaultValues: {
      titulo_sello: 'MÉDICO OCUPACIONAL',
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
    if (esAdminSinTrabajador && currentUser?.id) {
      usuariosService.findOne(currentUser.id).then((u) => {
        const firmaUrl = (u as { firma_url?: string | null; firmaUrl?: string | null }).firma_url ?? (u as { firmaUrl?: string | null }).firmaUrl ?? null;
        setUsuarioCompleto({
          nombres: u.nombres ?? null,
          apellido_paterno: u.apellido_paterno ?? null,
          apellido_materno: u.apellido_materno ?? null,
          dni: u.dni,
          firma_url: firmaUrl,
        });
        adminPerfilForm.reset({
          nombres: u.nombres ?? '',
          apellido_paterno: u.apellido_paterno ?? '',
          apellido_materno: u.apellido_materno ?? '',
          dni: u.dni ?? '',
          firma_digital_url: '',
          password_actual: '',
        });
      }).catch(() => setUsuarioCompleto(null));
    } else {
      setUsuarioCompleto(null);
    }
  }, [currentUser?.id, esAdminSinTrabajador]);

  useEffect(() => {
    if (trabajador) {
      personalDataForm.reset({
        talla_casco: trabajador.talla_casco ?? '',
        talla_camisa: trabajador.talla_camisa ?? '',
        talla_pantalon: trabajador.talla_pantalon ?? '',
        talla_calzado: trabajador.talla_calzado != null ? String(trabajador.talla_calzado) : '',
        firma_digital_url: '',
        password_actual: '',
      });
      if (esMedico) {
        medicoPerfilForm.reset({
          titulo_sello: trabajador.titulo_sello ?? 'MÉDICO OCUPACIONAL',
          password_actual: '',
        });
        setMedicoFirmaDibujada('');
        setMedicoFirmaImagen('');
        setMedicoSello('');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trabajador?.id, esMedico]);

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

  const onSubmitMedicoPerfil = async (data: MedicoPerfilFormData) => {
    if (!currentUser?.trabajadorId || !trabajador) return;
    const tieneFirma = trabajador.firma_digital_url || medicoFirmaImagen || medicoFirmaDibujada;
    const tieneSello = trabajador.sello_url || medicoSello;
    if (!tieneFirma) {
      toast.error('Debe registrar su firma digital');
      return;
    }
    if (!tieneSello) {
      toast.error('Debe generar o subir su sello digital');
      return;
    }

    setIsSubmittingMedico(true);
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
        setIsSubmittingMedico(false);
        return;
      }

      const firmaFinal = medicoFirmaImagen || medicoFirmaDibujada;
      if (firmaFinal) {
        const { isValidSignature, getSignatureValidationError } = await import('@/lib/signature-validation');
        if (!isValidSignature(firmaFinal)) {
          toast.error(getSignatureValidationError());
          setIsSubmittingMedico(false);
          return;
        }
      }

      const payload: UpdateMedicoPersonalDataDto = {
        titulo_sello: data.titulo_sello || 'MÉDICO OCUPACIONAL',
        firma_imagen_base64: medicoFirmaImagen || undefined,
        firma_digital_url: !medicoFirmaImagen ? medicoFirmaDibujada : undefined,
        sello_base64: medicoSello || undefined,
      };

      await trabajadoresService.updateMedicoPersonalData(currentUser.trabajadorId, payload);
      const updated = await trabajadoresService.findOne(currentUser.trabajadorId);
      setTrabajador(updated);

      toast.success('Firma y sello actualizados', {
        description: 'Sus datos han sido guardados correctamente',
      });

      medicoPerfilForm.reset({
        ...medicoPerfilForm.getValues(),
        password_actual: '',
      });
    } catch (error: any) {
      toast.error('Error al actualizar', {
        description: error.response?.data?.message || 'No se pudieron guardar los cambios',
      });
    } finally {
      setIsSubmittingMedico(false);
    }
  };

  const onSubmitAdminPerfil = async (data: AdminPerfilFormData) => {
    if (!currentUser?.id) return;

    setIsSubmittingAdmin(true);
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
        setIsSubmittingAdmin(false);
        return;
      }

      const firmaBase64 = data.firma_digital_url?.startsWith('data:') ? data.firma_digital_url : undefined;
      if (firmaBase64) {
        const { isValidSignature, getSignatureValidationError } = await import('@/lib/signature-validation');
        if (!isValidSignature(firmaBase64)) {
          toast.error(getSignatureValidationError());
          setIsSubmittingAdmin(false);
          return;
        }
      }

      const payload: UpdatePerfilAdminDto = {};
      if (data.nombres !== undefined && data.nombres !== '') payload.nombres = data.nombres;
      if (data.apellido_paterno !== undefined && data.apellido_paterno !== '') payload.apellido_paterno = data.apellido_paterno;
      if (data.apellido_materno !== undefined && data.apellido_materno !== '') payload.apellido_materno = data.apellido_materno;
      if (data.dni !== undefined && data.dni !== '') payload.dni = data.dni;
      if (firmaBase64) payload.firma_base64 = firmaBase64;

      const updated = await usuariosService.updatePerfilAdmin(payload);
      setUsuarioCompleto({
        nombres: updated.nombres ?? null,
        apellido_paterno: updated.apellido_paterno ?? null,
        apellido_materno: updated.apellido_materno ?? null,
        dni: updated.dni,
        firma_url: updated.firma_url ?? null,
      });
      adminPerfilForm.reset({
        nombres: updated.nombres ?? '',
        apellido_paterno: updated.apellido_paterno ?? '',
        apellido_materno: updated.apellido_materno ?? '',
        dni: updated.dni ?? '',
        firma_digital_url: '',
        password_actual: '',
      });
      refreshUserProfile?.();

      toast.success('Perfil actualizado', {
        description: 'Datos y firma han sido actualizados correctamente',
      });
    } catch (error: any) {
      toast.error('Error al actualizar', {
        description: error.response?.data?.message || 'No se pudieron guardar los cambios',
      });
    } finally {
      setIsSubmittingAdmin(false);
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

  if (!currentUser) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-7 h-7 text-primary" />
            Configuración de Cuenta
          </h1>
          <p className="text-slate-600 mt-1">
            Gestiona la configuración de tu cuenta y seguridad
          </p>
        </div>
        {esAdmin && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowOnboardingModal(true)}
            className="flex items-center gap-2 shrink-0"
          >
            <HelpCircle className="w-4 h-4" />
            Información del Onboarding
          </Button>
        )}
      </div>

      <Modal
        isOpen={showOnboardingModal}
        onClose={() => setShowOnboardingModal(false)}
        title="Información del Onboarding"
        size="lg"
      >
        <div className="space-y-4 text-slate-700">
          <p>
            Campos que los usuarios registran al completar su perfil inicial. La firma maestra del responsable de entrega es necesaria para que aparezca en los PDF de registro de EPP.
          </p>
          <div>
            <h3 className="font-medium text-slate-900 mb-2 flex items-center gap-2">
              <FileSignature className="w-4 h-4" />
              Usuarios con trabajador (empleados)
            </h3>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Talla de casco</li>
              <li>Talla de camisa</li>
              <li>Talla de pantalón</li>
              <li>Talla de calzado</li>
              <li><strong>Firma digital (maestra)</strong> — reutilizable en entregas de EPP</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-slate-900 mb-2 flex items-center gap-2">
              <FileSignature className="w-4 h-4" />
              Admin / Super Admin (sin trabajador vinculado)
            </h3>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Nombres (opcional)</li>
              <li>Apellido paterno (opcional)</li>
              <li>Apellido materno (opcional)</li>
              <li>DNI (opcional)</li>
              <li><strong>Firma digital (maestra)</strong> — aparece como &quot;Firma responsable&quot; en PDF cuando registra entregas</li>
            </ul>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-sm text-amber-800">
              Si el responsable de entrega no completa su firma en el onboarding, la columna &quot;Firma responsable&quot; aparecerá vacía en los registros de EPP.
            </p>
          </div>
        </div>
      </Modal>

      {/* Información del Usuario */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Información de la Cuenta</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">DNI</label>
            <Input value={currentUser.dni} disabled className="bg-slate-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Roles</label>
            <Input
              value={currentUser.roles.map((r) => r.replace('_', ' ')).join(', ')}
              disabled
              className="bg-slate-50"
            />
          </div>
        </div>
      </div>

      {/* Admin/Super Admin sin trabajador: Datos de usuario editables + firma */}
      {esAdminSinTrabajador && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Datos del Usuario y Firma
          </h2>
          <p className="text-slate-600 text-sm mb-4">
            Puedes modificar tus nombres, apellidos, DNI y firma digital. Se requiere tu contraseña para guardar cambios.
          </p>
          {usuarioCompleto !== null ? (
            <form onSubmit={adminPerfilForm.handleSubmit(onSubmitAdminPerfil)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nombres</label>
                  <Input {...adminPerfilForm.register('nombres')} placeholder="Ej. Juan Carlos" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Apellido Paterno</label>
                  <Input {...adminPerfilForm.register('apellido_paterno')} placeholder="Ej. Pérez" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Apellido Materno</label>
                  <Input {...adminPerfilForm.register('apellido_materno')} placeholder="Ej. García" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">DNI</label>
                  <Input {...adminPerfilForm.register('dni')} placeholder="8 dígitos" maxLength={8} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Firma digital</label>
                <p className="text-xs text-slate-500 mb-2">
                  Dibuje su firma. Se usará como firma responsable en registros de entrega de EPP.
                </p>
                {(usuarioCompleto.firma_url || adminPerfilForm.watch('firma_digital_url')?.startsWith('data:')) ? (
                  <div className="space-y-2">
                    <div className="border border-slate-200 rounded-lg p-2 bg-slate-50 inline-block min-h-[80px]">
                      <img
                        src={
                          adminPerfilForm.watch('firma_digital_url')?.startsWith('data:')
                            ? adminPerfilForm.watch('firma_digital_url')!
                            : usuarioCompleto.firma_url!
                        }
                        alt="Firma actual"
                        className="max-h-24 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <p className="text-xs text-slate-500">Dibuje abajo para reemplazar la firma.</p>
                  </div>
                ) : null}
                <SignaturePad
                  value={adminPerfilForm.watch('firma_digital_url')?.startsWith('data:') ? adminPerfilForm.watch('firma_digital_url')! : undefined}
                  onChange={(url) => adminPerfilForm.setValue('firma_digital_url', url)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Contraseña actual <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    {...adminPerfilForm.register('password_actual')}
                    type={showPasswordAdmin ? 'text' : 'password'}
                    placeholder="Ingresa tu contraseña para confirmar"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordAdmin(!showPasswordAdmin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  >
                    {showPasswordAdmin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {adminPerfilForm.formState.errors.password_actual && (
                  <p className="mt-1 text-sm text-red-600">
                    {adminPerfilForm.formState.errors.password_actual.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    adminPerfilForm.reset({
                      nombres: usuarioCompleto.nombres ?? '',
                      apellido_paterno: usuarioCompleto.apellido_paterno ?? '',
                      apellido_materno: usuarioCompleto.apellido_materno ?? '',
                      dni: usuarioCompleto.dni ?? '',
                      firma_digital_url: '',
                      password_actual: '',
                    })
                  }
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmittingAdmin}>
                  {isSubmittingAdmin ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-slate-500 text-sm">Cargando datos...</p>
          )}
        </div>
      )}

      {/* Datos del trabajador (solo lectura) - Solo empleado con trabajador vinculado */}
      {currentUser.trabajadorId && trabajador && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Datos del Trabajador (solo lectura)
          </h2>
          <p className="text-slate-600 text-sm mb-4">
            Estos datos están definidos por el DNI/contrato y la estructura organizacional. Solo el administrador puede modificarlos.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Nombres y Apellidos</label>
              <p className="text-slate-900 font-medium">
                {[trabajador.nombres, trabajador.apellido_paterno, trabajador.apellido_materno].filter(Boolean).join(' ') || '-'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Nro de Documento (DNI)</label>
              <p className="text-slate-900 font-medium">{trabajador.documento_identidad || trabajador.numero_documento || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Razón Social / Empresa</label>
              <p className="text-slate-900 font-medium">{trabajador.empresa_nombre || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Área</label>
              <p className="text-slate-900 font-medium">{trabajador.area_nombre || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Sede</label>
              <p className="text-slate-900 font-medium">{trabajador.sede || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Unidad</label>
              <p className="text-slate-900 font-medium">{trabajador.unidad || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Cargo</label>
              <p className="text-slate-900 font-medium">{trabajador.cargo || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Fecha de Ingreso</label>
              <p className="text-slate-900 font-medium">
                {trabajador.fecha_ingreso ? new Date(trabajador.fecha_ingreso).toLocaleDateString('es-PE') : '-'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Centro de Costos</label>
              <p className="text-slate-900 font-medium">{trabajador.centro_costos || '-'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Nivel de Exposición</label>
              <p className="text-slate-900 font-medium">{trabajador.nivel_exposicion || '-'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Firma y Sello - Solo médico ocupacional */}
      {currentUser.trabajadorId && trabajador && esMedico && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <FileSignature className="w-5 h-5" />
            Firma y Sello
          </h2>
          <p className="text-slate-600 text-sm mb-4">
            Puedes ver y actualizar tu firma digital y sello. Se requiere tu contraseña para guardar cambios.
          </p>
          <form onSubmit={medicoPerfilForm.handleSubmit(onSubmitMedicoPerfil)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Firma guardada</p>
                {(trabajador.firma_digital_url || medicoFirmaImagen || medicoFirmaDibujada) ? (
                  <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 min-h-[100px] flex items-center justify-center">
                    <img
                      src={
                        medicoFirmaImagen || medicoFirmaDibujada ||
                        trabajador.firma_digital_url!
                      }
                      alt="Firma actual"
                      className="max-h-24 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">Aún no has registrado una firma</p>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Sello guardado</p>
                {trabajador.sello_url && !medicoSello ? (
                  <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 min-h-[100px] flex items-center justify-center">
                    <img
                      src={trabajador.sello_url}
                      alt="Sello actual"
                      className="max-h-24 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : medicoSello ? (
                  <p className="text-sm text-slate-500 italic">El sello se previsualiza abajo al generarlo</p>
                ) : (
                  <p className="text-sm text-slate-500 italic">Aún no has registrado un sello</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Actualizar firma digital</label>
              <MedicoSignatureInput
                drawnValue={medicoFirmaDibujada || undefined}
                uploadedValue={medicoFirmaImagen || undefined}
                onDrawnChange={(url) => setMedicoFirmaDibujada(url)}
                onUploadedChange={(url) => setMedicoFirmaImagen(url || '')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Actualizar sello digital</label>
              <MedicoSealInput
                nombreCompleto={trabajador.nombre_completo || ''}
                cmp={trabajador.cmp || ''}
                tituloSello={medicoPerfilForm.watch('titulo_sello') || 'MÉDICO OCUPACIONAL'}
                firmaDataUrl={medicoFirmaImagen || medicoFirmaDibujada || trabajador.firma_digital_url || undefined}
                value={medicoSello || undefined}
                onChange={(url) => setMedicoSello(url)}
                onTituloSelloChange={(v) => medicoPerfilForm.setValue('titulo_sello', v)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Contraseña actual <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  {...medicoPerfilForm.register('password_actual')}
                  type={showPasswordPersonal ? 'text' : 'password'}
                  placeholder="Ingresa tu contraseña para confirmar"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordPersonal(!showPasswordPersonal)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                >
                  {showPasswordPersonal ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {medicoPerfilForm.formState.errors.password_actual && (
                <p className="mt-1 text-sm text-red-600">
                  {medicoPerfilForm.formState.errors.password_actual.message}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  medicoPerfilForm.reset({
                    titulo_sello: trabajador.titulo_sello ?? 'MÉDICO OCUPACIONAL',
                    password_actual: '',
                  })
                }
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmittingMedico}>
                {isSubmittingMedico ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Tallas y Firma - Solo empleado con trabajador (no médico) */}
      {currentUser.trabajadorId && trabajador && !esMedico && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <FileSignature className="w-5 h-5" />
            Tallas y Firma (Onboarding)
          </h2>
          <p className="text-slate-600 text-sm mb-4">
            Puedes modificar tus tallas de EPP y tu firma digital. Se requiere tu contraseña para guardar cambios.
          </p>
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
              {(trabajador.firma_digital_url || personalDataForm.watch('firma_digital_url')?.startsWith('data:')) && (
                <div className="mb-3 space-y-2">
                  <p className="text-xs text-slate-600 font-medium">Firma actual:</p>
                  <div className="border border-slate-200 rounded-lg p-2 bg-slate-50 inline-block min-h-[80px]">
                    <img
                      src={
                        personalDataForm.watch('firma_digital_url')?.startsWith('data:')
                          ? personalDataForm.watch('firma_digital_url')!
                          : trabajador.firma_digital_url!
                      }
                      alt="Firma registrada"
                      className="max-h-24 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <p className="text-xs text-slate-500">Dibuje abajo para reemplazar la firma.</p>
                </div>
              )}
              <SignaturePad
                value={
                  personalDataForm.watch('firma_digital_url')?.startsWith('data:')
                    ? personalDataForm.watch('firma_digital_url')!
                    : undefined
                }
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
                onClick={() =>
                  personalDataForm.reset({
                    talla_casco: trabajador.talla_casco ?? '',
                    talla_camisa: trabajador.talla_camisa ?? '',
                    talla_pantalon: trabajador.talla_pantalon ?? '',
                    talla_calzado: trabajador.talla_calzado != null ? String(trabajador.talla_calzado) : '',
                    firma_digital_url: '',
                    password_actual: '',
                  })
                }
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmittingPersonal}>
                {isSubmittingPersonal ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Cargando cuando hay trabajadorId pero no trabajador aún */}
      {currentUser.trabajadorId && !trabajador && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <p className="text-slate-500 text-sm">Cargando datos...</p>
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
