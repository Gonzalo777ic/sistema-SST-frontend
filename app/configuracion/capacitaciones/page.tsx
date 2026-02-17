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
import { trabajadoresService, Trabajador } from '@/services/trabajadores.service';
import { empresasService, Empresa, FirmaGerente } from '@/services/empresas.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Settings,
  GraduationCap,
  ArrowLeft,
  Save,
  Plus,
  Pencil,
  Trash2,
  Info,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

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
  const [busquedaResponsable, setBusquedaResponsable] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState<Trabajador[]>([]);
  const [isBuscandoResponsable, setIsBuscandoResponsable] = useState(false);
  const [mostrarDropdownResponsable, setMostrarDropdownResponsable] = useState(false);
  const [editandoTipo, setEditandoTipo] = useState<string | null>(null);
  const [editandoGrupo, setEditandoGrupo] = useState<string | null>(null);
  const [editandoUbicacion, setEditandoUbicacion] = useState<string | null>(null);

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [gerentesSstPorEmpresa, setGerentesSstPorEmpresa] = useState<Record<string, FirmaGerente[]>>({});

  useEffect(() => {
    loadConfig();
  }, []);

  const [gerentesRrhhPorEmpresa, setGerentesRrhhPorEmpresa] = useState<Record<string, FirmaGerente[]>>({});

  useEffect(() => {
    empresasService.findAll().then((list) => {
      setEmpresas(list);
      list.forEach((emp) => {
        empresasService.listarGerentes(emp.id).then((gerentes) => {
          const sst = gerentes.filter((g) => g.rol === 'SST' && g.activo);
          setGerentesSstPorEmpresa((prev) => ({ ...prev, [emp.id]: sst }));
          const rrhh = gerentes.filter((g) => g.rol === 'RRHH' && g.activo);
          setGerentesRrhhPorEmpresa((prev) => ({ ...prev, [emp.id]: rrhh }));
        }).catch(() => {
          setGerentesSstPorEmpresa((prev) => ({ ...prev, [emp.id]: [] }));
          setGerentesRrhhPorEmpresa((prev) => ({ ...prev, [emp.id]: [] }));
        });
      });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const q = busquedaResponsable.trim();
    if (q.length < 2) {
      setResultadosBusqueda([]);
      setMostrarDropdownResponsable(false);
      return;
    }
    const t = setTimeout(async () => {
      setIsBuscandoResponsable(true);
      try {
        const res = await trabajadoresService.buscar(usuario?.empresaId, q);
        setResultadosBusqueda(res);
        setMostrarDropdownResponsable(true);
      } catch {
        setResultadosBusqueda([]);
      } finally {
        setIsBuscandoResponsable(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [busquedaResponsable, usuario?.empresaId]);

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
        registro_asistencia: form.registro_asistencia,
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

  const agregarResponsableDesdeTrabajador = (t: Trabajador) => {
    const doc = t.documento_identidad || t.numero_documento || '';
    const tipo = t.tipo_documento || 'DNI';
    const yaAgregado = form.responsables_certificacion.some(
      (r) => r.numero_documento === doc || r.numero_documento === t.numero_documento
    );
    if (yaAgregado) {
      toast.error('Este trabajador ya está en la lista');
      return;
    }
    setForm((f) => ({
      ...f,
      responsables_certificacion: [
        ...f.responsables_certificacion,
        {
          nombre_completo: t.nombre_completo,
          numero_documento: doc,
          tipo_documento: tipo,
        },
      ],
    }));
    setBusquedaResponsable('');
    setResultadosBusqueda([]);
    setMostrarDropdownResponsable(false);
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

  const removeRegistroAsistencia = (idx: number) => {
    setForm((f) => ({
      ...f,
      registro_asistencia: f.registro_asistencia.filter((_, i) => i !== idx),
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

      {/* Gerente de RRHH */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Gerente de RRHH</h2>
        <div className="p-3 bg-sky-50 rounded-lg flex items-start gap-2 mb-4">
          <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
          <p className="text-sm text-sky-800">
            Gerentes de RRHH por razón social (solo lectura). Se configuran en{' '}
            <Link href="/empresas" className="underline font-medium hover:text-sky-900">
              Jerarquía Organizacional
            </Link>
            .
          </p>
        </div>
        <div className="space-y-6">
          {empresas.length === 0 ? (
            <p className="text-sm text-slate-500">No hay empresas registradas.</p>
          ) : (
            empresas.map((emp) => {
              const gerentes = gerentesRrhhPorEmpresa[emp.id] ?? [];
              return (
                <div key={emp.id} className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                    <p className="font-medium text-slate-900">{emp.nombre}</p>
                    <p className="text-xs text-slate-600">{emp.ruc}</p>
                  </div>
                  <div className="p-4">
                    {gerentes.length === 0 ? (
                      <p className="text-sm text-slate-500">Sin gerente de RRHH asignado</p>
                    ) : (
                      <div className="space-y-3">
                        {gerentes.map((g) => (
                          <div
                            key={g.id}
                            className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg border border-slate-100"
                          >
                            {g.firma_url && (
                              <img
                                src={g.firma_url}
                                alt="Firma"
                                className="h-12 w-20 object-contain border rounded bg-white"
                                referrerPolicy="no-referrer"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-900">{g.nombre_completo}</p>
                              <p className="text-sm text-slate-600">
                                Cargo: {g.cargo} · N° doc: {g.numero_documento}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Responsable de certificación */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Responsable de certificación</h2>
        <p className="text-sm text-slate-600 mb-3">
          Busca por nombre o DNI para agregar trabajadores como responsables de certificación.
        </p>
        <div className="mb-4">
          <div className="relative flex-1">
            <Input
              placeholder="Buscar por nombre o DNI (mín. 2 caracteres)"
              value={busquedaResponsable}
              onChange={(e) => setBusquedaResponsable(e.target.value)}
              onFocus={() => resultadosBusqueda.length > 0 && setMostrarDropdownResponsable(true)}
              onBlur={() => setTimeout(() => setMostrarDropdownResponsable(false), 200)}
            />
            {isBuscandoResponsable && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">Buscando...</span>
            )}
            {mostrarDropdownResponsable && resultadosBusqueda.length > 0 && (() => {
              const disponibles = resultadosBusqueda.filter(
                (t) =>
                  !form.responsables_certificacion.some(
                    (r) => r.numero_documento === (t.documento_identidad || t.numero_documento)
                  )
              );
              if (disponibles.length === 0) return null;
              return (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {disponibles.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-0"
                    onClick={() => agregarResponsableDesdeTrabajador(t)}
                  >
                    <p className="font-medium text-slate-900">{t.nombre_completo}</p>
                    <p className="text-sm text-slate-600">
                      N° de documento: {t.documento_identidad} · Tipo: {t.tipo_documento || 'DNI'}
                    </p>
                  </button>
                ))}
              </div>
              );
            })()}
          </div>
        </div>
        <div className="space-y-3">
          {form.responsables_certificacion.map((r, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div>
                <p className="font-medium text-slate-900">{r.nombre_completo}</p>
                <p className="text-sm text-slate-600">
                  N° de documento: {r.numero_documento} · Tipo: {r.tipo_documento}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                onClick={() => removeResponsable(i)}
              >
                <X className="w-4 h-4" />
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
            Gerentes SST por razón social (solo lectura). Se configuran en{' '}
            <Link href="/empresas" className="underline font-medium hover:text-sky-900">
              Jerarquía Organizacional
            </Link>
            .
          </p>
        </div>
        <div className="space-y-6">
          {empresas.length === 0 ? (
            <p className="text-sm text-slate-500">No hay empresas registradas.</p>
          ) : (
            empresas.map((emp) => {
              const gerentes = gerentesSstPorEmpresa[emp.id] ?? [];
              return (
                <div key={emp.id} className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                    <p className="font-medium text-slate-900">{emp.nombre}</p>
                    <p className="text-xs text-slate-600">{emp.ruc}</p>
                  </div>
                  <div className="p-4">
                    {gerentes.length === 0 ? (
                      <p className="text-sm text-slate-500">Sin gerente SST asignado</p>
                    ) : (
                      <div className="space-y-3">
                        {gerentes.map((g) => (
                          <div
                            key={g.id}
                            className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg border border-slate-100"
                          >
                            {g.firma_url && (
                              <img
                                src={g.firma_url}
                                alt="Firma"
                                className="h-12 w-20 object-contain border rounded bg-white"
                                referrerPolicy="no-referrer"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-900">{g.nombre_completo}</p>
                              <p className="text-sm text-slate-600">
                                Cargo: {g.cargo} · N° doc: {g.numero_documento}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Registro de Asistencia */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Registro de Asistencia</h2>
        <p className="text-sm text-slate-600 mb-4">
          Etiqueta metadato que se guarda en todos los registros de asistencia generados en el periodo establecido. Es opcional (no imprescindible para firmar), sirve para agrupar y etiquetar los registros en un periodo específico.
        </p>
        {form.registro_asistencia.map((r, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 p-4 border rounded-lg mb-4">
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
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                title="Eliminar"
                onClick={() => removeRegistroAsistencia(i)}
              >
                <X className="w-4 h-4" />
              </Button>
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
