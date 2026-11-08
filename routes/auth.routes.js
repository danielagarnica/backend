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
  enviarJson(res, 404, { error: 'Ruta no encontrada' });
};

module.exports = handleAuthRoutes;
