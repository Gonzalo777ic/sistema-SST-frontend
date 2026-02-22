'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cie10Service, Cie10Item } from '@/services/cie10.service';
import { Search, X, Plus, AlertTriangle } from 'lucide-react';

interface Cie10BuscadorProps {
  seleccionados: Cie10Item[];
  onAgregar: (item: Cie10Item) => void;
  onQuitar: (code: string) => void;
  disabled?: boolean;
}

const DEBOUNCE_MS = 300;

export function Cie10Buscador({
  seleccionados,
  onAgregar,
  onQuitar,
  disabled,
}: Cie10BuscadorProps) {
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState<Cie10Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [linajeCache, setLinajeCache] = useState<Record<string, Array<{ code: string; description: string; level: number }>>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Obtener linaje para items que no lo tienen (ej. cargados desde backend)
  useEffect(() => {
    const sinLinaje = seleccionados.filter((s) => !s.ancestros && !linajeCache[s.code]);
    if (sinLinaje.length === 0) return;
    sinLinaje.forEach((s) => {
        cie10Service.getLinaje(s.code).then(({ ancestros }) => {
        setLinajeCache((prev) => ({ ...prev, [s.code]: ancestros }));
      });
    });
  }, [seleccionados, linajeCache]);

  useEffect(() => {
    if (!query.trim()) {
      setResultados([]);
      setMostrarDropdown(false);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await cie10Service.search(query);
        setResultados(data);
        setMostrarDropdown(true);
      } catch {
        setResultados([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMostrarDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const yaSeleccionado = (code: string) => seleccionados.some((s) => s.code === code);
  const primerDisponible = resultados.find((r) => !yaSeleccionado(r.code));

  const agregarConLinaje = async (item: Cie10Item) => {
    const { item: itemFull, ancestros } = await cie10Service.getLinaje(item.code);
    onAgregar({
      ...item,
      level: itemFull?.level ?? item.level,
      ancestros,
    });
    setQuery('');
    setMostrarDropdown(false);
  };

  const handleAgregarDiagnostico = () => {
    if (primerDisponible) {
      agregarConLinaje(primerDisponible);
    } else {
      inputRef.current?.focus();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.trim() && setMostrarDropdown(true)}
            placeholder="Buscar por código (ej. F50) o descripción (ej. Anorexia)..."
            disabled={disabled}
            className="pl-9"
          />
          {mostrarDropdown && resultados.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full max-h-60 overflow-auto bg-white border border-gray-200 rounded-md shadow-lg">
              {resultados.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!yaSeleccionado(r.code)) {
                        agregarConLinaje(r);
                      }
                    }}
                    disabled={yaSeleccionado(r.code)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                      yaSeleccionado(r.code) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="font-mono font-medium text-blue-600">{r.code}</span>
                        <span className="text-gray-600"> — {r.description}</span>
                        {r.categoria_nivel0 && (
                          <div className="text-xs text-gray-400 mt-0.5 truncate">
                            {r.categoria_nivel0}
                          </div>
                        )}
                      </div>
                      {(r.level === 0 || r.level === 1) && (
                        <AlertTriangle
                          className="h-4 w-4 text-amber-500 shrink-0"
                          title="Se recomienda usar un código más específico (Nivel 3)"
                        />
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {loading && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
              Buscando...
            </span>
          )}
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAgregarDiagnostico}
        disabled={disabled}
        className="mt-2 gap-2"
      >
        <Plus className="h-4 w-4" />
        Agregar diagnóstico
      </Button>

      {seleccionados.length > 0 && (
        <div className="mt-2 space-y-2">
          {seleccionados.map((s) => {
            const ancestros = s.ancestros ?? linajeCache[s.code] ?? [];
            const breadcrumb = ancestros.map((a) => a.description).join(' › ');
            const esPocoEspecifico = s.level === 0 || s.level === 1;
            return (
              <div
                key={s.code}
                className="flex items-start justify-between gap-2 py-2 px-2 bg-gray-50 rounded border border-gray-200 text-sm"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono font-medium text-blue-600">{s.code}</span>
                    <span className="text-gray-600">— {s.description}</span>
                    {esPocoEspecifico && (
                      <AlertTriangle
                        className="h-4 w-4 text-amber-500 shrink-0"
                        title="Se recomienda usar un código más específico (Nivel 3)"
                      />
                    )}
                  </div>
                  {breadcrumb && (
                    <div className="mt-1 text-xs text-gray-500 truncate" title={breadcrumb}>
                      {ancestros.map((a) => a.description).join(' › ')}
                    </div>
                  )}
                </div>
                {!disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onQuitar(s.code)}
                    className="h-7 w-7 p-0 text-gray-500 hover:text-red-600 shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
