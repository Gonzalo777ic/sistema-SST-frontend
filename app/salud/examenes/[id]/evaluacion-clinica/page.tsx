'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { saludService, ExamenMedico, TipoExamen } from '@/services/salud.service';
import {
  getDepartamentos,
  getProvincias,
  getDistritos,
  UbigeoItem,
} from '@/lib/ubigeo';
import { Select } from '@/components/ui/select';

const TIPOS_EVALUACION: { value: TipoExamen; label: string }[] = [
  { value: 'PreOcupacional', label: 'Pre Ocupacional' },
  { value: 'Periodico', label: 'Periódica' },
  { value: 'Retiro', label: 'Retiro' },
  { value: 'Ingreso', label: 'Ingreso' },
  { value: 'Reingreso', label: 'Reingreso' },
  { value: 'PorExposicion', label: 'Por Exposición' },
  { value: 'Otros', label: 'Otros' },
];

export interface FichaAnexo02Data {
  nroFicha: string;
  fechaDia: string;
  fechaMes: string;
  fechaAnio: string;
  tipoEvaluacion: TipoExamen;
  lugarExamenDep: string;
  lugarExamenProv: string;
  lugarExamenDist: string;
  razonSocial: string;
  actividadEconomica: string;
  lugarTrabajo: string;
  lugarTrabajoMismoQueLegal: boolean;
  ubicacionDep: string;
  ubicacionProv: string;
  ubicacionDist: string;
  pais: string;
  puestoPostula: string;
}

function generarNroFicha(examenId: string): string {
  const anio = new Date().getFullYear();
  const shortId = examenId.slice(0, 8).toUpperCase();
  return `EMO-${shortId}-${anio}`;
}

