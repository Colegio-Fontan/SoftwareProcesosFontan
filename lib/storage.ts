import type { Attachment } from '@/types';

/**
 * Devuelve la URL pública para mostrar/descargar un adjunto.
 *
 * - Si `path` es una URL absoluta (archivo en Vercel Blob), se usa tal cual.
 * - En caso contrario, asumimos un archivo legacy almacenado en el servidor y
 *   lo servimos por el endpoint /api/uploads/[filename] (sólo útil en local).
 */
export function getAttachmentUrl(attachment: Pick<Attachment, 'filename' | 'path'>): string {
  if (attachment.path && /^https?:\/\//i.test(attachment.path)) {
    return attachment.path;
  }
  return `/api/uploads/${attachment.filename}`;
}

/**
 * Indica si el `path` almacenado corresponde a un archivo en Vercel Blob.
 */
export function isBlobUrl(path: string | null | undefined): boolean {
  if (!path) return false;
  return /^https?:\/\//i.test(path);
}

/**
 * Tamaño máximo permitido por archivo adjunto (MB).
 *
 * Nota: Las rutas API de Vercel limitan el body a ~4.5MB en el plan Hobby y
 * a 50MB en Pro. Al subir por el servidor (/api/requests/[id]/attachments),
 * nos quedamos debajo del límite del plan gratuito para máxima compatibilidad.
 */
export const MAX_ATTACHMENT_MB = 4;

/**
 * Tipos MIME aceptados para los adjuntos.
 */
export const ACCEPTED_ATTACHMENT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
