'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  documentosSstService,
  DocumentoSST,
  CategoriaDocumento,
  formatFileSize,
} from '@/services/documentos-sst.service';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FolderClosed,
  FileText,
  Download,
  Calendar,
  User,
  CheckCircle2,
  File,
} from 'lucide-react';
import { toast } from 'sonner';

export default function DocumentosPage() {
  const { usuario } = useAuth();
  const [documentos, setDocumentos] = useState<DocumentoSST[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedDocumento, setSelectedDocumento] = useState<DocumentoSST | null>(null);
  const [selectedCategoria, setSelectedCategoria] = useState<CategoriaDocumento | ''>('');

  useEffect(() => {
    loadDocumentos();
  }, [usuario?.empresaId]);

  const loadDocumentos = async () => {
    try {
      setIsLoading(true);
      const empresaId = usuario?.empresaId || undefined;
      // Solo cargar documentos activos
      const data = await documentosSstService.findAll(empresaId, true);
      setDocumentos(data);
    } catch (error: any) {
      toast.error('Error al cargar documentos', {
        description:
          error.response?.data?.message || 'No se pudieron cargar los documentos',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDocumentos = useMemo(() => {
    if (!selectedCategoria) return documentos;
    return documentos.filter((doc) => doc.categoria === selectedCategoria);
  }, [documentos, selectedCategoria]);

  // Calcular KPIs por categoría
  const kpis = useMemo(() => {
    const categorias = Object.values(CategoriaDocumento);
    const kpisData: Record<CategoriaDocumento, number> = {} as Record<
      CategoriaDocumento,
      number
    >;
    categorias.forEach((cat) => {
      kpisData[cat] = documentos.filter((doc) => doc.categoria === cat).length;
    });
    return kpisData;
  }, [documentos]);

  const getCategoriaColor = (categoria: CategoriaDocumento) => {
    const colors: Record<CategoriaDocumento, string> = {
      [CategoriaDocumento.Politicas]: 'bg-blue-100 text-blue-800 border-blue-300',
      [CategoriaDocumento.Reglamentos]: 'bg-purple-100 text-purple-800 border-purple-300',
      [CategoriaDocumento.Procedimientos]: 'bg-green-100 text-green-800 border-green-300',
      [CategoriaDocumento.Manuales]: 'bg-orange-100 text-orange-800 border-orange-300',
      [CategoriaDocumento.Matrices]: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      [CategoriaDocumento.Planes]: 'bg-pink-100 text-pink-800 border-pink-300',
      [CategoriaDocumento.Estandares]: 'bg-teal-100 text-teal-800 border-teal-300',
    };
    return colors[categoria] || 'bg-slate-100 text-slate-800 border-slate-300';
  };

  const handleDescargar = (documento: DocumentoSST) => {
    if (!documento.archivo_url) {
      toast.error('Error', {
        description: 'El documento no tiene un archivo asociado',
      });
      return;
    }
    // Abrir en nueva pestaña
    window.open(documento.archivo_url, '_blank');
    toast.success('Descarga iniciada', {
      description: 'El documento se está descargando en una nueva pestaña',
    });
  };

  const handleVerDetalles = (documento: DocumentoSST) => {
    setSelectedDocumento(documento);
    setIsViewModalOpen(true);
  };

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <FolderClosed className="w-7 h-7 text-primary" />
                Biblioteca de Documentos SST
              </h1>
              <p className="text-slate-600 mt-1">
                Repositorio centralizado de documentación normativa y procedimientos vigentes
              </p>
            </div>
          </div>

          {/* KPIs por Categoría */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {Object.values(CategoriaDocumento).map((categoria) => (
              <button
                key={categoria}
                onClick={() =>
                  setSelectedCategoria(selectedCategoria === categoria ? '' : categoria)
                }
                className={`p-3 rounded-lg border transition-all ${
                  selectedCategoria === categoria
                    ? `${getCategoriaColor(categoria)} ring-2 ring-primary`
                    : 'bg-white border-slate-200 hover:border-primary/50'
                }`}
              >
                <p className="text-xs font-medium mb-1">{categoria}</p>
                <p className="text-2xl font-bold">{kpis[categoria]}</p>
              </button>
            ))}
          </div>

          {/* Listado */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-lg" />
              ))}
            </div>
          ) : filteredDocumentos.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-white rounded-lg shadow-sm border border-slate-200">
              <FolderClosed className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">
                {selectedCategoria
                  ? `No hay documentos de la categoría "${selectedCategoria}"`
                  : 'No hay documentos disponibles'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocumentos.map((documento) => (
                <div
                  key={documento.id}
                  className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
                >
                  {/* Header con badge de categoría */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-slate-900 mb-2 line-clamp-2">
                        {documento.titulo}
                      </h3>
                      <span
                        className={`inline-block px-2 py-1 text-xs font-medium rounded border ${getCategoriaColor(
                          documento.categoria,
                        )}`}
                      >
                        {documento.categoria}
                      </span>
                    </div>
                  </div>

                  {/* Descripción */}
                  <div className="mb-4">
                    <p className="text-sm text-slate-600 line-clamp-3">
                      {documento.descripcion || 'Sin descripción disponible'}
                    </p>
                  </div>

                  {/* Información del documento */}
                  <div className="space-y-2 text-sm text-slate-600 mb-4 pb-4 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span>
                        {documento.formato} • {formatFileSize(documento.tamano)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <File className="w-4 h-4" />
                      <span>Versión {documento.version}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(documento.fecha_publicacion).toLocaleDateString('es-PE', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    {documento.subido_por && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span className="text-xs">Subido por: {documento.subido_por}</span>
                      </div>
                    )}
                  </div>

                  {/* Botones de acción */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleVerDetalles(documento)}
                    >
                      Ver Detalles
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDescargar(documento)}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Descargar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modal de Vista Previa */}
          {selectedDocumento && (
            <Modal
              isOpen={isViewModalOpen}
              onClose={() => {
                setIsViewModalOpen(false);
                setSelectedDocumento(null);
              }}
              title="Detalles del Documento"
              size="lg"
            >
              <div className="space-y-6">
                {/* Confirmación de disponibilidad */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-green-900 mb-1">
                        Documento Disponible
                      </h4>
                      <p className="text-sm text-green-700">
                        Este documento está listo para consulta y descarga. Puede acceder a él
                        desde cualquier dispositivo.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Información del documento */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">
                      {selectedDocumento.titulo}
                    </h3>
                    <span
                      className={`inline-block px-3 py-1 text-sm font-medium rounded border ${getCategoriaColor(
                        selectedDocumento.categoria,
                      )}`}
                    >
                      {selectedDocumento.categoria}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Descripción</h4>
                    <p className="text-sm text-slate-600">
                      {selectedDocumento.descripcion || 'Sin descripción disponible'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-1">Versión</h4>
                      <p className="text-sm text-slate-600">{selectedDocumento.version}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-1">Formato</h4>
                      <p className="text-sm text-slate-600">{selectedDocumento.formato}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-1">Tamaño</h4>
                      <p className="text-sm text-slate-600">
                        {formatFileSize(selectedDocumento.tamano)}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-1">
                        Fecha de Publicación
                      </h4>
                      <p className="text-sm text-slate-600">
                        {new Date(selectedDocumento.fecha_publicacion).toLocaleDateString(
                          'es-PE',
                          {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          },
                        )}
                      </p>
                    </div>
                  </div>

                  {selectedDocumento.subido_por && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-1">Subido por</h4>
                      <p className="text-sm text-slate-600">{selectedDocumento.subido_por}</p>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-1">Descargas</h4>
                    <p className="text-sm text-slate-600">
                      {selectedDocumento.descargas_count} descarga(s)
                    </p>
                  </div>
                </div>

                {/* Botón de descarga */}
                <div className="pt-4 border-t border-slate-200">
                  <Button
                    className="w-full"
                    onClick={() => {
                      handleDescargar(selectedDocumento);
                      setIsViewModalOpen(false);
                    }}
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Descargar Documento
                  </Button>
                </div>
              </div>
            </Modal>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
