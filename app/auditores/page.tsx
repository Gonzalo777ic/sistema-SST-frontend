'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { usuariosService } from '@/services/usuarios.service';
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
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { UsuarioRol, Usuario } from '@/types';

export default function AuditoresPage() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const [auditores, setAuditores] = useState<Usuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!hasRole(UsuarioRol.SUPER_ADMIN) && !hasRole(UsuarioRol.ADMIN_EMPRESA)) {
      router.push('/dashboard');
      return;
    }
    loadAuditores();
  }, [hasRole, router]);

  const loadAuditores = async () => {
    try {
      setIsLoading(true);
      const todos = await usuariosService.findAll();
      const auditoresList = todos.filter((u) => u.roles?.includes(UsuarioRol.AUDITOR));
      setAuditores(auditoresList);
    } catch (error: any) {
      toast.error('Error al cargar auditores', {
        description: error.response?.data?.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Auditores</h1>
            <p className="text-slate-600 mt-1">
              Usuarios con rol Auditor. Pueden estar vinculados a una empresa o tener acceso a todas.
            </p>
          </div>
          <Link href="/gestion-usuarios">
            <Button variant="outline">
              Gestionar en Usuarios
            </Button>
          </Link>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8">
              <Skeleton className="h-8 w-full mb-4" />
              <Skeleton className="h-8 w-full mb-4" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : auditores.length === 0 ? (
            <div className="p-12 text-center py-16">
              <ShieldCheck className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">No hay auditores registrados</p>
              <Link href="/gestion-usuarios">
                <Button className="mt-4">Ir a Gestión de Usuarios</Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>DNI</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditores.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.dni}</TableCell>
                    <TableCell>
                      {[a.apellido_paterno, a.apellido_materno, a.nombres].filter(Boolean).join(' ') || '-'}
                    </TableCell>
                    <TableCell>{a.activo ? 'Activo' : 'Inactivo'}</TableCell>
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
