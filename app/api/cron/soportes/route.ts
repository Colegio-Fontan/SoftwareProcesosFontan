import { NextRequest, NextResponse } from 'next/server';
import { revisarSoportesVencidos } from '@/lib/soporte';

/**
 * Lo llama el cron diario de Vercel (vercel.json). Si CRON_SECRET está
 * configurado, Vercel envía "Authorization: Bearer <CRON_SECRET>".
 * La revisión es idempotente: cada aviso de 3 días se envía una sola vez.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const avisadas = await revisarSoportesVencidos();
  return NextResponse.json({ ok: true, avisadas });
}
