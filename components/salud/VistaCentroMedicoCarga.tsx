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
  const [subiendo, setSubiendo] = useState(false);
  const [notificando, setNotificando] = useState(false);
  const [modalCerrarAtencion, setModalCerrarAtencion] = useState(false);

  const cargarDocumentos = useCallback(async () => {
    if (!examen?.id) return;
    setLoading(true);
    try {
      const docs = await saludService.findDocumentosExamen(examen.id);
      setDocumentos(docs);
    } catch {
      setDocumentos([]);
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
    cargarDocumentos();
    cargarPruebasMedicas();
  }, [cargarDocumentos, cargarPruebasMedicas]);

  const sinPruebasConfiguradas = pruebasMedicas.length === 0;

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
    setModalCerrarAtencion(false);
    setNotificando(true);
    try {
      const actualizado = await saludService.notificarResultadosListos(examen.id);
      onExamenActualizado?.(actualizado);
      toast.success('Atención cerrada. El examen está marcado como Realizado.');
    } catch (err: any) {
      toast.error('Error al cerrar atención', {
        description: err.response?.data?.message || err.message,
      });
    } finally {
      setNotificando(false);
    }
  };

  const yaRealizado = examen.estado === 'Realizado' || examen.estado === 'Revisado';

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

      {!yaRealizado && (
        <>
          {/* Zona Dropzone */}
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
                      {pruebasMedicas.map((p) => (
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
              <Button
                onClick={handleCargar}
                disabled={subiendo}
                className="mt-4 gap-2"
              >
                <Upload className="h-4 w-4" />
                {subiendo ? 'Subiendo...' : 'Guardar y Subir Archivos'}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Historial de documentos */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h3 className="font-semibold text-slate-800 mb-4">
          Documentos subidos para este examen
        </h3>
        {loading ? (
          <p className="text-slate-500 text-sm">Cargando...</p>
        ) : documentos.length === 0 ? (
          <p className="text-slate-500 text-sm">No hay documentos subidos aún.</p>
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
                      {!yaRealizado && (
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

      {/* Cerrar atención del trabajador (marca examen como Realizado) */}
      {!yaRealizado && (
        <div className="flex flex-col items-end gap-1">
          <p className="text-sm text-slate-500">
            Cuando termine de subir todos los resultados, cierre la atención para notificar al médico.
          </p>
          <Button
            onClick={() => setModalCerrarAtencion(true)}
            disabled={notificando}
            variant="outline"
            className="gap-2"
          >
            <FileCheck className="h-4 w-4" />
            {notificando ? 'Procesando...' : 'Cerrar Atención del Trabajador'}
          </Button>
        </div>
      )}

      <Modal
        isOpen={modalCerrarAtencion}
        onClose={() => setModalCerrarAtencion(false)}
        title="¿Cerrar atención del trabajador?"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-slate-600">
            Esta acción es irreversible. Una vez cerrada la atención, no se podrán modificar ni agregar documentos a este examen.
          </p>
          <p className="text-sm text-slate-500">
            El examen quedará marcado como <strong>Realizado</strong> y se notificará al médico ocupacional.
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
              {notificando ? 'Procesando...' : 'Sí, cerrar atención'}
            </Button>
          </div>
        </div>
      </Modal>

      {yaRealizado && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-green-800 font-medium">
            Este examen ya fue marcado como realizado.
          </span>
        </div>
      )}
    </div>
  );
}
