/**
 * src/lib/image-signature-processing.ts
 * Procesamiento avanzado de firmas: Umbral adaptativo (Otsu), filtro de saturación,
 * múltiples estrategias para distintos tipos de firma (negra, azul, con sello).
 */

export type ProcessedImageOptions = {
  /** Umbral fijo (0-255). Si no se especifica, se usa Otsu automático. */
  whiteThreshold?: number;

  /** Modo de procesamiento:
   * - 'auto': Otsu + heurísticas, intenta múltiples estrategias
   * - 'conservative': Umbral más bajo, preserva firmas claras/azules
   * - 'aggressive': Umbral más alto, elimina más fondo/sellos */
  mode?: 'auto' | 'conservative' | 'aggressive';

  /** Nivel de limpieza 0-100. 0=conservador (menos fondo eliminado), 50=automático, 100=agresivo (más fondo eliminado). */
  sensitivity?: number;

  /** Color de la tinta resultante */
  inkColor?: 'black' | 'dark_blue';

  /** Grosor artificial (0 = original, 1-3 = más grueso) */
  strokeThickness?: number;
};

/** Resultado de carga para ajuste en tiempo real */
export type SignatureLoadResult = {
  rawData: Uint8ClampedArray;
  width: number;
  height: number;
  otsuThreshold: number;
  isBlueInk: boolean;
};

/** Parámetros multi-dimensionales para procesamiento de firmas */
export interface SignatureProcessingParams {
  /** Contraste trazo/fondo (0-100). Mayor = más fondo eliminado, trazos más definidos. */
  threshold: number;
  /** Grosor/continuidad del trazo (0-100). Mayor = trazos más gruesos y continuos. */
  strokeStrength: number;
  /** Suavidad de bordes (0-100). Mayor = bordes más suaves, menos dentados. */
  edgeSmoothness: number;
  /** Eliminación de ruido (0-100). Mayor = más artefactos aislados eliminados. */
  noiseRemoval: number;
  /** Filtro anti-sello (0-100). Mayor = más agresivo contra grises/sellos. */
  saturationFilter: number;
}

/** Presets adaptados a distintos tipos de firma */
export const SIGNATURE_PRESETS: Record<string, SignatureProcessingParams> = {
  clara: {
    threshold: 35,
    strokeStrength: 55,
    edgeSmoothness: 40,
    noiseRemoval: 35,
    saturationFilter: 25,
  },
  oscura: {
    threshold: 68,
    strokeStrength: 50,
    edgeSmoothness: 35,
    noiseRemoval: 55,
    saturationFilter: 65,
  },
  escaneada: {
    threshold: 52,
    strokeStrength: 60,
    edgeSmoothness: 55,
    noiseRemoval: 75,
    saturationFilter: 70,
  },
  digital: {
    threshold: 58,
    strokeStrength: 35,
    edgeSmoothness: 25,
    noiseRemoval: 25,
    saturationFilter: 50,
  },
  personalizado: {
    threshold: 50,
    strokeStrength: 50,
    edgeSmoothness: 35,
    noiseRemoval: 50,
    saturationFilter: 50,
  },
};

const DARK_BLUE = { r: 0, g: 51, b: 102 };
const BLACK = { r: 0, g: 0, b: 0 };

/** Calcula umbral óptimo con método de Otsu (minimiza varianza intra-clase) */
function otsuThreshold(luminances: number[]): number {
  const hist = new Array(256).fill(0);
  for (const L of luminances) hist[Math.min(255, Math.floor(L))]++;
  const total = luminances.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let maxVar = 0;
  let bestT = 0;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const varBetween = wB * wF * (mB - mF) ** 2;
    if (varBetween > maxVar) {
      maxVar = varBetween;
      bestT = t;
    }
  }
  return bestT;
}

/** Detecta si la imagen tiene tinta azul dominante (firmas en lapicero azul) */
function hasBlueInkDominance(data: Uint8ClampedArray): boolean {
  let blueCount = 0;
  let darkCount = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum < 200) {
      darkCount++;
      if (b > r + 20 && b > g + 20) blueCount++;
    }
  }
  return darkCount > 0 && blueCount / darkCount > 0.4;
}

/** Saturación en 0-1 (0=gris, 1=color puro) */
function getSaturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  if (max === 0) return 0;
  return (max - min) / max;
}

