import sql from './db';
import { RequestModel } from './models/request';
import { NotificationModel } from './models/notification';
import { sendSoporteNotification } from './email';
import { getUserById } from './utils/get-users-by-role';
import { formatFechaAusencia } from './utils/request-description';
import type { Request } from '@/types';

/** Días que tiene el empleado para subir el soporte antes de avisarle al aprobador. */
export const DIAS_LIMITE_SOPORTE = 3;

function describirAusencia(request: Pick<Request, 'tipo_ausencia' | 'fecha_ausencia' | 'title'>): string {
  const fecha = formatFechaAusencia(request.fecha_ausencia);
  return [request.tipo_ausencia || request.title, fecha].filter(Boolean).join(' del ');
}

/**
 * El aprobador acepta la ausencia pero deja pendiente el soporte (incapacidad,
 * constancia de la cita, etc.). La solicitud queda "aceptada" y a su cargo, y
 * se le avisa al empleado en la plataforma y por correo que debe subirlo.
 */
export async function aprobarConSoportePendiente(requestId: number, approverId: number, comment?: string): Promise<Request> {
  const request = await RequestModel.findById(requestId);
  if (!request) throw new Error('Solicitud no encontrada');
  if (request.type !== 'permiso') throw new Error('Solo las ausencias pueden quedar con soporte pendiente');

  await sql`
    UPDATE requests
    SET status = 'aceptado',
        current_approver_role = NULL,
        assigned_to_user_id = ${approverId},
        soporte_estado = 'pendiente',
        soporte_solicitado_por = ${approverId},
        soporte_solicitado_at = CURRENT_TIMESTAMP,
        soporte_entregado_at = NULL,
        soporte_alerta_at = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${requestId}
  `;

  const nota = comment?.trim();
  await RequestModel.addHistory(
    requestId,
    approverId,
    'aprobado',
    nota ? `Aprobado con soporte pendiente: ${nota}` : 'Aprobado con soporte pendiente',
    request.status,
    'aceptado'
  );

  const [empleado, aprobador] = await Promise.all([getUserById(request.user_id), getUserById(approverId)]);
  const ausencia = describirAusencia(request);

  if (empleado) {
    await NotificationModel.create(
      empleado.id,
      'soporte_pendiente',
      `${aprobador?.name ?? 'Tu aprobador'} aceptó tu ausencia (${ausencia}). Debes subir el soporte.`,
      requestId
    );
    await sendSoporteNotification(empleado, {
      processId: requestId,
      subject: `📎 Sube el soporte de tu ausencia: ${request.title}`,
      heading: 'Soporte de ausencia pendiente',
      message: `<strong>${aprobador?.name ?? 'Tu aprobador'}</strong> aceptó tu ausencia (<strong>${ausencia}</strong>), pero falta el soporte (incapacidad, constancia de la cita u otro documento).`,
      detail: `Súbelo desde la solicitud en los próximos ${DIAS_LIMITE_SOPORTE} días. Si no lo haces, se le avisará a ${aprobador?.name ?? 'quien la aprobó'}.${nota ? `<br><br>Comentario: "${nota}"` : ''}`,
      buttonLabel: 'Subir soporte',
    });
  }

  return (await RequestModel.findById(requestId))!;
}

/**
 * El empleado subió un archivo a una ausencia con soporte pendiente: se marca
 * como entregado y se le avisa a quien lo pidió.
 */
