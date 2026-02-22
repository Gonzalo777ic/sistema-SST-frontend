'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onFetchSuggestions: (q: string) => Promise<string[]>;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
}

export function AutocompleteInput({
  value,
  onChange,
  onFetchSuggestions,
  placeholder,
  className,
  debounceMs = 300,
}: AutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(
    async (q: string) => {
      setLoading(true);
      try {
        const data = await onFetchSuggestions(q);
        setSuggestions(data);
        setShowDropdown(data.length > 0);
      } catch {
        setSuggestions([]);
        setShowDropdown(false);
      } finally {
        setLoading(false);
      }
    },
    [onFetchSuggestions],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      fetchSuggestions(value);
    }, debounceMs);
    return () => clearTimeout(t);
  }, [value, debounceMs, fetchSuggestions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => value && fetchSuggestions(value)}
        placeholder={placeholder}
        className={cn(className)}
        autoComplete="off"
      />
      {showDropdown && (
        <ul
          className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
          role="listbox"
        >
          {loading ? (
            <li className="px-3 py-2 text-sm text-gray-500">Buscando...</li>
          ) : (
            suggestions.map((s, i) => (
              <li
                key={`${s}-${i}`}
                role="option"
                className="cursor-pointer px-3 py-2 text-sm hover:bg-gray-100"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(s);
                  setShowDropdown(false);
                }}
              >
                {s}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
