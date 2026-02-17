'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload } from 'lucide-react';
import {
  processSignatureImage,
  applySealColor,
  compositeSealWithSignature,
  SEAL_COLORS_RECOMMENDED,
} from '@/lib/image-signature-processing';

interface MedicoSealInputProps {
  nombreCompleto: string;
  cmp: string;
  tituloSello?: string;
  firmaDataUrl?: string | null;
  value?: string | null;
  onChange?: (dataUrl: string) => void;
  onTituloSelloChange?: (value: string) => void;
  disabled?: boolean;
}

export function MedicoSealInput({
  nombreCompleto,
  cmp,
  tituloSello = 'MÉDICO OCUPACIONAL',
  firmaDataUrl,
  value,
  onChange,
  onTituloSelloChange,
  disabled = false,
}: MedicoSealInputProps) {
  const [mode, setMode] = useState<'sistema' | 'custom'>('sistema');
  const [customUpload, setCustomUpload] = useState<string | null>(null);
  const [customColor, setCustomColor] = useState<{ r: number; g: number; b: number }>({
    ...SEAL_COLORS_RECOMMENDED[0].rgb,
  });
  const [customHex, setCustomHex] = useState<string>(SEAL_COLORS_RECOMMENDED[0].hex);
  const [agregarFirma, setAgregarFirma] = useState(false);
  const [processing, setProcessing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sealWidth = 280;
  const sealHeight = 170;

  useEffect(() => {
    if (mode === 'sistema') {
      renderSystemSeal();
    }
  }, [mode, nombreCompleto, cmp, tituloSello, firmaDataUrl]);

  useEffect(() => {
    if (mode === 'custom' && customUpload) {
      applySealColor(customUpload, customColor).then((sealUrl) => {
        if (agregarFirma && firmaDataUrl) {
          compositeSealWithSignature(sealUrl, firmaDataUrl).then(onChange);
        } else {
          onChange?.(sealUrl);
        }
      });
    }
  }, [mode, customUpload, customColor, agregarFirma, firmaDataUrl]);

  const renderSystemSeal = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = sealWidth;
    canvas.height = sealHeight;
    ctx.clearRect(0, 0, sealWidth, sealHeight);

    ctx.strokeStyle = '#003366';
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 8, sealWidth - 16, sealHeight - 16);

    ctx.fillStyle = '#003366';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText((nombreCompleto || '').toUpperCase(), sealWidth / 2, 32);
    ctx.font = '10px sans-serif';
    ctx.fillText((tituloSello || 'MÉDICO OCUPACIONAL').toUpperCase(), sealWidth / 2, 50);
    ctx.fillText(`C.M.P ${cmp || ''}`, sealWidth / 2, 68);

    const zonaFirmaY = 95;
    const zonaFirmaH = sealHeight - zonaFirmaY - 12;

    const drawSignature = () => {
      if (firmaDataUrl) {
        const img = new Image();
        img.onload = () => {
          const maxW = 120;
          const maxH = zonaFirmaH;
          let w = img.width;
          let h = img.height;
          if (w > maxW || h > maxH) {
            const ratio = Math.min(maxW / w, maxH / h);
            w *= ratio;
            h *= ratio;
          }
          const x = (sealWidth - w) / 2;
          const y = zonaFirmaY + (zonaFirmaH - h) / 2;
          ctx.drawImage(img, x, y, w, h);
          onChange?.(canvas.toDataURL('image/png'));
        };
        img.onerror = () => onChange?.(canvas.toDataURL('image/png'));
        img.src = firmaDataUrl;
      } else {
        onChange?.(canvas.toDataURL('image/png'));
      }
    };
    drawSignature();
  };

  useEffect(() => {
    if (mode === 'sistema') {
      renderSystemSeal();
    }
  }, [nombreCompleto, cmp, tituloSello, firmaDataUrl, mode]);

  const handleCustomFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) return;
    setProcessing(true);
    try {
      const processed = await processSignatureImage(file, {
        backgroundThreshold: 200,
        inkColor: 'black',
        contrastFactor: 1.8,
        strokeThickness: 0,
      });
      setCustomUpload(processed);
      const colored = await applySealColor(processed, customColor);
      onChange?.(colored);
    } catch (err) {
      console.error('Error procesando sello:', err);
    } finally {
      setProcessing(false);
      e.target.value = '';
    }
  };

  const handleColorChange = async (hex: string, rgb: { r: number; g: number; b: number }) => {
    setCustomHex(hex);
    setCustomColor(rgb);
    if (customUpload) {
      const colored = await applySealColor(customUpload, rgb);
      onChange?.(colored);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Button
          type="button"
          variant={mode === 'sistema' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setMode('sistema')}
          disabled={disabled}
        >
          Sello generado por sistema
        </Button>
        <Button
          type="button"
          variant={mode === 'custom' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setMode('custom')}
          disabled={disabled}
        >
          Subir mi sello
        </Button>
      </div>

      {mode === 'sistema' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Texto debajo del nombre en el sello
            </label>
            <Input
              value={tituloSello}
              onChange={(e) => onTituloSelloChange?.(e.target.value)}
              placeholder="Ej. MÉDICO OCUPACIONAL"
              disabled={disabled}
              className="max-w-md"
            />
            <p className="text-xs text-slate-500 mt-1">
              Recomendado: MÉDICO OCUPACIONAL. Puede agregar su especialidad (ej. MÉDICO OCUPACIONAL - CARDIOLOGÍA).
            </p>
          </div>
          <p className="text-sm text-slate-600">
            El sello incluye su nombre, título y CMP. La firma se ubica debajo del texto sin taparlo.
          </p>
          <div className="flex justify-center p-4 bg-slate-50 rounded-lg border border-slate-200">
            <canvas
              ref={canvasRef}
              width={sealWidth}
              height={sealHeight}
              className="border border-slate-200 bg-white"
              style={{ maxWidth: '100%' }}
            />
          </div>
        </div>
      )}

      {mode === 'custom' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Subir imagen del sello
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleCustomFileSelect}
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
              {processing ? 'Procesando...' : 'Subir sello'}
            </Button>
          </div>

          {customUpload && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Color del sello
              </label>
              <div className="flex flex-wrap gap-2">
                {SEAL_COLORS_RECOMMENDED.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    className={`w-8 h-8 rounded border-2 ${
                      customHex === c.hex ? 'border-slate-800' : 'border-slate-300'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                    onClick={() => handleColorChange(c.hex, c.rgb)}
                  />
                ))}
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customHex}
                    onChange={(e) => {
                      const hex = e.target.value;
                      const r = parseInt(hex.slice(1, 3), 16);
                      const g = parseInt(hex.slice(3, 5), 16);
                      const b = parseInt(hex.slice(5, 7), 16);
                      handleColorChange(hex, { r, g, b });
                    }}
                    className="w-8 h-8 cursor-pointer"
                  />
                  <span className="text-xs text-slate-500">Otro color</span>
                </div>
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={agregarFirma}
              onChange={(e) => setAgregarFirma(e.target.checked)}
              disabled={disabled || !firmaDataUrl || !customUpload}
              className="rounded border-slate-300"
            />
            <span className="text-sm text-slate-700">Agregar firma debajo del sello</span>
          </label>
          {!firmaDataUrl && customUpload && (
            <p className="text-xs text-slate-500">
              Configure su firma digital arriba para poder agregarla al sello.
            </p>
          )}

          {value && (
            <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
              <p className="text-xs font-medium text-slate-600 mb-2">Previsualización del sello</p>
              <div className="flex justify-center">
                <img src={value} alt="Sello" className="max-h-32 object-contain" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
