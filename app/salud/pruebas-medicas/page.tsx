'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { saludService } from '@/services/salud.service';
import { ListChecks, Plus, Pencil, Power, PowerOff } from 'lucide-react';
import { UsuarioRol } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';
import { toast } from 'sonner';

interface PruebaMedicaItem {
  id: string;
  nombre: string;
  activo?: boolean;
}

export default function PruebasMedicasPage() {
  const { hasRole } = useAuth();
  const [pruebas, setPruebas] = useState<PruebaMedicaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalNueva, setModalNueva] = useState(false);
  const [modalEditar, setModalEditar] = useState<PruebaMedicaItem | null>(null);
  const [nombreNueva, setNombreNueva] = useState('');
  const [nombreEditar, setNombreEditar] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mostrarInactivas, setMostrarInactivas] = useState(false);

  const cargarPruebas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await saludService.getPruebasMedicas(mostrarInactivas);
      setPruebas(res);
    } catch {
      setPruebas([]);
    } finally {
      setLoading(false);
    }
  }, [mostrarInactivas]);

  useEffect(() => {
    cargarPruebas();
  }, [cargarPruebas]);

  const handleCrear = async () => {
    if (!nombreNueva.trim()) {
      toast.error('Ingrese el nombre de la prueba');
      return;
    }
    setGuardando(true);
    try {
      await saludService.createPruebaMedica(nombreNueva.trim());
      toast.success('Prueba médica creada');
      setModalNueva(false);
      setNombreNueva('');
      cargarPruebas();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al crear');
    } finally {
      setGuardando(false);
    }
  };

  const handleActualizar = async () => {
    if (!modalEditar || !nombreEditar.trim()) return;
    setGuardando(true);
    try {
      await saludService.updatePruebaMedica(modalEditar.id, { nombre: nombreEditar.trim() });
      toast.success('Prueba médica actualizada');
      setModalEditar(null);
      setNombreEditar('');
      cargarPruebas();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al actualizar');
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleActivo = async (p: PruebaMedicaItem) => {
    try {
      await saludService.updatePruebaMedica(p.id, { activo: !p.activo });
      toast.success(p.activo ? 'Prueba desactivada' : 'Prueba activada');
      cargarPruebas();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al cambiar estado');
    }
  };

  const abrirEditar = (p: PruebaMedicaItem) => {
    setModalEditar(p);
    setNombreEditar(p.nombre);
  };

  if (!hasRole(UsuarioRol.CENTRO_MEDICO)) {
    return (
      <div className="p-6">
        <p className="text-slate-600">No tiene permisos para acceder a esta página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ListChecks className="w-7 h-7 text-primary" />
            Pruebas Médicas
          </h1>
          <p className="text-slate-600 mt-1">
            Configure las pruebas que ofrece su centro (hemograma, audiometría, etc.)
          </p>
        </div>
        <div className="flex gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={mostrarInactivas}
              onChange={(e) => setMostrarInactivas(e.target.checked)}
              className="rounded border-slate-300"
            />
            Ver inactivas
          </label>
          <Button onClick={() => setModalNueva(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Nueva prueba
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Cargando...</div>
        ) : pruebas.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No hay pruebas médicas configuradas. Agregue una para comenzar.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[140px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pruebas.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        p.activo !== false ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {p.activo !== false ? 'Activa' : 'Inactiva'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => abrirEditar(p)}
                        className="text-slate-600 hover:text-slate-900"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActivo(p)}
                        title={p.activo !== false ? 'Desactivar' : 'Activar'}
                        className={
                          p.activo !== false
                            ? 'text-amber-600 hover:text-amber-700'
                            : 'text-green-600 hover:text-green-700'
                        }
                      >
                        {p.activo !== false ? (
                          <PowerOff className="w-4 h-4" />
                        ) : (
                          <Power className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Modal
        isOpen={modalNueva}
        onClose={() => {
          setModalNueva(false);
          setNombreNueva('');
        }}
        title="Nueva prueba médica"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
            <Input
              value={nombreNueva}
              onChange={(e) => setNombreNueva(e.target.value)}
              placeholder="Ej: Toxicología de 5 parámetros"
              onKeyDown={(e) => e.key === 'Enter' && handleCrear()}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalNueva(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCrear} disabled={guardando}>
              {guardando ? 'Guardando...' : 'Crear'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!modalEditar}
        onClose={() => {
          setModalEditar(null);
          setNombreEditar('');
        }}
        title="Editar prueba médica"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
            <Input
              value={nombreEditar}
              onChange={(e) => setNombreEditar(e.target.value)}
              placeholder="Nombre de la prueba"
              onKeyDown={(e) => e.key === 'Enter' && handleActualizar()}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalEditar(null)}>
              Cancelar
            </Button>
            <Button onClick={handleActualizar} disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
