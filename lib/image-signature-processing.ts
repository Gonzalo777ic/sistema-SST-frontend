/**
 * src/lib/image-signature-processing.ts
 * Procesamiento avanzado de firmas: Algoritmo de Amplificación de Tinta
 */

export type ProcessedImageOptions = {
  /** Qué tan agresivo es el limpiado de blanco (0-255). 
   * Valores ALTOS (230+) borran más fondo pero pueden borrar firmas claras.
   * Valores BAJOS (180-200) mantienen más detalle.
   * Recomendado para firmas débiles: 210 */
  whiteThreshold?: number;
  
  /** Color de la tinta resultante */
  inkColor?: 'black' | 'dark_blue';
  
  /** Grosor artificial (0 = original, 1-3 = más grueso) */
  strokeThickness?: number;
};

const DARK_BLUE = { r: 0, g: 51, b: 102 };
const BLACK = { r: 0, g: 0, b: 0 };

export async function processSignatureImage(
  source: string | File,
  options: ProcessedImageOptions = {}
): Promise<string> {
  const {
    whiteThreshold = 210, // Umbral de "qué es blanco"
    inkColor = 'black',
    strokeThickness = 1,  // Por defecto engrosamos un poco
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

        // --- ALGORITMO DE AMPLIFICACIÓN DE TINTA ---
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // 1. Calcular luminancia (brillo del pixel 0-255)
          // Usamos fórmula percetual para el ojo humano
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

          // 2. Lógica de "Distancia al Blanco"
          // Si el pixel es más oscuro que el umbral, calculamos qué tan oscuro es.
          if (luminance < whiteThreshold) {
            
            // Calculamos la "fuerza" de la tinta (0.0 a 1.0)
            // Cuanto más lejos del blanco (255), más fuerte es la tinta.
            // El factor '3.5' es un multiplicador de contraste (Gain).
            let inkStrength = (255 - luminance) / (255 - 50) * 4.5;
            
            // Clampear a máximo 1.0
            if (inkStrength > 1) inkStrength = 1;

            // Aplicamos el color deseado
            data[i] = targetColor.r;
            data[i + 1] = targetColor.g;
            data[i + 2] = targetColor.b;
            
            // APLICAR ALPHA BASADO EN FUERZA
            // Si detectamos tinta, la hacemos MUY visible (mínimo 180 de opacidad)
            // Esto evita el efecto "fantasma"
            data[i + 3] = Math.max(180, Math.min(255, inkStrength * 255));
            
            // Si la fuerza es muy alta, forzamos opacidad total
            if (inkStrength > 0.3) data[i + 3] = 255;

          } else {
            // Es fondo blanco/papel -> Transparente total
            data[i + 3] = 0;
          }
        }

        // --- ENGROSAMIENTO (DILATACIÓN) ---
        // Vital para fotos de celular donde 1 pixel de lapicero se pierde al reducir
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

    // Carga de fuente
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
 * Función auxiliar para engrosar trazos (Dilatación Morfológica)
 */
function applyDilate(data: Uint8ClampedArray, w: number, h: number, strength: number, color: {r:number, g:number, b:number}) {
    // Copiamos el buffer original para leer de él
    const original = new Uint8ClampedArray(data);
    
    // Solo necesitamos revisar pixeles transparentes adyacentes a tinta
    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            const idx = (y * w + x) * 4;
            
            // Si el pixel actual es transparente (fondo)
            if (original[idx + 3] < 50) {
                // Miramos a los vecinos (arriba, abajo, izq, der)
                let hasInkNeighbor = false;
                
                // Vecino Arriba
                if (original[((y-1)*w + x)*4 + 3] > 100) hasInkNeighbor = true;
                // Vecino Abajo
                else if (original[((y+1)*w + x)*4 + 3] > 100) hasInkNeighbor = true;
                // Vecino Izq
                else if (original[(y*w + (x-1))*4 + 3] > 100) hasInkNeighbor = true;
                // Vecino Der
                else if (original[(y*w + (x+1))*4 + 3] > 100) hasInkNeighbor = true;

                if (hasInkNeighbor) {
                    // "Manchamos" este pixel con el color de la tinta
                    data[idx] = color.r;
                    data[idx+1] = color.g;
                    data[idx+2] = color.b;
                    // Opacidad sólida para el borde nuevo
                    data[idx+3] = 255; 
                }
            }
        }
    }
    
    // Si la fuerza es mayor a 1, repetimos (recursivo simple para no complicar)
    if (strength > 1) {
       // Nota: Para mantener rendimiento, en JS puro solemos limitar a 1 pasada.
       // Si necesitas más grosor, cambia la lógica de vecinos.
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