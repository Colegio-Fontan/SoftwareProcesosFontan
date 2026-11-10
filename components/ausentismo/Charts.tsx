'use client';

import React, { useState } from 'react';

// Gráficas de una sola serie: un solo color (el morado de la marca); los textos
// van siempre en grises, nunca en el color de la barra.
const BAR_COLOR = '#50007D';
const BAR_HOVER = '#7a2fa6';

export interface ChartDatum {
  label: string;
  value: number;
  detail?: string;
}

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function ChartCard({ title, subtitle, children }: ChartCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

/** Barras horizontales para rankings (personas, tipos de ausencia). */
export function HBarChart({ data, format, emptyText = 'Sin datos para mostrar.' }: {
  data: ChartDatum[];
  format: (v: number) => string;
  emptyText?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map(d => d.value), 0);

  if (data.length === 0 || max === 0) {
    return <p className="text-sm text-gray-400 py-6 text-center">{emptyText}</p>;
  }

  return (
    <ul className="space-y-2" role="list">
      {data.map((d, i) => (
        <li
          key={d.label}
          className="relative grid grid-cols-[minmax(0,9rem)_1fr] sm:grid-cols-[minmax(0,12rem)_1fr] items-center gap-3 text-xs"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
        >
          <span className="truncate text-gray-700" title={d.label}>{d.label}</span>
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex-1 min-w-0">
              <div
                className="h-4 rounded-r transition-colors"
                style={{
                  width: `${Math.max((d.value / max) * 100, 1)}%`,
                  backgroundColor: hover === i ? BAR_HOVER : BAR_COLOR,
                }}
              />
            </div>
            <span className="shrink-0 w-24 text-right text-gray-600 tabular-nums">{format(d.value)}</span>
          </div>
          {hover === i && d.detail && (
            <div className="absolute z-10 left-1/3 -top-9 bg-gray-900 text-white text-xs rounded px-2 py-1 shadow-lg whitespace-nowrap pointer-events-none">
              {d.detail}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Columnas verticales para series en el tiempo (meses). */
export function ColumnChart({ data, format, tickFormat }: {
  data: ChartDatum[];
  format: (v: number) => string;
  tickFormat?: (v: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 640;
  const height = 220;
  const pad = { top: 16, right: 8, bottom: 28, left: 52 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const rawMax = Math.max(...data.map(d => d.value), 0);
  const ticks = niceTicks(rawMax);
  const max = ticks[ticks.length - 1] || 1;
  const band = plotW / Math.max(data.length, 1);
  const barW = Math.min(24, band * 0.6);
  const maxIndex = data.findIndex(d => d.value === rawMax && rawMax > 0);
  const y = (v: number) => pad.top + plotH - (v / max) * plotH;
  const tickLabel = tickFormat ?? format;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img">
        {ticks.map(t => (
          <g key={t}>
            <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="#e5e7eb" strokeWidth={1} />
            <text x={pad.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="#6b7280">
              {tickLabel(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = pad.left + band * i + band / 2;
          const h = Math.max(plotH * (d.value / max), d.value > 0 ? 2 : 0);
          const top = pad.top + plotH - h;
          const r = Math.min(4, h);
          return (
            <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={pad.left + band * i} y={pad.top} width={band} height={plotH} fill="transparent" />
              {h > 0 && (
                <path
                  d={`M${cx - barW / 2},${pad.top + plotH} V${top + r} Q${cx - barW / 2},${top} ${cx - barW / 2 + r},${top} H${cx + barW / 2 - r} Q${cx + barW / 2},${top} ${cx + barW / 2},${top + r} V${pad.top + plotH} Z`}
                  fill={hover === i ? BAR_HOVER : BAR_COLOR}
                />
              )}
              {i === maxIndex && (
                <text x={cx} y={top - 5} textAnchor="middle" fontSize={11} fontWeight={600} fill="#374151">
                  {format(d.value)}
                </text>
              )}
              <text x={cx} y={height - 10} textAnchor="middle" fontSize={11} fill="#6b7280">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      {hover !== null && data[hover] && (
        <div
          className="absolute top-0 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 shadow-lg whitespace-nowrap pointer-events-none"
          style={{ left: `${((pad.left + band * hover + band / 2) / width) * 100}%` }}
        >
          <strong>{data[hover].label}:</strong> {data[hover].detail ?? format(data[hover].value)}
        </div>
      )}
    </div>
  );
}

function niceTicks(max: number): number[] {
  if (max <= 0) return [0, 1];
  const rough = max / 4;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const step = [1, 2, 2.5, 5, 10].map(m => m * pow).find(s => s >= rough) ?? rough;
  const ticks: number[] = [];
  for (let t = 0; t <= max + step * 0.001; t += step) ticks.push(Number(t.toFixed(6)));
  if (ticks[ticks.length - 1] < max) ticks.push(Number((ticks[ticks.length - 1] + step).toFixed(6)));
  return ticks;
}

export const formatPesos = (v: number) => `$${Math.round(v).toLocaleString('es-CO')}`;

export const formatPesosCorto = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000).toLocaleString('es-CO')}K`;
  return `$${Math.round(v)}`;
};
