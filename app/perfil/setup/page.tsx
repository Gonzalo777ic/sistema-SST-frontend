'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { trabajadoresService, Trabajador, UpdatePersonalDataDto, UpdateMedicoPersonalDataDto } from '@/services/trabajadores.service';
import { usuariosService, UpdatePerfilAdminDto } from '@/services/usuarios.service';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { User, CheckCircle2, Shield, Stethoscope, Building2 } from 'lucide-react';
import { SignaturePad } from '@/components/ui/signature-pad';
import { MedicoSignatureInput } from '@/components/medico/MedicoSignatureInput';
import { MedicoSealInput } from '@/components/medico/MedicoSealInput';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UsuarioRol } from '@/types';

const personalDataSchema = z.object({
  talla_casco: z.string().min(1, 'La talla de casco es obligatoria'),
  talla_camisa: z.string().min(1, 'La talla de camisa es obligatoria'),
  talla_pantalon: z.string().min(1, 'La talla de pantalón es obligatoria'),
  talla_calzado: z.string().min(1, 'La talla de calzado es obligatoria'),
  firma_digital_url: z.string().optional(),
});

const adminPerfilSchema = z.object({
  nombres: z.string().optional(),
  apellido_paterno: z.string().optional(),
  apellido_materno: z.string().optional(),
  dni: z.string().optional(),
  firma_base64: z.string().optional(),
});

const medicoPerfilSchema = z.object({
  cmp: z.string().min(1, 'El número de colegiatura (CMP) es obligatorio'),
  rne: z.string().optional(),
  titulo_sello: z.string().optional(),
  talla_casco: z.string().optional(),
  talla_camisa: z.string().optional(),
  talla_pantalon: z.string().optional(),
  talla_calzado: z.string().optional(),
});

const centroMedicoPerfilSchema = z.object({
  nombres: z.string().min(1, 'Los nombres son obligatorios'),
  apellido_paterno: z.string().min(1, 'El apellido paterno es obligatorio'),
  apellido_materno: z.string().min(1, 'El apellido materno es obligatorio'),
});

type PersonalDataFormData = z.infer<typeof personalDataSchema>;
type AdminPerfilFormData = z.infer<typeof adminPerfilSchema>;
type MedicoPerfilFormData = z.infer<typeof medicoPerfilSchema>;
type CentroMedicoPerfilFormData = z.infer<typeof centroMedicoPerfilSchema>;

// Opciones de tallas comunes
const tallasCasco = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const tallasRopa = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
const tallasCalzado = Array.from({ length: 20 }, (_, i) => (i + 35).toString()); // 35-54

function isAdminSinTrabajador(usuario: { roles?: string[]; trabajadorId?: string | null } | null): boolean {
  if (!usuario) return false;
  const esAdmin = usuario.roles?.includes(UsuarioRol.SUPER_ADMIN) || usuario.roles?.includes(UsuarioRol.ADMIN_EMPRESA);
  return !!esAdmin && !usuario.trabajadorId;
}

function isMedicoOcupacional(usuario: { roles?: string[]; trabajadorId?: string | null } | null): boolean {
  if (!usuario) return false;
  const esMedico = usuario.roles?.includes(UsuarioRol.MEDICO) || usuario.roles?.includes(UsuarioRol.CENTRO_MEDICO);
  return !!esMedico && !!usuario.trabajadorId;
}

/** Usuario centro médico sin trabajador vinculado: solicita nombres, apellidos y firma (no tallas EPP). */
function isCentroMedicoSinTrabajador(usuario: { roles?: string[]; trabajadorId?: string | null } | null): boolean {
  if (!usuario) return false;
  return !!usuario.roles?.includes(UsuarioRol.CENTRO_MEDICO) && !usuario.trabajadorId;
}

