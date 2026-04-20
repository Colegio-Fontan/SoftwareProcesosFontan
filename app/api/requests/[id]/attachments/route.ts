import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth';
import { RequestModel } from '@/lib/models/request';
import { AttachmentModel } from '@/lib/models/attachment';
import { ACCEPTED_ATTACHMENT_MIME_TYPES, MAX_ATTACHMENT_MB } from '@/lib/storage';

const attachmentSchema = z.object({
  url: z.string().url(),
  pathname: z.string().min(1),
  original_filename: z.string().min(1),
  mime_type: z.string().min(1),
  size: z.number().int().nonnegative(),
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

  const requestId = parseInt(id);
  const existingRequest = await RequestModel.findById(requestId);

  if (!existingRequest) {
    return NextResponse.json(
      { error: 'Solicitud no encontrada' },
      { status: 404 }
    );
  }

  // Verificar permisos: dueño, asignado actual, responsable por rol, o admin
  const isOwner = existingRequest.user_id === user.id;
  const isAssigned = existingRequest.assigned_to_user_id === user.id;
  const isApproverRole = existingRequest.current_approver_role === user.role;
  const isAdmin = user.role === 'admin';

  if (!isOwner && !isAssigned && !isApproverRole && !isAdmin) {
    return NextResponse.json(
      { error: 'No tienes permisos para agregar archivos a esta solicitud' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const data = attachmentSchema.parse(body);

    // Defensa en profundidad: validamos tipo y tamaño aunque el token del
    // blob ya los filtre.
    if (!ACCEPTED_ATTACHMENT_MIME_TYPES.includes(data.mime_type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido' },
        { status: 400 }
      );
    }
    if (data.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `El archivo excede ${MAX_ATTACHMENT_MB}MB` },
        { status: 400 }
      );
    }

    const attachment = await AttachmentModel.create(
      requestId,
      data.pathname,
      data.original_filename,
      data.mime_type,
      data.size,
      data.url
    );

    return NextResponse.json({ attachment }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error registrando adjunto:', error);
    return NextResponse.json(
      { error: 'Error al registrar el archivo' },
      { status: 500 }
    );
  }
}
