'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  maestroDocumentosService,
  MaestroDocumento,
} from '@/services/maestro-documentos.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Plus, Pencil, Package } from 'lucide-react';
import { toast } from 'sonner';

export default function MaestroDocumentosPage() {
  const { usuario } = useAuth();
  const router = useRouter();
  const [documentos, setDocumentos] = useState<MaestroDocumento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [filtroNombre, setFiltroNombre] = useState('');
  const [filtroProceso, setFiltroProceso] = useState('');

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const empresaId = usuario?.empresaId;
      const data = await maestroDocumentosService.findAll(
        empresaId ?? undefined,
        filtroNombre || undefined,
        filtroProceso || undefined
      );
      setDocumentos(data);
    } catch (error: any) {
      toast.error('Error al cargar datos', {
        description:
          error.response?.data?.message || 'No se pudieron cargar los documentos',
      });
    } finally {
      setIsLoading(false);
    }
  }, [usuario?.empresaId, filtroNombre, filtroProceso]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRegresar = () => {
    router.push('/gestion-documentaria');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={handleRegresar}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Regresar
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              Maestro de documentos
            </h1>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors rounded-t-lg"
        >
          <span className="font-medium text-slate-700">
            {showFilters ? '▼' : '▶'} Filtros de búsqueda
          </span>
        </button>
        {showFilters && (
          <div className="p-4 border-t border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre
                </label>
                <Input
                  value={filtroNombre}
                  onChange={(e) => setFiltroNombre(e.target.value)}
                  placeholder="Nombre"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Proceso
                </label>
                <Input
                  value={filtroProceso}
                  onChange={(e) => setFiltroProceso(e.target.value)}
                  placeholder="Proceso"
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Botón Agregar */}
      <div className="flex justify-end">
        <Button
          size="sm"
          className="bg-primary hover:bg-primary/90 text-white"
          onClick={() => {
            setEditingId(null);
            setIsModalOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1" />
          Agregar Documento
        </Button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Nro
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Proceso
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Subproceso
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Editar
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(5)].map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : documentos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <Package className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600">Sin Información</p>
                  </td>
                </tr>
              ) : (
                documentos.map((doc, index) => (
                  <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-900">
                      {index + 1}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-900">{doc.nombre}</td>
                    <td className="px-4 py-4 text-sm text-slate-900">{doc.proceso}</td>
                    <td className="px-4 py-4 text-sm text-slate-900">
                      {doc.subproceso}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          setEditingId(doc.id);
                          setIsModalOpen(true);
                        }}
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear/Editar */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingId(null);
        }}
        title={editingId ? 'Editar Documento' : 'Crear nuevo Documento'}
        size="md"
      >
        <DocumentoForm
          documentoId={editingId}
          documentos={documentos}
          empresaId={usuario?.empresaId}
          onSuccess={() => {
            setIsModalOpen(false);
            setEditingId(null);
            loadData();
          }}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingId(null);
          }}
        />
      </Modal>
    </div>
  );
}

function DocumentoForm({
  documentoId,
  documentos,
  empresaId,
  onSuccess,
  onCancel,
}: {
  documentoId: string | null;
  documentos: MaestroDocumento[];
  empresaId: string | null | undefined;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const documento = documentoId
    ? documentos.find((d) => d.id === documentoId)
    : null;
  const [nombre, setNombre] = useState(documento?.nombre ?? '');
  const [proceso, setProceso] = useState(documento?.proceso ?? '');
  const [subproceso, setSubproceso] = useState(documento?.subproceso ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (documento) {
      setNombre(documento.nombre);
      setProceso(documento.proceso);
      setSubproceso(documento.subproceso);
    } else {
      setNombre('');
      setProceso('');
      setSubproceso('');
    }
  }, [documento, documentoId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !proceso.trim() || !subproceso.trim()) {
      toast.error('Todos los campos son obligatorios');
      return;
    }
    if (!empresaId) {
      toast.error('No se pudo obtener la empresa');
      return;
    }

    setIsSubmitting(true);
    try {
      if (documentoId) {
        await maestroDocumentosService.update(documentoId, {
          nombre: nombre.trim(),
          proceso: proceso.trim(),
          subproceso: subproceso.trim(),
        });
        toast.success('Documento actualizado correctamente');
      } else {
        await maestroDocumentosService.create({
          nombre: nombre.trim(),
          proceso: proceso.trim(),
          subproceso: subproceso.trim(),
          empresa_id: empresaId,
        });
        toast.success('Documento creado correctamente');
      }
      onSuccess();
    } catch (error: any) {
      toast.error('Error al guardar', {
        description: error.response?.data?.message || 'No se pudo guardar el documento',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Nombre <span className="text-red-500">*</span>
        </label>
        <Input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Proceso <span className="text-red-500">*</span>
        </label>
        <Input
          value={proceso}
          onChange={(e) => setProceso(e.target.value)}
          placeholder="Proceso"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Subproceso <span className="text-red-500">*</span>
        </label>
        <Input
          value={subproceso}
          onChange={(e) => setSubproceso(e.target.value)}
          placeholder="Subproceso"
          required
        />
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-white">
          {documentoId ? 'Guardar' : 'Confirmar'}
        </Button>
      </div>
    </form>
  );
}
