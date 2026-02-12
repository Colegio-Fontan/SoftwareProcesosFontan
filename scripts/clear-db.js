const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL no encontrada en .env.local');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function clearDatabase() {
  console.log('🚀 Iniciando limpieza de base de datos...');

  try {
    // El orden es importante para las llaves foráneas si no confiamos solo en CASCADE
    console.log('🗑️ Eliminando historial de aprobaciones...');
    await sql`DELETE FROM approval_history`;

    console.log('🗑️ Eliminando adjuntos...');
    await sql`DELETE FROM attachments`;

    console.log('🗑️ Eliminando solicitudes...');
    await sql`DELETE FROM requests`;

    console.log('🗑️ Eliminando usuarios...');
    await sql`DELETE FROM users`;

    console.log('✅ Base de datos limpiada exitosamente.');
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    process.exit(1);
  }
}

clearDatabase();
