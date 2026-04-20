import { NextRequest, NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { getAuthUser } from '@/lib/auth';
import {
  ACCEPTED_ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_MB,
} from '@/lib/storage';

/**
 * Endpoint que respalda las subidas directas al Vercel Blob Store desde el
 * navegador.
 *
 * El cliente llama a `upload(...)` de `@vercel/blob/client` apuntando a esta
 * ruta; Vercel nos envía un POST para firmar el token con las restricciones
 * (auth, tipos, tamaño) y luego otro POST al finalizar la subida.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Validamos que sea un usuario autenticado antes de entregar un token
        const user = await getAuthUser(request);
        if (!user) {
          throw new Error('No autenticado');
        }

        return {
          allowedContentTypes: ACCEPTED_ATTACHMENT_MIME_TYPES,
          maximumSizeInBytes: MAX_ATTACHMENT_MB * 1024 * 1024,
          addRandomSuffix: true,
          // Guardamos información útil para el callback / debugging
          tokenPayload: JSON.stringify({
            userId: user.id,
            pathname,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Vercel llama a este webhook cuando termina la subida desde el
        // navegador. No persistimos nada aquí: el cliente llamará a
        // /api/requests/[id]/attachments con los metadatos. Sólo lo dejamos
        // para logging.
        console.log('Blob upload completed:', blob.url, tokenPayload);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error al subir archivo';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
