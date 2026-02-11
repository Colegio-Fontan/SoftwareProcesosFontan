import db from '../db';
import type { User, UserRole } from '@/types';

/**
 * Obtiene todos los usuarios que tienen un rol específico
 */
export function getUsersByRole(role: UserRole): User[] {
  try {
    const users = db.prepare(`
      SELECT id, name, email, role, department, is_confirmed, created_at
      FROM users
      WHERE role = ? AND is_confirmed = 1
      ORDER BY name ASC
    `).all(role) as User[];

    return users;
  } catch (error) {
    console.error('Error al obtener usuarios por rol:', error);
    return [];
  }
}

/**
 * Obtiene un usuario por su ID
 */
export function getUserById(userId: number): User | null {
  try {
    const user = db.prepare(`
      SELECT id, name, email, role, department, is_confirmed, created_at
      FROM users
      WHERE id = ?
    `).get(userId) as User | undefined;

    return user || null;
  } catch (error) {
    console.error('Error al obtener usuario por ID:', error);
    return null;
  }
}

const usersUtils = {
  getUsersByRole,
  getUserById,
};

export default usersUtils;
