require('dotenv').config();
const { Pool, types } = require('pg');

// Hace que PostgreSQL devuelva tipos "normales" a JavaScript:
// - bigint (id) y numeric (monto) llegan como número, no como texto
// - date llega como "2026-10-12", sin problemas de zona horaria
types.setTypeParser(20, (valor) => parseInt(valor, 10));
types.setTypeParser(1700, (valor) => parseFloat(valor));
types.setTypeParser(1082, (valor) => valor);

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
