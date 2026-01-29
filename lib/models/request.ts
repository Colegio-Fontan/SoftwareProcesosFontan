import db from '../db';
import type { Request, CreateRequestInput, RequestType, RequestStatus, UserRole } from '@/types';
import { UserModel } from './user';

export class RequestModel {
  static create(input: CreateRequestInput, userId: number): Request {
    const {
      type,
      title,
      description,
      reason,
      urgency = 'medio',
      assigned_to_user_id,
      assigned_to_role,
      custom_flow = false
    } = input;

    let currentApproverRole: UserRole | null = null;
    let assignedToUserId: number | null = null;
    let isCustomFlow = false;

    // Si se especificó un usuario o rol personalizado
    if (assigned_to_user_id) {
      assignedToUserId = assigned_to_user_id;
      isCustomFlow = true;
    } else if (assigned_to_role) {
      currentApproverRole = assigned_to_role;
      isCustomFlow = true;
    } else {
      // Flujo automático estándar
      currentApproverRole = this.getInitialApproverRole(type);
    }

    const result = db.prepare(`
      INSERT INTO requests (type, title, description, reason, urgency, user_id, current_approver_role, assigned_to_user_id, custom_flow)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      type,
      title,
      description,
      reason || null,
      urgency,
      userId,
      currentApproverRole,
      assignedToUserId,
      isCustomFlow ? 1 : 0
    );

    const request = this.findById(result.lastInsertRowid as number)!;

    // Crear entrada en historial
    const historyComment = isCustomFlow
      ? 'Solicitud creada con flujo personalizado'
      : 'Solicitud creada';
    this.addHistory(
      request.id,
      userId,
      'creado',
      historyComment,
      undefined,
      undefined,
      currentApproverRole,
      assignedToUserId
    );

    return request;
  }

  static findById(id: number): Request | undefined {
    const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(id) as Request | undefined;
    if (!request) return undefined;

    const user = UserModel.findById(request.user_id);
    const assigned_to = request.assigned_to_user_id
      ? UserModel.findById(request.assigned_to_user_id)
      : undefined;

    return { ...request, user, assigned_to };
  }

  static findByUserId(userId: number): Request[] {
    const requests = db.prepare(`
      SELECT r.*, 
             (SELECT comment FROM approval_history WHERE request_id = r.id AND comment IS NOT NULL ORDER BY created_at DESC LIMIT 1) as last_comment
      FROM requests r
      WHERE r.user_id = ? 
      ORDER BY r.created_at DESC
    `).all(userId) as any[];

    return requests.map(req => {
      const user = UserModel.findById(req.user_id);
      const assigned_to = req.assigned_to_user_id
        ? UserModel.findById(req.assigned_to_user_id)
        : undefined;
      return { ...req, user, assigned_to };
    });
  }

  static findByApproverRole(role: UserRole): Request[] {
    const requests = db.prepare(`
      SELECT * FROM requests 
      WHERE current_approver_role = ? 
      AND status IN ('pendiente', 'en_proceso')
      ORDER BY 
        CASE urgency
          WHEN 'alto' THEN 1
          WHEN 'medio' THEN 2
          WHEN 'bajo' THEN 3
        END,
        created_at ASC
    `).all(role) as Request[];

    return requests.map(req => {
      const user = UserModel.findById(req.user_id);
      const assigned_to = req.assigned_to_user_id
        ? UserModel.findById(req.assigned_to_user_id)
        : undefined;
      return { ...req, user, assigned_to };
    });
  }

  static findByAssignedUser(userId: number): Request[] {
    const requests = db.prepare(`
      SELECT * FROM requests 
      WHERE assigned_to_user_id = ? 
      AND status IN ('pendiente', 'en_proceso')
      ORDER BY 
        CASE urgency
          WHEN 'alto' THEN 1
          WHEN 'medio' THEN 2
          WHEN 'bajo' THEN 3
        END,
        created_at ASC
    `).all(userId) as Request[];

    return requests.map(req => {
      const user = UserModel.findById(req.user_id);
      const assigned_to = UserModel.findById(userId);
      return { ...req, user, assigned_to };
    });
  }

  static getAll(): Request[] {
    const requests = db.prepare(`
      SELECT * FROM requests 
      ORDER BY created_at DESC
    `).all() as Request[];

    return requests.map(req => {
      const user = UserModel.findById(req.user_id);
      return { ...req, user };
    });
  }

  static updateStatus(
    id: number,
    status: RequestStatus,
    userId: number,
    comment?: string
  ): Request {
    const request = this.findById(id);
    if (!request) throw new Error('Solicitud no encontrada');

    const previousStatus = request.status;
    let newApproverRole: UserRole | null = request.current_approver_role || null;
    let newStatus = status;

    // Si se aprueba, ya no escalamos automáticamente.
    // El aprobador debe usar "Reenviar" si quiere que siga el flujo.
    if (status === 'aceptado') {
      newApproverRole = null;
      newStatus = 'aceptado';
    }

    // Si se resuelve o cierra, ya no hay aprobador pendiente
    if (status === 'resuelto' || status === 'cerrado' || status === 'rechazado') {
      newApproverRole = null;
    }

    db.prepare(`
      UPDATE requests 
      SET status = ?, current_approver_role = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newStatus, newApproverRole, id);

    // Agregar al historial
    const action = status === 'aceptado' ? 'aprobado' : status === 'rechazado' ? 'rechazado' : 'enviado';
    this.addHistory(id, userId, action, comment, previousStatus, newStatus, newApproverRole);

    return this.findById(id)!;
  }

