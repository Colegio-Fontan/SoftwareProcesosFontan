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

  const consolidado = await sql`
    SELECT
      u.id,
      u.name,
      u.cedula,
      u.cargo,
      u.area,
      u.salario,
      u.fecha_ingreso,
      COALESCE(SUM(r.dias_decimal), 0) AS total_dias_ausencia,
      COALESCE(
        SUM(
          CASE
            WHEN u.salario IS NOT NULL AND r.horas_ausencia IS NOT NULL
            THEN ROUND((u.salario::numeric / 30 / 8) * r.horas_ausencia, 0)
            ELSE 0
          END
        ), 0
      ) AS costo_ausencias_anio
    FROM users u
    LEFT JOIN requests r ON r.user_id = u.id
      AND r.type = 'permiso'
      AND r.fecha_ausencia IS NOT NULL
      AND EXTRACT(YEAR FROM r.fecha_ausencia) = ${anio}
    GROUP BY u.id, u.name, u.cedula, u.cargo, u.area, u.salario, u.fecha_ingreso
    ORDER BY u.name
  `;

  const totalEmpleados = await sql`SELECT COUNT(*) as total FROM users`;
  const numEmpleados = parseInt(totalEmpleados[0].total);

  const mensual = await sql`
    SELECT
      ml.mes,
      ml.dias_laborales,
      ${numEmpleados} AS num_empleados,
      ml.dias_laborales * ${numEmpleados} AS dias_laborables_totales,
      COALESCE(SUM(r.dias_decimal), 0) AS total_dias_ausencia
    FROM meses_laborales ml
    LEFT JOIN requests r ON r.type = 'permiso'
      AND r.fecha_ausencia IS NOT NULL
      AND EXTRACT(YEAR FROM r.fecha_ausencia) = ${anio}
      AND EXTRACT(MONTH FROM r.fecha_ausencia) = ml.mes
    WHERE ml.anio = ${anio}
    GROUP BY ml.mes, ml.dias_laborales
    ORDER BY ml.mes
  `;

  const ausencias = await sql`
    SELECT
      r.id,
      r.user_id,
      u.name AS empleado_nombre,
      u.cedula,
      u.cargo,
      u.area,
      EXTRACT(MONTH FROM r.fecha_ausencia)::int AS mes_num,
      r.fecha_ausencia,
      r.tipo_ausencia,
      r.concepto_ausencia,
      r.hora_inicio,
      r.hora_fin,
      r.horas_ausencia,
      r.dias_decimal,
      r.status
    FROM requests r
    JOIN users u ON u.id = r.user_id
    WHERE r.type = 'permiso'
      AND r.fecha_ausencia IS NOT NULL
      AND EXTRACT(YEAR FROM r.fecha_ausencia) = ${anio}
    ORDER BY u.name, r.fecha_ausencia
  `;

  return NextResponse.json({
    anio,
    consolidado,
    mensual,
    ausencias,
    num_empleados: numEmpleados,
  });
}
