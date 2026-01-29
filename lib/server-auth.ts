import { cookies } from 'next/headers';
import { verifyToken } from './auth';
import { UserModel } from './models/user';
import type { User } from '@/types';

export async function getServerUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const user = UserModel.findById(payload.userId);
  console.log('getServerUser - User found:', !!user);
  return user || null;
}

