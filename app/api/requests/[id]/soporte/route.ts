import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { RequestModel } from '@/lib/models/request';
import { aprobarConSoportePendiente } from '@/lib/soporte';
import { z } from 'zod';

const soporteSchema = z.object({
  comment: z.string().optional(),
});

/** Aprueba una ausencia dejando pendiente el soporte del empleado. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const requestId = parseInt(id);
    const existingRequest = await RequestModel.findById(requestId);

    if (!existingRequest) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
    }

    if (existingRequest.type !== 'permiso') {
      return NextResponse.json({ error: 'Solo las ausencias pueden quedar con soporte pendiente' }, { status: 400 });
    }

    // Mismas reglas que para aprobar, pero el dueño nunca aprueba su propia ausencia
    const isOwner = existingRequest.user_id === user.id;
    const isApproverByRole = existingRequest.current_approver_role === user.role;
    const isAssignedToUser = existingRequest.assigned_to_user_id === user.id;
    const isUnassigned = !existingRequest.current_approver_role && !existingRequest.assigned_to_user_id;
    const isAdmin = user.role === 'admin';

    if (isOwner || !(isApproverByRole || isAssignedToUser || isUnassigned || isAdmin)) {
      return NextResponse.json({ error: 'No tienes permisos para esta acción' }, { status: 403 });
    }

    if (!['pendiente', 'en_proceso', 'aceptado'].includes(existingRequest.status)) {
      return NextResponse.json({ error: 'Esta solicitud ya fue cerrada' }, { status: 400 });
    }

    const data = soporteSchema.parse(await request.json().catch(() => ({})));
    const updatedRequest = await aprobarConSoportePendiente(requestId, user.id, data.comment);

    return NextResponse.json({ request: updatedRequest });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 });
    }
    console.error('[POST /api/requests/:id/soporte]', error);
    return NextResponse.json({ error: 'Error al aprobar con soporte pendiente' }, { status: 500 });
  }
}
