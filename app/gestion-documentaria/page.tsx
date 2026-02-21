'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  contratistasService,
  Contratista,
  DocumentoContratista,
  EstadoDocumento,
  TipoDocumentoContratista,
} from '@/services/contratistas.service';
import {
  documentosSstService,
  DocumentoSST,
  CategoriaDocumento,
} from '@/services/documentos-sst.service';
import { empresasService, Empresa } from '@/services/empresas.service';
import { usuariosService } from '@/services/usuarios.service';
import { estructuraService, EstructuraItem } from '@/services/estructura.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText,
  ChevronDown,
  ChevronUp,
  Package,
  Eye,
  Download,
  Plus,
  BarChart3,
  Share2,
  Settings,
  FolderOpen,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { Usuario } from '@/types';

function getUsuarioDisplayName(u: Usuario & { trabajador?: { nombreCompleto?: string }; email?: string }): string {
  return (
    [u.nombres, u.apellido_paterno, u.apellido_materno].filter(Boolean).join(' ') ||
    u.trabajador?.nombreCompleto ||
    u.email ||
    u.dni ||
    u.id
  );
}

// Estados de flujo del requerimiento (Leyenda)
export type EstadoFlujoRequerimiento =
  | 'PENDIENTE'
  | 'ATRASADO'
  | 'POR_APROBAR'
  | 'APROBADO'
  | 'OBSERVADO';

// Tipo unificado para la grilla de requerimientos
type CategoriaRequerimiento = 'Personal' | 'Operativa' | 'Legal';

interface RequerimientoUnificado {
  id: string;
  tipo: string;
  nombre: string;
  sujeto: string;
  sujetoTipo: 'Empresa' | 'Contratista' | 'Trabajador';
  categoria: CategoriaRequerimiento;
  fechaVencimiento: string | null;
  diasRestantes: number | null;
  estadoVisual: 'vigente' | 'por_vencer' | 'caducado' | 'sin_vencimiento';
  estadoFlujo: EstadoFlujoRequerimiento | null;
  archivoUrl: string;
  origen: 'contratista' | 'documento_sst';
  empresaId: string;
  version: string;
  responsableCarga: string | null;
  responsableAprobacion: string | null;
  sede: string | null;
  sedeId: string | null;
  proceso: string | null;
  subproceso: string | null;
  contratistaId?: string;
  documentoId?: string;
}

// Mapeo de tipo documento a categoría
const tipoToCategoria: Record<string, CategoriaRequerimiento> = {
  [TipoDocumentoContratista.SCTR]: 'Legal',
  [TipoDocumentoContratista.Poliza]: 'Legal',
  [TipoDocumentoContratista.RUC]: 'Legal',
  [TipoDocumentoContratista.PlanSST]: 'Operativa',
  [TipoDocumentoContratista.ISO]: 'Operativa',
  [TipoDocumentoContratista.Otro]: 'Operativa',
};

const categoriaDocumentoSST: Record<CategoriaDocumento, CategoriaRequerimiento> = {
  [CategoriaDocumento.Politicas]: 'Legal',
  [CategoriaDocumento.Reglamentos]: 'Legal',
  [CategoriaDocumento.Procedimientos]: 'Operativa',
  [CategoriaDocumento.Manuales]: 'Operativa',
  [CategoriaDocumento.Matrices]: 'Operativa',
  [CategoriaDocumento.Planes]: 'Operativa',
  [CategoriaDocumento.Estandares]: 'Operativa',
};

