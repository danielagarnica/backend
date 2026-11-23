const db = require('../database/connection');

// Error de validación con su código HTTP; el controlador lo devuelve tal cual
class ErrorValidacion extends Error {
  constructor(mensaje, estado = 400) {
    super(mensaje);
    this.estado = estado;
  }
}

const formatoCOP = (valor) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 2 })
    .format(valor);

// Saldo disponible del usuario: ingresos - gastos - ahorros.
// Bloquea al usuario durante la transacción para que dos peticiones
// simultáneas no gasten el mismo dinero.
const saldoDisponible = async (cliente, usuarioId) => {
  await cliente.query('SELECT pg_advisory_xact_lock($1)', [usuarioId]);
  const resultado = await cliente.query(
    `SELECT (SELECT COALESCE(SUM(monto), 0) FROM ingresos WHERE usuario_id = $1)
          - (SELECT COALESCE(SUM(monto), 0) FROM gastos   WHERE usuario_id = $1)
          - (SELECT COALESCE(SUM(monto), 0) FROM ahorros  WHERE usuario_id = $1) AS saldo`,
    [usuarioId]
  );
  return Number(resultado.rows[0].saldo);
};

// No se puede gastar ni ahorrar más que el saldo disponible
const validarSaldo = async (cliente, usuarioId, monto) => {
  const saldo = await saldoDisponible(cliente, usuarioId);
  if (Math.round(Number(monto) * 100) > Math.round(saldo * 100)) {
    const tieneIngresos = (await cliente.query('SELECT 1 FROM ingresos WHERE usuario_id = $1 LIMIT 1', [usuarioId])).rowCount > 0;
    throw new ErrorValidacion(
      tieneIngresos
        ? `No tienes saldo suficiente. Saldo disponible: ${formatoCOP(Math.max(saldo, 0))}.`
        : 'Primero registra un ingreso. Sin ingresos no puedes agregar gastos ni ahorros.'
    );
  }
};

// Resta de cada meta lo que le sumaron los ahorros indicados (al borrarlos)
const revertirAhorrosEnMetas = async (cliente, usuarioId, condicionExtra = '', parametros = []) => {
  await cliente.query(
    `UPDATE metas m
        SET monto_ahorrado = GREATEST(m.monto_ahorrado - s.total, 0)
       FROM (SELECT meta_id, SUM(monto) AS total
               FROM ahorros
              WHERE usuario_id = $1 AND meta_id IS NOT NULL ${condicionExtra}
              GROUP BY meta_id) s
      WHERE m.id = s.meta_id AND m.usuario_id = $1`,
    [usuarioId, ...parametros]
  );
};

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
    seleccion: 'id, descripcion, monto, categoria, fecha, notas',
    antesDeCrear: async (cliente, usuarioId, datos) => {
      await validarSaldo(cliente, usuarioId, datos.monto);
      return {};
    }
  },
  ahorros: {
    tabla: 'ahorros',
    campos: { nombre: 'nombre', monto: 'monto', fecha: 'fecha', notas: 'notas' },
    obligatorios: ['nombre', 'monto', 'fecha'],
    numericos: ['monto'],
    defecto: { notas: '' },
    seleccion: 'id, nombre, monto, fecha, notas, meta_id AS "metaId"',
    // Antes de guardar el ahorro: comprueba el saldo y enlaza la meta que el
    // usuario eligió en el formulario (metaId). Así dos metas con el mismo
    // nombre no se confunden. Devuelve columnas extra para el INSERT.
    antesDeCrear: async (cliente, usuarioId, datos) => {
      await validarSaldo(cliente, usuarioId, datos.monto);

      if (vacio(datos.metaId)) return { meta_id: null };
      if (!/^\d+$/.test(String(datos.metaId))) throw new ErrorValidacion('La meta elegida no es válida.');

      const resultado = await cliente.query(
        'SELECT id FROM metas WHERE id = $1 AND usuario_id = $2',
        [Number(datos.metaId), usuarioId]
      );
      if (resultado.rowCount === 0) throw new ErrorValidacion('La meta elegida no existe.');
      return { meta_id: resultado.rows[0].id };
    },
    // Al borrar ahorros, se descuenta de las metas lo que les habían sumado
    antesDeBorrarTodos: (cliente, usuarioId) => revertirAhorrosEnMetas(cliente, usuarioId),
    antesDeBorrarUno: (cliente, usuarioId, id) => revertirAhorrosEnMetas(cliente, usuarioId, 'AND id = $2', [id]),
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
    // La fecha límite no puede estar en el pasado (hora de Colombia)
    antesDeCrear: async (cliente, usuarioId, datos) => {
      const resultado = await cliente.query(
        "SELECT $1::date < (NOW() AT TIME ZONE 'America/Bogota')::date AS pasada",
        [datos.fecha]
      );
      if (resultado.rows[0].pasada) throw new ErrorValidacion('La fecha límite no puede estar en el pasado.');
      return {};
    },
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

// Ejecuta pasos en una transacción: o se aplican todos o ninguno
const enTransaccion = async (pasos) => {
  const cliente = await db.connect();
  try {
    await cliente.query('BEGIN');
    const resultado = await pasos(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
};

const borrarTodos = (cfg, usuarioId) =>
  enTransaccion(async (cliente) => {
    if (cfg.antesDeBorrarTodos) await cfg.antesDeBorrarTodos(cliente, usuarioId);
    await cliente.query(`DELETE FROM ${cfg.tabla} WHERE usuario_id = $1`, [usuarioId]);
  });

// Devuelve cuántas filas se borraron (0 si no existía o no era del usuario)
const borrarUno = (cfg, usuarioId, id) =>
  enTransaccion(async (cliente) => {
    if (cfg.antesDeBorrarUno) await cfg.antesDeBorrarUno(cliente, usuarioId, id);
    const resultado = await cliente.query(
      `DELETE FROM ${cfg.tabla} WHERE id = $1 AND usuario_id = $2`,
      [id, usuarioId]
    );
    return resultado.rowCount;
  });

module.exports = { vacio, obtenerConfig, listar, crear, borrarTodos, borrarUno, ErrorValidacion };
