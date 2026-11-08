require('dotenv').config();
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL: revisa que exista el archivo .env en la raíz del backend');
}

// Supabase exige conexión segura (SSL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Prueba la conexión al arrancar
pool.query('SELECT NOW()', (err) => {
  if (err) {
    console.error('Error conectando a la base de datos:', err.code || err.message);
    return;
  }
  console.log('Conectado a la base de datos (Supabase)');
});

module.exports = pool;