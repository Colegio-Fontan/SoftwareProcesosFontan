import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ message: 'Sesión cerrada' });
  response.cookies.set('auth-token', '', {
    httpOnly: true,
    expires: new Date(0),
    maxAge: 0,
    path: '/',
  });
  return response;
}

