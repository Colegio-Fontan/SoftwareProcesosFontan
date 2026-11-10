import sql from '../db';
import type { Notification, NotificationType } from '@/types';

export class NotificationModel {
  static async create(
    userId: number,
    tipo: NotificationType,
    mensaje: string,
    requestId?: number | null
  ): Promise<void> {
    await sql`
      INSERT INTO notifications (user_id, request_id, tipo, mensaje)
      VALUES (${userId}, ${requestId ?? null}, ${tipo}, ${mensaje})
    `;
  }

  static async findByUser(userId: number, limit = 30): Promise<Notification[]> {
    const rows = await sql`
      SELECT * FROM notifications
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    return rows as Notification[];
  }

  static async countUnread(userId: number): Promise<number> {
    const rows = await sql`SELECT COUNT(*) AS total FROM notifications WHERE user_id = ${userId} AND leida = false`;
    return parseInt(rows[0].total);
  }

  static async markRead(userId: number, ids?: number[]): Promise<void> {
    if (ids && ids.length > 0) {
      await sql`UPDATE notifications SET leida = true WHERE user_id = ${userId} AND id = ANY(${ids})`;
    } else {
      await sql`UPDATE notifications SET leida = true WHERE user_id = ${userId} AND leida = false`;
    }
  }
}
