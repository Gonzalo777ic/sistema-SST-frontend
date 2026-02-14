/**
 * Valida que una firma digital (imagen base64) no esté vacía.
 * Criterio: una firma real introduce entropía; una imagen vacía es muy ligera.
 * Umbral: base64 debe tener al menos ~800 chars (≈600 bytes decoded).
 */
const MIN_BASE64_LENGTH = 800;

export function isValidSignature(dataUrl: string): boolean {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    return false;
  }
  const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  return base64Data.length >= MIN_BASE64_LENGTH;
}

export function getSignatureValidationError(): string {
  return 'La firma debe contener un trazo real. No se permiten firmas en blanco.';
}
