'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

const AREAS = [
  'Preescolar',
  'Primaria',
  'Bachillerato',
  'Académica',
  'Administrativa',
  'Administrativa/Mantenimiento',
];

interface Props {
  missingFields: { cedula: boolean; cargo: boolean; area: boolean };
  onCompleted: () => void;
}

export function ProfileCompletionModal({ missingFields, onCompleted }: Props) {
  const [form, setForm] = useState({ cedula: '', cargo: '', area: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (missingFields.cedula && !form.cedula.trim()) {
      setError('Ingresa tu número de cédula.');
      return;
    }
    if (missingFields.cargo && !form.cargo.trim()) {
      setError('Ingresa tu cargo.');
      return;
    }
    if (missingFields.area && !form.area) {
      setError('Selecciona tu área.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const body: Record<string, string> = {};
      if (missingFields.cedula) body.cedula = form.cedula.trim();
      if (missingFields.cargo) body.cargo = form.cargo.trim();
      if (missingFields.area) body.area = form.area;

      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Error al guardar');
      onCompleted();
    } catch {
      setError('No se pudo guardar. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-gray-900">Completa tu perfil</h2>
          <p className="text-sm text-gray-500 mt-1">
            Hay información de tu perfil que está incompleta. Por favor complétala para continuar.
          </p>
        </div>

        <div className="space-y-4">
          {missingFields.cedula && (
            <Input
              label="Número de cédula *"
              type="text"
              value={form.cedula}
              onChange={e => setForm({ ...form, cedula: e.target.value })}
              placeholder="Ej: 1036684160"
            />
          )}

          {missingFields.cargo && (
            <Input
              label="Cargo *"
              type="text"
              value={form.cargo}
              onChange={e => setForm({ ...form, cargo: e.target.value })}
              placeholder="Ej: Docente, Analista..."
            />
          )}

          {missingFields.area && (
            <Select
              label="Área *"
              value={form.area}
              onChange={e => setForm({ ...form, area: e.target.value })}
              options={[
                { value: '', label: 'Selecciona tu área...' },
                ...AREAS.map(a => ({ value: a, label: a })),
              ]}
            />
          )}
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}

        <div className="mt-6">
          <Button onClick={handleSave} isLoading={saving} className="w-full">
            Guardar y continuar
          </Button>
        </div>
      </div>
    </div>
  );
}
