'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  eppService,
  IEPP,
  TipoProteccionEPP,
  CategoriaEPP,
  VigenciaEPP,
  CreateEppDto,
  UpdateEppDto,
} from '@/services/epp.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Plus,
  Edit,
  FileDown,
  Package,
  Image as ImageIcon,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { UsuarioRol } from '@/types';

export default function FichasEPPPage() {
  const router = useRouter();
  const { usuario, hasAnyRole, hasRole } = useAuth();
  const [epps, setEpps] = useState<IEPP[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<TipoProteccionEPP | ''>('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEpp, setEditingEpp] = useState<IEPP | null>(null);

  const isSuperAdmin = hasRole(UsuarioRol.SUPER_ADMIN);
  const canCreate = hasAnyRole([
    UsuarioRol.SUPER_ADMIN,
    UsuarioRol.ADMIN_EMPRESA,
    UsuarioRol.INGENIERO_SST,
  ]);

  const canEdit = hasAnyRole([
    UsuarioRol.SUPER_ADMIN,
    UsuarioRol.ADMIN_EMPRESA,
    UsuarioRol.INGENIERO_SST,
  ]);

  // SUPER_ADMIN: carga todos los EPPs del proyecto. Otros: filtran por empresa vinculada.
  useEffect(() => {
    if (isSuperAdmin || usuario?.empresaId) {
      loadEpps();
    }
  }, [usuario?.empresaId, isSuperAdmin]);

  const loadEpps = async () => {
    try {
      setIsLoading(true);
      const empresaId = isSuperAdmin ? undefined : (usuario?.empresaId ?? undefined);
      const eppsData = await eppService.findAllEpp(empresaId);
      setEpps(eppsData);
    } catch (error: any) {
      toast.error('Error al cargar fichas EPP', {
        description: error.response?.data?.message || 'No se pudieron cargar las fichas',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadFicha = (epp: IEPP) => {
    // Por ahora solo muestra un mensaje, se puede implementar generación de PDF después
    toast.info('Descarga de ficha técnica próximamente disponible');
  };

  const filteredEpps = useMemo(() => {
    if (!filtroTipo) return epps;
    return epps.filter((epp) => epp.tipo_proteccion === filtroTipo);
  }, [epps, filtroTipo]);

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/epp">
            <Button variant="ghost" size="sm" className="text-gray-600">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Regresar
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Fichas de EPPs</h1>
        </div>

        {canCreate && (
          <Link href="/epp/fichas/nueva">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Agregar nuevo
            </Button>
          </Link>
        )}
      </div>

      {/* Filtro Superior */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Tipo de protección:
          </label>
          <Select
            value={filtroTipo}
            onChange={(e) =>
              setFiltroTipo(e.target.value as TipoProteccionEPP | '')
            }
            className="flex-1 max-w-xs"
          >
            <option value="">Todos los tipos</option>
            {Object.values(TipoProteccionEPP).map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Tabla de Datos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Tipo de protección
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Imagen
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Vigencia
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i}>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((j) => (
                        <td key={j} className="px-4 py-4">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ) : filteredEpps.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Sin Información</p>
                  </td>
                </tr>
              ) : (
                filteredEpps.map((epp) => (
                  <tr key={epp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {epp.id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {epp.tipo_proteccion}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        {epp.categoria}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 font-medium">
                      {epp.nombre}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate" title={epp.descripcion || ''}>
                        {epp.descripcion || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {epp.imagen_url ? (
                        <img
                          src={epp.imagen_url}
                          alt={epp.nombre}
                          className="w-16 h-16 object-cover rounded border border-gray-200"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {epp.vigencia || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingEpp(epp);
                              setShowEditModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadFicha(epp)}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          <FileDown className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Editar EPP (solo para edición) */}
      {editingEpp && (
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingEpp(null);
          }}
          title="Editar Ficha EPP"
          size="lg"
        >
          <EppFormModal
            epp={editingEpp}
            empresaId={editingEpp?.empresa_id || usuario?.empresaId || ''}
            onSuccess={() => {
              setShowEditModal(false);
              setEditingEpp(null);
              loadEpps();
            }}
            onCancel={() => {
              setShowEditModal(false);
              setEditingEpp(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

// Componente de Formulario para EPP
interface EppFormModalProps {
  epp: IEPP | null;
  empresaId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function EppFormModal({ epp, empresaId, onSuccess, onCancel }: EppFormModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImagen, setIsUploadingImagen] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [formData, setFormData] = useState({
    nombre: epp?.nombre || '',
    tipo_proteccion: (epp?.tipo_proteccion || TipoProteccionEPP.Otros) as TipoProteccionEPP,
    categoria: (epp?.categoria || CategoriaEPP.EPP) as CategoriaEPP,
    vigencia: (epp?.vigencia || '') as VigenciaEPP | '',
    descripcion: epp?.descripcion || '',
    imagen_url: epp?.imagen_url || '',
    adjunto_pdf_url: epp?.adjunto_pdf_url || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    try {
      setIsSaving(true);

      if (epp) {
        // Actualizar EPP existente
        const payload: UpdateEppDto = {
          nombre: formData.nombre,
          tipo_proteccion: formData.tipo_proteccion,
          categoria: formData.categoria,
          vigencia: formData.vigencia || undefined,
          descripcion: formData.descripcion || undefined,
          imagen_url: formData.imagen_url || undefined,
          adjunto_pdf_url: formData.adjunto_pdf_url || undefined,
        };

        await eppService.updateEpp(epp.id, payload);
        toast.success('Ficha EPP actualizada correctamente');
        onSuccess();
      } else {
        // Crear nuevo EPP
        const payload: CreateEppDto = {
          nombre: formData.nombre,
          tipo_proteccion: formData.tipo_proteccion,
          categoria: formData.categoria,
          vigencia: formData.vigencia || undefined,
          descripcion: formData.descripcion || undefined,
          imagen_url: formData.imagen_url || undefined,
          adjunto_pdf_url: formData.adjunto_pdf_url || undefined,
          empresa_id: empresaId,
        };

        await eppService.createEpp(payload);
        toast.success('Ficha EPP creada correctamente');
        onSuccess();
      }
    } catch (error: any) {
      toast.error('Error al guardar ficha EPP', {
        description: error.message || 'No se pudo guardar la ficha',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nombre <span className="text-red-500">*</span>
        </label>
        <Input
          value={formData.nombre}
          onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
          placeholder="Ej: Casco de seguridad clase A"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de protección <span className="text-red-500">*</span>
          </label>
          <Select
            value={formData.tipo_proteccion}
            onChange={(e) =>
              setFormData({
                ...formData,
                tipo_proteccion: e.target.value as TipoProteccionEPP,
              })
            }
            required
          >
            {Object.values(TipoProteccionEPP).map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Categoría <span className="text-red-500">*</span>
          </label>
          <Select
            value={formData.categoria}
            onChange={(e) =>
              setFormData({
                ...formData,
                categoria: e.target.value as CategoriaEPP,
              })
            }
            required
          >
            {Object.values(CategoriaEPP).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Vigencia
        </label>
        <Select
          value={formData.vigencia}
          onChange={(e) =>
            setFormData({
              ...formData,
              vigencia: e.target.value as VigenciaEPP | '',
            })
          }
        >
          <option value="">Seleccione una vigencia</option>
          {Object.values(VigenciaEPP).map((vig) => (
            <option key={vig} value={vig}>
              {vig}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descripción
        </label>
        <textarea
          value={formData.descripcion}
          onChange={(e) =>
            setFormData({ ...formData, descripcion: e.target.value })
          }
          placeholder="Descripción del equipo de protección..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Imagen del EPP
        </label>
        <p className="text-xs text-slate-500 mb-2">
          Suba una imagen o ingrese la URL manualmente
        </p>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <label className="cursor-pointer">
              <span className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-slate-300 bg-slate-50 hover:bg-slate-100 text-sm font-medium text-slate-700">
                <Upload className="w-4 h-4" />
                Subir imagen
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                className="hidden"
                disabled={isUploadingImagen || !empresaId}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !empresaId) return;
                  try {
                    setIsUploadingImagen(true);
                    const { url } = await eppService.uploadEppImagen(empresaId, file);
                    setFormData((prev) => ({ ...prev, imagen_url: url }));
                    toast.success('Imagen subida correctamente');
                  } catch (err: any) {
                    toast.error('Error al subir imagen', {
                      description: err.response?.data?.message || 'No se pudo subir la imagen',
                    });
                  } finally {
                    setIsUploadingImagen(false);
                    e.target.value = '';
                  }
                }}
              />
            </label>
          </div>
          <Input
            type="url"
            value={formData.imagen_url}
            onChange={(e) =>
              setFormData({ ...formData, imagen_url: e.target.value })
            }
            placeholder="https://ejemplo.com/imagen.jpg"
          />
          {formData.imagen_url && (
            <div className="flex items-center gap-2">
              <img
                src={formData.imagen_url}
                alt="Vista previa"
                className="h-16 object-contain rounded border bg-slate-50"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFormData({ ...formData, imagen_url: '' })}
              >
                Quitar
              </Button>
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Ficha técnica (PDF)
        </label>
        <p className="text-xs text-slate-500 mb-2">
          Suba un PDF o ingrese la URL manualmente
        </p>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <label className="cursor-pointer">
              <span className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-slate-300 bg-slate-50 hover:bg-slate-100 text-sm font-medium text-slate-700">
                <Upload className="w-4 h-4" />
                Subir PDF
              </span>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                disabled={isUploadingPdf || !empresaId}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !empresaId) return;
                  try {
                    setIsUploadingPdf(true);
                    const { url } = await eppService.uploadEppFichaPdf(empresaId, file);
                    setFormData((prev) => ({ ...prev, adjunto_pdf_url: url }));
                    toast.success('PDF subido correctamente');
                  } catch (err: any) {
                    toast.error('Error al subir PDF', {
                      description: err.response?.data?.message || 'No se pudo subir el PDF',
                    });
                  } finally {
                    setIsUploadingPdf(false);
                    e.target.value = '';
                  }
                }}
              />
            </label>
          </div>
          <Input
            type="url"
            value={formData.adjunto_pdf_url}
            onChange={(e) =>
              setFormData({ ...formData, adjunto_pdf_url: e.target.value })
            }
            placeholder="https://ejemplo.com/ficha-tecnica.pdf"
          />
          {formData.adjunto_pdf_url && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFormData({ ...formData, adjunto_pdf_url: '' })}
            >
              Quitar PDF
            </Button>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isSaving ? 'Guardando...' : epp ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </form>
  );
}
