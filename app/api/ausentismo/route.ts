import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getInformeAusentismo } from '@/lib/ausentismo';

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user || !user.can_access_ausentismo) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const anio = parseInt(searchParams.get('anio') || String(new Date().getFullYear()));

  return NextResponse.json(await getInformeAusentismo(anio));
}
