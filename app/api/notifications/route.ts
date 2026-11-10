import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { NotificationModel } from '@/lib/models/notification';
import { revisarSoportesVencidos } from '@/lib/soporte';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  // Respaldo del cron diario: si alguien entra antes, los avisos de 3 días salen igual.
  try {
    await revisarSoportesVencidos();
  } catch (error) {
    console.error('[GET /api/notifications] revisando soportes vencidos', error);
  }

  const [notifications, unread] = await Promise.all([
    NotificationModel.findByUser(user.id),
    NotificationModel.countUnread(user.id),
  ]);

  return NextResponse.json({ notifications, unread });
}

const markReadSchema = z.object({
  ids: z.array(z.number().int()).optional(),
});

/** Marca como leídas las notificaciones indicadas, o todas si no se envían ids. */
export async function PATCH(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  try {
    const { ids } = markReadSchema.parse(await request.json().catch(() => ({})));
    await NotificationModel.markRead(user.id, ids);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }
    console.error('[PATCH /api/notifications]', error);
    return NextResponse.json({ error: 'Error al actualizar notificaciones' }, { status: 500 });
  }
}
