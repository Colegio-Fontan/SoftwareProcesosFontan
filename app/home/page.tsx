'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { User } from '@/types';
import { ShoppingCart, Calendar, Monitor, FileText, Wrench, FileEdit } from 'lucide-react';

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
      description: 'Solicita compras o materiales necesarios',
      icon: <ShoppingCart className="w-8 h-8" />,
      color: 'bg-purple-100 text-purple-800',
    },
    {
      type: 'permiso',
      title: 'Permiso de Ausencia',
      description: 'Solicita permisos de ausencia o salida temprano',
      icon: <Calendar className="w-8 h-8" />,
      color: 'bg-blue-100 text-blue-800',
    },
    {
      type: 'soporte',
      title: 'Soporte técnico',
      description: 'Solicita asistencia del área de sistemas',
      icon: <Monitor className="w-8 h-8" />,
      color: 'bg-green-100 text-green-800',
    },
    {
      type: 'certificado',
      title: 'Certificados/Documentos',
      description: 'Solicita certificados o documentos a Gestión Humana',
      icon: <FileText className="w-8 h-8" />,
      color: 'bg-orange-100 text-orange-800',
    },
    {
      type: 'mantenimiento',
      title: 'Mantenimiento / Servicios g.',
      description: 'Solicita reparaciones, aseo o servicios generales',
      icon: <Wrench className="w-8 h-8" />,
      color: 'bg-gray-100 text-gray-800',
    },
    {
      type: 'personalizada',
      title: 'Solicitud personalizada',
      description: 'Crea una solicitud flexible para cualquier caso',
      icon: <FileEdit className="w-8 h-8" />,
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
          <Link key={requestType.type} href={`/requests/new?type=${requestType.type}`} className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
            <Card className="relative h-full border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 bg-white/80 backdrop-blur-sm overflow-hidden">
              <div className="flex flex-col h-full p-2">
                <div className={`w-14 h-14 flex items-center justify-center rounded-xl mb-4 ${requestType.color} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                  {requestType.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-primary transition-colors">{requestType.title}</h3>
                  <p className="text-gray-500 text-sm mb-6 leading-relaxed">{requestType.description}</p>
                </div>
                <div className="flex items-center text-primary font-semibold text-sm group-hover:translate-x-1 transition-transform duration-300 mt-auto">
                  Crear solicitud <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
