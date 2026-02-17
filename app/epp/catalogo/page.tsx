'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { eppService, IEPP } from '@/services/epp.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Package, Plus, Search, Star } from 'lucide-react';
import { EppImage } from '@/components/epp/EppImage';
import { toast } from 'sonner';
import Link from 'next/link';
import { UsuarioRol } from '@/types';

export default function CatalogoEppPage() {
  const router = useRouter();
  const { usuario, hasAnyRole } = useAuth();
  const [epps, setEpps] = useState<IEPP[]>([]);
  const [favoritosIds, setFavoritosIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  const esSoloEmpleado =
    hasAnyRole([UsuarioRol.EMPLEADO]) &&
    !hasAnyRole([UsuarioRol.SUPER_ADMIN, UsuarioRol.ADMIN_EMPRESA, UsuarioRol.INGENIERO_SST, UsuarioRol.SUPERVISOR]);

  useEffect(() => {
    if (!esSoloEmpleado || !usuario?.trabajadorId || !usuario?.empresaId) {
      router.replace('/epp');
      return;
    }
    Promise.all([
      eppService.findAllEpp(usuario.empresaId),
      eppService.getFavoritosEpp(usuario.trabajadorId),
    ]).then(([eppsData, favIds]) => {
      setEpps(eppsData);
      setFavoritosIds(favIds);
    }).catch(() => {
      toast.error('Error al cargar el catálogo');
    }).finally(() => {
      setIsLoading(false);
    });
  }, [esSoloEmpleado, usuario?.trabajadorId, usuario?.empresaId, router]);

  const handleToggleFavorito = async (eppId: string) => {
    try {
      const res = await eppService.toggleFavoritoEpp(eppId);
      setFavoritosIds((prev) =>
        res.es_favorito ? [...prev, eppId] : prev.filter((id) => id !== eppId),
      );
      toast.success(res.es_favorito ? 'Agregado a favoritos' : 'Quitado de favoritos');
    } catch {
      toast.error('Error al actualizar favoritos');
    }
  };

  const eppsFiltrados = useMemo(() => {
    if (!busqueda.trim()) return epps;
    const q = busqueda.toLowerCase().trim();
    return epps.filter(
      (e) =>
        e.nombre.toLowerCase().includes(q) ||
        e.tipo_proteccion?.toLowerCase().includes(q) ||
        e.descripcion?.toLowerCase().includes(q),
    );
  }, [epps, busqueda]);

  const eppsFavoritos = useMemo(
    () => eppsFiltrados.filter((e) => favoritosIds.includes(e.id)),
    [eppsFiltrados, favoritosIds],
  );
  const eppsResto = useMemo(
    () => eppsFiltrados.filter((e) => !favoritosIds.includes(e.id)),
    [eppsFiltrados, favoritosIds],
  );

  if (!esSoloEmpleado || !usuario?.trabajadorId) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/epp">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Regresar
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-7 h-7 text-primary" />
              Catálogo de EPP
            </h1>
            <p className="text-sm text-gray-600 mt-0.5">
              Explora los equipos disponibles y marca tus favoritos para agilizar tus solicitudes
            </p>
          </div>
        </div>
        <Link href="/epp/mis-solicitudes/nueva">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Solicitud
          </Button>
        </Link>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, tipo o descripción..."
          className="pl-10 max-w-md"
        />
      </div>

      {/* Contenido */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4">
              <Skeleton className="h-24 w-24 rounded mb-3" />
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      ) : eppsFiltrados.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {busqueda ? 'No se encontraron EPPs con ese criterio' : 'No hay EPPs disponibles para tu empresa'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Favoritos */}
          {eppsFavoritos.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                Mis favoritos ({eppsFavoritos.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {eppsFavoritos.map((epp) => (
                  <EppCard
                    key={epp.id}
                    epp={epp}
                    esFavorito={true}
                    onToggleFavorito={handleToggleFavorito}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Resto del catálogo */}
          <section>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
              <Package className="w-5 h-5 text-gray-600" />
              {eppsFavoritos.length > 0 ? 'Todos los EPPs' : 'Catálogo completo'} ({eppsResto.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {eppsResto.map((epp) => (
                <EppCard
                  key={epp.id}
                  epp={epp}
                  esFavorito={false}
                  onToggleFavorito={handleToggleFavorito}
                />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function EppCard({
  epp,
  esFavorito,
  onToggleFavorito,
}: {
  epp: IEPP;
  esFavorito: boolean;
  onToggleFavorito: (eppId: string) => void;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-200 hover:shadow-md transition-all flex flex-col">
      <div className="flex gap-3">
        <EppImage
          src={epp.imagen_url}
          alt={epp.nombre}
          className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
          placeholderClassName="bg-gray-100"
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 line-clamp-2">{epp.nombre}</h3>
          <p className="text-sm text-gray-600 mt-0.5">{epp.tipo_proteccion}</p>
          {epp.vigencia && (
            <p className="text-xs text-gray-500 mt-1">Vigencia: {epp.vigencia}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onToggleFavorito(epp.id)}
          className="p-2 rounded-lg hover:bg-amber-50 transition-colors self-start"
          title={esFavorito ? 'Quitar de favoritos' : 'Agregar a favoritos'}
        >
          <Star
            className={`w-6 h-6 ${
              esFavorito ? 'fill-amber-400 text-amber-500' : 'text-gray-400 hover:text-amber-400'
            }`}
          />
        </button>
      </div>
      {epp.descripcion && (
        <p className="text-xs text-gray-500 mt-3 line-clamp-2">{epp.descripcion}</p>
      )}
    </div>
  );
}
