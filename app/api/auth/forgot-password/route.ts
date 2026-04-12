import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { UserModel } from '@/lib/models/user';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'El correo es requerido.' }, { status: 400 });
    }

    const user = await UserModel.findByEmail(email.toLowerCase().trim());

    // Siempre responder igual para no revelar si el email existe
    const successMessage = 'Si ese correo está registrado, recibirás un enlace para restablecer tu contraseña.';

    if (!user) {
      return NextResponse.json({ message: successMessage });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await UserModel.setResetToken(user.id, token, expiresAt);

    const baseUrl = new URL(request.url).origin;
    await sendPasswordResetEmail(user.email, user.name, token, baseUrl);

    return NextResponse.json({ message: successMessage });
  } catch (error) {
    console.error('[forgot-password] Error:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
