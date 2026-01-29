import db from '../db';
import type { Attachment } from '@/types';
import fs from 'fs';
import path from 'path';

export class AttachmentModel {
  static create(
    requestId: number,
    filename: string,
    originalFilename: string,
    mimeType: string,
    size: number,
    filePath: string
  ): Attachment {
    const result = db.prepare(`
      INSERT INTO attachments (request_id, filename, original_filename, mime_type, size, path)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(requestId, filename, originalFilename, mimeType, size, filePath);

    return db.prepare('SELECT * FROM attachments WHERE id = ?').get(result.lastInsertRowid) as Attachment;
  }

  static findByRequestId(requestId: number): Attachment[] {
    return db.prepare('SELECT * FROM attachments WHERE request_id = ?').all(requestId) as Attachment[];
  }

  static findById(id: number): Attachment | undefined {
    return db.prepare('SELECT * FROM attachments WHERE id = ?').get(id) as Attachment | undefined;
  }

  static delete(id: number): void {
    const attachment = this.findById(id);
    if (!attachment) return;

    // Eliminar archivo físico
    const filePath = path.join(process.cwd(), attachment.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Eliminar registro de BD
    db.prepare('DELETE FROM attachments WHERE id = ?').run(id);
  }

  static getStoragePath(): string {
    const storageDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    return storageDir;
  }
}

