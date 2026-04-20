-- Schema for Neon (PostgreSQL)

-- Types and Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('empleado', 'sistemas', 'gestion_humana', 'cartera', 'gerencia', 'rectoria', 'admin', 'servicios_generales');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE request_type AS ENUM ('compra', 'permiso', 'soporte', 'certificado', 'mantenimiento', 'personalizada');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE urgency_level AS ENUM ('bajo', 'medio', 'alto');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE request_status AS ENUM ('pendiente', 'en_proceso', 'aceptado', 'rechazado', 'resuelto', 'cerrado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE history_action AS ENUM ('creado', 'enviado', 'aprobado', 'rechazado', 'comentado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  is_confirmed BOOLEAN DEFAULT FALSE,
  confirmation_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de solicitudes
CREATE TABLE IF NOT EXISTS requests (
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
);

-- Tabla de archivos adjuntos
CREATE TABLE IF NOT EXISTS attachments (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de historial de aprobaciones
CREATE TABLE IF NOT EXISTS approval_history (
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
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_requests_user_id ON requests(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_type ON requests(type);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_current_approver ON requests(current_approver_role);
CREATE INDEX IF NOT EXISTS idx_attachments_request_id ON attachments(request_id);
CREATE INDEX IF NOT EXISTS idx_approval_history_request_id ON approval_history(request_id);
