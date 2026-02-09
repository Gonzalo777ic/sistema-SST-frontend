'use client';

import { useAuth } from '@/contexts/AuthContext';
import {
  AlertTriangle,
  Shield,
  FileText,
  Calendar,
  Users,
  TrendingUp,
} from 'lucide-react';
import { UsuarioRol } from '@/types';

export default function DashboardPage() {
  const { usuario, hasRole } = useAuth();

  // Mock data - En producción vendrá del backend
  const kpis = [
    { label: 'Solicitudes EPP Pendientes', value: 5, icon: Shield, color: 'text-warning' },
    { label: 'Permisos por Aprobar', value: 3, icon: FileText, color: 'text-primary' },
    { label: 'Exámenes por Vencer', value: 8, icon: Calendar, color: 'text-danger' },
    { label: 'Incidentes del Mes', value: 2, icon: AlertTriangle, color: 'text-danger' },
  ];

  const recentIncidents = [
    { id: '1', titulo: 'Caída de altura', fecha: '2024-01-15', estado: 'En investigación' },
    { id: '2', titulo: 'Corte menor', fecha: '2024-01-14', estado: 'Cerrado' },
  ];

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600 mt-2">
            Bienvenido, {usuario?.dni}
          </p>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, index) => {
            const Icon = kpi.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-lg shadow-sm p-6 border border-slate-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">{kpi.label}</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {kpi.value}
                    </p>
                  </div>
                  <Icon className={`w-8 h-8 ${kpi.color}`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Incidentes Recientes */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900">
                Incidentes Recientes
              </h2>
              <button className="text-sm text-primary hover:underline">
                Ver todos
              </button>
            </div>
            <div className="space-y-4">
              {recentIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className="p-4 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-slate-900">
                        {incident.titulo}
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">
                        {incident.fecha}
                      </p>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium bg-warning-light/20 text-warning rounded">
                      {incident.estado}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Accesos Rápidos */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Accesos Rápidos
            </h2>
            <div className="space-y-3">
              <button className="w-full text-left p-4 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors flex items-center gap-3">
                <Shield className="w-5 h-5 text-primary" />
                <span className="font-medium text-slate-900">
                  Solicitar EPP
                </span>
              </button>
              <button className="w-full text-left p-4 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                <span className="font-medium text-slate-900">
                  Crear ATS
                </span>
              </button>
              <button className="w-full text-left p-4 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors flex items-center gap-3">
                <Calendar className="w-5 h-5 text-primary" />
                <span className="font-medium text-slate-900">
                  Mis Capacitaciones
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Estadísticas (Solo para Admin/Supervisor) */}
        {hasRole(UsuarioRol.ADMIN_EMPRESA) ||
          hasRole(UsuarioRol.INGENIERO_SST)||
          hasRole(UsuarioRol.SUPERVISOR) && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Estadísticas del Mes
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-slate-50 rounded-md">
                <Users className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-900">150</p>
                <p className="text-sm text-slate-600">Trabajadores</p>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-md">
                <FileText className="w-8 h-8 text-success mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-900">45</p>
                <p className="text-sm text-slate-600">Inspecciones</p>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-md">
                <TrendingUp className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-900">92%</p>
                <p className="text-sm text-slate-600">Cumplimiento</p>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
