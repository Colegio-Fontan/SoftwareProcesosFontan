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
 * Se usa tanto en cliente (ImageAttachmentPicker) como en servidor
 * (handleUpload de Vercel Blob).
 */
export const MAX_ATTACHMENT_MB = 10;

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
