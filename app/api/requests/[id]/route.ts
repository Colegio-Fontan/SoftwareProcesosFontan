import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { RequestModel } from '@/lib/models/request';
import { AttachmentModel } from '@/lib/models/attachment';
import { z } from 'zod';

const updateRequestSchema = z.object({
  status: z.enum(['pendiente', 'en_proceso', 'aceptado', 'rechazado', 'resuelto', 'cerrado']).optional(),
  comment: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { id } = await params;
  const requestId = parseInt(id);
  const requestData = await RequestModel.findById(requestId);

  if (!requestData) {
    return NextResponse.json(
      { error: 'Solicitud no encontrada' },
      { status: 404 }
    );
  }

  // Obtener adjuntos e historial
  const attachments = await AttachmentModel.findByRequestId(requestId);
  const history = await RequestModel.getHistory(requestId);

  return NextResponse.json({
    request: {
      id: requestData.id,
      type: requestData.type,
      title: requestData.title,
      description: requestData.description,
      reason: requestData.reason,
      urgency: requestData.urgency,
      status: requestData.status,
      user_id: requestData.user_id,
      current_approver_role: requestData.current_approver_role,
      assigned_to_user_id: requestData.assigned_to_user_id,
      custom_flow: requestData.custom_flow,
      created_at: requestData.created_at,
      updated_at: requestData.updated_at,
      user: requestData.user,
      assigned_to: requestData.assigned_to,
      attachments,
      history,
    },
  });
}

export async function PATCH(
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
      return NextResponse.json(
        { error: 'Solicitud no encontrada' },
        { status: 404 }
      );
    }

    // Verificar permisos de aprobación
    if (existingRequest.current_approver_role !== user.role && existingRequest.user_id !== user.id) {
      return NextResponse.json(
        { error: 'No tienes permisos para esta acción' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const data = updateRequestSchema.parse(body);

    if (data.status) {
      const updatedRequest = await RequestModel.updateStatus(
        requestId,
        data.status,
        user.id,
        data.comment
      );

      return NextResponse.json({ request: updatedRequest });
    }

    return NextResponse.json({ request: existingRequest });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Error al actualizar solicitud' },
      { status: 500 }
    );
  }
}

