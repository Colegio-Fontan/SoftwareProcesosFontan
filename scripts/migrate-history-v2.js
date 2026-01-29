const db = require('better-sqlite3')('database.sqlite');
console.log('Iniciando migración simplificada...');
try {
  db.exec("ALTER TABLE approval_history ADD COLUMN forwarded_to_role TEXT");
  console.log('Columna forwarded_to_role añadida.');
} catch (e) {
  console.log('Columna forwarded_to_role posiblemente ya existe o error:', e.message);
}
try {
  db.exec("ALTER TABLE approval_history ADD COLUMN forwarded_to_user_id INTEGER");
  console.log('Columna forwarded_to_user_id añadida.');
} catch (e) {
  console.log('Columna forwarded_to_user_id posiblemente ya existe o error:', e.message);
}
console.log('Fin de migración.');
