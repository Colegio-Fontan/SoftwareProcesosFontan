'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { ResolveRequestModal } from './ResolveRequestModal';
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
  const [expectedDate, setExpectedDate] = useState('');
  const [dateError, setDateError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState<{ status: string, nextRole?: string } | null>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);

  const roleLabels: Record<string, string> = {
    sistemas: 'Sistemas',
    gestion_humana: 'Gestión Humana',
    cartera: 'Cartera',
    gerencia: 'Gerencia',
    rectoria: 'Rectoría',
    servicios_generales: 'Servicios Generales',
  };

  const handleAction = async (status: RequestStatus) => {
    if (status === 'aceptado' && !expectedDate) {
      setDateError(true);
      setError('Debes seleccionar una fecha estimada de respuesta');
      return;
    }

    setIsLoading(true);
    setError('');
    setDateError(false);

    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          comment: comment || undefined,
          expected_response_date: status === 'aceptado' ? expectedDate : undefined,
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
      setExpectedDate('');
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

  if (currentStatus === 'aceptado' || currentStatus === 'rechazado' || currentStatus === 'resuelto' || currentStatus === 'cerrado') {
    return (
      <div className="space-y-2">
        <p className="text-sm text-center font-medium py-3 px-4 rounded-lg bg-gray-100 text-gray-600 border border-gray-200">
          Esta solicitud ya ha sido {
            currentStatus === 'aceptado' ? 'recibida' :
              currentStatus === 'rechazado' ? 'rechazada' :
                currentStatus === 'resuelto' ? 'resuelta y enviada a evidencias' : 'cerrada'
          }
        </p>
      </div>
    );
  }

  // Obtenemos la fecha mínima (hoy) para el input date
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
          <span className="text-red-500 mt-0.5">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1.5 flex items-center justify-between">
            <span>📅 Fecha Estimada de Respuesta <span className="text-red-500">*</span></span>
            <span className="text-[10px] text-amber-700 font-normal uppercase tracking-wider bg-amber-100 px-2 py-0.5 rounded-full">Para Recibir</span>
          </label>
          <input
            type="date"
            min={todayStr}
            value={expectedDate}
            onChange={(e) => { setExpectedDate(e.target.value); setDateError(false); setError(''); }}
            className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 ${dateError
              ? 'border-red-500 focus:border-red-500 focus:ring-red-200 bg-red-50/30'
              : 'border-gray-200 focus:border-primary focus:ring-primary/20'
              }`}
            required
            aria-required="true"
          />
          {dateError && <p className="text-xs text-red-600 mt-1">Obligatorio para la acción &quot;Recibido&quot;.</p>}
        </div>

        <div>
          <Textarea
            label="Comentario adicional (opcional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder="Agrega un comentario sobre tu decisión..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={() => handleAction('aceptado')}
          isLoading={isLoading}
          disabled={!!successInfo}
          className={`flex-1 ${dateError ? 'border-red-300 shadow-[0_0_0_2px_rgba(239,68,68,0.2)]' : 'border-amber-400 text-amber-700 hover:bg-amber-50'} py-6 h-auto flex flex-col items-center justify-center gap-1`}
        >
          <span className="font-bold text-base">👍 Recibido</span>
          <span className="text-[10px] uppercase font-bold opacity-80">(Asignar fecha y tomar el caso)</span>
        </Button>

        <Button
          variant="outline"
          onClick={() => setShowResolveModal(true)}
          isLoading={isLoading}
          disabled={!!successInfo}
          className="bg-green-600 hover:bg-green-700 border-green-700 text-white flex-1 py-6 h-auto flex flex-col items-center justify-center gap-1 shadow-sm"
        >
          <span className="font-bold text-base">✅ Resuelto</span>
          <span className="text-[10px] uppercase font-bold opacity-90">(Finalizar y subir evidencias)</span>
        </Button>

        <Button
          variant="outline"
          onClick={() => handleAction('rechazado')}
          isLoading={isLoading}
          disabled={!!successInfo}
          className="flex-1 text-red-600 border-red-200 hover:bg-red-50 py-4 h-auto"
        >
          <span className="font-bold">❌ Rechazar</span>
        </Button>
      </div>

      {showResolveModal && (
        <ResolveRequestModal
          requestId={requestId}
          onClose={() => setShowResolveModal(false)}
          onSuccess={() => {
            setShowResolveModal(false);
            setSuccessInfo({ status: 'resuelto' });
            setTimeout(() => router.refresh(), 2000);
          }}
        />
      )}

      {successInfo && (
        <div className="mt-4 p-4 rounded-xl bg-green-50 border border-green-200 animate-in fade-in slide-in-from-top-2">
          <p className="text-green-800 font-bold mb-1 flex items-center gap-2">
            <span>✅</span> {successInfo.status === 'resuelto' ? 'Finalizado correctamente' : successInfo.status === 'aceptado' ? 'Recibido correctamente' : 'Rechazado correctamente'}
          </p>
          <p className="text-sm text-green-700">
            {successInfo.nextRole
              ? `La solicitud ha sido enviada a: `
              : `La solicitud ha finalizado con estado: `
            }
            <strong className="uppercase">{successInfo.nextRole ? (roleLabels[successInfo.nextRole] || successInfo.nextRole) :
              successInfo.status === 'resuelto' ? 'RESUELTO' :
                successInfo.status === 'aceptado' ? 'RECIBIDO' : 'RECHAZADO'}</strong>
          </p>
        </div>
      )}
    </div>
  );
};

