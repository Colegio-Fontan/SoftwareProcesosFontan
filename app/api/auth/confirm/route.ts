import { NextRequest, NextResponse } from 'next/server';
import { UserModel } from '@/lib/models/user';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token no proporcionado' },
        { status: 400 }
      );
    }

    const user = await UserModel.findByConfirmationToken(token);

    if (!user) {
      return NextResponse.json(
        { error: 'Token inválido o expirado' },
        { status: 400 }
      );
    }

    if (user.is_confirmed) {
      return NextResponse.json(
        { message: 'El correo ya ha sido confirmado' },
        { status: 200 }
      );
    }

    await UserModel.confirmUser(user.id);

    return NextResponse.json(
      { message: 'Correo confirmado exitosamente. Ya puedes iniciar sesión.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Confirmation error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
