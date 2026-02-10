'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, User } from 'lucide-react';
import { IMiembro, CreateMiembroComiteDto } from '@/types';
import { comitesService } from '@/services/comites.service';
import { MiembroFormModal } from './MiembroFormModal';
import { toast } from 'sonner';

interface MiembrosManagerProps {
  comiteId: string;
  empresaId: string;
}

export function MiembrosManager({ comiteId, empresaId }: MiembrosManagerProps) {
  const [miembros, setMiembros] = useState<IMiembro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadMiembros();
  }, [comiteId]);

  const loadMiembros = async () => {
    try {
      setIsLoading(true);
      const data = await comitesService.listarMiembros(comiteId);
      setMiembros(data);
    } catch (error: any) {
      toast.error('Error al cargar miembros', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAgregarMiembro = async (data: CreateMiembroComiteDto) => {
    try {
      await comitesService.agregarMiembro(comiteId, data);
      toast.success('Miembro agregado exitosamente');
      await loadMiembros();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'No se pudo agregar el miembro';
      toast.error('Error al agregar miembro', {
        description: errorMessage,
      });
      throw error; // Re-lanzar para que el modal maneje el error
    }
  };

  const handleQuitarMiembro = async (miembroId: string) => {
    if (!confirm('¿Está seguro de que desea quitar este miembro del comité?')) {
      return;
    }
    try {
      await comitesService.quitarMiembro(miembroId);
      toast.success('Miembro removido exitosamente');
      loadMiembros();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'No se pudo remover el miembro';
      toast.error('Error al remover miembro', {
        description: errorMessage,
      });
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Miembros del Comité</h3>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Agregar Miembro
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Cargando miembros...</div>
      ) : miembros.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p>No hay miembros registrados</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-gray-600 font-semibold">Trabajador</TableHead>
                <TableHead className="text-gray-600 font-semibold">Tipo</TableHead>
                <TableHead className="text-gray-600 font-semibold">Rol</TableHead>
                <TableHead className="text-gray-600 font-semibold">Representación</TableHead>
                <TableHead className="text-gray-600 font-semibold text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {miembros.map((miembro) => (
                <TableRow key={miembro.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div>
                      <div className="font-medium text-gray-900">
                        {miembro.trabajador_nombre || 'N/A'}
                      </div>
                      {miembro.trabajador_dni && (
                        <div className="text-sm text-gray-500">
                          DNI: {miembro.trabajador_dni}
                        </div>
                      )}
                      {miembro.trabajador_cargo && (
                        <div className="text-sm text-gray-500">{miembro.trabajador_cargo}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {miembro.tipo_miembro}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {miembro.rol_comite}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {miembro.representacion}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleQuitarMiembro(miembro.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <MiembroFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAgregarMiembro}
        empresaId={empresaId}
      />
    </div>
  );
}