  static getInitialApproverRole(type: RequestType): UserRole | null {
    switch (type) {
      case 'compra':
        return 'cartera';
      case 'permiso':
      case 'certificado':
        return 'gestion_humana';
      case 'soporte':
        return 'sistemas';
      case 'mantenimiento':
        return 'servicios_generales';
      case 'personalizada':
        return 'gerencia'; // Las solicitudes personalizadas van a gerencia para asignar
      default:
        return null;
    }
  }

  static getNextApproverRole(currentRole: UserRole | null, type: RequestType): UserRole | null {
    if (!currentRole) return null;

    const approvalFlow: Record<UserRole, UserRole | null> = {
      cartera: 'gerencia',
      sistemas: 'gerencia',
      gestion_humana: 'gerencia',
      servicios_generales: 'gerencia',
      // Solo las solicitudes de compra escalan de gerencia a rectoría
      gerencia: type === 'compra' ? 'rectoria' : null,
      rectoria: null, // Fin del flujo
      empleado: null,
      admin: null,
    };

    return approvalFlow[currentRole] || null;
  }

  static addHistory(
    requestId: number,
    userId: number,
    action: 'creado' | 'enviado' | 'aprobado' | 'rechazado' | 'comentado',
    comment?: string,
    previousStatus?: string,
    newStatus?: string,
    forwardedToRole?: string | null,
    forwardedToUserId?: number | null
  ): void {
    db.prepare(`
      INSERT INTO approval_history (
        request_id, user_id, action, comment, 
        previous_status, new_status, 
        forwarded_to_role, forwarded_to_user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      requestId, userId, action, comment || null,
      previousStatus || null, newStatus || null,
      forwardedToRole || null, forwardedToUserId || null
    );
  }

  static getHistory(requestId: number) {
    // DIAGNÓSTICO DE BASE DE DATOS
    try {
      const cols = db.prepare("PRAGMA table_info(approval_history)").all().map((c: any) => c.name);
      console.log('--- DB DIAGNOSTIC (approval_history) ---');
      console.log('Detected Columns:', cols);
      console.log('----------------------------------------');
    } catch (e) {
      console.error('Diagnostic failed:', e);
    }

    const history = db.prepare(`
      SELECT ah.*, 
             u.name as user_name, u.role as user_role,
             f.name as forwarded_to_user_name
      FROM approval_history ah
      JOIN users u ON ah.user_id = u.id
      LEFT JOIN users f ON ah.forwarded_to_user_id = f.id
      WHERE ah.request_id = ?
      ORDER BY ah.created_at ASC
    `).all(requestId);

    return history;
  }

  static forwardRequest(
    requestId: number,
    userId: number,
    comment: string,
    forwardToUserId: number | null,
    forwardToRole: string | null
  ): Request {
    const request = this.findById(requestId);
    if (!request) throw new Error('Solicitud no encontrada');

    // Actualizar el destinatario
    let newApproverRole: string | null = null;
    let newAssignedUserId: number | null = null;

    if (forwardToUserId) {
      newAssignedUserId = forwardToUserId;
    } else if (forwardToRole) {
      newApproverRole = forwardToRole;
    }

    db.prepare(`
      UPDATE requests 
      SET current_approver_role = ?, 
          assigned_to_user_id = ?,
          custom_flow = 1,
          status = 'pendiente',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newApproverRole, newAssignedUserId, requestId);

    // Agregar al historial como "reenviado"
    this.addHistory(
      requestId,
      userId,
      'comentado',
      `Reenviado: ${comment}`,
      request.status,
      'pendiente',
      newApproverRole,
      newAssignedUserId
    );

    return this.findById(requestId)!;
  }
}

