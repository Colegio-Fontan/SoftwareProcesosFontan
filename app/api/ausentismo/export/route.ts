import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { getAuthUser } from '@/lib/auth';
import { getInformeAusentismo, type AusenciaRow } from '@/lib/ausentismo';

export const runtime = 'nodejs';

const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const MONEDA = '"$"#,##0';
const DIAS = '0.0000';
const PORCENTAJE = '0.00%';

const SOPORTE_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  entregado: 'Entregado',
};

function estilizarEncabezado(sheet: ExcelJS.Worksheet, fila = 1) {
  const row = sheet.getRow(fila);
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF50007D' } };
  row.alignment = { vertical: 'middle' };
  sheet.views = [{ state: 'frozen', ySplit: fila }];
}

function estilizarTotal(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
}

function fecha(valor: string | null) {
  return valor ? new Date(valor) : null;
}

function agregarDetalle(sheet: ExcelJS.Worksheet, ausencias: AusenciaRow[]) {
  sheet.columns = [
    { header: 'Empleado', key: 'empleado', width: 34 },
    { header: 'Cédula', key: 'cedula', width: 14 },
    { header: 'Cargo', key: 'cargo', width: 22 },
    { header: 'Área', key: 'area', width: 22 },
    { header: 'Mes', key: 'mes', width: 12 },
    { header: 'Fecha', key: 'fecha', width: 12, style: { numFmt: 'dd/mm/yyyy' } },
    { header: 'Tipo de ausencia', key: 'tipo', width: 22 },
    { header: 'Concepto', key: 'concepto', width: 26 },
    { header: 'Hora inicio', key: 'inicio', width: 11 },
    { header: 'Hora fin', key: 'fin', width: 11 },
    { header: 'Horas', key: 'horas', width: 9, style: { numFmt: '0.00' } },
    { header: 'Días', key: 'dias', width: 10, style: { numFmt: DIAS } },
    { header: 'Costo ausencia', key: 'costo', width: 16, style: { numFmt: MONEDA } },
    { header: 'Estado', key: 'estado', width: 12 },
    { header: 'Soporte', key: 'soporte', width: 12 },
  ];
  for (const a of ausencias) {
    sheet.addRow({
      empleado: a.empleado_nombre,
      cedula: a.cedula,
      cargo: a.cargo,
      area: a.area,
      mes: MESES[a.mes_num],
      fecha: fecha(a.fecha_ausencia),
      tipo: a.tipo_ausencia,
      concepto: a.concepto_ausencia,
      inicio: a.hora_inicio?.slice(0, 5) ?? null,
      fin: a.hora_fin?.slice(0, 5) ?? null,
      horas: a.horas_ausencia,
      dias: a.dias_decimal,
      costo: a.salario ? a.costo_ausencia : 'Sin salario',
      estado: a.status,
      soporte: a.soporte_estado ? SOPORTE_LABELS[a.soporte_estado] : '',
    });
  }
  estilizarEncabezado(sheet);
  const total = sheet.addRow({
    empleado: 'Total',
    horas: ausencias.reduce((s, a) => s + (Number(a.horas_ausencia) || 0), 0),
    dias: ausencias.reduce((s, a) => s + (Number(a.dias_decimal) || 0), 0),
    costo: ausencias.reduce((s, a) => s + Number(a.costo_ausencia), 0),
  });
  estilizarTotal(total);
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user || !(user.can_access_ausentismo || ['admin', 'gerencia', 'rectoria'].includes(user.role))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const anio = parseInt(searchParams.get('anio') || String(new Date().getFullYear()));
  const userId = searchParams.get('user_id') ? parseInt(searchParams.get('user_id')!) : null;

  const informe = await getInformeAusentismo(anio);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistema de Procesos Fontán';
  workbook.created = new Date();

  let nombreArchivo = `informe-ausentismo-${anio}.xlsx`;

  if (userId) {
    const empleado = informe.consolidado.find(e => e.id === userId);
    if (!empleado) {
      return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });
    }
    const ausencias = informe.ausencias.filter(a => a.user_id === userId);

    const resumen = workbook.addWorksheet('Resumen');
    resumen.columns = [{ width: 26 }, { width: 40 }];
    resumen.addRow([`Informe personal de ausentismo ${anio}`]).font = { bold: true, size: 14 };
    resumen.addRow([]);
    const datos: [string, string | number | Date | null, string?][] = [
      ['Nombre', empleado.name],
      ['Cédula', empleado.cedula],
      ['Cargo', empleado.cargo],
      ['Área', empleado.area],
      ['Fecha de ingreso', fecha(empleado.fecha_ingreso), 'dd/mm/yyyy'],
      ['Salario', empleado.salario, MONEDA],
      ['Ausencias registradas', ausencias.length],
      ['Total horas de ausencia', Number(empleado.total_horas_ausencia), '0.00'],
      ['Total días de ausencia', Number(empleado.total_dias_ausencia), DIAS],
      ['Costo de ausencias del año', empleado.salario ? Number(empleado.costo_ausencias_anio) : 'Sin salario registrado', MONEDA],
    ];
    for (const [etiqueta, valor, formato] of datos) {
      const row = resumen.addRow([etiqueta, valor ?? '—']);
      row.getCell(1).font = { bold: true };
      if (formato) row.getCell(2).numFmt = formato;
      row.getCell(2).alignment = { horizontal: 'left' };
    }

    agregarDetalle(workbook.addWorksheet('Ausencias'), ausencias);
    const slug = empleado.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
    nombreArchivo = `ausentismo-${anio}-${slug}.xlsx`;
  } else {
    const consolidado = workbook.addWorksheet('Consolidado anual');
    consolidado.columns = [
      { header: 'Nombre', key: 'name', width: 34 },
      { header: 'Cédula', key: 'cedula', width: 14 },
      { header: 'Cargo', key: 'cargo', width: 22 },
      { header: 'Área', key: 'area', width: 22 },
      { header: 'Salario', key: 'salario', width: 14, style: { numFmt: MONEDA } },
      { header: 'Total horas', key: 'horas', width: 12, style: { numFmt: '0.00' } },
      { header: 'Total días ausencia', key: 'dias', width: 18, style: { numFmt: DIAS } },
      { header: 'Costo ausencias año', key: 'costo', width: 20, style: { numFmt: MONEDA } },
    ];
    for (const e of informe.consolidado) {
      consolidado.addRow({
        name: e.name,
        cedula: e.cedula,
        cargo: e.cargo,
        area: e.area,
        salario: e.salario,
        horas: Number(e.total_horas_ausencia),
        dias: Number(e.total_dias_ausencia),
        costo: e.salario ? Number(e.costo_ausencias_anio) : 'Sin salario',
      });
    }
    estilizarEncabezado(consolidado);
    estilizarTotal(consolidado.addRow({
      name: 'Total',
      horas: informe.consolidado.reduce((s, e) => s + Number(e.total_horas_ausencia), 0),
      dias: informe.consolidado.reduce((s, e) => s + Number(e.total_dias_ausencia), 0),
      costo: informe.consolidado.reduce((s, e) => s + Number(e.costo_ausencias_anio), 0),
    }));

    const mensual = workbook.addWorksheet('Indicadores mensuales');
    mensual.columns = [
      { header: 'Mes', key: 'mes', width: 14 },
      { header: 'Días laborales', key: 'laborales', width: 15 },
      { header: 'N° empleados', key: 'empleados', width: 14 },
      { header: 'Días laborables totales', key: 'totales', width: 22 },
      { header: 'Total días ausencia', key: 'ausencia', width: 19, style: { numFmt: DIAS } },
      { header: '% Ausentismo', key: 'pct', width: 14, style: { numFmt: PORCENTAJE } },
      { header: 'Costo ausencias', key: 'costo', width: 17, style: { numFmt: MONEDA } },
    ];
    for (const m of informe.mensual) {
      const totales = Number(m.dias_laborables_totales);
      mensual.addRow({
        mes: MESES[m.mes],
        laborales: m.dias_laborales,
        empleados: Number(m.num_empleados),
        totales,
        ausencia: Number(m.total_dias_ausencia),
        pct: totales > 0 ? Number(m.total_dias_ausencia) / totales : 0,
        costo: Number(m.costo_ausencias),
      });
    }
    estilizarEncabezado(mensual);
    const diasLaborables = informe.mensual.reduce((s, m) => s + Number(m.dias_laborables_totales), 0);
    const diasAusencia = informe.mensual.reduce((s, m) => s + Number(m.total_dias_ausencia), 0);
    estilizarTotal(mensual.addRow({
      mes: 'Total',
      laborales: informe.mensual.reduce((s, m) => s + m.dias_laborales, 0),
      totales: diasLaborables,
      ausencia: diasAusencia,
      pct: diasLaborables > 0 ? diasAusencia / diasLaborables : 0,
      costo: informe.mensual.reduce((s, m) => s + Number(m.costo_ausencias), 0),
    }));

    agregarDetalle(workbook.addWorksheet('Detalle de ausencias'), informe.ausencias);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
      'Cache-Control': 'no-store',
    },
  });
}
