'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  trabajadoresService,
  Trabajador,
  TipoDocumento,
} from '@/services/trabajadores.service';
import { Button } from '@/components/ui/button';
import { UsuarioRol } from '@/types';
import { ArrowLeft, User, Phone, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

const LABEL_TIPO_DOC: Record<TipoDocumento, string> = {
  [TipoDocumento.DNI]: 'DNI',
  [TipoDocumento.CARNE_EXTRANJERIA]: 'Carné de Extranjería',
  [TipoDocumento.PASAPORTE]: 'Pasaporte',
};

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  try {
    const d = new Date(value);
    return isNaN(d.getTime()) ? value : d.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
        <Icon className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function FieldRow({
  label,
  value,
  required,
}: {
  label: string;
  value: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-2 border-b border-slate-100 last:border-0">
      <dt className="text-sm font-medium text-slate-600">
        {label} {required && <span className="text-red-500">*</span>}
      </dt>
      <dd className="sm:col-span-2 text-sm text-slate-900">{value ?? '-'}</dd>
    </div>
  );
}

export default function TrabajadorDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [trabajador, setTrabajador] = useState<Trabajador | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      trabajadoresService
        .findOne(id)
        .then(setTrabajador)
        .catch(() => {
          toast.error('No se pudo cargar el trabajador');
          router.push('/trabajadores');
        })
        .finally(() => setIsLoading(false));
    }
  }, [id, router]);

  if (isLoading || !trabajador) {
    return (
      <ProtectedRoute allowedRoles={[UsuarioRol.SUPER_ADMIN, UsuarioRol.ADMIN_EMPRESA, UsuarioRol.INGENIERO_SST]}>
        <div className="p-8 text-center">Cargando...</div>
      </ProtectedRoute>
    );
  }

  const nombreCompleto =
    [trabajador.apellido_paterno, trabajador.apellido_materno, trabajador.nombres]
      .filter(Boolean)
      .join(' ') || trabajador.nombre_completo;

  return (
    <ProtectedRoute
      allowedRoles={[UsuarioRol.SUPER_ADMIN, UsuarioRol.ADMIN_EMPRESA, UsuarioRol.INGENIERO_SST]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/trabajadores">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h1 className="text-2xl font-bold text-slate-900">{nombreCompleto}</h1>
          <p className="text-slate-600 mt-1">
            {trabajador.cargo} • {trabajador.empresa_nombre || '-'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SectionCard title="Datos Personales" icon={User}>
            <dl>
              <FieldRow label="Nombres" value={trabajador.nombres} required />
              <FieldRow label="Apellido Paterno" value={trabajador.apellido_paterno} required />
              <FieldRow label="Apellido Materno" value={trabajador.apellido_materno} required />
              <FieldRow
                label="Tipo de Documento"
                value={trabajador.tipo_documento ? LABEL_TIPO_DOC[trabajador.tipo_documento as TipoDocumento] : null}
                required
              />
              <FieldRow
                label="Nro de Documento"
                value={trabajador.numero_documento || trabajador.documento_identidad}
                required
              />
              <FieldRow label="Fecha de Nacimiento" value={formatDate(trabajador.fecha_nacimiento)} />
              <FieldRow label="Sexo" value={trabajador.sexo} />
              <FieldRow label="Correo Electrónico personal" value={trabajador.email_personal} />
              <FieldRow label="Correo Electrónico corporativo" value={trabajador.email_corporativo} />
              <FieldRow label="Registrar firma digital" value={trabajador.firma_digital_url ? 'Cargada' : 'No cargada'} />
              <FieldRow label="Teléfono" value={trabajador.telefono} />
              <FieldRow label="País" value={trabajador.pais} />
              <FieldRow label="Departamento" value={trabajador.departamento} />
              <FieldRow label="Provincia" value={trabajador.provincia} />
              <FieldRow label="Distrito" value={trabajador.distrito} />
              <FieldRow label="Dirección" value={trabajador.direccion} />
            </dl>
          </SectionCard>

          <SectionCard title="Datos de Contacto (Emergencia)" icon={Phone}>
            <dl>
              <FieldRow label="Nombres" value={trabajador.contacto_emergencia_nombre} />
              <FieldRow label="Teléfono" value={trabajador.contacto_emergencia_telefono} />
            </dl>
          </SectionCard>

          <div className="lg:col-span-2">
          <SectionCard title="Datos Laborales" icon={Briefcase}>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <FieldRow label="Jefe Directo" value={trabajador.jefe_directo} />
              <FieldRow label="Sede" value={trabajador.sede} required />
              <FieldRow label="Unidad" value={trabajador.unidad} required />
              <FieldRow label="Área" value={trabajador.area_nombre} required />
              <FieldRow label="Puesto" value={trabajador.cargo} />
              <FieldRow label="Centro de Costos" value={trabajador.centro_costos} />
              <FieldRow label="Nivel de Exposición" value={trabajador.nivel_exposicion} />
              <FieldRow label="Tipo de Usuario" value={trabajador.tipo_usuario} required />
              <FieldRow label="Seguro de atención médica" value={trabajador.seguro_atencion_medica} />
              <FieldRow label="Fecha de ingreso" value={formatDate(trabajador.fecha_ingreso)} required />
              <FieldRow label="Modalidad de Contrato" value={trabajador.modalidad_contrato} />
              <FieldRow label="Gerencia" value={trabajador.gerencia} />
              <FieldRow label="Razón Social" value={trabajador.empresa_nombre} required />
              <FieldRow label="Puesto de capacitación" value={trabajador.puesto_capacitacion} />
              <FieldRow label="Protocolos de EMO" value={trabajador.protocolos_emo} />
            </dl>
          </SectionCard>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
