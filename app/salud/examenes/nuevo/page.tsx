'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ArrowLeft, Save, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { UsuarioRol } from '@/types';
import { trabajadoresService, Trabajador } from '@/services/trabajadores.service';
import { configEmoService } from '@/services/config-emo.service';
import { saludService } from '@/services/salud.service';

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

export default function NuevoEmoPage() {
  const router = useRouter();
  const { usuario, empresasVinculadas, hasRole } = useAuth();
  const [buscarTerm, setBuscarTerm] = useState('');
  const [trabajador, setTrabajador] = useState<Trabajador | null>(null);
  const [resultadosBusqueda, setResultadosBusqueda] = useState<Trabajador[]>([]);
  const [buscando, setBuscando] = useState(false);

  const [tipoEmo, setTipoEmo] = useState('');
  const [fechaEmo, setFechaEmo] = useState('');
  const [horaProgramacion, setHoraProgramacion] = useState('');
  const [perfilId, setPerfilId] = useState('');
  const [centroId, setCentroId] = useState('');
  const [proyecto, setProyecto] = useState('');
  const [adicionales, setAdicionales] = useState('');
  const [recomendaciones, setRecomendaciones] = useState('');
  const [perfiles, setPerfiles] = useState<{ id: string; nombre: string }[]>([]);
  const [centros, setCentros] = useState<{ id: string; centro_medico: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const isSuperAdmin = hasRole(UsuarioRol.SUPER_ADMIN);
  const empresaId = usuario?.empresaId ?? empresasVinculadas?.[0]?.id;

  useEffect(() => {
    configEmoService.getPerfiles().then((p) => setPerfiles(p.map((x) => ({ id: x.id, nombre: x.nombre }))));
    configEmoService.getCentros().then((c) => setCentros(c.map((x) => ({ id: x.id, centro_medico: x.centro_medico }))));
    configEmoService.getRecomendaciones().then(setRecomendaciones);
  }, []);

  const handleBuscar = async () => {
    const q = buscarTerm.trim();
    if (!q || q.length < 2) {
      toast.error('Ingrese al menos 2 caracteres para buscar');
      return;
    }
    setBuscando(true);
    try {
      const res = await trabajadoresService.buscar(isSuperAdmin ? undefined : empresaId, q);
      setResultadosBusqueda(res);
      if (res.length === 0) toast.info('No se encontraron trabajadores');
    } catch (e: any) {
      toast.error('Error al buscar', { description: e.response?.data?.message || e.message });
    } finally {
      setBuscando(false);
    }
  };

  const handleSeleccionarTrabajador = (t: Trabajador) => {
    setTrabajador(t);
    setResultadosBusqueda([]);
    setBuscarTerm(t.nombre_completo);
  };

  const handleLimpiar = () => {
    setTrabajador(null);
    setBuscarTerm('');
    setResultadosBusqueda([]);
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

  const handleGuardar = async () => {
    if (!trabajador) {
      toast.error('Debe seleccionar un trabajador');
      return;
    }
    if (!tipoEmo) {
      toast.error('Seleccione el tipo de EMO');
      return;
    }
    if (!fechaEmo) {
      toast.error('Ingrese la fecha de EMO');
      return;
    }
    if (!horaProgramacion) {
      toast.error('Ingrese la hora de programación');
      return;
    }
    const centro = centros.find((c) => c.id === centroId);
    if (!centro) {
      toast.error('Seleccione el centro médico');
      return;
    }
    if (!recomendaciones.trim()) {
      toast.error('Las recomendaciones son obligatorias');
      return;
    }
    if (!usuario?.id) {
      toast.error('Sesión inválida');
      return;
    }

    setSubmitting(true);
    try {
      await saludService.createExamen({
        trabajador_id: trabajador.id,
        tipo_examen: tipoEmo as any,
        fecha_programada: fechaEmo,
        hora_programacion: horaProgramacion,
        centro_medico: centro.centro_medico,
        perfil_emo_id: perfilId || undefined,
        proyecto: proyecto || undefined,
        adicionales: adicionales || undefined,
        recomendaciones_personalizadas: recomendaciones.trim(),
        cargado_por_id: usuario.id,
      });
      toast.success('EMO programado correctamente');
      router.push('/salud/examenes');
    } catch (e: any) {
      toast.error('Error al guardar', {
        description: e.response?.data?.message || e.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatSexo = (s: string | null) => {
    if (!s) return '-';
    const m: Record<string, string> = { MASCULINO: 'Masculino', FEMENINO: 'Femenino', OTRO: 'Otro' };
    return m[s] || s;
  };

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">AGREGAR NUEVO EXAMEN</h1>
        <div className="flex gap-2">
          <Link href="/salud/examenes">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          </Link>
          <Button onClick={handleGuardar} disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
            <Save className="h-4 w-4 mr-2" />
            Guardar
          </Button>
        </div>
      </div>

      {/* DATOS DEL SERVIDOR */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">DATOS DEL SERVIDOR</h2>
        <p className="text-sm text-gray-600 mb-4">
          Ingresa el Nro de documento del usuario para la búsqueda:
        </p>
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Buscar por nombre o documento..."
            value={buscarTerm}
            onChange={(e) => setBuscarTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
            className="flex-1"
          />
          <Button onClick={handleBuscar} disabled={buscando}>
            Buscar
          </Button>
          <Button variant="outline" onClick={handleLimpiar}>
            Limpiar
          </Button>
        </div>

        {resultadosBusqueda.length > 0 && (
          <div className="mb-4 border rounded-md p-2 max-h-40 overflow-y-auto">
            {resultadosBusqueda.map((t) => (
              <button
                key={t.id}
                type="button"
                className="block w-full text-left px-3 py-2 hover:bg-gray-100 rounded"
                onClick={() => handleSeleccionarTrabajador(t)}
              >
                {t.nombre_completo} - {t.documento_identidad}
              </button>
            ))}
          </div>
        )}

        {trabajador && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <label className="block text-gray-500 text-xs">Nombres y Apellidos</label>
              <Input value={trabajador.nombre_completo} disabled className="bg-gray-50" />
            </div>
            <div>
              <label className="block text-gray-500 text-xs">Correo Electrónico</label>
              <Input value={trabajador.email_personal || trabajador.email_corporativo || '-'} disabled className="bg-gray-50" />
            </div>
            <div>
              <label className="block text-gray-500 text-xs">Teléfono</label>
              <Input value={trabajador.telefono || '-'} disabled className="bg-gray-50" />
            </div>
            <div>
              <label className="block text-gray-500 text-xs">N° Documento</label>
              <Input value={trabajador.documento_identidad} disabled className="bg-gray-50" />
            </div>
            <div>
              <label className="block text-gray-500 text-xs">Sexo</label>
              <Input value={formatSexo(trabajador.sexo)} disabled className="bg-gray-50" />
            </div>
            <div>
              <label className="block text-gray-500 text-xs">Fecha de Nacimiento</label>
              <Input value={trabajador.fecha_nacimiento || '-'} disabled className="bg-gray-50" />
            </div>
            <div>
              <label className="block text-gray-500 text-xs">País</label>
              <Input value={trabajador.pais || '-'} disabled className="bg-gray-50" />
            </div>
            <div>
              <label className="block text-gray-500 text-xs">Departamento</label>
              <Input value={trabajador.departamento || '-'} disabled className="bg-gray-50" />
            </div>
            <div>
              <label className="block text-gray-500 text-xs">Provincia</label>
              <Input value={trabajador.provincia || '-'} disabled className="bg-gray-50" />
            </div>
            <div>
              <label className="block text-gray-500 text-xs">Distrito</label>
              <Input value={trabajador.distrito || '-'} disabled className="bg-gray-50" />
            </div>
            <div>
              <label className="block text-gray-500 text-xs">Unidad</label>
              <Input value={trabajador.unidad || '-'} disabled className="bg-gray-50" />
            </div>
            <div>
              <label className="block text-gray-500 text-xs">Área</label>
              <Input value={trabajador.area_nombre || '-'} disabled className="bg-gray-50" />
            </div>
            <div>
              <label className="block text-gray-500 text-xs">Sede</label>
              <Input value={trabajador.sede || '-'} disabled className="bg-gray-50" />
            </div>
            <div>
              <label className="block text-gray-500 text-xs">Puesto</label>
              <Input value={trabajador.cargo || '-'} disabled className="bg-gray-50" />
            </div>
            <div>
              <label className="block text-gray-500 text-xs">Centro de Costos</label>
              <Input value={trabajador.centro_costos || '-'} disabled className="bg-gray-50" />
            </div>
            <div>
              <label className="block text-gray-500 text-xs">Jefe Directo</label>
              <Input value={trabajador.jefe_directo || '-'} disabled className="bg-gray-50" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-gray-500 text-xs">Razón social</label>
              <Input value={trabajador.empresa_nombre || '-'} disabled className="bg-gray-50" />
            </div>
          </div>
        )}
      </div>

      {/* DATOS DE EMO */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">DATOS DE EMO</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de EMO (*)</label>
            <Select value={tipoEmo} onChange={(e) => setTipoEmo(e.target.value)}>
              <option value="">Seleccione</option>
              {TIPOS_EMO.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de EMO (*)</label>
            <Input
              type="date"
              value={fechaEmo}
              onChange={(e) => setFechaEmo(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hora Programación (*)</label>
            <Input
              type="time"
              value={horaProgramacion}
              onChange={(e) => setHoraProgramacion(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={handleDescargarRecomendacion}>
              <Download className="h-4 w-4 mr-2" />
              Descargar recomendación
            </Button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Protocolo / Perfil</label>
            <Select value={perfilId} onChange={(e) => setPerfilId(e.target.value)}>
              <option value="">Seleccione</option>
              {perfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Centro Médico (*)</label>
            <Select value={centroId} onChange={(e) => setCentroId(e.target.value)}>
              <option value="">Seleccione</option>
              {centros.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.centro_medico}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Proyecto</label>
            <Input
              value={proyecto}
              onChange={(e) => setProyecto(e.target.value)}
              placeholder="Proyecto"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adicionales</label>
            <Input
              value={adicionales}
              onChange={(e) => setAdicionales(e.target.value)}
              placeholder="Adicionales"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Recomendaciones para asistir al centro médico (*)
          </label>
          <textarea
            className="w-full min-h-[180px] p-3 border border-gray-300 rounded-md text-sm"
            value={recomendaciones}
            onChange={(e) => setRecomendaciones(e.target.value)}
            placeholder="Recomendaciones..."
          />
        </div>
      </div>
    </div>
  );
}
