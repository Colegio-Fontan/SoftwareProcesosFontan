import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { RequestModel } from '@/lib/models/request';
import { AttachmentModel } from '@/lib/models/attachment';
import { writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const requestId = parseInt(params.id);
  const existingRequest = RequestModel.findById(requestId);

  if (!existingRequest) {
    return NextResponse.json(
      { error: 'Solicitud no encontrada' },
      { status: 404 }
    );
  }

  // Verificar que el usuario es el creador de la solicitud
  if (existingRequest.user_id !== user.id) {
    return NextResponse.json(
      { error: 'No tienes permisos para agregar archivos a esta solicitud' },
      { status: 403 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó archivo' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const filename = `${randomUUID()}-${file.name}`;
    const storagePath = AttachmentModel.getStoragePath();
    const filePath = path.join(storagePath, filename);
    const relativePath = path.join('uploads', filename);

    await writeFile(filePath, buffer);

    const attachment = AttachmentModel.create(
      requestId,
      filename,
      file.name,
      file.type,
      file.size,
      relativePath
    );

    return NextResponse.json({ attachment }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al subir archivo' },
      { status: 500 }
    );
  }
}

