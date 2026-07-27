import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/server-auth';
import { PendingRequestsBoard } from '@/components/requests/PendingRequestsBoard';
import { RequestModel } from '@/lib/models/request';

export default async function PendingRequestsPage() {
  const user = await getServerUser();

  if (!user) {
    redirect('/login');
  }

  // Combinar solicitudes asignadas al usuario y sin asignar (disponibles para todos)
  const byRole = await RequestModel.findByApproverRole(user.role);
  const byUser = await RequestModel.findByAssignedUser(user.id);
  const unassigned = await RequestModel.findUnassigned(user.id);

  // Combinar y eliminar duplicados. El orden y los filtros los aplica el
  // tablero en el cliente.
  const combined = [...byRole, ...byUser, ...unassigned];
  const uniqueIds = new Set<number>();
  const requests = combined.filter(req => {
    if (uniqueIds.has(req.id)) return false;
    uniqueIds.add(req.id);
    return true;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-primary mb-2">Solicitudes Pendientes</h1>
        <p className="text-gray-600">
          Solicitudes que requieren tu atención o están disponibles para gestionar
        </p>
      </div>

      {/* JSON round-trip: garantiza objetos planos (fechas y NUMERIC de Postgres)
          antes de cruzar al cliente. */}
      <PendingRequestsBoard requests={JSON.parse(JSON.stringify(requests))} />
    </div>
  );
}
