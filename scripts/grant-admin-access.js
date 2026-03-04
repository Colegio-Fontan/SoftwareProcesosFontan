const { neon } = require('@neondatabase/serverless');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL not found in .env.local');
  process.exit(1);
}

const sql = neon(databaseUrl);

async function run() {
  const email = 'consultorti@colegiofontan.edu.co';
  try {
    console.log(`Updating role for ${email} to 'admin'...`);
    const result = await sql`
      UPDATE users 
      SET role = 'admin', is_confirmed = true 
      WHERE email = ${email}
      RETURNING id, email, name, role
    `;

    if (result.length > 0) {
      console.log('Success! User updated:', JSON.stringify(result[0], null, 2));
    } else {
      console.log('User not found in database.');
    }
  } catch (e) {
    console.error('Error updating user in Neon:', e);
  }
}

run();
