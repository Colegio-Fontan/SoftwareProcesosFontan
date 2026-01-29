const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbDir = path.join(process.cwd(), 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'procesos.db');
const db = new Database(dbPath);

const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');

db.exec(schema);

console.log('✅ Base de datos migrada correctamente');
db.close();

