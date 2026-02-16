'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { capacitacionesService, Capacitacion, PasoInstruccion } from '@/services/capacitaciones.service';
import { trabajadoresService } from '@/services/trabajadores.service';
import { configCapacitacionesService } from '@/services/config-capacitaciones.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { SignaturePad } from '@/components/ui/signature-pad';
import {
  ChevronLeft,
  GraduationCap,
  Calendar,
  Clock,
  FileText,
  PenLine,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

const ID_PASO_FIRMA = 'firma-registro-participacion';

export default function MisCapacitacionDetallePage() {
  const params = useParams();
  const router = useRouter();
  const { usuario } = useAuth();
  const id = params.id as string;

  const [capacitacion, setCapacitacion] = useState<Capacitacion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pasoActual, setPasoActual] = useState(0);
  const [firmaDataUrl, setFirmaDataUrl] = useState<string>('');
  const [firmaGuardadaUrl, setFirmaGuardadaUrl] = useState<string | null>(null);
  const [datosTrabajador, setDatosTrabajador] = useState<{ nombres: string; apellido_paterno: string; apellido_materno: string } | null>(null);
  const [aceptoTerminos, setAceptoTerminos] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [respuestasEvaluacion, setRespuestasEvaluacion] = useState<Record<number, number>>({});
  const [evaluacionResultado, setEvaluacionResultado] = useState<{
    aprobado: boolean;
    puntaje: number;
    intentos_usados: number;
    intentos_restantes: number;
  } | null>(null);
  const [isEnviandoEvaluacion, setIsEnviandoEvaluacion] = useState(false);
  const [limiteIntentos, setLimiteIntentos] = useState(3);
  const [isDescargandoCertificado, setIsDescargandoCertificado] = useState(false);

  const tieneTrabajadorId = !!usuario?.trabajadorId;

  useEffect(() => {
    if (id && tieneTrabajadorId) loadCapacitacion();
  }, [id, tieneTrabajadorId]);

  useEffect(() => {
    configCapacitacionesService.getConfig().then((c) => setLimiteIntentos(c.limite_intentos ?? 3)).catch(() => {});
  }, []);

  const loadCapacitacion = async () => {
    try {
      setIsLoading(true);
      const data = await capacitacionesService.findOneParaTrabajador(id);
      const participante = data.participantes?.find((p) => p.trabajador_id === usuario?.trabajadorId);
      if (!participante) {
        toast.error('No estás registrado en esta capacitación');
        router.push('/mis-capacitaciones');
        return;
      }
      setCapacitacion(data);
      setEvaluacionResultado(null);
      setRespuestasEvaluacion({});
      if (usuario?.trabajadorId) {
        try {
          const trab = await trabajadoresService.findOne(usuario.trabajadorId);
          if (trab) {
            setDatosTrabajador({
              nombres: trab.nombres ?? '',
              apellido_paterno: trab.apellido_paterno ?? '',
              apellido_materno: trab.apellido_materno ?? '',
            });
            const firma = usuario?.firma_url || trab.firma_digital_url;
            if (firma) setFirmaGuardadaUrl(firma);
          }
        } catch {
          // ignore
        }
      }
    } catch (error: any) {
      toast.error('Error al cargar capacitación', {
        description: error.response?.data?.message || 'No se pudo cargar la capacitación',
      });
      router.push('/mis-capacitaciones');
    } finally {
      setIsLoading(false);
    }
  };

  const pasos = (() => {
    const inst = capacitacion?.instrucciones ?? [];
    const tienePasoFirma = inst.some((p: any) => p.firmaRegistro || p.id === ID_PASO_FIRMA);
    if (!tienePasoFirma) {
      return [...inst, { id: ID_PASO_FIRMA, descripcion: 'Firma de registro de participación', firmaRegistro: true }];
    }
    return inst;
  })();

  const esPasoFirma = (paso: any) => paso?.firmaRegistro || paso?.id === ID_PASO_FIRMA;
  const pasoActualData = pasos[pasoActual];
  const esPasoFirmaActual = pasoActualData && esPasoFirma(pasoActualData);
  const esPasoEvaluacionActual = pasoActualData?.esEvaluacion && !esPasoFirma(pasoActualData);
  const preguntas = (pasoActualData as PasoInstruccion)?.preguntas ?? [];
  const participante = capacitacion?.participantes?.find((p) => p.trabajador_id === usuario?.trabajadorId);
  const evaluacionAprobada = evaluacionResultado?.aprobado ?? participante?.aprobado ?? false;
  const yaFirmo = (participante as any)?.firmo ?? false;

  const handleEnviarEvaluacion = async () => {
    if (!pasoActualData || preguntas.length === 0) return;
    const respuestas = preguntas.map((_, i) => ({
      pregunta_index: i,
      respuesta_seleccionada: respuestasEvaluacion[i] ?? -1,
    }));
    if (respuestas.some((r) => r.respuesta_seleccionada < 0)) {
      toast.error('Responde todas las preguntas antes de enviar');
      return;
    }
    setIsEnviandoEvaluacion(true);
    try {
      const result = await capacitacionesService.evaluarPaso(id, pasoActualData.id, respuestas);
      setEvaluacionResultado({
        aprobado: result.aprobado,
        puntaje: result.puntaje,
        intentos_usados: result.intentos_usados,
        intentos_restantes: result.intentos_restantes,
      });
      if (result.aprobado) {
        toast.success(`¡Aprobado! Puntaje: ${result.puntaje.toFixed(1)}/20`);
        loadCapacitacion();
      } else {
        toast.error(`Desaprobado. Puntaje: ${result.puntaje.toFixed(1)}/20. Intentos restantes: ${result.intentos_restantes}`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al evaluar');
    } finally {
      setIsEnviandoEvaluacion(false);
    }
  };

  const handleReintentar = () => {
    setEvaluacionResultado(null);
    setRespuestasEvaluacion({});
  };

  const handleContinuar = () => {
    if (esPasoFirmaActual) {
      if (!aceptoTerminos) {
        toast.error('Debes aceptar los términos y condiciones');
        return;
      }
      const tieneFirma = !!firmaDataUrl || !!firmaGuardadaUrl;
      if (!tieneFirma) {
        toast.error('Debes registrar tu firma');
        return;
      }
      handleFirmar();
    } else if (esPasoEvaluacionActual) {
      if (!evaluacionAprobada) {
        toast.error('Debes aprobar la evaluación para continuar');
        return;
      }
      setPasoActual((p) => Math.min(p + 1, pasos.length - 1));
      setEvaluacionResultado(null);
      setRespuestasEvaluacion({});
    } else {
      setPasoActual((p) => Math.min(p + 1, pasos.length - 1));
    }
  };

  const handleFirmar = async () => {
    if (!usuario?.trabajadorId || !capacitacion) return;
    setIsSubmitting(true);
    try {
      await capacitacionesService.actualizarAsistencia(
        id,
        usuario.trabajadorId,
        participante?.asistencia ?? false,
        participante?.calificacion ?? undefined,
        participante?.aprobado ?? false,
        true
      );
      toast.success('Registro de participación firmado correctamente');
      router.push('/mis-capacitaciones');
    } catch (error: any) {
      toast.error('Error al registrar firma', {
        description: error.response?.data?.message || 'No se pudo guardar la firma',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnterior = () => {
    setPasoActual((p) => Math.max(0, p - 1));
    setEvaluacionResultado(null);
    setRespuestasEvaluacion({});
  };

  const handleDescargarCertificado = async () => {
    if (!usuario?.trabajadorId || !id) return;
    setIsDescargandoCertificado(true);
    try {
      const { url } = await capacitacionesService.obtenerUrlCertificado(id, usuario.trabajadorId);
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        toast.error('No se encontró el certificado');
      }
    } catch (error: any) {
      toast.error('Error al obtener el certificado', {
        description: error.response?.data?.message || 'El certificado aún no está disponible',
      });
    } finally {
      setIsDescargandoCertificado(false);
    }
  };

  if (!tieneTrabajadorId) {
    return (
      <div className="p-6">
        <div className="p-12 text-center">
          <GraduationCap className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Acceso restringido</h3>
          <p className="text-slate-600">Debes tener un trabajador vinculado para ver esta capacitación.</p>
          <Link href="/mis-capacitaciones">
            <Button variant="outline" className="mt-4">Volver</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!capacitacion) return null;

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <Link href="/mis-capacitaciones" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900">
        <ChevronLeft className="w-4 h-4" />
        Regresar
      </Link>

      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h1 className="text-xl font-bold text-slate-900 mb-2">{capacitacion.titulo}</h1>
        <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {capacitacion.fecha} {capacitacion.fecha_fin && capacitacion.fecha_fin !== capacitacion.fecha ? ` - ${capacitacion.fecha_fin}` : ''}
          </span>
          {capacitacion.hora_inicio && (
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {capacitacion.hora_inicio}
            </span>
          )}
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {pasos.map((paso, i) => (
            <button
              key={paso.id}
              type="button"
              onClick={() => setPasoActual(i)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                pasoActual === i
                  ? 'bg-primary text-white'
                  : i < pasoActual ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {pasoActualData && (
          <div className="space-y-6">
            {!esPasoFirmaActual ? (
              <>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    {pasoActualData.esEvaluacion ? (
                      <FileText className="w-5 h-5" />
                    ) : (
                      <GraduationCap className="w-5 h-5" />
                    )}
                    Paso {pasoActual + 1}
                    {pasoActualData.esEvaluacion && (
                      <span className="text-sm font-normal text-amber-600">(Evaluación)</span>
                    )}
                  </h2>
                  <p className="text-slate-700 whitespace-pre-wrap">{pasoActualData.descripcion || 'Sin descripción'}</p>
                </div>

                {pasoActualData.esEvaluacion && preguntas.length > 0 && (
                  <div className="space-y-6">
                    {evaluacionResultado ? (
                      <div className={`rounded-lg p-4 ${evaluacionResultado.aprobado ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          {evaluacionResultado.aprobado ? (
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                          ) : (
                            <XCircle className="w-6 h-6 text-red-600" />
                          )}
                          <span className={`font-semibold ${evaluacionResultado.aprobado ? 'text-green-800' : 'text-red-800'}`}>
                            {evaluacionResultado.aprobado ? '¡Aprobado!' : 'Desaprobado'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700">
                          Puntaje: {evaluacionResultado.puntaje.toFixed(1)}/20 · Intentos usados: {evaluacionResultado.intentos_usados}/{limiteIntentos}
                        </p>
                        {!evaluacionResultado.aprobado && evaluacionResultado.intentos_restantes > 0 && (
                          <Button variant="outline" size="sm" className="mt-3" onClick={handleReintentar} disabled={isEnviandoEvaluacion}>
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Reintentar ({evaluacionResultado.intentos_restantes} restantes)
                          </Button>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="space-y-4">
                          {preguntas.map((p, pi) => (
                            <div key={pi} className="border border-slate-200 rounded-lg p-4">
                              <p className="font-medium text-slate-900 mb-2">{pi + 1}. {p.texto_pregunta}</p>
                              <div className="space-y-2">
                                {p.opciones?.map((op, oi) => (
                                  <label key={oi} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`pregunta-${pi}`}
                                      checked={respuestasEvaluacion[pi] === oi}
                                      onChange={() => setRespuestasEvaluacion((prev) => ({ ...prev, [pi]: oi }))}
                                      className="w-4 h-4"
                                    />
                                    <span className="text-slate-700">{op}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                        <Button
                          variant="primary"
                          onClick={handleEnviarEvaluacion}
                          disabled={isEnviandoEvaluacion || preguntas.some((_, i) => respuestasEvaluacion[i] === undefined)}
                        >
                          {isEnviandoEvaluacion ? 'Enviando...' : 'Enviar evaluación'}
                        </Button>
                      </>
                    )}
                  </div>
                )}

                {pasoActualData.esEvaluacion && preguntas.length === 0 && (
                  <p className="text-sm text-slate-500">Esta evaluación no tiene preguntas configuradas.</p>
                )}
              </>
            ) : (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <PenLine className="w-5 h-5" />
                  Firma el registro de participación de capacitación
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombres</label>
                    <Input value={datosTrabajador?.nombres ?? usuario?.nombres ?? ''} readOnly className="bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Apellido Paterno</label>
                    <Input value={datosTrabajador?.apellido_paterno ?? usuario?.apellido_paterno ?? ''} readOnly className="bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Apellido Materno</label>
                    <Input value={datosTrabajador?.apellido_materno ?? usuario?.apellido_materno ?? ''} readOnly className="bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Documento</label>
                    <Input value="DNI" readOnly className="bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nro de Documento</label>
                    <Input value={usuario?.dni ?? ''} readOnly className="bg-slate-50" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Firma Electrónica</label>
                  <p className="text-xs text-slate-500 mb-2">
                    Por favor recuerda que tu firma debe ser igual a la de tu Documento de Identidad.
                  </p>
                  {yaFirmo ? (
                    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                      <p className="text-sm text-green-700 font-medium flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" />
                        Ya has firmado el registro de participación
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {firmaGuardadaUrl && (
                        <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                          <p className="text-xs font-medium text-slate-600 mb-2">Firma registrada (puedes usarla o dibujar una nueva)</p>
                          <div className="min-h-[80px] flex items-center justify-center bg-white rounded p-2">
                            <img src={firmaGuardadaUrl} alt="Firma" className="max-h-20 object-contain" referrerPolicy="no-referrer" />
                          </div>
                        </div>
                      )}
                      <div>
                        {firmaGuardadaUrl && <p className="text-xs text-slate-500 mb-2">O dibuja una nueva firma abajo:</p>}
                        <SignaturePad
                          width={400}
                          height={120}
                          value={firmaDataUrl}
                          onChange={(url) => setFirmaDataUrl(url)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="terminos"
                    checked={aceptoTerminos}
                    onChange={(e) => setAceptoTerminos(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-slate-300"
                  />
                  <label htmlFor="terminos" className="text-sm text-slate-700">
                    Acepto que he leído y comprendido los{' '}
                    <a href="#" className="text-primary underline hover:no-underline">Términos y Condiciones de Uso</a>
                    {' '}y las{' '}
                    <a href="#" className="text-primary underline hover:no-underline">Políticas de Privacidad</a>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between mt-8 pt-6 border-t border-slate-200">
          <Button variant="outline" onClick={handleAnterior} disabled={pasoActual === 0}>
            Anterior
          </Button>
          <Button
            variant="primary"
            onClick={handleContinuar}
            disabled={(esPasoFirmaActual && yaFirmo) || (esPasoEvaluacionActual && !evaluacionAprobada)}
          >
            {isSubmitting ? 'Guardando...' : esPasoFirmaActual ? 'Continuar' : esPasoEvaluacionActual && !evaluacionAprobada ? 'Siguiente (aprueba primero)' : 'Siguiente'}
          </Button>
        </div>
      </div>

      {yaFirmo && participante?.aprobado && (
        <div className="mt-6">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleDescargarCertificado}
            disabled={isDescargandoCertificado}
          >
            <Download className="w-4 h-4 mr-2" />
            {isDescargandoCertificado ? 'Obteniendo certificado...' : 'Descargar certificado'}
          </Button>
        </div>
      )}
    </div>
  );
}
