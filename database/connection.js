require('dotenv').config();
const { Pool, types } = require('pg');

// Hace que PostgreSQL devuelva tipos "normales" a JavaScript:
// - bigint (id) y numeric (monto) llegan como número, no como texto
// - date llega como "2026-10-12", sin problemas de zona horaria
types.setTypeParser(20, (valor) => parseInt(valor, 10));
types.setTypeParser(1700, (valor) => parseFloat(valor));
types.setTypeParser(1082, (valor) => valor);

// Revisa la cadena de conexión y avisa de los errores más comunes
// (nunca imprime la contraseña).
const revisarUrl = (url) => {
  if (!url) {
    console.error('Falta DATABASE_URL: revisa que exista el archivo .env en la raíz del backend');
    return;
  }
  let datos;
  try {
    datos = new URL(url);
  } catch {
    console.error('DATABASE_URL no tiene un formato válido (postgresql://usuario:contraseña@host:puerto/postgres)');
    return;
  }
  if (/^db\.[a-z0-9]+\.supabase\.co$/.test(datos.hostname)) {
    console.warn(
      'Aviso: DATABASE_URL usa la conexión directa (db.<proyecto>.supabase.co), que solo funciona con IPv6.\n' +
        '       Render y muchas redes no tienen IPv6: usa la URL del "Session pooler" (…pooler.supabase.com:5432).'
    );
  }
  if (datos.hostname.endsWith('pooler.supabase.com') && !datos.username.includes('.')) {
    console.warn('Aviso: con el pooler, el usuario debe ser "postgres.<id-del-proyecto>", no solo "postgres".');
  }
  if (datos.port === '6543') {
    console.warn('Aviso: el puerto 6543 es el modo "transaction". Para este servidor se recomienda 5432 (modo "session").');
  }
};

revisarUrl(process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Supabase exige conexión segura (SSL). No se valida el certificado para
  // evitar errores de "self-signed certificate" con el pooler.
  ssl: { rejectUnauthorized: false },
  // Pocas conexiones: el plan Free del pooler tiene un límite bajo por proyecto
  max: 5,
  // Si la base no responde (p. ej. proyecto pausado), falla en 10 s en vez de
  // dejar la petición colgada para siempre
  connectionTimeoutMillis: 10000,
  // Cierra conexiones que lleven 30 s sin uso
  idleTimeoutMillis: 30000
});

// Si Supabase corta una conexión inactiva (reinicio, pausa, mantenimiento),
// pg emite este evento. Sin este manejador, Node se detendría por completo.
pool.on('error', (error) => {
  console.error('Conexión con la base de datos interrumpida:', error.code || error.message);
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
