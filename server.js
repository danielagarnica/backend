const http = require('http');
const db = require('./database/connection');
const authRoutes = require('./routes/auth.routes');
const recursosRoutes = require('./routes/recursos.routes');
const { enviarJson } = require('./utils/http');
const { servirEstatico } = require('./utils/static');

const PORT = process.env.PORT || 3000;

if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET en el archivo .env (el login no funcionará hasta agregarlo)');
}

// La página y la API se sirven desde el mismo dominio, así que no se necesita
// CORS: el navegador bloquea las peticiones de otros sitios por defecto.
//
// Defensa extra contra CSRF: una petición que modifica datos (POST, DELETE...)
// y trae un encabezado Origin de otro dominio se rechaza.
const origenPermitido = (req) => {
  const origen = req.headers.origin;
  if (!origen) return true; // Peticiones del mismo sitio en algunos navegadores, curl, etc.
  try {
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    return new URL(origen).host === host;
  } catch {
    return false;
  }
};

const server = http.createServer(async (req, res) => {
  // Encabezados de seguridad básicos para todas las respuestas
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');

  const { pathname } = new URL(req.url, 'http://localhost');

  try {
    if (pathname.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store');

      if (req.method !== 'GET' && req.method !== 'HEAD' && !origenPermitido(req)) {
        return enviarJson(res, 403, { error: 'Origen no permitido' });
      }

      // GET /api/health - Comprueba que el servidor y la base de datos respondan.
      // La usa la GitHub Action que evita que Supabase pause el proyecto.
      if (pathname === '/api/health') {
        try {
          await db.query('SELECT 1');
          return enviarJson(res, 200, { ok: true, db: 'ok' });
        } catch (error) {
          console.error('Health check: la base de datos no responde:', error.code || error.message);
          return enviarJson(res, 503, { ok: false, db: 'error' });
        }
      }
      if (pathname.startsWith('/api/auth/')) {
        return await authRoutes(req, res, pathname);
      }
      return await recursosRoutes(req, res, pathname);
    }

    if (servirEstatico(req, res, pathname)) return;

    enviarJson(res, 404, { error: 'Ruta no encontrada' });
  } catch (error) {
    if (error.message === 'JSON_INVALIDO') {
      return enviarJson(res, 400, { error: 'JSON inválido' });
    }
    console.error('Error real:', error);
    if (!res.headersSent) enviarJson(res, 500, { error: 'Error interno del servidor' });
  }
});

server.listen(PORT, () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
  console.log(`http://localhost:${PORT}`);
});

module.exports = server;
