import sql from '../db';
import type { Request, CreateRequestInput, RequestType, RequestStatus, UserRole } from '@/types';
import { UserModel } from './user';
import { sendProcessAssignmentNotification } from '../email';
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
      assigned_to_role,
    } = input;

    let currentApproverRole: UserRole | null = null;
    let assignedToUserId: number | null = null;
    let isCustomFlow = false;

    if (assigned_to_user_id) {
      assignedToUserId = assigned_to_user_id;
      isCustomFlow = true;
    } else if (assigned_to_role) {
      currentApproverRole = assigned_to_role;
      isCustomFlow = true;
    } else {
      currentApproverRole = this.getInitialApproverRole(type);
    }

    const rows = await sql`
      INSERT INTO requests (type, title, description, reason, urgency, user_id, current_approver_role, assigned_to_user_id, custom_flow)
      VALUES (${type}, ${title}, ${description}, ${reason || null}, ${urgency}, ${userId}, ${currentApproverRole}, ${assignedToUserId}, ${isCustomFlow})
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
      currentApproverRole as string | undefined,
      assignedToUserId as number | undefined
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
      AND status IN ('pendiente', 'en_proceso')
      ORDER BY 
        CASE urgency
          WHEN 'alto' THEN 1
          WHEN 'medio' THEN 2
          WHEN 'bajo' THEN 3
        END,
        created_at ASC
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
      AND status IN ('pendiente', 'en_proceso')
      ORDER BY 
        CASE urgency
          WHEN 'alto' THEN 1
          WHEN 'medio' THEN 2
          WHEN 'bajo' THEN 3
        END,
        created_at ASC
    ` as Request[];

    const results = await Promise.all(requests.map(async req => {
      const user = await UserModel.findById(req.user_id);
      const assigned_to = await UserModel.findById(userId);
      return { ...req, user, assigned_to };
    }));

    return results as Request[];
  }

  static async getAll(): Promise<Request[]> {
    const requests = await sql`
      SELECT * FROM requests 
      ORDER BY created_at DESC
    ` as Request[];

    const results = await Promise.all(requests.map(async req => {
      const user = await UserModel.findById(req.user_id);
      return { ...req, user };
    }));

    return results as Request[];
  }

  static async updateStatus(
    id: number,
    status: RequestStatus,
    userId: number,
    comment?: string
  ): Promise<Request> {
    const request = await this.findById(id);
    if (!request) throw new Error('Solicitud no encontrada');

    const previousStatus = request.status;
    let newApproverRole: UserRole | null = request.current_approver_role || null;
    let newStatus = status;

    if (status === 'aceptado') {
      newApproverRole = null;
      newStatus = 'aceptado';
    }

    if (status === 'resuelto' || status === 'cerrado' || status === 'rechazado') {
      newApproverRole = null;
    }

    await sql`
      UPDATE requests 
      SET status = ${newStatus}, current_approver_role = ${newApproverRole}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `;

    const action = status === 'aceptado' ? 'aprobado' : status === 'rechazado' ? 'rechazado' : 'enviado';
    await this.addHistory(id, userId, action, comment, previousStatus, newStatus, newApproverRole as string | null);

    return (await this.findById(id))!;
  }

  static getInitialApproverRole(type: RequestType): UserRole | null {
    switch (type) {
      case 'compra': return 'cartera';
      case 'permiso':
      case 'certificado': return 'gestion_humana';
      case 'soporte': return 'sistemas';
      case 'mantenimiento': return 'servicios_generales';
      case 'personalizada': return 'gerencia';
      default: return null;
    }
  }

  static getNextApproverRole(currentRole: UserRole | null, type: RequestType): UserRole | null {
    if (!currentRole) return null;
    const approvalFlow: Record<string, string | null> = {
      cartera: 'gerencia',
      sistemas: 'gerencia',
      gestion_humana: 'gerencia',
      servicios_generales: 'gerencia',
      gerencia: type === 'compra' ? 'rectoria' : null,
      rectoria: null,
      empleado: null,
      admin: null,
    };
    return (approvalFlow[currentRole] as UserRole) || null;
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

    return (await this.findById(requestId))!;
  }
}
