import { NextRequest, NextResponse } from 'next/server';
import { UserModel } from '@/lib/models/user';
import { z } from 'zod';
import crypto from 'crypto';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  role: z.enum(['empleado', 'sistemas', 'gestion_humana', 'cartera', 'gerencia', 'rectoria']).default('empleado'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // 1. Validar dominio del colegio
    if (!UserModel.isValidSchoolEmail(validatedData.email)) {
      return NextResponse.json(
        { error: 'Solo se permiten correos @colegiofontan.edu.co' },
        { status: 400 }
      );
    }

    // 2. Verificar si el usuario ya existe
    const existingUser = UserModel.findByEmail(validatedData.email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'El usuario ya está registrado' },
        { status: 400 }
      );
    }

    // 3. Generar token de confirmación
    const confirmationToken = crypto.randomBytes(32).toString('hex');

    // 4. Crear usuario (is_confirmed será 0 por defecto si pasamos token)
    const newUser = await UserModel.create(
      validatedData.email,
      validatedData.password,
      validatedData.name,
      validatedData.role as any,
      confirmationToken
    );

    // 5. "Enviar" correo de confirmación (Log por ahora)
    const confirmationUrl = `${new URL(request.url).origin}/confirm?token=${confirmationToken}`;

    console.log('------------------------------------------');
    console.log('NUEVO REGISTRO:');
    console.log('Email:', validatedData.email);
    console.log('Token de confirmación:', confirmationToken);
    console.log('Enlace de confirmación:', confirmationUrl);
    console.log('------------------------------------------');

    // Aquí iría el envío real con nodemailer/resend/etc.

    return NextResponse.json(
      {
        message: 'Usuario registrado. Por favor, revisa tu correo para confirmar tu cuenta.',
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name
        }
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
