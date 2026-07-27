'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RequestForm } from '@/components/requests/RequestForm';
import { Card } from '@/components/ui/Card';
import { uploadRequestAttachment } from '@/lib/hooks/uploadAttachment';
import { DESCRIPTION_REQUIRED_MESSAGE } from '@/lib/utils/request-description';
import type { RequestType, CreateRequestInput } from '@/types';

export default function NewRequestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [type, setType] = useState<RequestType>('compra');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const typeParam = searchParams.get('type') as RequestType;
    if (typeParam && ['compra', 'permiso', 'soporte', 'certificado', 'mantenimiento', 'personalizada'].includes(typeParam)) {
      setType(typeParam);
    }
  }, [searchParams]);

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    setError('');

    try {
      const description = ((formData.get('description') as string) || '').trim();
      if (!description) {
        setError(DESCRIPTION_REQUIRED_MESSAGE);
        return;
      }

      const data: CreateRequestInput = {
        type: type,
        title: ((formData.get('title') as string) || '').trim(),
        description,
        reason: (formData.get('reason') as string) || undefined,
        urgency: (formData.get('urgency') as 'bajo' | 'medio' | 'alto') || 'bajo',
      };

      // Campos de ausencia para permisos
      if (type === 'permiso') {
        data.tipo_ausencia = (formData.get('tipo_ausencia') as string) || null;
        data.concepto_ausencia = (formData.get('concepto_ausencia') as string) || null;
        data.fecha_ausencia = (formData.get('fecha_ausencia') as string) || null;
        data.hora_inicio = (formData.get('hora_inicio') as string) || null;
        data.hora_fin = (formData.get('hora_fin') as string) || null;
      }

      // Agregar destinatario si está especificado
      if (formData.get('assigned_to_user_id')) {
        data.assigned_to_user_id = parseInt(formData.get('assigned_to_user_id') as string);
        data.custom_flow = formData.get('custom_flow') === 'true';
      }

      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        const detail = Array.isArray(result.details) ? result.details[0]?.message : null;
        setError(detail || result.error || 'Error al crear la solicitud');
        return;
      }

      const attachedFiles = formData.getAll('files') as File[];
      const uploadErrors: string[] = [];
      for (const file of attachedFiles) {
        try {
          await uploadRequestAttachment(result.request.id, file);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error('Error subiendo archivo:', file.name, err);
          uploadErrors.push(`${file.name}: ${msg}`);
        }
      }

      if (uploadErrors.length > 0) {
        setError(
          `La solicitud se creó pero no se pudieron subir algunos archivos:\n` +
            uploadErrors.join('\n')
        );
        return;
      }

      router.push(`/requests/${result.request.id}`);
    } catch {
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        <RequestForm type={type} onSubmit={handleSubmit} isLoading={isLoading} />
      </Card>
    </div>
  );
}

