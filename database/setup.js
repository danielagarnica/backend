// Crea (o completa) las tablas de PocketPet en la base de datos del .env.
// Uso: npm run db:setup
// Es seguro ejecutarlo varias veces: schema.sql solo crea lo que falta.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const main = async () => {
  if (!process.env.DATABASE_URL) {
    console.error('Falta DATABASE_URL en el archivo .env');
    process.exit(1);
  }

  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    await client.query(sql);

    const { rows } = await client.query(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('usuarios','categorias','ingresos','gastos','metas','ahorros')
        ORDER BY table_name`
    );
    console.log('Esquema aplicado. Tablas:', rows.map((r) => r.table_name).join(', '));
  } catch (error) {
    console.error('No se pudo aplicar el esquema:', error.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
};

main();
