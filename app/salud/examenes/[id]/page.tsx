'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Save,
  User,
  FileText,
  Download,
  AlertCircle,
  Lock,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { UsuarioRol } from '@/types';
import { saludService, ExamenMedico } from '@/services/salud.service';
import { trabajadoresService, Trabajador } from '@/services/trabajadores.service';
import { configEmoService } from '@/services/config-emo.service';
import { VistaCentroMedicoCarga } from '@/components/salud/VistaCentroMedicoCarga';

const TIPOS_EMO = [
  { value: 'Ingreso', label: 'INGRESO' },
  { value: 'Periódico', label: 'PERIÓDICO' },
  { value: 'Pre-Ocupacional', label: 'PRE-OCUPACIONAL' },
  { value: 'Retiro', label: 'RETIRO' },
  { value: 'Reingreso', label: 'REINGRESO' },
  { value: 'Por Exposición', label: 'POR EXPOSICIÓN' },
  { value: 'Otros', label: 'OTROS' },
  { value: 'Reubicación', label: 'REUBICACIÓN' },
];

const APTITUD_EMO = [
  { value: 'Apto', label: 'APTO' },
  { value: 'No Apto', label: 'NO APTO' },
  { value: 'Apto con Restricciones', label: 'APTO CON RESTRICCIONES' },
  { value: 'Pendiente', label: 'OBSERVADO' },
];

const APTITUD_ALTURA = [
  { value: 'No aplica', label: 'No Aplica' },
  { value: 'Apto', label: 'Apto' },
  { value: 'No Apto', label: 'No Apto' },
  { value: 'No Evaluado', label: 'No Evaluado' },
];

const ESTADOS_EMO = [
  { value: 'Programado', label: 'PROGRAMADO' },
  { value: 'Pruebas Cargadas', label: 'PRUEBAS CARGADAS' },
  { value: 'Completado', label: 'COMPLETADO' },
  { value: 'Entregado', label: 'ENTREGADO' },
  { value: 'Reprogramado', label: 'REPROGRAMADO' },
  { value: 'Cancelado', label: 'CANCELADO' },
  { value: 'Vencido', label: 'VENCIDO' },
  { value: 'Por Vencer', label: 'POR VENCER' },
];

function formatSexo(s: string | null) {
  if (!s) return '-';
  const m: Record<string, string> = {
    MASCULINO: 'Masculino',
    FEMENINO: 'Femenino',
    OTRO: 'Otro',
  };
  return m[s] || s;
}

