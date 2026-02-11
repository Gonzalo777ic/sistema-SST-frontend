'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  eppService,
  CreateEppDto,
  TipoProteccionEPP,
  CategoriaEPP,
  VigenciaEPP,
} from '@/services/epp.service';
import { empresasService } from '@/services/empresas.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Save,
  Upload,
  Image as ImageIcon,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { UsuarioRol } from '@/types';

export default function NuevaFichaEPPPage() {
  const router = useRouter();
  const { usuario, empresasVinculadas, hasRole } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [empresas, setEmpresas] = useState<{ id: string; nombre: string }[]>([]);
  const [empresasLoading, setEmpresasLoading] = useState(false);
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);

  const isSuperAdmin = hasRole(UsuarioRol.SUPER_ADMIN);

  const [formData, setFormData] = useState({
    nombre: '',
    tipo_proteccion: TipoProteccionEPP.Otros,
    categoria: CategoriaEPP.EPP,
    vigencia: '' as VigenciaEPP | '',
    descripcion: '',
    imagen_url: '',
    adjunto_pdf_url: '',
    empresa_id: '' as string,
  });

  useEffect(() => {
    if (isSuperAdmin) {
      setEmpresasLoading(true);
      empresasService
        .findAll()
        .then((data) => setEmpresas(data.map((e) => ({ id: e.id, nombre: e.nombre }))))
        .catch(() => toast.error('Error al cargar empresas'))
        .finally(() => setEmpresasLoading(false));
    }
  }, [isSuperAdmin]);

  const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagenFile(file);
      // Crear preview local
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagenPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('El archivo debe ser un PDF');
        return;
      }
      setPdfFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    // SUPER_ADMIN: selecciona empresa del proyecto. Otros: usa empresa vinculada.
    const empresaId = isSuperAdmin
      ? formData.empresa_id
      : usuario?.empresaId || empresasVinculadas?.[0]?.id;
    if (!empresaId) {
      if (isSuperAdmin) {
        toast.error('Seleccione una empresa');
      } else {
        toast.error('No se encontró empresa vinculada', {
          description: 'Complete su perfil o contacte al administrador para vincular su cuenta a una empresa.',
        });
      }
      return;
    }

    try {
      setIsSaving(true);

      // Por ahora, si hay archivos, solo mostramos un mensaje
      // ya que el bucket aún no está implementado
      if (imagenFile) {
        toast.info('La subida de imágenes estará disponible cuando se implemente el bucket de almacenamiento');
        // Por ahora, usar la URL si está disponible
      }

      if (pdfFile) {
        toast.info('La subida de PDFs estará disponible cuando se implemente el bucket de almacenamiento');
        // Por ahora, usar la URL si está disponible
      }

      const payload: CreateEppDto = {
        nombre: formData.nombre,
        tipo_proteccion: formData.tipo_proteccion,
        categoria: formData.categoria,
        vigencia: formData.vigencia || undefined,
        descripcion: formData.descripcion || undefined,
        imagen_url: formData.imagen_url || undefined,
        adjunto_pdf_url: formData.adjunto_pdf_url || undefined,
        stock: 0,
        empresa_id: empresaId,
      };

      await eppService.createEpp(payload);
      toast.success('Ficha EPP creada correctamente');
      router.push('/epp/fichas');
    } catch (error: any) {
      toast.error('Error al crear ficha EPP', {
        description: error.response?.data?.message || 'No se pudo crear la ficha',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/epp/fichas">
            <Button variant="ghost" size="sm" className="text-gray-600">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Regresar
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Agregar Nueva Ficha EPP</h1>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-6">
          {/* Empresa: solo para SUPER_ADMIN (gestión a nivel proyecto) */}
          {isSuperAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Empresa <span className="text-red-500">*</span>
              </label>
              {empresasLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  value={formData.empresa_id}
                  onChange={(e) =>
                    setFormData({ ...formData, empresa_id: e.target.value })
                  }
                  required
                >
                  <option value="">Seleccione una empresa</option>
                  {empresas.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nombre}
                    </option>
                  ))}
                </Select>
              )}
              <p className="mt-1 text-xs text-gray-500">
                La gestión de EPPs es a nivel proyecto. Seleccione la empresa para esta ficha.
              </p>
            </div>
          )}

          {/* Fila 1: Tipo de protección y Categoría */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

          {/* Fila 2: Nombre */}
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

          {/* Fila 3: Vigencia */}
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

          {/* Fila 4: Descripción */}
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
              rows={4}
            />
          </div>

          {/* Fila 5: Foto del EPP */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Foto del EPP
            </label>
            <div className="space-y-4">
              {/* Opción 1: Subir archivo */}
              <div>
                <label className="block text-xs text-gray-600 mb-2">
                  Subir imagen
                </label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer">
                    <span className="inline-flex items-center px-4 py-2 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 text-sm font-medium text-gray-700">
                      <Upload className="w-4 h-4 mr-2" />
                      Seleccionar imagen
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImagenChange}
                      className="hidden"
                    />
                  </label>
                  {imagenFile && (
                    <span className="text-sm text-gray-600">
                      {imagenFile.name}
                    </span>
                  )}
                </div>
                {imagenPreview && (
                  <div className="mt-2">
                    <img
                      src={imagenPreview}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded border border-gray-200"
                    />
                  </div>
                )}
              </div>

              {/* Opción 2: URL */}
              <div>
                <label className="block text-xs text-gray-600 mb-2">
                  O ingresar URL de imagen
                </label>
                <Input
                  type="url"
                  value={formData.imagen_url}
                  onChange={(e) =>
                    setFormData({ ...formData, imagen_url: e.target.value })
                  }
                  placeholder="https://ejemplo.com/imagen.jpg"
                />
                {formData.imagen_url && (
                  <div className="mt-2">
                    <img
                      src={formData.imagen_url}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded border border-gray-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Fila 6: Adjunto PDF */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adjunto PDF (Ficha técnica)
            </label>
            <div className="space-y-4">
              {/* Opción 1: Subir archivo */}
              <div>
                <label className="block text-xs text-gray-600 mb-2">
                  Subir archivo PDF
                </label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer">
                    <span className="inline-flex items-center px-4 py-2 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 text-sm font-medium text-gray-700">
                      <FileText className="w-4 h-4 mr-2" />
                      Seleccionar PDF
                    </span>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handlePdfChange}
                      className="hidden"
                    />
                  </label>
                  {pdfFile && (
                    <span className="text-sm text-gray-600">
                      {pdfFile.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Opción 2: URL */}
              <div>
                <label className="block text-xs text-gray-600 mb-2">
                  O ingresar URL del PDF
                </label>
                <Input
                  type="url"
                  value={formData.adjunto_pdf_url}
                  onChange={(e) =>
                    setFormData({ ...formData, adjunto_pdf_url: e.target.value })
                  }
                  placeholder="https://ejemplo.com/ficha-tecnica.pdf"
                />
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
            <Link href="/epp/fichas">
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Guardando...' : 'Guardar Ficha'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
