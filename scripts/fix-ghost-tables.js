const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'database', 'procesos.db');
const db = new Database(dbPath);

console.log('Starting final migration to fix ghost references and constraints...');

try {
  db.transaction(() => {
    // 0. Disable foreign keys temporarily
    db.pragma('foreign_keys = OFF');

    // 1. Backup existing data
    console.log('Backing up data...');
    db.prepare('CREATE TABLE IF NOT EXISTS requests_backup AS SELECT * FROM requests').run();
    db.prepare('CREATE TABLE IF NOT EXISTS history_backup AS SELECT * FROM approval_history').run();

    // 2. Drop existing problematic tables
    console.log('Dropping tables...');
    db.prepare('DROP TABLE IF EXISTS approval_history').run();
    db.prepare('DROP TABLE IF EXISTS attachments').run(); // Referenced by requests
    db.prepare('DROP TABLE IF EXISTS requests').run();

    // 3. Recreate requests with correct check constraints
    console.log('Recreating requests...');
    db.prepare(`
      CREATE TABLE requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK(type IN ('compra', 'permiso', 'soporte', 'certificado', 'mantenimiento', 'personalizada')),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        reason TEXT,
        urgency TEXT NOT NULL DEFAULT 'medio' CHECK(urgency IN ('bajo', 'medio', 'alto')),
        status TEXT NOT NULL DEFAULT 'pendiente' CHECK(status IN ('pendiente', 'en_proceso', 'aceptado', 'rechazado', 'resuelto', 'cerrado')),
        user_id INTEGER NOT NULL,
        current_approver_role TEXT,
        assigned_to_user_id INTEGER,
        custom_flow BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_to_user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `).run();

    // 4. Recreate approval_history
    console.log('Recreating approval_history...');
    db.prepare(`
      CREATE TABLE approval_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        action TEXT NOT NULL CHECK(action IN ('creado', 'enviado', 'aprobado', 'rechazado', 'comentado')),
        comment TEXT,
        previous_status TEXT,
        new_status TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `).run();

    // 5. Recreate attachments
    console.log('Recreating attachments...');
    db.prepare(`
      CREATE TABLE attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        path TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
      )
    `).run();

    // 6. Restore data
    console.log('Restoring data...');
    db.prepare(`
      INSERT INTO requests (
        id, type, title, description, reason, urgency, status, user_id, 
        current_approver_role, assigned_to_user_id, custom_flow, created_at, updated_at
      )
      SELECT 
        id, type, title, description, reason, urgency, status, user_id, 
        current_approver_role, assigned_to_user_id, custom_flow, created_at, updated_at
      FROM requests_backup
    `).run();

    db.prepare(`
      INSERT INTO approval_history (
        id, request_id, user_id, action, comment, previous_status, new_status, created_at
      )
      SELECT 
        id, request_id, user_id, action, comment, previous_status, new_status, created_at
      FROM history_backup
    `).run();

    // 7. Recreate indexes
    console.log('Recreating indexes...');
    db.prepare('CREATE INDEX idx_requests_user_id ON requests(user_id)').run();
    db.prepare('CREATE INDEX idx_requests_type ON requests(type)').run();
    db.prepare('CREATE INDEX idx_requests_status ON requests(status)').run();
    db.prepare('CREATE INDEX idx_requests_current_approver ON requests(current_approver_role)').run();
    db.prepare('CREATE INDEX idx_approval_history_request_id ON approval_history(request_id)').run();

    // 8. Cleanup backups
    console.log('Cleaning up...');
    db.prepare('DROP TABLE requests_backup').run();
    db.prepare('DROP TABLE history_backup').run();

    // 9. Re-enable foreign keys
    db.pragma('foreign_keys = ON');

    console.log('Migration completed successfully!');
  })();
} catch (error) {
  console.error('Migration failed:', error);
  // Re-enable in case of error
  db.pragma('foreign_keys = ON');
  process.exit(1);
}
