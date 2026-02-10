'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, FileText, Download } from 'lucide-react';
import { IDocumento, CreateDocumentoComiteDto } from '@/types';
import { comitesService } from '@/services/comites.service';
import { DocumentoFormModal } from './DocumentoFormModal';
import { toast } from 'sonner';

interface DocumentosManagerProps {
  comiteId: string;
}

export function DocumentosManager({ comiteId }: DocumentosManagerProps) {
  const [documentos, setDocumentos] = useState<IDocumento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadDocumentos();
  }, [comiteId]);

  const loadDocumentos = async () => {
    try {
      setIsLoading(true);
      const data = await comitesService.listarDocumentos(comiteId);
      setDocumentos(data);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'No se pudieron cargar los documentos';
      toast.error('Error al cargar documentos', {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAgregarDocumento = async (data: CreateDocumentoComiteDto) => {
    try {
      await comitesService.agregarDocumento(comiteId, data);
      toast.success('Documento agregado exitosamente');
      await loadDocumentos();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'No se pudo agregar el documento';
      toast.error('Error al agregar documento', {
        description: errorMessage,
      });
      throw error; // Re-lanzar para que el modal maneje el error
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Documentos del Comité</h3>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Documento
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Cargando documentos...</div>
      ) : documentos.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p>No hay documentos registrados</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-gray-600 font-semibold">Título</TableHead>
                <TableHead className="text-gray-600 font-semibold">Fecha de Registro</TableHead>
                <TableHead className="text-gray-600 font-semibold text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documentos.map((documento) => (
                <TableRow key={documento.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{documento.titulo}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {formatDate(documento.fecha_registro)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(documento.url, '_blank')}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Descargar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <DocumentoFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAgregarDocumento}
      />
    </div>
  );
}
