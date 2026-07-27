'use client';

import React, { useMemo, useState } from 'react';
import { RequestCard } from './RequestCard';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { isClosedStatus, isOrphanRequest } from '@/lib/utils/request-status';
import type { Request as RequestData } from '@/types';

const typeLabels: Record<string, string> = {
  compra: 'Compra/Materiales',
  permiso: 'Permiso de Ausencia',
  soporte: 'Soporte Técnico',
  certificado: 'Certificado/Documento',
  mantenimiento: 'Mantenimiento / Servicios G.',
  personalizada: 'Solicitud Personalizada',
};

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** Días de historial de cerradas que se muestran cuando no hay filtro de mes. */
const DIAS_HISTORIAL_CERRADAS = 30;

/** Clave 'YYYY-MM' de una fecha, para agrupar por mes. */
function monthKey(date: string | Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-');
  return `${MESES[Number(month) - 1]} ${year}`;
}

interface PendingRequestsBoardProps {
  requests: RequestData[];
}

export const PendingRequestsBoard: React.FC<PendingRequestsBoardProps> = ({ requests }) => {
  const [orden, setOrden] = useState<'recientes' | 'antiguas'>('recientes');
  const [mes, setMes] = useState('');
  const [tipo, setTipo] = useState('');
  const [solicitante, setSolicitante] = useState('');
  const [responsable, setResponsable] = useState('');

  // Las opciones salen de los datos reales, así ningún filtro devuelve vacío.
  const mesOptions = useMemo(() => {
    const keys = Array.from(new Set(requests.map(r => monthKey(r.created_at))));
    keys.sort().reverse();
    return [
      { value: '', label: 'Todos los meses' },
      ...keys.map(k => ({ value: k, label: monthLabel(k) })),
    ];
  }, [requests]);

  const tipoOptions = useMemo(() => {
    const types = Array.from(new Set(requests.map(r => r.type)));
    types.sort((a, b) => (typeLabels[a] || a).localeCompare(typeLabels[b] || b));
    return [
      { value: '', label: 'Todos los tipos' },
      ...types.map(t => ({ value: t, label: typeLabels[t] || t })),
    ];
  }, [requests]);

  const solicitanteOptions = useMemo(() => {
    const map = new Map<number, string>();
    requests.forEach(r => {
      if (r.user) map.set(r.user.id, r.user.name);
    });
    const entries = Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
    return [
      { value: '', label: 'Cualquier solicitante' },
      ...entries.map(([id, name]) => ({ value: String(id), label: name })),
    ];
  }, [requests]);

  const responsableOptions = useMemo(() => {
    const map = new Map<number, string>();
    requests.forEach(r => {
      if (r.assigned_to) map.set(r.assigned_to.id, r.assigned_to.name);
    });
    const entries = Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
    return [
      { value: '', label: 'Cualquier responsable' },
      ...entries.map(([id, name]) => ({ value: String(id), label: name })),
      { value: 'sin_asignar', label: '— Sin responsable —' },
    ];
  }, [requests]);

  const hayFiltros = Boolean(mes || tipo || solicitante || responsable);

  const filtradas = useMemo(() => {
    return requests.filter(r => {
      if (mes && monthKey(r.created_at) !== mes) return false;
      if (tipo && r.type !== tipo) return false;
      if (solicitante && String(r.user_id) !== solicitante) return false;
      if (responsable) {
        if (responsable === 'sin_asignar') {
          if (r.assigned_to_user_id) return false;
        } else if (String(r.assigned_to_user_id ?? '') !== responsable) {
          return false;
        }
      }
      return true;
    });
  }, [requests, mes, tipo, solicitante, responsable]);

  // Orden cronológico puro: antes se ordenaba primero por estado y urgencia,
  // por eso la lista se veía desordenada por fecha.
  const ordenar = React.useCallback(
    (lista: RequestData[]) =>
      [...lista].sort((a, b) => {
        const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return orden === 'recientes' ? -diff : diff;
      }),
    [orden]
  );

  const { huerfanas, pendientes, recibidas, cerradas } = useMemo(() => {
    const huerfanasList = filtradas.filter(isOrphanRequest);
    const huerfanasIds = new Set(huerfanasList.map(r => r.id));

    // El recorte de 30 días se salta cuando se filtra por mes: si el usuario
    // pide un mes concreto, quiere ver ese mes completo.
    const limite = Date.now() - DIAS_HISTORIAL_CERRADAS * 24 * 60 * 60 * 1000;

    return {
      huerfanas: ordenar(huerfanasList),
      pendientes: ordenar(
        filtradas.filter(
          r => !huerfanasIds.has(r.id) && (r.status === 'pendiente' || r.status === 'en_proceso')
        )
      ),
      recibidas: ordenar(
        filtradas.filter(r => !huerfanasIds.has(r.id) && r.status === 'aceptado')
      ),
      cerradas: ordenar(
        filtradas.filter(
          r =>
            isClosedStatus(r.status) &&
            (mes ? true : new Date(r.updated_at ?? r.created_at).getTime() >= limite)
        )
      ),
    };
  }, [filtradas, ordenar, mes]);

  const totalVisible = huerfanas.length + pendientes.length + recibidas.length + cerradas.length;

  const limpiarFiltros = () => {
    setMes('');
    setTipo('');
    setSolicitante('');
    setResponsable('');
  };

  const secciones = [
    {
      key: 'huerfanas',
      icon: '⚠️',
      title: 'Sin responsable asignado',
      subtitle:
        'Siguen abiertas pero nadie las ha tomado. Ábrelas para recibirlas o reenviarlas a la persona correcta.',
      items: huerfanas,
      titleClass: 'text-amber-800 border-amber-200',
      hideWhenEmpty: true,
      empty: '',
    },
    {
      key: 'pendientes',
      icon: '🔴',
      title: 'Pendientes sin responder',
      subtitle: '',
      items: pendientes,
      titleClass: 'text-gray-800',
      hideWhenEmpty: false,
      empty: 'No tienes pendientes sin responder',
    },
    {
      key: 'recibidas',
      icon: '🟡',
      title: 'Recibidas / En proceso',
      subtitle:
        'Ya las recibiste, pero siguen ABIERTAS. Solo salen de pendientes cuando pulsas "Resolver" dentro de la solicitud.',
      items: recibidas,
      titleClass: 'text-gray-800',
      hideWhenEmpty: false,
      empty: 'No tienes solicitudes recibidas en proceso',
    },
    {
      key: 'cerradas',
      icon: '🟢',
      title: mes ? 'Cerradas / Resueltas' : `Cerradas / Resueltas (últimos ${DIAS_HISTORIAL_CERRADAS} días)`,
      subtitle: '',
      items: cerradas,
      titleClass: 'text-gray-800',
      hideWhenEmpty: false,
      empty: 'No tienes solicitudes cerradas recientemente',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Filtros */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Select
            label="Ordenar por fecha"
            value={orden}
            onChange={(e) => setOrden(e.target.value as 'recientes' | 'antiguas')}
            options={[
              { value: 'recientes', label: 'Más recientes primero' },
              { value: 'antiguas', label: 'Más antiguas primero' },
            ]}
          />
          <Select
            label="Mes"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            options={mesOptions}
          />
          <Select
            label="Tipo de proceso"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            options={tipoOptions}
          />
          <Select
            label="Solicitante"
            value={solicitante}
            onChange={(e) => setSolicitante(e.target.value)}
            options={solicitanteOptions}
          />
          <Select
            label="Responsable"
            value={responsable}
            onChange={(e) => setResponsable(e.target.value)}
            options={responsableOptions}
          />
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <p className="text-sm text-gray-500">
            Mostrando <strong className="text-gray-700">{totalVisible}</strong>{' '}
            {totalVisible === 1 ? 'solicitud' : 'solicitudes'}
            {hayFiltros && ` de ${requests.length}`}
          </p>
          {hayFiltros && (
            <button
              onClick={limpiarFiltros}
              className="text-sm text-primary hover:underline font-medium"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </Card>

      {secciones.map((seccion) => {
        if (seccion.hideWhenEmpty && seccion.items.length === 0) return null;
        return (
          <section key={seccion.key}>
            <h2
              className={`text-xl font-bold mb-2 border-b pb-2 flex items-center gap-2 ${seccion.titleClass}`}
            >
              <span>{seccion.icon}</span> {seccion.title}
              {seccion.items.length > 0 && (
                <span className="text-xs font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                  {seccion.items.length}
                </span>
              )}
            </h2>
            {seccion.subtitle && (
              <p className="text-sm text-gray-600 mb-4">{seccion.subtitle}</p>
            )}
            {seccion.items.length === 0 ? (
              <Card>
                <div className="text-center py-6 bg-gray-50 rounded-xl">
                  <p className="text-gray-500 font-medium">
                    {hayFiltros ? 'Ninguna coincide con los filtros' : seccion.empty}
                  </p>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 mt-4">
                {seccion.items.map((request) => (
                  <RequestCard key={request.id} request={request} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};
