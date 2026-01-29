const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'database', 'procesos.db');
const db = new Database(dbPath);

console.log('--- TABLES ---');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log(tables);

console.log('--- TRIGGERS ---');
const triggers = db.prepare("SELECT name, tbl_name, sql FROM sqlite_master WHERE type='trigger'").all();
console.log(triggers);

console.log('--- FULL SCHEMA OF REQUESTS ---');
const schema = db.prepare("SELECT sql FROM sqlite_master WHERE name='requests'").get();
console.log(schema);

console.log('--- FULL SCHEMA OF APPROVAL_HISTORY ---');
const historySchema = db.prepare("SELECT sql FROM sqlite_master WHERE name='approval_history'").get();
console.log(historySchema);
