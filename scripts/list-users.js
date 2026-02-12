const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function listUsers() {
  try {
    const users = await sql`SELECT id, email, name, role FROM users`;
    console.log('--- USUARIOS ENCONTRADOS ---');
    console.log(JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error listing users:', error);
  }
}

listUsers();
