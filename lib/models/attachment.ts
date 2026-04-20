import sql from '../db';
import type { Attachment } from '@/types';
import { del } from '@vercel/blob';
import { isBlobUrl } from '@/lib/storage';

export class AttachmentModel {
  /**
   * Crea un registro de adjunto.
   *
   * Con Vercel Blob:
   *  - `filename` guarda el pathname/key dentro del Blob store (p.ej.
   *    `requests/123/abc123-foto.jpg`). Sirve para operaciones administrativas.
   *  - `filePath` guarda la URL pública completa del blob, que es la que se
   *    usa para mostrar y descargar el archivo.
   */
  static async create(
    requestId: number,
    filename: string,
    originalFilename: string,
    mimeType: string,
    size: number,
    filePath: string
  ): Promise<Attachment> {
    const rows = await sql`
      INSERT INTO attachments (request_id, filename, original_filename, mime_type, size, path)
      VALUES (${requestId}, ${filename}, ${originalFilename}, ${mimeType}, ${size}, ${filePath})
      RETURNING *
    `;

    return rows[0] as Attachment;
  }

  static async findByRequestId(requestId: number): Promise<Attachment[]> {
    const rows = await sql`SELECT * FROM attachments WHERE request_id = ${requestId}`;
    return rows as Attachment[];
  }

  static async findById(id: number): Promise<Attachment | undefined> {
    const rows = await sql`SELECT * FROM attachments WHERE id = ${id}`;
    return rows[0] as Attachment | undefined;
  }

  static async delete(id: number): Promise<void> {
    const attachment = await this.findById(id);
    if (!attachment) return;

    // Borrar del Blob store si el path es una URL absoluta.
    // Los registros legacy almacenados en el filesystem local (sólo dev) se
    // ignoran: en producción no existían y en local se limpian con el propio
    // sistema de archivos.
    if (isBlobUrl(attachment.path)) {
      try {
        await del(attachment.path);
      } catch (err) {
        console.error('Error borrando blob:', err);
      }
    }

    await sql`DELETE FROM attachments WHERE id = ${id}`;
  }
}
