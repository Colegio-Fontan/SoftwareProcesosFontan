'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BellRing, Paperclip, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Notification, NotificationType } from '@/types';

const POLL_MS = 60_000;

const icons: Record<NotificationType, React.ReactNode> = {
  soporte_pendiente: <Paperclip className="w-4 h-4 text-orange-500" />,
  soporte_vencido: <AlertTriangle className="w-4 h-4 text-red-500" />,
  soporte_entregado: <CheckCircle className="w-4 h-4 text-green-600" />,
};

export const NotificationBell: React.FC = () => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnread(data.unread || 0);
    } catch {
      // Sin conexión: se reintenta en el próximo ciclo
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const markRead = async (ids?: number[]) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    await load();
  };

  const handleClick = async (n: Notification) => {
    setOpen(false);
    if (!n.leida) await markRead([n.id]);
    if (n.request_id) router.push(`/requests/${n.request_id}`);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
        aria-label={unread > 0 ? `Notificaciones (${unread} sin leer)` : 'Notificaciones'}
      >
        <BellRing className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white text-gray-900 rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-bold">Notificaciones</p>
            {unread > 0 && (
              <button onClick={() => markRead()} className="text-xs text-primary hover:underline font-medium">
                Marcar todas como leídas
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto divide-y divide-gray-100">
            {notifications.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-gray-400">No tienes notificaciones.</li>
            )}
            {notifications.map(n => (
              <li key={n.id}>
                <button
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-gray-50 transition-colors ${n.leida ? '' : 'bg-orange-50/60'}`}
                >
                  <span className="mt-0.5 shrink-0">{icons[n.tipo] ?? <BellRing className="w-4 h-4 text-gray-400" />}</span>
                  <span className="min-w-0">
                    <span className={`block text-sm leading-snug ${n.leida ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                      {n.mensaje}
                    </span>
                    <span className="block text-[11px] text-gray-400 mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
