'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Users, Calendar, User, Pencil, Check, X, Download, Paperclip } from 'lucide-react';
import type { EmpleadoConsolidado, MesData, AusenciaRow } from '@/lib/ausentismo';
import { ChartCard, HBarChart, ColumnChart, formatPesos, formatPesosCorto } from '@/components/ausentismo/Charts';

const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

type Tab = 'consolidado' | 'mensual' | 'personal';

export default function AusentismoPage() {
  const [tab, setTab] = useState<Tab>('consolidado');
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [consolidado, setConsolidado] = useState<EmpleadoConsolidado[]>([]);
  const [mensual, setMensual] = useState<MesData[]>([]);
  const [ausencias, setAusencias] = useState<AusenciaRow[]>([]);
  const [numEmpleados, setNumEmpleados] = useState(0);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<number | null>(null);

  // Estado edición días laborales
  const [editingMes, setEditingMes] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savingMes, setSavingMes] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ausentismo?anio=${anio}`);
      const data = await res.json();
      setConsolidado(data.consolidado || []);
      setMensual(data.mensual || []);
      setAusencias(data.ausencias || []);
      setNumEmpleados(data.num_empleados || 0);
    } finally {
      setLoading(false);
    }
  }, [anio]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleEditMes = (mes: number, diasActuales: number) => {
    setEditingMes(mes);
    setEditValue(String(diasActuales));
  };

  const handleSaveMes = async (mes: number) => {
    const dias = parseInt(editValue);
    if (isNaN(dias) || dias < 1 || dias > 31) return;
    setSavingMes(true);
    try {
      await fetch('/api/ausentismo/meses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anio, mes, dias_laborales: dias }),
      });
      setEditingMes(null);
      await fetchData();
    } finally {
      setSavingMes(false);
    }
  };

  const empleadosConAusencias = Array.from(new Set(ausencias.map(a => a.user_id)))
    .map(id => ausencias.find(a => a.user_id === id)!)
    .sort((a, b) => a.empleado_nombre.localeCompare(b.empleado_nombre));

  const ausenciasEmpleado = ausencias.filter(a => a.user_id === empleadoSeleccionado);
  const totalDiasEmpleado = ausenciasEmpleado.reduce((s, a) => s + (Number(a.dias_decimal) || 0), 0);
  const totalHorasEmpleado = ausenciasEmpleado.reduce((s, a) => s + (Number(a.horas_ausencia) || 0), 0);
  const totalDiasAnio = mensual.reduce((s, m) => s + Number(m.total_dias_ausencia), 0);
  const totalDiasLaborables = mensual.reduce((s, m) => s + Number(m.dias_laborables_totales), 0);
  const porcentajeAnio = totalDiasLaborables > 0 ? (totalDiasAnio / totalDiasLaborables * 100).toFixed(2) : '0.00';
  const costoTotalAnio = consolidado.reduce((s, e) => s + Number(e.costo_ausencias_anio), 0);
  const costoEmpleado = ausenciasEmpleado.reduce((s, a) => s + Number(a.costo_ausencia), 0);
  const empleadoInfo = consolidado.find(e => e.id === empleadoSeleccionado);

  const topCostos = consolidado
    .filter(e => Number(e.costo_ausencias_anio) > 0)
    .sort((a, b) => Number(b.costo_ausencias_anio) - Number(a.costo_ausencias_anio))
    .slice(0, 10)
    .map(e => ({
      label: e.name,
      value: Number(e.costo_ausencias_anio),
      detail: `${Number(e.total_dias_ausencia).toFixed(2)} días · ${formatPesos(Number(e.costo_ausencias_anio))}`,
    }));

  const diasPorTipo = Object.entries(
    ausencias.reduce<Record<string, number>>((acc, a) => {
      const tipo = a.tipo_ausencia || 'Sin tipo registrado';
      acc[tipo] = (acc[tipo] || 0) + (Number(a.dias_decimal) || 0);
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));

  const pctPorMes = mensual.map(m => {
    const totales = Number(m.dias_laborables_totales);
    const pct = totales > 0 ? Number(m.total_dias_ausencia) / totales * 100 : 0;
    return {
      label: MESES[m.mes].slice(0, 3),
      value: pct,
      detail: `${pct.toFixed(2)}% · ${Number(m.total_dias_ausencia).toFixed(2)} días`,
    };
  });

  const costoPorMes = mensual.map(m => ({
    label: MESES[m.mes].slice(0, 3),
    value: Number(m.costo_ausencias),
    detail: formatPesos(Number(m.costo_ausencias)),
  }));

  const diasEmpleadoPorMes = MESES.slice(1).map((nombre, i) => {
    const dias = ausenciasEmpleado
      .filter(a => a.mes_num === i + 1)
      .reduce((s, a) => s + (Number(a.dias_decimal) || 0), 0);
    return { label: nombre.slice(0, 3), value: dias, detail: `${dias.toFixed(2)} días` };
  });

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Informes de Ausentismo</h1>
          <p className="text-sm text-gray-500 mt-1">Registro y análisis de ausencias laborales · Colegio Fontán</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Año:</label>
          <select
            value={anio}
            onChange={e => setAnio(parseInt(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <a
            href={`/api/ausentismo/export?anio=${anio}`}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" /> Descargar Excel
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {([
          { id: 'consolidado', label: 'Consolidado Anual', icon: <Users className="w-4 h-4" /> },
          { id: 'mensual', label: 'Indicadores Mensuales', icon: <Calendar className="w-4 h-4" /> },
          { id: 'personal', label: 'Informe Personal', icon: <User className="w-4 h-4" /> },
        ] as { id: Tab; label: string; icon: React.ReactNode }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
              ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <>
          {/* ===== CONSOLIDADO ANUAL ===== */}
          {tab === 'consolidado' && (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <StatCard label="Empleados" value={String(numEmpleados)} />
                <StatCard label="Total días ausencia" value={totalDiasAnio.toFixed(4)} />
                <StatCard label="% Ausentismo anual" value={`${porcentajeAnio}%`} />
                <StatCard label="Costo total ausencias" value={formatPesos(costoTotalAnio)} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <ChartCard title="Costo de ausencias por persona" subtitle={`Las 10 personas con mayor costo en ${anio}`}>
                  <HBarChart data={topCostos} format={formatPesos} emptyText="No hay costos de ausencia registrados este año." />
                </ChartCard>
                <ChartCard title="Días de ausencia por tipo" subtitle={`Total de días en ${anio}`}>
                  <HBarChart data={diasPorTipo} format={v => `${v.toFixed(2)} días`} emptyText="No hay ausencias registradas este año." />
                </ChartCard>
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['#', 'Nombre', 'Cédula', 'Cargo', 'Área', 'Salario', 'Total días ausencia', 'Costo ausencias año'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {consolidado.map((emp, i) => (
                      <tr key={emp.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{emp.name}</td>
                        <td className="px-4 py-3 text-gray-600">{emp.cedula || <span className="text-amber-500 text-xs">Pendiente</span>}</td>
                        <td className="px-4 py-3 text-gray-600">{emp.cargo || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{emp.area || <span className="text-amber-500 text-xs">Pendiente</span>}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {emp.salario ? formatPesos(Number(emp.salario)) : <span className="text-amber-500 text-xs">Sin salario</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-semibold ${Number(emp.total_dias_ausencia) > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            {Number(emp.total_dias_ausencia).toFixed(4)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-900 font-medium whitespace-nowrap">
                          {emp.salario
                            ? formatPesos(Number(emp.costo_ausencias_anio))
                            : <span className="text-amber-500 text-xs">Sin salario</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                    <tr>
                      <td colSpan={6} className="px-4 py-3 text-xs font-bold text-gray-700 uppercase">Total</td>
                      <td className="px-4 py-3 text-center font-bold text-red-600">
                        {consolidado.reduce((s, e) => s + Number(e.total_dias_ausencia), 0).toFixed(4)}
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-700">
                        {formatPesos(costoTotalAnio)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ===== INDICADORES MENSUALES ===== */}
          {tab === 'mensual' && (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <StatCard label="Días laborales año" value={String(mensual.reduce((s, m) => s + m.dias_laborales, 0))} />
                <StatCard label="Total días ausencia año" value={totalDiasAnio.toFixed(4)} />
                <StatCard label="% Ausentismo anual" value={`${porcentajeAnio}%`} />
                <StatCard label="Costo total ausencias" value={formatPesos(costoTotalAnio)} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <ChartCard title="% de ausentismo por mes" subtitle="Días de ausencia sobre días laborables totales">
                  <ColumnChart data={pctPorMes} format={v => `${v.toFixed(2)}%`} tickFormat={v => `${v}%`} />
                </ChartCard>
                <ChartCard title="Costo de ausencias por mes" subtitle="Valor de las horas ausentes según el salario de cada persona">
                  <ColumnChart data={costoPorMes} format={formatPesos} tickFormat={formatPesosCorto} />
                </ChartCard>
              </div>
              <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
                <Pencil className="w-3 h-3" /> Haz clic en el ícono de edición para ajustar los días laborales de cualquier mes.
              </p>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Mes', 'Días laborales', 'N° empleados', 'Días laborables totales', 'Total días ausencia', '% Ausentismo', 'Costo ausencias'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {mensual.map(m => {
                      const pct = Number(m.dias_laborables_totales) > 0
                        ? (Number(m.total_dias_ausencia) / Number(m.dias_laborables_totales) * 100).toFixed(2)
                        : '0.00';
                      const isEditing = editingMes === m.mes;
                      return (
                        <tr key={m.mes} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{MESES[m.mes]}</td>
                          <td className="px-4 py-3 text-center">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="number"
                                  min={1} max={31}
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  className="w-14 border border-primary rounded px-2 py-1 text-center text-sm focus:outline-none"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSaveMes(m.mes)}
                                  disabled={savingMes}
                                  className="text-green-600 hover:text-green-800"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button onClick={() => setEditingMes(null)} className="text-gray-400 hover:text-gray-600">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-gray-600">{m.dias_laborales}</span>
                                <button
                                  onClick={() => handleEditMes(m.mes, m.dias_laborales)}
                                  className="text-gray-300 hover:text-primary transition-colors"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-600">{m.num_empleados}</td>
                          <td className="px-4 py-3 text-center text-gray-600">{Number(m.dias_laborables_totales).toLocaleString('es-CO')}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-semibold ${Number(m.total_dias_ausencia) > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                              {Number(m.total_dias_ausencia).toFixed(4)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${parseFloat(pct) > 1 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {pct}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatPesos(Number(m.costo_ausencias))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                    <tr>
                      <td className="px-4 py-3 text-xs font-bold text-gray-700 uppercase">Totales</td>
                      <td className="px-4 py-3 text-center font-bold">{mensual.reduce((s, m) => s + m.dias_laborales, 0)}</td>
                      <td className="px-4 py-3 text-center text-gray-400">—</td>
                      <td className="px-4 py-3 text-center font-bold">{totalDiasLaborables.toLocaleString('es-CO')}</td>
                      <td className="px-4 py-3 text-center font-bold text-red-600">{totalDiasAnio.toFixed(4)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${parseFloat(porcentajeAnio) > 1 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {porcentajeAnio}%
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-700 whitespace-nowrap">
                        {formatPesos(mensual.reduce((s, m) => s + Number(m.costo_ausencias), 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ===== INFORME PERSONAL ===== */}
          {tab === 'personal' && (
            <div>
              <div className="mb-4 flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="w-full max-w-sm">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selecciona un empleado</label>
                  <select
                    value={empleadoSeleccionado ?? ''}
                    onChange={e => setEmpleadoSeleccionado(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">— Selecciona —</option>
                    {empleadosConAusencias.map(e => (
                      <option key={e.user_id} value={e.user_id}>{e.empleado_nombre}</option>
                    ))}
                  </select>
                </div>
                {empleadoSeleccionado && ausenciasEmpleado.length > 0 && (
                  <a
                    href={`/api/ausentismo/export?anio=${anio}&user_id=${empleadoSeleccionado}`}
                    className="inline-flex items-center justify-center gap-2 border border-primary text-primary hover:bg-primary/5 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" /> Descargar informe personal
                  </a>
                )}
              </div>

              {empleadoSeleccionado && ausenciasEmpleado.length > 0 && (
                <>
                  <div className="bg-gray-50 rounded-lg p-4 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div><span className="text-gray-500">Nombre:</span> <strong>{ausenciasEmpleado[0].empleado_nombre}</strong></div>
                    <div><span className="text-gray-500">Cédula:</span> <strong>{ausenciasEmpleado[0].cedula || '—'}</strong></div>
                    <div><span className="text-gray-500">Cargo:</span> <strong>{ausenciasEmpleado[0].cargo || '—'}</strong></div>
                    <div><span className="text-gray-500">Área:</span> <strong>{ausenciasEmpleado[0].area || <span className="text-amber-500">Pendiente</span>}</strong></div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    <StatCard
                      label="Salario"
                      value={empleadoInfo?.salario ? formatPesos(Number(empleadoInfo.salario)) : 'Sin salario'}
                    />
                    <StatCard label="Total horas" value={totalHorasEmpleado.toFixed(2)} />
                    <StatCard label="Total días" value={totalDiasEmpleado.toFixed(4)} />
                    <StatCard label="Costo ausencias año" value={empleadoInfo?.salario ? formatPesos(costoEmpleado) : 'Sin salario'} />
                  </div>
                  <div className="mb-4">
                    <ChartCard title="Días de ausencia por mes" subtitle={`${ausenciasEmpleado[0].empleado_nombre} · ${anio}`}>
                      <ColumnChart data={diasEmpleadoPorMes} format={v => `${v.toFixed(2)} d`} tickFormat={v => String(v)} />
                    </ChartCard>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-gray-200 mb-4">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {['Mes', 'Fecha', 'Tipo de ausencia', 'Concepto', 'Hora inicio', 'Hora fin', 'Horas', 'Días decimal', 'Costo', 'Soporte'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {ausenciasEmpleado.map(a => (
                          <tr key={a.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-600">{MESES[a.mes_num]}</td>
                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                              {new Date(a.fecha_ausencia).toLocaleDateString('es-CO')}
                            </td>
                            <td className="px-4 py-3 text-gray-900">{a.tipo_ausencia}</td>
                            <td className="px-4 py-3 text-gray-600">{a.concepto_ausencia}</td>
                            <td className="px-4 py-3 text-center text-gray-500">{a.hora_inicio ? a.hora_inicio.slice(0, 5) : '—'}</td>
                            <td className="px-4 py-3 text-center text-gray-500">{a.hora_fin ? a.hora_fin.slice(0, 5) : '—'}</td>
                            <td className="px-4 py-3 text-center text-gray-600">{Number(a.horas_ausencia).toFixed(2)}</td>
                            <td className="px-4 py-3 text-center font-semibold text-red-600">{Number(a.dias_decimal).toFixed(4)}</td>
                            <td className="px-4 py-3 text-gray-900 whitespace-nowrap">
                              {a.salario ? formatPesos(Number(a.costo_ausencia)) : <span className="text-amber-500 text-xs">Sin salario</span>}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {a.soporte_estado === 'pendiente' && (
                                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                  <Paperclip className="w-3 h-3" /> Pendiente
                                </span>
                              )}
                              {a.soporte_estado === 'entregado' && (
                                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                                  <Check className="w-3 h-3" /> Entregado
                                </span>
                              )}
                              {!a.soporte_estado && <span className="text-gray-300 text-xs">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                        <tr>
                          <td colSpan={6} className="px-4 py-3 text-xs font-bold text-gray-700 uppercase">Total</td>
                          <td className="px-4 py-3 text-center font-bold">{totalHorasEmpleado.toFixed(2)}</td>
                          <td className="px-4 py-3 text-center font-bold text-red-600">{totalDiasEmpleado.toFixed(4)}</td>
                          <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">{formatPesos(costoEmpleado)}</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}

              {empleadoSeleccionado && ausenciasEmpleado.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Este empleado no tiene ausencias registradas en {anio}.</p>
                </div>
              )}

              {!empleadoSeleccionado && (
                <div className="text-center py-12 text-gray-400">
                  <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Selecciona un empleado para ver su informe de ausencias.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
