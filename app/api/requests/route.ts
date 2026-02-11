import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { RequestModel } from '@/lib/models/request';
import { z } from 'zod';
import type { UserRole } from '@/types';

const createRequestSchema = z.object({
  type: z.enum(['compra', 'permiso', 'soporte', 'certificado', 'mantenimiento', 'personalizada']),
  title: z.string().min(1),
  description: z.string().min(1),
  reason: z.string().optional(),
  urgency: z.enum(['bajo', 'medio', 'alto']).optional(),
  assigned_to_user_id: z.number().optional().nullable(),
  assigned_to_role: z.string().optional().nullable(),
  custom_flow: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get('filter');

  let requests;

  if (filter === 'my') {
    requests = await RequestModel.findByUserId(user.id);
  } else if (filter === 'pending') {
    // Combinar solicitudes por rol y asignadas directamente
    const byRole = await RequestModel.findByApproverRole(user.role);
    const byUser = await RequestModel.findByAssignedUser(user.id);

    // Combinar y eliminar duplicados
    const combined = [...byRole, ...byUser];
    const uniqueIds = new Set();
    requests = combined.filter(req => {
      if (uniqueIds.has(req.id)) return false;
      uniqueIds.add(req.id);
      return true;
    });
  } else {
    requests = await RequestModel.getAll();
  }

  return NextResponse.json({ requests });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    console.log('Request body:', body);
    const data = createRequestSchema.parse(body);
    console.log('Validated data:', data);

    const newRequest = await RequestModel.create({
      ...data,
      assigned_to_role: data.assigned_to_role as UserRole
    }, user.id);
    console.log('Request created:', newRequest);

    return NextResponse.json({ request: newRequest }, { status: 201 });
  } catch (error) {
    console.error('Error creating request:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Error al crear solicitud', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

