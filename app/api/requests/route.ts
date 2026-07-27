import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { RequestModel } from '@/lib/models/request';
import {
  DESCRIPTION_REQUIRED_MESSAGE,
  MIN_DESCRIPTION_LENGTH,
  MIN_TITLE_LENGTH,
} from '@/lib/utils/request-description';
import { z } from 'zod';

const createRequestSchema = z.object({
  type: z.enum(['compra', 'permiso', 'soporte', 'certificado', 'mantenimiento', 'personalizada']),
  title: z.string().trim().min(MIN_TITLE_LENGTH, 'El título es obligatorio.'),
  // .trim() antes de .min(): así una descripción de solo espacios se rechaza
  // en lugar de guardarse como " " en la base de datos.
  description: z.string().trim().min(MIN_DESCRIPTION_LENGTH, DESCRIPTION_REQUIRED_MESSAGE),
  reason: z.string().optional(),
  urgency: z.enum(['bajo', 'medio', 'alto']).optional(),
  // Obligatorio: sin responsable la solicitud queda "huérfana" y se acumula en
  // la bandeja de pendientes de todos sin que nadie la dé por suya.
  assigned_to_user_id: z.number({ required_error: 'Debes seleccionar a un responsable.' })
    .int()
    .positive('Debes seleccionar a un responsable.'),
  custom_flow: z.boolean().optional(),
  tipo_ausencia: z.string().optional().nullable(),
  concepto_ausencia: z.string().optional().nullable(),
  fecha_ausencia: z.string().optional().nullable(),
  hora_inicio: z.string().optional().nullable(),
  hora_fin: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.type !== 'permiso') return;
  const requeridos: [keyof typeof data, string][] = [
    ['tipo_ausencia', 'el tipo de ausencia'],
    ['concepto_ausencia', 'el concepto de ausencia'],
    ['fecha_ausencia', 'la fecha de ausencia'],
    ['hora_inicio', 'la hora de inicio'],
    ['hora_fin', 'la hora de fin'],
  ];
  for (const [campo, etiqueta] of requeridos) {
    if (!data[campo]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [campo],
        message: `Falta ${etiqueta} en la solicitud de permiso.`,
      });
    }
  }
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
    // Combinar solicitudes por rol, asignadas directamente, y sin asignar
    const byRole = await RequestModel.findByApproverRole(user.role);
    const byUser = await RequestModel.findByAssignedUser(user.id);
    const unassigned = await RequestModel.findUnassigned(user.id);

    // Combinar y eliminar duplicados
    const combined = [...byRole, ...byUser, ...unassigned];
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
      // assigned_to_role removed, manually handled below if needed or ignored
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

