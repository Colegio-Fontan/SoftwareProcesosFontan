'use client';

import { upload } from '@vercel/blob/client';

/**
 * Sube un archivo directamente al Vercel Blob Store usando la subida firmada
 * por el cliente (evita el límite de 4.5MB de las rutas API) y luego registra
 * el adjunto en la solicitud indicada.
 *
 * Lanza una excepción con un mensaje en español si algo falla.
 */
export async function uploadRequestAttachment(
  requestId: number,
  file: File
): Promise<void> {
  // Normalizamos el nombre para que el key del blob sea seguro en URLs.
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_');
  const pathname = `requests/${requestId}/${safeName}`;

  // 1) Subida directa desde el navegador al Blob Store.
  const blob = await upload(pathname, file, {
    access: 'public',
    handleUploadUrl: '/api/uploads',
    contentType: file.type || undefined,
  });

  // 2) Registrar el adjunto en nuestra base de datos.
  const res = await fetch(`/api/requests/${requestId}/attachments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: blob.url,
      pathname: blob.pathname,
      original_filename: file.name,
      mime_type: file.type || 'application/octet-stream',
      size: file.size,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Error al registrar ${file.name}`);
  }
}