export default function DetalleEmoPage() {
  const params = useParams();
  const router = useRouter();
  const { hasAnyRole, hasRole, usuario, isLoading: authLoading } = useAuth();
  const id = params.id as string;

  const canViewMedicalData = hasAnyRole([UsuarioRol.MEDICO, UsuarioRol.CENTRO_MEDICO]);
  const isMedicoOnly =
    hasRole(UsuarioRol.MEDICO) &&
    !hasRole(UsuarioRol.SUPER_ADMIN) &&
    !hasRole(UsuarioRol.ADMIN_EMPRESA);
  /** Vista de carga pura: solo para usuario CENTRO_MEDICO sin roles admin/médico */
  const esCentroMedicoSolo =
    !!usuario?.roles?.includes(UsuarioRol.CENTRO_MEDICO) &&
    !hasAnyRole([UsuarioRol.SUPER_ADMIN, UsuarioRol.ADMIN_EMPRESA, UsuarioRol.MEDICO]);

  const [examen, setExamen] = useState<ExamenMedico | null>(null);
  const [trabajador, setTrabajador] = useState<Trabajador | null>(null);
  const [perfilNombre, setPerfilNombre] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [descargandoResultado, setDescargandoResultado] = useState(false);
  const [docAbriendoId, setDocAbriendoId] = useState<string | null>(null);

  const [estado, setEstado] = useState('');
  const [tipoEmo, setTipoEmo] = useState('');
  const [fechaEmo, setFechaEmo] = useState('');
  const [horaProgramacion, setHoraProgramacion] = useState('');
  const [proyecto, setProyecto] = useState('');
  const [adicionales, setAdicionales] = useState('');
  const [recomendaciones, setRecomendaciones] = useState('');
  const [resultado, setResultado] = useState('');
  const [fechaResultado, setFechaResultado] = useState('');
  const [restricciones, setRestricciones] = useState('');
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    saludService
      .findOneExamen(id)
      .then((e) => {
        if (cancelled) return;
        setExamen(e);
        setEstado(e.estado);
        setTipoEmo(e.tipo_examen);
        setFechaEmo(e.fecha_programada || '');
        setHoraProgramacion(e.hora_programacion || '');
        setProyecto(e.proyecto || '');
        setAdicionales(e.adicionales || '');
        setRecomendaciones(e.recomendaciones_personalizadas || '');
        setResultado(e.resultado);
        setFechaResultado(e.fecha_realizado || '');
        setRestricciones(e.restricciones ?? '');
        setObservaciones(e.observaciones ?? '');
        return trabajadoresService.findOne(e.trabajador_id);
      })
      .then((t) => {
        if (cancelled || !t) return;
        setTrabajador(t);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error('Error al cargar el examen', {
            description: err.response?.data?.message || err.message,
          });
          router.push('/salud/examenes');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  useEffect(() => {
    if (!examen?.perfil_emo_id) {
      setPerfilNombre('');
      return;
    }
    configEmoService
      .getPerfil(examen.perfil_emo_id)
      .then((p) => setPerfilNombre(p.nombre))
      .catch(() => setPerfilNombre(''));
  }, [examen?.perfil_emo_id]);

  // Auto-fecha resultado cuando el médico selecciona una aptitud definida
  useEffect(() => {
    if (canViewMedicalData && resultado && resultado !== 'Pendiente' && !fechaResultado) {
      setFechaResultado(new Date().toISOString().split('T')[0]);
    }
  }, [resultado, canViewMedicalData]);

  const handleGuardar = async () => {
    if (!examen) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (isMedicoOnly) {
        // Médico solo envía campos clínicos; programación y estado quedan intactos
        payload.resultado = resultado;
        payload.fecha_realizado = fechaResultado || null;
        payload.restricciones = restricciones || undefined;
        payload.observaciones = observaciones || undefined;
      } else {
        payload.estado = estado;
        payload.tipo_examen = tipoEmo;
        payload.fecha_programada = fechaEmo;
        payload.hora_programacion = horaProgramacion || undefined;
        payload.proyecto = proyecto || undefined;
        payload.adicionales = adicionales || undefined;
        payload.recomendaciones_personalizadas = recomendaciones || undefined;
        if (canViewMedicalData) {
          payload.resultado = resultado;
          payload.fecha_realizado = fechaResultado || null;
          payload.restricciones = restricciones || undefined;
          payload.observaciones = observaciones || undefined;
        }
      }
      await saludService.updateExamen(examen.id, payload as any);
      toast.success('Examen actualizado correctamente');
      const actualizado = await saludService.findOneExamen(examen.id);
      setExamen(actualizado);
    } catch (e: any) {
      toast.error('Error al guardar', {
        description: e.response?.data?.message || e.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDescargarResultado = async () => {
    if (!examen?.id) return;
    setDescargandoResultado(true);
    try {
      const { url } = await saludService.getSignedUrlResultadoExamen(examen.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : err instanceof Error ? err.message : 'Error al abrir';
      toast.error('No se pudo abrir el archivo', { description: String(msg) });
    } finally {
      setDescargandoResultado(false);
    }
  };

  const handleDescargarRecomendacion = () => {
    const blob = new Blob([recomendaciones], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recomendaciones-emo.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleVerDocumento = async (docId: string) => {
    if (!examen?.id) return;
    setDocAbriendoId(docId);
    try {
      const { url } = await saludService.getSignedUrlDocumentoExamen(examen.id, docId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : err instanceof Error
            ? err.message
            : 'Error al abrir';
      toast.error('No se pudo abrir el documento', { description: String(msg) });
    } finally {
      setDocAbriendoId(null);
    }
  };

  if (loading || !examen || authLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  /** Vista de carga pura para Centro Médico: sin ficha colaborador, sin aptitud/CIE10/estado manual */
  if (esCentroMedicoSolo) {
    return (
      <VistaCentroMedicoCarga
        examen={examen}
        onExamenActualizado={setExamen}
      />
    );
  }

  return (
    <div className="p-6 max-w-5xl space-y-6">
      {/* CABECERA */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900">
          EXAMEN MÉDICO OCUPACIONAL
        </h1>
        <div className="flex gap-2">
          <Link href="/salud/examenes">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Regresar
            </Button>
          </Link>
          <Button
            onClick={handleGuardar}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            <Save className="h-4 w-4" />
            Guardar
          </Button>
          {trabajador && (
            <Link href={`/trabajadores/${trabajador.id}`}>
              <Button variant="outline" className="gap-2">
                <User className="h-4 w-4" />
                Ver Ficha de Colaborador
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* NOTA (oculta para médico: no puede modificar estado) */}
      {!isMedicoOnly && (
        <div className="flex items-start gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            <strong>Nota:</strong> Una vez que el EMO tiene una aptitud registrada y
            está en estado ASISTIÓ O ENTREGADO, podemos cambiarle el estado a LEÍDO
            desde la lista desplegable de ESTADO.
          </p>
        </div>
      )}

      {/* ESTADO (solo lectura para médico ocupacional) */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Estado:</label>
        <Select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          disabled={isMedicoOnly}
          className={`w-[200px] ${isMedicoOnly ? 'bg-gray-50' : ''}`}
        >
          <option value="">Seleccione</option>
          {ESTADOS_EMO.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </Select>
      </div>

      {/* DATOS DEL SERVIDOR */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          DATOS DEL SERVIDOR
        </h2>
        {trabajador ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <label className="block text-gray-500 text-xs mb-1">
                Nombres y Apellidos
              </label>
              <Input
                value={trabajador.nombre_completo}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-1">
                Correo Electrónico
              </label>
              <Input
                value={
                  trabajador.email_personal ||
                  trabajador.email_corporativo ||
                  '-'
                }
                disabled
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-1">Teléfono</label>
              <Input
                value={trabajador.telefono || '-'}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-1">
                N° Documento
              </label>
              <Input
                value={trabajador.documento_identidad}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-1">Sexo</label>
              <Input
                value={formatSexo(trabajador.sexo)}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-1">
                Fecha de Nacimiento
              </label>
              <Input
                value={trabajador.fecha_nacimiento || '-'}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-1">País</label>
              <Input
                value={trabajador.pais || '-'}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-1">
                Departamento
              </label>
              <Input
                value={trabajador.departamento || '-'}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-1">Provincia</label>
              <Input
                value={trabajador.provincia || '-'}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-1">Distrito</label>
              <Input
                value={trabajador.distrito || '-'}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-1">Unidad</label>
              <Input
                value={trabajador.unidad || '-'}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-1">Área</label>
              <Input
                value={trabajador.area_nombre || '-'}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-1">Sede</label>
              <Input
                value={trabajador.sede || '-'}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-1">Puesto</label>
              <Input
                value={trabajador.puesto || trabajador.cargo || '-'}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-1">
                Centro de Costos
              </label>
              <Input
                value={trabajador.centro_costos || '-'}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-1">
                Jefe Directo
              </label>
              <Input
                value={trabajador.jefe_directo || '-'}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-gray-500 text-xs mb-1">
                Razón social
              </label>
              <Input
                value={trabajador.empresa_nombre || '-'}
                disabled
                className="bg-gray-50"
              />
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No se pudo cargar los datos del trabajador.</p>
        )}
      </div>

      {/* PREVIO A LA CITA */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          PREVIO A LA CITA - PROGRAMACIÓN DEL EXAMEN MÉDICO
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de EMO (*)
            </label>
            <Select
              value={tipoEmo}
              onChange={(e) => setTipoEmo(e.target.value)}
              disabled={isMedicoOnly}
              className={isMedicoOnly ? 'bg-gray-50' : ''}
            >
              <option value="">Seleccione</option>
              {TIPOS_EMO.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de EMO (*)
            </label>
            <Input
              type="date"
              value={fechaEmo}
              onChange={(e) => setFechaEmo(e.target.value)}
              disabled={isMedicoOnly}
              className={isMedicoOnly ? 'bg-gray-50' : ''}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hora Programación (*)
            </label>
            <div className="flex gap-2">
              <Input
                type="time"
                value={horaProgramacion}
                onChange={(e) => setHoraProgramacion(e.target.value)}
                disabled={isMedicoOnly}
                className={isMedicoOnly ? 'bg-gray-50' : ''}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleDescargarRecomendacion}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Protocolo / Perfil
            </label>
            <Input
              value={perfilNombre || '-'}
              disabled
              className="bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Centro Médico (*)
            </label>
            <Input value={examen.centro_medico} disabled className="bg-gray-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Proyecto
            </label>
            <Input
              value={proyecto}
              onChange={(e) => setProyecto(e.target.value)}
              placeholder="Proyecto"
              disabled={isMedicoOnly}
              className={isMedicoOnly ? 'bg-gray-50' : ''}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adicionales
            </label>
            <Input
              value={adicionales}
              onChange={(e) => setAdicionales(e.target.value)}
              placeholder="Adicionales"
              disabled={isMedicoOnly}
              className={isMedicoOnly ? 'bg-gray-50' : ''}
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Recomendaciones para asistir al centro médico (*)
          </label>
          <textarea
            className={`w-full min-h-[120px] p-3 border border-gray-300 rounded-md text-sm ${isMedicoOnly ? 'bg-gray-50 cursor-not-allowed' : ''}`}
            value={recomendaciones}
            onChange={(e) => setRecomendaciones(e.target.value)}
            placeholder="Recomendaciones..."
            readOnly={isMedicoOnly}
          />
        </div>
      </div>

      {/* POSTERIOR A LA CITA */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          POSTERIOR A LA CITA - RESULTADOS DEL EXAMEN MÉDICO
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Aptitud de EMO
            </label>
            <Select
              value={resultado}
              onChange={(e) => setResultado(e.target.value)}
              disabled={!canViewMedicalData}
              className={!canViewMedicalData ? 'bg-gray-50' : ''}
            >
              <option value="">Seleccione</option>
              {APTITUD_EMO.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Aptitud altura estructural
            </label>
            <Select disabled={!canViewMedicalData} className={!canViewMedicalData ? 'bg-gray-50' : ''}>
              <option value="">No aplica</option>
              {APTITUD_ALTURA.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Aptitud Anexo 16A
            </label>
            <Select disabled={!canViewMedicalData} className={!canViewMedicalData ? 'bg-gray-50' : ''}>
              <option value="">No aplica</option>
              {APTITUD_ALTURA.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Resultado
            </label>
            <Input
              type="date"
              value={fechaResultado}
              onChange={(e) => setFechaResultado(e.target.value)}
              disabled={!canViewMedicalData}
              className={!canViewMedicalData ? 'bg-gray-50' : ''}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vigencia
            </label>
            <Input
              value={
                examen.fecha_vencimiento
                  ? new Date(examen.fecha_vencimiento).toLocaleDateString('es-PE')
                  : '-'
              }
              disabled
              className="bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Resultado Registrado Por
            </label>
            <Input
              value={examen.cargado_por || '-'}
              disabled
              className="bg-gray-50"
            />
          </div>
        </div>

        {/* Diagnóstico CIE10 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Diagnóstico encontrados - Códigos CIE10
          </label>
          {canViewMedicalData ? (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <AlertCircle className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">No existen observaciones.</span>
              <Button variant="link" size="sm" className="text-blue-600">
                + Agregar Diagnóstico
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <Lock className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-800">
                Datos restringidos por privacidad. Solo visible para Médico Ocupacional o Centro Médico.
              </span>
            </div>
          )}
        </div>

        {/* Resultados adicionales, Recomendaciones, Restricciones, Conclusiones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recomendaciones generales tras evaluación
            </label>
            <textarea
              className={`w-full min-h-[80px] p-3 border rounded-md text-sm ${!canViewMedicalData ? 'bg-gray-50 border-gray-200' : 'border-gray-300'}`}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Recomendaciones..."
              readOnly={!canViewMedicalData}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Restricciones
            </label>
            <textarea
              className={`w-full min-h-[80px] p-3 border rounded-md text-sm ${!canViewMedicalData ? 'bg-gray-50 border-gray-200' : 'border-gray-300'}`}
              value={restricciones}
              onChange={(e) => setRestricciones(e.target.value)}
              placeholder="Restricciones..."
              readOnly={!canViewMedicalData}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Conclusiones
            </label>
            <textarea
              className={`w-full min-h-[80px] p-3 border rounded-md text-sm ${!canViewMedicalData ? 'bg-gray-50 border-gray-200' : 'border-gray-300'}`}
              placeholder="Conclusiones..."
              readOnly={!canViewMedicalData}
            />
          </div>
        </div>
      </div>

      {/* Levantamiento de Observaciones / Interconsultas */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Levantamiento de Observaciones / Interconsultas
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Diagnóstico</TableHead>
              <TableHead>Especialidad</TableHead>
              <TableHead>Plazo de levantamiento</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                No existen seguimientos a observaciones.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        {canViewMedicalData && (
          <Button variant="link" size="sm" className="mt-2 text-blue-600">
            + Agregar Interconsulta
          </Button>
        )}
      </div>

      {/* VIGILANCIA MÉDICA */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          VIGILANCIA MÉDICA
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Diagnóstico</TableHead>
              <TableHead>Especialidad</TableHead>
              <TableHead>Plazo de levantamiento</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                No existen vigilancias médicas.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        {canViewMedicalData && (
          <Button variant="link" size="sm" className="mt-2 text-blue-600">
            + Agregar Vigilancia Médica
          </Button>
        )}

        {canViewMedicalData && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Programa de Vigilancia Médica
            </label>
            <Select className="w-[280px] inline-block">
              <option value="">Seleccione</option>
              <option value="psicologia">PSICOLOGÍA</option>
              <option value="nutricion">NUTRICIÓN</option>
              <option value="musculoesqueleticos">TRASTORNOS MUSCULOESQUELÉTICOS</option>
              <option value="auditivos">AUDITIVOS</option>
              <option value="respiratorios">RESPIRATORIOS</option>
              <option value="oftalmologicos">OFTALMOLÓGICOS</option>
              <option value="cronicos">ENFERMEDADES CRÓNICAS</option>
            </Select>
            <Button variant="link" size="sm" className="ml-2 text-blue-600">
              + Agregar Programa
            </Button>
          </div>
        )}
      </div>

      {/* DOCUMENTOS ADJUNTOS */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Documentos Adjuntos
          </h2>
          <div className="flex gap-2">
            {canViewMedicalData && (
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <FileText className="h-4 w-4 mr-2" />
                Nuevo Documento
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={!canViewMedicalData}
              title={!canViewMedicalData ? 'Solo profesional de salud puede exportar el archivo EMO completo' : ''}
            >
              Exportar CAMO
            </Button>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nro</TableHead>
              <TableHead>Fecha de Registro</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Registrado Por</TableHead>
              {canViewMedicalData && <TableHead>Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Pruebas médicas subidas por el Centro Médico */}
            {(examen.documentos ?? []).map((doc, idx) => {
              const docAny = doc as {
                id: string;
                tipo_etiqueta?: string;
                prueba_medica?: { nombre: string };
                nombre_archivo: string;
                created_at?: string;
              };
              const titulo = `PRUEBA MÉDICA - ${docAny.prueba_medica?.nombre ?? docAny.tipo_etiqueta ?? docAny.nombre_archivo}`;
              const fechaReg = docAny.created_at
                ? new Date(docAny.created_at).toLocaleDateString('es-PE')
                : '-';
              return (
                <TableRow key={doc.id}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>{fechaReg}</TableCell>
                  <TableCell>{titulo}</TableCell>
                  <TableCell>{docAny.prueba_medica?.nombre ?? docAny.tipo_etiqueta ?? 'Documento'}</TableCell>
                  <TableCell>Centro Médico</TableCell>
                  {canViewMedicalData && (
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => handleVerDocumento(doc.id)}
                        disabled={docAbriendoId === doc.id}
                        className="inline-flex items-center gap-1.5 text-blue-600 hover:underline text-sm disabled:opacity-50"
                      >
                        <Eye className="h-4 w-4" />
                        {docAbriendoId === doc.id ? 'Abriendo...' : 'Ver'}
                      </button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {/* Archivo EMO completo (resultado) */}
            {examen.resultado_archivo_existe && !examen.resultado_archivo_url && (
              <TableRow>
                <TableCell>{(examen.documentos?.length ?? 0) + 1}</TableCell>
                <TableCell>-</TableCell>
                <TableCell>Archivo EMO completo</TableCell>
                <TableCell>Hoja de resultados</TableCell>
                <TableCell colSpan={canViewMedicalData ? 2 : 1} className="text-amber-700">
                  <span className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Documento subido. Solo descargable por Médico Ocupacional o Centro Médico.
                  </span>
                </TableCell>
              </TableRow>
            )}
            {examen.resultado_archivo_url && (
              <TableRow>
                <TableCell>{(examen.documentos?.length ?? 0) + 1}</TableCell>
                <TableCell>-</TableCell>
                <TableCell>Archivo EMO completo</TableCell>
                <TableCell>Hoja de resultados</TableCell>
                <TableCell>-</TableCell>
                {canViewMedicalData && (
                  <TableCell>
                    <button
                      type="button"
                      onClick={handleDescargarResultado}
                      disabled={descargandoResultado}
                      className="text-blue-600 hover:underline text-sm disabled:opacity-50"
                    >
                      {descargandoResultado ? 'Abriendo...' : 'Descargar'}
                    </button>
                  </TableCell>
                )}
              </TableRow>
            )}
            {(!examen.documentos || examen.documentos.length === 0) &&
              !examen.resultado_archivo_url &&
              !examen.resultado_archivo_existe && (
              <TableRow>
                <TableCell colSpan={canViewMedicalData ? 6 : 5} className="text-center py-8 text-gray-500">
                  No existen documentos.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="mt-4 flex items-start gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            <strong>Nota:</strong> Los archivos CONFIDENCIALES (archivo EMO completo, diagnósticos CIE10)
            solo pueden ser descargados por usuarios con el ROL DE PROFESIONAL DE SALUD (Médico Ocupacional / Centro Médico).
            El administrador puede descargar únicamente la ficha de aptitud y el cargo de entrega.
          </p>
        </div>
      </div>
    </div>
  );
}
