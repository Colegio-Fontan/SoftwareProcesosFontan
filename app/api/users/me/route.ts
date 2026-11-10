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

    // Asigna salario y fecha de ingreso desde el listado de nómina, cruzando por cédula
    await sql`
      UPDATE users u
      SET
        salario = s.salario,
        fecha_ingreso = COALESCE(u.fecha_ingreso, s.fecha_ingreso),
        updated_at = CURRENT_TIMESTAMP
      FROM salarios_empleados s
      WHERE u.id = ${user.id}
        AND u.salario IS NULL
        AND s.cedula = regexp_replace(u.cedula, '[^0-9]', '', 'g')
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[PATCH /api/users/me]', error);
    return NextResponse.json({ error: 'Error al actualizar perfil' }, { status: 500 });
  }
}
