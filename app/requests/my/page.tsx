import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/server-auth';
import { RequestCard } from '@/components/requests/RequestCard';
import { Card } from '@/components/ui/Card';
import { RequestModel } from '@/lib/models/request';

export default async function MyRequestsPage() {
  const user = await getServerUser();

  if (!user) {
    redirect('/login');
  }

  const requests = RequestModel.findByUserId(user.id);

  const activeRequests = requests.filter(r => r.status === 'pendiente' || r.status === 'en_proceso');
  const finalizedRequests = requests.filter(r => r.status === 'aceptado' || r.status === 'rechazado' || r.status === 'resuelto' || r.status === 'cerrado');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Mis Solicitudes</h1>
        <p className="text-gray-600">Gestiona y consulta el estado de tus solicitudes</p>
      </div>

      <div className="space-y-10">
        {/* SECCIÓN 1: ACTIVAS */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-bold text-gray-800">Solicitudes Activas</h2>
            <div className="h-px flex-1 bg-gray-200 ml-2"></div>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {activeRequests.length}
            </span>
          </div>

          {activeRequests.length === 0 ? (
            <Card className="bg-gray-50 border-dashed border-2">
              <div className="text-center py-8">
                <p className="text-gray-500 italic">No tienes solicitudes en proceso actualmente</p>
                <a href="/requests/new" className="text-primary hover:underline text-sm font-medium mt-2 inline-block">
                  + Crear nueva solicitud
                </a>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {activeRequests.map((request: any) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </section>

        {/* SECCIÓN 2: RESPUESTAS */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-bold text-gray-800">Respuestas y Resultados</h2>
            <div className="h-px flex-1 bg-gray-200 ml-2"></div>
            <span className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {finalizedRequests.length}
            </span>
          </div>

          {finalizedRequests.length === 0 ? (
            <div className="text-center py-8 bg-gray-50/50 rounded-xl border border-gray-100">
              <p className="text-gray-400 text-sm">Aún no has recibido respuestas finales</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {finalizedRequests.map((request: any) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

