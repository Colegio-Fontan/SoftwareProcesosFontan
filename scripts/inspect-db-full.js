const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'database', 'procesos.db');
const db = new Database(dbPath);

const tables = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table'").all();
tables.forEach(t => {
  console.log(`\nTable: ${t.name}`);
  console.log(t.sql);
});

const triggers = db.prepare("SELECT name, tbl_name, sql FROM sqlite_master WHERE type='trigger'").all();
triggers.forEach(t => {
  console.log(`\nTrigger: ${t.name} (Table: ${t.tbl_name})`);
  console.log(t.sql);
});
