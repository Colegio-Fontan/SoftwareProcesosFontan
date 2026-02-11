const Database = require('better-sqlite3');
const { neon } = require('@neondatabase/serverless');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const dbPath = path.join(__dirname, '../database/procesos.db');
const sqlite = new Database(dbPath);

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL no encontrada en .env.local');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function migrate() {
  console.log('🚀 Iniciando migración de SQLite a Neon (PostgreSQL)...');

  try {
    // 1. Obtener datos de SQLite
    const users = sqlite.prepare('SELECT * FROM users').all();
    const requests = sqlite.prepare('SELECT * FROM requests').all();
    const history = sqlite.prepare('SELECT * FROM approval_history').all();
    const attachments = sqlite.prepare('SELECT * FROM attachments').all();

    console.log(`📊 Datos encontrados:
      - Usuarios: ${users.length}
      - Solicitudes: ${requests.length}
      - Historial: ${history.length}
      - Adjuntos: ${attachments.length}
    `);

    // 2. Insertar Usuarios
    console.log('👤 Migrando usuarios...');
    for (const user of users) {
      await sql`
        INSERT INTO users (id, email, password, name, role, is_confirmed, confirmation_token, created_at, updated_at)
        VALUES (${user.id}, ${user.email}, ${user.password}, ${user.name}, ${user.role}, ${user.is_confirmed === 1}, ${user.confirmation_token}, ${user.created_at}, ${user.updated_at})
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          is_confirmed = EXCLUDED.is_confirmed
      `;
    }

    // Reiniciar secuencia de ID para users
    await sql`SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))`;

    // 3. Insertar Solicitudes
    console.log('📋 Migrando solicitudes...');
    for (const req of requests) {
      await sql`
        INSERT INTO requests (id, type, title, description, reason, urgency, status, user_id, current_approver_role, assigned_to_user_id, custom_flow, created_at, updated_at)
        VALUES (${req.id}, ${req.type}, ${req.title}, ${req.description}, ${req.reason}, ${req.urgency}, ${req.status}, ${req.user_id}, ${req.current_approver_role}, ${req.assigned_to_user_id}, ${req.custom_flow === 1}, ${req.created_at}, ${req.updated_at})
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          current_approver_role = EXCLUDED.current_approver_role,
          assigned_to_user_id = EXCLUDED.assigned_to_user_id
      `;
    }
    await sql`SELECT setval('requests_id_seq', (SELECT MAX(id) FROM requests))`;

    // 4. Insertar Historial
    console.log('history Migrando historial...');
    for (const h of history) {
      await sql`
        INSERT INTO approval_history (id, request_id, user_id, action, comment, previous_status, new_status, forwarded_to_role, forwarded_to_user_id, created_at)
        VALUES (${h.id}, ${h.request_id}, ${h.user_id}, ${h.action}, ${h.comment}, ${h.previous_status}, ${h.new_status}, ${h.forwarded_to_role}, ${h.forwarded_to_user_id}, ${h.created_at})
        ON CONFLICT (id) DO NOTHING
      `;
    }
    await sql`SELECT setval('approval_history_id_seq', (SELECT MAX(id) FROM approval_history))`;

    // 5. Insertar Adjuntos
    console.log('📎 Migrando adjuntos...');
    for (const a of attachments) {
      await sql`
        INSERT INTO attachments (id, request_id, filename, original_filename, mime_type, size, path, created_at)
        VALUES (${a.id}, ${a.request_id}, ${a.filename}, ${a.original_filename}, ${a.mime_type}, ${a.size}, ${a.path}, ${a.created_at})
        ON CONFLICT (id) DO NOTHING
      `;
    }
    await sql`SELECT setval('attachments_id_seq', (SELECT MAX(id) FROM attachments))`;

    console.log('✅ Migración completada exitosamente.');
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    if (error.code === 'SQLITE_ERROR') {
      console.error('Detalle SQLite:', error.message);
    }
    throw error;
  } finally {
    sqlite.close();
  }
}

migrate().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
