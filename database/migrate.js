// Aplica las migraciones de database/migrations/ en orden (001, 002, ...).
// Uso:
//   npm run db:migrate            -> aplica los cambios
//   npm run db:migrate -- --prueba -> los ejecuta y los deshace (ROLLBACK),
//                                    para comprobar que funcionan sin cambiar nada
//
// Todas las migraciones corren en una sola transacción: si una falla,
// no se aplica ninguna. Cada archivo es idempotente (se puede repetir).
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const CARPETA = path.join(__dirname, 'migrations');
const prueba = process.argv.includes('--prueba');

const main = async () => {
  if (!process.env.DATABASE_URL) {
    console.error('Falta DATABASE_URL en el archivo .env');
    process.exit(1);
  }

  const archivos = fs.readdirSync(CARPETA).filter((f) => f.endsWith('.sql')).sort();
  if (!archivos.length) {
    console.log('No hay migraciones.');
    return;
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });

  try {
    await client.connect();
    await client.query('BEGIN');
    for (const archivo of archivos) {
      process.stdout.write(`→ ${archivo} ... `);
      await client.query(fs.readFileSync(path.join(CARPETA, archivo), 'utf8'));
      console.log('ok');
    }
    await client.query(prueba ? 'ROLLBACK' : 'COMMIT');
    console.log(prueba ? '\nPrueba correcta: se deshicieron los cambios (ROLLBACK).' : '\nMigraciones aplicadas.');
  } catch (error) {
    console.log('falló');
    await client.query('ROLLBACK').catch(() => {});
    console.error(`\nNo se aplicó ningún cambio. Error: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
};

main();
