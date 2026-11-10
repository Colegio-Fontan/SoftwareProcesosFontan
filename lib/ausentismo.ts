import sql from './db';

// Costo de una ausencia: valor de la hora (salario / 30 días / 8 horas) por las horas ausentes.

export interface EmpleadoConsolidado {
  id: number;
  name: string;
  cedula: string | null;
  cargo: string | null;
  area: string | null;
  salario: number | null;
  fecha_ingreso: string | null;
  total_dias_ausencia: number;
  total_horas_ausencia: number;
  costo_ausencias_anio: number;
}

export interface MesData {
  mes: number;
  dias_laborales: number;
  num_empleados: number;
  dias_laborables_totales: number;
  total_dias_ausencia: number;
  costo_ausencias: number;
}

export interface AusenciaRow {
  id: number;
  user_id: number;
  empleado_nombre: string;
  cedula: string | null;
  cargo: string | null;
  area: string | null;
  salario: number | null;
  mes_num: number;
  fecha_ausencia: string;
  tipo_ausencia: string | null;
  concepto_ausencia: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  horas_ausencia: number | null;
  dias_decimal: number | null;
  costo_ausencia: number;
  status: string;
  soporte_estado: string | null;
}

export interface InformeAusentismo {
  anio: number;
  consolidado: EmpleadoConsolidado[];
  mensual: MesData[];
  ausencias: AusenciaRow[];
  num_empleados: number;
}

export async function getInformeAusentismo(anio: number): Promise<InformeAusentismo> {
  const consolidado = await sql`
    SELECT
      u.id,
      u.name,
      u.cedula,
      u.cargo,
      u.area,
      u.salario,
      u.fecha_ingreso,
      COALESCE(SUM(r.dias_decimal), 0)::float AS total_dias_ausencia,
      COALESCE(SUM(r.horas_ausencia), 0)::float AS total_horas_ausencia,
      COALESCE(
        SUM(
          CASE
            WHEN u.salario IS NOT NULL AND r.horas_ausencia IS NOT NULL
            THEN ROUND((u.salario::numeric / 30 / 8) * r.horas_ausencia, 0)
            ELSE 0
          END
        ), 0
      )::float AS costo_ausencias_anio
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
      COALESCE(SUM(r.dias_decimal), 0)::float AS total_dias_ausencia,
      COALESCE(
        SUM(
          CASE
            WHEN u.salario IS NOT NULL AND r.horas_ausencia IS NOT NULL
            THEN ROUND((u.salario::numeric / 30 / 8) * r.horas_ausencia, 0)
            ELSE 0
          END
        ), 0
      )::float AS costo_ausencias
    FROM meses_laborales ml
    LEFT JOIN requests r ON r.type = 'permiso'
      AND r.fecha_ausencia IS NOT NULL
      AND EXTRACT(YEAR FROM r.fecha_ausencia) = ${anio}
      AND EXTRACT(MONTH FROM r.fecha_ausencia) = ml.mes
    LEFT JOIN users u ON u.id = r.user_id
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
      u.salario,
      EXTRACT(MONTH FROM r.fecha_ausencia)::int AS mes_num,
      r.fecha_ausencia,
      r.tipo_ausencia,
      r.concepto_ausencia,
      r.hora_inicio,
      r.hora_fin,
      r.horas_ausencia::float AS horas_ausencia,
      r.dias_decimal::float AS dias_decimal,
      CASE
        WHEN u.salario IS NOT NULL AND r.horas_ausencia IS NOT NULL
        THEN ROUND((u.salario::numeric / 30 / 8) * r.horas_ausencia, 0)
        ELSE 0
      END::float AS costo_ausencia,
      r.status,
      r.soporte_estado
    FROM requests r
    JOIN users u ON u.id = r.user_id
    WHERE r.type = 'permiso'
      AND r.fecha_ausencia IS NOT NULL
      AND EXTRACT(YEAR FROM r.fecha_ausencia) = ${anio}
    ORDER BY u.name, r.fecha_ausencia
  `;

  return {
    anio,
    consolidado: consolidado as EmpleadoConsolidado[],
    mensual: mensual as MesData[],
    ausencias: ausencias as AusenciaRow[],
    num_empleados: numEmpleados,
  };
}
