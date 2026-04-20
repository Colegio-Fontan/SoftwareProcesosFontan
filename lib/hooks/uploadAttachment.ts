'use client';

const UPLOAD_TIMEOUT_MS = 90_000;

/**
 * Sube un archivo al endpoint de adjuntos mediante `multipart/form-data`.
 * El servidor se encarga de enviarlo al Blob Store y de registrar el adjunto
 * en la base de datos. Si pasa {@link UPLOAD_TIMEOUT_MS} ms sin respuesta se
 * aborta y se lanza un error legible en español.
 */
export async function uploadRequestAttachment(
  requestId: number,
  file: File
): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

  try {
    const res = await fetch(`/api/requests/${requestId}/attachments`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    if (!res.ok) {
      let errorMessage = `Error al subir ${file.name}`;
      try {
        const data = (await res.json()) as { error?: string };
        if (data?.error) errorMessage = data.error;
      } catch {
        // ignore body parse errors
      }
      throw new Error(errorMessage);
    }
  } catch (err) {
    console.error('[uploadAttachment] Fallo subiendo', file.name, err);

    if (controller.signal.aborted) {
      throw new Error(
        `La subida de "${file.name}" superó ${UPLOAD_TIMEOUT_MS / 1000}s. ` +
          'Revisa tu conexión o intenta de nuevo.'
      );
    }
    throw err instanceof Error
      ? err
      : new Error(`Error al subir ${file.name}`);
  } finally {
    clearTimeout(timeoutId);
  }
}
