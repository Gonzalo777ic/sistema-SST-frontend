'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { atsService, ATS, EstadoATS } from '@/services/ats.service';
import { empresasService } from '@/services/empresas.service';
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
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Plus, Search, FileText, Filter } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { UsuarioRol } from '@/types';

export default function ATSPage() {
  const { usuario, hasAnyRole } = useAuth();
  const [atsList, setAtsList] = useState<ATS[]>([]);
  const [empresas, setEmpresas] = useState<{ id: string; nombre: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>('');

  const canCreate = hasAnyRole([
    UsuarioRol.SUPER_ADMIN,
    UsuarioRol.ADMIN_EMPRESA,
    UsuarioRol.INGENIERO_SST,
    UsuarioRol.SUPERVISOR,
  ]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadAts();
  }, [selectedEmpresa]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const empresasData = await empresasService.findAll();
      setEmpresas(empresasData.map((e) => ({ id: e.id, nombre: e.nombre })));
      await loadAts();
    } catch (error: any) {
      toast.error('Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAts = async () => {
    try {
      const empresaId = selectedEmpresa || usuario?.empresaId || undefined;
      const data = await atsService.findAll(empresaId);
      setAtsList(data);
    } catch (error: any) {
      toast.error('Error al cargar ATS', {
        description: error.response?.data?.message || 'No se pudieron cargar los ATS',
      });
    }
  };

  const filteredAts = atsList.filter((ats) => {
    const matchesSearch =
      !searchTerm ||
      ats.numero_ats.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ats.trabajo_a_realizar.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ats.area.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getEstadoColor = (estado: EstadoATS) => {
    switch (estado) {
      case EstadoATS.Borrador:
        return 'bg-slate-200 text-slate-700';
      case EstadoATS.Completado:
        return 'bg-warning-light/20 text-warning';
      case EstadoATS.Aprobado:
        return 'bg-success-light/20 text-success';
      case EstadoATS.EnEjecucion:
        return 'bg-primary/20 text-primary';
      case EstadoATS.Finalizado:
        return 'bg-slate-600 text-white';
      default:
        return 'bg-slate-200 text-slate-700';
    }
  };

  return (
    <ProtectedRoute
      allowedRoles={[
        UsuarioRol.SUPER_ADMIN,
        UsuarioRol.ADMIN_EMPRESA,
        UsuarioRol.INGENIERO_SST,
        UsuarioRol.SUPERVISOR,
        UsuarioRol.TRABAJADOR,
      ]}
    >
      <MainLayout>
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Análisis de Trabajo Seguro (ATS)
              </h1>
              <p className="text-slate-600 mt-2">
                Gestión de análisis de trabajo seguro
              </p>
            </div>
            {canCreate && (
              <Link href="/ats/nuevo">
                <Button>
                  <Plus className="w-5 h-5 mr-2" />
                  Nuevo ATS
                </Button>
              </Link>
            )}
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Buscar por número, trabajo o área..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={selectedEmpresa}
                onChange={(e) => setSelectedEmpresa(e.target.value)}
              >
                <option value="">Todas las empresas</option>
                {empresas.map((empresa) => (
                  <option key={empresa.id} value={empresa.id}>
                    {empresa.nombre}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Tabla de ATS */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredAts.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">No hay ATS registrados</p>
              </div>
            ) : (
              <>
                {/* Vista Desktop - Tabla */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número ATS</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Área</TableHead>
                        <TableHead>Trabajo a Realizar</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Elaborado por</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAts.map((ats) => (
                        <TableRow key={ats.id}>
                          <TableCell className="font-medium">
                            {ats.numero_ats}
                          </TableCell>
                          <TableCell>
                            {new Date(ats.fecha).toLocaleDateString('es-PE')}
                          </TableCell>
                          <TableCell>{ats.area}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {ats.trabajo_a_realizar}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded ${getEstadoColor(
                                ats.estado,
                              )}`}
                            >
                              {ats.estado}
                            </span>
                          </TableCell>
                          <TableCell>{ats.elaborado_por || 'N/A'}</TableCell>
                          <TableCell className="text-right">
                            <Link href={`/ats/${ats.id}`}>
                              <Button variant="outline" size="sm">
                                Ver
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Vista Mobile - Cards */}
                <div className="md:hidden p-4 space-y-4">
                  {filteredAts.map((ats) => (
                    <Link key={ats.id} href={`/ats/${ats.id}`}>
                      <div className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-slate-900">
                              {ats.numero_ats}
                            </h3>
                            <p className="text-sm text-slate-600 mt-1">
                              {new Date(ats.fecha).toLocaleDateString('es-PE')}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${getEstadoColor(
                              ats.estado,
                            )}`}
                          >
                            {ats.estado}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 mb-2">
                          <span className="font-medium">Área:</span> {ats.area}
                        </p>
                        <p className="text-sm text-slate-700 line-clamp-2">
                          {ats.trabajo_a_realizar}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
