'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Request } from '@/types';
import { format } from 'date-fns';

interface RequestCardProps {
  request: Request;
}

const typeLabels: Record<string, string> = {
  compra: 'Compra/Materiales',
  permiso: 'Permiso de Ausencia',
  soporte: 'Soporte Técnico',
  certificado: 'Certificado/Documento',
  mantenimiento: 'Mantenimiento / Servicios G.',
  personalizada: 'Solicitud Personalizada',
};

const roleLabels: Record<string, string> = {
  empleado: 'Empleado',
  sistemas: 'Sistemas',
  gestion_humana: 'Gestión Humana',
  cartera: 'Cartera',
  gerencia: 'Gerencia',
  rectoria: 'Rectoría',
  servicios_generales: 'Servicios Generales',
  admin: 'Administrador',
};

const statusLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  en_proceso: 'En Proceso',
  aceptado: 'Aceptado',
  rechazado: 'Rechazado',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
};

const urgencyLabels: Record<string, string> = {
  bajo: 'Bajo',
  medio: 'Medio',
  alto: 'Alto',
};

const statusVariants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  pendiente: 'warning',
  en_proceso: 'info',
  aceptado: 'success',
  rechazado: 'danger',
  resuelto: 'success',
  cerrado: 'default',
};

const urgencyVariants: Record<string, 'default' | 'warning' | 'danger'> = {
  bajo: 'default',
  medio: 'warning',
  alto: 'danger',
};

export const RequestCard: React.FC<RequestCardProps> = ({ request }) => {
  return (
    <Link href={`/requests/${request.id}`}>
      <Card hover className="cursor-pointer">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {request.title}
            </h3>
            <p className="text-sm text-gray-600 mb-2 line-clamp-2">{request.description}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Badge variant="info">{typeLabels[request.type]}</Badge>
          <Badge variant={statusVariants[request.status]}>
            {statusLabels[request.status]}
          </Badge>
          <Badge variant={urgencyVariants[request.urgency]}>
            Urgencia: {urgencyLabels[request.urgency]}
          </Badge>
          {(request.custom_flow || request.assigned_to_user_id) && (
            <Badge variant="default">
              ⚙️ Reenviado/Personalizado
            </Badge>
          )}
        </div>

        <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-100">
          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">
            {request.status === 'aceptado' || request.status === 'rechazado' || request.status === 'resuelto'
              ? 'Resultado Final'
              : 'Responsable actual'}
          </p>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${request.status === 'aceptado' ? 'text-green-600' :
                request.status === 'rechazado' ? 'text-red-600' : 'text-primary'
              }`}>
              {request.status === 'aceptado' ? '✅ Aceptado' :
                request.status === 'rechazado' ? '❌ Rechazado' :
                  request.assigned_to
                    ? `👤 ${request.assigned_to.name}`
                    : request.current_approver_role
                      ? `🏢 ${roleLabels[request.current_approver_role] || request.current_approver_role}`
                      : 'Nadie (Finalizado)'
              }
            </span>
          </div>

          {/* Veredicto de respuesta */}
          {(request.status === 'aceptado' || request.status === 'rechazado' || request.status === 'resuelto') && request.last_comment && (
            <div className="mt-2 text-xs text-gray-600 italic border-t border-gray-200 pt-2">
              <span className="font-bold not-italic">Por qué: </span>
              "{request.last_comment}"
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t mt-auto">
          <span>
            De: <span className="font-medium text-gray-700">{request.user?.name || 'Usuario desconocido'}</span>
          </span>
          <span>
            {format(new Date(request.created_at), "d 'de' MMM")}
          </span>
        </div>
      </Card>
    </Link>
  );
};