function calcularEstadoVisual(
  fechaVencimiento: string | null,
  estadoDoc?: EstadoDocumento
): 'vigente' | 'por_vencer' | 'caducado' | 'sin_vencimiento' {
  if (!fechaVencimiento) return 'sin_vencimiento';
  if (estadoDoc === EstadoDocumento.Vencido) return 'caducado';
  if (estadoDoc === EstadoDocumento.PorVencer) return 'por_vencer';
  if (estadoDoc === EstadoDocumento.Vigente) return 'vigente';

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vencimiento = new Date(fechaVencimiento);
  vencimiento.setHours(0, 0, 0, 0);
  const diasRestantes = Math.ceil(
    (vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diasRestantes < 0) return 'caducado';
  if (diasRestantes <= 30) return 'por_vencer';
  return 'vigente';
}

function calcularDiasRestantes(fechaVencimiento: string | null): number | null {
  if (!fechaVencimiento) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vencimiento = new Date(fechaVencimiento);
  vencimiento.setHours(0, 0, 0, 0);
  return Math.ceil(
    (vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
  );
}

export default function GestionDocumentariaPage() {
  const { usuario } = useAuth();
  const router = useRouter();
  const [contratistas, setContratistas] = useState<Contratista[]>([]);
  const [documentosSst, setDocumentosSst] = useState<DocumentoSST[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [sedes, setSedes] = useState<EstructuraItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(true);
  const [isModalNuevoOpen, setIsModalNuevoOpen] = useState(false);

  // Filtros
  const [filtroResponsableCarga, setFiltroResponsableCarga] = useState('');
  const [filtroResponsableAprobacion, setFiltroResponsableAprobacion] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoFlujoRequerimiento | ''>('');
  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [filtroVigencia, setFiltroVigencia] = useState('');
  const [filtroMostrarUltimaVersion, setFiltroMostrarUltimaVersion] = useState(false);
  const [filtroSede, setFiltroSede] = useState('');
  const [filtroProceso, setFiltroProceso] = useState('');
  const [filtroSubproceso, setFiltroSubproceso] = useState('');
  const [filtroDocumento, setFiltroDocumento] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaRequerimiento | ''>('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroSujeto, setFiltroSujeto] = useState<'todos' | 'empresa' | 'contratista'>('todos');

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const empresaId = usuario?.empresaId;

      const [
        contratistasData,
        documentosData,
        empresasData,
        usuariosData,
        sedesData,
      ] = await Promise.all([
        contratistasService.findAll(empresaId ?? undefined).catch(() => []),
        documentosSstService.findAll(empresaId ?? undefined, true).catch(() => []),
        empresasService.findAll().catch(() => []),
        usuariosService.findAll().catch(() => []),
        empresaId ? estructuraService.findSedes(empresaId).catch(() => []) : Promise.resolve([]),
      ]);

      setContratistas(contratistasData);
      setDocumentosSst(documentosData);
      setEmpresas(empresasData);
      setUsuarios(usuariosData);
      setSedes(sedesData);
    } catch (error: any) {
      toast.error('Error al cargar datos', {
        description: error.response?.data?.message || 'No se pudieron cargar los requerimientos',
      });
    } finally {
      setIsLoading(false);
    }
  }, [usuario?.empresaId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Mapeo estado documento contratista -> estado flujo (aproximado hasta tener backend)
  const mapEstadoFlujo = (
    estadoDoc?: EstadoDocumento,
    diasRestantes?: number | null
  ): EstadoFlujoRequerimiento | null => {
    if (estadoDoc === EstadoDocumento.Pendiente) return 'PENDIENTE';
    if (estadoDoc === EstadoDocumento.Vencido || (diasRestantes !== null && diasRestantes < 0))
      return 'ATRASADO';
    if (estadoDoc === EstadoDocumento.PorVencer) return 'POR_APROBAR';
    if (estadoDoc === EstadoDocumento.Vigente) return 'APROBADO';
    return null;
  };

  // Unificar datos en requerimientos
  const requerimientos: RequerimientoUnificado[] = useMemo(() => {
    const items: RequerimientoUnificado[] = [];

    // Documentos de contratistas
    contratistas.forEach((c) => {
      c.documentos?.forEach((doc: DocumentoContratista) => {
        const fechaVenc = doc.fecha_vencimiento;
        const diasRest = calcularDiasRestantes(fechaVenc);
        const estado = calcularEstadoVisual(fechaVenc, doc.estado_doc);
        items.push({
          id: doc.id,
          tipo: doc.tipo_documento,
          nombre: doc.tipo_documento,
          sujeto: c.razon_social,
          sujetoTipo: 'Contratista',
          categoria: tipoToCategoria[doc.tipo_documento] || 'Operativa',
          fechaVencimiento: fechaVenc,
          diasRestantes: diasRest,
          estadoVisual: estado,
          estadoFlujo: mapEstadoFlujo(doc.estado_doc, diasRest),
          archivoUrl: doc.archivo_url,
          origen: 'contratista',
          empresaId: c.empresa_id,
          version: '1',
          responsableCarga: null,
          responsableAprobacion: null,
          sede: null,
          sedeId: null,
          proceso: null,
          subproceso: null,
          contratistaId: c.id,
        });
      });
    });

    // Documentos SST (Empresa)
    documentosSst.forEach((doc) => {
      const empresaDoc = empresas.find((e) => e.id === doc.empresa_id);
      items.push({
        id: doc.id,
        tipo: doc.categoria,
        nombre: doc.titulo,
        sujeto: empresaDoc?.nombre || 'Empresa',
        sujetoTipo: 'Empresa',
        categoria: categoriaDocumentoSST[doc.categoria] || 'Operativa',
        fechaVencimiento: null,
        diasRestantes: null,
        estadoVisual: 'sin_vencimiento',
        estadoFlujo: 'APROBADO', // Documentos SST activos se consideran aprobados
        archivoUrl: doc.archivo_url,
        origen: 'documento_sst',
        empresaId: doc.empresa_id,
        version: doc.version,
        responsableCarga: doc.subido_por || null,
        responsableAprobacion: null,
        sede: null,
        proceso: null,
        subproceso: null,
        documentoId: doc.id,
      });
    });

    return items;
  }, [contratistas, documentosSst, empresas]);

  // Aplicar filtros
  const requerimientosFiltrados = useMemo(() => {
    let result = requerimientos.filter((r) => {
      const matchResponsableCarga =
        !filtroResponsableCarga || r.responsableCarga === filtroResponsableCarga;
      const matchResponsableAprobacion =
        !filtroResponsableAprobacion || r.responsableAprobacion === filtroResponsableAprobacion;
      const matchEstado = !filtroEstado || r.estadoFlujo === filtroEstado;
      const matchEmpresa = !filtroEmpresa || r.empresaId === filtroEmpresa;
      const matchVigencia =
        !filtroVigencia ||
        (filtroVigencia === 'vigente' && r.estadoVisual === 'vigente') ||
        (filtroVigencia === 'por_vencer' && r.estadoVisual === 'por_vencer') ||
        (filtroVigencia === 'caducado' && r.estadoVisual === 'caducado');
      const matchSede = !filtroSede || r.sedeId === filtroSede;
      const matchProceso =
        !filtroProceso || (r.proceso?.toLowerCase().includes(filtroProceso.toLowerCase()) ?? false);
      const matchSubproceso =
        !filtroSubproceso ||
        (r.subproceso?.toLowerCase().includes(filtroSubproceso.toLowerCase()) ?? false);
      const matchDocumento =
        !filtroDocumento || r.nombre.toLowerCase().includes(filtroDocumento.toLowerCase());
      const matchCategoria = !filtroCategoria || r.categoria === filtroCategoria;
      const matchTipo = !filtroTipo || r.tipo === filtroTipo;
      const matchSujeto =
        filtroSujeto === 'todos' ||
        (filtroSujeto === 'empresa' && r.sujetoTipo === 'Empresa') ||
        (filtroSujeto === 'contratista' && r.sujetoTipo === 'Contratista');

      return (
        matchResponsableCarga &&
        matchResponsableAprobacion &&
        matchEstado &&
        matchEmpresa &&
        matchVigencia &&
        matchSede &&
        matchProceso &&
        matchSubproceso &&
        matchDocumento &&
        matchCategoria &&
        matchTipo &&
        matchSujeto
      );
    });

    // Mostrar solo última versión de cada documento
    if (filtroMostrarUltimaVersion) {
      const byKey = new Map<string, RequerimientoUnificado>();
      result.forEach((r) => {
        const key = `${r.nombre}-${r.sujeto}-${r.tipo}`;
        const existing = byKey.get(key);
        if (!existing || (r.version > existing.version)) {
          byKey.set(key, r);
        }
      });
      result = Array.from(byKey.values());
    }

    return result;
  }, [
    requerimientos,
    filtroResponsableCarga,
    filtroResponsableAprobacion,
    filtroEstado,
    filtroEmpresa,
    filtroVigencia,
    filtroMostrarUltimaVersion,
    filtroSede,
    filtroProceso,
    filtroSubproceso,
    filtroDocumento,
    filtroCategoria,
    filtroTipo,
    filtroSujeto,
  ]);

  const handleVerPdf = (url: string) => {
    if (url) window.open(url, '_blank');
    else toast.error('No hay archivo disponible');
  };

  const handleDescargar = (url: string, nombre: string) => {
    if (url) {
      window.open(url, '_blank');
      toast.success('Descarga iniciada', { description: nombre });
    } else toast.error('No hay archivo disponible');
  };

  const EstadoCirculo = ({ estado }: { estado: RequerimientoUnificado['estadoVisual'] }) => {
    const config = {
      vigente: { color: 'bg-green-500', title: 'Vigente' },
      por_vencer: { color: 'bg-amber-500', title: 'Por vencer' },
      caducado: { color: 'bg-red-500', title: 'Caducado' },
      sin_vencimiento: { color: 'bg-slate-400', title: 'Sin vencimiento' },
    };
    const { color, title } = config[estado];
    return (
      <span
        className={`inline-block w-3 h-3 rounded-full ${color}`}
        title={title}
        aria-label={title}
      />
    );
  };

  const tiposUnicos = useMemo(() => {
    const set = new Set(requerimientos.map((r) => r.tipo));
    return Array.from(set).sort();
  }, [requerimientos]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <FolderOpen className="w-8 h-8 text-primary" />
          Gestión Documentaria
        </h1>
        <p className="text-slate-600 mt-1">
          Validador de cumplimiento: vigencia y categoría legal de documentos
        </p>
      </div>

      {/* Filtros Inteligentes */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors rounded-t-lg"
        >
          <span className="font-medium text-slate-700">
            {showFilters ? '▼' : '▶'} Filtros de búsqueda
          </span>
          {showFilters ? (
            <ChevronUp className="w-5 h-5 text-slate-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-500" />
          )}
        </button>

        {showFilters && (
          <div className="p-4 border-t border-slate-200 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Responsable de carga
                </label>
                <Select
                  value={filtroResponsableCarga}
                  onChange={(e) => setFiltroResponsableCarga(e.target.value)}
                >
                  <option value="">Todos</option>
                  {usuarios.map((u) => {
                    const display = getUsuarioDisplayName(u);
                    return (
                      <option key={u.id} value={display}>
                        {display}
                      </option>
                    );
                  })}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Responsable de aprobación
                </label>
                <Select
                  value={filtroResponsableAprobacion}
                  onChange={(e) => setFiltroResponsableAprobacion(e.target.value)}
                >
                  <option value="">Todos</option>
                  {usuarios.map((u) => {
                    const display = getUsuarioDisplayName(u);
                    return (
                      <option key={u.id} value={display}>
                        {display}
                      </option>
                    );
                  })}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Estado
                </label>
                <Select
                  value={filtroEstado}
                  onChange={(e) =>
                    setFiltroEstado(e.target.value as EstadoFlujoRequerimiento | '')
                  }
                >
                  <option value="">Todos</option>
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="ATRASADO">ATRASADO</option>
                  <option value="POR_APROBAR">POR APROBAR</option>
                  <option value="APROBADO">APROBADO</option>
                  <option value="OBSERVADO">OBSERVADO</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Razón social (empresa)
                </label>
                <Select
                  value={filtroEmpresa}
                  onChange={(e) => setFiltroEmpresa(e.target.value)}
                >
                  <option value="">Todas</option>
                  {empresas.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Vigencia
                </label>
                <Select
                  value={filtroVigencia}
                  onChange={(e) => setFiltroVigencia(e.target.value)}
                >
                  <option value="">Todas</option>
                  <option value="vigente">Vigente</option>
                  <option value="por_vencer">Por vencer</option>
                  <option value="caducado">Caducado</option>
                </Select>
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filtroMostrarUltimaVersion}
                    onChange={(e) => setFiltroMostrarUltimaVersion(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    Mostrar la última versión de cada documento
                  </span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Sede
                </label>
                <Select value={filtroSede} onChange={(e) => setFiltroSede(e.target.value)}>
                  <option value="">Todas</option>
                  {sedes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Proceso
                </label>
                <Input
                  value={filtroProceso}
                  onChange={(e) => setFiltroProceso(e.target.value)}
                  placeholder="Filtrar por proceso"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Subproceso
                </label>
                <Input
                  value={filtroSubproceso}
                  onChange={(e) => setFiltroSubproceso(e.target.value)}
                  placeholder="Filtrar por subproceso"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Documento
                </label>
                <Input
                  value={filtroDocumento}
                  onChange={(e) => setFiltroDocumento(e.target.value)}
                  placeholder="Filtrar por documento"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Categoría
                </label>
                <Select
                  value={filtroCategoria}
                  onChange={(e) =>
                    setFiltroCategoria(e.target.value as CategoriaRequerimiento | '')
                  }
                >
                  <option value="">Todas</option>
                  <option value="Personal">Personal</option>
                  <option value="Operativa">Operativa</option>
                  <option value="Legal">Legal</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tipo de documento
                </label>
                <Select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                  <option value="">Todos</option>
                  {tiposUnicos.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tipo de entidad
                </label>
                <Select
                  value={filtroSujeto}
                  onChange={(e) =>
                    setFiltroSujeto(e.target.value as 'todos' | 'empresa' | 'contratista')
                  }
                >
                  <option value="todos">Todos</option>
                  <option value="empresa">Empresa</option>
                  <option value="contratista">Contratista</option>
                </Select>
              </div>
            </div>
            {/* Leyenda de Estados */}
            <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-200">
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <Info className="w-4 h-4" />
                Leyenda de Estados:
              </span>
              <span className="text-xs text-slate-600">
                <strong>PENDIENTE</strong> — Documento cargado sin revisar
              </span>
              <span className="text-xs text-slate-600">
                <strong>ATRASADO</strong> — No fue atendido a tiempo
              </span>
              <span className="text-xs text-slate-600">
                <strong>POR APROBAR</strong> — En validación
              </span>
              <span className="text-xs text-slate-600">
                <strong>APROBADO</strong> — Validado para uso oficial
              </span>
              <span className="text-xs text-slate-600">
                <strong>OBSERVADO</strong> — Con observaciones para corregir
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Botones de acción (debajo de filtros, antes de tabla) */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/dashboard/reportes/cumplimiento')}
        >
          <BarChart3 className="w-4 h-4 mr-1" />
          Ver Reporte
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/difusion')}
        >
          <Share2 className="w-4 h-4 mr-1" />
          Difusión de documentos
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/gestion-documentaria/maestro-documentos')}
        >
          <Settings className="w-4 h-4 mr-1" />
          Configuración
        </Button>
        <Button
          size="sm"
          className="bg-primary hover:bg-primary/90 text-white"
          onClick={() => setIsModalNuevoOpen(true)}
        >
          <Plus className="w-4 h-4 mr-1" />
          Nuevo Requerimiento
        </Button>
      </div>

      {/* Grilla de Requerimientos */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Nro
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Documento
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Razón social
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Vigencia
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Versión
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Sede
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Proceso
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Subproceso
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(11)].map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : requerimientosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center">
                    <Package className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600">Sin Información</p>
                    <p className="text-sm text-slate-500 mt-1">
                      Los documentos de contratistas y documentos SST aparecerán aquí
                    </p>
                  </td>
                </tr>
              ) : (
                requerimientosFiltrados.map((req, index) => (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-900">
                      {index + 1}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <EstadoCirculo estado={req.estadoVisual} />
                        {req.estadoFlujo && (
                          <span className="text-xs text-slate-600">{req.estadoFlujo}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-900">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        {req.nombre}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-900">
                      {req.sujeto}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-900">
                      {req.diasRestantes !== null ? (
                        <span
                          className={
                            req.estadoVisual === 'caducado'
                              ? 'text-red-600 font-medium'
                              : req.estadoVisual === 'por_vencer'
                                ? 'text-amber-600 font-medium'
                                : ''
                          }
                        >
                          {req.diasRestantes < 0
                            ? `Vencido hace ${Math.abs(req.diasRestantes)} días`
                            : `${req.diasRestantes} días`}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-900">
                      {req.version || '—'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-900">
                      {req.sede || '—'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-900">
                      {req.proceso || '—'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-900">
                      {req.subproceso || '—'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded bg-slate-100 text-slate-700">
                        {req.categoria}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleVerPdf(req.archivoUrl)}
                          title="Ver PDF"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleDescargar(req.archivoUrl, req.nombre)}
                          title="Descargar"
                        >
                          <Download className="w-4 h-4" />
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

      {/* Modal Nuevo Requerimiento (Sidebar de Carga / Buzón) */}
      <Modal
        isOpen={isModalNuevoOpen}
        onClose={() => setIsModalNuevoOpen(false)}
        title="Nuevo Requerimiento"
        size="lg"
      >
        <NuevoRequerimientoForm
          contratistas={contratistas}
          empresas={empresas}
          usuarioEmpresaId={usuario?.empresaId}
          onSuccess={() => {
            setIsModalNuevoOpen(false);
            loadData();
          }}
          onCancel={() => setIsModalNuevoOpen(false)}
        />
      </Modal>
    </div>
  );
}

// Formulario del modal Nuevo Requerimiento
function NuevoRequerimientoForm({
  contratistas,
  empresas,
  usuarioEmpresaId,
  onSuccess,
  onCancel,
}: {
  contratistas: Contratista[];
  empresas: Empresa[];
  usuarioEmpresaId?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [documento, setDocumento] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [fechaPlazo, setFechaPlazo] = useState('');
  const [comentario, setComentario] = useState('');
  const [sede, setSede] = useState('');
  const [tipoSujeto, setTipoSujeto] = useState<'empresa' | 'contratista'>('contratista');

  const tiposDocumento = [
    TipoDocumentoContratista.SCTR,
    TipoDocumentoContratista.Poliza,
    TipoDocumentoContratista.PlanSST,
    TipoDocumentoContratista.ISO,
    TipoDocumentoContratista.RUC,
    TipoDocumentoContratista.Otro,
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.info(
      'La carga de documentos se realiza desde el módulo de Contratistas. Para agregar un documento a un contratista existente, acceda a la gestión de contratistas.',
      { duration: 5000 }
    );
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <p>
          Seleccione el tipo de requerimiento, el sujeto (Empresa o Contratista) y la fecha de
          vencimiento. El archivo PDF se puede cargar desde el módulo de gestión de contratistas.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Documento <span className="text-red-500">*</span>
        </label>
        <Select
          value={documento}
          onChange={(e) => setDocumento(e.target.value)}
          required
        >
          <option value="">Seleccione</option>
          {tiposDocumento.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Tipo de sujeto
        </label>
        <Select
          value={tipoSujeto}
          onChange={(e) => setTipoSujeto(e.target.value as 'empresa' | 'contratista')}
        >
          <option value="contratista">Contratista</option>
          <option value="empresa">Empresa</option>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Razón social <span className="text-red-500">*</span>
        </label>
        <Select
          value={razonSocial}
          onChange={(e) => setRazonSocial(e.target.value)}
          required
        >
          <option value="">Seleccione</option>
          {tipoSujeto === 'contratista' ? (
            contratistas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.razon_social}
              </option>
            ))
          ) : (
            empresas
              .filter((e) => e.id === usuarioEmpresaId)
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))
          )}
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Fecha de plazo <span className="text-red-500">*</span>
        </label>
        <Input
          type="date"
          value={fechaPlazo}
          onChange={(e) => setFechaPlazo(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Comentario</label>
        <textarea
          className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
          rows={3}
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Comentario"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Sede</label>
        <Select value={sede} onChange={(e) => setSede(e.target.value)}>
          <option value="">Seleccione</option>
        </Select>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-primary hover:bg-primary/90 text-white">
          Crear
        </Button>
      </div>
    </form>
  );
}
