const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(process.cwd(), 'database', 'procesos.db');
const db = new Database(dbPath);

// Hash de contraseña por defecto: "password123"
const defaultPassword = bcrypt.hashSync('password123', 10);

const users = [
  {
    email: 'empleado@fontan.edu',
    password: defaultPassword,
    name: 'Juan Pérez',
    role: 'empleado',
  },
  {
    email: 'sistemas@fontan.edu',
    password: defaultPassword,
    name: 'María González',
    role: 'sistemas',
  },
  {
    email: 'gestion@fontan.edu',
    password: defaultPassword,
    name: 'Carlos Rodríguez',
    role: 'gestion_humana',
  },
  {
    email: 'cartera@fontan.edu',
    password: defaultPassword,
    name: 'Ana Martínez',
    role: 'cartera',
  },
  {
    email: 'gerencia@fontan.edu',
    password: defaultPassword,
    name: 'Luis Fernández',
    role: 'gerencia',
  },
  {
    email: 'rectoria@fontan.edu',
    password: defaultPassword,
    name: 'Patricia López',
    role: 'rectoria',
  },
];

// Insertar usuarios
const insertUser = db.prepare(`
  INSERT INTO users (email, password, name, role)
  VALUES (?, ?, ?, ?)
`);

const insertManyUsers = db.transaction((users) => {
  for (const user of users) {
    insertUser.run(user.email, user.password, user.name, user.role);
  }
});

insertManyUsers(users);

console.log('✅ Usuarios de prueba creados:');
console.log('   Todos con contraseña: password123');
users.forEach(user => {
  console.log(`   - ${user.email} (${user.role})`);
});

db.close();

