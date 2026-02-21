'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Upload, Trash2, ExternalLink, CheckCircle, FileCheck } from 'lucide-react';
import { toast } from 'sonner';
import { saludService, ExamenMedico } from '@/services/salud.service';
import { Modal } from '@/components/ui/modal';

/** Archivo pendiente con prueba médica seleccionada (desde maestro dinámico) */
interface FileConTipo {
  file: File;
  pruebaMedicaId: string;
  id: string;
}

interface DocumentoSubido {
  id: string;
  tipo_etiqueta: string;
  nombre_archivo: string;
  url: string;
  created_at: string;
}

interface VistaCentroMedicoCargaProps {
  examen: ExamenMedico;
  onExamenActualizado?: (examen: ExamenMedico) => void;
}

export function VistaCentroMedicoCarga({ examen, onExamenActualizado }: VistaCentroMedicoCargaProps) {
  const [archivosPendientes, setArchivosPendientes] = useState<FileConTipo[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoSubido[]>([]);
  const [pruebasMedicas, setPruebasMedicas] = useState<Array<{ id: string; nombre: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [errorDocumentos, setErrorDocumentos] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [notificando, setNotificando] = useState(false);
  const [modalCerrarAtencion, setModalCerrarAtencion] = useState(false);

  // Usar documentos incluidos en el examen (findOneExamen) cuando estén disponibles
  useEffect(() => {
    if (examen?.documentos && Array.isArray(examen.documentos)) {
      setDocumentos(examen.documentos);
      setErrorDocumentos(null);
    }
  }, [examen?.documentos]);

  const cargarDocumentos = useCallback(async () => {
    if (!examen?.id) return;
    setLoading(true);
    setErrorDocumentos(null);
    try {
      const docs = await saludService.findDocumentosExamen(examen.id);
      setDocumentos(Array.isArray(docs) ? docs : []);
    } catch (err: unknown) {
      setDocumentos([]);
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : err instanceof Error ? err.message : 'Error al cargar documentos';
      setErrorDocumentos(msg || 'Error al cargar documentos');
      toast.error('No se pudieron cargar los documentos', { description: String(msg) });
    } finally {
      setLoading(false);
    }
  }, [examen?.id]);

  const cargarPruebasMedicas = useCallback(async () => {
    try {
      const res = await saludService.getPruebasMedicas();
      setPruebasMedicas(res);
    } catch {
      setPruebasMedicas([]);
    }
  }, []);

  useEffect(() => {
    // Si el examen ya trae documentos (findOneExamen), no hacer llamada separada
    if (examen?.documentos && Array.isArray(examen.documentos)) {
      setDocumentos(examen.documentos);
      setLoading(false);
    } else if (examen?.id) {
      cargarDocumentos();
    }
    cargarPruebasMedicas();
  }, [examen?.id, examen?.documentos, cargarDocumentos, cargarPruebasMedicas]);

  const sinPruebasConfiguradas = pruebasMedicas.length === 0;
  const pruebasOrdenadas = [...pruebasMedicas].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }),
  );

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(
      (f) =>
        f.type === 'application/pdf' ||
        f.type.startsWith('image/'),
    );
    if (files.length === 0) {
      toast.error('Solo se permiten PDF e imágenes');
      return;
    }
    const nuevos: FileConTipo[] = files.map((f) => ({
      file: f,
      pruebaMedicaId: '',
      id: `${f.name}-${Date.now()}-${Math.random()}`,
    }));
    setArchivosPendientes((prev) => [...prev, ...nuevos]);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    const nuevos: FileConTipo[] = files
      .filter(
        (f) =>
          f.type === 'application/pdf' || f.type.startsWith('image/'),
      )
      .map((f) => ({
        file: f,
        pruebaMedicaId: '',
        id: `${f.name}-${Date.now()}-${Math.random()}`,
      }));
    setArchivosPendientes((prev) => [...prev, ...nuevos]);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const quitarPendiente = (id: string) => {
    setArchivosPendientes((prev) => prev.filter((a) => a.id !== id));
  };

  const cambiarPruebaMedica = (id: string, pruebaMedicaId: string) => {
    setArchivosPendientes((prev) =>
      prev.map((a) => (a.id === id ? { ...a, pruebaMedicaId } : a)),
    );
  };

  const handleCargar = async () => {
    const sinPrueba = archivosPendientes.filter((a) => !a.pruebaMedicaId.trim());
    if (sinPrueba.length > 0) {
      toast.error('Asigne una prueba médica a todos los archivos');
      return;
    }
    setSubiendo(true);
    try {
      for (const a of archivosPendientes) {
        await saludService.uploadDocumentoExamen(examen.id, a.file, a.pruebaMedicaId);
      }
      setArchivosPendientes([]);
      await cargarDocumentos();
      toast.success('Archivos subidos. Se guardaron con nombres estandarizados.');
    } catch (err: any) {
      toast.error('Error al subir', {
        description: err.response?.data?.message || err.message,
      });
    } finally {
      setSubiendo(false);
    }
  };

  const handleEliminar = async (docId: string) => {
    try {
      await saludService.removeDocumentoExamen(examen.id, docId);
      await cargarDocumentos();
      toast.success('Documento eliminado');
    } catch (err: any) {
      toast.error('Error al eliminar', {
        description: err.response?.data?.message || err.message,
      });
    }
  };

  const handleNotificar = async () => {
    if (documentos.length === 0) {
      toast.error('Debe subir al menos un documento antes de finalizar la carga');
      return;
    }
    setModalCerrarAtencion(false);
    setNotificando(true);
    try {
      const actualizado = await saludService.notificarResultadosListos(examen.id);
      onExamenActualizado?.(actualizado);
      if (actualizado.documentos) {
        setDocumentos(actualizado.documentos);
      } else {
        await cargarDocumentos();
      }
      toast.success('Carga finalizada. El examen está en Pruebas Cargadas.');
    } catch (err: any) {
      toast.error('Error al cerrar atención', {
        description: err.response?.data?.message || err.message,
      });
    } finally {
      setNotificando(false);
    }
  };

  const puedeSubirMas = examen.estado === 'Programado' || examen.estado === 'Reprogramado' || examen.estado === 'Por Vencer' || examen.estado === 'Vencido';
  const cargaFinalizada = ['Pruebas Cargadas', 'Completado', 'Entregado'].includes(examen.estado);

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900">
          Carga de Resultados - Centro Médico
        </h1>
        <Link href="/salud/citas">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Regresar
          </Button>
        </Link>
      </div>

      {/* Cabecera simplificada: Nombre, DNI, Empresa/Sede, Tipo EMO (sin aptitud, vigencia, diagnósticos) */}
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <p className="font-medium text-slate-700">
            <span className="text-slate-500">Nombre:</span> {examen.trabajador_nombre || '-'}
          </p>
          <p className="font-medium text-slate-700">
            <span className="text-slate-500">DNI:</span> {examen.trabajador_documento || '-'}
          </p>
          <p className="font-medium text-slate-700 sm:col-span-2">
            <span className="text-slate-500">Empresa/Sede:</span> {examen.sede || examen.proyecto || '-'}
          </p>
          <p className="font-medium text-slate-700">
            <span className="text-slate-500">Tipo EMO:</span> {examen.tipo_examen || '-'}
          </p>
          <p className="font-medium text-slate-700">
            <span className="text-slate-500">Fecha programada:</span>{' '}
            {examen.fecha_programada ? new Date(examen.fecha_programada).toLocaleDateString('es-PE') : '-'}
          </p>
        </div>
      </div>

      {sinPruebasConfiguradas && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-2">
          <span className="text-amber-800 text-sm">
            No hay pruebas médicas configuradas. El administrador debe ejecutar el seed o agregar registros en la tabla pruebas_medicas.
          </span>
        </div>
      )}

      {/* Zona Dropzone y subida parcial - visible mientras se pueda subir más */}
      {puedeSubirMas && (
        <>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-primary/50 transition-colors bg-slate-50/50"
          >
            <input
              type="file"
              id="file-emo"
              multiple
              accept=".pdf,image/*"
              onChange={handleFileInput}
              className="hidden"
            />
            <label
              htmlFor="file-emo"
              className="cursor-pointer block"
            >
              <Upload className="h-12 w-12 mx-auto text-slate-400 mb-2" />
              <p className="text-slate-600 font-medium">
                Arrastre archivos aquí o haga clic para seleccionar
              </p>
              <p className="text-sm text-slate-500 mt-1">
                PDF, JPEG, PNG (máx. 10 MB). Se guardarán como APELLIDO_NOMBRE_PRUEBA_01.pdf
              </p>
            </label>
          </div>

          {/* Lista pre-carga */}
          {archivosPendientes.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h3 className="font-semibold text-slate-800 mb-3">Archivos a subir</h3>
              <div className="space-y-2">
                {archivosPendientes.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0"
                  >
                    <span className="text-sm text-slate-700 flex-1 truncate">
                      {a.file.name}
                    </span>
                    <Select
                      value={a.pruebaMedicaId}
                      onChange={(e) => cambiarPruebaMedica(a.id, e.target.value)}
                      className="w-[200px]"
                    >
                      <option value="">Prueba médica</option>
                      {pruebasOrdenadas.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => quitarPendiente(a.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <Button
                  onClick={handleCargar}
                  disabled={subiendo}
                  variant="outline"
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {subiendo ? 'Subiendo...' : 'Guardar y subida parcial'}
                </Button>
                <p className="text-xs text-slate-500 self-center">
                  Sube estos archivos ahora. Puede agregar más después si falta alguno.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Historial de documentos - SIEMPRE visible */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h3 className="font-semibold text-slate-800 mb-4">
          Documentos subidos para este examen
        </h3>
        {loading ? (
          <p className="text-slate-500 text-sm">Cargando...</p>
        ) : errorDocumentos ? (
          <div className="flex flex-col gap-2">
            <p className="text-red-600 text-sm">{errorDocumentos}</p>
            <Button variant="outline" size="sm" onClick={cargarDocumentos} className="w-fit">
              Reintentar
            </Button>
          </div>
        ) : documentos.length === 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-slate-500 text-sm">No hay documentos subidos aún.</p>
            {cargaFinalizada && (
              <Button variant="outline" size="sm" onClick={cargarDocumentos} className="w-fit">
                Reintentar carga de documentos
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Archivo</TableHead>
                <TableHead>Prueba médica</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documentos.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="text-sm">{d.nombre_archivo}</TableCell>
                  <TableCell className="text-sm">{d.tipo_etiqueta}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(d.created_at).toLocaleDateString('es-PE')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm flex items-center gap-1"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Ver
                      </a>
                      {puedeSubirMas && (
                        <button
                          onClick={() => handleEliminar(d.id)}
                          className="text-red-600 hover:underline text-sm flex items-center gap-1"
                        >
                          <Trash2 className="h-4 w-4" />
                          Borrar
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Botones: Subida parcial + Finalizar carga */}
      {puedeSubirMas && (
        <div className="flex flex-col items-end gap-3 pt-2">
          <p className="text-sm text-slate-500 text-right max-w-md">
            Use &quot;Guardar y subida parcial&quot; para subir archivos ahora. Si falta alguno, puede volver más tarde y agregarlo antes de finalizar.
          </p>
          {documentos.length === 0 && (
            <p className="text-amber-600 text-sm text-right">
              Debe subir al menos un documento antes de poder finalizar la carga.
            </p>
          )}
          <Button
            onClick={() => documentos.length > 0 && setModalCerrarAtencion(true)}
            disabled={notificando || documentos.length === 0}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <FileCheck className="h-4 w-4" />
            {notificando ? 'Procesando...' : 'Finalizar carga'}
          </Button>
        </div>
      )}

      <Modal
        isOpen={modalCerrarAtencion}
        onClose={() => setModalCerrarAtencion(false)}
        title="¿Guardar y finalizar la carga?"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-slate-600">
            Esta acción es irreversible. Una vez finalizada la carga, no se podrán modificar ni agregar documentos a este examen.
          </p>
          <p className="text-sm text-slate-500">
            El examen quedará en estado <strong>Pruebas Cargadas</strong> y se notificará al médico ocupacional para su revisión.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setModalCerrarAtencion(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleNotificar}
              disabled={notificando}
              className="gap-2"
            >
              <FileCheck className="h-4 w-4" />
              {notificando ? 'Procesando...' : 'Sí, finalizar carga'}
            </Button>
          </div>
        </div>
      </Modal>

      {cargaFinalizada && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-green-800 font-medium">
            La carga ya fue finalizada. Estado: {examen.estado}.
          </span>
        </div>
      )}
    </div>
  );
}
