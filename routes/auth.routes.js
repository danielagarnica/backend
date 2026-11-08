const bcrypt = require('bcryptjs');
const db = require('../database/connection');
const { leerJson, enviarJson } = require('../utils/http');
const { crearToken } = require('../utils/auth');

const registrar = async (req, res) => {
  const { nombre, email, password } = await leerJson(req);
  const correo = String(email || '').trim().toLowerCase();

  if (!nombre || !String(nombre).trim() || !correo || !password) {
    return enviarJson(res, 400, { error: 'Completa nombre, correo y contraseña' });
  }
  if (String(password).length < 6) {
    return enviarJson(res, 400, { error: 'La contraseña debe tener mínimo 6 caracteres' });
  }

  const existe = await db.query('SELECT id FROM usuarios WHERE email = $1', [correo]);
  if (existe.rows.length > 0) {
    return enviarJson(res, 409, { error: 'Ya existe una cuenta con ese correo' });
  }

  // La contraseña se guarda cifrada (hash), nunca en texto normal
  const hash = await bcrypt.hash(String(password), 10);
  const resultado = await db.query(
    `INSERT INTO usuarios (nombre, email, password_hash, fecha_creacion)
     VALUES ($1, $2, $3, NOW())
     RETURNING id, nombre, email`,
    [String(nombre).trim(), correo, hash]
  );

  const usuario = resultado.rows[0];
  enviarJson(res, 201, { token: crearToken(usuario), usuario });
};

const iniciarSesion = async (req, res) => {
  const { email, password } = await leerJson(req);
  const correo = String(email || '').trim().toLowerCase();

  if (!correo || !password) {
    return enviarJson(res, 400, { error: 'Escribe tu correo y contraseña' });
  }

  const resultado = await db.query(
    'SELECT id, nombre, email, password_hash FROM usuarios WHERE email = $1',
    [correo]
  );
  const fila = resultado.rows[0];
  const correcta = fila && (await bcrypt.compare(String(password), fila.password_hash));

  if (!correcta) {
    return enviarJson(res, 401, { error: 'Correo o contraseña incorrectos' });
  }

  const usuario = { id: fila.id, nombre: fila.nombre, email: fila.email };
  enviarJson(res, 200, { token: crearToken(usuario), usuario });
};

module.exports = async (req, res, pathname) => {
  if (req.method === 'POST' && pathname === '/api/auth/registro') return registrar(req, res);
  if (req.method === 'POST' && pathname === '/api/auth/login') return iniciarSesion(req, res);
  enviarJson(res, 404, { error: 'Ruta no encontrada' });
};
