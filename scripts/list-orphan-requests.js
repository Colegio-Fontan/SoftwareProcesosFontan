/**
 * Lista las solicitudes "huérfanas": siguen abiertas (pendiente / en_proceso /
 * aceptado) pero no tienen responsable ni área asignada.
 *
 * Estas son las que se quedaban en la bandeja de pendientes de todo el mundo
 * mostrando "Nadie (Finalizado)", así que parecían cerradas y nadie las tomaba.
 *
 * Uso:  node scripts/list-orphan-requests.js
 */
const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL no encontrada en .env.local');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function listOrphans() {
  try {
    const rows = await sql`
      SELECT r.id, r.type, r.title, r.status, r.created_at, r.updated_at,
             u.name AS solicitante, u.email AS solicitante_email
      FROM requests r
      JOIN users u ON u.id = r.user_id
      WHERE r.assigned_to_user_id IS NULL
        AND r.current_approver_role IS NULL
        AND r.status IN ('pendiente', 'en_proceso', 'aceptado')
      ORDER BY r.created_at ASC
    `;

    if (rows.length === 0) {
      console.log('✅ No hay solicitudes sin responsable.');
      return;
    }

    console.log(`⚠️  ${rows.length} solicitud(es) abiertas SIN responsable asignado:\n`);
    for (const r of rows) {
      const dias = Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000);
      console.log(
        `  #${r.id}  [${r.status}]  ${r.title}\n` +
        `      tipo: ${r.type} · de: ${r.solicitante} (${r.solicitante_email}) · ${dias} días sin atender`
      );
    }
    console.log(
      '\nAsígnalas desde la app (sección "Sin responsable asignado" en Pendientes) ' +
      'o ciérralas si ya no aplican.'
    );
  } catch (error) {
    console.error('Error listando solicitudes huérfanas:', error);
    process.exit(1);
  }
}

listOrphans();
