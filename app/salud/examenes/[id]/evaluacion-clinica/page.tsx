'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, User } from 'lucide-react';
import { toast } from 'sonner';
import { saludService, ExamenMedico, TipoExamen } from '@/services/salud.service';
import { trabajadoresService } from '@/services/trabajadores.service';
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

export interface FiliacionData {
  nombreCompleto: string;
  documentoIdentidad: string;
  fechaNacimiento: string;
  fechaDia: string;
  fechaMes: string;
  fechaAnio: string;
  edad: string;
  direccion: string;
  numeroInterior: string;
  urbanizacion: string;
  departamento: string;
  provincia: string;
  distrito: string;
  resideEnLugarTrabajo: boolean | null;
  tiempoResidenciaLugarTrabajo: string;
  seguroEssalud: boolean;
  seguroEps: boolean;
  seguroSctr: boolean;
  seguroOtro: string;
  email: string;
  telefono: string;
  estadoCivil: string;
  gradoInstruccion: string;
  nroHijosVivos: string;
  nroDependientes: string;
}

const ESTADO_CIVIL = ['Soltero', 'Casado', 'Conviviente', 'Divorciado', 'Viudo', 'Otro'];
const GRADO_INSTRUCCION = ['Sin Estudios', 'Primaria', 'Secundaria', 'Técnico', 'Superior', 'Superior Completa', 'Posgrado', 'Otro'];

