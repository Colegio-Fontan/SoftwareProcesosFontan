'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { ImageAttachmentPicker } from './ImageAttachmentPicker';

interface ResolveRequestModalProps {
  requestId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const ResolveRequestModal: React.FC<ResolveRequestModalProps> = ({
  requestId,
  onClose,
  onSuccess,
}) => {
  const [comment, setComment] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // 1. Subir archivos primero
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await fetch(`/api/requests/${requestId}/attachments`, {
          method: 'POST',
          body: formData,
        });
        if (!uploadRes.ok) {
          throw new Error(`Error al subir evidencia: ${file.name}`);
        }
      }

      // 2. Marcar como resuelto
      const res = await fetch(`/api/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'resuelto',
          comment: comment.trim() || 'Proceso finalizado con evidencias.',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al finalizar el proceso');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-green-500">✅</span> Finalizar Proceso
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Textarea
                label="Comentario final / Conclusión"
                placeholder="Describe cómo se resolvió la solicitud..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                required
                rows={4}
              />
            </div>

            <ImageAttachmentPicker
              files={files}
              onFilesChange={setFiles}
              label="Evidencias (Opcional)"
            />

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                ⚠️ {error}
              </div>
            )}

            <div className="flex gap-4 pt-4 border-t">
              <Button
                type="submit"
                className="flex-1 bg-green-600 hover:bg-green-700"
                isLoading={isLoading}
              >
                Confirmar y Finalizar
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
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
