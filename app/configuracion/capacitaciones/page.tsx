'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  configCapacitacionesService,
  IConfigCapacitaciones,
  ResponsableCertificacion,
  RegistroAsistenciaItem,
  FirmasCertificado,
} from '@/services/config-capacitaciones.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Settings,
  GraduationCap,
  ArrowLeft,
  Save,
  Plus,
  Pencil,
  Trash2,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

const TIPOS_DOCUMENTO = ['DNI', 'CARNE_EXTRANJERIA', 'PASAPORTE'];

export default function ConfigCapacitacionesPage() {
  const { usuario } = useAuth();
  const [config, setConfig] = useState<IConfigCapacitaciones | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    nota_minima_aprobatoria: 11,
    bloquear_evaluacion_nota_menor_igual: 0,
    limite_intentos: 3,
    bloquear_despues_aprobacion: true,
    habilitar_firma_solo_aprobados: false,
    habilitar_encuesta_satisfaccion: false,
    tipos: [] as string[],
    grupos: [] as string[],
    ubicaciones: [] as string[],
    responsables_certificacion: [] as ResponsableCertificacion[],
    registro_asistencia: [] as RegistroAsistenciaItem[],
    firmas_certificado: {
      responsable_rrhh: false,
      responsable_sst: false,
      capacitador: false,
      responsable_certificacion: false,
    } as FirmasCertificado,
  });

  const [nuevoTipo, setNuevoTipo] = useState('');
  const [nuevoGrupo, setNuevoGrupo] = useState('');
  const [nuevoUbicacion, setNuevoUbicacion] = useState('');
  const [nuevoResponsable, setNuevoResponsable] = useState<Partial<ResponsableCertificacion>>({});
  const [editandoTipo, setEditandoTipo] = useState<string | null>(null);
  const [editandoGrupo, setEditandoGrupo] = useState<string | null>(null);
  const [editandoUbicacion, setEditandoUbicacion] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const data = await configCapacitacionesService.getConfig();
      setConfig(data);
      setForm({
        nota_minima_aprobatoria: data.nota_minima_aprobatoria,
        bloquear_evaluacion_nota_menor_igual: data.bloquear_evaluacion_nota_menor_igual,
        limite_intentos: data.limite_intentos,
        bloquear_despues_aprobacion: data.bloquear_despues_aprobacion,
        habilitar_firma_solo_aprobados: data.habilitar_firma_solo_aprobados,
        habilitar_encuesta_satisfaccion: data.habilitar_encuesta_satisfaccion,
        tipos: data.tipos ?? [],
        grupos: data.grupos ?? [],
        ubicaciones: data.ubicaciones ?? [],
        responsables_certificacion: data.responsables_certificacion ?? [],
        registro_asistencia: data.registro_asistencia ?? [],
        firmas_certificado: data.firmas_certificado ?? {
          responsable_rrhh: false,
          responsable_sst: false,
          capacitador: false,
          responsable_certificacion: false,
        },
      });
    } catch (error: any) {
      toast.error('Error al cargar configuración', {
        description: error.response?.data?.message || 'No se pudo cargar',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuardar = async () => {
    try {
      setIsSaving(true);
      await configCapacitacionesService.updateConfig({
        nota_minima_aprobatoria: form.nota_minima_aprobatoria,
        bloquear_evaluacion_nota_menor_igual: form.bloquear_evaluacion_nota_menor_igual,
        limite_intentos: form.limite_intentos,
        bloquear_despues_aprobacion: form.bloquear_despues_aprobacion,
        habilitar_firma_solo_aprobados: form.habilitar_firma_solo_aprobados,
        habilitar_encuesta_satisfaccion: form.habilitar_encuesta_satisfaccion,
        tipos: form.tipos,
        grupos: form.grupos,
        ubicaciones: form.ubicaciones,
        responsables_certificacion: form.responsables_certificacion,
        registro_asistencia: form.registro_asistencia.length > 0 ? form.registro_asistencia : undefined,
        firmas_certificado: form.firmas_certificado,
      });
      toast.success('Configuración guardada');
      loadConfig();
    } catch (error: any) {
      toast.error('Error al guardar', {
        description: error.response?.data?.message || 'No se pudo guardar',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addTipo = () => {
    const v = nuevoTipo.trim().toUpperCase();
    if (v && !form.tipos.includes(v)) {
      setForm((f) => ({ ...f, tipos: [...f.tipos, v] }));
      setNuevoTipo('');
    }
  };

  const addGrupo = () => {
    const v = nuevoGrupo.trim();
    if (v && !form.grupos.includes(v)) {
      setForm((f) => ({ ...f, grupos: [...f.grupos, v] }));
      setNuevoGrupo('');
    }
  };

  const addUbicacion = () => {
    const v = nuevoUbicacion.trim();
    if (v && !form.ubicaciones.includes(v)) {
      setForm((f) => ({ ...f, ubicaciones: [...f.ubicaciones, v] }));
      setNuevoUbicacion('');
    }
  };

  const addResponsable = () => {
    const { nombre_completo, numero_documento, tipo_documento } = nuevoResponsable;
    if (nombre_completo?.trim() && numero_documento?.trim() && tipo_documento) {
      setForm((f) => ({
        ...f,
        responsables_certificacion: [
          ...f.responsables_certificacion,
          { nombre_completo: nombre_completo.trim(), numero_documento: numero_documento.trim(), tipo_documento },
        ],
      }));
      setNuevoResponsable({});
    } else {
      toast.error('Complete nombre, documento y tipo');
    }
  };

  const removeTipo = (idx: number) => {
    setForm((f) => ({ ...f, tipos: f.tipos.filter((_, i) => i !== idx) }));
  };

  const removeGrupo = (idx: number) => {
    setForm((f) => ({ ...f, grupos: f.grupos.filter((_, i) => i !== idx) }));
  };

  const removeUbicacion = (idx: number) => {
    setForm((f) => ({ ...f, ubicaciones: f.ubicaciones.filter((_, i) => i !== idx) }));
  };

  const removeResponsable = (idx: number) => {
    setForm((f) => ({
      ...f,
      responsables_certificacion: f.responsables_certificacion.filter((_, i) => i !== idx),
    }));
  };

  const addRegistroAsistencia = () => {
    setForm((f) => ({
      ...f,
      registro_asistencia: [
        ...f.registro_asistencia,
        {
          codigo_documento: '',
          version: '01',
          fecha_version: new Date().toISOString().split('T')[0],
          vigencia_inicio: '',
          vigencia_fin: '',
        },
      ],
    }));
  };

  const updateRegistroAsistencia = (idx: number, field: keyof RegistroAsistenciaItem, value: string) => {
    setForm((f) => ({
      ...f,
      registro_asistencia: f.registro_asistencia.map((r, i) =>
        i === idx ? { ...r, [field]: value } : r
      ),
    }));
  };

  if (!usuario) return null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 bg-slate-200 rounded animate-pulse" />
        <div className="h-96 bg-slate-100 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/capacitaciones">
            <Button variant="ghost" size="sm" className="text-slate-600">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Regresar
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Settings className="w-7 h-7 text-primary" />
            <h1 className="text-2xl font-bold text-slate-900">Configuración de Capacitaciones</h1>
          </div>
        </div>
        <Button variant="primary" onClick={handleGuardar} disabled={isSaving}>
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>

      {/* Evaluación */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Configuración de evaluación</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nota mínima aprobatoria</label>
            <Input
              type="number"
              min={0}
              max={20}
              value={form.nota_minima_aprobatoria}
              onChange={(e) => setForm((f) => ({ ...f, nota_minima_aprobatoria: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Bloquear evaluación si la nota es menor o igual a
            </label>
            <Input
              type="number"
              min={0}
              value={form.bloquear_evaluacion_nota_menor_igual}
              onChange={(e) =>
                setForm((f) => ({ ...f, bloquear_evaluacion_nota_menor_igual: parseInt(e.target.value) || 0 }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Límite de intentos</label>
            <Input
              type="number"
              min={1}
              value={form.limite_intentos}
              onChange={(e) => setForm((f) => ({ ...f, limite_intentos: parseInt(e.target.value) || 1 }))}
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.bloquear_despues_aprobacion}
                onChange={(e) => setForm((f) => ({ ...f, bloquear_despues_aprobacion: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              <span className="ml-3 text-sm font-medium text-slate-700">¿Bloquear después de aprobación?</span>
            </label>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.habilitar_firma_solo_aprobados}
                onChange={(e) => setForm((f) => ({ ...f, habilitar_firma_solo_aprobados: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              <span className="ml-3 text-sm font-medium text-slate-700">¿Habilitar firma solo para aprobados?</span>
            </label>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.habilitar_encuesta_satisfaccion}
                onChange={(e) =>
                  setForm((f) => ({ ...f, habilitar_encuesta_satisfaccion: e.target.checked }))
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              <span className="ml-3 text-sm font-medium text-slate-700">
                ¿Habilitar encuesta de satisfacción en las instrucciones de cada capacitación?
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Tipo */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Tipo</h2>
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Nombre de tipo"
            value={nuevoTipo}
            onChange={(e) => setNuevoTipo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTipo())}
          />
          <Button variant="primary" size="sm" onClick={addTipo}>
            Agregar
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {form.tipos.map((t, i) => (
            <div key={i} className="flex items-center gap-2 p-2 border rounded-lg">
              {editandoTipo === t ? (
                <>
                  <Input
                    defaultValue={t}
                    onBlur={(e) => {
                      const v = e.target.value.trim().toUpperCase();
                      if (v) {
                        setForm((f) => ({
                          ...f,
                          tipos: f.tipos.map((x, j) => (j === i ? v : x)),
                        }));
                      }
                      setEditandoTipo(null);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                    autoFocus
                  />
                </>
              ) : (
                <>
                  <span className="flex-1 font-medium">{t}</span>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setEditandoTipo(t)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600" onClick={() => removeTipo(i)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Grupo */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Grupo</h2>
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Nombre de grupo"
            value={nuevoGrupo}
            onChange={(e) => setNuevoGrupo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addGrupo())}
          />
          <Button variant="primary" size="sm" onClick={addGrupo}>
            Agregar
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {form.grupos.map((g, i) => (
            <div key={i} className="flex items-center gap-2 p-2 border rounded-lg">
              {editandoGrupo === g ? (
                <Input
                  defaultValue={g}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v) {
                      setForm((f) => ({
                        ...f,
                        grupos: f.grupos.map((x, j) => (j === i ? v : x)),
                      }));
                    }
                    setEditandoGrupo(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                  autoFocus
                />
              ) : (
                <>
                  <span className="flex-1 font-medium">{g}</span>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setEditandoGrupo(g)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600" onClick={() => removeGrupo(i)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Ubicación */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Ubicación</h2>
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Nombre de ubicación"
            value={nuevoUbicacion}
            onChange={(e) => setNuevoUbicacion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addUbicacion())}
          />
          <Button variant="primary" size="sm" onClick={addUbicacion}>
            Agregar
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {form.ubicaciones.map((u, i) => (
            <div key={i} className="flex items-center gap-2 p-2 border rounded-lg">
              {editandoUbicacion === u ? (
                <Input
                  defaultValue={u}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v) {
                      setForm((f) => ({
                        ...f,
                        ubicaciones: f.ubicaciones.map((x, j) => (j === i ? v : x)),
                      }));
                    }
                    setEditandoUbicacion(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                  autoFocus
                />
              ) : (
                <>
                  <span className="flex-1 font-medium">{u}</span>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setEditandoUbicacion(u)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600" onClick={() => removeUbicacion(i)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Responsable de certificación */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Responsable de certificación</h2>
        <div className="space-y-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Nombre completo"
              value={nuevoResponsable.nombre_completo ?? ''}
              onChange={(e) => setNuevoResponsable((r) => ({ ...r, nombre_completo: e.target.value }))}
            />
            <Input
              placeholder="N° de documento"
              value={nuevoResponsable.numero_documento ?? ''}
              onChange={(e) => setNuevoResponsable((r) => ({ ...r, numero_documento: e.target.value }))}
            />
            <Select
              value={nuevoResponsable.tipo_documento ?? ''}
              onChange={(e) => setNuevoResponsable((r) => ({ ...r, tipo_documento: e.target.value }))}
            >
              <option value="">Tipo de documento</option>
              {TIPOS_DOCUMENTO.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </div>
          <Button variant="primary" size="sm" onClick={addResponsable}>
            <Plus className="w-4 h-4 mr-2" />
            Agregar
          </Button>
        </div>
        <div className="space-y-3">
          {form.responsables_certificacion.map((r, i) => (
            <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">{r.nombre_completo}</p>
                <p className="text-sm text-slate-600">
                  N° de documento: {r.numero_documento} · Tipo: {r.tipo_documento}
                </p>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600" onClick={() => removeResponsable(i)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Responsable de registro */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Responsable de registro</h2>
        <div className="p-3 bg-sky-50 rounded-lg flex items-start gap-2 mb-4">
          <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
          <p className="text-sm text-sky-800">
            Nota: Proviene del rol SST dentro de la razón social.{' '}
            <Link href="/gestion-usuarios" className="underline font-medium hover:text-sky-900">
              Haz click aquí para ver el detalle
            </Link>
          </p>
        </div>
        <div className="space-y-3 text-slate-600"> 
          <p className="text-sm">Los responsables de registro se configuran desde la gestión de usuarios, asignando el rol SST a los usuarios de cada razón social.</p>
        </div>
      </div>

      {/* Registro de Asistencia */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Registro de Asistencia</h2>
        <p className="text-sm text-slate-600 mb-4">
          Documento que muestra los registros de asistencia de los participantes de una capacitación.
        </p>
        {form.registro_asistencia.map((r, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4 border rounded-lg mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Código Documento *</label>
              <Input
                placeholder="Ej. FOR-SST-005"
                value={r.codigo_documento}
                onChange={(e) => updateRegistroAsistencia(i, 'codigo_documento', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Versión *</label>
              <Input
                value={r.version}
                onChange={(e) => updateRegistroAsistencia(i, 'version', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Versión</label>
              <Input
                type="date"
                value={r.fecha_version}
                onChange={(e) => updateRegistroAsistencia(i, 'fecha_version', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vigencia Inicio</label>
              <Input
                type="date"
                value={r.vigencia_inicio}
                onChange={(e) => updateRegistroAsistencia(i, 'vigencia_inicio', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vigencia Fin</label>
              <Input
                type="date"
                value={r.vigencia_fin}
                onChange={(e) => updateRegistroAsistencia(i, 'vigencia_fin', e.target.value)}
              />
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addRegistroAsistencia}>
          <Plus className="w-4 h-4 mr-2" />
          Añadir Versión/Documento
        </Button>
      </div>

      {/* Firmas Certificado de Participación */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Firmas Certificado de Participación</h2>
        <div className="space-y-3">
          {[
            { key: 'responsable_rrhh' as const, label: 'Responsable de RRHH (viene de razón social)' },
            { key: 'responsable_sst' as const, label: 'Responsable de SST (viene de razón social)' },
            { key: 'capacitador' as const, label: 'Capacitador (viene de la capacitación)' },
            { key: 'responsable_certificacion' as const, label: 'Responsable de certificación' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.firmas_certificado[key]}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    firmas_certificado: { ...f.firmas_certificado, [key]: e.target.checked },
                  }))
                }
                className="w-4 h-4 rounded border-slate-300"
              />
              <span className="text-sm font-medium text-slate-700">{label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