/** Aplica el procesamiento con un umbral dado */
function applyThreshold(
  data: Uint8ClampedArray,
  threshold: number,
  targetColor: { r: number; g: number; b: number },
  useSaturationFilter: boolean,
  saturationMin: number
): void {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    const saturation = getSaturation(r, g, b);

    if (luminance < threshold) {
      // Filtro de saturación: elimina pixeles grises (típicos de sellos)
      if (useSaturationFilter && saturation < saturationMin) {
        data[i + 3] = 0;
        continue;
      }
      let inkStrength = (255 - luminance) / (255 - 40) * 4;
      if (inkStrength > 1) inkStrength = 1;
      data[i] = targetColor.r;
      data[i + 1] = targetColor.g;
      data[i + 2] = targetColor.b;
      data[i + 3] = inkStrength > 0.25 ? 255 : Math.max(180, Math.round(inkStrength * 255));
    } else {
      data[i + 3] = 0;
    }
  }
}

/** Mapea saturationFilter 0-100 a saturationMin (0 = sin filtro, 100 = 0.18) */
function saturationMinFromParam(param: number): number {
  if (param < 5) return 1;
  return (param / 100) * 0.18;
}

/** Cuenta pixeles con tinta (alpha > 50) */
function countInkPixels(data: Uint8ClampedArray): number {
  let n = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] > 50) n++;
  return n;
}

/** Calcula umbral a partir de sensibilidad 0-100 y Otsu base */
function thresholdFromSensitivity(otsuT: number, sensitivity: number, isBlueInk: boolean): number {
  const base = isBlueInk ? Math.min(otsuT + 15, 220) : otsuT;
  const delta = (sensitivity - 50) * 1.5;
  return Math.max(50, Math.min(250, base + delta));
}

/** Mapea threshold 0-100 a umbral absoluto (0-255) usando Otsu como base */
function thresholdFromParam(otsuT: number, param: number, isBlueInk: boolean): number {
  const base = isBlueInk ? Math.min(otsuT + 15, 220) : otsuT;
  const delta = (param - 50) * 2.2;
  return Math.max(40, Math.min(245, base + delta));
}

/** Blur 3x3 suave en luminancia para suavizar bordes antes del umbral */
function applyPreBlur(data: Uint8ClampedArray, w: number, h: number, strength: number): void {
  if (strength < 5) return;
  const radius = strength > 60 ? 2 : 1;
  const src = new Uint8ClampedArray(data);
  const size = (radius * 2 + 1) ** 2;
  for (let y = radius; y < h - radius; y++) {
    for (let x = radius; x < w - radius; x++) {
      let r = 0, g = 0, b = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const i = ((y + dy) * w + (x + dx)) * 4;
          r += src[i];
          g += src[i + 1];
          b += src[i + 2];
        }
      }
      const i = (y * w + x) * 4;
      data[i] = Math.round(r / size);
      data[i + 1] = Math.round(g / size);
      data[i + 2] = Math.round(b / size);
    }
  }
}

/** Elimina pixeles aislados (ruido) - requiere vecinos con tinta */
function applyNoiseRemoval(data: Uint8ClampedArray, w: number, h: number, strength: number): void {
  if (strength < 5) return;
  const minNeighbors = strength > 70 ? 2 : 1;
  const src = new Uint8ClampedArray(data);
  const dx = [-1, 0, 1, -1, 1, -1, 0, 1];
  const dy = [-1, -1, -1, 0, 0, 1, 1, 1];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;
      if (src[idx + 3] < 80) continue;
      let neighbors = 0;
      for (let d = 0; d < 8; d++) {
        const ni = ((y + dy[d]) * w + (x + dx[d])) * 4 + 3;
        if (src[ni] > 80) neighbors++;
      }
      if (neighbors < minNeighbors) {
        data[idx + 3] = 0;
      }
    }
  }
}

