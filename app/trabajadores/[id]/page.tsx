'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  trabajadoresService,
  Trabajador,
  TipoDocumento,
  UpdateTrabajadorDto,
} from '@/services/trabajadores.service';
import { empresasService } from '@/services/empresas.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { UsuarioRol } from '@/types';
import {
  ArrowLeft,
  User,
  Phone,
  Briefcase,
  Save,
  FileText,
  GraduationCap,
  AlertTriangle,
  Stethoscope,
  MessageSquare,
  Upload,
  Camera,
  Check,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  getDepartamentos,
  getProvincias,
  getDistritos,
  getDepartamentoCodigoByNombre,
  getProvinciaCodigoByNombre,
  UbigeoItem,
} from '@/lib/ubigeo';

const LABEL_TIPO_DOC: Record<TipoDocumento, string> = {
  [TipoDocumento.DNI]: 'DNI',
  [TipoDocumento.CARNE_EXTRANJERIA]: 'Carné de Extranjería',
  [TipoDocumento.PASAPORTE]: 'Pasaporte',
};

const PAISES = [{ codigo: 'PE', nombre: 'Perú' }];

const formSchema = z.object({
  nombres: z.string().min(1, 'Requerido'),
  apellido_paterno: z.string().min(1, 'Requerido'),
  apellido_materno: z.string().optional(),
  fecha_nacimiento: z.string().optional(),
  sexo: z.string().optional(),
  email_personal: z.string().email('Correo inválido').optional().or(z.literal('')),
  email_corporativo: z.string().email('Correo inválido').optional().or(z.literal('')),
  telefono: z.string().optional(),
  pais: z.string().optional(),
  departamento: z.string().optional(),
  provincia: z.string().optional(),
  distrito: z.string().optional(),
  direccion: z.string().optional(),
  contacto_emergencia_nombre: z.string().optional(),
  contacto_emergencia_telefono: z.string().optional(),
  jefe_directo: z.string().optional(),
  sede: z.string().optional(),
  unidad: z.string().optional(),
  area_id: z.string().optional(),
  cargo: z.string().min(1, 'Requerido'),
  puesto: z.string().optional(),
  centro_costos: z.string().optional(),
  nivel_exposicion: z.string().optional(),
  tipo_usuario: z.string().optional(),
  seguro_atencion_medica: z.string().optional(),
  fecha_ingreso: z.string().min(1, 'Requerido'),
  modalidad_contrato: z.string().optional(),
  gerencia: z.string().optional(),
  puesto_capacitacion: z.string().optional(),
  protocolos_emo: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
        <Icon className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default function TrabajadorDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [trabajador, setTrabajador] = useState<Trabajador | null>(null);
  const [empresas, setEmpresas] = useState<{ id: string; nombre: string }[]>([]);
  const [areas, setAreas] = useState<{ id: string; nombre: string }[]>([]);
  const [departamentos, setDepartamentos] = useState<UbigeoItem[]>([]);
  const [provincias, setProvincias] = useState<UbigeoItem[]>([]);
  const [distritos, setDistritos] = useState<UbigeoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fotoFile, setFotoFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  const watchDepartamento = watch('departamento');
  const watchProvincia = watch('provincia');

  const loadTrabajador = useCallback(async () => {
    if (!id) return;
    const t = await trabajadoresService.findOne(id);
    setTrabajador(t);
    reset({
      nombres: t.nombres ?? '',
      apellido_paterno: t.apellido_paterno ?? '',
      apellido_materno: t.apellido_materno ?? '',
      fecha_nacimiento: t.fecha_nacimiento ? t.fecha_nacimiento.toString().slice(0, 10) : '',
      sexo: t.sexo ?? '',
      email_personal: t.email_personal ?? '',
      email_corporativo: t.email_corporativo ?? '',
      telefono: t.telefono ?? '',
      pais: t.pais ?? 'Perú',
      departamento: t.departamento ?? '',
      provincia: t.provincia ?? '',
      distrito: t.distrito ?? '',
      direccion: t.direccion ?? '',
      contacto_emergencia_nombre: t.contacto_emergencia_nombre ?? '',
      contacto_emergencia_telefono: t.contacto_emergencia_telefono ?? '',
      jefe_directo: t.jefe_directo ?? '',
      sede: t.sede ?? '',
      unidad: t.unidad ?? '',
      area_id: t.area_id ?? '',
      cargo: t.cargo ?? '',
      puesto: t.puesto ?? '',
      centro_costos: t.centro_costos ?? '',
      nivel_exposicion: t.nivel_exposicion ?? '',
      tipo_usuario: t.tipo_usuario ?? '',
      seguro_atencion_medica: t.seguro_atencion_medica ?? '',
      fecha_ingreso: t.fecha_ingreso ? t.fecha_ingreso.toString().slice(0, 10) : '',
      modalidad_contrato: t.modalidad_contrato ?? '',
      gerencia: t.gerencia ?? '',
      puesto_capacitacion: t.puesto_capacitacion ?? '',
      protocolos_emo: t.protocolos_emo ?? '',
    });
    if (t.empresa_id) {
      empresasService.findAreas(t.empresa_id).then(setAreas).catch(() => setAreas([]));
    }
  }, [id, reset]);

  useEffect(() => {
    if (id) {
      loadTrabajador()
        .catch(() => {
          toast.error('No se pudo cargar el trabajador');
          router.push('/trabajadores');
        })
        .finally(() => setIsLoading(false));
      empresasService.findAll().then((e) => setEmpresas(e.map((x) => ({ id: x.id, nombre: x.nombre })))).catch(() => []);
    }
  }, [id, router, loadTrabajador]);

  useEffect(() => {
    getDepartamentos().then(setDepartamentos).catch(() => setDepartamentos([]));
  }, []);

  useEffect(() => {
    if (!watchDepartamento) {
      setProvincias([]);
      setDistritos([]);
      setValue('provincia', '');
      setValue('distrito', '');
      return;
    }
    getDepartamentoCodigoByNombre(watchDepartamento).then((cod) => {
      if (cod) getProvincias(cod).then(setProvincias).catch(() => setProvincias([]));
      else setProvincias([]);
    });
    setValue('provincia', '');
    setValue('distrito', '');
    setDistritos([]);
  }, [watchDepartamento, setValue]);

  useEffect(() => {
    if (!watchDepartamento || !watchProvincia) {
      setDistritos([]);
      setValue('distrito', '');
      return;
    }
    getDepartamentoCodigoByNombre(watchDepartamento).then((deptCod) => {
      if (deptCod)
        getProvinciaCodigoByNombre(deptCod, watchProvincia).then((provCod) => {
          if (provCod) getDistritos(deptCod, provCod).then(setDistritos).catch(() => setDistritos([]));
          else setDistritos([]);
        });
      else setDistritos([]);
    });
    setValue('distrito', '');
  }, [watchDepartamento, watchProvincia, setValue]);

  useEffect(() => {
    if (trabajador?.empresa_id && areas.length === 0) {
      empresasService.findAreas(trabajador.empresa_id).then(setAreas).catch(() => setAreas([]));
    }
  }, [trabajador?.empresa_id, areas.length]);

  const [fotoObjectUrl, setFotoObjectUrl] = useState<string | null>(null);
  useEffect(() => {
    if (fotoFile) {
      const url = URL.createObjectURL(fotoFile);
      setFotoObjectUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setFotoObjectUrl(null);
  }, [fotoFile]);

  const onSubmit = async (data: FormData) => {
    if (!id || !trabajador) return;
    setIsSaving(true);
    try {
      if (fotoFile) {
        const { url } = await trabajadoresService.uploadFoto(id, fotoFile);
        setFotoFile(null);
      }
      const payload: UpdateTrabajadorDto = {
        nombres: data.nombres,
        apellido_paterno: data.apellido_paterno,
        apellido_materno: data.apellido_materno || undefined,
        fecha_nacimiento: data.fecha_nacimiento || undefined,
        sexo: data.sexo || undefined,
        email: data.email_personal || undefined,
        email_corporativo: data.email_corporativo || undefined,
        telefono: data.telefono || undefined,
        pais: data.pais || undefined,
        departamento: data.departamento || undefined,
        provincia: data.provincia || undefined,
        distrito: data.distrito || undefined,
        direccion: data.direccion || undefined,
        contacto_emergencia_nombre: data.contacto_emergencia_nombre || undefined,
        contacto_emergencia_telefono: data.contacto_emergencia_telefono || undefined,
        jefe_directo: data.jefe_directo || undefined,
        sede: data.sede || undefined,
        unidad: data.unidad || undefined,
        area_id: data.area_id || undefined,
        cargo: data.cargo,
        puesto: data.puesto || undefined,
        centro_costos: data.centro_costos || undefined,
        nivel_exposicion: data.nivel_exposicion || undefined,
        tipo_usuario: data.tipo_usuario || undefined,
        seguro_atencion_medica: data.seguro_atencion_medica || undefined,
        fecha_ingreso: data.fecha_ingreso,
        modalidad_contrato: data.modalidad_contrato || undefined,
        gerencia: data.gerencia || undefined,
        puesto_capacitacion: data.puesto_capacitacion || undefined,
        protocolos_emo: data.protocolos_emo || undefined,
      };
      await trabajadoresService.update(id, payload);
      toast.success('Cambios guardados');
      loadTrabajador();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\/(jpeg|png|webp|gif)$/i.test(f.type)) {
      toast.error('Seleccione una imagen válida (JPEG, PNG, WebP o GIF)');
      return;
    }
    const maxSize = 2 * 1024 * 1024; // 2 MB
    if (f.size > maxSize) {
      toast.error('La imagen no debe superar 2 MB');
      return;
    }
    setFotoFile(f);
  };

  if (isLoading || !trabajador) {
    return (
      <ProtectedRoute allowedRoles={[UsuarioRol.SUPER_ADMIN, UsuarioRol.ADMIN_EMPRESA, UsuarioRol.INGENIERO_SST]}>
        <div className="p-8 text-center">Cargando...</div>
      </ProtectedRoute>
    );
  }

  const nombreCompleto =
    [trabajador.apellido_paterno, trabajador.apellido_materno, trabajador.nombres]
      .filter(Boolean)
      .join(' ') || trabajador.nombre_completo;

  const fotoPreview = fotoObjectUrl || trabajador.foto_url;

  return (
    <ProtectedRoute
      allowedRoles={[UsuarioRol.SUPER_ADMIN, UsuarioRol.ADMIN_EMPRESA, UsuarioRol.INGENIERO_SST]}
    >
      <div className="space-y-6 min-w-0 max-w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Link href="/trabajadores">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Regresar
            </Button>
          </Link>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info('EMOS: Próximamente')}
            >
              <Stethoscope className="w-4 h-4 mr-2" />
              EMOS
            </Button>
            <Link href="/capacitaciones">
              <Button variant="outline" size="sm">
                <GraduationCap className="w-4 h-4 mr-2" />
                Capacitaciones
              </Button>
            </Link>
            <Link href="/incidentes">
              <Button variant="outline" size="sm">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Accidentes/Incidentes
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info('Documentos: Próximamente')}
            >
              <FileText className="w-4 h-4 mr-2" />
              Documentos
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info('Notas: Próximamente')}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Notas
            </Button>
          </div>
        </div>

        {/* Cabecera: foto, nombre, DNI, empresa */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 flex flex-col sm:flex-row gap-6">
          <div className="flex-shrink-0">
            <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
              {fotoPreview ? (
                <img
                  src={fotoPreview}
                  alt={nombreCompleto}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Camera className="w-12 h-12 text-slate-400" />
                </div>
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                <Upload className="w-8 h-8 text-white" />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleFotoChange}
                />
              </label>
            </div>
            <p className="text-xs text-slate-500 mt-2 text-center">Foto (opcional, máx. 2 MB)</p>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-slate-900">{nombreCompleto}</h1>
            <p className="text-slate-600 mt-1">
              DNI: <strong>{trabajador.numero_documento || trabajador.documento_identidad}</strong>
            </p>
            <p className="text-slate-600">
              {trabajador.empresa_nombre || '-'}
            </p>
          </div>
          <div className="flex items-center">
            <Button
              onClick={handleSubmit(onSubmit)}
              disabled={isSaving || (!isDirty && !fotoFile)}
              className="bg-primary hover:bg-primary/90"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard title="Datos Personales" icon={User}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombres *</label>
                  <Input {...register('nombres')} />
                  {errors.nombres && <p className="mt-1 text-sm text-red-600">{errors.nombres.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Apellido Paterno *</label>
                  <Input {...register('apellido_paterno')} />
                  {errors.apellido_paterno && <p className="mt-1 text-sm text-red-600">{errors.apellido_paterno.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Apellido Materno</label>
                  <Input {...register('apellido_materno')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Documento *</label>
                  <Input
                    value={trabajador.tipo_documento ? LABEL_TIPO_DOC[trabajador.tipo_documento as TipoDocumento] : ''}
                    disabled
                    className="bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nro de Documento *</label>
                  <Input
                    value={trabajador.numero_documento || trabajador.documento_identidad}
                    disabled
                    className="bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Nacimiento</label>
                  <Input {...register('fecha_nacimiento')} type="date" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sexo</label>
                  <Select {...register('sexo')}>
                    <option value="">Seleccione</option>
                    <option value="MASCULINO">Masculino</option>
                    <option value="FEMENINO">Femenino</option>
                    <option value="OTRO">Otro</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Correo electrónico personal</label>
                  <Input {...register('email_personal')} type="email" />
                  {errors.email_personal && <p className="mt-1 text-sm text-red-600">{errors.email_personal.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Correo electrónico corporativo</label>
                  <Input {...register('email_corporativo')} type="email" />
                  {errors.email_corporativo && <p className="mt-1 text-sm text-red-600">{errors.email_corporativo.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Firma digital</label>
                  <div className="flex items-center gap-2 mt-1">
                    {trabajador.firma_digital_url ? (
                      <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600">
                        <Check className="w-4 h-4" />
                        Firma registrada
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                        <X className="w-4 h-4" />
                        Sin firma registrada
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">El trabajador la gestiona en su configuración de cuenta.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                  <Input {...register('telefono')} type="tel" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">País</label>
                  <Select {...register('pais')}>
                    <option value="">Seleccione</option>
                    {PAISES.map((p) => (
                      <option key={p.codigo} value={p.nombre}>{p.nombre}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Departamento</label>
                  <Select {...register('departamento')}>
                    <option value="">Seleccione</option>
                    {departamentos.map((d) => (
                      <option key={d.codigo} value={d.nombre}>{d.nombre}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Provincia</label>
                  <Select {...register('provincia')} disabled={!watchDepartamento}>
                    <option value="">Seleccione</option>
                    {provincias.map((d) => (
                      <option key={d.codigo} value={d.nombre}>{d.nombre}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Distrito</label>
                  <Select {...register('distrito')} disabled={!watchProvincia}>
                    <option value="">Seleccione</option>
                    {distritos.map((d) => (
                      <option key={d.codigo} value={d.nombre}>{d.nombre}</option>
                    ))}
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
                  <Input {...register('direccion')} />
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Datos de Contacto (Emergencia)" icon={Phone}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre y apellido</label>
                  <Input {...register('contacto_emergencia_nombre')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                  <Input {...register('contacto_emergencia_telefono')} type="tel" />
                </div>
              </div>
            </SectionCard>

            <div className="lg:col-span-2">
              <SectionCard title="Datos Laborales" icon={Briefcase}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Jefe Directo</label>
                    <Input {...register('jefe_directo')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Sede *</label>
                    <Input {...register('sede')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Unidad *</label>
                    <Input {...register('unidad')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Área *</label>
                    <Select {...register('area_id')}>
                      <option value="">Seleccione</option>
                      {areas.map((a) => (
                        <option key={a.id} value={a.id}>{a.nombre}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Puesto</label>
                    <Input {...register('puesto')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cargo *</label>
                    <Input {...register('cargo')} />
                    {errors.cargo && <p className="mt-1 text-sm text-red-600">{errors.cargo.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Centro de Costos</label>
                    <Input {...register('centro_costos')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nivel de Exposición</label>
                    <Input {...register('nivel_exposicion')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Usuario *</label>
                    <Input {...register('tipo_usuario')} placeholder="Ej: CONTRATADO" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Seguro de atención médica</label>
                    <Input {...register('seguro_atencion_medica')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de ingreso *</label>
                    <Input {...register('fecha_ingreso')} type="date" />
                    {errors.fecha_ingreso && <p className="mt-1 text-sm text-red-600">{errors.fecha_ingreso.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Modalidad de Contrato</label>
                    <Input {...register('modalidad_contrato')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Gerencia</label>
                    <Input {...register('gerencia')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Razón Social *</label>
                    <Input value={trabajador.empresa_nombre || ''} disabled className="bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Puesto de capacitación</label>
                    <Input {...register('puesto_capacitacion')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Protocolos de EMO</label>
                    <Input {...register('protocolos_emo')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Empresas</label>
                    <Select disabled className="bg-slate-50">
                      <option>{trabajador.empresa_nombre || '-'}</option>
                    </Select>
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}
