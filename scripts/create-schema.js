const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL no encontrada en .env.local');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function createSchema() {
  console.log('🏗️ Creando esquema en Neon paso a paso...');
  try {
    // 1. Crear tipos/enums
    console.log('  - Creando tipos...');
    await sql`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('empleado', 'sistemas', 'gestion_humana', 'cartera', 'gerencia', 'rectoria', 'admin', 'servicios_generales');
      END IF;
    END $$;`;

    await sql`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_type') THEN
        CREATE TYPE request_type AS ENUM ('compra', 'permiso', 'soporte', 'certificado', 'mantenimiento', 'personalizada');
      END IF;
    END $$;`;

    await sql`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'urgency_level') THEN
        CREATE TYPE urgency_level AS ENUM ('bajo', 'medio', 'alto');
      END IF;
    END $$;`;

    await sql`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
        CREATE TYPE request_status AS ENUM ('pendiente', 'en_proceso', 'aceptado', 'rechazado', 'resuelto', 'cerrado');
      END IF;
    END $$;`;

    await sql`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'history_action') THEN
        CREATE TYPE history_action AS ENUM ('creado', 'enviado', 'aprobado', 'rechazado', 'comentado');
      END IF;
    END $$;`;

    // 2. Crear tablas
    console.log('  - Creando tablas...');
    await sql`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      is_confirmed BOOLEAN DEFAULT FALSE,
      confirmation_token TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`;

    await sql`CREATE TABLE IF NOT EXISTS requests (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      reason TEXT,
      urgency TEXT NOT NULL DEFAULT 'medio',
      status TEXT NOT NULL DEFAULT 'pendiente',
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      current_approver_role TEXT,
      assigned_to_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      custom_flow BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`;

    await sql`CREATE TABLE IF NOT EXISTS attachments (
      id SERIAL PRIMARY KEY,
      request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      path TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`;

    await sql`CREATE TABLE IF NOT EXISTS approval_history (
      id SERIAL PRIMARY KEY,
      request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      comment TEXT,
      previous_status TEXT,
      new_status TEXT,
      forwarded_to_role TEXT,
      forwarded_to_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`;

    // 3. Crear índices
    console.log('  - Creando índices...');
    await sql`CREATE INDEX IF NOT EXISTS idx_requests_user_id ON requests(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_requests_type ON requests(type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_requests_current_approver ON requests(current_approver_role)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_attachments_request_id ON attachments(request_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_approval_history_request_id ON approval_history(request_id)`;

    console.log('✅ Esquema creado exitosamente en Neon.');
  } catch (error) {
    console.error('❌ Error al crear el esquema:', error);
    process.exit(1);
  }
}

createSchema();
