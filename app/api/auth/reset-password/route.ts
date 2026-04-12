import { NextRequest, NextResponse } from 'next/server';
import { UserModel } from '@/lib/models/user';

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 });
    }

    const user = await UserModel.findByResetToken(token);

    if (!user) {
      return NextResponse.json({ error: 'El enlace es inválido o ya expiró. Solicita uno nuevo.' }, { status: 400 });
    }

    await UserModel.resetPassword(user.id, password);

    return NextResponse.json({ message: 'Contraseña actualizada exitosamente. Ya puedes iniciar sesión.' });
  } catch (error) {
    console.error('[reset-password] Error:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
