import sql from '../db';
import type { Request, CreateRequestInput, RequestType, RequestStatus, UserRole } from '@/types';
import { UserModel } from './user';
import { AttachmentModel } from './attachment';
import { sendProcessAssignmentNotification, sendProcessResolutionNotification, sendProcessStatusUpdateNotification } from '../email';
import { getUserById } from '../utils/get-users-by-role';

export class RequestModel {
  static async create(input: CreateRequestInput, userId: number): Promise<Request> {
    const {
      type,
      title,
      description,
      reason,
      urgency = 'medio',
      assigned_to_user_id,
      expected_response_date,
    } = input;

    const currentApproverRole: UserRole | null = null;
    let assignedToUserId: number | null = null;
    let isCustomFlow = false;

    if (assigned_to_user_id) {
      assignedToUserId = assigned_to_user_id;
      isCustomFlow = true; // Manual assignment is always custom flow in this context
    }

    // Role assignment logic removed. 
    // currentApproverRole remains null.

    const rows = await sql`
      INSERT INTO requests (type, title, description, reason, urgency, user_id, current_approver_role, assigned_to_user_id, custom_flow, expected_response_date)
      VALUES (${type}, ${title}, ${description}, ${reason || null}, ${urgency}, ${userId}, ${currentApproverRole}, ${assignedToUserId}, ${isCustomFlow}, ${expected_response_date || null})
      RETURNING *
    `;

    const request = await this.findById(rows[0].id)!;

    const historyComment = isCustomFlow
      ? 'Solicitud creada con flujo personalizado'
      : 'Solicitud creada';

    await this.addHistory(
      request!.id,
      userId,
      'creado',
      historyComment,
      undefined,
      undefined,
      currentApproverRole ?? undefined,
      assignedToUserId ?? undefined
    );

    if (assignedToUserId) {
      await this.sendAssignmentEmail(request!, userId, assignedToUserId, false);
    }

    return request!;
  }

  static async findById(id: number): Promise<Request | undefined> {
    const rows = await sql`SELECT * FROM requests WHERE id = ${id}`;
    if (rows.length === 0) return undefined;
    const request = rows[0] as Request;

    const user = await UserModel.findById(request.user_id);
    const assigned_to = request.assigned_to_user_id
      ? await UserModel.findById(request.assigned_to_user_id)
      : undefined;

    return { ...request, user, assigned_to };
  }

  static async findByUserId(userId: number): Promise<Request[]> {
    const requests = await sql`
      SELECT r.*, 
             (SELECT comment FROM approval_history WHERE request_id = r.id AND comment IS NOT NULL ORDER BY created_at DESC LIMIT 1) as last_comment
      FROM requests r
      WHERE r.user_id = ${userId} 
      ORDER BY r.created_at DESC
    ` as (Request & { last_comment: string | null })[];

    const results = await Promise.all(requests.map(async req => {
      const user = await UserModel.findById(req.user_id);
      const assigned_to = req.assigned_to_user_id
        ? await UserModel.findById(req.assigned_to_user_id)
        : undefined;
      return { ...req, user, assigned_to };
    }));

    return results as Request[];
  }

  static async findByApproverRole(role: UserRole): Promise<Request[]> {
    const requests = await sql`
      SELECT * FROM requests 
      WHERE current_approver_role = ${role} 
      ORDER BY 
        CASE status
          WHEN 'pendiente' THEN 1
          WHEN 'en_proceso' THEN 1
          WHEN 'aceptado' THEN 2
          ELSE 3
        END,
        CASE urgency
          WHEN 'alto' THEN 1
          WHEN 'medio' THEN 2
          WHEN 'bajo' THEN 3
        END,
        created_at DESC
    ` as Request[];

    const results = await Promise.all(requests.map(async req => {
      const user = await UserModel.findById(req.user_id);
      const assigned_to = req.assigned_to_user_id
        ? await UserModel.findById(req.assigned_to_user_id)
        : undefined;
      return { ...req, user, assigned_to };
    }));

    return results as Request[];
  }

  static async findByAssignedUser(userId: number): Promise<Request[]> {
    const requests = await sql`
      SELECT * FROM requests 
      WHERE assigned_to_user_id = ${userId} 
      ORDER BY 
        CASE status
          WHEN 'pendiente' THEN 1
          WHEN 'en_proceso' THEN 1
          WHEN 'aceptado' THEN 2
          ELSE 3
        END,
        CASE urgency
          WHEN 'alto' THEN 1
          WHEN 'medio' THEN 2
          WHEN 'bajo' THEN 3
        END,
        created_at DESC
    ` as Request[];

    const results = await Promise.all(requests.map(async req => {
      const user = await UserModel.findById(req.user_id);
      const assigned_to = await UserModel.findById(userId);
      return { ...req, user, assigned_to };
    }));

    return results as Request[];
  }

