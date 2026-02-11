import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { RequestModel } from '@/lib/models/request';
import { z } from 'zod';

const forwardRequestSchema = z.object({
  action: z.literal('forward'),
  comment: z.string().min(1, 'El comentario es requerido'),
  forward_to_user_id: z.number().optional(),
  forward_to_role: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  try {
    const requestId = parseInt(id);
    const existingRequest = await RequestModel.findById(requestId);

    if (!existingRequest) {
      return NextResponse.json(
        { error: 'Solicitud no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que el usuario tiene la solicitud asignada (por rol o directo)
    const hasAccess =
      existingRequest.current_approver_role === user.role ||
      existingRequest.assigned_to_user_id === user.id;

    if (!hasAccess && existingRequest.user_id !== user.id) {
      return NextResponse.json(
        { error: 'No tienes permisos para reenviar esta solicitud' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const data = forwardRequestSchema.parse(body);

    // Validar que se especificó un destinatario
    if (!data.forward_to_user_id && !data.forward_to_role) {
      return NextResponse.json(
        { error: 'Debes especificar un destinatario (usuario o rol)' },
        { status: 400 }
      );
    }

    // Reenviar la solicitud
    const updatedRequest = await RequestModel.forwardRequest(
      requestId,
      user.id,
      data.comment,
      data.forward_to_user_id || null,
      data.forward_to_role || null
    );

    return NextResponse.json({ request: updatedRequest });
  } catch (error) {
    console.error('Error forwarding request:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Error al reenviar solicitud', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}




