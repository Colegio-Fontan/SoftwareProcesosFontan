import { SignJWT, jwtVerify } from 'jose';
import type { UserRole } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'fontan-secret-key-change-in-production';
const secretKey = new TextEncoder().encode(JWT_SECRET);

export interface JWTPayload {
  userId: number;
  email: string;
  role: UserRole;
  [key: string]: unknown; // Allow other standard claims like exp, iat
}

export async function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);
}

/**
 * Verifica un token JWT de manera compatible con Edge Runtime
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as JWTPayload;
  } catch (error) {
    console.error('JWT Verification Error:', error);
    return null;
  }
}