export default function PerfilSetupPage() {
  const router = useRouter();
  const { usuario, refreshUserProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trabajador, setTrabajador] = useState<Trabajador | null>(null);

  const esAdminSetup = isAdminSinTrabajador(usuario ?? null);
  const esCentroMedicoSetup = isCentroMedicoSinTrabajador(usuario ?? null);
  const esMedicoSetup = isMedicoOcupacional(usuario ?? null);

  const personalDataForm = useForm<PersonalDataFormData>({
    resolver: zodResolver(personalDataSchema),
    defaultValues: {
      talla_casco: '',
      talla_camisa: '',
      talla_pantalon: '',
      talla_calzado: '',
      firma_digital_url: '',
    },
  });

  const medicoPerfilForm = useForm<MedicoPerfilFormData>({
    resolver: zodResolver(medicoPerfilSchema),
    defaultValues: {
      cmp: '',
      rne: '',
      titulo_sello: 'MÉDICO OCUPACIONAL',
      talla_casco: '',
      talla_camisa: '',
      talla_pantalon: '',
      talla_calzado: '',
    },
  });

  const [medicoFirmaDibujada, setMedicoFirmaDibujada] = useState('');
  const [medicoFirmaImagen, setMedicoFirmaImagen] = useState('');
  const [medicoSello, setMedicoSello] = useState('');
  const [centroMedicoFirmaDibujada, setCentroMedicoFirmaDibujada] = useState('');
  const [centroMedicoFirmaImagen, setCentroMedicoFirmaImagen] = useState('');

  useEffect(() => {
    if (esMedicoSetup && usuario?.trabajadorId) {
      trabajadoresService.findOne(usuario.trabajadorId).then(setTrabajador).catch(() => setTrabajador(null));
    }
  }, [esMedicoSetup, usuario?.trabajadorId]);

  useEffect(() => {
    if (trabajador) {
      medicoPerfilForm.reset({
        cmp: trabajador.cmp ?? '',
        rne: trabajador.rne ?? '',
        titulo_sello: trabajador.titulo_sello ?? 'MÉDICO OCUPACIONAL',
        talla_casco: trabajador.talla_casco ?? '',
        talla_camisa: trabajador.talla_camisa ?? '',
        talla_pantalon: trabajador.talla_pantalon ?? '',
        talla_calzado: trabajador.talla_calzado?.toString() ?? '',
      });
    }
  }, [trabajador?.id]);

  const adminPerfilForm = useForm<AdminPerfilFormData>({
    resolver: zodResolver(adminPerfilSchema),
    defaultValues: {
      nombres: usuario?.nombres ?? '',
      apellido_paterno: usuario?.apellido_paterno ?? '',
      apellido_materno: usuario?.apellido_materno ?? '',
      dni: usuario?.dni ?? '',
      firma_base64: '',
    },
  });

  const centroMedicoPerfilForm = useForm<CentroMedicoPerfilFormData>({
    resolver: zodResolver(centroMedicoPerfilSchema),
    defaultValues: {
      nombres: usuario?.nombres ?? '',
      apellido_paterno: usuario?.apellido_paterno ?? '',
      apellido_materno: usuario?.apellido_materno ?? '',
    },
  });

  useEffect(() => {
    if (usuario) {
      adminPerfilForm.reset({
        nombres: usuario.nombres ?? '',
        apellido_paterno: usuario.apellido_paterno ?? '',
        apellido_materno: usuario.apellido_materno ?? '',
        dni: usuario.dni ?? '',
        firma_base64: '',
      });
    }
  }, [usuario?.id]);

  useEffect(() => {
    if (usuario && isCentroMedicoSinTrabajador(usuario)) {
      centroMedicoPerfilForm.reset({
        nombres: usuario.nombres ?? '',
        apellido_paterno: usuario.apellido_paterno ?? '',
        apellido_materno: usuario.apellido_materno ?? '',
      });
    }
  }, [usuario?.id]);

  useEffect(() => {
    if (usuario?.perfil_completado === true) {
      router.push('/dashboard');
    }
  }, [usuario, router]);

  const handleSubmitTrabajador = async (data: PersonalDataFormData) => {
    if (!usuario?.id || !usuario?.trabajadorId) {
      toast.error('Error', {
        description: 'No se pudo identificar al usuario o trabajador',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      if (data.firma_digital_url) {
        const { isValidSignature, getSignatureValidationError } = await import('@/lib/signature-validation');
        if (!isValidSignature(data.firma_digital_url)) {
          toast.error(getSignatureValidationError());
          setIsSubmitting(false);
          return;
        }
      }

      const personalData: UpdatePersonalDataDto = {
        talla_casco: data.talla_casco,
        talla_camisa: data.talla_camisa,
        talla_pantalon: data.talla_pantalon,
        talla_calzado: data.talla_calzado,
        firma_digital_url: data.firma_digital_url || undefined,
      };

      await trabajadoresService.updatePersonalData(usuario.trabajadorId, personalData);
      await refreshUserProfile();

      toast.success('Perfil completado', {
        description: 'Tu perfil ha sido configurado correctamente',
      });

      router.push('/dashboard');
    } catch (error: any) {
      toast.error('Error al completar perfil', {
        description: error.response?.data?.message || 'No se pudo completar el perfil',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitAdmin = async (data: AdminPerfilFormData) => {
    if (!usuario?.id) {
      toast.error('Error', {
        description: 'No se pudo identificar al usuario',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: UpdatePerfilAdminDto = {};
      if (data.nombres !== undefined && data.nombres !== '') payload.nombres = data.nombres;
      if (data.apellido_paterno !== undefined && data.apellido_paterno !== '') payload.apellido_paterno = data.apellido_paterno;
      if (data.apellido_materno !== undefined && data.apellido_materno !== '') payload.apellido_materno = data.apellido_materno;
      if (data.dni !== undefined && data.dni !== '') payload.dni = data.dni;
      if (data.firma_base64 !== undefined && data.firma_base64 !== '') payload.firma_base64 = data.firma_base64;

      await usuariosService.updatePerfilAdmin(payload);
      await refreshUserProfile();

      toast.success('Perfil completado', {
        description: 'Tu perfil ha sido configurado correctamente',
      });

      router.push('/dashboard');
    } catch (error: any) {
      toast.error('Error al completar perfil', {
        description: error.response?.data?.message || 'No se pudo completar el perfil',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitCentroMedico = async (data: CentroMedicoPerfilFormData) => {
    if (!usuario?.id) {
      toast.error('Error', { description: 'No se pudo identificar al usuario' });
      return;
    }

    const firmaFinal = centroMedicoFirmaImagen || centroMedicoFirmaDibujada;
    if (!firmaFinal) {
      toast.error('Debe registrar su firma (dibujar o subir imagen)');
      return;
    }

    try {
      setIsSubmitting(true);
      const { isValidSignature, getSignatureValidationError } = await import('@/lib/signature-validation');
      if (!isValidSignature(firmaFinal)) {
        toast.error(getSignatureValidationError());
        setIsSubmitting(false);
        return;
      }

      const payload: UpdatePerfilAdminDto = {
        nombres: data.nombres,
        apellido_paterno: data.apellido_paterno,
        apellido_materno: data.apellido_materno,
        firma_base64: firmaFinal,
      };

      await usuariosService.updatePerfilAdmin(payload);
      await refreshUserProfile();

      toast.success('Perfil completado', {
        description: 'Su perfil ha sido configurado correctamente. La firma se almacenó para su reutilización.',
      });

      router.push('/dashboard');
    } catch (error: any) {
      toast.error('Error al completar perfil', {
        description: error.response?.data?.message || 'No se pudo completar el perfil',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitMedico = async (data: MedicoPerfilFormData) => {
    if (!usuario?.trabajadorId) {
      toast.error('Error', { description: 'No se pudo identificar al trabajador' });
      return;
    }

    const esCentroMedico = usuario.roles?.includes(UsuarioRol.CENTRO_MEDICO);
    if (!esCentroMedico && (!data.talla_casco || !data.talla_camisa || !data.talla_pantalon || !data.talla_calzado)) {
      toast.error('Debe completar todas las tallas de EPP');
      return;
    }

    const firmaFinal = medicoFirmaImagen || medicoFirmaDibujada;
    if (!firmaFinal) {
      toast.error('Debe registrar su firma (dibujar o subir imagen)');
      return;
    }
    if (!medicoSello) {
      toast.error('Debe generar o subir su sello digital');
      return;
    }

    try {
      setIsSubmitting(true);
      const { isValidSignature, getSignatureValidationError } = await import('@/lib/signature-validation');
      if (!isValidSignature(firmaFinal)) {
        toast.error(getSignatureValidationError());
        setIsSubmitting(false);
        return;
      }

      const payload: UpdateMedicoPersonalDataDto = {
        cmp: data.cmp,
        rne: data.rne || undefined,
        titulo_sello: data.titulo_sello || 'MÉDICO OCUPACIONAL',
        firma_imagen_base64: medicoFirmaImagen || undefined,
        firma_digital_url: !medicoFirmaImagen ? medicoFirmaDibujada : undefined,
        sello_base64: medicoSello,
        ...(esCentroMedico ? {} : {
          talla_casco: data.talla_casco,
          talla_camisa: data.talla_camisa,
          talla_pantalon: data.talla_pantalon,
          talla_calzado: data.talla_calzado,
        }),
      };

      await trabajadoresService.updateMedicoPersonalData(usuario.trabajadorId, payload);
      await refreshUserProfile();

      toast.success('Perfil completado', {
        description: 'Su perfil de Médico Ocupacional ha sido configurado correctamente',
      });

      router.push('/dashboard');
    } catch (error: any) {
      toast.error('Error al completar perfil', {
        description: error.response?.data?.message || 'No se pudo completar el perfil',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (esAdminSetup) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
          <div className="text-center mb-8">
            <Shield className="w-12 h-12 text-primary mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Completar Datos de Perfil
            </h1>
            <p className="text-slate-600">
              Registre sus datos para firmar documentos y kardex (opcional, puede omitir y completar después)
            </p>
          </div>

          <form
            onSubmit={adminPerfilForm.handleSubmit(handleSubmitAdmin)}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nombres <span className="text-slate-400">(opcional)</span>
                </label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Ej. Juan Carlos"
                  {...adminPerfilForm.register('nombres')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Apellido paterno <span className="text-slate-400">(opcional)</span>
                </label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Ej. Pérez"
                  {...adminPerfilForm.register('apellido_paterno')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Apellido materno <span className="text-slate-400">(opcional)</span>
                </label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Ej. García"
                  {...adminPerfilForm.register('apellido_materno')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  DNI <span className="text-slate-400">(opcional)</span>
                </label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="8 dígitos"
                  maxLength={8}
                  {...adminPerfilForm.register('dni')}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Firma digital <span className="text-slate-400">(opcional)</span>
              </label>
              <p className="text-xs text-slate-500 mb-2">
                Dibuje su firma para usar en registros y kardex de EPP.
              </p>
              <SignaturePad
                value={adminPerfilForm.watch('firma_base64')}
                onChange={(dataUrl) => adminPerfilForm.setValue('firma_base64', dataUrl)}
              />
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

  if (esCentroMedicoSetup) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
          <div className="text-center mb-8">
            <Building2 className="w-12 h-12 text-primary mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Completar Perfil - Centro Médico
            </h1>
            <p className="text-slate-600">
              Registre sus datos personales y firma. La firma se almacenará en el sistema para reutilizarla en certificados y documentos.
            </p>
          </div>

          <form
            onSubmit={centroMedicoPerfilForm.handleSubmit(handleSubmitCentroMedico)}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nombres <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Ej. Juan Carlos"
                  {...centroMedicoPerfilForm.register('nombres')}
                />
                {centroMedicoPerfilForm.formState.errors.nombres && (
                  <p className="mt-1 text-sm text-red-600">{centroMedicoPerfilForm.formState.errors.nombres.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Apellido paterno <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Ej. Pérez"
                  {...centroMedicoPerfilForm.register('apellido_paterno')}
                />
                {centroMedicoPerfilForm.formState.errors.apellido_paterno && (
                  <p className="mt-1 text-sm text-red-600">{centroMedicoPerfilForm.formState.errors.apellido_paterno.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Apellido materno <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Ej. García"
                  {...centroMedicoPerfilForm.register('apellido_materno')}
                />
                {centroMedicoPerfilForm.formState.errors.apellido_materno && (
                  <p className="mt-1 text-sm text-red-600">{centroMedicoPerfilForm.formState.errors.apellido_materno.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Firma digital <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-slate-500 mb-2">
                Suba una imagen de su firma manuscrita (PNG/JPG) o dibújela. Se almacenará en el sistema para reutilizarla en certificados y registros.
              </p>
              <MedicoSignatureInput
                drawnValue={centroMedicoFirmaDibujada}
                uploadedValue={centroMedicoFirmaImagen}
                onDrawnChange={setCentroMedicoFirmaDibujada}
                onUploadedChange={setCentroMedicoFirmaImagen}
              />
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

  if (esMedicoSetup) {
    const nombreCompleto = trabajador?.nombre_completo || usuario?.nombres || '';
    const cmp = medicoPerfilForm.watch('cmp') || '';
    const tituloSello = medicoPerfilForm.watch('titulo_sello') || 'MÉDICO OCUPACIONAL';

    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
          <div className="text-center mb-8">
            <Stethoscope className="w-12 h-12 text-primary mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Onboarding Médico Ocupacional
            </h1>
            <p className="text-slate-600">
              Complete sus datos profesionales, firma y sello para certificar exámenes médicos ocupacionales.
            </p>
          </div>

          <form
            onSubmit={medicoPerfilForm.handleSubmit(handleSubmitMedico)}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Número de colegiatura (CMP) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Ej. 12345"
                  {...medicoPerfilForm.register('cmp')}
                />
                {medicoPerfilForm.formState.errors.cmp && (
                  <p className="mt-1 text-sm text-red-600">{medicoPerfilForm.formState.errors.cmp.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  RNE (Registro Nacional de Especialistas) <span className="text-slate-400">(opcional)</span>
                </label>
                <input
                  type="text"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Ej. RNE-12345"
                  {...medicoPerfilForm.register('rne')}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Firma digital <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-slate-500 mb-2">
                Puede subir una foto de su firma manuscrita (PNG/JPG) o dibujarla. La imagen subida prevalece.
              </p>
              <MedicoSignatureInput
                drawnValue={medicoFirmaDibujada}
                uploadedValue={medicoFirmaImagen}
                onDrawnChange={setMedicoFirmaDibujada}
                onUploadedChange={setMedicoFirmaImagen}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Sello digital <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-slate-500 mb-2">
                Sello generado por el sistema (con su nombre y CMP) o suba su propio sello.
              </p>
              <MedicoSealInput
                nombreCompleto={nombreCompleto}
                cmp={cmp}
                tituloSello={tituloSello}
                firmaDataUrl={medicoFirmaImagen || medicoFirmaDibujada || null}
                value={medicoSello}
                onChange={setMedicoSello}
                onTituloSelloChange={(v) => medicoPerfilForm.setValue('titulo_sello', v)}
              />
            </div>

            {!usuario?.roles?.includes(UsuarioRol.CENTRO_MEDICO) && (
              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-sm font-semibold text-slate-800 mb-4">Tallas de EPP</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Talla de Casco *</label>
                    <Select {...medicoPerfilForm.register('talla_casco')}>
                      <option value="">Seleccione</option>
                      {tallasCasco.map((t) => <option key={t} value={t}>{t}</option>)}
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Talla de Camisa *</label>
                    <Select {...medicoPerfilForm.register('talla_camisa')}>
                      <option value="">Seleccione</option>
                      {tallasRopa.map((t) => <option key={t} value={t}>{t}</option>)}
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Talla de Pantalón *</label>
                    <Select {...medicoPerfilForm.register('talla_pantalon')}>
                      <option value="">Seleccione</option>
                      {tallasRopa.map((t) => <option key={t} value={t}>{t}</option>)}
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Talla de Calzado *</label>
                    <Select {...medicoPerfilForm.register('talla_calzado')}>
                      <option value="">Seleccione</option>
                      {tallasCalzado.map((t) => <option key={t} value={t}>{t}</option>)}
                    </Select>
                  </div>
                </div>
              </div>
            )}

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
          onSubmit={personalDataForm.handleSubmit(handleSubmitTrabajador)}
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
                  <option key={talla} value={talla}>{talla}</option>
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
                  <option key={talla} value={talla}>{talla}</option>
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
                  <option key={talla} value={talla}>{talla}</option>
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
                  <option key={talla} value={talla}>{talla}</option>
                ))}
              </Select>
              {personalDataForm.formState.errors.talla_camisa && (
                <p className="mt-1 text-sm text-danger">
                  {personalDataForm.formState.errors.talla_camisa.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Firma digital <span className="text-slate-400">(opcional)</span>
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Dibuje su firma con el mouse o el dedo. Se usará en registros de entrega de EPP.
            </p>
            <SignaturePad
              value={personalDataForm.watch('firma_digital_url')}
              onChange={(url) => personalDataForm.setValue('firma_digital_url', url)}
            />
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
