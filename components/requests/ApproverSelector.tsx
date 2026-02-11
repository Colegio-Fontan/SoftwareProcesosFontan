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
  const [selectionMode, setSelectionMode] = useState<'default' | 'role' | 'user'>('default');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Cargar lista de usuarios (excepto empleados regulares)
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const data = await res.json();
          const filteredUsers = data.users.filter((u: User) => u.role !== 'empleado');
          setUsers(filteredUsers);
        }
      } catch (error) {
        console.error('Error al cargar usuarios:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleModeChange = (mode: 'default' | 'role' | 'user') => {
    setSelectionMode(mode);
    if (mode === 'default') {
      onChange({ type: 'default', value: null });
    } else {
      onChange({ type: mode, value: null });
    }
  };

  const handleValueChange = (val: string) => {
    if (selectionMode === 'role') {
      onChange({ type: 'role', value: val });
    } else if (selectionMode === 'user') {
      onChange({ type: 'user', value: parseInt(val) });
    }
  };

  const recommended = recommendedApprovers[requestType] || [];

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ¿A quién deseas enviar esta solicitud?
        </label>

        {/* Modo de selección */}
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => handleModeChange('default')}
            className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${selectionMode === 'default'
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
              }`}
          >
            Flujo Automático
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('role')}
            className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${selectionMode === 'role'
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
              }`}
          >
            Por Rol
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('user')}
            className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${selectionMode === 'user'
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
              }`}
          >
            Persona Específica
          </button>
        </div>

        {/* Selector según modo */}
        {selectionMode === 'default' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              ✓ Se seguirá el flujo de aprobación estándar para este tipo de solicitud
            </p>
          </div>
        )}

        {selectionMode === 'role' && (
          <div>
            <Select
              label=""
              value={value.type === 'role' ? String(value.value) : ''}
              onChange={(e) => handleValueChange(e.target.value)}
              options={[
                { value: '', label: '-- Selecciona un rol --' },
                ...Object.entries(roleLabels)
                  .filter(([role]) => role !== 'empleado')
                  .map(([role, label]) => ({
                    value: role,
                    label: recommended.includes(role as UserRole)
                      ? `⭐ ${label} (Recomendado)`
                      : label,
                  })),
              ]}
            />
            {recommended.length > 0 && (
              <p className="text-xs text-gray-600 mt-2">
                💡 Recomendados para &quot;{requestType}&quot;: {recommended.map(r => roleLabels[r]).join(', ')}
              </p>
            )}
          </div>
        )}

        {selectionMode === 'user' && (
          <div>
            {loading ? (
              <p className="text-sm text-gray-500">Cargando usuarios...</p>
            ) : (
              <>
                <Select
                  label=""
                  value={value.type === 'user' ? String(value.value) : ''}
                  onChange={(e) => handleValueChange(e.target.value)}
                  options={[
                    { value: '', label: '-- Selecciona una persona --' },
                    ...users.map((user) => ({
                      value: String(user.id),
                      label: `${user.name} (${roleLabels[user.role]})`,
                    })),
                  ]}
                />
                {recommended.length > 0 && (
                  <p className="text-xs text-gray-600 mt-2">
                    💡 Busca personas con roles: {recommended.map(r => roleLabels[r]).join(', ')}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

