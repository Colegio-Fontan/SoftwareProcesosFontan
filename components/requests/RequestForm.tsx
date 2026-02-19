'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ApproverSelector } from './ApproverSelector';
import type { RequestType, UrgencyLevel } from '@/types';

interface RequestFormProps {
  type: RequestType;
  onSubmit: (data: FormData) => Promise<void>;
  isLoading?: boolean;
}

const typeLabels: Record<RequestType, string> = {
  compra: 'Compra/Materiales',
  permiso: 'Permiso de Ausencia',
  soporte: 'Soporte Técnico',
  certificado: 'Certificado/Documento',
  mantenimiento: 'Mantenimiento / Servicios G.',
  personalizada: 'Solicitud Personalizada',
};

export const RequestForm: React.FC<RequestFormProps> = ({
  type,
  onSubmit,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reason: '',
    urgency: 'medio' as UrgencyLevel,
  });

  const [approverSelection, setApproverSelection] = useState<{
    type: 'role' | 'user' | 'default';
    value: string | number | null;
  }>({ type: 'user', value: null });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();
    data.append('type', type);
    data.append('title', formData.title);
    data.append('description', formData.description);
    if (formData.reason) data.append('reason', formData.reason);
    data.append('urgency', formData.urgency);

    // Agregar información del destinatario
    // Agregar información del destinatario
    if (approverSelection.value) {
      data.append('assigned_to_user_id', String(approverSelection.value));
      data.append('custom_flow', 'true'); // Always custom since we are manually assigning
    } else {
      // Enforce selection (optional but recommended based on "manual selection" requirement)
      alert('Debes seleccionar a un responsable.');
      return;
    }

    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-primary mb-2">
          Nueva Solicitud: {typeLabels[type]}
        </h2>
      </div>

      <Input
        label="Título"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        required
        placeholder="Ej: Solicitud de material de oficina"
      />

      <Textarea
        label={type === 'personalizada' ? 'Detalle completo de la solicitud' : 'Descripción detallada'}
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        required
        rows={type === 'personalizada' ? 12 : 6}
        placeholder={
          type === 'personalizada'
            ? 'Describe tu solicitud con el máximo detalle posible. Incluye contexto, razones, justificación y cualquier información relevante...'
            : 'Describe tu solicitud con el mayor detalle posible...'
        }
      />

      <Select
        label="Nivel de urgencia"
        value={formData.urgency}
        onChange={(e) => setFormData({ ...formData, urgency: e.target.value as UrgencyLevel })}
        options={[
          { value: 'bajo', label: 'Bajo' },
          { value: 'medio', label: 'Medio' },
          { value: 'alto', label: 'Alto' },
        ]}
      />

      {/* Selector de destinatario */}
      <div className="border-t pt-4">
        <ApproverSelector
          requestType={type}
          value={approverSelection}
          onChange={setApproverSelection}
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" isLoading={isLoading}>
          Crear Solicitud
        </Button>
        <Button type="button" variant="outline" onClick={() => window.history.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
};

