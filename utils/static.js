const fs = require('fs');
const path = require('path');
const { usuarioDesdeRequest } = require('./auth');

// Carpeta con la página web (HTML, CSS, JS e imágenes)
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

// Páginas que solo se ven con sesión iniciada. Sin sesión, se redirige al login
// desde el servidor (así no se alcanza a ver la página vacía).
const PAGINAS_PRIVADAS = new Set([
  'inicio.html',
  'ingresos.html',
  'gastos.html',
  'metas.html',
  'ahorros.html'
]);

const redirigir = (res, destino) => {
  res.writeHead(302, { Location: destino, 'Cache-Control': 'no-store' });
  res.end();
};

const noEncontrado = (res) => {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Página no encontrada');
};

// Entrega un archivo de public/. Devuelve true si atendió la petición.
const servirEstatico = (req, res, pathname) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;

  let relativo;
  try {
    relativo = decodeURIComponent(pathname);
  } catch {
    noEncontrado(res);
    return true;
  }
  if (relativo === '/') relativo = '/index.html';

  // Evita salir de public/ con rutas como /../.env
  const archivo = path.normalize(path.join(PUBLIC_DIR, relativo));
  if (!archivo.startsWith(PUBLIC_DIR + path.sep)) {
    noEncontrado(res);
    return true;
  }

  const nombre = path.basename(archivo);
  if (PAGINAS_PRIVADAS.has(nombre) && !usuarioDesdeRequest(req)) {
    redirigir(res, '/login.html');
    return true;
  }

  fs.stat(archivo, (error, info) => {
    if (error || !info.isFile()) return noEncontrado(res);

    const extension = path.extname(archivo).toLowerCase();
    res.writeHead(200, {
      'Content-Type': TIPOS[extension] || 'application/octet-stream',
      'Content-Length': info.size,
      // HTML siempre fresco (depende de la sesión); CSS/JS/imágenes en caché 1 hora
      'Cache-Control': extension === '.html' ? 'no-cache' : 'public, max-age=3600'
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(archivo).pipe(res);
  });
  return true;
};

module.exports = { servirEstatico };
