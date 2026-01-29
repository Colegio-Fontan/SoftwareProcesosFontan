import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/server-auth';
import { RequestCard } from '@/components/requests/RequestCard';
import { Card } from '@/components/ui/Card';
import { RequestModel } from '@/lib/models/request';

export default async function AllRequestsPage() {
  const user = await getServerUser();

  if (!user) {
    redirect('/login');
  }

  // Solo administradores pueden ver todas las solicitudes
  const allowedRoles = ['gerencia', 'rectoria'];
  if (!allowedRoles.includes(user.role)) {
    redirect('/');
  }

  const requests = RequestModel.getAll();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-primary mb-2">Todas las Solicitudes</h1>
        <p className="text-gray-600">Vista completa de todas las solicitudes del sistema</p>
      </div>

      {requests.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No hay solicitudes en el sistema</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {requests.map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </div>
      )}
    </div>
  );
}

