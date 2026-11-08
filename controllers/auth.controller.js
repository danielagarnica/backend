const bcrypt = require('bcryptjs');
const usuarioModel = require('../models/usuario.model');
const { leerJson, enviarJson } = require('../utils/http');
const { crearToken } = require('../utils/auth');

// POST /api/auth/registro
const registrar = async (req, res) => {
  const { nombre, email, password } = await leerJson(req);
  const correo = String(email || '').trim().toLowerCase();

  if (!nombre || !String(nombre).trim() || !correo || !password) {
    return enviarJson(res, 400, { error: 'Completa nombre, correo y contraseña' });
  }
  if (String(password).length < 6) {
    return enviarJson(res, 400, { error: 'La contraseña debe tener mínimo 6 caracteres' });
  }

  if (await usuarioModel.buscarPorEmail(correo)) {
    return enviarJson(res, 409, { error: 'Ya existe una cuenta con ese correo' });
  }

  // La contraseña se guarda cifrada (hash), nunca en texto normal
  const passwordHash = await bcrypt.hash(String(password), 10);
  const usuario = await usuarioModel.crear({
    nombre: String(nombre).trim(),
    email: correo,
    passwordHash
  });

  enviarJson(res, 201, { token: crearToken(usuario), usuario });
};

// POST /api/auth/login
const iniciarSesion = async (req, res) => {
  const { email, password } = await leerJson(req);
  const correo = String(email || '').trim().toLowerCase();

  if (!correo || !password) {
    return enviarJson(res, 400, { error: 'Escribe tu correo y contraseña' });
  }

  const fila = await usuarioModel.buscarPorEmail(correo);
  const correcta = fila && (await bcrypt.compare(String(password), fila.password_hash));

  if (!correcta) {
    return enviarJson(res, 401, { error: 'Correo o contraseña incorrectos' });
  }

  const usuario = { id: fila.id, nombre: fila.nombre, email: fila.email };
  enviarJson(res, 200, { token: crearToken(usuario), usuario });
};

module.exports = { registrar, iniciarSesion };
