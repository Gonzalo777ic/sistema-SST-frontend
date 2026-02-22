'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { trabajadoresService, Trabajador } from '@/services/trabajadores.service';
import { saludService, ExamenMedico } from '@/services/salud.service';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Stethoscope, FileText, User } from 'lucide-react';
import { toast } from 'sonner';
import { UsuarioRol } from '@/types';

function getResultadoBadge(resultado: string) {
  const styles: Record<string, string> = {
    Apto: 'bg-green-100 text-green-800',
    'Apto con Restricciones': 'bg-amber-100 text-amber-800',
    'No Apto': 'bg-red-100 text-red-800',
    Pendiente: 'bg-yellow-100 text-yellow-800',
  };
  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${
        styles[resultado] || 'bg-gray-100 text-gray-800'
      }`}
    >
      {resultado}
    </span>
  );
}

export default function HistorialMedicoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [trabajador, setTrabajador] = useState<Trabajador | null>(null);
  const [examenes, setExamenes] = useState<ExamenMedico[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [docAbriendoId, setDocAbriendoId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setIsLoading(true);
    Promise.all([
      trabajadoresService.findOne(id),
      saludService.findAllExamenes(id),
    ])
      .then(([t, ex]) => {
        if (cancelled) return;
        setTrabajador(t);
        setExamenes(ex.sort((a, b) => {
          const da = new Date(a.fecha_programada || a.fecha_realizado || 0).getTime();
          const db = new Date(b.fecha_programada || b.fecha_realizado || 0).getTime();
          return db - da;
        }));
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error('Error al cargar', {
            description: err.response?.data?.message || err.message,
          });
          router.push('/trabajadores');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [id, router]);

  const handleVerCertificado = async (examenId: string) => {
    setDocAbriendoId(examenId);
    try {
      const { url } = await saludService.getSignedUrlResultadoExamen(examenId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : err instanceof Error
            ? err.message
            : 'Error al abrir';
      toast.error('No se pudo abrir el certificado', { description: String(msg) });
    } finally {
      setDocAbriendoId(null);
    }
  };

  if (isLoading || !trabajador) {
    return (
      <ProtectedRoute allowedRoles={[UsuarioRol.MEDICO, UsuarioRol.SUPER_ADMIN, UsuarioRol.ADMIN_EMPRESA, UsuarioRol.INGENIERO_SST]}>
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </ProtectedRoute>
    );
  }

  const nombreCompleto =
    [trabajador.apellido_paterno, trabajador.apellido_materno, trabajador.nombres]
      .filter(Boolean)
      .join(' ') || trabajador.nombre_completo;

  return (
    <ProtectedRoute allowedRoles={[UsuarioRol.MEDICO, UsuarioRol.SUPER_ADMIN, UsuarioRol.ADMIN_EMPRESA, UsuarioRol.INGENIERO_SST]}>
      <div className="p-6 space-y-6 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Link href="/trabajadores">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Regresar
            </Button>
          </Link>
          <Link href={`/trabajadores/${id}`}>
            <Button variant="outline" size="sm">
              <User className="w-4 h-4 mr-2" />
              Ver Ficha del Trabajador
            </Button>
          </Link>
        </div>

        {/* Resumen del perfil (solo lectura) */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Stethoscope className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Historial Médico Ocupacional</h1>
              <p className="text-slate-600 text-sm">Repositorio de exámenes médicos ocupacionales</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Nombre completo</p>
              <p className="font-medium text-slate-900">{nombreCompleto}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">DNI / Documento</p>
              <p className="font-medium text-slate-900">{trabajador.numero_documento || trabajador.documento_identidad}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Cargo / Puesto</p>
              <p className="font-medium text-slate-900">{trabajador.cargo || trabajador.puesto || '-'}</p>
            </div>
          </div>
        </div>

        {/* Timeline de EMOs */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Exámenes Médicos Ocupacionales</h2>
            <p className="text-sm text-slate-600 mt-1">
              {examenes.length} registro{examenes.length !== 1 ? 's' : ''} ordenado{examenes.length !== 1 ? 's' : ''} del más reciente al más antiguo
            </p>
          </div>
          {examenes.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Stethoscope className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No hay exámenes médicos registrados para este trabajador</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fecha Programación</TableHead>
                  <TableHead>Fecha Realizado</TableHead>
                  <TableHead>Centro Médico</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {examenes.map((ex) => (
                  <TableRow key={ex.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium">{ex.tipo_examen}</TableCell>
                    <TableCell>
                      {ex.fecha_programada
                        ? new Date(ex.fecha_programada).toLocaleDateString('es-PE')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {ex.fecha_realizado
                        ? new Date(ex.fecha_realizado).toLocaleDateString('es-PE')
                        : '-'}
                    </TableCell>
                    <TableCell>{ex.centro_medico}</TableCell>
                    <TableCell>{getResultadoBadge(ex.resultado)}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          ex.estado === 'Completado' || ex.estado === 'Entregado'
                            ? 'bg-green-100 text-green-800'
                            : ex.estado === 'Pruebas Cargadas'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {ex.estado}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/salud/examenes/${ex.id}`}>
                          <Button variant="outline" size="sm">
                            Evaluar / Ver
                          </Button>
                        </Link>
                        {(ex.resultado_archivo_url || ex.resultado_archivo_existe) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVerCertificado(ex.id)}
                            disabled={docAbriendoId === ex.id}
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            {docAbriendoId === ex.id ? 'Abriendo...' : 'Certificado'}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
