'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { saludService, ExamenMedico } from '@/services/salud.service';
import { CalendarDays } from 'lucide-react';
import { UsuarioRol } from '@/types';
import Link from 'next/link';
import { Eye } from 'lucide-react';

export default function CitasPage() {
  const { usuario } = useAuth();
  const [examenes, setExamenes] = useState<ExamenMedico[]>([]);
  const [loading, setLoading] = useState(true);

  const centroMedicoId =
    usuario?.centroMedicoId ??
    usuario?.participacionesCentroMedico?.[0]?.centroMedicoId ??
    null;

  useEffect(() => {
    if (!centroMedicoId) {
      setExamenes([]);
      setLoading(false);
      return;
    }
    saludService
      .findAllExamenes(undefined, centroMedicoId)
      .then(setExamenes)
      .catch(() => setExamenes([]))
      .finally(() => setLoading(false));
  }, [centroMedicoId]);

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-PE', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const estadoBadgeClass: Record<string, string> = {
    Programado: 'bg-blue-100 text-blue-800',
    'Pruebas Cargadas': 'bg-amber-100 text-amber-800',
    Completado: 'bg-green-100 text-green-800',
    Entregado: 'bg-emerald-100 text-emerald-800',
    Reprogramado: 'bg-slate-100 text-slate-700',
    Cancelado: 'bg-red-100 text-red-800',
    'Por Vencer': 'bg-yellow-100 text-yellow-800',
    PorVencer: 'bg-yellow-100 text-yellow-800',
    Vencido: 'bg-red-100 text-red-800',
  };

  const resultadoBadgeClass: Record<string, string> = {
    Apto: 'bg-green-100 text-green-800',
    'Apto con Restricciones': 'bg-amber-100 text-amber-800',
    'No Apto': 'bg-red-100 text-red-800',
    Pendiente: 'bg-yellow-100 text-yellow-800',
  };

  if (!usuario?.roles?.includes(UsuarioRol.CENTRO_MEDICO)) {
    return (
      <div className="p-6">
        <p className="text-slate-600">No tiene permisos para acceder a esta página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <CalendarDays className="w-7 h-7 text-primary" />
          Citas Programadas
        </h1>
        <p className="text-slate-600 mt-1">
          Exámenes médicos ocupacionales (EMO) programados para su centro médico
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Cargando...</div>
        ) : examenes.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No hay exámenes programados para su centro médico.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Hora
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Trabajador
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Documento
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Tipo Examen
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Resultado
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {examenes.map((examen) => (
                  <tr
                    key={examen.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-slate-900">
                      {formatFecha(examen.fecha_programada)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {examen.hora_programacion || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      {examen.trabajador_nombre || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {examen.trabajador_documento || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {examen.tipo_examen || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          resultadoBadgeClass[examen.resultado] ?? 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {examen.resultado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          estadoBadgeClass[examen.estado] ?? 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {examen.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/salud/examenes/${examen.id}`}
                        className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
