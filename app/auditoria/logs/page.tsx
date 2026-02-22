'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { auditoriaService, LogAcceso } from '@/services/auditoria.service';
import { usuariosService } from '@/services/usuarios.service';
import { trabajadoresService } from '@/services/trabajadores.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { FileSearch, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { UsuarioRol } from '@/types';
import { Usuario } from '@/types';
import { Trabajador } from '@/services/trabajadores.service';

function formatFecha(fecha: string): string {
  try {
    const d = new Date(fecha);
    return d.toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return fecha;
  }
}

function downloadCSV(logs: LogAcceso[]) {
  const headers = ['Fecha y Hora', 'Usuario', 'Acción', 'Documento/Recurso', 'Trabajador', 'IP'];
  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = logs.map((l) =>
    [
      formatFecha(l.fechaHora),
      l.usuarioNombre,
      l.accion,
      l.recursoDescripcion,
      l.trabajadorNombre,
      l.ipAddress ?? '-',
    ].map(escape).join(',')
  );
  const csv = [headers.map(escape).join(','), ...rows].join('\r\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `auditoria-accesos-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function LogsAuditoriaPage() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const [logs, setLogs] = useState<LogAcceso[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);

  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [usuarioId, setUsuarioId] = useState('');
  const [trabajadorId, setTrabajadorId] = useState('');

  const loadLogs = useCallback(async () => {
    if (!hasRole(UsuarioRol.SUPER_ADMIN)) return;
    try {
      setIsLoading(true);
      const res = await auditoriaService.getLogs({
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaHasta || undefined,
        usuario_id: usuarioId || undefined,
        trabajador_id: trabajadorId || undefined,
        page,
        limit,
      });
      setLogs(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (error: any) {
      toast.error('Error al cargar logs', {
        description: error.response?.data?.message || 'No se pudieron cargar los registros',
      });
    } finally {
      setIsLoading(false);
    }
  }, [hasRole, fechaDesde, fechaHasta, usuarioId, trabajadorId, page, limit]);

  useEffect(() => {
    if (!hasRole(UsuarioRol.SUPER_ADMIN)) {
      router.push('/dashboard');
      return;
    }
    loadLogs();
  }, [hasRole, router, loadLogs]);

  useEffect(() => {
    if (hasRole(UsuarioRol.SUPER_ADMIN)) {
      usuariosService.findAll().then(setUsuarios).catch(() => {});
      trabajadoresService.findAll().then(setTrabajadores).catch(() => {});
    }
  }, [hasRole]);

  const handleExportar = async () => {
    try {
      setIsExporting(true);
      const data = await auditoriaService.exportarLogs({
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaHasta || undefined,
        usuario_id: usuarioId || undefined,
        trabajador_id: trabajadorId || undefined,
      });
      downloadCSV(data);
      toast.success('Exportación completada', {
        description: `Se exportaron ${data.length} registros`,
      });
    } catch (error: any) {
      toast.error('Error al exportar', {
        description: error.response?.data?.message || 'No se pudo exportar',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFiltrar = () => {
    setPage(1);
    loadLogs();
  };

  const nombreUsuario = (u: Usuario) =>
    [u.apellido_paterno, u.apellido_materno, u.nombres].filter(Boolean).join(' ') || u.dni || '-';

  return (
    <ProtectedRoute allowedRoles={[UsuarioRol.SUPER_ADMIN]}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Logs de Acceso</h1>
            <p className="text-slate-600 mt-1">
              Auditoría de visualizaciones de documentos médicos (URLs firmadas). Solo lectura.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleExportar}
            disabled={isExporting}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha desde</label>
              <Input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha hasta</label>
              <Input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
              <Select
                value={usuarioId}
                onChange={(e) => setUsuarioId(e.target.value)}
              >
                <option value="">Todos</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {nombreUsuario(u)} ({u.dni})
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Trabajador</label>
              <Select
                value={trabajadorId}
                onChange={(e) => setTrabajadorId(e.target.value)}
              >
                <option value="">Todos</option>
                {trabajadores.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre_completo} ({t.documento_identidad})
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleFiltrar}>Filtrar</Button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8">
              <Skeleton className="h-8 w-full mb-4" />
              <Skeleton className="h-8 w-full mb-4" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center py-16">
              <FileSearch className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">No hay registros de acceso</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha y Hora</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Acción</TableHead>
                      <TableHead>Documento / Recurso</TableHead>
                      <TableHead>Trabajador</TableHead>
                      <TableHead>IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">{formatFecha(log.fechaHora)}</TableCell>
                        <TableCell>{log.usuarioNombre}</TableCell>
                        <TableCell>{log.accion}</TableCell>
                        <TableCell>{log.recursoDescripcion}</TableCell>
                        <TableCell>{log.trabajadorNombre}</TableCell>
                        <TableCell className="font-mono text-xs">{log.ipAddress ?? '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                  <p className="text-sm text-slate-600">
                    Mostrando {(page - 1) * limit + 1} - {Math.min(page * limit, total)} de {total}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