export async function processSignatureImage(
  source: string | File,
  options: ProcessedImageOptions = {}
): Promise<string> {
  const {
    whiteThreshold: fixedThreshold,
    mode = 'auto',
    sensitivity,
    inkColor = 'black',
    strokeThickness = 1,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          reject(new Error('Error de contexto Canvas'));
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const targetColor = inkColor === 'dark_blue' ? DARK_BLUE : BLACK;

        // Calcular luminancias para Otsu
        const luminances: number[] = [];
        for (let i = 0; i < data.length; i += 4) {
          luminances.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        }

        const otsuT = otsuThreshold(luminances);
        const isBlueInk = hasBlueInkDominance(data);
        const originalData = new Uint8ClampedArray(data);

        let threshold: number;
        let useSaturationFilter: boolean;
        let saturationMin: number;

        if (fixedThreshold !== undefined) {
          threshold = fixedThreshold;
          useSaturationFilter = false;
          saturationMin = 0;
        } else if (sensitivity !== undefined && sensitivity >= 0 && sensitivity <= 100) {
          threshold = thresholdFromSensitivity(otsuT, sensitivity, isBlueInk);
          useSaturationFilter = true;
          saturationMin = 0.08;
        } else if (mode === 'auto') {
          threshold = isBlueInk ? Math.min(otsuT + 15, 220) : otsuT;
          useSaturationFilter = true;
          saturationMin = 0.08;
        } else if (mode === 'conservative') {
          threshold = Math.min(otsuT + 25, 200);
          useSaturationFilter = true;
          saturationMin = 0.05;
        } else {
          threshold = Math.max(otsuT - 10, 200);
          useSaturationFilter = true;
          saturationMin = 0.12;
        }

        applyThreshold(data, threshold, targetColor, useSaturationFilter, saturationMin);
        let inkPixels = countInkPixels(data);

        // Fallback: si el resultado está muy vacío, probar umbral más permisivo sin filtro saturación
        const minExpected = (canvas.width * canvas.height) * 0.001;
        if (mode === 'auto' && inkPixels < minExpected && threshold > 150) {
          data.set(originalData);
          const lowerT = Math.min(threshold - 25, 175);
          applyThreshold(data, lowerT, targetColor, false, 0);
          const newInk = countInkPixels(data);
          if (newInk <= inkPixels) {
            data.set(originalData);
            applyThreshold(data, Math.round((threshold + lowerT) / 2), targetColor, false, 0);
          }
        }

        if (strokeThickness > 0) {
          applyDilate(data, canvas.width, canvas.height, strokeThickness, targetColor);
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        reject(e);
      }
    };

    img.onerror = () => reject(new Error('Error cargando imagen'));

    if (typeof source === 'string') {
      img.src = source;
    } else {
      const reader = new FileReader();
      reader.onload = () => { img.src = reader.result as string; };
      reader.onerror = () => reject(new Error('Error leyendo archivo'));
      reader.readAsDataURL(source);
    }
  });
}

/**
 * Carga una imagen para ajuste en tiempo real. Retorna los datos crudos y el umbral Otsu.
 */
export function loadImageForAdjustment(source: File | string): Promise<SignatureLoadResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          reject(new Error('Error de contexto Canvas'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const luminances: number[] = [];
        for (let i = 0; i < data.length; i += 4) {
          luminances.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        }
        const otsuT = otsuThreshold(luminances);
        const isBlueInk = hasBlueInkDominance(data);
        resolve({
          rawData: new Uint8ClampedArray(data),
          width: canvas.width,
          height: canvas.height,
          otsuThreshold: otsuT,
          isBlueInk,
        });
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('Error cargando imagen'));
    if (typeof source === 'string') {
      img.src = source;
    } else {
      const reader = new FileReader();
      reader.onload = () => { img.src = reader.result as string; };
      reader.onerror = () => reject(new Error('Error leyendo archivo'));
      reader.readAsDataURL(source);
    }
  });
}

/**
 * Procesa la firma con un nivel de sensibilidad dado (0-100). Síncrono, para preview en tiempo real.
 * Mantiene compatibilidad; internamente usa params con preset personalizado.
 */
export function processSignatureWithSensitivity(
  loadResult: SignatureLoadResult,
  sensitivity: number,
  options: { inkColor?: 'black' | 'dark_blue'; strokeThickness?: number } = {}
): string {
  const params: SignatureProcessingParams = {
    ...SIGNATURE_PRESETS.personalizado,
    threshold: sensitivity,
    strokeStrength: 50,
  };
  return processSignatureWithParams(loadResult, params, options);
}

/**
 * Procesa la firma con parámetros multi-dimensionales. Síncrono, para preview en tiempo real.
 */
