const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  console.log('🔧 Agregando columnas de reset de contraseña...');
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP WITH TIME ZONE`;
  console.log('✅ Columnas reset_token y reset_token_expires agregadas exitosamente.');
}

migrate().catch(e => {
  console.error('❌ Error:', e);
  process.exit(1);
});
