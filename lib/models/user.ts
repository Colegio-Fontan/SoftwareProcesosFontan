import db from '../db';
import bcrypt from 'bcryptjs';
import type { User, UserRole } from '@/types';

export class UserModel {
  static findByEmail(email: string): User | undefined {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
  }

  static findByConfirmationToken(token: string): User | undefined {
    return db.prepare('SELECT * FROM users WHERE confirmation_token = ?').get(token) as User | undefined;
  }

  static findById(id: number): User | undefined {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
    if (!user) console.log(`[UserModel] User with ID ${id} not found in database`);
    return user;
  }

  static async create(email: string, password: string, name: string, role: UserRole, confirmationToken?: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = db.prepare(`
      INSERT INTO users (email, password, name, role, is_confirmed, confirmation_token)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(email, hashedPassword, name, role, confirmationToken ? 0 : 1, confirmationToken || null);

    return this.findById(result.lastInsertRowid as number)!;
  }

  static confirmUser(userId: number): void {
    db.prepare('UPDATE users SET is_confirmed = 1, confirmation_token = NULL WHERE id = ?').run(userId);
  }

  static autoConfirmSchoolUsers(): void {
    db.prepare("UPDATE users SET is_confirmed = 1 WHERE email LIKE '%@colegiofontan.edu.co' AND is_confirmed = 0").run();
  }

  static isValidSchoolEmail(email: string): boolean {
    return email.endsWith('@colegiofontan.edu.co');
  }

  static async verifyPassword(user: User, password: string): Promise<boolean> {
    const userWithPassword = db.prepare('SELECT password FROM users WHERE id = ?').get(user.id) as { password: string };
    return bcrypt.compare(password, userWithPassword.password);
  }

  static getAll(): User[] {
    return db.prepare('SELECT id, email, name, role, created_at, updated_at FROM users').all() as User[];
  }

  static getByRole(role: UserRole): User[] {
    return db.prepare('SELECT id, email, name, role, created_at, updated_at FROM users WHERE role = ?').all(role) as User[];
  }
}

