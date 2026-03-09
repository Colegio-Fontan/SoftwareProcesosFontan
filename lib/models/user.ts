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
    const rows = await sql`SELECT id, email, name, role, is_confirmed, created_at, updated_at FROM users ORDER BY created_at DESC`;
    return rows as User[];
  }

  static async getByRole(role: UserRole): Promise<User[]> {
    const rows = await sql`SELECT id, email, name, role, created_at, updated_at FROM users WHERE role = ${role}`;
    return rows as User[];
  }

  static async update(userId: number, data: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>): Promise<User> {
    const fields = Object.keys(data);
    if (fields.length === 0) {
      const user = await this.findById(userId);
      if (!user) throw new Error('User not found');
      return user;
    }

    // Dynamic update query building for Neon
    // Note: Since we use neon serverless, we'll do simple per-field update or a combined one if we had a helper.
    // For now, let's implement role and name updates specifically as they are the most common.

    // This is a bit tricky with raw sql template literal if we want it fully dynamic.
    // Let's do it specifically for what we need most.

    if (data.role !== undefined && data.name !== undefined) {
      const rows = await sql`
        UPDATE users 
        SET name = ${data.name}, role = ${data.role} 
        WHERE id = ${userId} 
        RETURNING *
      `;
      return rows[0] as User;
    } else if (data.role !== undefined) {
      const rows = await sql`
        UPDATE users 
        SET role = ${data.role} 
        WHERE id = ${userId} 
        RETURNING *
      `;
      return rows[0] as User;
    } else if (data.name !== undefined) {
      const rows = await sql`
        UPDATE users 
        SET name = ${data.name} 
        WHERE id = ${userId} 
        RETURNING *
      `;
      return rows[0] as User;
    }

    const rows = await sql`SELECT * FROM users WHERE id = ${userId}`;
    return rows[0] as User;
  }

  static async delete(userId: number): Promise<void> {
    await sql`DELETE FROM users WHERE id = ${userId}`;
  }
}
