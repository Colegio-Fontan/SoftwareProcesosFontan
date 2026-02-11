'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Request, ApprovalHistory } from '@/types';
import { format } from 'date-fns';
import Link from 'next/link';

export default function AdminRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { id } = await params;
        const res = await fetch(`/api/requests/${id}`);
        if (res.ok) {
          const data = await res.json();
          setRequest(data.request);
        } else {
          router.replace('/admin/requests');
        }
      } catch {
        // console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params, router]);

  if (loading) return <div className="p-8 text-center">Cargando detalle...</div>;
  if (!request) return <div className="p-8 text-center">No se encontró la solicitud.</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/admin/requests" className="text-primary mb-4 inline-block">← Volver</Link>
      <Card>
        <div className="flex justify-between items-start mb-6">
          <h1 className="text-2xl font-bold">Solicitud #{request.id}: {request.title}</h1>
          <Badge variant="info">{request.status}</Badge>
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="font-bold text-gray-700">Descripción</h3>
            <p className="p-4 bg-gray-50 rounded-lg">{request.description}</p>
          </div>
          {request.history && (
            <div className="border-t pt-4">
              <h3 className="font-bold mb-4">Historial de Eventos</h3>
              <div className="space-y-4">
                {request.history.map((h: ApprovalHistory) => (
                  <div key={h.id} className="border-l-4 border-primary pl-4 py-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-bold">{h.user_name} ({h.user_role})</span>
                      <span className="text-gray-500">{format(new Date(h.created_at), 'dd/MM/yyyy HH:mm')}</span>
                    </div>
                    <p className="text-sm mt-1">{h.action}: {h.comment || 'Sin comentario'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