export function processSignatureWithParams(
  loadResult: SignatureLoadResult,
  params: SignatureProcessingParams,
  options: { inkColor?: 'black' | 'dark_blue' } = {}
): string {
  const { rawData, width, height, otsuThreshold, isBlueInk } = loadResult;
  const { inkColor = 'black' } = options;
  const targetColor = inkColor === 'dark_blue' ? DARK_BLUE : BLACK;

  const data = new Uint8ClampedArray(rawData);

  // 1. Pre-blur para suavidad de bordes (antes del umbral)
  applyPreBlur(data, width, height, params.edgeSmoothness);

  // 2. Umbral según contraste
  const threshold = thresholdFromParam(otsuThreshold, params.threshold, isBlueInk);
  const useSaturation = params.saturationFilter >= 5;
  const saturationMin = saturationMinFromParam(params.saturationFilter);
  applyThreshold(data, threshold, targetColor, useSaturation, saturationMin);

  // 3. Eliminación de ruido (pixeles aislados)
  applyNoiseRemoval(data, width, height, params.noiseRemoval);

  // 4. Grosor/continuidad del trazo (dilatación)
  const dilatePasses = params.strokeStrength >= 75 ? 2 : params.strokeStrength >= 35 ? 1 : 0;
  if (dilatePasses > 0) {
    applyDilate(data, width, height, dilatePasses, targetColor);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No contexto');
  const imageData = new ImageData(data, width, height);
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Dilatación morfológica: engrosa trazos con 8 vecinos (incl. diagonales)
 */
function applyDilate(data: Uint8ClampedArray, w: number, h: number, strength: number, color: {r:number, g:number, b:number}) {
  const dx = [-1, 0, 1, -1, 1, -1, 0, 1];
  const dy = [-1, -1, -1, 0, 0, 1, 1, 1];

  for (let pass = 0; pass < Math.min(strength, 2); pass++) {
    const src = new Uint8ClampedArray(data);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4;
        if (src[idx + 3] < 50) {
          let hasNeighbor = false;
          for (let d = 0; d < 8 && !hasNeighbor; d++) {
            const nx = x + dx[d];
            const ny = y + dy[d];
            if (src[(ny * w + nx) * 4 + 3] > 100) hasNeighbor = true;
          }
          if (hasNeighbor) {
            data[idx] = color.r;
            data[idx + 1] = color.g;
            data[idx + 2] = color.b;
            data[idx + 3] = 255;
          }
        }
      }
    }
  }
}
/**
 * Aplica color de sello a una imagen preprocesada (fondo transparente).
 */
export async function applySealColor(
  sourceDataUrl: string,
  color: { r: number; g: number; b: number }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo obtener contexto'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          // Solo cambiamos color si hay opacidad significativa
          if (a > 50) {
            data[i] = color.r;
            data[i + 1] = color.g;
            data[i + 2] = color.b;
            // Mantenemos el alpha original (o lo forzamos a sólido si se desea)
            data[i + 3] = 255; 
          }
        }
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('Error al cargar imagen'));
    img.src = sourceDataUrl;
  });
}

/**
 * Compone sello + firma debajo.
 */
export function compositeSealWithSignature(
  sealDataUrl: string,
  signatureDataUrl: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const sealImg = new Image();
    const sigImg = new Image();
    sealImg.crossOrigin = 'anonymous';
    sigImg.crossOrigin = 'anonymous';

    let loaded = 0;
    const checkLoad = () => {
      loaded++;
      if (loaded === 2) doComposite();
    };

    const doComposite = () => {
      try {
        const sealW = sealImg.naturalWidth;
        const sealH = sealImg.naturalHeight;
        
        // Estandarizar ancho del sello
        const maxSealW = 300;
        const scale = sealW > maxSealW ? maxSealW / sealW : 1;
        const w = Math.round(sealW * scale);
        const sealHScaled = Math.round(sealH * scale);

        const gap = 12;
        
        // Calcular dimensiones de la firma
        const maxSigW = w * 0.8; // Firma al 80% del ancho del sello
        const maxSigH = 80; // Altura máxima razonable

        let sigW = sigImg.naturalWidth;
        let sigH = sigImg.naturalHeight;
        
        const ratio = Math.min(maxSigW / sigW, maxSigH / sigH);
        sigW = Math.round(sigW * ratio);
        sigH = Math.round(sigH * ratio);

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = sealHScaled + gap + sigH;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('No ctx'));

        // Fondo transparente (por defecto en canvas nuevo) o blanco si se prefiere
        // ctx.fillStyle = '#ffffff'; 
        // ctx.fillRect(0,0, canvas.width, canvas.height);

        // Dibujar Sello
        ctx.drawImage(sealImg, 0, 0, sealW, sealH, 0, 0, w, sealHScaled);
        
        // Dibujar Firma centrada horizontalmente
        const sigX = (w - sigW) / 2;
        ctx.drawImage(sigImg, 0, 0, sigImg.naturalWidth, sigImg.naturalHeight, sigX, sealHScaled + gap, sigW, sigH);
        
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        reject(e);
      }
    };

    sealImg.onload = checkLoad;
    sigImg.onload = checkLoad;
    sealImg.onerror = () => reject(new Error('Error cargar sello'));
    sigImg.onerror = () => reject(new Error('Error cargar firma'));
    
    sealImg.src = sealDataUrl;
    sigImg.src = signatureDataUrl;
  });
}

export const SEAL_COLORS_RECOMMENDED = [
  { name: 'Azul oscuro', hex: '#003366', rgb: { r: 0, g: 51, b: 102 } },
  { name: 'Negro', hex: '#000000', rgb: { r: 0, g: 0, b: 0 } },
  { name: 'Rojo oscuro', hex: '#8B0000', rgb: { r: 139, g: 0, b: 0 } },
  { name: 'Verde oscuro', hex: '#006400', rgb: { r: 0, g: 100, b: 0 } },
] as const;