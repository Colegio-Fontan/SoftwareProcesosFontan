const { neon } = require('@neondatabase/serverless');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config({ path: '.env.local' });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL not found in .env.local');
  process.exit(1);
}

const sql = neon(databaseUrl);

async function run() {
  try {
    const users = await sql`SELECT id, email, name, role FROM users`;
    fs.writeFileSync('neon_users_list.json', JSON.stringify(users, null, 2));
    console.log(`Success! Found ${users.length} users. Saved to neon_users_list.json`);

    const target = users.find(u => u.email === 'consultorti@colegiofontan.edu.co');
    if (target) {
      console.log('Target user found:', JSON.stringify(target, null, 2));
    } else {
      console.log('Target user NOT found.');
    }
  } catch (e) {
    console.error('Error querying Neon:', e);
  }
}

run();
