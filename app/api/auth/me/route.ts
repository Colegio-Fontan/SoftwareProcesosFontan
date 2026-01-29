import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);

  if (!user) {
    console.log('[API/auth/me] User not found, clearing cookie and returning 401');
    const response = NextResponse.json(
      { error: 'No autenticado' },
      { status: 401 }
    );
    response.cookies.delete('auth-token');
    return response;
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
}

