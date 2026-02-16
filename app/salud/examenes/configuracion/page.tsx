'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
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
  Plus,
  FileText,
  Pencil,
  Trash2,
  Eye,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  configEmoService,
  PerfilEmo,
  CentroMedico,
  ResultadoAdicional,
  EmoDiferido,
} from '@/services/config-emo.service';
import { useAuth } from '@/contexts/AuthContext';

const RECOMENDACIONES_DEFAULT = `Se agenda a horas 8.30 am en en el comedor de GEXIM S.A.C en Av. Tomas Alva Edison 215, Urb. Industrial Santa Rosa, Ate - Lima.
Brinde sus nombres y la empresa en la que trabaja

Condiciones - requisitos para los exámenes médicos:

1. Ayuno estricto, la cena del día anterior a más tardar 8.00 pm comida ligera.
2. Llevar DNI.
3. Mascarilla.
4. Llevar lentes correctores en caso de los usuarios, si usa lentes de contacto debe dejar de usarlo 48 horas antes.
5. No tomar antibióticos 72 horas antes.
6. No estar con la regla de preferencia en caso de las mujeres.
7. No asistir con niños.`;

export default function ConfiguracionEmoPage() {
  const { usuario } = useAuth();
  const [perfiles, setPerfiles] = useState<PerfilEmo[]>([]);
  const [centros, setCentros] = useState<CentroMedico[]>([]);
  const [resultados, setResultados] = useState<ResultadoAdicional[]>([]);
  const [diferidos, setDiferidos] = useState<EmoDiferido[]>([]);
  const [recomendaciones, setRecomendaciones] = useState(RECOMENDACIONES_DEFAULT);
  const [buscarDiferidos, setBuscarDiferidos] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingRec, setSavingRec] = useState(false);

  const [modalCentro, setModalCentro] = useState(false);
  const [modalResultado, setModalResultado] = useState(false);
  const [editingCentro, setEditingCentro] = useState<CentroMedico | null>(null);
  const [editingResultado, setEditingResultado] = useState<ResultadoAdicional | null>(null);
  const [formCentro, setFormCentro] = useState({ nombre: '', direccion: '', archivo: null as File | null });
  const [formResultado, setFormResultado] = useState({ nombre: '' });
  const [submitting, setSubmitting] = useState(false);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [p, c, r, rec, d] = await Promise.all([
        configEmoService.getPerfiles(),
        configEmoService.getCentros(),
        configEmoService.getResultados(),
        configEmoService.getRecomendaciones(),
        configEmoService.getDiferidos(buscarDiferidos || undefined),
      ]);
      setPerfiles(p);
      setCentros(c);
      setResultados(r);
      setRecomendaciones(rec || RECOMENDACIONES_DEFAULT);
      setDiferidos(d);
    } catch (e: any) {
      toast.error('Error al cargar configuración', {
        description: e.response?.data?.message || e.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      configEmoService.getDiferidos(buscarDiferidos || undefined).then(setDiferidos).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [buscarDiferidos]);

  const handleGuardarRecomendacion = async () => {
    try {
      setSavingRec(true);
      await configEmoService.updateRecomendaciones(recomendaciones);
      toast.success('Recomendaciones guardadas');
    } catch (e: any) {
      toast.error('Error al guardar', {
        description: e.response?.data?.message || e.message,
      });
    } finally {
      setSavingRec(false);
    }
  };

  const openModalCentro = (centro?: CentroMedico) => {
    setEditingCentro(centro || null);
    setFormCentro({
      nombre: centro?.centro_medico ?? '',
      direccion: centro?.direccion ?? '',
      archivo: null,
    });
    setModalCentro(true);
  };

  const openModalResultado = (res?: ResultadoAdicional) => {
    setEditingResultado(res || null);
    setFormResultado({ nombre: res?.nombre ?? '' });
    setModalResultado(true);
  };

  const handleSubmitCentro = async () => {
    if (!formCentro.nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    try {
      setSubmitting(true);
      let archivoBase64: string | undefined;
      if (formCentro.archivo) {
        const buf = await formCentro.archivo.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        archivoBase64 = `data:application/pdf;base64,${btoa(binary)}`;
      }
      const dto = {
        nombre: formCentro.nombre.trim(),
        direccion: formCentro.direccion.trim() || undefined,
        archivo_pdf_base64: archivoBase64,
      };
      if (editingCentro) {
        await configEmoService.updateCentro(editingCentro.id, dto);
        toast.success('Centro médico actualizado');
      } else {
        await configEmoService.createCentro(dto);
        toast.success('Centro médico creado');
      }
      setModalCentro(false);
      loadAll();
    } catch (e: any) {
      toast.error('Error', { description: e.response?.data?.message || e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitResultado = async () => {
    if (!formResultado.nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    try {
      setSubmitting(true);
      if (editingResultado) {
        await configEmoService.updateResultado(editingResultado.id, { nombre: formResultado.nombre.trim() });
        toast.success('Resultado actualizado');
      } else {
        await configEmoService.createResultado({ nombre: formResultado.nombre.trim() });
        toast.success('Resultado creado');
      }
      setModalResultado(false);
      loadAll();
    } catch (e: any) {
      toast.error('Error', { description: e.response?.data?.message || e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveCentro = async (id: string) => {
    if (!confirm('¿Desactivar este centro médico?')) return;
    try {
      await configEmoService.removeCentro(id);
      toast.success('Centro médico desactivado');
      loadAll();
    } catch (e: any) {
      toast.error('Error', { description: e.response?.data?.message || e.message });
    }
  };

  const handleRemoveResultado = async (id: string) => {
    if (!confirm('¿Eliminar este resultado adicional?')) return;
    try {
      await configEmoService.removeResultado(id);
      toast.success('Resultado eliminado');
      loadAll();
    } catch (e: any) {
      toast.error('Error', { description: e.response?.data?.message || e.message });
    }
  };

  const usuarioNombre = usuario
    ? [usuario.nombres, usuario.apellido_paterno, usuario.apellido_materno].filter(Boolean).join(' ') || usuario.dni
    : '';

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/salud/examenes">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Configuración de EMOs</h1>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <>
          {/* Gestión de perfiles EMOs */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Gestión de perfiles EMOs</h2>
              <Link href="/salud/examenes/perfiles/nuevo">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Perfil
                </Button>
              </Link>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-gray-600">Nro</TableHead>
                  <TableHead className="text-gray-600">Fecha de registro</TableHead>
                  <TableHead className="text-gray-600">Nombre</TableHead>
                  <TableHead className="text-gray-600">Registrado por</TableHead>
                  <TableHead className="text-gray-600">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {perfiles.map((p, i) => (
                  <TableRow key={p.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{p.fecha_registro}</TableCell>
                    <TableCell>{p.nombre}</TableCell>
                    <TableCell>{p.registrado_por}</TableCell>
                    <TableCell>
                      <Link href={`/salud/examenes/perfiles/${p.id}`}>
                        <Button variant="ghost" size="sm" className="text-blue-600">
                          <Eye className="h-4 w-4 mr-1" />
                          Ver detalle
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {perfiles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                      No hay perfiles registrados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Gestión de Centros médicos */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Gestión de Centros médicos</h2>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => openModalCentro()}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Centro Médico
              </Button>
            </div>
            <div className="p-4 bg-amber-50 border-b border-amber-200">
              <p className="text-sm text-amber-800">
                <strong>Nota:</strong> La información del centro médico y el PDF adjunto de recomendaciones la
                recibirán por correo electrónico todos los trabajadores en la programación de un nuevo Examen Médico
                Ocupacional
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-gray-600">Nro</TableHead>
                  <TableHead className="text-gray-600">Fecha de registro</TableHead>
                  <TableHead className="text-gray-600">Centro médico</TableHead>
                  <TableHead className="text-gray-600">Dirección</TableHead>
                  <TableHead className="text-gray-600">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {centros.map((c, i) => (
                  <TableRow key={c.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{c.fecha_registro}</TableCell>
                    <TableCell>{c.centro_medico}</TableCell>
                    <TableCell className="max-w-xs truncate">{c.direccion || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {c.archivo_pdf_url && (
                          <a href={c.archivo_pdf_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <FileText className="h-4 w-4 text-blue-600" />
                            </Button>
                          </a>
                        )}
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openModalCentro(c)}>
                          <Pencil className="h-4 w-4 text-amber-600" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600" onClick={() => handleRemoveCentro(c.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {centros.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                      No hay centros médicos registrados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Gestión de Resultados adicionales */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Gestión de Resultados adicionales de EMOs</h2>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => openModalResultado()}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo resultado
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-gray-600">Nro</TableHead>
                  <TableHead className="text-gray-600">Nombre</TableHead>
                  <TableHead className="text-gray-600">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultados.map((r, i) => (
                  <TableRow key={r.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{r.nombre}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openModalResultado(r)}>
                          <Pencil className="h-4 w-4 text-amber-600" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600" onClick={() => handleRemoveResultado(r.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {resultados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500 py-8">
                      No hay resultados adicionales
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Recomendaciones */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Recomendaciones para el colaborador (PREVIO A LA CITA)
              </h2>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleGuardarRecomendacion}
                disabled={savingRec}
              >
                <Save className="h-4 w-4 mr-2" />
                Guardar Recomendación
              </Button>
            </div>
            <div className="p-4">
              <textarea
                className="w-full min-h-[200px] p-3 border border-gray-300 rounded-md text-sm"
                value={recomendaciones}
                onChange={(e) => setRecomendaciones(e.target.value)}
                placeholder="Escriba las recomendaciones..."
              />
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-sm text-amber-800">
                  <strong>Nota:</strong> Esta recomendación por defecto la recibirán por correo electrónico todos los
                  trabajadores en la programación de un nuevo Examen Médico Ocupacional
                </p>
              </div>
            </div>
          </div>

          {/* Emos diferidos */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Emos diferidos</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
                <Input
                  placeholder="Nombre, documento..."
                  value={buscarDiferidos}
                  onChange={(e) => setBuscarDiferidos(e.target.value)}
                />
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-gray-600">Nro</TableHead>
                  <TableHead className="text-gray-600">Nombre Apellido</TableHead>
                  <TableHead className="text-gray-600">Tipo documento</TableHead>
                  <TableHead className="text-gray-600">Número documento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {diferidos.map((d, i) => (
                  <TableRow key={d.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{d.nombre_apellido}</TableCell>
                    <TableCell>{d.tipo_documento}</TableCell>
                    <TableCell>{d.numero_documento}</TableCell>
                  </TableRow>
                ))}
                {diferidos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                      No hay EMOs diferidos
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Modal Centro Médico */}
      <Modal
        isOpen={modalCentro}
        onClose={() => setModalCentro(false)}
        title={editingCentro ? 'Editar Centro Médico' : 'Nuevo Centro Médico'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
            <Input
              value={formCentro.nombre}
              onChange={(e) => setFormCentro((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="Nombre del centro médico"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
            <Input
              value={formCentro.direccion}
              onChange={(e) => setFormCentro((f) => ({ ...f, direccion: e.target.value }))}
              placeholder="Dirección"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Archivo PDF (opcional - ficha RUC o documento)
            </label>
            <input
              type="file"
              accept=".pdf"
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              onChange={(e) => setFormCentro((f) => ({ ...f, archivo: e.target.files?.[0] ?? null }))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setModalCentro(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitCentro} disabled={submitting}>
              {editingCentro ? 'Actualizar' : 'Guardar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Resultado Adicional */}
      <Modal
        isOpen={modalResultado}
        onClose={() => setModalResultado(false)}
        title={editingResultado ? 'Editar Resultado' : 'Nuevo Resultado'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
            <Input
              value={formResultado.nombre}
              onChange={(e) => setFormResultado((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="Nombre del resultado adicional"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setModalResultado(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitResultado} disabled={submitting}>
              {editingResultado ? 'Actualizar' : 'Guardar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
