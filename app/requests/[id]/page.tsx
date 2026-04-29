'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { RequestActions } from '@/components/requests/RequestActions';
import { ForwardRequestModal } from '@/components/requests/ForwardRequestModal';
import { ImageAttachmentPicker } from '@/components/requests/ImageAttachmentPicker';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAttachmentUrl } from '@/lib/storage';
import { uploadRequestAttachment } from '@/lib/hooks/uploadAttachment';
import { Settings, Paperclip, CheckCircle, Search, File as FileIcon, Upload, AlertTriangle, Zap, Forward, Clock, Lock, Trash2, User, Building2 } from 'lucide-react';
import type { Request, User as TypeUser, ApprovalHistory } from '@/types';

const typeLabels: Record<string, string> = {
  compra: 'Compra/Materiales',
  permiso: 'Permiso de Ausencia',
  soporte: 'Soporte Técnico',
  certificado: 'Certificado/Documento',
  mantenimiento: 'Mantenimiento / Servicios G.',
  personalizada: 'Solicitud Personalizada',
};

const statusLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  en_proceso: 'En Proceso',
  aceptado: 'Aceptado',
  rechazado: 'Rechazado',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
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

const urgencyLabels: Record<string, string> = {
  bajo: 'Bajo',
  medio: 'Medio',
  alto: 'Alto',
};

