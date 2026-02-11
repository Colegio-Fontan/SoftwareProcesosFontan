import { NextRequest, NextResponse } from 'next/server';
import { UserModel } from '@/lib/models/user';
import { generateToken } from '@/lib/auth';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    const user = await UserModel.findByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // 1. Validar dominio del colegio (por si acaso se coló alguno antiguo)
    if (!UserModel.isValidSchoolEmail(email)) {
      return NextResponse.json(
        { error: 'Solo se permiten correos @colegiofontan.edu.co' },
        { status: 403 }
      );
    }

    // 2. Verificar confirmación o auto-confirmar si es del dominio
    if (!user.is_confirmed) {
      if (UserModel.isValidSchoolEmail(email)) {
        // Si es del dominio pero no está confirmado, permitiremos el login y lo confirmaremos
        // Esto soluciona el bloqueo de usuarios existentes
        await UserModel.confirmUser(user.id);
        console.log('Auto-confirming existing school user:', email);
      } else {
        return NextResponse.json(
          { error: 'Por favor confirma tu correo electrónico antes de iniciar sesión' },
          { status: 403 }
        );
      }
    }

    const isValid = await UserModel.verifyPassword(user, password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    const token = await generateToken(user);

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    console.log('Login successful for:', email);
    console.log('Setting cookie with token:', token.substring(0, 10) + '...');

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 días
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