export default function EvaluacionClinicaPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [examen, setExamen] = useState<ExamenMedico | null>(null);
  const [loading, setLoading] = useState(true);
  const [fichaData, setFichaData] = useState<FichaAnexo02Data | null>(null);

  const [departamentos, setDepartamentos] = useState<UbigeoItem[]>([]);
  const [provinciasLugar, setProvinciasLugar] = useState<UbigeoItem[]>([]);
  const [distritosLugar, setDistritosLugar] = useState<UbigeoItem[]>([]);

  useEffect(() => {
    if (!id) return;
    saludService
      .findOneExamen(id)
      .then((e) => {
        setExamen(e);
        const hoy = new Date();
        const inicial: FichaAnexo02Data = {
          nroFicha: generarNroFicha(e.id),
          fechaDia: String(hoy.getDate()).padStart(2, '0'),
          fechaMes: String(hoy.getMonth() + 1).padStart(2, '0'),
          fechaAnio: String(hoy.getFullYear()),
          tipoEvaluacion: e.tipo_examen,
          lugarExamenDep: '',
          lugarExamenProv: '',
          lugarExamenDist: '',
          razonSocial: e.empresa_nombre || '',
          actividadEconomica: e.empresa_actividad_economica || '',
          lugarTrabajo: e.empresa_direccion || '',
          lugarTrabajoMismoQueLegal: true,
          ubicacionDep: e.empresa_departamento || '',
          ubicacionProv: e.empresa_provincia || '',
          ubicacionDist: e.empresa_distrito || '',
          pais: e.empresa_pais || 'Perú',
          puestoPostula: e.trabajador_cargo || '',
        };
        setFichaData(inicial);
      })
      .catch((err) => {
        toast.error('Error al cargar el examen', {
          description: err.response?.data?.message || err.message,
        });
        router.push(`/salud/examenes/${id}`);
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  useEffect(() => {
    getDepartamentos().then(setDepartamentos);
  }, []);

  useEffect(() => {
    if (!fichaData?.lugarExamenDep) {
      setProvinciasLugar([]);
      setDistritosLugar([]);
      return;
    }
    const cod = departamentos.find((d) => d.nombre === fichaData.lugarExamenDep)?.codigo;
    if (cod) getProvincias(cod).then(setProvinciasLugar);
    else setProvinciasLugar([]);
  }, [fichaData?.lugarExamenDep, departamentos]);

  useEffect(() => {
    if (!fichaData?.lugarExamenProv || !fichaData?.lugarExamenDep) {
      setDistritosLugar([]);
      return;
    }
    const depCod = departamentos.find((d) => d.nombre === fichaData.lugarExamenDep)?.codigo;
    const provCod = provinciasLugar.find((p) => p.nombre === fichaData.lugarExamenProv)?.codigo;
    if (depCod && provCod) getDistritos(depCod, provCod).then(setDistritosLugar);
    else setDistritosLugar([]);
  }, [fichaData?.lugarExamenProv, fichaData?.lugarExamenDep, departamentos, provinciasLugar]);

  const updateFicha = (partial: Partial<FichaAnexo02Data>) => {
    setFichaData((prev) => (prev ? { ...prev, ...partial } : null));
  };

  const isPreOcupacional = fichaData?.tipoEvaluacion === 'PreOcupacional';

  if (loading || !examen || !fichaData) {
    return (
      <div className="p-6 w-full">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3" />
          <div className="h-64 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 w-full max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Generar Ficha Médica (Anexo 02 MINSA)
        </h1>
        <Link href={`/salud/examenes/${id}`}>
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver al EMO
          </Button>
        </Link>
      </div>

      {/* Cabecera Anexo 02 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        <div className="text-center mb-6">
          <p className="text-sm text-gray-600">Anexo N° 02</p>
          <h2 className="text-xl font-bold text-gray-900">Ficha Médico Ocupacional</h2>
        </div>

        {/* Nro Ficha y Fecha */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nº de Ficha Médica
            </label>
            <Input value={fichaData.nroFicha} readOnly className="bg-gray-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
            <div className="flex gap-2">
              <Input
                placeholder="Día"
                value={fichaData.fechaDia}
                onChange={(e) => updateFicha({ fechaDia: e.target.value })}
                className="w-16 text-center"
              />
              <Input
                placeholder="Mes"
                value={fichaData.fechaMes}
                onChange={(e) => updateFicha({ fechaMes: e.target.value })}
                className="w-16 text-center"
              />
              <Input
                placeholder="Año"
                value={fichaData.fechaAnio}
                onChange={(e) => updateFicha({ fechaAnio: e.target.value })}
                className="w-20 text-center"
              />
            </div>
          </div>
        </div>

        {/* Tipo de Evaluación */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Evaluación
          </label>
          <div className="flex flex-wrap gap-4">
            {TIPOS_EVALUACION.map((t) => (
              <label key={t.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tipo_eval"
                  checked={fichaData.tipoEvaluacion === t.value}
                  onChange={() => updateFicha({ tipoEvaluacion: t.value })}
                  className="text-blue-600"
                />
                <span className="text-sm">{t.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Lugar del Examen - Ubigeo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lugar del Examen
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              value={fichaData.lugarExamenDep}
              onChange={(e) => {
                updateFicha({
                  lugarExamenDep: e.target.value,
                  lugarExamenProv: '',
                  lugarExamenDist: '',
                });
              }}
            >
              <option value="">Departamento</option>
              {departamentos.map((d) => (
                <option key={d.codigo} value={d.nombre}>
                  {d.nombre}
                </option>
              ))}
            </Select>
            <Select
              value={fichaData.lugarExamenProv}
              onChange={(e) => {
                updateFicha({ lugarExamenProv: e.target.value, lugarExamenDist: '' });
              }}
              disabled={!fichaData.lugarExamenDep}
            >
              <option value="">Provincia</option>
              {provinciasLugar.map((p) => (
                <option key={p.codigo} value={p.nombre}>
                  {p.nombre}
                </option>
              ))}
            </Select>
            <Select
              value={fichaData.lugarExamenDist}
              onChange={(e) => updateFicha({ lugarExamenDist: e.target.value })}
              disabled={!fichaData.lugarExamenProv}
            >
              <option value="">Distrito</option>
              {distritosLugar.map((d) => (
                <option key={d.codigo} value={d.nombre}>
                  {d.nombre}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Sección I - Datos de la Empresa */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            I. DATOS DE LA EMPRESA (llenar con letra clara)
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Razón Social
              </label>
              <Input
                value={fichaData.razonSocial}
                readOnly
                className="bg-gray-50"
                placeholder="Precargado desde empresa"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Actividad Económica
              </label>
              <Input
                value={fichaData.actividadEconomica}
                readOnly
                className="bg-gray-50"
                placeholder="Precargado desde empresa"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <input
                  type="checkbox"
                  checked={fichaData.lugarTrabajoMismoQueLegal}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    if (checked) {
                      updateFicha({
                        lugarTrabajoMismoQueLegal: checked,
                        lugarTrabajo: examen.empresa_direccion || '',
                        ubicacionDep: examen.empresa_departamento || '',
                        ubicacionProv: examen.empresa_provincia || '',
                        ubicacionDist: examen.empresa_distrito || '',
                      });
                    } else {
                      updateFicha({ lugarTrabajoMismoQueLegal: checked });
                    }
                  }}
                  className="rounded text-blue-600"
                />
                ¿El lugar de trabajo es el mismo que la dirección legal?
              </label>
              <Input
                value={fichaData.lugarTrabajo}
                onChange={(e) => updateFicha({ lugarTrabajo: e.target.value })}
                disabled={fichaData.lugarTrabajoMismoQueLegal}
                placeholder="Lugar de trabajo (dirección o sede)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ubicación (Departamento / Provincia / Distrito)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  value={fichaData.ubicacionDep}
                  onChange={(e) => updateFicha({ ubicacionDep: e.target.value })}
                  disabled={fichaData.lugarTrabajoMismoQueLegal}
                  placeholder="Departamento"
                />
                <Input
                  value={fichaData.ubicacionProv}
                  onChange={(e) => updateFicha({ ubicacionProv: e.target.value })}
                  disabled={fichaData.lugarTrabajoMismoQueLegal}
                  placeholder="Provincia"
                />
                <Input
                  value={fichaData.ubicacionDist}
                  onChange={(e) => updateFicha({ ubicacionDist: e.target.value })}
                  disabled={fichaData.lugarTrabajoMismoQueLegal}
                  placeholder="Distrito"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Precargado desde empresa. Editable si el lugar de trabajo es diferente.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Puesto al que postula (solo pre ocupacional)
              </label>
              <Input
                value={fichaData.puestoPostula}
                onChange={(e) => updateFicha({ puestoPostula: e.target.value })}
                disabled={!isPreOcupacional}
                placeholder={
                  isPreOcupacional
                    ? 'Puesto al que postula el trabajador'
                    : 'Solo aplica para EMO Pre-Ocupacional'
                }
                className={!isPreOcupacional ? 'bg-gray-50' : ''}
              />
              <p className="mt-1 text-xs text-gray-500">
                {isPreOcupacional
                  ? 'Precargado desde el cargo del trabajador. Editable.'
                  : 'Precargado desde el cargo del trabajador. Bloqueado para otros tipos de EMO.'}
              </p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200 flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/salud/examenes/${id}`)}
          >
            Volver al detalle del examen
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700" disabled>
            Siguiente sección (en desarrollo)
          </Button>
        </div>
      </div>
    </div>
  );
}