function calcularEdad(fechaNac: string | null): string {
  if (!fechaNac) return '';
  const [y, m, d] = fechaNac.split('-').map(Number);
  const hoy = new Date();
  let edad = hoy.getFullYear() - y;
  if (hoy.getMonth() < m - 1 || (hoy.getMonth() === m - 1 && hoy.getDate() < d)) edad--;
  return String(edad);
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
  const [filiacionData, setFiliacionData] = useState<FiliacionData | null>(null);
  const [savingFiliacion, setSavingFiliacion] = useState(false);

  const [departamentos, setDepartamentos] = useState<UbigeoItem[]>([]);
  const [provinciasLugar, setProvinciasLugar] = useState<UbigeoItem[]>([]);
  const [distritosLugar, setDistritosLugar] = useState<UbigeoItem[]>([]);
  const [provinciasDomicilio, setProvinciasDomicilio] = useState<UbigeoItem[]>([]);
  const [distritosDomicilio, setDistritosDomicilio] = useState<UbigeoItem[]>([]);

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

        const fil = e.trabajador_filiacion;
        if (fil) {
          const [y = '', m = '', d = ''] = (fil.fecha_nacimiento || '').split('-');
          setFiliacionData({
            nombreCompleto: fil.nombre_completo || '',
            documentoIdentidad: fil.documento_identidad || '',
            fechaNacimiento: fil.fecha_nacimiento || '',
            fechaDia: d || '',
            fechaMes: m || '',
            fechaAnio: y || '',
            edad: calcularEdad(fil.fecha_nacimiento),
            direccion: fil.direccion || '',
            numeroInterior: fil.numero_interior || '',
            urbanizacion: fil.urbanizacion || '',
            departamento: fil.departamento || '',
            provincia: fil.provincia || '',
            distrito: fil.distrito || '',
            resideEnLugarTrabajo: fil.reside_en_lugar_trabajo ?? null,
            tiempoResidenciaLugarTrabajo: fil.tiempo_residencia_lugar_trabajo || '',
            seguroEssalud: fil.seguro_essalud ?? false,
            seguroEps: fil.seguro_eps ?? false,
            seguroSctr: fil.seguro_sctr ?? false,
            seguroOtro: fil.seguro_otro || '',
            email: fil.email_personal || '',
            telefono: fil.telefono || '',
            estadoCivil: fil.estado_civil || '',
            gradoInstruccion: fil.grado_instruccion || '',
            nroHijosVivos: fil.nro_hijos_vivos != null ? String(fil.nro_hijos_vivos) : '',
            nroDependientes: fil.nro_dependientes != null ? String(fil.nro_dependientes) : '',
          });
        } else {
          setFiliacionData(null);
        }
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

  useEffect(() => {
    if (!filiacionData?.departamento) {
      setProvinciasDomicilio([]);
      setDistritosDomicilio([]);
      return;
    }
    const cod = departamentos.find((d) => d.nombre === filiacionData.departamento)?.codigo;
    if (cod) getProvincias(cod).then(setProvinciasDomicilio);
    else setProvinciasDomicilio([]);
  }, [filiacionData?.departamento, departamentos]);

  useEffect(() => {
    if (!filiacionData?.provincia || !filiacionData?.departamento) {
      setDistritosDomicilio([]);
      return;
    }
    const depCod = departamentos.find((d) => d.nombre === filiacionData.departamento)?.codigo;
    const provCod = provinciasDomicilio.find((p) => p.nombre === filiacionData.provincia)?.codigo;
    if (depCod && provCod) getDistritos(depCod, provCod).then(setDistritosDomicilio);
    else setDistritosDomicilio([]);
  }, [filiacionData?.provincia, filiacionData?.departamento, departamentos, provinciasDomicilio]);

  const updateFicha = (partial: Partial<FichaAnexo02Data>) => {
    setFichaData((prev) => (prev ? { ...prev, ...partial } : null));
  };

  const updateFiliacion = (partial: Partial<FiliacionData>) => {
    setFiliacionData((prev) => {
      if (!prev) return null;
      const next = { ...prev, ...partial };
      if ('fechaDia' in partial || 'fechaMes' in partial || 'fechaAnio' in partial) {
        const d = `${next.fechaAnio}-${String(next.fechaMes).padStart(2, '0')}-${String(next.fechaDia).padStart(2, '0')}`;
        next.fechaNacimiento = d;
        next.edad = calcularEdad(d.length >= 10 ? d : null);
      }
      return next;
    });
  };

  const handleGuardarFiliacion = async () => {
    if (!examen?.trabajador_filiacion?.id || !filiacionData) return;
    setSavingFiliacion(true);
    try {
      const nroHijos = filiacionData.nroHijosVivos ? parseInt(filiacionData.nroHijosVivos, 10) : undefined;
      const nroDep = filiacionData.nroDependientes ? parseInt(filiacionData.nroDependientes, 10) : undefined;
      await trabajadoresService.update(examen.trabajador_filiacion.id, {
        telefono: filiacionData.telefono || undefined,
        email: filiacionData.email || undefined,
        direccion: filiacionData.direccion || undefined,
        numero_interior: filiacionData.numeroInterior || undefined,
        urbanizacion: filiacionData.urbanizacion || undefined,
        departamento: filiacionData.departamento || undefined,
        provincia: filiacionData.provincia || undefined,
        distrito: filiacionData.distrito || undefined,
        reside_en_lugar_trabajo: filiacionData.resideEnLugarTrabajo ?? undefined,
        tiempo_residencia_lugar_trabajo: filiacionData.tiempoResidenciaLugarTrabajo || undefined,
        estado_civil: filiacionData.estadoCivil || undefined,
        grado_instruccion: filiacionData.gradoInstruccion || undefined,
        nro_hijos_vivos: nroHijos,
        nro_dependientes: nroDep,
        seguro_essalud: filiacionData.seguroEssalud,
        seguro_eps: filiacionData.seguroEps,
        seguro_sctr: filiacionData.seguroSctr,
        seguro_otro: filiacionData.seguroOtro || undefined,
      });
      toast.success('Datos de filiación guardados en el perfil del trabajador');
      const actualizado = await saludService.findOneExamen(id);
      setExamen(actualizado);
      if (actualizado.trabajador_filiacion) {
        const fil = actualizado.trabajador_filiacion;
        setFiliacionData((prev) => prev ? {
          ...prev,
          nombreCompleto: fil.nombre_completo || prev.nombreCompleto,
          documentoIdentidad: fil.documento_identidad || prev.documentoIdentidad,
          fechaNacimiento: fil.fecha_nacimiento || prev.fechaNacimiento,
          direccion: fil.direccion || prev.direccion,
          numeroInterior: fil.numero_interior || prev.numeroInterior,
          urbanizacion: fil.urbanizacion || prev.urbanizacion,
          departamento: fil.departamento || prev.departamento,
          provincia: fil.provincia || prev.provincia,
          distrito: fil.distrito || prev.distrito,
          resideEnLugarTrabajo: fil.reside_en_lugar_trabajo ?? prev.resideEnLugarTrabajo,
          tiempoResidenciaLugarTrabajo: fil.tiempo_residencia_lugar_trabajo || prev.tiempoResidenciaLugarTrabajo,
          seguroEssalud: fil.seguro_essalud ?? prev.seguroEssalud,
          seguroEps: fil.seguro_eps ?? prev.seguroEps,
          seguroSctr: fil.seguro_sctr ?? prev.seguroSctr,
          seguroOtro: fil.seguro_otro || prev.seguroOtro,
          email: fil.email_personal || prev.email,
          telefono: fil.telefono || prev.telefono,
          estadoCivil: fil.estado_civil || prev.estadoCivil,
          gradoInstruccion: fil.grado_instruccion || prev.gradoInstruccion,
          nroHijosVivos: fil.nro_hijos_vivos != null ? String(fil.nro_hijos_vivos) : prev.nroHijosVivos,
          nroDependientes: fil.nro_dependientes != null ? String(fil.nro_dependientes) : prev.nroDependientes,
        } : null);
      }
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : err instanceof Error ? err.message : 'Error al guardar';
      toast.error('Error al guardar filiación', { description: String(msg) });
    } finally {
      setSavingFiliacion(false);
    }
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

        {/* Sección II - Filiación del Trabajador */}
        {filiacionData && (
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              II. FILIACIÓN DEL TRABAJADOR (llenar con letra clara o marque con una X lo solicitado)
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Foto */}
              <div className="lg:col-span-1 flex justify-center lg:justify-start">
                <div className="w-32 h-40 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                  {examen?.trabajador_filiacion?.foto_url ? (
                    <img
                      src={examen.trabajador_filiacion.foto_url}
                      alt="Foto trabajador"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="text-center text-gray-500 text-sm p-2">
                      <User className="w-12 h-12 mx-auto mb-1 opacity-50" />
                      Sin Foto
                    </div>
                  )}
                </div>
              </div>

              {/* Datos personales */}
              <div className="lg:col-span-2 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre y Apellidos</label>
                    <Input value={filiacionData.nombreCompleto} readOnly className="bg-gray-50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento</label>
                    <div className="flex gap-2">
                      <Input placeholder="Día" value={filiacionData.fechaDia} onChange={(e) => updateFiliacion({ fechaDia: e.target.value })} className="w-14 text-center" />
                      <Input placeholder="Mes" value={filiacionData.fechaMes} onChange={(e) => updateFiliacion({ fechaMes: e.target.value })} className="w-14 text-center" />
                      <Input placeholder="Año" value={filiacionData.fechaAnio} onChange={(e) => updateFiliacion({ fechaAnio: e.target.value })} className="w-16 text-center" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Edad (años)</label>
                    <Input value={filiacionData.edad} readOnly className="bg-gray-50 w-20" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Documento de Identidad (DNI, CE, Pasaporte)</label>
                    <Input value={filiacionData.documentoIdentidad} readOnly className="bg-gray-50" />
                  </div>
                </div>

                {/* Domicilio Fiscal */}
                <div className="border-t border-gray-100 pt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Domicilio Fiscal</label>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Avenida/Calle/Jirón/Pasaje</label>
                      <Input value={filiacionData.direccion} onChange={(e) => updateFiliacion({ direccion: e.target.value })} placeholder="Dirección" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Número/Departamento/Interior</label>
                        <Input value={filiacionData.numeroInterior} onChange={(e) => updateFiliacion({ numeroInterior: e.target.value })} placeholder="Nro / Dpto" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Urbanización</label>
                        <Input value={filiacionData.urbanizacion} onChange={(e) => updateFiliacion({ urbanizacion: e.target.value })} placeholder="Urbanización" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Departamento</label>
                        <Select value={filiacionData.departamento} onChange={(e) => updateFiliacion({ departamento: e.target.value, provincia: '', distrito: '' })}>
                          <option value="">Departamento</option>
                          {departamentos.map((d) => (
                            <option key={d.codigo} value={d.nombre}>{d.nombre}</option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Provincia</label>
                        <Select value={filiacionData.provincia} onChange={(e) => updateFiliacion({ provincia: e.target.value, distrito: '' })} disabled={!filiacionData.departamento}>
                          <option value="">Provincia</option>
                          {provinciasDomicilio.map((p) => (
                            <option key={p.codigo} value={p.nombre}>{p.nombre}</option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Distrito</label>
                        <Select value={filiacionData.distrito} onChange={(e) => updateFiliacion({ distrito: e.target.value })} disabled={!filiacionData.provincia}>
                          <option value="">Distrito</option>
                          {distritosDomicilio.map((d) => (
                            <option key={d.codigo} value={d.nombre}>{d.nombre}</option>
                          ))}
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Residencia en lugar de trabajo */}
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">Residencia en Lugar Trabajo:</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="reside" checked={filiacionData.resideEnLugarTrabajo === true} onChange={() => updateFiliacion({ resideEnLugarTrabajo: true })} className="text-blue-600" />
                    <span className="text-sm">SÍ</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="reside" checked={filiacionData.resideEnLugarTrabajo === false} onChange={() => updateFiliacion({ resideEnLugarTrabajo: false })} className="text-blue-600" />
                    <span className="text-sm">NO</span>
                  </label>
                  {filiacionData.resideEnLugarTrabajo === true && (
                    <div className="flex items-center gap-2">
                      <Input type="number" min={0} value={filiacionData.tiempoResidenciaLugarTrabajo} onChange={(e) => updateFiliacion({ tiempoResidenciaLugarTrabajo: e.target.value })} className="w-20" placeholder="0" />
                      <span className="text-sm text-gray-600">años</span>
                    </div>
                  )}
                </div>

                {/* Seguros */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Seguros</label>
                  <div className="flex flex-wrap gap-4">
                    {['ESSALUD', 'EPS', 'SCTR'].map((seg) => (
                      <label key={seg} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={seg === 'ESSALUD' ? filiacionData.seguroEssalud : seg === 'EPS' ? filiacionData.seguroEps : filiacionData.seguroSctr}
                          onChange={(e) => updateFiliacion(seg === 'ESSALUD' ? { seguroEssalud: e.target.checked } : seg === 'EPS' ? { seguroEps: e.target.checked } : { seguroSctr: e.target.checked })}
                          className="rounded text-blue-600"
                        />
                        <span className="text-sm">{seg}</span>
                      </label>
                    ))}
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={!!filiacionData.seguroOtro} onChange={(e) => updateFiliacion({ seguroOtro: e.target.checked ? 'Otro' : '' })} className="rounded text-blue-600" />
                      <span className="text-sm">OTRO:</span>
                      <Input value={filiacionData.seguroOtro} onChange={(e) => updateFiliacion({ seguroOtro: e.target.value })} placeholder="Especificar" className="w-32" />
                    </div>
                  </div>
                </div>

                {/* Contacto y socio-demográficos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                    <Input type="email" value={filiacionData.email} onChange={(e) => updateFiliacion({ email: e.target.value })} placeholder="email@ejemplo.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                    <Input value={filiacionData.telefono} onChange={(e) => updateFiliacion({ telefono: e.target.value })} placeholder="Teléfono" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado Civil</label>
                    <Select value={filiacionData.estadoCivil} onChange={(e) => updateFiliacion({ estadoCivil: e.target.value })}>
                      <option value="">Seleccione</option>
                      {ESTADO_CIVIL.map((ec) => (
                        <option key={ec} value={ec}>{ec}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Grado de Instrucción</label>
                    <Select value={filiacionData.gradoInstruccion} onChange={(e) => updateFiliacion({ gradoInstruccion: e.target.value })}>
                      <option value="">Seleccione</option>
                      {GRADO_INSTRUCCION.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">N° Total de Hijos Vivos</label>
                    <Input type="number" min={0} value={filiacionData.nroHijosVivos} onChange={(e) => updateFiliacion({ nroHijosVivos: e.target.value })} placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">N° Dependientes</label>
                    <Input type="number" min={0} value={filiacionData.nroDependientes} onChange={(e) => updateFiliacion({ nroDependientes: e.target.value })} placeholder="0" />
                  </div>
                </div>

                <Button onClick={handleGuardarFiliacion} disabled={savingFiliacion} className="bg-blue-600 hover:bg-blue-700">
                  {savingFiliacion ? 'Guardando...' : 'Guardar datos de filiación en perfil del trabajador'}
                </Button>
              </div>
            </div>
          </div>
        )}

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