  static async findUnassigned(excludeUserId?: number): Promise<Request[]> {
    const requests = excludeUserId
      ? await sql`
          SELECT * FROM requests 
          WHERE current_approver_role IS NULL 
          AND assigned_to_user_id IS NULL
          AND status IN ('pendiente', 'en_proceso')
          AND user_id != ${excludeUserId}
          ORDER BY 
            CASE status
              WHEN 'pendiente' THEN 1
              WHEN 'en_proceso' THEN 1
              WHEN 'aceptado' THEN 2
              ELSE 3
            END,
            CASE urgency
              WHEN 'alto' THEN 1
              WHEN 'medio' THEN 2
              WHEN 'bajo' THEN 3
            END,
            created_at DESC
        `
      : await sql`
          SELECT * FROM requests 
          WHERE current_approver_role IS NULL 
          AND assigned_to_user_id IS NULL
          AND status IN ('pendiente', 'en_proceso')
          ORDER BY 
            CASE status
              WHEN 'pendiente' THEN 1
              WHEN 'en_proceso' THEN 1
              WHEN 'aceptado' THEN 2
              ELSE 3
            END,
            CASE urgency
              WHEN 'alto' THEN 1
              WHEN 'medio' THEN 2
              WHEN 'bajo' THEN 3
            END,
            created_at DESC
        `;

    const results = await Promise.all((requests as Request[]).map(async req => {
      const user = await UserModel.findById(req.user_id);
      return { ...req, user };
    }));

    return results as Request[];
  }

  static async getAll(): Promise<Request[]> {
    const requests = await sql`
      SELECT r.*,
             (SELECT u2.name FROM approval_history ah
              JOIN users u2 ON ah.user_id = u2.id
              WHERE ah.request_id = r.id
              ORDER BY ah.created_at DESC LIMIT 1) as last_actor_name,
             (SELECT u2.role FROM approval_history ah
              JOIN users u2 ON ah.user_id = u2.id
              WHERE ah.request_id = r.id
              ORDER BY ah.created_at DESC LIMIT 1) as last_actor_role
      FROM requests r
      ORDER BY r.created_at DESC
    ` as (Request & { last_actor_name: string | null; last_actor_role: string | null })[];

    const results = await Promise.all(requests.map(async req => {
      const user = await UserModel.findById(req.user_id);
      const assigned_to = req.assigned_to_user_id
        ? await UserModel.findById(req.assigned_to_user_id)
        : undefined;
      return { ...req, user, assigned_to };
    }));

    return results as Request[];
  }

  static async updateStatus(
    id: number,
    status: RequestStatus,
    userId: number,
    comment?: string,
    expectedResponseDate?: string
  ): Promise<Request> {
    const request = await this.findById(id);
    if (!request) throw new Error('Solicitud no encontrada');

    const previousStatus = request.status;
    let newApproverRole: UserRole | null = request.current_approver_role || null;
    let newAssignedToUserId: number | null = request.assigned_to_user_id || null;
    let newStatus = status;

    if (status === 'aceptado') {
      newApproverRole = null;
      newStatus = 'aceptado';
      newAssignedToUserId = userId; // Asignar al usuario que recibe el proceso
    }

    if (status === 'resuelto' || status === 'cerrado' || status === 'rechazado') {
      newApproverRole = null;
    }

    if (status === 'aceptado' && expectedResponseDate) {
      await sql`
        UPDATE requests 
        SET status = ${newStatus}, current_approver_role = ${newApproverRole}, assigned_to_user_id = ${newAssignedToUserId}, expected_response_date = ${expectedResponseDate}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `;
    } else {
      await sql`
        UPDATE requests 
        SET status = ${newStatus}, current_approver_role = ${newApproverRole}, assigned_to_user_id = ${newAssignedToUserId}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `;
    }

    const action = status === 'aceptado' ? 'aprobado' : status === 'rechazado' ? 'rechazado' : status === 'resuelto' ? 'comentado' : 'enviado';
    await this.addHistory(id, userId, action, comment, previousStatus, newStatus, newApproverRole as string | null);

    if (status === 'resuelto') {
      await this.sendResolutionEmail((await this.findById(id))!, userId, comment);
    } else if (status === 'aceptado' || status === 'rechazado') {
      await this.sendStatusUpdateEmail((await this.findById(id))!, userId, status, comment, expectedResponseDate);
    }

    return (await this.findById(id))!;
  }

  private static async sendStatusUpdateEmail(request: Request, actionUserId: number, newStatus: string, comment?: string, expectedDate?: string) {
    try {
      const creator = await getUserById(request.user_id);
      if (!creator || !creator.email) return;

      const actor = await getUserById(actionUserId);

      const processData = {
        processId: request.id,
        processType: request.type,
        processTitle: request.title,
        processDescription: request.description,
        createdBy: { name: creator.name, email: creator.email },
        urgency: request.urgency,
        newStatus,
        statusComment: comment,
        updatedBy: actor ? { name: actor.name, role: actor.role || undefined } : undefined,
        expectedDate: expectedDate || request.expected_response_date || undefined
      };

      await sendProcessStatusUpdateNotification(creator, processData);
    } catch (error) {
      console.error('❌ Error al enviar notificación de actualización de estado:', error);
    }
  }

