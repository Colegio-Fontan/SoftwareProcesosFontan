import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user || !user.can_access_ausentismo) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const anio = parseInt(searchParams.get('anio') || String(new Date().getFullYear()));
  const rows = await sql`SELECT * FROM meses_laborales WHERE anio = ${anio} ORDER BY mes`;
  return NextResponse.json({ meses: rows });
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user || !user.can_access_ausentismo) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const body = await request.json();
  const { anio, mes, dias_laborales } = body;

  if (!anio || !mes || dias_laborales == null) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
  }

  await sql`
    INSERT INTO meses_laborales (anio, mes, dias_laborales)
    VALUES (${anio}, ${mes}, ${dias_laborales})
    ON CONFLICT (anio, mes) DO UPDATE SET dias_laborales = ${dias_laborales}
  `;

  return NextResponse.json({ ok: true });
}
