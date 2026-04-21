import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/server-auth';
import { RequestCard } from '@/components/requests/RequestCard';
import { Card } from '@/components/ui/Card';
import { RequestModel } from '@/lib/models/request';
import type { Request as RequestData } from '@/types';

export default async function PendingRequestsPage() {
  const user = await getServerUser();

  if (!user) {
    redirect('/login');
  }

  // Combinar solicitudes asignadas al usuario y sin asignar (disponibles para todos)
  const byRole = await RequestModel.findByApproverRole(user.role);
  const byUser = await RequestModel.findByAssignedUser(user.id);
  const unassigned = await RequestModel.findUnassigned(user.id);

  // Combinar y eliminar duplicados
  const combined = [...byRole, ...byUser, ...unassigned];
  const uniqueIds = new Set();
  const requests = combined.filter(req => {
    if (uniqueIds.has(req.id)) return false;
    uniqueIds.add(req.id);
    return true;
  }).sort((a, b) => {
    const getStatusWeight = (status: string) => {
      if (status === 'pendiente' || status === 'en_proceso') return 1;
      if (status === 'aceptado') return 2;
      return 3;
    };
    const diff = getStatusWeight(a.status) - getStatusWeight(b.status);
    if (diff !== 0) return diff;
    
    const getUrgencyWeight = (urgency: string) => {
      if (urgency === 'alto') return 1;
      if (urgency === 'medio') return 2;
      if (urgency === 'bajo') return 3;
      return 4;
    };
    const urgencyDiff = getUrgencyWeight(a.urgency) - getUrgencyWeight(b.urgency);
    if (urgencyDiff !== 0) return urgencyDiff;
    
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const pendientesSinResponder = requests.filter(r => r.status === 'pendiente' || r.status === 'en_proceso');
  const recibidas = requests.filter(r => r.status === 'aceptado');
  const cerradas = requests.filter(r => ['resuelto', 'cerrado', 'rechazado'].includes(r.status));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-primary mb-2">Solicitudes Pendientes</h1>
        <p className="text-gray-600">
          Solicitudes que requieren tu atención o están disponibles para gestionar
        </p>
      </div>

      <div className="space-y-8">
        {/* Sección: Pendientes por responder */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
            <span>🔴</span> Pendientes sin responder
          </h2>
          {pendientesSinResponder.length === 0 ? (
            <Card>
              <div className="text-center py-6 bg-gray-50 rounded-xl">
                <p className="text-gray-500 font-medium">No tienes pendientes sin responder</p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendientesSinResponder.map((request: RequestData) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </section>

        {/* Sección: Recibidas / En proceso (Aceptadas) */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
            <span>🟡</span> Recibidas / En proceso
          </h2>
          {recibidas.length === 0 ? (
            <Card>
              <div className="text-center py-6 bg-gray-50 rounded-xl">
                <p className="text-gray-500 font-medium">No tienes solicitudes recibidas en proceso</p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {recibidas.map((request: RequestData) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </section>

        {/* Sección: Cerradas / Resueltas */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
            <span>🟢</span> Cerradas / Resueltas
          </h2>
          {cerradas.length === 0 ? (
            <Card>
              <div className="text-center py-6 bg-gray-50 rounded-xl">
                <p className="text-gray-500 font-medium">No tienes solicitudes cerradas recientemente</p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {cerradas.map((request: RequestData) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

