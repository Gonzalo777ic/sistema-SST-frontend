'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  capacitacionesService,
  Capacitacion,
  EstadoCapacitacion,
  TipoCapacitacion,
} from '@/services/capacitaciones.service';
import { empresasService, Empresa, FirmaGerente } from '@/services/empresas.service';
import { areasService, Area } from '@/services/areas.service';
import { estructuraService, EstructuraItem } from '@/services/estructura.service';
import { configCapacitacionesService } from '@/services/config-capacitaciones.service';
import { trabajadoresService, Trabajador } from '@/services/trabajadores.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Download,
  Save,
  Users,
  FileCheck,
  Award,
  PenLine,
  FileText,
  Info,
  ListChecks,
  UserPlus,
  Plus,
  Trash2,
  Upload,
  FolderOpen,
  ChevronDown,
  Bell,
  CheckCircle,
  RotateCcw,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';

const TIPOS = Object.values(TipoCapacitacion);
const NOTA_MINIMA_APROBATORIA = 11;
const ID_PASO_FIRMA = 'firma-registro-participacion';

interface PreguntaEvaluacion {
  id: string;
  texto: string;
  opciones: string[];
  respuestaCorrecta: number;
}

function EvaluacionFormContent({
  preguntas,
  setPreguntas,
  onClose,
  onGuardar,
  pasoId,
  evaluacionesFavoritas,
  onGuardarFavorita,
  onUsarFavorita,
}: {
  preguntas: PreguntaEvaluacion[];
  setPreguntas: React.Dispatch<React.SetStateAction<PreguntaEvaluacion[]>>;
  onClose: () => void;
  onGuardar?: (preguntas: PreguntaEvaluacion[], nombreFormulario: string) => void;
  pasoId?: string | null;
  evaluacionesFavoritas?: { id: string; nombre: string; preguntas: any[] }[];
  onGuardarFavorita?: (nombre: string, preguntas: PreguntaEvaluacion[]) => Promise<void>;
  onUsarFavorita?: (preguntas: any[]) => void;
}) {
  const [nombreFormulario, setNombreFormulario] = useState('');
  const [guardandoFavorita, setGuardandoFavorita] = useState(false);
  const [favoritaSeleccionada, setFavoritaSeleccionada] = useState('');

  const addPregunta = () => {
    setPreguntas((prev) => [
      ...prev,
      { id: crypto.randomUUID(), texto: '', opciones: ['', ''], respuestaCorrecta: 0 },
    ]);
  };

  const removePregunta = (id: string) => {
    setPreguntas((prev) => prev.filter((p) => p.id !== id));
  };

  const addOpcion = (preguntaId: string) => {
    setPreguntas((prev) =>
      prev.map((p) => (p.id === preguntaId ? { ...p, opciones: [...p.opciones, ''] } : p))
    );
  };

  const removeOpcion = (preguntaId: string, index: number) => {
    setPreguntas((prev) =>
      prev.map((p) => {
        if (p.id !== preguntaId) return p;
        const nuevasOpciones = p.opciones.filter((_, i) => i !== index);
        const nuevaCorrecta = p.respuestaCorrecta >= index && p.respuestaCorrecta > 0
          ? p.respuestaCorrecta - 1
          : Math.min(p.respuestaCorrecta, nuevasOpciones.length - 1);
        return { ...p, opciones: nuevasOpciones, respuestaCorrecta: Math.max(0, nuevaCorrecta) };
      })
    );
  };

  const updatePregunta = (id: string, campo: keyof PreguntaEvaluacion, valor: any) => {
    setPreguntas((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [campo]: valor } : p))
    );
  };

  const updateOpcion = (preguntaId: string, index: number, valor: string) => {
    setPreguntas((prev) =>
      prev.map((p) =>
        p.id === preguntaId
          ? { ...p, opciones: p.opciones.map((o, i) => (i === index ? valor : o)) }
          : p
      )
    );
  };

  return (
    <div className="space-y-4">
      {evaluacionesFavoritas && evaluacionesFavoritas.length > 0 && onUsarFavorita && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Usar evaluación favorita</label>
          <div className="flex gap-2">
            <Select
              className="flex-1"
              value={favoritaSeleccionada}
              onChange={(e) => {
                const id = e.target.value;
                setFavoritaSeleccionada(id);
                if (!id) return;
                const fav = evaluacionesFavoritas.find((f) => f.id === id);
                if (fav?.preguntas?.length) onUsarFavorita(fav.preguntas);
              }}
            >
              <option value="">Seleccione una evaluación guardada</option>
              {evaluacionesFavoritas.map((f) => (
                <option key={f.id} value={f.id}>{f.nombre}</option>
              ))}
            </Select>
          </div>
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de formulario</label>
        <Input value={nombreFormulario} onChange={(e) => setNombreFormulario(e.target.value)} placeholder="Ej: Evaluación de eficacia" />
      </div>
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={addPregunta}>
          <Plus className="w-4 h-4 mr-1" /> Agregar Pregunta
        </Button>
      </div>
      <div className="space-y-4">
        {preguntas.map((p, idx) => (
          <div key={p.id} className="border border-slate-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Pregunta {idx + 1}</span>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600" onClick={() => removePregunta(p.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-slate-700 mb-1">Pregunta *</label>
              <Input
                value={p.texto}
                onChange={(e) => updatePregunta(p.id, 'texto', e.target.value)}
                placeholder={`Texto de la pregunta ${idx + 1}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Opciones</label>
              <div className="space-y-2">
                {p.opciones.map((op, oi) => (
                  <div key={oi} className="flex gap-2 items-center">
                    <input
                      type="radio"
                      name={`p-${p.id}`}
                      checked={p.respuestaCorrecta === oi}
                      onChange={() => updatePregunta(p.id, 'respuestaCorrecta', oi)}
                    />
                    <Input
                      value={op}
                      onChange={(e) => updateOpcion(p.id, oi, e.target.value)}
                      placeholder={`Opción ${oi + 1}`}
                      className="flex-1"
                    />
                    {p.opciones.length > 2 && (
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600" onClick={() => removeOpcion(p.id, oi)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => addOpcion(p.id)}>
                  <Plus className="w-4 h-4 mr-1" /> Agregar opción
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between pt-4">
        <div>
          {onGuardarFavorita && (
            <Button
              variant="outline"
              disabled={guardandoFavorita || preguntas.filter((p) => p.texto?.trim() && p.opciones.some((o) => o?.trim())).length === 0}
              onClick={async () => {
                const nombre = nombreFormulario.trim();
                if (!nombre) {
                  toast.error('Ingrese el nombre del formulario para guardar como favorita');
                  return;
                }
                setGuardandoFavorita(true);
                try {
                  await onGuardarFavorita(nombre, preguntas);
                  toast.success('Evaluación guardada como favorita');
                } catch (err: any) {
                  toast.error(err.response?.data?.message || 'Error al guardar');
                } finally {
                  setGuardandoFavorita(false);
                }
              }}
            >
              {guardandoFavorita ? 'Guardando...' : 'Guardar como favorita'}
            </Button>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
          variant="primary"
          onClick={() => {
            const validas = preguntas.filter((p) => p.texto?.trim() && p.opciones.some((o) => o?.trim()));
            if (validas.length === 0) {
              toast.error('Agregue al menos una pregunta con texto y opciones');
              return;
            }
            if (onGuardar && pasoId) {
              onGuardar(preguntas, nombreFormulario);
            }
            toast.success('Formulario guardado');
            onClose();
          }}
        >
          Guardar
        </Button>
        </div>
      </div>
    </div>
  );
}

function AnimatedCounter({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) {
      setDisplay(0);
      return;
    }
    const start = 0;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 2);
      const current = Math.round(start + (value - start) * eased);
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span>{display}</span>;
}

export default function CapacitacionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { usuario } = useAuth();
  const id = params.id as string;

  const [capacitacion, setCapacitacion] = useState<Capacitacion | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [unidades, setUnidades] = useState<EstructuraItem[]>([]);
  const [sedes, setSedes] = useState<EstructuraItem[]>([]);
  const [configGrupos, setConfigGrupos] = useState<string[]>([]);
  const [configUbicaciones, setConfigUbicaciones] = useState<string[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'instrucciones' | 'trabajadores'>('info');
  const [modalAdjunto, setModalAdjunto] = useState(false);
  const [modalEditarEvaluacion, setModalEditarEvaluacion] = useState(false);
  const [modalAsignarNombre, setModalAsignarNombre] = useState(false);
  const [busquedaTrabajador, setBusquedaTrabajador] = useState('');
  const [evaluacionesFavoritas, setEvaluacionesFavoritas] = useState<{ id: string; nombre: string; preguntas: any[] }[]>([]);
  const [jerarquiaEmpresa, setJerarquiaEmpresa] = useState('');
  const [jerarquiaArea, setJerarquiaArea] = useState('');
  const [jerarquiaSede, setJerarquiaSede] = useState('');
  const [modalAsignarJerarquia, setModalAsignarJerarquia] = useState(false);
  const [modalImportar, setModalImportar] = useState(false);
  const [modalProgramar, setModalProgramar] = useState(false);
  const [modalDuplicar, setModalDuplicar] = useState(false);
  const [modalCompletar, setModalCompletar] = useState(false);
  const [modalReabrir, setModalReabrir] = useState(false);
  const [modalCerrar, setModalCerrar] = useState(false);
  const [programando, setProgramando] = useState(false);
  const [duplicando, setDuplicando] = useState(false);
  const [completando, setCompletando] = useState(false);
  const [reabriendo, setReabriendo] = useState(false);
  const [cerrando, setCerrando] = useState(false);

  const [adjuntos, setAdjuntos] = useState<{ id: string; titulo: string; fecha_registro: string; registrado_por: string; archivo_url: string }[]>([]);
  const [firmaCapacitador, setFirmaCapacitador] = useState<string | null>(null);
  const [gerentesSst, setGerentesSst] = useState<FirmaGerente[]>([]);
  const [gerentesRrhh, setGerentesRrhh] = useState<FirmaGerente[]>([]);
  const [gerentesCertificacion, setGerentesCertificacion] = useState<FirmaGerente[]>([]);
  const [responsableRrhhGerenteId, setResponsableRrhhGerenteId] = useState<string>('');
  const [responsableRegistroGerenteId, setResponsableRegistroGerenteId] = useState<string>('');
  const [responsableCertificacionGerenteId, setResponsableCertificacionGerenteId] = useState<string>('');
  const [busquedaCapacitador, setBusquedaCapacitador] = useState('');
  const [resultadosCapacitador, setResultadosCapacitador] = useState<Trabajador[]>([]);
  const [mostrarDropdownCapacitador, setMostrarDropdownCapacitador] = useState(false);
  const [buscandoCapacitador, setBuscandoCapacitador] = useState(false);
  const capacitadorDropdownRef = useRef<HTMLDivElement>(null);
  const [adjuntoTitulo, setAdjuntoTitulo] = useState('');
  const [adjuntoFile, setAdjuntoFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    tipo: '',
    fecha: '',
    fecha_fin: '',
    sede: '',
    unidad: '',
    lugar: '',
    empresa_id: '',
    area: '',
    grupo: '',
    hora_inicio: '',
    hora_fin: '',
    duracion_hhmm: '',
    instructor: '',
  });
  const [pasosInstruccion, setPasosInstruccion] = useState<
    { id: string; descripcion: string; esEvaluacion: boolean; imagenUrl?: string; firmaRegistro?: boolean }[]
  >([]);
  const [pasoEvaluacionActivo, setPasoEvaluacionActivo] = useState<string | null>(null);
  const [evaluacionPreguntas, setEvaluacionPreguntas] = useState<PreguntaEvaluacion[]>(() =>
    [1, 2, 3, 4].map((n) => ({
      id: crypto.randomUUID(),
      texto: '',
      opciones: ['', ''],
      respuestaCorrecta: 0,
    }))
  );

  const loadCapacitacion = useCallback(async () => {
    try {
      setIsLoading(true);
      const [data, adjuntosData] = await Promise.all([
        capacitacionesService.findOne(id),
        capacitacionesService.obtenerAdjuntos(id).catch(() => []),
      ]);
      setCapacitacion(data);
      setAdjuntos(adjuntosData);
      setFormData({
        titulo: data.titulo,
        descripcion: data.descripcion,
        tipo: data.tipo,
        fecha: data.fecha,
        fecha_fin: data.fecha_fin || data.fecha,
        sede: data.sede || '',
        unidad: data.unidad || '',
        lugar: data.lugar || '',
        empresa_id: data.empresa_id || '',
        area: data.area || '',
        grupo: data.grupo || '',
        hora_inicio: data.hora_inicio || '09:00',
        hora_fin: data.hora_fin || '11:00',
        duracion_hhmm: data.duracion_hhmm || '02:00',
        instructor: data.instructor || '',
      });
      setFirmaCapacitador(data.firma_capacitador_url || null);
      setBusquedaCapacitador('');
      setResultadosCapacitador([]);
      setMostrarDropdownCapacitador(false);
      setResponsableRrhhGerenteId(data.responsable_rrhh_gerente_id || '');
      setResponsableRegistroGerenteId(data.responsable_registro_gerente_id || '');
      setResponsableCertificacionGerenteId(data.responsable_certificacion_gerente_id || '');
      const inst = data.instrucciones && Array.isArray(data.instrucciones) ? data.instrucciones : [];
      const tienePasoFirma = inst.some((p: any) => p.firmaRegistro || p.id === ID_PASO_FIRMA);
      const pasosNormales = inst.filter((p: any) => !p.firmaRegistro && p.id !== ID_PASO_FIRMA).map((p: any) => ({
        id: String(p?.id ?? crypto.randomUUID()),
        descripcion: String(p?.descripcion ?? ''),
        esEvaluacion: Boolean(p?.esEvaluacion ?? false),
        imagenUrl: p?.imagenUrl ? String(p.imagenUrl) : undefined,
        preguntas: p?.preguntas,
      }));
      const pasoFirma = tienePasoFirma
        ? inst.find((p: any) => p.firmaRegistro || p.id === ID_PASO_FIRMA)
        : null;
      setPasosInstruccion([
        ...pasosNormales,
        pasoFirma
          ? { id: ID_PASO_FIRMA, descripcion: pasoFirma.descripcion || 'Firma de registro de participación', esEvaluacion: false, firmaRegistro: true }
          : { id: ID_PASO_FIRMA, descripcion: 'Firma de registro de participación', esEvaluacion: false, firmaRegistro: true },
      ]);
    } catch (error: any) {
      toast.error('Error al cargar capacitación', {
        description: error.response?.data?.message || 'No se pudo cargar la capacitación',
      });
      router.push('/capacitaciones');
    } finally {
      setIsLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (id) loadCapacitacion();
  }, [id, loadCapacitacion]);

  useEffect(() => {
    empresasService.findAll().then(setEmpresas).catch(() => []);
  }, []);

  useEffect(() => {
    configCapacitacionesService.getConfig().then((c) => {
      setConfigGrupos(c.grupos ?? []);
      setConfigUbicaciones(c.ubicaciones ?? []);
    }).catch(() => {
      setConfigGrupos([]);
      setConfigUbicaciones([]);
    });
  }, []);

  useEffect(() => {
    const empresaId = formData.empresa_id || capacitacion?.empresa_id;
    if (!empresaId) {
      setAreas([]);
      setUnidades([]);
      setSedes([]);
      return;
    }
    Promise.all([
      areasService.findAll(empresaId),
      estructuraService.findUnidades(empresaId),
      estructuraService.findSedes(empresaId),
    ]).then(([a, u, s]) => {
      setAreas(a);
      setUnidades(u);
      setSedes(s);
    }).catch(() => {
      setAreas([]);
      setUnidades([]);
      setSedes([]);
    });
  }, [formData.empresa_id, capacitacion?.empresa_id]);

  useEffect(() => {
    if (capacitacion?.empresa_id) {
      trabajadoresService.findAll(capacitacion.empresa_id).then(setTrabajadores).catch(() => []);
    }
  }, [capacitacion?.empresa_id]);

  useEffect(() => {
    capacitacionesService.obtenerEvaluacionesFavoritas(capacitacion?.empresa_id).then(setEvaluacionesFavoritas).catch(() => []);
  }, [capacitacion?.empresa_id]);

  useEffect(() => {
    if (!capacitacion?.empresa_id) {
      setGerentesSst([]);
      setGerentesRrhh([]);
      setGerentesCertificacion([]);
      return;
    }
    empresasService.listarGerentes(capacitacion.empresa_id).then((gerentes) => {
      setGerentesSst(gerentes.filter((g) => g.rol === 'SST' && g.activo));
      setGerentesRrhh(gerentes.filter((g) => g.rol === 'RRHH' && g.activo));
      setGerentesCertificacion(gerentes.filter((g) => g.rol === 'CERTIFICACION' && g.activo));
    }).catch(() => {
      setGerentesSst([]);
      setGerentesRrhh([]);
      setGerentesCertificacion([]);
    });
  }, [capacitacion?.empresa_id]);

  // Búsqueda de capacitador (trabajadores del sistema)
  useEffect(() => {
    if (!capacitacion?.empresa_id || busquedaCapacitador.trim().length < 2) {
      setResultadosCapacitador([]);
      setMostrarDropdownCapacitador(false);
      return;
    }
    const t = setTimeout(async () => {
      setBuscandoCapacitador(true);
      try {
        const res = await trabajadoresService.buscar(capacitacion.empresa_id, busquedaCapacitador);
        setResultadosCapacitador(res || []);
        setMostrarDropdownCapacitador((res?.length ?? 0) > 0);
      } catch {
        setResultadosCapacitador([]);
        setMostrarDropdownCapacitador(false);
      } finally {
        setBuscandoCapacitador(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [busquedaCapacitador, capacitacion?.empresa_id]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (capacitadorDropdownRef.current && !capacitadorDropdownRef.current.contains(e.target as Node)) {
        setMostrarDropdownCapacitador(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const participantes = capacitacion?.participantes || [];
  const asignados = participantes.length;
  const asistieron = participantes.filter((p) => p.asistencia).length;
  const aprobados = participantes.filter((p) => p.aprobado).length;
  const firmaron = participantes.filter((p) => (p as any).firmo).length;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const [y, m, d] = capacitacion?.fecha?.split('-').map(Number) ?? [0, 0, 0];
  const fechaEvento = capacitacion ? new Date(y, m - 1, d) : null;
  const eventoYaPasó = fechaEvento ? hoy > fechaEvento : false;

  const handleAsignarJerarquia = async () => {
    let filtrados = trabajadores.filter((t) => !participantes.some((p) => p.trabajador_id === t.id));
    if (jerarquiaEmpresa) filtrados = filtrados.filter((t) => t.empresa_id === jerarquiaEmpresa);
    if (jerarquiaArea) filtrados = filtrados.filter((t) => t.area_nombre === jerarquiaArea || t.area_id === jerarquiaArea);
    if (jerarquiaSede) filtrados = filtrados.filter((t) => (t.sede || '').toLowerCase().includes(jerarquiaSede.toLowerCase()));
    let count = 0;
    for (const t of filtrados) {
      try {
        await capacitacionesService.agregarParticipante(id, t.id);
        count++;
      } catch (err: any) {
        toast.error(err.response?.data?.message || `Error al asignar ${t.nombre_completo}`);
      }
    }
    if (count > 0) {
      toast.success(`${count} trabajador(es) asignado(s)`);
      loadCapacitacion();
      setModalAsignarJerarquia(false);
    } else if (filtrados.length === 0) {
      toast.info('No hay trabajadores que coincidan con los filtros');
    }
  };

  const handleAsignarTodos = async () => {
    const filtrados = trabajadores.filter((t) => !participantes.some((p) => p.trabajador_id === t.id));
    let count = 0;
    for (const t of filtrados) {
      try {
        await capacitacionesService.agregarParticipante(id, t.id);
        count++;
      } catch (err: any) {
        toast.error(err.response?.data?.message || `Error al asignar ${t.nombre_completo}`);
      }
    }
    if (count > 0) {
      toast.success(`${count} trabajador(es) asignado(s)`);
      loadCapacitacion();
    } else {
      toast.info('Todos los trabajadores ya están asignados');
    }
  };

  const handleRetirarTodos = async () => {
    if (eventoYaPasó) {
      toast.error('No se puede retirar participantes después de la fecha del evento');
      return;
    }
    const aRetirar = participantes.filter((p) => !(p as any).rendio_examen);
    const conExamen = participantes.filter((p) => (p as any).rendio_examen);
    if (conExamen.length > 0) {
      toast.warning(`${conExamen.length} trabajador(es) ya rindieron el examen y no serán retirados`);
    }
    if (aRetirar.length === 0) {
      toast.info('No hay participantes que se puedan retirar');
      return;
    }
    try {
      for (const p of aRetirar) {
        await capacitacionesService.retirarParticipante(id, p.trabajador_id);
      }
      toast.success(`${aRetirar.length} participante(s) retirado(s)`);
      loadCapacitacion();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al retirar');
    }
  };

  const handleActualizarParticipante = async (
    trabajadorId: string,
    campo: 'asistencia' | 'aprobado' | 'firmo' | 'calificacion',
    valor: boolean | number
  ) => {
    const p = participantes.find((x) => x.trabajador_id === trabajadorId);
    if (!p) return;
    let asistencia: boolean = p.asistencia ?? false;
    let aprobado: boolean = p.aprobado ?? false;
    let firmo: boolean = (p as any).firmo ?? false;
    let calificacion = p.calificacion ?? null;
    if (campo === 'asistencia') asistencia = valor as boolean;
    if (campo === 'aprobado') aprobado = valor as boolean;
    if (campo === 'firmo') firmo = valor as boolean;
    if (campo === 'calificacion') {
      calificacion = valor as number;
      aprobado = (valor as number) >= NOTA_MINIMA_APROBATORIA;
    }
    try {
      await capacitacionesService.actualizarAsistencia(id, trabajadorId, asistencia, calificacion ?? undefined, aprobado, firmo);
      loadCapacitacion();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al actualizar');
    }
  };

  const handleExportarCertificado = async (trabajadorId: string) => {
    try {
      const { url } = await capacitacionesService.obtenerUrlCertificado(id, trabajadorId);
      window.open(url, '_blank');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Certificado no disponible');
    }
  };

  const handleExportarResultado = async (trabajadorId: string) => {
    try {
      const data = await capacitacionesService.obtenerResultadoEvaluacion(id, trabajadorId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `resultado-evaluacion-${data.trabajador?.documento || trabajadorId}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.info('Resultado descargado (JSON). El PDF se generará en una futura versión.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Resultado no disponible');
    }
  };

  const handleExportarTodosCertificados = async () => {
    const conCertificado = participantes.filter((p) => (p as any).aprobado);
    if (conCertificado.length === 0) {
      toast.info('No hay certificados disponibles para exportar');
      return;
    }
    for (const p of conCertificado) {
      try {
        const { url } = await capacitacionesService.obtenerUrlCertificado(id, p.trabajador_id);
        window.open(url, '_blank');
      } catch {
        // skip
      }
    }
    toast.success('Abriendo certificados en nuevas pestañas');
  };

  const puedeRetirar = (p: any) => !eventoYaPasó && !p.rendio_examen;

  const getEstadoBadge = (estado: string) => {
    const styles: Record<string, string> = {
      PENDIENTE: 'bg-amber-100 text-amber-800',
      PROGRAMADA: 'bg-sky-100 text-sky-800',
      COMPLETADA: 'bg-green-100 text-green-800',
      Cancelada: 'bg-slate-200 text-slate-700',
    };
    const label = estado === 'Cancelada' ? 'Cerrada' : estado;
    return (
      <span className={cn('px-3 py-1.5 rounded-md text-sm font-medium', styles[estado] || 'bg-gray-100 text-gray-800')}>
        {label}
      </span>
    );
  };

  const handleGuardar = async () => {
    if (!capacitacion || !usuario) return;
    if (!formData.empresa_id?.trim()) {
      toast.error('Razón Social (Empresa) es obligatoria');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        titulo: formData.titulo,
        descripcion: formData.descripcion,
        tipo: formData.tipo as any,
        fecha: formData.fecha,
        fecha_fin: formData.fecha_fin || undefined,
        sede: formData.sede || undefined,
        unidad: formData.unidad || undefined,
        lugar: formData.lugar || undefined,
        empresa_id: formData.empresa_id,
        area: formData.area || undefined,
        grupo: formData.grupo || undefined,
        instrucciones: pasosInstruccion.map((p) => {
          const base = {
            id: String(p?.id ?? crypto.randomUUID()),
            descripcion: String(p?.descripcion ?? ''),
            esEvaluacion: Boolean(p?.esEvaluacion ?? false),
            imagenUrl: p?.imagenUrl ? String(p.imagenUrl) : undefined,
            ...((p as any).firmaRegistro ? { firmaRegistro: true } : {}),
          };
          const preguntas = (p as any).preguntas;
          return Array.isArray(preguntas) && preguntas.length > 0 ? { ...base, preguntas } : base;
        }),
        hora_inicio: formData.hora_inicio || undefined,
        hora_fin: formData.hora_fin || undefined,
        duracion_hhmm: formData.duracion_hhmm || undefined,
        instructor: formData.instructor || undefined,
        firma_capacitador_url: firmaCapacitador && firmaCapacitador.startsWith('data:') ? firmaCapacitador : firmaCapacitador || undefined,
        responsable_rrhh_gerente_id: responsableRrhhGerenteId || undefined,
        responsable_registro_gerente_id: responsableRegistroGerenteId || undefined,
        responsable_certificacion_gerente_id: responsableCertificacionGerenteId || undefined,
      };
      const data = await capacitacionesService.update(id, payload);
      setCapacitacion(data);
      setFormData({
        titulo: data.titulo,
        descripcion: data.descripcion,
        tipo: data.tipo,
        fecha: data.fecha,
        fecha_fin: data.fecha_fin || data.fecha,
        sede: data.sede || '',
        unidad: data.unidad || '',
        lugar: data.lugar || '',
        empresa_id: data.empresa_id || '',
        area: data.area || '',
        grupo: data.grupo || '',
        hora_inicio: data.hora_inicio || '09:00',
        hora_fin: data.hora_fin || '11:00',
        duracion_hhmm: data.duracion_hhmm || '02:00',
        instructor: data.instructor || '',
      });
      setResponsableRrhhGerenteId(data.responsable_rrhh_gerente_id || '');
      setResponsableRegistroGerenteId(data.responsable_registro_gerente_id || '');
      setResponsableCertificacionGerenteId(data.responsable_certificacion_gerente_id || '');
      toast.success('Cambios guardados correctamente');
    } catch (error: any) {
      toast.error('Error al guardar', {
        description: error.response?.data?.message || 'No se pudieron guardar los cambios',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFirmaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes (PNG, JPG, JPEG)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no debe superar 5 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setFirmaCapacitador(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleGuardarAdjunto = async (titulo: string, file: File | null) => {
    if (!titulo.trim()) {
      toast.error('El título es obligatorio');
      return;
    }
    if (!file) {
      toast.error('Debe seleccionar un archivo');
      return;
    }
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('El archivo no debe superar 10 MB');
      return;
    }
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      toast.error('Formatos permitidos: Excel, Word, PDF, PNG, JPG, JPEG');
      return;
    }
    try {
      await capacitacionesService.crearAdjunto(id, titulo.trim(), file);
      toast.success('Documento registrado');
      setModalAdjunto(false);
      setAdjuntoTitulo('');
      setAdjuntoFile(null);
      const adjuntosData = await capacitacionesService.obtenerAdjuntos(id);
      setAdjuntos(adjuntosData);
    } catch (error: any) {
      toast.error('Error al registrar', { description: error.response?.data?.message });
    }
  };

  const handleEliminarAdjunto = async (adjuntoId: string) => {
    try {
      await capacitacionesService.eliminarAdjunto(adjuntoId);
      setAdjuntos((prev) => prev.filter((a) => a.id !== adjuntoId));
      toast.success('Adjunto eliminado');
    } catch (error: any) {
      toast.error('Error al eliminar', { description: error.response?.data?.message });
    }
  };


  const handleExportarExcel = () => toast.info('Exportar Excel: Próximamente');
  const handleExportarRegistro = () => toast.info('Exportar registro: Próximamente');

  const handleProgramarConfirmado = async () => {
    if (!capacitacion || !usuario) return;
    setProgramando(true);
    try {
      await capacitacionesService.update(id, {
        estado: EstadoCapacitacion.Programada,
      });
      toast.success('Capacitación programada correctamente');
      setModalProgramar(false);
      loadCapacitacion();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al programar');
    } finally {
      setProgramando(false);
    }
  };

  const handleDuplicarConfirmado = async () => {
    if (!capacitacion || !usuario) return;
    setDuplicando(true);
    try {
      const duplicado = await capacitacionesService.create({
        titulo: capacitacion.titulo,
        descripcion: capacitacion.descripcion,
        lugar: capacitacion.lugar ?? undefined,
        tipo: capacitacion.tipo,
        fecha: capacitacion.fecha,
        fecha_fin: capacitacion.fecha_fin ?? undefined,
        sede: capacitacion.sede ?? undefined,
        unidad: capacitacion.unidad ?? undefined,
        area: capacitacion.area ?? undefined,
        grupo: capacitacion.grupo ?? undefined,
        instrucciones: capacitacion.instrucciones ?? undefined,
        hora_inicio: capacitacion.hora_inicio ?? undefined,
        hora_fin: capacitacion.hora_fin ?? undefined,
        duracion_hhmm: capacitacion.duracion_hhmm ?? undefined,
        duracion_minutos: capacitacion.duracion_minutos ?? undefined,
        instructor: capacitacion.instructor ?? undefined,
        firma_capacitador_url: capacitacion.firma_capacitador_url ?? undefined,
        estado: EstadoCapacitacion.Pendiente,
        empresa_id: capacitacion.empresa_id,
        creado_por_id: usuario.id,
      });
      toast.success('Capacitación duplicada correctamente');
      setModalDuplicar(false);
      router.push(`/capacitaciones/${duplicado.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al duplicar');
    } finally {
      setDuplicando(false);
    }
  };

  const handleCompletarConfirmado = async () => {
    if (!capacitacion || !usuario) return;
    setCompletando(true);
    try {
      await capacitacionesService.update(id, {
        estado: EstadoCapacitacion.Completada,
      });
      toast.success('Capacitación completada correctamente');
      setModalCompletar(false);
      loadCapacitacion();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al completar');
    } finally {
      setCompletando(false);
    }
  };

  const handleReabrirConfirmado = async () => {
    if (!capacitacion || !usuario) return;
    setReabriendo(true);
    try {
      await capacitacionesService.update(id, {
        estado: EstadoCapacitacion.Programada,
      });
      toast.success('Capacitación reabierta correctamente');
      setModalReabrir(false);
      loadCapacitacion();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al reabrir');
    } finally {
      setReabriendo(false);
    }
  };

  const handleCerrarConfirmado = async () => {
    if (!capacitacion || !usuario) return;
    setCerrando(true);
    try {
      await capacitacionesService.update(id, {
        estado: EstadoCapacitacion.Cancelada,
      });
      toast.success('Capacitación cerrada. Ya no se puede modificar.');
      setModalCerrar(false);
      loadCapacitacion();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al cerrar');
    } finally {
      setCerrando(false);
    }
  };

  const handleEnviarRecordatorio = () => {
    toast.info('Enviar recordatorio: Próximamente (notificación o correo electrónico)');
  };

  const esCerrada = capacitacion?.estado === EstadoCapacitacion.Cancelada;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!capacitacion) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Detalle de Capacitación</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/capacitaciones">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Regresar
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={handleExportarExcel} className="border-amber-300 text-amber-700 hover:bg-amber-50">
            <Download className="w-4 h-4 mr-2" />
            Exportar EXCEL de trabajadores
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportarRegistro} className="border-amber-300 text-amber-700 hover:bg-amber-50">
            <Download className="w-4 h-4 mr-2" />
            Exportar registro de asistencia
          </Button>
          {!esCerrada && (
            <Button variant="primary" size="sm" onClick={handleGuardar} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          )}
        </div>
      </div>

      {/* Estado + Botones según estado */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-600">Estado:</span>
          {getEstadoBadge(capacitacion.estado)}
        </div>
        {capacitacion.estado === EstadoCapacitacion.Pendiente && (
          <Button variant="primary" size="sm" onClick={() => setModalProgramar(true)}>
            Programar capacitación
          </Button>
        )}
        {capacitacion.estado === EstadoCapacitacion.Programada && (
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={handleEnviarRecordatorio}>
              <Bell className="w-4 h-4 mr-2" />
              Enviar recordatorio
            </Button>
            <Button variant="primary" size="sm" onClick={() => setModalCompletar(true)}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Completar capacitación
            </Button>
          </div>
        )}
        {capacitacion.estado === EstadoCapacitacion.Completada && (
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={() => setModalReabrir(true)}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reabrir capacitación
            </Button>
            <Button variant="primary" size="sm" onClick={() => setModalCerrar(true)}>
              <Lock className="w-4 h-4 mr-2" />
              Cerrar capacitación
            </Button>
          </div>
        )}
      </div>

      {/* Participación de trabajadores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4 flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg">
            <Users className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Trab. Asignados</p>
            <p className="text-xl font-bold text-slate-900">
              <AnimatedCounter value={asignados} />
            </p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg">
            <FileCheck className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Trab. Asistieron</p>
            <p className="text-xl font-bold text-slate-900">
              <AnimatedCounter value={asistieron} />
            </p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg">
            <Award className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Trab. Aprobados</p>
            <p className="text-xl font-bold text-slate-900">
              <AnimatedCounter value={aprobados} />
            </p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg">
            <PenLine className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Trab. Firmaron</p>
            <p className="text-xl font-bold text-slate-900">
              <AnimatedCounter value={firmaron} />
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('info')}
            className={cn(
              'px-4 py-3 font-medium text-sm border-b-2 transition-colors',
              activeTab === 'info' ? 'border-primary text-primary' : 'border-transparent text-slate-600 hover:text-slate-900'
            )}
          >
            <Info className="w-4 h-4 inline mr-2" />
            Información General
          </button>
          <button
            onClick={() => setActiveTab('instrucciones')}
            className={cn(
              'px-4 py-3 font-medium text-sm border-b-2 transition-colors',
              activeTab === 'instrucciones' ? 'border-primary text-primary' : 'border-transparent text-slate-600 hover:text-slate-900'
            )}
          >
            <ListChecks className="w-4 h-4 inline mr-2" />
            Instrucciones
          </button>
          <button
            onClick={() => setActiveTab('trabajadores')}
            className={cn(
              'px-4 py-3 font-medium text-sm border-b-2 transition-colors',
              activeTab === 'trabajadores' ? 'border-primary text-primary' : 'border-transparent text-slate-600 hover:text-slate-900'
            )}
          >
            <UserPlus className="w-4 h-4 inline mr-2" />
            Trabajadores
          </button>
        </div>
      </div>

      {/* Tab Información General */}
      {activeTab === 'info' && (
        <div className="space-y-8">
          {/* Datos Generales */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-2">Datos Generales</h2>
                <p className="text-sm text-slate-600">
                  Ingresa los detalles iniciales de la capacitación. El tipo y el grupo permitirán agrupar los indicadores de cumplimiento.
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={() => setModalDuplicar(true)}>
                Duplicar capacitación
              </Button>
            </div>
            <fieldset disabled={esCerrada} className="border-0 p-0 m-0 min-w-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Razón Social (Empresa) *</label>
                <Select
                  value={formData.empresa_id}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFormData((f) => ({ ...f, empresa_id: v, unidad: '', sede: '', area: '' }));
                  }}
                  className="w-full"
                >
                  <option value="">Seleccione empresa</option>
                  {empresas.map((e) => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Unidad</label>
                <Select
                  value={formData.unidad}
                  onChange={(e) => setFormData((f) => ({ ...f, unidad: e.target.value }))}
                  className="w-full"
                  disabled={!formData.empresa_id}
                >
                  <option value="">Seleccione unidad</option>
                  {unidades.map((u) => (
                    <option key={u.id} value={u.nombre}>{u.nombre}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sede</label>
                <Select
                  value={formData.sede}
                  onChange={(e) => setFormData((f) => ({ ...f, sede: e.target.value }))}
                  className="w-full"
                  disabled={!formData.empresa_id}
                >
                  <option value="">Seleccione sede</option>
                  {sedes.map((s) => (
                    <option key={s.id} value={s.nombre}>{s.nombre}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Registro</label>
                <Input
                  type="text"
                  value={capacitacion?.createdAt
                    ? new Date(capacitacion.createdAt).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })
                    : new Date().toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}
                  readOnly
                  disabled
                  className="w-full bg-slate-100 cursor-not-allowed"
                  title="Campo bloqueado: fecha y hora actual del registro"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo *</label>
                <Select value={formData.tipo} onChange={(e) => setFormData((f) => ({ ...f, tipo: e.target.value }))} className="w-full">
                  {TIPOS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" id="sede-tercera" className="w-4 h-4" />
                <label htmlFor="sede-tercera" className="text-sm text-slate-700">¿Es sede tercera?</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Área</label>
                <Select value={formData.area} onChange={(e) => setFormData((f) => ({ ...f, area: e.target.value }))} className="w-full">
                  <option value="">Seleccione</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.nombre}>{a.nombre}</option>
                  ))}
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" id="area-tercera" className="w-4 h-4" />
                <label htmlFor="area-tercera" className="text-sm text-slate-700">¿Es área tercera?</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Grupo</label>
                <Select value={formData.grupo} onChange={(e) => setFormData((f) => ({ ...f, grupo: e.target.value }))} className="w-full">
                  <option value="">Seleccione</option>
                  {[
                    ...configGrupos,
                    ...(formData.grupo && !configGrupos.includes(formData.grupo) ? [formData.grupo] : []),
                  ].map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </Select>
                {configGrupos.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">Configure grupos en Configuración → Capacitaciones</p>
                )}
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" id="induccion" className="w-4 h-4" />
                <label htmlFor="induccion" className="text-sm text-slate-700">¿Es inducción de contratistas?</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Completado *</label>
                <Input type="date" value={formData.fecha_fin} onChange={(e) => setFormData((f) => ({ ...f, fecha_fin: e.target.value }))} className="w-full" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Tema *</label>
                <Input value={formData.titulo} onChange={(e) => setFormData((f) => ({ ...f, titulo: e.target.value }))} className="w-full" />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData((f) => ({ ...f, descripcion: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={esCerrada}
                />
              </div>
            </div>
            </fieldset>
          </div>

          {/* Programación */}
          <fieldset disabled={esCerrada} className="border-0 p-0 m-0 min-w-0">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Programación</h2>
            <p className="text-sm text-slate-600 mb-4">
              Ingresa las fechas en que se llevará a cabo la capacitación. Los trabajadores no podrán acceder antes de la fecha de inicio.
            </p>
            <div className="flex items-center gap-3 mb-4">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                <span className="ml-3 text-sm font-medium text-slate-700">¿Capacitación Pública?</span>
              </label>
              <div className="flex-1 p-2 bg-sky-50 rounded text-sm text-sky-800">
                Si la capacitación es pública, cualquier trabajador puede ingresar desde su app. Si la capacitación no es pública, solo los trabajadores asignados pueden ingresar desde su app.
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Inicio *</label>
                <Input type="date" value={formData.fecha} onChange={(e) => setFormData((f) => ({ ...f, fecha: e.target.value }))} className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hora Inicio *</label>
                <Input type="time" value={formData.hora_inicio} onChange={(e) => setFormData((f) => ({ ...f, hora_inicio: e.target.value }))} className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Fin *</label>
                <Input type="date" value={formData.fecha_fin} onChange={(e) => setFormData((f) => ({ ...f, fecha_fin: e.target.value }))} className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nro Horas/Minutos *</label>
                <Input type="time" value={formData.duracion_hhmm} onChange={(e) => setFormData((f) => ({ ...f, duracion_hhmm: e.target.value }))} className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ubicación *</label>
                <Select
                  value={formData.lugar}
                  onChange={(e) => setFormData((f) => ({ ...f, lugar: e.target.value }))}
                  className="w-full"
                >
                  <option value="">Seleccione ubicación</option>
                  {[
                    ...configUbicaciones,
                    ...(formData.lugar && !configUbicaciones.includes(formData.lugar) ? [formData.lugar] : []),
                  ].map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </Select>
                {configUbicaciones.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">Configure ubicaciones en Configuración → Capacitaciones</p>
                )}
              </div>
            </div>
          </div>

          {/* Responsables */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Responsables</h2>
            <p className="text-sm text-slate-600 mb-4">
              Ingresa los nombres de los responsables que figurarán en el Registro de Asistencia y en el certificado.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Gerente de RRHH</label>
                <p className="text-xs text-slate-500 mb-2">Seleccione entre los gerentes RRHH configurados en Jerarquía Organizacional (Empresas)</p>
                {gerentesRrhh.length === 0 && capacitacion?.empresa_id && (
                  <p className="text-xs text-amber-600 mb-2">No hay gerentes RRHH. Configure en Empresas → Jerarquía Organizacional (rol RRHH).</p>
                )}
                <Select
                  value={responsableRrhhGerenteId}
                  onChange={(e) => setResponsableRrhhGerenteId(e.target.value)}
                  className="w-full"
                >
                  <option value="">Sin asignar</option>
                  {gerentesRrhh.map((g) => (
                    <option key={g.id} value={g.id}>{g.nombre_completo} - {g.cargo}</option>
                  ))}
                </Select>
                {responsableRrhhGerenteId && gerentesRrhh.find((g) => g.id === responsableRrhhGerenteId)?.firma_url && (
                  <div className="mt-2 w-32 h-16 border border-slate-200 rounded-lg bg-slate-50 flex items-center justify-center overflow-hidden">
                    <img
                      src={gerentesRrhh.find((g) => g.id === responsableRrhhGerenteId)?.firma_url || ''}
                      alt="Firma"
                      className="max-w-full max-h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Responsable del registro</label>
                <p className="text-xs text-slate-500 mb-2">Seleccione entre los gerentes SST configurados en Jerarquía Organizacional (Empresas)</p>
                {gerentesSst.length === 0 && capacitacion?.empresa_id && (
                  <p className="text-xs text-amber-600 mb-2">No hay gerentes SST. Configure en Empresas → Jerarquía Organizacional.</p>
                )}
                <Select
                  value={responsableRegistroGerenteId}
                  onChange={(e) => setResponsableRegistroGerenteId(e.target.value)}
                  className="w-full"
                >
                  <option value="">Sin asignar</option>
                  {gerentesSst.map((g) => (
                    <option key={g.id} value={g.id}>{g.nombre_completo} - {g.cargo}</option>
                  ))}
                </Select>
                {responsableRegistroGerenteId && gerentesSst.find((g) => g.id === responsableRegistroGerenteId)?.firma_url && (
                  <div className="mt-2 w-32 h-16 border border-slate-200 rounded-lg bg-slate-50 flex items-center justify-center overflow-hidden">
                    <img
                      src={gerentesSst.find((g) => g.id === responsableRegistroGerenteId)?.firma_url || ''}
                      alt="Firma"
                      className="max-w-full max-h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Responsable de certificación</label>
                <p className="text-xs text-slate-500 mb-2">Seleccione entre los responsables de certificación configurados en Jerarquía Organizacional (Empresas)</p>
                {gerentesCertificacion.length === 0 && capacitacion?.empresa_id && (
                  <p className="text-xs text-amber-600 mb-2">No hay responsables de certificación. Configure en Empresas → Jerarquía Organizacional (rol CERTIFICACION).</p>
                )}
                <Select
                  value={responsableCertificacionGerenteId}
                  onChange={(e) => setResponsableCertificacionGerenteId(e.target.value)}
                  className="w-full"
                >
                  <option value="">Sin asignar</option>
                  {gerentesCertificacion.map((g) => (
                    <option key={g.id} value={g.id}>{g.nombre_completo} - {g.cargo}</option>
                  ))}
                </Select>
                {responsableCertificacionGerenteId && gerentesCertificacion.find((g) => g.id === responsableCertificacionGerenteId)?.firma_url && (
                  <div className="mt-2 w-32 h-16 border border-slate-200 rounded-lg bg-slate-50 flex items-center justify-center overflow-hidden">
                    <img
                      src={gerentesCertificacion.find((g) => g.id === responsableCertificacionGerenteId)?.firma_url || ''}
                      alt="Firma"
                      className="max-w-full max-h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
              </div>
              <div className="md:col-span-2 relative" ref={capacitadorDropdownRef}>
                <label className="block text-sm font-medium text-slate-700 mb-1">Capacitador</label>
                <p className="text-xs text-slate-500 mb-2">Busque por nombre si está en el sistema (se cargará su firma) o escriba manualmente para capacitadores externos.</p>
                <Input
                  value={formData.instructor}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFormData((f) => ({ ...f, instructor: v }));
                    setBusquedaCapacitador(v);
                  }}
                  onFocus={() => busquedaCapacitador.length >= 2 && resultadosCapacitador.length > 0 && setMostrarDropdownCapacitador(true)}
                  placeholder="Buscar por nombre o escribir manualmente"
                  className="w-full"
                />
                {mostrarDropdownCapacitador && resultadosCapacitador.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                    {resultadosCapacitador.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between gap-2"
                        onClick={() => {
                          setFormData((f) => ({ ...f, instructor: t.nombre_completo }));
                          setFirmaCapacitador(t.firma_digital_url || null);
                          setBusquedaCapacitador('');
                          setResultadosCapacitador([]);
                          setMostrarDropdownCapacitador(false);
                        }}
                      >
                        <span>{t.nombre_completo}</span>
                        {t.firma_digital_url ? (
                          <span className="text-xs text-green-600">Con firma</span>
                        ) : (
                          <span className="text-xs text-amber-600">Sin firma</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {buscandoCapacitador && (
                  <p className="text-xs text-slate-500 mt-1">Buscando...</p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Registrar firma del capacitador</label>
                <p className="text-xs text-slate-500 mb-2">Si seleccionó del sistema y tiene firma, se cargó automáticamente. Si es externo o no tiene firma, suba la imagen.</p>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-16 border border-slate-200 rounded-lg bg-slate-50 flex items-center justify-center overflow-hidden">
                    {firmaCapacitador ? (
                      <img src={firmaCapacitador} alt="Firma" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-slate-400 text-xs">Firma</span>
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      id="firma-capacitador"
                      accept="image/png,image/jpeg,image/jpg"
                      className="hidden"
                      onChange={handleFirmaChange}
                    />
                    <Button variant="outline" size="sm" type="button" onClick={() => document.getElementById('firma-capacitador')?.click()}>
                      <Upload className="w-4 h-4 mr-2" />
                      Cargar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Adjuntos */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Adjuntos</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Agregar evidencias, fotos, videos, recursos de capacitación para trazabilidad. Formatos: Excel, Word, PDF, PNG, JPEG. Máx. 10 MB.
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={() => setModalAdjunto(true)} disabled={esCerrada}>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Documento
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Nro</TableHead>
                  <TableHead>Fecha de registro</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Registrado por</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjuntos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                      <FolderOpen className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                      Sin Información
                    </TableCell>
                  </TableRow>
                ) : (
                  adjuntos.map((a, i) => (
                    <TableRow key={a.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>{a.fecha_registro}</TableCell>
                      <TableCell>{a.titulo}</TableCell>
                      <TableCell>{a.registrado_por}</TableCell>
                      <TableCell>
                        <a href={a.archivo_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline mr-2">
                          Ver
                        </a>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600" onClick={() => handleEliminarAdjunto(a.id)} disabled={esCerrada}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          </fieldset>
        </div>
      )}

      {/* Tab Instrucciones */}
      {activeTab === 'instrucciones' && (
        <fieldset disabled={esCerrada} className="border-0 p-0 m-0 min-w-0">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              <span className="ml-3 text-sm text-slate-700">
                Si la capacitación no requiere evaluación, el trabajador puede completar la capacitación con su firma.
              </span>
            </label>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mb-6"
            disabled={esCerrada}
            onClick={() => {
              const pasosSinFirma = pasosInstruccion.filter((p: any) => !p.firmaRegistro && p.id !== ID_PASO_FIRMA);
              const pasoFirma = pasosInstruccion.find((p: any) => p.firmaRegistro || p.id === ID_PASO_FIRMA);
              setPasosInstruccion([
                ...pasosSinFirma,
                { id: crypto.randomUUID(), descripcion: '', esEvaluacion: pasosSinFirma.length === 0 },
                ...(pasoFirma ? [pasoFirma] : []),
              ]);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Paso
          </Button>
          <div className="space-y-4">
            {pasosInstruccion.length === 0 ? (
              <div className="text-center py-12 text-slate-500 border rounded-lg border-dashed">
                No hay pasos aún. Agregue un paso de evaluación.
              </div>
            ) : (
              pasosInstruccion.map((paso, i) => {
                const esPasoFirma = (paso as any).firmaRegistro || paso.id === ID_PASO_FIRMA;
                return (
                <div key={paso.id} className="border border-slate-200 rounded-lg p-4 flex gap-4 relative">
                  {!esPasoFirma && (
                    <button
                      type="button"
                      onClick={() => setPasosInstruccion((prev) => prev.filter((p) => p.id !== paso.id))}
                      className="absolute top-3 right-3 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <div className="flex-1">
                    {esPasoFirma ? (
                      <div className="flex items-center gap-2 mb-2">
                        <PenLine className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-slate-700">Firma de registro de participación (paso final obligatorio)</span>
                      </div>
                    ) : (
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={paso.esEvaluacion}
                        onChange={(e) =>
                          setPasosInstruccion((prev) =>
                            prev.map((p) => (p.id === paso.id ? { ...p, esEvaluacion: e.target.checked } : p))
                          )
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-sm">¿Es evaluación para aprobación del trabajador?</span>
                      {paso.esEvaluacion && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setPasoEvaluacionActivo(paso.id);
                            const pasoPreguntas = (paso as any).preguntas;
                            if (pasoPreguntas && Array.isArray(pasoPreguntas) && pasoPreguntas.length > 0) {
                              setEvaluacionPreguntas(
                                pasoPreguntas.map((pr: any) => ({
                                  id: crypto.randomUUID(),
                                  texto: pr.texto_pregunta ?? '',
                                  opciones: Array.isArray(pr.opciones) ? pr.opciones : ['', ''],
                                  respuestaCorrecta: pr.respuesta_correcta_index ?? 0,
                                }))
                              );
                            } else {
                              setEvaluacionPreguntas(
                                [1, 2, 3, 4].map(() => ({
                                  id: crypto.randomUUID(),
                                  texto: '',
                                  opciones: ['', ''],
                                  respuestaCorrecta: 0,
                                }))
                              );
                            }
                            setModalEditarEvaluacion(true);
                          }}
                        >
                          Editar evaluación
                        </Button>
                      )}
                    </div>
                    )}
                    <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                    {esPasoFirma ? (
                      <p className="text-sm text-slate-600 py-2">{paso.descripcion}</p>
                    ) : (
                    <textarea
                      value={paso.descripcion}
                      onChange={(e) =>
                        setPasosInstruccion((prev) =>
                          prev.map((p) => (p.id === paso.id ? { ...p, descripcion: e.target.value } : p))
                        )
                      }
                      rows={2}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Descripción del paso"
                    />
                    )}
                  </div>
                  {!esPasoFirma && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Imagen de fondo</label>
                    <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-slate-50 hover:bg-slate-100 cursor-pointer">
                      <Button variant="ghost" size="sm" type="button">
                        <Plus className="w-4 h-4 mr-1" /> Cargar
                      </Button>
                    </div>
                  </div>
                  )}
                </div>
              );
              })
            )}
          </div>
        </div>
        </fieldset>
      )}

      {/* Tab Trabajadores */}
      {activeTab === 'trabajadores' && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Asignación de trabajadores</h2>
          <p className="text-sm text-slate-600 mb-4">
            Usa la asignación individual o grupal de trabajadores con los botones azules de la derecha. Los trabajadores asignados verán esta capacitación en &quot;Mis capacitaciones&quot; solo cuando esté en estado Programada. Las notificaciones se envían automáticamente cuando el trabajador es asignado, y también cuando transcurren semanas y aún no ha completado su firma.
          </p>
          <div className="flex flex-wrap gap-2 mb-6">
            <Button variant="primary" size="sm" onClick={() => setModalAsignarNombre(true)} disabled={esCerrada}>
              Asignar por nombre
            </Button>
            <Button variant="primary" size="sm" onClick={() => setModalAsignarJerarquia(true)} disabled={esCerrada}>
              Asignar por jerarquía
            </Button>
            <Button variant="primary" size="sm" onClick={handleAsignarTodos} disabled={esCerrada}>
              Asignar a todos
            </Button>
            <Button variant="outline" size="sm" onClick={handleRetirarTodos} disabled={esCerrada || eventoYaPasó || participantes.some((p) => (p as any).rendio_examen)}>
              Retirar a todos
            </Button>
            <Button variant="primary" size="sm" onClick={() => setModalImportar(true)} disabled={esCerrada}>
              Importar
            </Button>
          </div>
          <Button variant="outline" size="sm" className="mb-4 border-amber-300 text-amber-700" onClick={handleExportarTodosCertificados}>
            <Download className="w-4 h-4 mr-2" />
            Exportar todos los certificados
          </Button>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Nro</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Sede</TableHead>
                <TableHead>Asistió</TableHead>
                <TableHead>Aprobó</TableHead>
                <TableHead>Firmó</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participantes.map((p, i) => {
                const trab = trabajadores.find((t) => t.id === p.trabajador_id);
                const firmo = (p as any).firmo ?? false;
                return (
                  <TableRow key={p.trabajador_id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{trab?.documento_identidad ?? '-'}</TableCell>
                    <TableCell>{p.nombre}</TableCell>
                    <TableCell>{capacitacion.sede || trab?.sede || '-'}</TableCell>
                    <TableCell>
                      <Select
                        value={p.asistencia ? 'si' : 'no'}
                        onChange={(e) => handleActualizarParticipante(p.trabajador_id, 'asistencia', e.target.value === 'si')}
                        className="w-28 h-8 text-xs"
                        disabled={esCerrada}
                      >
                        <option value="si">Asistió</option>
                        <option value="no">No asistió</option>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Select
                          value={p.aprobado ? 'si' : 'no'}
                          onChange={(e) => handleActualizarParticipante(p.trabajador_id, 'aprobado', e.target.value === 'si')}
                          className="w-24 h-8 text-xs"
                          disabled={esCerrada}
                        >
                          <option value="si">Aprobó</option>
                          <option value="no">No aprobó</option>
                        </Select>
                        <Input
                          type="number"
                          min={0}
                          max={20}
                          value={p.calificacion ?? ''}
                          onBlur={(e) => {
                            const v = e.target.value === '' ? null : parseInt(e.target.value, 10);
                            if (v !== null && !isNaN(v) && v >= 0 && v <= 20) {
                              handleActualizarParticipante(p.trabajador_id, 'calificacion', v);
                            }
                          }}
                          className="w-14 h-8 text-xs"
                          placeholder="Nota"
                          disabled={esCerrada}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={firmo ? 'si' : 'no'}
                        onChange={(e) => handleActualizarParticipante(p.trabajador_id, 'firmo', e.target.value === 'si')}
                        className="w-28 h-8 text-xs"
                        disabled={esCerrada}
                      >
                        <option value="si">Firmó</option>
                        <option value="no">No firmó</option>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleExportarCertificado(p.trabajador_id)} title="Exportar certificado">
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleExportarResultado(p.trabajador_id)} title="Resultado de evaluación">
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600"
                          disabled={esCerrada || !puedeRetirar(p)}
                          onClick={async () => {
                            if (!puedeRetirar(p)) return;
                            try {
                              await capacitacionesService.retirarParticipante(id, p.trabajador_id);
                              toast.success('Participante retirado');
                              loadCapacitacion();
                            } catch (err: any) {
                              toast.error(err.response?.data?.message || 'Error al retirar');
                            }
                          }}
                          title={!puedeRetirar(p) ? 'No se puede retirar (evento pasado o ya rindió examen)' : 'Retirar'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {participantes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                    Sin trabajadores asignados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modal Adjunto */}
      <Modal isOpen={modalAdjunto} onClose={() => { setModalAdjunto(false); setAdjuntoTitulo(''); setAdjuntoFile(null); }} title="Registrar nuevo documento" size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Título *</label>
            <Input
              placeholder="Título del documento"
              value={adjuntoTitulo}
              onChange={(e) => setAdjuntoTitulo(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Adjunta evidencias *</label>
            <input
              type="file"
              id="adjunto-file"
              accept=".pdf,.xlsx,.xls,.doc,.docx,image/png,image/jpeg,image/jpg"
              className="hidden"
              onChange={(e) => setAdjuntoFile(e.target.files?.[0] ?? null)}
            />
            <label
              htmlFor="adjunto-file"
              className="block border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
            >
              <Upload className="w-12 h-12 mx-auto text-slate-400 mb-2" />
              <p className="text-sm text-slate-600">
                {adjuntoFile ? adjuntoFile.name : 'Clic o arrastra el archivo en esta área para subir'}
              </p>
              <p className="text-xs text-slate-500 mt-1">Formatos permitidos: Excel, Word, PDF, PNG, JPG, JPEG. Máx. 10 MB.</p>
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => { setModalAdjunto(false); setAdjuntoTitulo(''); setAdjuntoFile(null); }}>Cancelar</Button>
            <Button variant="primary" onClick={() => handleGuardarAdjunto(adjuntoTitulo, adjuntoFile)}>Guardar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Editar Evaluación */}
      <Modal isOpen={modalEditarEvaluacion} onClose={() => { setModalEditarEvaluacion(false); setPasoEvaluacionActivo(null); }} title="Crear formulario de evaluación" size="xl">
        <EvaluacionFormContent
          preguntas={evaluacionPreguntas}
          setPreguntas={setEvaluacionPreguntas}
          onClose={() => { setModalEditarEvaluacion(false); setPasoEvaluacionActivo(null); }}
          pasoId={pasoEvaluacionActivo}
          evaluacionesFavoritas={evaluacionesFavoritas}
          onUsarFavorita={(preguntasData) => {
            setEvaluacionPreguntas(
              preguntasData.map((pr: any) => ({
                id: crypto.randomUUID(),
                texto: pr.texto_pregunta ?? '',
                opciones: Array.isArray(pr.opciones) ? pr.opciones : ['', ''],
                respuestaCorrecta: pr.respuesta_correcta_index ?? 0,
              }))
            );
          }}
          onGuardarFavorita={async (nombre, preguntasData) => {
            const preguntasBackend = preguntasData
              .filter((p) => p.texto?.trim() && p.opciones.filter((o: string) => o?.trim()).length >= 2)
              .map((p) => ({
                texto_pregunta: p.texto,
                tipo: 'OpcionMultiple' as const,
                opciones: p.opciones.filter((o: string) => o?.trim()),
                respuesta_correcta_index: p.respuestaCorrecta,
                puntaje: 10,
              }));
            if (preguntasBackend.length === 0) {
              toast.error('Agregue al menos una pregunta válida');
              return;
            }
            await capacitacionesService.crearEvaluacionFavorita(nombre, preguntasBackend);
            const list = await capacitacionesService.obtenerEvaluacionesFavoritas(capacitacion?.empresa_id);
            setEvaluacionesFavoritas(list);
          }}
          onGuardar={(preguntasData, nombreFormulario) => {
            if (!pasoEvaluacionActivo) return;
            const preguntasBackend = preguntasData
              .filter((p) => p.texto?.trim() && p.opciones.filter((o) => o?.trim()).length >= 2)
              .map((p) => ({
                texto_pregunta: p.texto,
                tipo: 'OpcionMultiple' as const,
                opciones: p.opciones.filter((o) => o?.trim()),
                respuesta_correcta_index: p.respuestaCorrecta,
                puntaje: 10,
              }));
            setPasosInstruccion((prev) =>
              prev.map((paso) =>
                paso.id === pasoEvaluacionActivo
                  ? { ...paso, preguntas: preguntasBackend, descripcion: paso.descripcion }
                  : paso
              )
            );
          }}
        />
      </Modal>

      {/* Modal Asignar por nombre */}
      <Modal isOpen={modalAsignarNombre} onClose={() => { setModalAsignarNombre(false); setBusquedaTrabajador(''); }} title="Asignar por nombre" size="lg">
        <div className="space-y-4">
          <Input
            placeholder="Buscar trabajador por nombre..."
            value={busquedaTrabajador}
            onChange={(e) => setBusquedaTrabajador(e.target.value)}
          />
          <div className="max-h-60 overflow-y-auto space-y-2">
            {trabajadores
              .filter((t) =>
                !busquedaTrabajador.trim() ||
                t.nombre_completo?.toLowerCase().includes(busquedaTrabajador.toLowerCase()) ||
                t.documento_identidad?.includes(busquedaTrabajador)
              )
              .filter((t) => !participantes.some((p) => p.trabajador_id === t.id))
              .map((t) => (
                <div key={t.id} className="flex items-center justify-between p-2 border rounded hover:bg-slate-50">
                  <span>{t.nombre_completo} {t.documento_identidad ? `(${t.documento_identidad})` : ''}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        await capacitacionesService.agregarParticipante(id, t.id);
                        toast.success(`${t.nombre_completo} asignado correctamente`);
                        loadCapacitacion();
                      } catch (err: any) {
                        toast.error(err.response?.data?.message || 'Error al asignar');
                      }
                    }}
                  >
                    Asignar
                  </Button>
                </div>
              ))}
            {trabajadores.filter((t) =>
              !busquedaTrabajador.trim() ||
              t.nombre_completo?.toLowerCase().includes(busquedaTrabajador.toLowerCase()) ||
              t.documento_identidad?.includes(busquedaTrabajador)
            ).filter((t) => !participantes.some((p) => p.trabajador_id === t.id)).length === 0 && (
              <div className="text-center py-8 text-slate-500">No hay trabajadores disponibles para asignar</div>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal Asignar por jerarquía */}
      <Modal isOpen={modalAsignarJerarquia} onClose={() => setModalAsignarJerarquia(false)} title="Asignar por jerarquía" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Seleccione por razón social, área, sede, etc.</p>
          <div>
            <label className="block text-sm font-medium mb-1">Razón Social</label>
            <Select value={jerarquiaEmpresa} onChange={(e) => setJerarquiaEmpresa(e.target.value)}>
              <option value="">Todos</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Área</label>
            <Select value={jerarquiaArea} onChange={(e) => setJerarquiaArea(e.target.value)}>
              <option value="">Todos</option>
              {areas.map((a) => (
                <option key={a.id} value={a.nombre}>{a.nombre}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Sede</label>
            <Input placeholder="Sede" value={jerarquiaSede} onChange={(e) => setJerarquiaSede(e.target.value)} />
          </div>
          <Button variant="primary" className="w-full" onClick={handleAsignarJerarquia}>Asignar seleccionados</Button>
        </div>
      </Modal>

      {/* Modal Importar */}
      <Modal isOpen={modalImportar} onClose={() => setModalImportar(false)} title="Importar trabajadores" size="md">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Seleccione un archivo Excel con la lista de trabajadores.</p>
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Upload className="w-12 h-12 mx-auto text-slate-400 mb-2" />
            <p className="text-sm text-slate-600">Arrastre el archivo o haga clic para seleccionar</p>
          </div>
        </div>
      </Modal>

      {/* Modal Completar capacitación */}
      <Modal isOpen={modalCompletar} onClose={() => setModalCompletar(false)} title="Mensaje de confirmación" size="sm">
        <div className="space-y-6">
          <p className="text-slate-600">¿Desea completar la capacitación?</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setModalCompletar(false)} disabled={completando}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleCompletarConfirmado} disabled={completando}>
              {completando ? 'Completando...' : 'Sí'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Reabrir capacitación */}
      <Modal isOpen={modalReabrir} onClose={() => setModalReabrir(false)} title="Mensaje de confirmación" size="sm">
        <div className="space-y-6">
          <p className="text-slate-600">¿Desea reabrir la capacitación? El estado volverá a Programada.</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setModalReabrir(false)} disabled={reabriendo}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleReabrirConfirmado} disabled={reabriendo}>
              {reabriendo ? 'Reabriendo...' : 'Sí'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Cerrar capacitación */}
      <Modal isOpen={modalCerrar} onClose={() => setModalCerrar(false)} title="Mensaje de confirmación" size="sm">
        <div className="space-y-6">
          <p className="text-slate-600">
            ¿Desea cerrar la capacitación? Una vez cerrada no podrá modificar ni regresar a un estado anterior.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setModalCerrar(false)} disabled={cerrando}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleCerrarConfirmado} disabled={cerrando}>
              {cerrando ? 'Cerrando...' : 'Sí'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Programar capacitación */}
      <Modal isOpen={modalProgramar} onClose={() => setModalProgramar(false)} title="Mensaje de confirmación" size="sm">
        <div className="space-y-6">
          <p className="text-slate-600">¿Desea programar la capacitación?</p>
          <p className="text-xs text-slate-500">Se requiere: Responsable del registro, Responsable de certificación y Capacitador, los 3 con su firma.</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setModalProgramar(false)} disabled={programando}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleProgramarConfirmado} disabled={programando}>
              {programando ? 'Programando...' : 'Sí'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Duplicar capacitación */}
      <Modal isOpen={modalDuplicar} onClose={() => setModalDuplicar(false)} title="Mensaje de confirmación" size="sm">
        <div className="space-y-6">
          <p className="text-slate-600">¿Desea duplicar la capacitación? Se creará un nuevo registro con los mismos datos y estado Pendiente.</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setModalDuplicar(false)} disabled={duplicando}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleDuplicarConfirmado} disabled={duplicando}>
              {duplicando ? 'Duplicando...' : 'Sí'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
