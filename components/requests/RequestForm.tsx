'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ApproverSelector } from './ApproverSelector';
import { ImageAttachmentPicker } from './ImageAttachmentPicker';
import type { RequestType, UrgencyLevel } from '@/types';

const TIPOS_AUSENCIA = [
  'Accidente común', 'Accidente laboral', 'Aislamiento preventivo',
  'Cita médica', 'Día Compensatorio', 'Enfermedad general', 'Enfermedad laboral',
  'Jurado de votación', 'Licencia maternidad', 'Licencia remunerada',
  'Licencia no remunerada', 'Licencia paternidad', 'Permiso personal',
  'Permiso trabajo', 'Sin justificación', 'Suspensión', 'Trabajo en otra sede',
];

const CONCEPTOS_AUSENCIA = [
  'Accidente común', 'Accidente laboral', 'Acompañamiento a familiar',
  'Aislamiento preventivo', 'Calamidad doméstica', 'Cita Especialista',
  'Cita médica', 'Cita medicina laboral ARL', 'Compra materiales',
  'Enfermedad general', 'Enfermedad laboral', 'Examen médico',
  'Formación laboral', 'Formación profesional', 'Incapacidad médica',
  'Intercolegiados', 'Jurado votación', 'Licencia maternidad',
  'Licencia no remunerada', 'Licencia paternidad', 'Licencia remunerada',
  'Otros', 'Trabajo en otra sede', 'Trámite en EPS', 'Trámite en notaría',
  'Trámites bancarios', 'Trámites escolares de hijos', 'Viaje',
];

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
  const isPermiso = type === 'permiso';

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reason: '',
    urgency: 'medio' as UrgencyLevel,
  });

  const [ausenciaData, setAusenciaData] = useState({
    tipo_ausencia: '',
    concepto_ausencia: '',
    fecha_ausencia: '',
    hora_inicio: '',
    hora_fin: '',
  });

  const [files, setFiles] = useState<File[]>([]);

  const [approverSelection, setApproverSelection] = useState<{
    type: 'role' | 'user' | 'default';
    value: string | number | null;
  }>({ type: 'user', value: null });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();
    data.append('type', type);

    if (isPermiso) {
      if (!ausenciaData.tipo_ausencia || !ausenciaData.concepto_ausencia || !ausenciaData.fecha_ausencia || !ausenciaData.hora_inicio || !ausenciaData.hora_fin) {
        alert('Completa todos los campos obligatorios de la ausencia.');
        return;
      }
      const autoTitle = `${ausenciaData.tipo_ausencia} - ${ausenciaData.fecha_ausencia}`;
      data.append('title', autoTitle);
      data.append('description', formData.description || ' ');
      data.append('tipo_ausencia', ausenciaData.tipo_ausencia);
      data.append('concepto_ausencia', ausenciaData.concepto_ausencia);
      data.append('fecha_ausencia', ausenciaData.fecha_ausencia);
      data.append('hora_inicio', ausenciaData.hora_inicio);
      data.append('hora_fin', ausenciaData.hora_fin);
    } else {
      data.append('title', formData.title);
      data.append('description', formData.description);
      if (formData.reason) data.append('reason', formData.reason);
    }

    data.append('urgency', formData.urgency);
    files.forEach((file) => data.append('files', file));

    if (approverSelection.value) {
      data.append('assigned_to_user_id', String(approverSelection.value));
      data.append('custom_flow', 'true');
    } else {
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

      {isPermiso ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Tipo de ausencia *"
              value={ausenciaData.tipo_ausencia}
              onChange={(e) => setAusenciaData({ ...ausenciaData, tipo_ausencia: e.target.value })}
              required
              options={[
                { value: '', label: 'Selecciona un tipo...' },
                ...TIPOS_AUSENCIA.map(t => ({ value: t, label: t })),
              ]}
            />
            <Select
              label="Concepto de ausencia *"
              value={ausenciaData.concepto_ausencia}
              onChange={(e) => setAusenciaData({ ...ausenciaData, concepto_ausencia: e.target.value })}
              required
              options={[
                { value: '', label: 'Selecciona un concepto...' },
                ...CONCEPTOS_AUSENCIA.map(c => ({ value: c, label: c })),
              ]}
            />
          </div>

          <Input
            label="Fecha de ausencia *"
            type="date"
            value={ausenciaData.fecha_ausencia}
            onChange={(e) => setAusenciaData({ ...ausenciaData, fecha_ausencia: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Hora de inicio *"
              type="time"
              value={ausenciaData.hora_inicio}
              onChange={(e) => setAusenciaData({ ...ausenciaData, hora_inicio: e.target.value })}
              required
            />
            <Input
              label="Hora de fin *"
              type="time"
              value={ausenciaData.hora_fin}
              onChange={(e) => setAusenciaData({ ...ausenciaData, hora_fin: e.target.value })}
              required
            />
          </div>

          {ausenciaData.hora_inicio && ausenciaData.hora_fin && (() => {
            const [hI, mI] = ausenciaData.hora_inicio.split(':').map(Number);
            const [hF, mF] = ausenciaData.hora_fin.split(':').map(Number);
            const horas = ((hF * 60 + mF) - (hI * 60 + mI)) / 60;
            if (horas <= 0) return <p className="text-sm text-red-500">La hora de fin debe ser mayor a la hora de inicio.</p>;
            return (
              <p className="text-sm text-gray-500">
                <strong>{horas.toFixed(2)} horas</strong> de ausencia — equivale a <strong>{(horas / 8).toFixed(4)} días</strong>
              </p>
            );
          })()}

          <Textarea
            label="Observaciones (opcional)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            placeholder="Información adicional sobre la ausencia..."
          />
        </>
      ) : (
        <>
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
        </>
      )}

      <ImageAttachmentPicker files={files} onFilesChange={setFiles} />

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

