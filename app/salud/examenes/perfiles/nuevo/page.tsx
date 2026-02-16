'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { configEmoService } from '@/services/config-emo.service';
import { useAuth } from '@/contexts/AuthContext';

export default function NuevoPerfilEmoPage() {
  const router = useRouter();
  const { usuario } = useAuth();
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [costoUnitario, setCostoUnitario] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const usuarioNombre = usuario
    ? [usuario.nombres, usuario.apellido_paterno, usuario.apellido_materno].filter(Boolean).join(' ') || usuario.dni
    : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    const costo = parseFloat(costoUnitario.replace(',', '.'));
    if (isNaN(costo) || costo < 0) {
      toast.error('El costo unitario debe ser un número válido mayor o igual a 0');
      return;
    }
    try {
      setSubmitting(true);
      await configEmoService.createPerfil({
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        costo_unitario: costo,
      });
      toast.success('Perfil creado correctamente');
      router.push('/salud/examenes/configuracion');
    } catch (e: any) {
      toast.error('Error al guardar', {
        description: e.response?.data?.message || e.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/salud/examenes/configuracion">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Perfiles EMOs</h1>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Datos de Examen</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre (*)</label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del perfil"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descripción (*)</label>
            <Input
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripción"
            />
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
            <p className="text-sm text-slate-600">
              Si deseas agregar más opciones a esta lista, haz click aqui para contactarnos.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Costo Unitario (*)</label>
            <div className="flex items-center">
              <span className="mr-2 text-slate-600">S/</span>
              <Input
                type="text"
                value={costoUnitario}
                onChange={(e) => setCostoUnitario(e.target.value.replace(/[^0-9.,]/g, ''))}
                placeholder="0.00"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Registrado Por</label>
            <Input value={usuarioNombre} disabled className="bg-slate-50" />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Link href="/salud/examenes/configuracion">
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </Link>
            <Button type="submit" disabled={submitting}>
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
