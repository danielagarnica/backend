// Diagnóstico de la conexión con Supabase.
// Uso: npm run db:check
//
// 1. Prueba la conexión con DATABASE_URL.
// 2. Compara las tablas y columnas de la base con las que usa el backend
//    (las de database/schema.sql) y dice qué falta.
// No modifica nada en la base de datos.
require('dotenv').config();
const { Client } = require('pg');

// Columnas que el backend lee o escribe, por tabla
const ESPERADO = {
  usuarios: ['id', 'nombre', 'email', 'password_hash', 'fecha_creacion'],
  categorias: ['id', 'codigo', 'nombre', 'descripcion'],
  ingresos: ['id', 'usuario_id', 'tipo', 'monto', 'fecha', 'notas', 'fecha_creacion'],
  gastos: ['id', 'usuario_id', 'categoria', 'descripcion', 'monto', 'fecha', 'notas', 'fecha_creacion'],
  metas: [
    'id', 'usuario_id', 'nombre', 'categoria', 'monto_objetivo', 'monto_ahorrado',
    'fecha_limite', 'progreso', 'fecha_creacion'
  ],
  ahorros: ['id', 'usuario_id', 'meta_id', 'nombre', 'monto', 'fecha', 'notas', 'fecha_creacion']
};

// Traduce los errores de conexión más comunes
const explicar = (error) => {
  const msg = String(error.message || '');
  if (error.code === 'ENOTFOUND') return 'No se encontró el host. Revisa la dirección en DATABASE_URL.';
  if (error.code === 'ENETUNREACH' || error.code === 'EHOSTUNREACH')
    return 'Tu red no llega a ese host (suele ser la conexión directa solo-IPv6). Usa la URL del "Session pooler".';
  if (error.code === 'ECONNREFUSED') return 'El servidor rechazó la conexión. Revisa el puerto (5432).';
  if (error.code === '28P01' || /password authentication failed/i.test(msg))
    return 'Contraseña incorrecta. Puedes restablecerla en Project Settings > Database.';
  if (/tenant or user not found/i.test(msg))
    return 'El pooler no reconoce el usuario. Debe ser "postgres.<id-del-proyecto>". También aparece si el proyecto está pausado.';
  if (/timeout/i.test(msg))
    return 'La base no respondió a tiempo. ¿El proyecto está pausado o restaurándose?';
  return null;
};

const main = async () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('✗ Falta DATABASE_URL en el archivo .env');
    process.exit(1);
  }

  let host = '?';
  try {
    const datos = new URL(url);
    host = `${datos.hostname}:${datos.port || 5432} (usuario ${datos.username})`;
  } catch {
    console.error('✗ DATABASE_URL no tiene un formato válido');
    process.exit(1);
  }
  console.log(`Conectando a ${host} ...`);

  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });

  try {
    await client.connect();
  } catch (error) {
    console.error(`✗ No se pudo conectar: ${error.code || ''} ${error.message}`);
    const ayuda = explicar(error);
    if (ayuda) console.error(`  → ${ayuda}`);
    process.exit(1);
  }

  let faltantes = 0;
  try {
    const { rows: [info] } = await client.query(
      "SELECT current_user AS usuario, current_database() AS base, split_part(version(), ' ', 2) AS version"
    );
    console.log(`✓ Conectado: base "${info.base}", usuario "${info.usuario}", PostgreSQL ${info.version}\n`);

    const { rows } = await client.query(
      `SELECT table_name, column_name
         FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ANY($1)`,
      [Object.keys(ESPERADO)]
    );
    const reales = {};
    for (const { table_name: tabla, column_name: columna } of rows) {
      (reales[tabla] ||= new Set()).add(columna);
    }

    for (const [tabla, columnas] of Object.entries(ESPERADO)) {
      if (!reales[tabla]) {
        console.log(`✗ ${tabla}: la tabla no existe`);
        faltantes++;
        continue;
      }
      const sinColumna = columnas.filter((c) => !reales[tabla].has(c));
      if (sinColumna.length) {
        console.log(`✗ ${tabla}: faltan columnas → ${sinColumna.join(', ')}`);
        faltantes++;
      } else {
        console.log(`✓ ${tabla}`);
      }
    }

    // Columnas id que no se generan solas (error "null value in column id")
    const { rows: sinIdentity } = await client.query(
      `SELECT table_name
         FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ANY($1) AND column_name = 'id'
          AND is_identity = 'NO' AND column_default IS NULL`,
      [Object.keys(ESPERADO)]
    );
    for (const { table_name: tabla } of sinIdentity) {
      console.log(`✗ ${tabla}.id no se genera automáticamente (ver README, "Problemas frecuentes")`);
      faltantes++;
    }

    console.log(
      faltantes
        ? '\nHay diferencias. Si las tablas están vacías, ejecuta "npm run db:setup" tras borrarlas; si tienen datos, pide ayuda antes de cambiarlas.'
        : '\nTodo en orden: la base coincide con lo que espera el backend.'
    );
  } finally {
    await client.end();
  }
  process.exit(faltantes ? 2 : 0);
};

main();
