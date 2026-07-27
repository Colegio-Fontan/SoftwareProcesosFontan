import type { RequestStatus } from '@/types';

/** Estados en los que la solicitud todavía requiere que alguien actúe. */
export const OPEN_STATUSES: RequestStatus[] = ['pendiente', 'en_proceso', 'aceptado'];

/** Estados en los que la solicitud ya terminó su ciclo. */
export const CLOSED_STATUSES: RequestStatus[] = ['resuelto', 'cerrado', 'rechazado'];

/** ¿La solicitud sigue viva? Se decide SOLO por el estado, nunca por si tiene responsable. */
export function isOpenStatus(status: RequestStatus | string | null | undefined): boolean {
  return OPEN_STATUSES.includes(status as RequestStatus);
}

export function isClosedStatus(status: RequestStatus | string | null | undefined): boolean {
  return CLOSED_STATUSES.includes(status as RequestStatus);
}

/**
 * Solicitud "huérfana": sigue abierta pero no tiene responsable ni área.
 * Nadie la ve como suya, así que se queda en pendientes indefinidamente.
 */
export function isOrphanRequest(request: {
  status: RequestStatus | string;
  assigned_to_user_id?: number | null;
  current_approver_role?: string | null;
}): boolean {
  return (
    isOpenStatus(request.status) &&
    !request.assigned_to_user_id &&
    !request.current_approver_role
  );
}
