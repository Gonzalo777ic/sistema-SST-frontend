'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  loadImageForAdjustment,
  processSignatureWithParams,
  SIGNATURE_PRESETS,
  type SignatureLoadResult,
  type SignatureProcessingParams,
} from '@/lib/image-signature-processing';
import { SlidersHorizontal, Settings2, ChevronDown, ChevronUp } from 'lucide-react';

const PRESET_LABELS: Record<string, string> = {
  clara: 'Firma clara',
  oscura: 'Firma oscura',
  escaneada: 'Escaneada',
  digital: 'Digital',
  personalizado: 'Personalizado',
};

interface SignatureImageAdjusterProps {
  file: File;
  onConfirm: (dataUrl: string) => void;
  onCancel: () => void;
  disabled?: boolean;
}

function applyFineTune(params: SignatureProcessingParams, fineTune: number): SignatureProcessingParams {
  const delta = (fineTune - 50) * 1.2;
  return {
    ...params,
    threshold: Math.max(0, Math.min(100, params.threshold + delta)),
  };
}

export function SignatureImageAdjuster({
  file,
  onConfirm,
  onCancel,
  disabled = false,
}: SignatureImageAdjusterProps) {
  const [loadResult, setLoadResult] = useState<SignatureLoadResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<keyof typeof SIGNATURE_PRESETS>('personalizado');
  const [params, setParams] = useState<SignatureProcessingParams>(() => ({ ...SIGNATURE_PRESETS.personalizado }));
  const [fineTune, setFineTune] = useState(50);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadImageForAdjustment(file)
      .then((result) => {
        if (!cancelled) {
          setLoadResult(result);
          setParams({ ...SIGNATURE_PRESETS.personalizado });
          setPreset('personalizado');
          setFineTune(50);
          setPreview(processSignatureWithParams(result, SIGNATURE_PRESETS.personalizado));
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Error al cargar imagen');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [file]);

  const updatePreview = useCallback(() => {
    if (!loadResult) return;
    const effectiveParams = advancedMode ? params : applyFineTune(params, fineTune);
    const result = processSignatureWithParams(loadResult, effectiveParams);
    setPreview(result);
  }, [loadResult, params, fineTune, advancedMode]);

  useEffect(() => {
    if (loadResult) updatePreview();
  }, [loadResult, params, fineTune, advancedMode, updatePreview]);

  const handlePresetSelect = (key: keyof typeof SIGNATURE_PRESETS) => {
    const p = SIGNATURE_PRESETS[key];
    setPreset(key);
    setParams({ ...p });
    setFineTune(50);
  };

  const handleParamChange = (k: keyof SignatureProcessingParams, v: number) => {
    setParams((prev) => ({ ...prev, [k]: v }));
    setPreset('personalizado');
  };

  const handleConfirm = () => {
    if (preview) onConfirm(preview);
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
        <p className="text-sm text-slate-600">Cargando imagen...</p>
      </div>
    );
  }

  if (error || !loadResult) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">{error || 'No se pudo cargar la imagen'}</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={onCancel}>
          Cerrar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Vista previa */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-medium text-slate-600 mb-2">Vista previa en tiempo real</p>
        <div className="flex justify-center items-center min-h-[120px] bg-white rounded border border-slate-200 p-3">
          {preview && (
            <img src={preview} alt="Firma ajustada" className="max-h-28 object-contain" />
          )}
        </div>
      </div>

      {/* Modo simple: presets + ajuste fino */}
      <div>
        <p className="text-sm font-medium text-slate-700 mb-2">Tipo de firma</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {(['clara', 'oscura', 'escaneada', 'digital'] as const).map((key) => (
            <Button
              key={key}
              type="button"
              variant={preset === key ? 'primary' : 'outline'}
              size="sm"
              onClick={() => handlePresetSelect(key)}
              disabled={disabled}
            >
              {PRESET_LABELS[key]}
            </Button>
          ))}
        </div>

        {!advancedMode && (
          <div className="mt-3">
            <div className="flex items-center gap-2 mb-2">
              <SlidersHorizontal className="w-4 h-4 text-slate-500" />
              <label className="text-sm font-medium text-slate-700">
                Ajuste fino: {fineTune}
              </label>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={fineTune}
              onChange={(e) => setFineTune(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Menos limpieza</span>
              <span>Más limpieza</span>
            </div>
          </div>
        )}
      </div>

      {/* Toggle modo avanzado */}
      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-between text-slate-600"
          onClick={() => setAdvancedMode((a) => !a)}
        >
          <span className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            {advancedMode ? 'Ocultar controles avanzados' : 'Mostrar controles avanzados'}
          </span>
          {advancedMode ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>

      {/* Modo avanzado: sliders por dimensión */}
      {advancedMode && (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          <p className="text-xs font-medium text-slate-600 mb-2">
            Ajuste fino por dimensión. Cualquier cambio marca el preset como &quot;Personalizado&quot;.
          </p>

          {[
            { key: 'threshold' as const, label: 'Contraste trazo/fondo', hint: 'Mayor = más fondo eliminado' },
            { key: 'strokeStrength' as const, label: 'Grosor y continuidad', hint: 'Mayor = trazos más gruesos' },
            { key: 'edgeSmoothness' as const, label: 'Suavidad de bordes', hint: 'Mayor = bordes más suaves' },
            { key: 'noiseRemoval' as const, label: 'Eliminación de ruido', hint: 'Mayor = menos artefactos' },
            { key: 'saturationFilter' as const, label: 'Filtro anti-sello', hint: 'Mayor = más agresivo vs grises' },
          ].map(({ key, label, hint }) => (
            <div key={key}>
              <label className="text-sm font-medium text-slate-700 block mb-1">{label}</label>
              <input
                type="range"
                min={0}
                max={100}
                value={params[key]}
                onChange={(e) => handleParamChange(key, Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <p className="text-xs text-slate-500 mt-0.5">{hint}</p>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-500">
        El resultado se actualiza al instante. Ajuste hasta lograr una firma clara y legible antes de confirmar.
      </p>

      <div className="flex gap-2 justify-end pt-2">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={disabled}>
          Cancelar
        </Button>
        <Button size="sm" onClick={handleConfirm} disabled={disabled || !preview}>
          Confirmar y guardar
        </Button>
      </div>
    </div>
  );
}
