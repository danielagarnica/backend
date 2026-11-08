const http = require('http');
const authRoutes = require('./routes/auth.routes');
const recursosRoutes = require('./routes/recursos.routes');
const { enviarJson } = require('./utils/http');

const PORT = process.env.PORT || 3000;

if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET en el archivo .env (el login no funcionará hasta agregarlo)');
}

const server = http.createServer(async (req, res) => {
  // CORS: permite que la página (otro puerto) hable con este backend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const { pathname } = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  try {
    if (pathname === '/') {
      return enviarJson(res, 200, { message: 'Servidor backend activo' });
    }
    if (pathname.startsWith('/api/auth/')) {
      return await authRoutes(req, res, pathname);
    }
    if (pathname.startsWith('/api/')) {
      return await recursosRoutes(req, res, pathname);
    }
    enviarJson(res, 404, { error: 'Ruta no encontrada' });
  } catch (error) {
    if (error.message === 'JSON_INVALIDO') {
      return enviarJson(res, 400, { error: 'JSON inválido' });
    }
    console.error('Error real:', error);
    enviarJson(res, 500, { error: 'Error interno del servidor' });
  }
});

server.listen(PORT, () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
  console.log(`http://localhost:${PORT}`);
});

module.exports = server;
