'use client';

import React, { useState, useEffect } from 'react';
import { Select } from '@/components/ui/Select';
import type { User, UserRole, RequestType } from '@/types';

interface ApproverSelectorProps {
  requestType: RequestType;
  value: { type: 'role' | 'user' | 'default'; value: string | number | null };
  onChange: (selection: { type: 'role' | 'user' | 'default'; value: string | number | null }) => void;
}

const roleLabels: Record<UserRole, string> = {
  empleado: 'Empleado',
  sistemas: 'Sistemas',
  gestion_humana: 'Gestión Humana',
  cartera: 'Cartera',
  gerencia: 'Gerencia',
  rectoria: 'Rectoría',
  servicios_generales: 'Servicios Generales',
  admin: 'Administrador',
};

const recommendedApprovers: Record<RequestType, UserRole[]> = {
  compra: ['cartera', 'gerencia', 'rectoria'],
  permiso: ['gestion_humana', 'gerencia'],
  soporte: ['sistemas'],
  certificado: ['gestion_humana'],
  mantenimiento: ['servicios_generales', 'gerencia'],
  personalizada: ['gerencia', 'rectoria', 'gestion_humana'],
};

export const ApproverSelector: React.FC<ApproverSelectorProps> = ({
  requestType,
  value,
  onChange,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const data = await res.json();
          // Load ALL users, no filtering
          setUsers(data.users);
        }
      } catch (error) {
        console.error('Error al cargar usuarios:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleUserChange = (userId: string) => {
    if (!userId) {
      onChange({ type: 'user', value: null });
      return;
    }
    onChange({ type: 'user', value: parseInt(userId) });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Asignar a (Responsable)
        </label>

        {loading ? (
          <p className="text-sm text-gray-500">Cargando usuarios...</p>
        ) : (
          <Select
            label=""
            value={value.value ? String(value.value) : ''}
            onChange={(e) => handleUserChange(e.target.value)}
            options={[
              { value: '', label: '-- Selecciona una persona --' },
              ...users.map((user) => ({
                value: String(user.id),
                label: user.name, // Removed role label from display to stick to "no roles" policy
              })),
            ]}
          />
        )}
        <p className="text-xs text-gray-500 mt-1">
          Debes seleccionar manualmente a la persona encargada de gestionar esta solicitud.
        </p>
      </div>
    </div>
  );
};

