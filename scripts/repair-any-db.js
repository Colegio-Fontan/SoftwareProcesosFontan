const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const projectRoot = process.cwd();
const dbs = [
  path.join(projectRoot, 'database.sqlite'),
  path.join(projectRoot, 'database', 'procesos.db')
];

dbs.forEach(dbPath => {
  if (!fs.existsSync(dbPath)) {
    console.log(`Skipping non-existent: ${dbPath}`);
    return;
  }

  console.log(`Repairing database: ${dbPath}`);
  try {
    const db = new Database(dbPath);
    const columns = db.prepare('PRAGMA table_info(approval_history)').all();
    const columnNames = columns.map(c => c.name);

    if (!columnNames.includes('forwarded_to_role')) {
      db.exec('ALTER TABLE approval_history ADD COLUMN forwarded_to_role TEXT');
      console.log('  [+] Added forwarded_to_role');
    }

    if (!columnNames.includes('forwarded_to_user_id')) {
      db.exec('ALTER TABLE approval_history ADD COLUMN forwarded_to_user_id INTEGER');
      console.log('  [+] Added forwarded_to_user_id');
    }

    console.log('  Success.');
    db.close();
  } catch (err) {
    console.error(`  Error repairing ${dbPath}:`, err.message);
  }
});

console.log('Repair process finished.');
