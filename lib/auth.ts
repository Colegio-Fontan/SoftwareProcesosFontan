import { NextRequest } from 'next/server';
import { UserModel } from './models/user';
import type { User, UserRole } from '@/types';
import { verifyToken as verifyJWT, signToken, type JWTPayload } from './jwt';

export type { JWTPayload };

export async function generateToken(user: User): Promise<string> {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
  return signToken(payload);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  return verifyJWT(token);
}

export async function getAuthUser(request: NextRequest): Promise<User | null> {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const user = await UserModel.findById(payload.userId);
  return user || null;
}

export function hasRole(user: User | null, allowedRoles: UserRole[]): boolean {
  if (!user) return false;
  return allowedRoles.includes(user.role);
}

export function canApproveRequest(user: User | null, requestType: string, currentApproverRole: UserRole | null): boolean {
  if (!user) return false;

  // El usuario puede aprobar si su rol es el aprobador actual
  if (currentApproverRole === user.role) return true;

  // El creador puede ver pero no aprobar sus propias solicitudes
  return false;
}

