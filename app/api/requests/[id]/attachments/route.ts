import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getAuthUser } from '@/lib/auth';
import { RequestModel } from '@/lib/models/request';
import { AttachmentModel } from '@/lib/models/attachment';
import {
  ACCEPTED_ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_MB,
} from '@/lib/storage';

export const runtime = 'nodejs';
// Vercel permite ~4.5MB de body en rutas API (Hobby) y 50MB (Pro).
// Subimos como máximo MAX_ATTACHMENT_MB por archivo para encajar con Hobby.
export const maxDuration = 60;

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
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'No se recibió ningún archivo' },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: 'El archivo está vacío' },
        { status: 400 }
      );
    }

    if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `El archivo excede ${MAX_ATTACHMENT_MB}MB` },
        { status: 413 }
      );
    }

    const mimeType = file.type || 'application/octet-stream';
    if (!ACCEPTED_ATTACHMENT_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido' },
        { status: 400 }
      );
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_');
    const pathname = `requests/${requestId}/${Date.now()}-${safeName}`;

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error(
        '[attachments] BLOB_READ_WRITE_TOKEN no está definido en el entorno'
      );
      return NextResponse.json(
        { error: 'Almacenamiento de archivos no configurado' },
        { status: 500 }
      );
    }

    console.log(
      `[attachments] subiendo a Blob request=${requestId} pathname=${pathname} size=${file.size} mime=${mimeType}`
    );

    const blob = await put(pathname, file, {
      access: 'public',
      contentType: mimeType,
      addRandomSuffix: false,
    });

    console.log(`[attachments] subida OK -> ${blob.url}`);

    const attachment = await AttachmentModel.create(
      requestId,
      blob.pathname,
      file.name,
      mimeType,
      file.size,
      blob.url
    );

    return NextResponse.json({ attachment }, { status: 201 });
  } catch (error) {
    console.error('Error subiendo adjunto:', error);
    const message =
      error instanceof Error ? error.message : 'Error al subir el archivo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
