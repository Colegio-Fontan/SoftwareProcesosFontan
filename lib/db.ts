import { neon } from '@neondatabase/serverless';

// Permite usar Neon en entornos locales y serverless
const databaseUrl = process.env.DATABASE_URL || '';

if (!databaseUrl && process.env.NODE_ENV === 'production') {
  console.warn('⚠️ DATABASE_URL no encontrada en el entorno de producción');
}

// Inicializamos con un string vacío o el real; 
// @neondatabase/serverless lanzará error si se intenta USAR sin URL, 
// pero evitamos que rompa el build si no se usa durante el mismo.
const sql = neon(databaseUrl);

export default sql;
