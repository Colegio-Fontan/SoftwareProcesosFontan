'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import type { RequestStatus } from '@/types';

interface RequestActionsProps {
  requestId: number;
  currentStatus: RequestStatus;
}

export const RequestActions: React.FC<RequestActionsProps> = ({
  requestId,
  currentStatus,
}) => {
  const router = useRouter();
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState<{ status: string, nextRole?: string } | null>(null);

  const roleLabels: Record<string, string> = {
    sistemas: 'Sistemas',
    gestion_humana: 'Gestión Humana',
    cartera: 'Cartera',
    gerencia: 'Gerencia',
    rectoria: 'Rectoría',
    servicios_generales: 'Servicios Generales',
  };

  const handleAction = async (status: RequestStatus) => {
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          comment: comment || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al procesar la acción');
        return;
      }

      setSuccessInfo({
        status: status,
        nextRole: data.request.current_approver_role
      });

      setComment('');
      // router.refresh(); // Dejamos que el usuario vea el mensaje de éxito un momento antes de refrescar o si prefiere recargar manual
      setTimeout(() => {
        router.refresh();
      }, 2000);
    } catch {
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (currentStatus === 'aceptado' || currentStatus === 'rechazado') {
    return (
      <p className="text-sm text-gray-500">
        Esta solicitud ya ha sido {currentStatus === 'aceptado' ? 'aceptada' : 'rechazada'}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      <Textarea
        label="Comentario (opcional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder="Agrega un comentario sobre tu decisión..."
      />

      <div className="flex gap-2">
        <Button
          variant="primary"
          onClick={() => handleAction('aceptado')}
          isLoading={isLoading}
          disabled={!!successInfo}
          className="flex-1"
        >
          Aprobar
        </Button>
        <Button
          variant="outline"
          onClick={() => handleAction('rechazado')}
          isLoading={isLoading}
          disabled={!!successInfo}
          className="flex-1"
        >
          Rechazar
        </Button>
      </div>

      {successInfo && (
        <div className="mt-4 p-4 rounded-xl bg-green-50 border border-green-200 animate-in fade-in slide-in-from-top-2">
          <p className="text-green-800 font-bold mb-1 flex items-center gap-2">
            <span>✅</span> {successInfo.status === 'aceptado' ? 'Aprobado correctamente' : 'Rechazado correctamente'}
          </p>
          <p className="text-sm text-green-700">
            {successInfo.nextRole
              ? `La solicitud ha sido enviada a: `
              : `La solicitud ha finalizado con estado: `
            }
            <strong className="uppercase">{successInfo.nextRole ? (roleLabels[successInfo.nextRole] || successInfo.nextRole) : status === 'aceptado' ? 'ACEPTADA' : 'RECHAZADA'}</strong>
          </p>
        </div>
      )}
    </div>
  );
};

