import { NextRequest, NextResponse } from 'next/server';
import { UserModel } from '@/lib/models/user';
import { z } from 'zod';
import crypto from 'crypto';
import type { UserRole } from '@/types';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  // role removed from schema
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
    const existingUser = await UserModel.findByEmail(validatedData.email);
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
      'empleado' as UserRole,
      confirmationToken
    );

    // 5. Enviar correo de confirmación real
    try {
      const { sendConfirmationEmail } = await import('@/lib/email');
      const baseUrl = new URL(request.url).origin;
      await sendConfirmationEmail(validatedData.email, validatedData.name, confirmationToken, baseUrl);
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // No bloqueamos el registro si el correo falla, pero lo logueamos
    }

    const confirmationUrl = `${new URL(request.url).origin}/confirm?token=${confirmationToken}`;
    console.log('------------------------------------------');
    console.log('NUEVO REGISTRO:');
    console.log('Email:', validatedData.email);
    console.log('Token de confirmación:', confirmationToken);
    console.log('Enlace de confirmación:', confirmationUrl);
    console.log('------------------------------------------');

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
