import sql from '../db';
import bcrypt from 'bcryptjs';
import type { User, UserRole } from '@/types';

export class UserModel {
  static async findByEmail(email: string): Promise<User | undefined> {
    const rows = await sql`SELECT * FROM users WHERE email = ${email}`;
    return rows[0] as User | undefined;
  }

  static async findByConfirmationToken(token: string): Promise<User | undefined> {
    const rows = await sql`SELECT * FROM users WHERE confirmation_token = ${token}`;
    return rows[0] as User | undefined;
  }

  static async findById(id: number): Promise<User | undefined> {
    const rows = await sql`SELECT * FROM users WHERE id = ${id}`;
    const user = rows[0] as User | undefined;
    if (!user) console.log(`[UserModel] User with ID ${id} not found in database`);
    return user;
  }

  static async create(email: string, password: string, name: string, role: UserRole, confirmationToken?: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const rows = await sql`
      INSERT INTO users (email, password, name, role, is_confirmed, confirmation_token)
      VALUES (${email}, ${hashedPassword}, ${name}, ${role}, ${confirmationToken ? false : true}, ${confirmationToken || null})
      RETURNING *
    `;
    return rows[0] as User;
  }

  static async confirmUser(userId: number): Promise<void> {
    await sql`UPDATE users SET is_confirmed = true, confirmation_token = NULL WHERE id = ${userId}`;
  }

  static async autoConfirmSchoolUsers(): Promise<void> {
    await sql`UPDATE users SET is_confirmed = true WHERE email LIKE '%@colegiofontan.edu.co' AND is_confirmed = false`;
  }

  static isValidSchoolEmail(email: string): boolean {
    return email.endsWith('@colegiofontan.edu.co');
  }

  static async verifyPassword(user: User, password: string): Promise<boolean> {
    const rows = await sql`SELECT password FROM users WHERE id = ${user.id}`;
    const userWithPassword = rows[0] as { password: string };
    return bcrypt.compare(password, userWithPassword.password);
  }

  static async getAll(): Promise<User[]> {
    const rows = await sql`SELECT id, email, name, role, created_at, updated_at FROM users`;
    return rows as User[];
  }

  static async getByRole(role: UserRole): Promise<User[]> {
    const rows = await sql`SELECT id, email, name, role, created_at, updated_at FROM users WHERE role = ${role}`;
    return rows as User[];
  }
}
