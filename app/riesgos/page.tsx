'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  ShieldCheck,
  AlertTriangle,
  FileText,
  ClipboardCheck,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Info,
} from 'lucide-react';
import { UsuarioRol } from '@/types';
import Link from 'next/link';

// Estructura preparada para recibir datos del servicio futuro
interface ResumenRiesgos {
  petarActivos: number;
  petarPendientes: number;
  petsVigentes: number;
  atsIpercTotal: number;
}

// Datos estáticos por ahora (hardcoded)
const datosEstaticos: ResumenRiesgos = {
  petarActivos: 12,
  petarPendientes: 5,
  petsVigentes: 28,
  atsIpercTotal: 156,
};

interface ModuloRiesgo {
  id: string;
  titulo: string;
  descripcion: string;
  icono: React.ElementType;
  color: string;
  colorBg: string;
  colorBorder: string;
  ruta: string;
  caracteristicas: string[];
}

const modulos: ModuloRiesgo[] = [
  {
    id: 'petar',
    titulo: 'PETAR',
    descripcion:
      'Permiso Escrito de Trabajo de Alto Riesgo. Autorización legal para trabajos críticos que requieren aprobación estricta entre Supervisor y SST.',
    icono: AlertTriangle,
    color: 'text-red-600',
    colorBg: 'bg-red-50',
    colorBorder: 'border-red-200',
    ruta: '/petar',
    caracteristicas: [
      'Trabajos en altura (>1.80m)',
      'Espacios confinados',
      'Trabajos en caliente',
      'Izaje de cargas',
      'Trabajos eléctricos',
      'Flujo de aprobación estricto',
    ],
  },
  {
    id: 'pets',
    titulo: 'PETS',
    descripcion:
      'Procedimiento Escrito de Trabajo Seguro. Documento estándar permanente que define el paso a paso correcto y seguro para realizar una tarea.',
    icono: FileText,
    color: 'text-blue-600',
    colorBg: 'bg-blue-50',
    colorBorder: 'border-blue-200',
    ruta: '/pets',
    caracteristicas: [
      'Control de versiones',
      'Pasos detallados',
      'Identificación de peligros',
      'Medidas de control',
      'Requisitos previos',
      'Revisión periódica',
    ],
  },
  {
    id: 'ats',
    titulo: 'ATS',
    descripcion:
      'Análisis de Trabajo Seguro. Documento fundamental que analiza los riesgos de una tarea específica antes de su ejecución, con desglose detallado.',
    icono: ClipboardCheck,
    color: 'text-green-700',
    colorBg: 'bg-green-50',
    colorBorder: 'border-green-200',
    ruta: '/ats',
    caracteristicas: [
      'Desglose de pasos de trabajo',
      'Identificación de peligros',
      'Medidas de control',
      'Firmas de participantes',
      'Permisos especiales asociados',
      'Historial de versiones',
    ],
  },
  {
    id: 'iperc',
    titulo: 'Matriz IPERC',
    descripcion:
      'Identificación de Peligros y Evaluación de Riesgos en el Cargo. Evaluación sistemática de probabilidad y severidad para determinar el nivel de riesgo.',
    icono: TrendingUp,
    color: 'text-amber-600',
    colorBg: 'bg-amber-50',
    colorBorder: 'border-amber-200',
    ruta: '/iperc',
    caracteristicas: [
      'Evaluación de probabilidad',
      'Evaluación de severidad',
      'Cálculo de nivel de riesgo',
      'Jerarquización de controles',
      'Plan de acción',
      'Seguimiento y actualización',
    ],
  },
];

