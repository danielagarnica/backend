const recursosController = require('../controllers/recursos.controller');
const recursoModel = require('../models/recurso.model');
const { usuarioDesdeRequest } = require('../utils/auth');
const { enviarJson } = require('../utils/http');

// Rutas de ingresos, gastos, ahorros y metas (requieren iniciar sesión)
const handleRecursosRoutes = (req, res, pathname) => {
  const usuario = usuarioDesdeRequest(req);
  if (!usuario) return enviarJson(res, 401, { error: 'Debes iniciar sesión' });

  // /api/ingresos  o  /api/ingresos/5
  const [, , nombre, id] = pathname.replace(/\/+$/, '').split('/');
  const cfg = recursoModel.obtenerConfig(nombre);
  if (!cfg || (id !== undefined && !/^\d+$/.test(id))) {
    return enviarJson(res, 404, { error: 'Ruta no encontrada' });
  }

  if (id === undefined) {
    // GET /api/<recurso> - Listar los del usuario
    if (req.method === 'GET') return recursosController.listar(req, res, cfg, usuario.id);
    // POST /api/<recurso> - Crear
    if (req.method === 'POST') return recursosController.crear(req, res, cfg, usuario.id);
    // DELETE /api/<recurso> - Borrar todos los del usuario
    if (req.method === 'DELETE') return recursosController.borrarTodos(req, res, cfg, usuario.id);
  } else if (req.method === 'DELETE') {
    // DELETE /api/<recurso>/:id - Borrar uno
    return recursosController.borrarUno(req, res, cfg, usuario.id, Number(id));
  }

  enviarJson(res, 404, { error: 'Ruta no encontrada' });
};

module.exports = handleRecursosRoutes;
