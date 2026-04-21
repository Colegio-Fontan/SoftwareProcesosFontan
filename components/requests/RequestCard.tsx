'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Request } from '@/types';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Settings, Paperclip, CheckCircle, XCircle, User, Building2, Calendar, AlertTriangle, Clock } from 'lucide-react';

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
  const getExpectedDateInfo = () => {
    if (!request.expected_response_date) return null;

    const date = new Date(request.expected_response_date);
    const isOverdue = isPast(date) && !isToday(date);
    const isUrgent = isToday(date) || isTomorrow(date);

    let colorClass = 'text-gray-500 bg-gray-50 border-gray-100';
    let icon = <Calendar className="w-3 h-3" />;
    let label = 'Esperado para:';

    if (request.status === 'resuelto' || request.status === 'aceptado' || request.status === 'rechazado' || request.status === 'cerrado') {
      colorClass = 'text-gray-400 bg-gray-50 border-gray-100 opacity-60';
      label = 'Fue esperado:';
    } else if (isOverdue) {
      colorClass = 'text-red-700 bg-red-50 border-red-100 font-bold animate-pulse';
      icon = <AlertTriangle className="w-3 h-3" />;
      label = 'VENCIDO:';
    } else if (isUrgent) {
      colorClass = 'text-amber-700 bg-amber-50 border-amber-100 font-semibold';
      icon = <Clock className="w-3 h-3" />;
      label = 'Por vencer:';
    }

    return {
      formattedDate: format(date, "d 'de' MMMM", { locale: es }),
      colorClass,
      icon,
      label
    };
  };

  const dateInfo = getExpectedDateInfo();

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

          {request.attachments && request.attachments.length > 0 && (
            <Badge variant="default">
              <span className="flex items-center gap-1">
                <Paperclip className="w-3 h-3" /> {request.attachments.length}
              </span>
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
            <span className={`text-sm font-semibold flex items-center gap-1 ${request.status === 'aceptado' ? 'text-green-600' :
              request.status === 'rechazado' ? 'text-red-600' : 'text-primary'
              }`}>
              {request.status === 'aceptado' ? <><CheckCircle className="w-4 h-4" /> Aceptado</> :
                request.status === 'rechazado' ? <><XCircle className="w-4 h-4" /> Rechazado</> :
                  request.assigned_to
                    ? <><User className="w-4 h-4" /> {request.assigned_to.name}</>
                    : request.current_approver_role
                      ? <><Building2 className="w-4 h-4" /> {roleLabels[request.current_approver_role] || request.current_approver_role}</>
                      : 'Nadie (Finalizado)'
              }
            </span>
          </div>

          {dateInfo && (
            <div className={`mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${dateInfo.colorClass}`}>
              <span>{dateInfo.icon}</span>
              <span className="uppercase tracking-wider font-bold text-[9px] opacity-70">{dateInfo.label}</span>
              <span className="flex-1">{dateInfo.formattedDate}</span>
            </div>
          )}
          {/* Veredicto de respuesta */}
          {(request.status === 'aceptado' || request.status === 'rechazado' || request.status === 'resuelto') && request.last_comment && (
            <div className="mt-2 text-xs text-gray-600 italic border-t border-gray-200 pt-2">
              <span className="font-bold not-italic">Por qué: </span>
              &quot;{request.last_comment}&quot;
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

