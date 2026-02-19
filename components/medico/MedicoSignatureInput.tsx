'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { SignaturePad } from '@/components/ui/signature-pad';
import { Upload, Lock } from 'lucide-react';
import { SignatureImageAdjuster } from '@/components/ui/signature-image-adjuster';

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
  const [fileToAdjust, setFileToAdjust] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const effectiveSignature = uploadedValue || drawnValue;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) return;
    setFileToAdjust(file);
    e.target.value = '';
  };

  const handleAdjustConfirm = (dataUrl: string) => {
    onUploadedChange?.(dataUrl);
    setFileToAdjust(null);
  };

  const handleAdjustCancel = () => {
    setFileToAdjust(null);
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

      {fileToAdjust && (
        <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4">
          <p className="text-sm font-medium text-slate-700 mb-3">Ajustar nivel de limpieza</p>
          <SignatureImageAdjuster
            file={fileToAdjust}
            onConfirm={handleAdjustConfirm}
            onCancel={handleAdjustCancel}
            disabled={disabled}
          />
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
            disabled={disabled || !!fileToAdjust}
          >
            <Upload className="h-4 w-4 mr-2" />
            Subir imagen de firma
          </Button>
          {uploadedValue && !fileToAdjust && (
            <Button type="button" variant="ghost" size="sm" onClick={handleClearUploaded} disabled={disabled}>
              Quitar imagen
            </Button>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Foto de su firma manuscrita. Tras subirla, podrá ajustar el nivel de limpieza en tiempo real hasta lograr el resultado deseado.
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
