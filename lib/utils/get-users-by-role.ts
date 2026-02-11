import sql from '../db';
import type { User, UserRole } from '@/types';

/**
 * Obtiene todos los usuarios que tienen un rol específico
 */
export async function getUsersByRole(role: UserRole): Promise<User[]> {
  try {
    const rows = await sql`
      SELECT id, name, email, role, is_confirmed, created_at
      FROM users
      WHERE role = ${role} AND is_confirmed = true
      ORDER BY name ASC
    `;

    return rows as User[];
  } catch (error) {
    console.error('Error al obtener usuarios por rol:', error);
    return [];
  }
}

/**
 * Obtiene un usuario por su ID
 */
export async function getUserById(userId: number): Promise<User | null> {
  try {
    const rows = await sql`
      SELECT id, name, email, role, is_confirmed, created_at
      FROM users
      WHERE id = ${userId}
    `;

    return (rows[0] as User) || null;
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
