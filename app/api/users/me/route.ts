import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import sql from '@/lib/db';

export async function PATCH(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { cedula, cargo, area } = body;

    await sql`
      UPDATE users
      SET
        cedula = COALESCE(${cedula ?? null}, cedula),
        cargo  = COALESCE(${cargo  ?? null}, cargo),
        area   = COALESCE(${area   ?? null}, area),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${user.id}
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[PATCH /api/users/me]', error);
    return NextResponse.json({ error: 'Error al actualizar perfil' }, { status: 500 });
  }
}
