const db = require('better-sqlite3')('database.sqlite');

try {
  console.log('Migrando tabla approval_history...');

  // Añadir columnas para el destino del reenvío
  db.prepare("ALTER TABLE approval_history ADD COLUMN forwarded_to_role TEXT").run();
  console.log('Añadida columna forwarded_to_role');

  db.prepare("ALTER TABLE approval_history ADD COLUMN forwarded_to_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL").run();
  console.log('Añadida columna forwarded_to_user_id');

  console.log('Migración completada con éxito.');
} catch (error) {
  if (error.message.includes('duplicate column name')) {
    console.log('Las columnas ya existen. Saltando migración.');
  } else {
    console.error('Error durante la migración:', error);
    process.exit(1);
  }
}
