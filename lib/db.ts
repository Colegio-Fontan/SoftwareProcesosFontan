import { neon, neonConfig } from '@neondatabase/serverless';

// Permite usar Neon en entornos locales y serverless
if (!process.env.DATABASE_URL) {
  console.warn('⚠️ DATABASE_URL no encontrada en el entorno');
}

const sql = neon(process.env.DATABASE_URL || '');

export default sql;
