'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from './button';

interface SignaturePadProps {
  value?: string | null;
  onChange?: (dataUrl: string) => void;
  width?: number;
  height?: number;
  disabled?: boolean;
}

export function SignaturePad({
  value,
  onChange,
  width = 300,
  height = 120,
  disabled = false,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const prevPos = useRef<{ x: number; y: number } | null>(null);

  const getCoords = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      if ('touches' in e) {
        return {
          x: (e.touches[0].clientX - rect.left) * scaleX,
          y: (e.touches[0].clientY - rect.top) * scaleY,
        };
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  const draw = useCallback(
    (x: number, y: number) => {
      const canvas = canvasRef.current;
      if (!canvas || disabled) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (prevPos.current) {
        ctx.beginPath();
        ctx.moveTo(prevPos.current.x, prevPos.current.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      prevPos.current = { x, y };
    },
    [disabled]
  );

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (disabled) return;
      const coords = getCoords(e);
      if (coords) {
        setIsDrawing(true);
        setHasDrawn(true);
        prevPos.current = coords;
      }
    },
    [disabled, getCoords]
  );

  const moveDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (!isDrawing || disabled) return;
      const coords = getCoords(e);
      if (coords) {
        draw(coords.x, coords.y);
      }
    },
    [isDrawing, disabled, getCoords, draw]
  );

  const stopDrawing = useCallback(() => {
    if (isDrawing && hasDrawn && canvasRef.current && onChange) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onChange(dataUrl);
    }
    setIsDrawing(false);
    prevPos.current = null;
  }, [isDrawing, hasDrawn, onChange]);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || disabled) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onChange?.('');
  }, [disabled, onChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (value && value.startsWith('data:')) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = value;
    }
  }, [value]);

  useEffect(() => {
    const handleMouseUp = () => stopDrawing();
    const handleTouchEnd = () => stopDrawing();
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [stopDrawing]);

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border border-gray-300 rounded cursor-crosshair touch-none bg-white"
        style={{ width: '100%', maxWidth: width, height: 'auto', aspectRatio: `${width}/${height}` }}
        onMouseDown={startDrawing}
        onMouseMove={moveDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={moveDrawing}
      />
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={clear} disabled={disabled}>
          Limpiar firma
        </Button>
      </div>
    </div>
  );
}
