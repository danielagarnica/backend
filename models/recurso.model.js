const db = require('../database/connection');

// Cada recurso describe una tabla de Supabase y los campos que envía la página.
// campos: { nombre que envía la página : columna en la base de datos }
const RECURSOS = {
  ingresos: {
    tabla: 'ingresos',
    campos: { tipo: 'tipo', monto: 'monto', fecha: 'fecha', notas: 'notas' },
    obligatorios: ['tipo', 'monto', 'fecha'],
    numericos: ['monto'],
    defecto: { notas: '' },
    seleccion: 'id, tipo, monto, fecha, notas'
  },
  gastos: {
    tabla: 'gastos',
    campos: { descripcion: 'descripcion', monto: 'monto', categoria: 'categoria', fecha: 'fecha', notas: 'notas' },
    obligatorios: ['descripcion', 'monto', 'categoria', 'fecha'],
    numericos: ['monto'],
    defecto: { notas: '' },
    seleccion: 'id, descripcion, monto, categoria, fecha, notas'
  },
  ahorros: {
    tabla: 'ahorros',
    campos: { nombre: 'nombre', monto: 'monto', fecha: 'fecha', notas: 'notas' },
    obligatorios: ['nombre', 'monto', 'fecha'],
    numericos: ['monto'],
    defecto: { notas: '' },
    seleccion: 'id, nombre, monto, fecha, notas',
    // Al registrar un ahorro, suma ese monto a la meta que tenga el mismo nombre
    despuesDeCrear: async (usuarioId, datos) => {
      await db.query(
        `UPDATE metas
            SET monto_ahorrado = monto_ahorrado + $1
          WHERE usuario_id = $2
            AND LOWER(TRIM(nombre)) = LOWER(TRIM($3))`,
        [Number(datos.monto), usuarioId, datos.nombre]
      );
    }
  },
  metas: {
    tabla: 'metas',
    campos: {
      nombre: 'nombre',
      categoria: 'categoria',
      fecha: 'fecha_limite',
      objetivo: 'monto_objetivo',
      ahorrado: 'monto_ahorrado'
    },
    obligatorios: ['nombre', 'categoria', 'fecha', 'objetivo'],
    numericos: ['objetivo', 'ahorrado'],
    defecto: { ahorrado: 0 },
    // Se renombran las columnas para que la página reciba fecha, objetivo y ahorrado
    seleccion:
      'id, nombre, categoria, fecha_limite AS fecha, monto_objetivo AS objetivo, monto_ahorrado AS ahorrado'
  }
};

const vacio = (valor) => valor === undefined || valor === null || String(valor).trim() === '';

// Devuelve la configuración del recurso o null si no existe
const obtenerConfig = (nombre) => (Object.hasOwn(RECURSOS, nombre) ? RECURSOS[nombre] : null);

// Todos los registros del usuario, del más reciente al más antiguo
const listar = async (cfg, usuarioId) => {
  const resultado = await db.query(
    `SELECT ${cfg.seleccion} FROM ${cfg.tabla} WHERE usuario_id = $1 ORDER BY id DESC`,
    [usuarioId]
  );
  return resultado.rows;
};

// Inserta un registro del usuario y devuelve la fila creada
const crear = async (cfg, usuarioId, datos) => {
  const claves = Object.keys(cfg.campos);
  const columnas = claves.map((clave) => cfg.campos[clave]);
  const valores = claves.map((clave) => {
    let valor = datos[clave];
    if (vacio(valor)) valor = clave in (cfg.defecto || {}) ? cfg.defecto[clave] : null;
    if (cfg.numericos.includes(clave) && valor !== null) valor = Number(valor);
    return valor;
  });
  const marcadores = claves.map((_, i) => `$${i + 2}`);

  const resultado = await db.query(
    `INSERT INTO ${cfg.tabla} (usuario_id, ${columnas.join(', ')}, fecha_creacion)
     VALUES ($1, ${marcadores.join(', ')}, NOW())
     RETURNING ${cfg.seleccion}`,
    [usuarioId, ...valores]
  );

  if (cfg.despuesDeCrear) await cfg.despuesDeCrear(usuarioId, datos);

  return resultado.rows[0];
};

const borrarTodos = async (cfg, usuarioId) => {
  await db.query(`DELETE FROM ${cfg.tabla} WHERE usuario_id = $1`, [usuarioId]);
};

// Devuelve cuántas filas se borraron (0 si no existía o no era del usuario)
const borrarUno = async (cfg, usuarioId, id) => {
  const resultado = await db.query(
    `DELETE FROM ${cfg.tabla} WHERE id = $1 AND usuario_id = $2`,
    [id, usuarioId]
  );
  return resultado.rowCount;
};

module.exports = { vacio, obtenerConfig, listar, crear, borrarTodos, borrarUno };
