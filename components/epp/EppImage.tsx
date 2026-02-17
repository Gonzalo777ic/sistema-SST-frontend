'use client';

import { useState } from 'react';
import { Package } from 'lucide-react';

interface EppImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  placeholderClassName?: string;
}

/**
 * Muestra la imagen del EPP o un placeholder cuando falla la carga (ej. URLs GCS sin acceso).
 */
export function EppImage({ src, alt, className = 'w-16 h-16 object-cover rounded', placeholderClassName }: EppImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    const shortName = alt.split(/\s+/).slice(0, 2).join(' ').toUpperCase().slice(0, 14) || 'EPP';
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 text-slate-500 text-xs font-medium rounded overflow-hidden ${className} ${placeholderClassName || ''}`}
        title={alt}
      >
        <span className="px-1 text-center leading-tight">{shortName}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
    />
  );
}
