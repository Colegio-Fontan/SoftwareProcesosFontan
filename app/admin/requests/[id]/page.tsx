'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Request, ApprovalHistory, Attachment } from '@/types';
import { format } from 'date-fns';
import Link from 'next/link';

export default function AdminRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { id } = await params;
        const res = await fetch(`/api/requests/${id}`);
        if (res.ok) {
          const data = await res.json();
          setRequest(data.request);
        } else {
          router.replace('/admin/requests');
        }
      } catch {
        // console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params, router]);

  if (loading) return <div className="p-8 text-center">Cargando detalle...</div>;
  if (!request) return <div className="p-8 text-center">No se encontró la solicitud.</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/admin/requests" className="text-primary mb-4 inline-block">← Volver</Link>
      <Card>
        <div className="flex justify-between items-start mb-6">
          <h1 className="text-2xl font-bold">Solicitud #{request.id}: {request.title}</h1>
          <Badge variant="info">{request.status}</Badge>
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="font-bold text-gray-700">Descripción</h3>
            <p className="p-4 bg-gray-50 rounded-lg">{request.description}</p>
          </div>
          {request.attachments && request.attachments.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                📎 Archivos y Evidencias
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {request.attachments.length}
                </span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {request.attachments.map((file: Attachment) => {
                  const isImage = file.mime_type.includes('image');
                  return isImage ? (
                    <button
                      key={file.id}
                      onClick={() => setLightboxImage(`/api/uploads/${file.filename}`)}
                      className="group relative aspect-square rounded-xl overflow-hidden border border-gray-200 hover:border-primary/40 hover:shadow-lg transition-all cursor-pointer bg-gray-100"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/uploads/${file.filename}`}
                        alt={file.original_filename}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <span className="text-white text-2xl opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg">🔍</span>
                      </div>
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                        <p className="text-xs text-white truncate font-medium">{file.original_filename}</p>
                        <p className="text-[10px] text-white/70">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </button>
                  ) : (
                    <a
                      key={file.id}
                      href={`/api/uploads/${file.filename}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-primary/30 transition-all group aspect-square"
                    >
                      <div className="bg-primary/5 p-3 rounded-lg group-hover:bg-primary/10 transition-colors mb-2">
                        <span className="text-3xl">📄</span>
                      </div>
                      <p className="text-xs font-medium text-gray-700 truncate max-w-full">{file.original_filename}</p>
                      <p className="text-[10px] text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {request.history && (
            <div className="border-t pt-4">
              <h3 className="font-bold mb-4">Historial de Eventos</h3>
              <div className="space-y-4">
                {request.history.map((h: ApprovalHistory) => (
                  <div key={h.id} className="border-l-4 border-primary pl-4 py-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-bold">{h.user_name} ({h.user_role})</span>
                      <span className="text-gray-500">{format(new Date(h.created_at), 'dd/MM/yyyy HH:mm')}</span>
                    </div>
                    <p className="text-sm mt-1">{h.action}: {h.comment || 'Sin comentario'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Lightbox para imágenes */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 cursor-pointer"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white text-4xl font-light z-10 transition-colors"
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxImage}
            alt="Vista completa"
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
