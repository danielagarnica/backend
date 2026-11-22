const jwt = require('jsonwebtoken');

// Nombre de la cookie de sesión y su duración (debe coincidir con el token)
const COOKIE_SESION = 'pp_sesion';
const DURACION_SEGUNDOS = 7 * 24 * 60 * 60; // 7 días

const secreto = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('Falta JWT_SECRET en el archivo .env');
  }
  return process.env.JWT_SECRET;
};

// En producción (Render, HTTPS) la cookie solo viaja por conexiones seguras.
// En local (http://localhost) se omite "Secure" para que funcione sin HTTPS.
const esProduccion = () => process.env.NODE_ENV === 'production';

// Crea el "pase" (token) firmado con el id del usuario
const crearToken = (usuario) =>
  jwt.sign({ id: usuario.id }, secreto(), { expiresIn: DURACION_SEGUNDOS });

// Convierte el encabezado Cookie ("a=1; b=2") en un objeto { a: '1', b: '2' }
const leerCookies = (req) => {
  const cookies = {};
  for (const parte of (req.headers.cookie || '').split(';')) {
    const i = parte.indexOf('=');
    if (i === -1) continue;
    const nombre = parte.slice(0, i).trim();
    try {
      cookies[nombre] = decodeURIComponent(parte.slice(i + 1).trim());
    } catch {
      // Cookie mal formada: se ignora
    }
  }
  return cookies;
};

// Arma el valor de Set-Cookie.
// - HttpOnly: JavaScript de la página NO puede leerla (protege ante XSS).
// - SameSite=Lax: el navegador no la envía en peticiones POST/DELETE que
//   vengan de otros sitios (protege ante CSRF).
// - Secure: solo por HTTPS (en producción).
const armarCookie = (valor, maxAge) =>
  [
    `${COOKIE_SESION}=${encodeURIComponent(valor)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
    esProduccion() ? 'Secure' : null
  ]
    .filter(Boolean)
    .join('; ');

// Inicia la sesión: guarda el token en una cookie de la respuesta
const establecerSesion = (res, usuario) => {
  res.setHeader('Set-Cookie', armarCookie(crearToken(usuario), DURACION_SEGUNDOS));
};

// Cierra la sesión: le pide al navegador que borre la cookie
const borrarSesion = (res) => {
  res.setHeader('Set-Cookie', armarCookie('', 0));
};

// Lee el token de la cookie y devuelve { id } o null si no hay sesión válida
const usuarioDesdeRequest = (req) => {
  const token = leerCookies(req)[COOKIE_SESION];
  if (!token) return null;
  const clave = secreto();
  try {
    return jwt.verify(token, clave);
  } catch {
    return null;
  }
};

module.exports = { establecerSesion, borrarSesion, usuarioDesdeRequest };
