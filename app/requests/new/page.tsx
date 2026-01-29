'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RequestForm } from '@/components/requests/RequestForm';
import { Card } from '@/components/ui/Card';
import type { RequestType } from '@/types';

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
      const data: any = {
        type: formData.get('type'),
        title: formData.get('title'),
        description: formData.get('description'),
        reason: formData.get('reason') || undefined,
        urgency: formData.get('urgency'),
      };

      // Agregar destinatario si está especificado
      if (formData.get('assigned_to_user_id')) {
        data.assigned_to_user_id = parseInt(formData.get('assigned_to_user_id') as string);
        data.custom_flow = formData.get('custom_flow') === 'true';
      } else if (formData.get('assigned_to_role')) {
        data.assigned_to_role = formData.get('assigned_to_role');
        data.custom_flow = formData.get('custom_flow') === 'true';
      }

      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || 'Error al crear la solicitud');
        return;
      }

      router.push(`/requests/${result.request.id}`);
    } catch (err) {
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

