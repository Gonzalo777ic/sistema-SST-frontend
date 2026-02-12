'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { configEppService, IConfigEpp } from '@/services/config-epp.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings, HardHat, Save } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function ConfigEppPage() {
  const router = useRouter();
  const { usuario } = useAuth();
  const [config, setConfig] = useState<IConfigEpp | null>(null);
  const [formData, setFormData] = useState({
    umbral_vigencia_meses: 6,
    umbral_costo: 50,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const data = await configEppService.getConfig();
      setConfig(data);
      setFormData({
        umbral_vigencia_meses: data.umbral_vigencia_meses,
        umbral_costo: data.umbral_costo,
      });
    } catch (error: any) {
      toast.error('Error al cargar configuración', {
        description: error.response?.data?.message || 'No se pudo cargar',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await configEppService.updateConfig({
        umbral_vigencia_meses: formData.umbral_vigencia_meses,
        umbral_costo: formData.umbral_costo,
      });
      toast.success('Configuración guardada');
      loadConfig();
    } catch (error: any) {
      toast.error('Error al guardar', {
        description: error.response?.data?.message || 'No se pudo guardar',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!usuario) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/configuracion">
            <Button variant="ghost" size="sm" className="text-gray-600">
              Regresar
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Settings className="w-7 h-7 text-primary" />
            <h1 className="text-2xl font-bold text-gray-900">
              Configuración EPP
            </h1>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <HardHat className="w-5 h-5" />
          Equipos de Protección Personal
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Configure los umbrales para la recomendación de categoría criticidad (Core/Recurrente)
          al crear fichas EPP. Si vigencia y costo superan ambos umbrales → Core.
          Si ambos están por debajo → Recurrente. Si uno arriba y otro abajo → Indeterminado.
        </p>

        {isLoading ? (
          <div className="h-32 bg-gray-50 rounded animate-pulse" />
        ) : (
          <form onSubmit={handleSubmit} className="max-w-md space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Umbral de vigencia (meses)
              </label>
              <Input
                type="number"
                min={1}
                value={formData.umbral_vigencia_meses}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    umbral_vigencia_meses: parseInt(e.target.value) || 0,
                  })
                }
              />
              <p className="mt-1 text-xs text-gray-500">
                Si la vigencia del EPP (en meses) es mayor o igual a este valor, se considera &quot;arriba&quot; del umbral.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Umbral de costo (S/.)
              </label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={formData.umbral_costo}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    umbral_costo: parseFloat(e.target.value) || 0,
                  })
                }
              />
              <p className="mt-1 text-xs text-gray-500">
                Si el costo del EPP es mayor o igual a este valor, se considera &quot;arriba&quot; del umbral.
              </p>
            </div>
            <div className="pt-4">
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
