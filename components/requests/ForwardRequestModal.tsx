'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { ApproverSelector } from './ApproverSelector';
import { ImageAttachmentPicker } from './ImageAttachmentPicker';
import type { RequestType } from '@/types';

interface ForwardRequestModalProps {
  requestId: number;
  requestType: RequestType;
  onClose: () => void;
  onSuccess: () => void;
}

export const ForwardRequestModal: React.FC<ForwardRequestModalProps> = ({
  requestId,
  requestType,
  onClose,
  onSuccess,
}) => {
  const [comment, setComment] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [approverSelection, setApproverSelection] = useState<{
    type: 'role' | 'user' | 'default';
    value: string | number | null;
  }>({ type: 'default', value: null });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (approverSelection.type === 'default') {
      setError('Debes seleccionar un destinatario para reenviar');
      return;
    }

    if (!comment.trim()) {
      setError('Debes agregar un comentario explicando por qué reenvías esta solicitud');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 1. Subir archivos adjuntos si hay
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await fetch(`/api/requests/${requestId}/attachments`, {
          method: 'POST',
          body: formData,
        });
        if (!uploadRes.ok) {
          throw new Error(`Error al subir archivo: ${file.name}`);
        }
      }

      // 2. Ejecutar el reenvío
      const body: {
        action: string;
        comment: string;
        forward_to_user_id?: number | null;
        forward_to_role?: string | null;
      } = {
        action: 'forward',
        comment: comment.trim(),
      };

      if (approverSelection.type === 'user') {
        body.forward_to_user_id = Number(approverSelection.value);
      } else if (approverSelection.type === 'role') {
        body.forward_to_role = String(approverSelection.value);
      }

      const res = await fetch(`/api/requests/${requestId}/forward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al reenviar solicitud');
        return;
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-primary">Reenviar Solicitud</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
              disabled={isLoading}
            >
              ×
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                💡 <strong>Reenviar una solicitud:</strong> Úsalo cuando la solicitud llegó a ti
                pero otra área o persona debe atenderla. El nuevo destinatario verá todo el
                historial y tu comentario explicando el motivo.
              </p>
            </div>

            <Textarea
              label="¿Por qué reenvías esta solicitud?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
              rows={4}
              placeholder="Ej: No tenemos mouse disponible en Sistemas, necesita ser comprado por Cartera..."
            />

            <ImageAttachmentPicker
              files={files}
              onFilesChange={setFiles}
              label="Adjuntar imágenes de soporte (Opcional)"
            />

            <ApproverSelector
              requestType={requestType}
              value={approverSelection}
              onChange={setApproverSelection}
            />

            <div className="flex gap-3 pt-4 border-t">
              <Button type="submit" isLoading={isLoading} disabled={isLoading}>
                Reenviar Solicitud
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};






