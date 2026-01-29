'use client';

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { User } from '@/types';

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => {
        if (!res.ok) throw new Error('Not authenticated');
        return res.json();
      })
      .then(data => setUser(data.user))
      .catch(() => router.push('/'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const requestTypes = [
    {
      type: 'compra',
      title: 'Compra/Materiales',
      description: 'Solicita compras o materiales necesarios para tu área',
      icon: '🛒',
      color: 'bg-purple-100 text-purple-800',
    },
    {
      type: 'permiso',
      title: 'Permiso de Ausencia',
      description: 'Solicita permisos de ausencia o salida temprano',
      icon: '📅',
      color: 'bg-blue-100 text-blue-800',
    },
    {
      type: 'soporte',
      title: 'Soporte Técnico',
      description: 'Solicita asistencia del área de sistemas',
      icon: '💻',
      color: 'bg-green-100 text-green-800',
    },
    {
      type: 'certificado',
      title: 'Certificados/Documentos',
      description: 'Solicita certificados o documentos a Gestión Humana',
      icon: '📄',
      color: 'bg-orange-100 text-orange-800',
    },
    {
      type: 'mantenimiento',
      title: 'Mantenimiento / Servicios G.',
      description: 'Solicita reparaciones, aseo o servicios generales',
      icon: '🔧',
      color: 'bg-gray-100 text-gray-800',
    },
    {
      type: 'personalizada',
      title: 'Solicitud Personalizada',
      description: 'Crea una solicitud flexible para cualquier otro caso',
      icon: '📝',
      color: 'bg-yellow-100 text-yellow-800',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">
          Bienvenido, {user.name}
        </h1>
        <p className="text-gray-600">
          Selecciona el tipo de solicitud que deseas crear
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {requestTypes.map((requestType) => (
          <Card key={requestType.type} hover>
            <div className="flex items-start gap-4">
              <div className={`text-4xl p-3 rounded-lg ${requestType.color}`}>
                {requestType.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">{requestType.title}</h3>
                <p className="text-gray-600 mb-4">{requestType.description}</p>
                <Link href={`/requests/new?type=${requestType.type}`}>
                  <Button variant="primary" size="sm">
                    Crear Solicitud
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-xl font-semibold mb-4">Accesos Rápidos</h2>
          <div className="space-y-2">
            <Link href="/requests/my">
              <Button variant="outline" className="w-full justify-start">
                Mis Solicitudes
              </Button>
            </Link>
            {user.role !== 'empleado' && (
              <Link href="/requests/pending">
                <Button variant="outline" className="w-full justify-start">
                  Solicitudes Pendientes
                </Button>
              </Link>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold mb-4">Información</h2>
          <p className="text-gray-600 text-sm">
            Esta plataforma te permite gestionar todas tus solicitudes internas de manera
            eficiente. Cada solicitud seguirá el flujo de aprobación correspondiente según
            su tipo y tu rol en el sistema.
          </p>
        </Card>
      </div>
    </div>
  );
}
