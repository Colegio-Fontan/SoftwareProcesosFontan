import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { UserModel } from '@/lib/models/user';

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  try {
    const users = UserModel.getAll();
    
    // No devolver contraseñas
    const safeUsers = users.map(({ id, email, name, role, created_at }) => ({
      id,
      email,
      name,
      role,
      created_at,
    }));

    return NextResponse.json({ users: safeUsers });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
}
