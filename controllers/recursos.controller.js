const recursoModel = require('../models/recurso.model');
const { leerJson, enviarJson } = require('../utils/http');

// GET /api/<recurso>
const listar = async (req, res, cfg, usuarioId) => {
  const filas = await recursoModel.listar(cfg, usuarioId);
  enviarJson(res, 200, filas);
};

// POST /api/<recurso>
const crear = async (req, res, cfg, usuarioId) => {
  const datos = await leerJson(req);

  for (const campo of cfg.obligatorios) {
    if (recursoModel.vacio(datos[campo])) {
      return enviarJson(res, 400, { error: `Falta el campo: ${campo}` });
    }
  }
  for (const campo of cfg.numericos) {
    const valor = datos[campo];
    if (!recursoModel.vacio(valor) && (!Number.isFinite(Number(valor)) || Number(valor) < 0)) {
      return enviarJson(res, 400, { error: `El campo ${campo} debe ser un número válido` });
    }
  }

  let creado;
  try {
    creado = await recursoModel.crear(cfg, usuarioId, datos);
  } catch (error) {
    // Restricciones de la base de datos (ver database/schema.sql)
    if (error.code === '23503') {
      return enviarJson(res, 400, { error: 'Algún valor no es válido (por ejemplo, la categoría)' });
    }
    if (error.code === '23514') {
      return enviarJson(res, 400, { error: 'Los montos deben ser mayores que cero y los textos no pueden estar vacíos' });
    }
    if (error.code === '22007' || error.code === '22008') {
      return enviarJson(res, 400, { error: 'La fecha no es válida' });
    }
    throw error;
  }
  enviarJson(res, 201, creado);
};

// DELETE /api/<recurso>
const borrarTodos = async (req, res, cfg, usuarioId) => {
  await recursoModel.borrarTodos(cfg, usuarioId);
  enviarJson(res, 200, { message: 'Datos eliminados' });
};

// DELETE /api/<recurso>/<id>
const borrarUno = async (req, res, cfg, usuarioId, id) => {
  const borradas = await recursoModel.borrarUno(cfg, usuarioId, id);
  if (borradas === 0) {
    return enviarJson(res, 404, { error: 'Registro no encontrado' });
  }
  enviarJson(res, 200, { message: 'Registro eliminado' });
};

module.exports = { listar, crear, borrarTodos, borrarUno };
