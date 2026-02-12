const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function deleteUser(userId) {
  if (!userId) {
    console.error('Usage: node scripts/delete-user.js <userId>');
    process.exit(1);
  }

  try {
    console.log(`🗑️ Eliminando usuario con ID: ${userId}...`);

    // El borrado en cascada debería encargarse de requests/history/etc.
    const result = await sql`DELETE FROM users WHERE id = ${userId} RETURNING email`;

    if (result.length > 0) {
      console.log(`✅ Usuario ${result[0].email} eliminado exitosamente.`);
    } else {
      console.log(`⚠️ No se encontró ningún usuario con ID: ${userId}`);
    }
  } catch (error) {
    console.error('❌ Error al eliminar usuario:', error);
  }
}

const userId = process.argv[2];
deleteUser(userId);
