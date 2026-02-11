'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { Request } from '@/types';
import { format } from 'date-fns';
import Link from 'next/link';

export default function AdminRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterUrgency, setFilterUrgency] = useState('all');

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/requests?filter=all');
        if (res.ok) {
          const data = await res.json();
          setRequests(data.requests || []);
          setFilteredRequests(data.requests || []);
        } else if (res.status === 401 || res.status === 403) {
          router.replace('/');
        }
      } catch {
        // console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  useEffect(() => {
    let filtered = [...requests];
    if (searchTerm) {
      filtered = filtered.filter(req =>
        req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.user?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterType !== 'all') filtered = filtered.filter(req => req.type === filterType);
    if (filterStatus !== 'all') filtered = filtered.filter(req => req.status === filterStatus);
    if (filterUrgency !== 'all') filtered = filtered.filter(req => req.urgency === filterUrgency);
    setFilteredRequests(filtered);
  }, [searchTerm, filterType, filterStatus, filterUrgency, requests]);

  if (loading) return <div className="p-8 text-center">Cargando panel...</div>;

  const typeLabels: Record<string, string> = {
    compra: 'Compra', permiso: 'Permiso', soporte: 'Soporte',
    certificado: 'Certificado', mantenimiento: 'Mantenimiento', personalizada: 'Personalizada',
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

  const statusLabels: Record<string, string> = {
    pendiente: 'Pendiente', en_proceso: 'En Proceso', aceptado: 'Aceptado',
    rechazado: 'Rechazado', resuelto: 'Resuelto', cerrado: 'Cerrado',
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary">Panel de Administración</h1>
        <Badge variant="info">{filteredRequests.length} solicitudes</Badge>
      </div>

      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} options={[{ value: 'all', label: 'Todos los tipos' }, ...Object.entries(typeLabels).map(([v, l]) => ({ value: v, label: l }))]} />
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} options={[{ value: 'all', label: 'Todos los estados' }, ...Object.entries(statusLabels).map(([v, l]) => ({ value: v, label: l }))]} />
          <Select value={filterUrgency} onChange={(e) => setFilterUrgency(e.target.value)} options={[{ value: 'all', label: 'Todas las urgencias' }, { value: 'bajo', label: 'Bajo' }, { value: 'medio', label: 'Medio' }, { value: 'alto', label: 'Alto' }]} />
        </div>
      </Card>

      <div className="space-y-4">
        {filteredRequests.map((req) => (
          <Link key={req.id} href={`/admin/requests/${req.id}`}>
            <Card hover className="cursor-pointer">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="font-bold text-gray-400">#{req.id}</span>
                    <Badge variant="info">{typeLabels[req.type] || req.type}</Badge>
                    <Badge variant={req.status === 'aceptado' || req.status === 'resuelto' ? 'success' : req.status === 'rechazado' ? 'danger' : 'warning'}>
                      {statusLabels[req.status] || req.status}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{req.title}</h3>
                </div>
                <Badge variant={req.urgency === 'alto' ? 'danger' : 'default'}>Urgencia: {req.urgency}</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">
                    Responsable actual
                  </p>
                  <p className="text-sm font-semibold text-primary">
                    {req.assigned_to
                      ? `👤 ${req.assigned_to.name}`
                      : req.current_approver_role
                        ? `🏢 ${roleLabels[req.current_approver_role] || req.current_approver_role}`
                        : 'Nadie (Finalizado)'
                    }
                  </p>
                </div>
                <div className="flex flex-col justify-center">
                  <p className="text-xs text-gray-500">
                    Solicitado por: <span className="font-medium text-gray-700">{req.user?.name}</span>
                  </p>
                  <p className="text-xs text-gray-400">
                    Fecha: {format(new Date(req.created_at), 'dd/MM/yyyy')}
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
