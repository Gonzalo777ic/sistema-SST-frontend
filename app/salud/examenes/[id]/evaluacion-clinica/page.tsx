'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FilePlus2 } from 'lucide-react';

/**
 * Página placeholder para generar la Ficha Médica (Anexo 02 MINSA) en el sistema.
 * Formulario completo: antecedentes, examen físico por sistemas, funciones vitales.
 * TODO: Implementar formulario completo del Anexo 02 y generación de PDF.
 */
export default function EvaluacionClinicaPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  return (
    <div className="p-6 max-w-3xl mx-auto">
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

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
        <FilePlus2 className="h-16 w-16 text-amber-600 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-amber-900 mb-2">
          Formulario en desarrollo
        </h2>
        <p className="text-sm text-amber-800 mb-4">
          El formulario completo del Anexo 02 (Antecedentes, Examen Físico por Sistemas,
          Funciones Vitales) se implementará en una próxima iteración.
        </p>
        <p className="text-xs text-amber-700">
          Mientras tanto, puede usar la opción &quot;Subir Ficha Externa (PDF)&quot; en la
          sección de resultados del EMO para adjuntar la ficha elaborada en otro sistema.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push(`/salud/examenes/${id}`)}
        >
          Volver al detalle del examen
        </Button>
      </div>
    </div>
  );
}
