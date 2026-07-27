/**
 * Utilidades compartidas (cliente y servidor) para garantizar que toda
 * solicitud llegue con una descripción real y que esa descripción no se
 * pierda al mostrarla.
 */

/** Mínimo de caracteres (ya recortados) exigido en la descripción. */
export const MIN_DESCRIPTION_LENGTH = 10;

/** Mínimo de caracteres (ya recortados) exigido en el título. */
export const MIN_TITLE_LENGTH = 3;

export const DESCRIPTION_REQUIRED_MESSAGE =
  `La descripción es obligatoria: escribe al menos ${MIN_DESCRIPTION_LENGTH} caracteres explicando la solicitud.`;

/**
 * Valida una descripción escrita por el usuario.
 * Devuelve el mensaje de error, o null si es válida.
 */
export function validateDescription(value: string | null | undefined): string | null {
  const text = (value ?? '').trim();
  if (text.length < MIN_DESCRIPTION_LENGTH) return DESCRIPTION_REQUIRED_MESSAGE;
  return null;
}

/** ¿Esta descripción está vacía o es solo espacios/guiones? (datos históricos) */
export function isDescriptionEmpty(value: string | null | undefined): boolean {
  const text = (value ?? '').trim();
  return text.length === 0 || /^[-.\s]+$/.test(text);
}

/**
 * Convierte 'YYYY-MM-DD' en 'DD/MM/YYYY' sin depender de zonas horarias.
 * Acepta también el ISO completo que devuelve una columna DATE
 * ('YYYY-MM-DDTHH:mm:ss.sssZ').
 */
export function formatFechaAusencia(fecha: string | null | undefined): string {
  if (!fecha) return '';
  const [y, m, d] = String(fecha).slice(0, 10).split('-');
  if (!y || !m || !d) return String(fecha);
  return `${d}/${m}/${y}`;
}

/** Calcula horas y días decimales a partir de dos horas 'HH:MM'. */
export function calcularHorasAusencia(
  horaInicio: string | null | undefined,
  horaFin: string | null | undefined
): { horas: number; dias: number } | null {
  if (!horaInicio || !horaFin) return null;
  const [hI, mI] = horaInicio.split(':').map(Number);
  const [hF, mF] = horaFin.split(':').map(Number);
  if ([hI, mI, hF, mF].some((n) => Number.isNaN(n))) return null;
  const horas = Math.round((((hF * 60 + mF) - (hI * 60 + mI)) / 60) * 100) / 100;
  const dias = Math.round((horas / 8) * 10000) / 10000;
  return { horas, dias };
}

export interface AusenciaFields {
  tipo_ausencia?: string | null;
  concepto_ausencia?: string | null;
  fecha_ausencia?: string | null;
  hora_inicio?: string | null;
  hora_fin?: string | null;
}

/**
 * Arma la descripción de una solicitud de permiso a partir de los datos de la
 * ausencia. Antes se guardaba un espacio en blanco y el aprobador recibía la
 * solicitud "sin descripción"; ahora siempre queda el detalle completo.
 */
export function buildPermisoDescription(
  ausencia: AusenciaFields,
  observaciones?: string | null
): string {
  const lineas: string[] = [];

  if (ausencia.tipo_ausencia) lineas.push(`Tipo de ausencia: ${ausencia.tipo_ausencia}`);
  if (ausencia.concepto_ausencia) lineas.push(`Concepto: ${ausencia.concepto_ausencia}`);
  if (ausencia.fecha_ausencia) lineas.push(`Fecha: ${formatFechaAusencia(ausencia.fecha_ausencia)}`);

  if (ausencia.hora_inicio && ausencia.hora_fin) {
    const calc = calcularHorasAusencia(ausencia.hora_inicio, ausencia.hora_fin);
    const duracion = calc ? ` (${calc.horas} horas · ${calc.dias} días)` : '';
    lineas.push(`Horario: ${ausencia.hora_inicio} a ${ausencia.hora_fin}${duracion}`);
  }

  const obs = (observaciones ?? '').trim();
  lineas.push(`Observaciones: ${obs.length > 0 ? obs : 'Sin observaciones adicionales.'}`);

  return lineas.join('\n');
}
