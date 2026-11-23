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
    // Antes de guardar el ahorro, busca la meta del usuario con el mismo nombre
    // y la enlaza (columna meta_id). Devuelve columnas extra para el INSERT.
    antesDeCrear: async (cliente, usuarioId, datos) => {
      const resultado = await cliente.query(
        `SELECT id FROM metas
          WHERE usuario_id = $1
            AND LOWER(TRIM(nombre)) = LOWER(TRIM($2))
          ORDER BY id DESC
          LIMIT 1`,
        [usuarioId, datos.nombre]
      );
      return { meta_id: resultado.rows[0] ? resultado.rows[0].id : null };
    },
    // Después de guardarlo, suma el monto a la meta enlazada
    despuesDeCrear: async (cliente, usuarioId, datos, extra) => {
      if (!extra.meta_id) return;
      await cliente.query(
        `UPDATE metas
            SET monto_ahorrado = monto_ahorrado + $1
          WHERE id = $2 AND usuario_id = $3`,
        [Number(datos.monto), extra.meta_id, usuarioId]
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
      'id, nombre, categoria, fecha_limite AS fecha, monto_objetivo AS objetivo, monto_ahorrado AS ahorrado, progreso'
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

// Inserta un registro del usuario y devuelve la fila creada.
// Todo ocurre en una transacción: si un paso falla, no se guarda nada a medias
// (por ejemplo, un ahorro registrado sin sumarse a su meta).
const crear = async (cfg, usuarioId, datos) => {
  const claves = Object.keys(cfg.campos);
  const columnas = claves.map((clave) => cfg.campos[clave]);
  const valores = claves.map((clave) => {
    let valor = datos[clave];
    if (vacio(valor)) valor = clave in (cfg.defecto || {}) ? cfg.defecto[clave] : null;
    if (cfg.numericos.includes(clave) && valor !== null) valor = Number(valor);
    return valor;
  });

  const cliente = await db.connect();
  try {
    await cliente.query('BEGIN');

    // Columnas adicionales calculadas por el recurso (p. ej. meta_id en ahorros)
    const extra = cfg.antesDeCrear ? await cfg.antesDeCrear(cliente, usuarioId, datos) : {};
    const todasColumnas = [...columnas, ...Object.keys(extra)];
    const todosValores = [...valores, ...Object.values(extra)];
    const marcadores = todosValores.map((_, i) => `$${i + 2}`);

    const resultado = await cliente.query(
      `INSERT INTO ${cfg.tabla} (usuario_id, ${todasColumnas.join(', ')}, fecha_creacion)
       VALUES ($1, ${marcadores.join(', ')}, NOW())
       RETURNING ${cfg.seleccion}`,
      [usuarioId, ...todosValores]
    );

    if (cfg.despuesDeCrear) await cfg.despuesDeCrear(cliente, usuarioId, datos, extra);

    await cliente.query('COMMIT');
    return resultado.rows[0];
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
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
