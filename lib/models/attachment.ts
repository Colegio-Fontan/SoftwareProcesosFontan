import sql from '../db';
import type { Attachment } from '@/types';
import fs from 'fs';
import path from 'path';

export class AttachmentModel {
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

    // Eliminar archivo físico (Nota: Esto fallará en Vercel, debería usar Blob storage)
    const filePath = path.join(process.cwd(), attachment.path);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    }

    // Eliminar registro de BD
    await sql`DELETE FROM attachments WHERE id = ${id}`;
  }

  static getStoragePath(): string {
    const storageDir = path.join(process.cwd(), 'uploads');
    // En Vercel no se puede crear carpetas arbitrarias, pero lo dejamos para local
    if (!fs.existsSync(storageDir) && process.env.NODE_ENV !== 'production') {
      try {
        fs.mkdirSync(storageDir, { recursive: true });
      } catch (err) {
        console.error('Error creating storage dir:', err);
      }
    }
    return storageDir;
  }
}
