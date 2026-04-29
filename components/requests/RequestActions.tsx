'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { ResolveRequestModal } from './ResolveRequestModal';
import type { RequestStatus } from '@/types';
import { AlertTriangle, Calendar, CheckCircle, ThumbsUp, XCircle } from 'lucide-react';

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

  if (currentStatus === 'rechazado' || currentStatus === 'resuelto' || currentStatus === 'cerrado') {
    return (
      <div className="space-y-2">
        <p className="text-sm text-center font-medium py-3 px-4 rounded-lg bg-gray-100 text-gray-600 border border-gray-200">
          Esta solicitud ya ha sido {
              currentStatus === 'rechazado' ? 'rechazada' :
                currentStatus === 'resuelto' ? 'resuelta y enviada a evidencias' : 'cerrada'
          }
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
          <AlertTriangle className="text-red-500 mt-0.5 w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4">
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
          <Textarea
            label="Comentario adicional (opcional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder="Agrega un comentario sobre tu decisión..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
        {currentStatus !== 'aceptado' && (
        <Button
          variant="outline"
          onClick={() => handleAction('aceptado')}
          isLoading={isLoading}
          disabled={!!successInfo}
          className="flex-1 border-none relative bg-gradient-to-br from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 active:scale-95 py-6 h-auto flex flex-col items-center justify-center gap-2 rounded-xl"
        >
          <span className="font-bold text-lg flex items-center gap-2"><ThumbsUp className="w-5 h-5" /> Recibir</span>
          <span className="text-[9px] uppercase font-bold opacity-90 tracking-widest bg-black/10 px-2 py-0.5 rounded-full">Asignar y tomar</span>
        </Button>
        )}

        <Button
          variant="outline"
          onClick={() => setShowResolveModal(true)}
          isLoading={isLoading}
          disabled={!!successInfo}
          className="flex-1 border-none relative bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 active:scale-95 py-6 h-auto flex flex-col items-center justify-center gap-2 rounded-xl"
        >
          <span className="font-bold text-lg flex items-center gap-2"><CheckCircle className="w-5 h-5" /> Resolver</span>
          <span className="text-[9px] uppercase font-bold opacity-90 tracking-widest bg-black/10 px-2 py-0.5 rounded-full">Finalizar y subir evt</span>
        </Button>
        </div>

        <Button
          variant="outline"
          onClick={() => handleAction('rechazado')}
          isLoading={isLoading}
          disabled={!!successInfo}
          className="flex-1 w-full border-none relative bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 active:scale-95 py-4 h-auto rounded-xl"
        >
          <span className="font-bold text-base flex items-center gap-2 justify-center"><XCircle className="w-5 h-5" /> Rechazar</span>
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
            <CheckCircle className="w-5 h-5" /> {successInfo.status === 'resuelto' ? 'Finalizado correctamente' : successInfo.status === 'aceptado' ? 'Recibido correctamente' : 'Rechazado correctamente'}
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