  private static async sendResolutionEmail(request: Request, actionUserId: number, comment?: string) {
    try {
      const creator = await getUserById(request.user_id);
      if (!creator || !creator.email) return;

      const processData = {
        processId: request.id,
        processType: request.type,
        processTitle: request.title,
        processDescription: request.description,
        createdBy: { name: creator.name, email: creator.email },
        urgency: request.urgency,
        resolutionComment: comment,
      };

      await sendProcessResolutionNotification(creator, processData);
    } catch (error) {
      console.error('❌ Error al enviar notificación de resolución:', error);
    }
  }

  static getInitialApproverRole(): UserRole | null {
    return null; // Roles are disabled
  }

  static getNextApproverRole(): UserRole | null {
    return null; // Roles are disabled
  }

  static async addHistory(
    requestId: number,
    userId: number,
    action: 'creado' | 'enviado' | 'aprobado' | 'rechazado' | 'comentado',
    comment?: string,
    previousStatus?: string,
    newStatus?: string,
    forwardedToRole?: string | null,
    forwardedToUserId?: number | null
  ): Promise<void> {
    await sql`
      INSERT INTO approval_history (
        request_id, user_id, action, comment, 
        previous_status, new_status, 
        forwarded_to_role, forwarded_to_user_id
      )
      VALUES (
        ${requestId}, ${userId}, ${action}, ${comment || null},
        ${previousStatus || null}, ${newStatus || null},
        ${forwardedToRole || null}, ${forwardedToUserId || null}
      )
    `;
  }

  private static async sendAssignmentEmail(
    request: Request,
    actionUserId: number,
    targetUserId: number,
    isForwarded: boolean
  ) {
    try {
      const assignedUser = await getUserById(targetUserId);
      if (!assignedUser || !assignedUser.email) return;

      const creator = await getUserById(request.user_id);
      if (!creator) return;

      let forwarder = null;
      if (isForwarded) {
        forwarder = await getUserById(actionUserId);
      }

      const processData = {
        processId: request.id,
        processType: request.type,
        processTitle: request.title,
        processDescription: request.description,
        createdBy: { name: creator.name, email: creator.email },
        urgency: request.urgency,
        isForwarded,
        forwardedBy: forwarder ? { name: forwarder.name, email: forwarder.email } : undefined,
      };

      await sendProcessAssignmentNotification(assignedUser, processData);
    } catch (error) {
      console.error('❌ Error al enviar notificación por correo:', error);
    }
  }

  static async getHistory(requestId: number) {
    return await sql`
      SELECT ah.*, 
             u.name as user_name, u.role as user_role,
             f.name as forwarded_to_user_name
      FROM approval_history ah
      JOIN users u ON ah.user_id = u.id
      LEFT JOIN users f ON ah.forwarded_to_user_id = f.id
      WHERE ah.request_id = ${requestId}
      ORDER BY ah.created_at ASC
    `;
  }

  static async forwardRequest(
    requestId: number,
    userId: number,
    comment: string,
    forwardToUserId: number | null,
    forwardToRole: string | null
  ): Promise<Request> {
    const request = await this.findById(requestId);
    if (!request) throw new Error('Solicitud no encontrada');

    let newApproverRole: string | null = null;
    let newAssignedUserId: number | null = null;

    if (forwardToUserId) {
      newAssignedUserId = forwardToUserId;
    } else if (forwardToRole) {
      newApproverRole = forwardToRole;
    }

    await sql`
      UPDATE requests 
      SET current_approver_role = ${newApproverRole}, 
          assigned_to_user_id = ${newAssignedUserId},
          custom_flow = true,
          status = 'pendiente',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${requestId}
    `;

    await this.addHistory(
      requestId,
      userId,
      'comentado',
      `Reenviado: ${comment}`,
      request.status,
      'pendiente',
      newApproverRole,
      newAssignedUserId
    );

    if (newAssignedUserId) {
      await this.sendAssignmentEmail(request, userId, newAssignedUserId, true);
    }

    // Notificar al creador sobre el reenvío
    try {
      const creator = await getUserById(request.user_id);
      if (creator && creator.email) {
        const actor = await getUserById(userId);
        const processData = {
          processId: request.id,
          processType: request.type,
          processTitle: request.title,
          processDescription: request.description,
          createdBy: { name: creator.name, email: creator.email },
          urgency: request.urgency,
          newStatus: 'reenviado',
          statusComment: comment,
          updatedBy: actor ? { name: actor.name, role: actor.role || undefined } : undefined
        };
        await sendProcessStatusUpdateNotification(creator, processData, true);
      }
    } catch (error) {
      console.error('❌ Error al enviar notificación de reenvío al creador:', error);
    }

    return (await this.findById(requestId))!;
  }

  static async delete(id: number): Promise<void> {
    // Eliminar archivos físicos y registros de adjuntos
    const attachments = await AttachmentModel.findByRequestId(id);
    for (const attachment of attachments) {
      await AttachmentModel.delete(attachment.id);
    }
    // Eliminar historial
    await sql`DELETE FROM approval_history WHERE request_id = ${id}`;
    // Eliminar la solicitud
    await sql`DELETE FROM requests WHERE id = ${id}`;
  }
}
