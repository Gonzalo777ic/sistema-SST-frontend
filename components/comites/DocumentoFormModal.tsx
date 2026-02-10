'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Upload, FileText } from 'lucide-react';
import { CreateDocumentoComiteDto } from '@/types';
import { toast } from 'sonner';
import { useState } from 'react';

const documentoSchema = z.object({
  titulo: z.string().min(1, 'El título es obligatorio'),
  url: z.string().min(1, 'Debe seleccionar un archivo'),
  fecha_registro: z.string().optional(),
});

type DocumentoFormData = z.infer<typeof documentoSchema>;

interface DocumentoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateDocumentoComiteDto) => Promise<void>;
}

export function DocumentoFormModal({
  isOpen,
  onClose,
  onSubmit,
}: DocumentoFormModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DocumentoFormData>({
    resolver: zodResolver(documentoSchema),
    defaultValues: {
      titulo: '',
      url: '',
      fecha_registro: new Date().toISOString().split('T')[0],
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFileName(file.name);
      // Simular URL (en producción se subiría al servidor)
      setValue('url', `/documentos/comites/${file.name}`);
    }
  };

  const onFormSubmit = async (data: DocumentoFormData) => {
    try {
      await onSubmit(data);
      reset();
      setSelectedFile(null);
      setFileName('');
      onClose();
    } catch (error: any) {
      // El error ya fue manejado en DocumentosManager, solo cerramos el modal si fue exitoso
      // No hacemos nada aquí porque el error ya fue mostrado
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        reset();
        setSelectedFile(null);
        setFileName('');
      }}
      title="Nuevo Documento"
      size="md"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Título del Documento <span className="text-red-500">*</span>
          </label>
          <Input
            {...register('titulo')}
            placeholder="Ej: Acta de Constitución"
            className={errors.titulo ? 'border-red-500' : ''}
          />
          {errors.titulo && (
            <p className="text-red-500 text-xs mt-1">{errors.titulo.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Archivo <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="file"
              id="file-upload"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx"
              className="hidden"
            />
            <label
              htmlFor="file-upload"
              className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              {fileName ? (
                <>
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-gray-700">{fileName}</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    Haz clic para seleccionar un archivo
                  </span>
                </>
              )}
            </label>
          </div>
          {errors.url && (
            <p className="text-red-500 text-xs mt-1">{errors.url.message}</p>
          )}
          {!selectedFile && (
            <p className="text-xs text-gray-500 mt-1">
              Formatos aceptados: PDF, DOC, DOCX
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha de Registro
          </label>
          <Input
            type="date"
            {...register('fecha_registro')}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              onClose();
              reset();
              setSelectedFile(null);
              setFileName('');
            }}
            className="border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !selectedFile}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting ? 'Subiendo...' : 'Agregar Documento'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
