import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Asegurar que el directorio de base de datos existe
const dbDir = path.join(process.cwd(), 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'procesos.db');
console.log('--- DATABASE INITIALIZATION ---');
console.log('Target Path:', dbPath);
console.log('Directory exists:', fs.existsSync(dbDir));
console.log('File exists:', fs.existsSync(dbPath));
console.log('-------------------------------');

const db = new Database(dbPath);

// Habilitar foreign keys
db.pragma('foreign_keys = ON');

// Optimizaciones
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

export default db;

