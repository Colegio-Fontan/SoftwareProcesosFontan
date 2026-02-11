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

  if (user.role === 'empleado') {
    redirect('/');
  }

  const requests = await RequestModel.findByApproverRole(user.role);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-primary mb-2">Solicitudes Pendientes</h1>
        <p className="text-gray-600">
          Solicitudes que requieren tu aprobación o revisión
        </p>
      </div>

      {requests.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No hay solicitudes pendientes</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {requests.map((request: RequestData) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </div>
      )}
    </div>
  );
}

