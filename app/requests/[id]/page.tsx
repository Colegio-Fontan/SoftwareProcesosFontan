'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { RequestActions } from '@/components/requests/RequestActions';
import { ForwardRequestModal } from '@/components/requests/ForwardRequestModal';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Request, User, ApprovalHistory } from '@/types';

const typeLabels: Record<string, string> = {
  compra: 'Compra/Materiales',
  permiso: 'Permiso de Ausencia',
  soporte: 'Soporte Técnico',
  certificado: 'Certificado/Documento',
  mantenimiento: 'Mantenimiento / Servicios G.',
  personalizada: 'Solicitud Personalizada',
};

const statusLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  en_proceso: 'En Proceso',
  aceptado: 'Aceptado',
  rechazado: 'Rechazado',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
};

const roleLabels: Record<string, string> = {
  empleado: 'Empleado',
  sistemas: 'Sistemas',
  gestion_humana: 'Gestión Humana',
  cartera: 'Cartera',
  gerencia: 'Gerencia',
  rectoria: 'Rectoría',
  servicios_generales: 'Servicios Generales',
  admin: 'Administrador',
};

const urgencyLabels: Record<string, string> = {
  bajo: 'Bajo',
  medio: 'Medio',
  alto: 'Alto',
};

export default function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [requestId, setRequestId] = useState<number>(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Obtener usuario
        const userRes = await fetch('/api/auth/me');
        if (!userRes.ok) {
          router.push('/login');
          return;
        }
        const userData = await userRes.json();
        setUser(userData.user);

        // Obtener ID de params
        const resolvedParams = await params;
        const id = parseInt(resolvedParams.id);
        setRequestId(id);

        // Obtener solicitud
        const reqRes = await fetch(`/api/requests/${id}`);
        if (reqRes.ok) {
          const reqData = await reqRes.json();
          setRequest(reqData.request);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params, router]);

  const refreshRequest = async () => {
    try {
      const res = await fetch(`/api/requests/${requestId}`);
      if (res.ok) {
        const data = await res.json();
        setRequest(data.request);
      }
    } catch (error) {
      console.error('Error refreshing request:', error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!request || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Solicitud no encontrada</p>
          </div>
        </Card>
      </div>
    );
  }

  // LÓGICA SIMPLIFICADA AL 100%
  // 1. ¿Me toca a mí por mi ROL?
  const isMyRole = request.current_approver_role?.toLowerCase() === user.role?.toLowerCase();

  // 2. ¿Me la asignaron a MÍ directamente por mi nombre?
  const isMyDirectAssignment = Number(request.assigned_to_user_id) === Number(user.id);

  // 3. ¿Es administrador?
  const isAdmin = user.role?.toLowerCase() === 'admin';

  // Si se cumple cualquiera, y está pendiente, PUEDO ACTUAR
  const canApprove = (isMyRole || isMyDirectAssignment || isAdmin) &&
    (request.status === 'pendiente' || request.status === 'en_proceso');

  const isOwner = request.user_id === user.id;

  const debugInfo = null; // Quitamos el debug ya que lo haremos funcionar bien ahora

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/requests/my" className="text-primary hover:underline mb-4 inline-block">
          ← Volver a mis solicitudes
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {request.title}
                </h1>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="info">{typeLabels[request.type]}</Badge>
                  <Badge variant={request.status === 'aceptado' ? 'success' : request.status === 'rechazado' ? 'danger' : 'warning'}>
                    {statusLabels[request.status]}
                  </Badge>
                  <Badge variant={request.urgency === 'alto' ? 'danger' : request.urgency === 'medio' ? 'warning' : 'default'}>
                    Urgencia: {urgencyLabels[request.urgency]}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Descripción</h3>
                <p className="text-gray-600 whitespace-pre-wrap">{request.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
                <div>
                  <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2">Solicitante</p>
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 text-primary p-2 rounded-full font-bold">
                      {request.user?.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{request.user?.name}</p>
                      <p className="text-xs text-gray-500">{roleLabels[request.user?.role || ''] || request.user?.role}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2">Responsable Actual</p>
                  <div className="bg-secondary/5 border border-secondary/20 rounded-xl p-3">
                    <p className="font-bold text-secondary flex items-center gap-2">
                      {request.assigned_to
                        ? <><span>👤</span> {request.assigned_to.name}</>
                        : request.current_approver_role
                          ? <><span>🏢</span> {roleLabels[request.current_approver_role] || request.current_approver_role}</>
                          : <><span>✅</span> Finalizado</>
                      }
                    </p>
                    {request.custom_flow && (
                      <p className="text-[10px] text-amber-600 font-medium mt-1 uppercase tracking-tight">
                        ⚙️ Flujo Personalizado / Reenviado
                      </p>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <p className="text-[10px] text-gray-400 italic">
                    Fecha de creación: {format(new Date(request.created_at), "d 'de' MMMM, yyyy 'a las' HH:mm")}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {request.history && request.history.length > 0 && (
            <Card>
              <h2 className="text-xl font-semibold mb-4">Historial</h2>
              <div className="space-y-3">
                {request.history.map((item: ApprovalHistory) => (
                  <div key={item.id} className="border-l-2 border-primary pl-4 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{item.user_name}</span>
                      <span className="text-sm text-gray-500">
                        {format(new Date(item.created_at), "d MMM yyyy, HH:mm")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium capitalize">{item.action}</span>
                      {item.comment && `: ${item.comment}`}
                    </p>
                    {(item.forwarded_to_role || item.forwarded_to_user_name) && (
                      <p className="text-xs text-secondary font-medium mt-1 bg-secondary/5 inline-block px-2 py-0.5 rounded border border-secondary/10">
                        ➡️ {item.forwarded_to_role ? `Enviado a: ${roleLabels[item.forwarded_to_role] || item.forwarded_to_role}` : `Reenviado a: ${item.forwarded_to_user_name}`}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className={canApprove ? 'border-2 border-primary/20 shadow-lg' : ''}>
            {debugInfo}
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              ⚡ Acciones
              {canApprove && <Badge variant="info">Tu turno</Badge>}
            </h2>

            {canApprove ? (
              <div className="space-y-4">
                <RequestActions requestId={request.id} currentStatus={request.status} />

                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-3 font-medium">
                    ¿No puedes resolver esto?
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setShowForwardModal(true)}
                    className="w-full text-sm"
                  >
                    ↗ Reenviar a otra área/persona
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {isMyRole || isMyDirectAssignment ? (
                  <p className="text-sm text-green-600 bg-green-50 p-3 rounded-lg border border-green-100">
                    ✅ Esta solicitud ya ha sido procesada.
                  </p>
                ) : isOwner ? (
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border">
                    ⏳ <strong>Estado:</strong> Tu solicitud está siendo revisada por <strong>{request.current_approver_role || 'el área encargada'}</strong>.
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border">
                    🔒 Esta solicitud está asignada a: <strong>{request.current_approver_role || 'otra persona'}</strong>.
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      {showForwardModal && (
        <ForwardRequestModal
          requestId={request.id}
          requestType={request.type}
          onClose={() => setShowForwardModal(false)}
          onSuccess={() => {
            setShowForwardModal(false);
            refreshRequest();
          }}
        />
      )}
    </div>
  );
}

