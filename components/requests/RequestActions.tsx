'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { ResolveRequestModal } from './ResolveRequestModal';
import type { RequestStatus, RequestType, SoporteEstado } from '@/types';
import { AlertTriangle, Calendar, CheckCircle, Paperclip, ThumbsUp, XCircle } from 'lucide-react';

interface RequestActionsProps {
  requestId: number;
  currentStatus: RequestStatus;
  requestType?: RequestType;
  soporteEstado?: SoporteEstado | null;
}

export const RequestActions: React.FC<RequestActionsProps> = ({
  requestId,
  currentStatus,
  requestType,
  soporteEstado,
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

  const handleSoportePendiente = async () => {
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/requests/${requestId}/soporte`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: comment || undefined }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al procesar la acción');
        return;
      }

      setSuccessInfo({ status: 'soporte_pendiente' });
      setComment('');
      // La página de detalle carga la solicitud en el cliente; recargar muestra el nuevo estado
      setTimeout(() => window.location.reload(), 2000);
    } catch {
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const puedePedirSoporte = requestType === 'permiso' && !soporteEstado;

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

      {soporteEstado === 'pendiente' && !successInfo && (
        <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
          <Paperclip className="text-orange-600 mt-0.5 w-4 h-4 shrink-0" />
          <span>
            Aprobaste esta ausencia con el <strong>soporte pendiente</strong>. Ya se le avisó al empleado;
            te notificaremos cuando lo suba o si pasan 3 días sin subirlo.
          </span>
        </div>
      )}

      {soporteEstado === 'entregado' && !successInfo && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
          <CheckCircle className="text-green-600 mt-0.5 w-4 h-4 shrink-0" />
          <span>
            El empleado ya <strong>subió el soporte</strong>. Revísalo en los archivos y pulsa{' '}
            <strong>Resolver</strong> para cerrar la solicitud.
          </span>
        </div>
      )}

      {currentStatus === 'aceptado' && !soporteEstado && !successInfo && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
          <AlertTriangle className="text-amber-600 mt-0.5 w-4 h-4 shrink-0" />
          <span>
            Ya recibiste esta solicitud, pero <strong>sigue abierta</strong>. Pulsa{' '}
            <strong>Resolver</strong> para cerrarla y sacarla de tus pendientes.
          </span>
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
          <span className="text-[9px] uppercase font-bold opacity-90 tracking-widest bg-black/10 px-2 py-0.5 rounded-full">No la cierra</span>
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

        {puedePedirSoporte && (
          <Button
            variant="outline"
            onClick={handleSoportePendiente}
            isLoading={isLoading}
            disabled={!!successInfo}
            className="flex-1 w-full border-none relative bg-gradient-to-br from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 active:scale-95 py-4 h-auto flex flex-col items-center justify-center gap-1 rounded-xl"
          >
            <span className="font-bold text-base flex items-center gap-2"><Paperclip className="w-5 h-5" /> Aprobar con soporte pendiente</span>
            <span className="text-[9px] uppercase font-bold opacity-90 tracking-widest bg-black/10 px-2 py-0.5 rounded-full">Se le pide el soporte al empleado</span>
          </Button>
        )}

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
        // "Recibir" NO cierra la solicitud: la deja en estado 'aceptado', que
        // sigue abierto. El mensaje anterior decía "la solicitud ha finalizado"
        // para los tres casos, y por eso quedaban procesos meses en pendientes.
        successInfo.status === 'soporte_pendiente' ? (
          <div className="mt-4 p-4 rounded-xl bg-orange-50 border border-orange-200 animate-in fade-in slide-in-from-top-2">
            <p className="text-orange-800 font-bold mb-1 flex items-center gap-2">
              <Paperclip className="w-5 h-5" /> Aprobado con soporte pendiente
            </p>
            <p className="text-sm text-orange-800">
              Le avisamos al empleado en la plataforma y por correo que debe subir el soporte.
              Si en 3 días no lo ha subido, te llegará una notificación.
            </p>
          </div>
        ) : successInfo.status === 'aceptado' ? (
          <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 animate-in fade-in slide-in-from-top-2">
            <p className="text-amber-800 font-bold mb-1 flex items-center gap-2">
              <ThumbsUp className="w-5 h-5" /> Recibido correctamente
            </p>
            <p className="text-sm text-amber-800">
              La solicitud quedó <strong>a tu cargo</strong> y sigue <strong>abierta</strong>.
              Todavía falta cerrarla: cuando termines, pulsa <strong>Resolver</strong> para
              finalizarla. Mientras tanto seguirá apareciendo en tus pendientes.
            </p>
          </div>
        ) : (
          <div className="mt-4 p-4 rounded-xl bg-green-50 border border-green-200 animate-in fade-in slide-in-from-top-2">
            <p className="text-green-800 font-bold mb-1 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" /> {successInfo.status === 'resuelto' ? 'Finalizado correctamente' : 'Rechazado correctamente'}
            </p>
            <p className="text-sm text-green-700">
              {successInfo.nextRole
                ? <>La solicitud ha sido enviada a: <strong className="uppercase">{roleLabels[successInfo.nextRole] || successInfo.nextRole}</strong></>
                : <>La solicitud ha finalizado con estado: <strong className="uppercase">{successInfo.status === 'resuelto' ? 'RESUELTO' : 'RECHAZADO'}</strong></>
              }
            </p>
          </div>
        )
      )}
    </div>
  );
};

