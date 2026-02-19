'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { SignaturePad } from '@/components/ui/signature-pad';
import { Upload, Lock } from 'lucide-react';
import { processSignatureImage, type ProcessedImageOptions } from '@/lib/image-signature-processing';

type ProcessingMode = ProcessedImageOptions['mode'];

interface MedicoSignatureInputProps {
  drawnValue?: string | null;
  uploadedValue?: string | null;
  onDrawnChange?: (dataUrl: string) => void;
  onUploadedChange?: (dataUrl: string) => void;
  disabled?: boolean;
}

export function MedicoSignatureInput({
  drawnValue,
  uploadedValue,
  onDrawnChange,
  onUploadedChange,
  disabled = false,
}: MedicoSignatureInputProps) {
  const [processing, setProcessing] = useState(false);
  const [processingMode, setProcessingMode] = useState<ProcessingMode>('auto');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const effectiveSignature = uploadedValue || drawnValue;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) return;
    setProcessing(true);
    try {
      const processed = await processSignatureImage(file, {
        mode: processingMode,
        inkColor: 'black',
        strokeThickness: 1,
      });
      onUploadedChange?.(processed);
    } catch (err) {
      console.error('Error procesando firma:', err);
    } finally {
      setProcessing(false);
      e.target.value = '';
    }
  };

  const handleClearUploaded = () => {
    onUploadedChange?.('');
  };

  return (
    <div className="space-y-4">
      {effectiveSignature && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium text-slate-600 mb-2">Previsualización de firma</p>
          <div className="flex justify-center items-center min-h-[80px] bg-white rounded border border-slate-200 p-2">
            <img src={effectiveSignature} alt="Firma" className="max-h-24 object-contain" />
          </div>
          {uploadedValue && (
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Firma por imagen (prevalece sobre dibujo)
            </p>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Cargar firma manuscrita (PNG, JPG)
        </label>
        <div className="flex flex-wrap gap-2 items-center mb-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || processing}
          >
            <Upload className="h-4 w-4 mr-2" />
            {processing ? 'Procesando...' : 'Subir imagen de firma'}
          </Button>
          {uploadedValue && (
            <Button type="button" variant="ghost" size="sm" onClick={handleClearUploaded} disabled={disabled}>
              Quitar imagen
            </Button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-slate-500">Ajuste:</span>
            <Select
              value={processingMode ?? 'auto'}
              onChange={(e) => setProcessingMode((e.target.value as ProcessingMode) || 'auto')}
              className="h-8 text-xs w-[180px]"
            >
              <option value="auto">Automático</option>
              <option value="conservative">Firma clara o azul</option>
              <option value="aggressive">Con sello o fondo</option>
            </Select>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Foto de su firma manuscrita. Se procesará para limpiar fondo y mejorar contraste.
          Si el resultado no es correcto, cambie el ajuste y vuelva a subir la imagen.
        </p>
      </div>

      <div>
        <p className="text-sm font-medium text-slate-700 mb-2">O dibuje su firma</p>
        <SignaturePad
          value={uploadedValue ? '' : drawnValue ?? ''}
          onChange={(url) => onDrawnChange?.(url)}
          disabled={disabled || !!uploadedValue}
        />
        {uploadedValue && (
          <p className="text-xs text-amber-600 mt-1">
            La imagen subida prevalece. Quite la imagen para poder dibujar.
          </p>
        )}
      </div>
    </div>
  );
}