export async function registrarSoporteEntregado(requestId: number, userId: number): Promise<void> {
  const rows = await sql`
    UPDATE requests
    SET soporte_estado = 'entregado', soporte_entregado_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${requestId} AND user_id = ${userId} AND soporte_estado = 'pendiente'
    RETURNING id, title, tipo_ausencia, fecha_ausencia, soporte_solicitado_por
  `;
  if (rows.length === 0) return;
  const request = rows[0] as Request;

  await RequestModel.addHistory(requestId, userId, 'comentado', 'Soporte de la ausencia entregado');

  const [empleado, aprobador] = await Promise.all([
    getUserById(userId),
    request.soporte_solicitado_por ? getUserById(request.soporte_solicitado_por) : null,
  ]);
  if (!aprobador) return;

  const ausencia = describirAusencia(request);
  await NotificationModel.create(
    aprobador.id,
    'soporte_entregado',
    `${empleado?.name ?? 'El empleado'} subió el soporte de su ausencia (${ausencia}). Ya puedes revisarla y resolverla.`,
    requestId
  );
  await sendSoporteNotification(aprobador, {
    processId: requestId,
    subject: `📎 Soporte recibido: ${request.title}`,
    heading: 'Soporte de ausencia recibido',
    message: `<strong>${empleado?.name ?? 'El empleado'}</strong> subió el soporte de su ausencia (<strong>${ausencia}</strong>).`,
    detail: 'Revísalo y, si está todo en orden, resuelve la solicitud para cerrarla.',
    buttonLabel: 'Revisar soporte',
  });
}

/**
 * Busca ausencias con el soporte pendiente hace más de {@link DIAS_LIMITE_SOPORTE}
 * días y le avisa (una sola vez) a quien la aprobó, con un recordatorio al empleado.
 * Es idempotente: cada solicitud se "reclama" con un UPDATE antes de notificar.
 */
export async function revisarSoportesVencidos(): Promise<number> {
  const vencidas = await sql`
    UPDATE requests
    SET soporte_alerta_at = CURRENT_TIMESTAMP
    WHERE soporte_estado = 'pendiente'
      AND soporte_alerta_at IS NULL
      AND soporte_solicitado_at < NOW() - make_interval(days => ${DIAS_LIMITE_SOPORTE})
    RETURNING id, title, user_id, tipo_ausencia, fecha_ausencia, soporte_solicitado_por
  ` as Request[];

  for (const request of vencidas) {
    try {
      const [empleado, aprobador] = await Promise.all([
        getUserById(request.user_id),
        request.soporte_solicitado_por ? getUserById(request.soporte_solicitado_por) : null,
      ]);
      const ausencia = describirAusencia(request);

      if (aprobador) {
        await NotificationModel.create(
          aprobador.id,
          'soporte_vencido',
          `Pasaron más de ${DIAS_LIMITE_SOPORTE} días y ${empleado?.name ?? 'el empleado'} no ha subido el soporte de su ausencia (${ausencia}).`,
          request.id
        );
        await sendSoporteNotification(aprobador, {
          processId: request.id,
          subject: `⚠️ Soporte sin entregar: ${request.title}`,
          heading: 'Soporte de ausencia sin entregar',
          message: `Pasaron más de ${DIAS_LIMITE_SOPORTE} días desde que aceptaste la ausencia de <strong>${empleado?.name ?? 'el empleado'}</strong> (<strong>${ausencia}</strong>) y todavía no ha subido el soporte.`,
          detail: 'Te recomendamos comunicarte con la persona para que lo entregue.',
          buttonLabel: 'Ver solicitud',
        });
      }

      if (empleado) {
        await NotificationModel.create(
          empleado.id,
          'soporte_pendiente',
          `Recordatorio: todavía no has subido el soporte de tu ausencia (${ausencia}). Ya se le avisó a ${aprobador?.name ?? 'quien la aprobó'}.`,
          request.id
        );
        await sendSoporteNotification(empleado, {
          processId: request.id,
          subject: `⏰ Recordatorio: sube el soporte de tu ausencia`,
          heading: 'Soporte de ausencia vencido',
          message: `Pasaron más de ${DIAS_LIMITE_SOPORTE} días y todavía no has subido el soporte de tu ausencia (<strong>${ausencia}</strong>).`,
          detail: `Ya se le avisó a ${aprobador?.name ?? 'quien la aprobó'}. Súbelo lo antes posible desde la solicitud.`,
          buttonLabel: 'Subir soporte',
        });
      }
    } catch (error) {
      console.error(`❌ Error avisando soporte vencido de la solicitud ${request.id}:`, error);
    }
  }

  return vencidas.length;
}
