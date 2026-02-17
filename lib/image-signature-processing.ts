/**
 * Procesamiento de imágenes para firma y sello médico.
 * - Limpieza de fondo: píxeles claros -> transparentes
 * - Contraste: trazo de tinta en negro/azul oscuro
 */

export type ProcessedImageOptions = {
  /** Umbral de luminosidad para considerar fondo (0-255). Por defecto 200 */
  backgroundThreshold?: number;
  /** Color de salida: 'black' | 'dark_blue' */
  inkColor?: 'black' | 'dark_blue';
  /** Factor de contraste (1 = sin cambio, 2 = doble) */
  contrastFactor?: number;
  /** Grosor del trazo: 0 = normal, 1 = ligero, 2 = más grueso (dilatación) */
  strokeThickness?: 0 | 1 | 2;
};

const DARK_BLUE = { r: 0, g: 51, b: 102 };

/**
 * Procesa una imagen de firma/sello: limpia fondo y ajusta contraste.
 * Retorna data URL PNG con canal alpha.
 */
export async function processSignatureImage(
  source: string | File,
  options: ProcessedImageOptions = {}
): Promise<string> {
  const {
    backgroundThreshold = 200,
    inkColor = 'black',
    contrastFactor = 1.8,
    strokeThickness = 0,
  } = options;

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
          reject(new Error('No se pudo obtener contexto de canvas'));
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

          if (luminance >= backgroundThreshold || a < 50) {
            data[i + 3] = 0;
            continue;
          }

          const normalized = Math.min(255, luminance * contrastFactor);
          const ink = inkColor === 'dark_blue' ? DARK_BLUE : { r: 0, g: 0, b: 0 };
          const factor = 1 - normalized / 255;

          data[i] = Math.round(ink.r + (255 - ink.r) * (1 - factor));
          data[i + 1] = Math.round(ink.g + (255 - ink.g) * (1 - factor));
          data[i + 2] = Math.round(ink.b + (255 - ink.b) * (1 - factor));
          data[i + 3] = Math.round(255 * (1 - luminance / 255));
        }

        if (strokeThickness > 0) {
          const dilated = new Uint8ClampedArray(data.length);
          dilated.set(data);
          const w = canvas.width;
          const h = canvas.height;
          const radius = strokeThickness;
          for (let y = radius; y < h - radius; y++) {
            for (let x = radius; x < w - radius; x++) {
              const idx = (y * w + x) * 4;
              if (data[idx + 3] > 40) {
                for (let dy = -radius; dy <= radius; dy++) {
                  for (let dx = -radius; dx <= radius; dx++) {
                    const ni = ((y + dy) * w + (x + dx)) * 4;
                    dilated[ni] = data[idx];
                    dilated[ni + 1] = data[idx + 1];
                    dilated[ni + 2] = data[idx + 2];
                    dilated[ni + 3] = Math.max(dilated[ni + 3], Math.round(data[idx + 3] * 0.85));
                  }
                }
              }
            }
          }
          imageData.data.set(dilated);
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        reject(e);
      }
    };

    img.onerror = () => reject(new Error('Error al cargar la imagen'));

    if (typeof source === 'string') {
      img.src = source;
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsDataURL(source);
    }
  });
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
          if (a < 10) continue;
          const factor = a / 255;
          data[i] = color.r;
          data[i + 1] = color.g;
          data[i + 2] = color.b;
          data[i + 3] = Math.round(255 * factor);
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
 * Compone sello + firma debajo. Útil cuando el sello subido no incluye firma.
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

    const tryComposite = () => {
      if (!sealImg.complete || !sigImg.complete) return;
      try {
        const sealW = sealImg.naturalWidth;
        const sealH = sealImg.naturalHeight;
        const maxSealW = 280;
        const scale = sealW > maxSealW ? maxSealW / sealW : 1;
        const w = Math.round(sealW * scale);
        const sealHScaled = Math.round(sealH * scale);

        const gap = 12;
        const maxSigW = 120;
        const maxSigH = 50;
        let sigW = sigImg.naturalWidth;
        let sigH = sigImg.naturalHeight;
        if (sigW > maxSigW || sigH > maxSigH) {
          const r = Math.min(maxSigW / sigW, maxSigH / sigH);
          sigW *= r;
          sigH *= r;
        }
        sigW = Math.round(sigW);
        sigH = Math.round(sigH);

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = sealHScaled + gap + sigH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo obtener contexto'));
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(sealImg, 0, 0, sealW, sealH, 0, 0, w, sealHScaled);
        const sigX = (w - sigW) / 2;
        ctx.drawImage(sigImg, sigX, sealHScaled + gap, sigW, sigH);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        reject(e);
      }
    };

    sealImg.onload = sigImg.onload = tryComposite;
    sealImg.onerror = () => reject(new Error('Error al cargar sello'));
    sigImg.onerror = () => reject(new Error('Error al cargar firma'));
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
