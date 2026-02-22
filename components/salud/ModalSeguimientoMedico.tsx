'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Cie10Buscador } from '@/components/salud/Cie10Buscador';
import type { Cie10Item } from '@/services/cie10.service';

const ESPECIALIDADES = [
  { value: 'CARDIOLOGÍA', label: 'CARDIOLOGÍA' },
  { value: 'OFTALMOLOGÍA', label: 'OFTALMOLOGÍA' },
  { value: 'NEUMOLOGÍA', label: 'NEUMOLOGÍA' },
  { value: 'TRAUMATOLOGÍA', label: 'TRAUMATOLOGÍA' },
  { value: 'DERMATOLOGÍA', label: 'DERMATOLOGÍA' },
  { value: 'GASTROENTEROLOGÍA', label: 'GASTROENTEROLOGÍA' },
  { value: 'NEFROLOGÍA', label: 'NEFROLOGÍA' },
  { value: 'ENDOCRINOLOGÍA', label: 'ENDOCRINOLOGÍA' },
  { value: 'NEUROLOGÍA', label: 'NEUROLOGÍA' },
  { value: 'PSIQUIATRÍA', label: 'PSIQUIATRÍA' },
  { value: 'PSICOLOGÍA', label: 'PSICOLOGÍA' },
  { value: 'NUTRICIÓN', label: 'NUTRICIÓN' },
  { value: 'OTORRINOLARINGOLOGÍA', label: 'OTORRINOLARINGOLOGÍA' },
  { value: 'OTROS', label: 'OTROS' },
];

const ESTADOS = [
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'CUMPLE', label: 'Cumple' },
  { value: 'NO_CUMPLE', label: 'No cumple' },
];

export interface SeguimientoFormData {
  tipo: 'INTERCONSULTA' | 'VIGILANCIA';
  cie10_code: string;
  cie10_description: string;
  especialidad: string;
  plazo: string;
  motivo: string;
  estado: string;
}

interface ModalSeguimientoMedicoProps {
  isOpen: boolean;
  onClose: () => void;
  tipo: 'INTERCONSULTA' | 'VIGILANCIA';
  onSubmit: (data: SeguimientoFormData) => Promise<void>;
}

export function ModalSeguimientoMedico({
  isOpen,
  onClose,
  tipo,
  onSubmit,
}: ModalSeguimientoMedicoProps) {
  const [cie10Seleccionado, setCie10Seleccionado] = useState<Cie10Item[]>([]);
  const [especialidad, setEspecialidad] = useState('');
  const [plazo, setPlazo] = useState('');
  const [motivo, setMotivo] = useState('');
  const [estado, setEstado] = useState('PENDIENTE');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const item = cie10Seleccionado[0];
    if (!item) return;
    setSaving(true);
    try {
      await onSubmit({
        tipo,
        cie10_code: item.code,
        cie10_description: item.description,
        especialidad,
        plazo,
        motivo,
        estado,
      });
      onClose();
      setCie10Seleccionado([]);
      setEspecialidad('');
      setPlazo('');
      setMotivo('');
      setEstado('PENDIENTE');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={tipo === 'INTERCONSULTA' ? 'Agregar Interconsulta' : 'Agregar Vigilancia Médica'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Diagnóstico CIE10 *
          </label>
          <Cie10Buscador
            seleccionados={cie10Seleccionado}
            onAgregar={(item) => setCie10Seleccionado([item])}
            onQuitar={() => setCie10Seleccionado([])}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Especialidad *
          </label>
          <Select
            value={especialidad}
            onChange={(e) => setEspecialidad(e.target.value)}
            required
          >
            <option value="">Seleccione</option>
            {ESPECIALIDADES.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Plazo de levantamiento *
          </label>
          <Input
            type="date"
            value={plazo}
            onChange={(e) => setPlazo(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estado
          </label>
          <Select value={estado} onChange={(e) => setEstado(e.target.value)}>
            {ESTADOS.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Motivo (opcional)
          </label>
          <textarea
            className="w-full min-h-[80px] p-3 border border-gray-300 rounded-md text-sm"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo de la interconsulta o vigilancia..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={saving || cie10Seleccionado.length === 0 || !especialidad || !plazo}
          >
            {saving ? 'Guardando...' : 'Agregar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
