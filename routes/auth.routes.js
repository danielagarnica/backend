const authController = require('../controllers/auth.controller');
const { enviarJson } = require('../utils/http');

// Rutas de autenticación: solo deciden qué función del controlador se ejecuta
const handleAuthRoutes = (req, res, pathname) => {
  // POST /api/auth/registro - Crear cuenta
  if (req.method === 'POST' && pathname === '/api/auth/registro') {
    return authController.registrar(req, res);
  }
  // POST /api/auth/login - Iniciar sesión
  if (req.method === 'POST' && pathname === '/api/auth/login') {
    return authController.iniciarSesion(req, res);
  }
  // POST /api/auth/logout - Cerrar sesión (borra la cookie)
  if (req.method === 'POST' && pathname === '/api/auth/logout') {
    return authController.cerrarSesion(req, res);
  }
  // GET /api/auth/me - Usuario con sesión activa
  if (req.method === 'GET' && pathname === '/api/auth/me') {
    return authController.usuarioActual(req, res);
  }
  enviarJson(res, 404, { error: 'Ruta no encontrada' });
};

module.exports = handleAuthRoutes;