export default function RiesgosPage() {
  const { usuario } = useAuth();
  const [resumenRiesgos, setResumenRiesgos] = useState<ResumenRiesgos>(datosEstaticos);
  const [isLoading, setIsLoading] = useState(false);

  // Estructura preparada para recibir datos del servicio futuro
  useEffect(() => {
    // TODO: Implementar llamada al servicio cuando esté disponible
    // const loadResumen = async () => {
    //   try {
    //     setIsLoading(true);
    //     const data = await riesgosService.getResumen();
    //     setResumenRiesgos(data);
    //   } catch (error) {
    //     console.error('Error al cargar resumen de riesgos:', error);
    //   } finally {
    //     setIsLoading(false);
    //   }
    // };
    // loadResumen();
  }, []);

  return (
    <div className="space-y-6 w-full">
          {/* Cabecera */}
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-slate-900 mt-0">
                Gestión de Riesgos
              </h1>
              <p className="text-slate-600 mt-2">
                Centraliza el acceso a permisos, procedimientos y evaluaciones de riesgo.
                Gestiona PETAR, PETS, ATS e IPERC para mantener la seguridad operativa.
              </p>
            </div>
          </div>

          {/* KPIs - Fichas de Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700 mb-1">
                    PETAR Activos
                  </p>
                  <p className="text-3xl font-bold text-blue-900">
                    {resumenRiesgos.petarActivos}
                  </p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-700 mb-1">
                    PETAR Pendientes
                  </p>
                  <p className="text-3xl font-bold text-orange-900">
                    {resumenRiesgos.petarPendientes}
                  </p>
                </div>
                <div className="p-2 bg-orange-100 rounded-lg">
                  <FileText className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700 mb-1">
                    PETS Vigentes
                  </p>
                  <p className="text-3xl font-bold text-green-900">
                    {resumenRiesgos.petsVigentes}
                  </p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700 mb-1">
                    ATS/IPERC
                  </p>
                  <p className="text-3xl font-bold text-purple-900">
                    {resumenRiesgos.atsIpercTotal}
                  </p>
                </div>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ClipboardCheck className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Cuadrícula de Módulos - Cards Principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {modulos.map((modulo) => {
              const Icono = modulo.icono;
              return (
                <Link
                  key={modulo.id}
                  href={modulo.ruta}
                  className="group block"
                >
                  <div
                    className={`${modulo.colorBg} border-2 ${modulo.colorBorder} rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-200 h-full flex flex-col`}
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`p-3 bg-white rounded-lg ${modulo.color}`}>
                        <Icono className="w-8 h-8" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-2xl font-bold ${modulo.color} mb-2`}>
                          {modulo.titulo}
                        </h3>
                        <p className="text-slate-700 text-sm leading-relaxed">
                          {modulo.descripcion}
                        </p>
                      </div>
                    </div>

                    {/* Checklist Visual */}
                    <div className="mt-auto pt-4 border-t border-slate-200">
                      <p className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wide">
                        Características principales:
                      </p>
                      <ul className="space-y-2">
                        {modulo.caracteristicas.map((caracteristica, index) => (
                          <li
                            key={index}
                            className="flex items-start gap-2 text-sm text-slate-700"
                          >
                            <CheckCircle2
                              className={`w-4 h-4 ${modulo.color} flex-shrink-0 mt-0.5`}
                            />
                            <span>{caracteristica}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">
                        <span>Acceder al módulo</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Banner Informativo */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                <Info className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">
                  ¿Cuándo usar cada documento?
                </h3>
                <div className="space-y-3 text-sm text-slate-700">
                  <div>
                    <p className="font-medium text-slate-900 mb-1">
                      <span className="text-red-600">PETAR:</span> Usa para trabajos
                      temporales de alto riesgo que requieren autorización específica para
                      un día o período determinado. Ejemplos: Trabajo en altura superior a
                      1.80m, trabajos en caliente, espacios confinados, izaje de cargas.
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 mb-1">
                      <span className="text-blue-600">PETS:</span> Usa para documentar el
                      procedimiento estándar permanente de cómo realizar una tarea de forma
                      segura. Es el documento base que se revisa periódicamente y aplica
                      siempre que se ejecute esa tarea.
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 mb-1">
                      <span className="text-green-700">ATS:</span> Usa para analizar los
                      riesgos específicos de una tarea antes de ejecutarla. Incluye el
                      desglose paso a paso, identificación de peligros y medidas de control
                      para ese trabajo particular.
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 mb-1">
                      <span className="text-amber-600">Matriz IPERC:</span> Usa para
                      evaluar y jerarquizar los riesgos asociados a un cargo o área de
                      trabajo. Permite identificar peligros, evaluar probabilidad y
                      severidad, y establecer controles prioritarios.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
  );
}