export default function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [user, setUser] = useState<TypeUser | null>(null);
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [requestId, setRequestId] = useState<number>(0);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [newEvidenceFiles, setNewEvidenceFiles] = useState<File[]>([]);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [evidenceError, setEvidenceError] = useState('');
  const [evidenceSuccess, setEvidenceSuccess] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Obtener usuario
        const userRes = await fetch('/api/auth/me');
        if (!userRes.ok) {
          router.push('/login');
          return;
        }
        const userData = await userRes.json();
        setUser(userData.user);

        // Obtener ID de params
        const resolvedParams = await params;
        const id = parseInt(resolvedParams.id);
        setRequestId(id);

        // Obtener solicitud
        const reqRes = await fetch(`/api/requests/${id}`);
        if (reqRes.ok) {
          const reqData = await reqRes.json();
          setRequest(reqData.request);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params, router]);

  const refreshRequest = async () => {
    try {
      const res = await fetch(`/api/requests/${requestId}`);
      if (res.ok) {
        const data = await res.json();
        setRequest(data.request);
      }
    } catch (error) {
      console.error('Error refreshing request:', error);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/requests/${requestId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al eliminar');
      }
      router.push('/requests/my');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar la solicitud');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleUploadEvidence = async () => {
    if (newEvidenceFiles.length === 0) return;
    setUploadingEvidence(true);
    setEvidenceError('');
    setEvidenceSuccess('');
    try {
      for (const file of newEvidenceFiles) {
        await uploadRequestAttachment(requestId, file);
      }
      setNewEvidenceFiles([]);
      setEvidenceSuccess(`${newEvidenceFiles.length} archivo(s) subido(s) correctamente.`);
      await refreshRequest();
    } catch (err) {
      setEvidenceError(err instanceof Error ? err.message : 'Error al subir archivos');
    } finally {
      setUploadingEvidence(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!request || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Solicitud no encontrada</p>
          </div>
        </Card>
      </div>
    );
  }

  // LÓGICA DE PERMISOS
  // 0. ¿Soy el creador?
  const isOwner = request.user_id === user.id;

  // 1. ¿Me toca a mí por mi ROL?
  const isMyRole = request.current_approver_role?.toLowerCase() === user.role?.toLowerCase();

  // 2. ¿Me la asignaron a MÍ directamente por mi nombre?
  const isMyDirectAssignment = Number(request.assigned_to_user_id) === Number(user.id);

  // 3. ¿Es administrador?
  const isAdmin = user.role?.toLowerCase() === 'admin';

  // 4. ¿No tiene asignación? (disponible para todos excepto el creador)
  const isUnassigned = !request.current_approver_role && !request.assigned_to_user_id;

  // El creador NUNCA puede actuar sobre su propio proceso (solo ver y eliminar)
  const canApprove = !isOwner &&
    (isMyRole || isMyDirectAssignment || isAdmin || isUnassigned) &&
    (request.status === 'pendiente' || request.status === 'en_proceso' || request.status === 'aceptado');

  // Puede subir evidencias: dueño, asignado actual, su rol es el actual, o admin — sin importar el estado
  const canUploadEvidence = isOwner || isMyDirectAssignment || isMyRole || isAdmin;

  // Puede eliminar: dueño cuando nadie ha respondido aún (pendiente), o admin siempre
  const canDelete = (isOwner && request.status === 'pendiente') || isAdmin;

  const debugInfo = null; // Quitamos el debug ya que lo haremos funcionar bien ahora

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/requests/my" className="text-primary hover:underline mb-4 inline-block">
          ← Volver a mis solicitudes
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {request.title}
                </h1>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="info">{typeLabels[request.type]}</Badge>
                  <Badge variant={request.status === 'aceptado' ? 'success' : request.status === 'rechazado' ? 'danger' : 'warning'}>
                    {statusLabels[request.status]}
                  </Badge>
                  <Badge variant={request.urgency === 'alto' ? 'danger' : request.urgency === 'medio' ? 'warning' : 'default'}>
                    Urgencia: {urgencyLabels[request.urgency]}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Descripción</h3>
                <p className="text-gray-600 whitespace-pre-wrap">{request.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
                <div>
                  <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2">Solicitante</p>
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 text-primary p-2 rounded-full font-bold">
                      {request.user?.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{request.user?.name}</p>
                      <p className="text-xs text-gray-500">{roleLabels[request.user?.role || ''] || request.user?.role}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2">Responsable Actual</p>
                  <div className="bg-secondary/5 border border-secondary/20 rounded-xl p-3">
                    <p className="font-bold text-secondary flex items-center gap-2">
                      {request.assigned_to
                        ? <><User className="w-4 h-4 text-primary" /> {request.assigned_to.name}</>
                        : request.current_approver_role
                          ? <><Building2 className="w-4 h-4 text-primary" /> {roleLabels[request.current_approver_role] || request.current_approver_role}</>
                          : <><CheckCircle className="w-4 h-4 text-green-500" /> Finalizado</>
                      }
                    </p>

                  </div>
                </div>

                <div className="md:col-span-2">
                  <p className="text-[10px] text-gray-400 italic">
                    Fecha de creación: {format(new Date(request.created_at), "d 'de' MMMM, yyyy 'a las' HH:mm")}
                  </p>
                </div>

              </div>
            </div>
          </Card>

          {request.history && request.history.length > 0 && (
            <Card>
              <h2 className="text-xl font-semibold mb-4">Historial</h2>
              <div className="space-y-3">
                {request.history.map((item: ApprovalHistory) => (
                  <div key={item.id} className="border-l-2 border-primary pl-4 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{item.user_name}</span>
                      <span className="text-sm text-gray-500">
                        {format(new Date(item.created_at), "d MMM yyyy, HH:mm")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium capitalize">{item.action}</span>
                      {item.comment && `: ${item.comment}`}
                    </p>
                    {(item.forwarded_to_role || item.forwarded_to_user_name) && (
                      <p className="text-xs text-secondary font-medium mt-1 bg-secondary/5 inline-block px-2 py-0.5 rounded border border-secondary/10">
                        ➡️ {item.forwarded_to_role ? `Enviado a: ${roleLabels[item.forwarded_to_role] || item.forwarded_to_role}` : `Reenviado a: ${item.forwarded_to_user_name}`}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {request.attachments && request.attachments.length > 0 && (
            <Card>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-gray-500" /> Archivos y evidencias
                <Badge variant="info">{request.attachments.length}</Badge>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {request.attachments.map((file) => {
                  const isImage = file.mime_type.includes('image');
                  const fileUrl = getAttachmentUrl(file);
                  return isImage ? (
                    <button
                      key={file.id}
                      onClick={() => setLightboxImage(fileUrl)}
                      className="group relative aspect-square rounded-xl overflow-hidden border border-gray-200 hover:border-primary/40 hover:shadow-lg transition-all cursor-pointer bg-gray-100"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={fileUrl}
                        alt={file.original_filename}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <Search className="text-white w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                      </div>
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                        <p className="text-xs text-white truncate font-medium">{file.original_filename}</p>
                        <p className="text-[10px] text-white/70">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </button>
                  ) : (
                    <a
                      key={file.id}
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-primary/30 transition-all group aspect-square"
                    >
                      <div className="bg-primary/5 p-3 rounded-lg group-hover:bg-primary/10 transition-colors mb-2">
                        <FileIcon className="w-8 h-8 text-primary/70" />
                      </div>
                      <p className="text-xs font-medium text-gray-700 truncate max-w-full">{file.original_filename}</p>
                      <p className="text-[10px] text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                    </a>
                  );
                })}
              </div>
            </Card>
          )}

          {canUploadEvidence && (
            <Card>
              <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
                <Upload className="w-5 h-5 text-gray-500" /> Agregar evidencias
              </h2>
              <p className="text-xs text-gray-400 mb-4">
                Puedes adjuntar documentos o imágenes en cualquier momento, incluso si el proceso ya está cerrado.
              </p>

              <ImageAttachmentPicker
                files={newEvidenceFiles}
                onFilesChange={setNewEvidenceFiles}
                label="Seleccionar archivos (imágenes o documentos)"
              />

              {evidenceError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-3 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> {evidenceError}
                </p>
              )}
              {evidenceSuccess && (
                <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2 mt-3 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" /> {evidenceSuccess}
                </p>
              )}

              {newEvidenceFiles.length > 0 && (
                <Button
                  onClick={handleUploadEvidence}
                  disabled={uploadingEvidence}
                  className="mt-4 w-full"
                >
                  {uploadingEvidence
                    ? 'Subiendo...'
                    : `Subir ${newEvidenceFiles.length} archivo(s)`}
                </Button>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className={canApprove ? 'border-2 border-primary/20 shadow-lg' : ''}>
            {debugInfo}
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" /> Acciones
              {canApprove && <Badge variant="info">Tu turno</Badge>}
            </h2>

            {canApprove ? (
              <div className="space-y-4">
                <RequestActions requestId={request.id} currentStatus={request.status} />

                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-3 font-medium">
                    ¿No puedes resolver esto?
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setShowForwardModal(true)}
                    className="w-full text-sm"
                  >
                    ↗ Reenviar a otra área/persona
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {isMyRole || isMyDirectAssignment ? (
                  <p className="text-sm text-green-600 bg-green-50 p-3 rounded-lg border border-green-100">
                    ✅ Esta solicitud ya ha sido procesada.
                  </p>
                ) : isOwner ? (
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border">
                    ⏳ <strong>Estado:</strong> Tu solicitud está siendo revisada por <strong>{request.current_approver_role || 'el área encargada'}</strong>.
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border">
                    🔒 Esta solicitud está asignada a: <strong>{request.current_approver_role || 'otra persona'}</strong>.
                  </p>
                )}
              </div>
            )}

            {canDelete && (
              <div className="pt-4 border-t mt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full text-sm text-red-600 border-red-200 hover:bg-red-50 hover:border-red-400"
                >
                  🗑 Eliminar solicitud
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div >

      {showForwardModal && (
        <ForwardRequestModal
          requestId={request.id}
          requestType={request.type}
          onClose={() => setShowForwardModal(false)}
          onSuccess={() => {
            setShowForwardModal(false);
            refreshRequest();
          }}
        />
      )
      }

      {/* Modal de confirmación de eliminación */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">¿Eliminar solicitud?</h3>
            <p className="text-sm text-gray-600 mb-6">
              Esta acción es <strong>permanente</strong>. Se eliminarán todos los archivos e historial asociados. ¿Estás seguro?
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1"
                disabled={deleting}
              >
                Cancelar
              </Button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-xl transition-colors text-sm"
              >
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div >
  );
}

