import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { UserModel } from '@/lib/models/user';

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  try {
    const users = await UserModel.getAll();

    // No devolver contraseñas
    const safeUsers = users.map(({ id, email, name, role, created_at }) => ({
      id,
      email,
      name,
      role,
      created_at,
    }));

    return NextResponse.json({ users: safeUsers });
  } catch {
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const adminUser = await getAuthUser(request);
  if (!adminUser || adminUser.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, email, password, role } = body;

    // Validar datos mínimos
    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // Verificar si ya existe
    const existing = await UserModel.findByEmail(email);
    if (existing) {
      return NextResponse.json({ error: 'El usuario ya existe' }, { status: 400 });
    }

    const newUser = await UserModel.create(email, password, name, role);

    return NextResponse.json({
      message: 'Usuario creado exitosamente',
      user: { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role }
    }, { status: 201 });
  } catch (error) {
    console.error('[API Users POST] Error:', error);
    return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const adminUser = await getAuthUser(request);
  if (!adminUser || adminUser.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 });
    }

    const updatedUser = await UserModel.update(Number(id), updateData);

    return NextResponse.json({
      message: 'Usuario actualizado exitosamente',
      user: { id: updatedUser.id, email: updatedUser.email, name: updatedUser.name, role: updatedUser.role }
    });
  } catch (error) {
    console.error('[API Users PATCH] Error:', error);
    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 });
  }
}
