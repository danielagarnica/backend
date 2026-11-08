const jwt = require('jsonwebtoken');

const secreto = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('Falta JWT_SECRET en el archivo .env');
  }
  return process.env.JWT_SECRET;
};

// Crea el "pase" (token) que el usuario envía en cada petición
const crearToken = (usuario) =>
  jwt.sign({ id: usuario.id }, secreto(), { expiresIn: '7d' });

// Lee el token del encabezado Authorization y devuelve { id } o null
const usuarioDesdeRequest = (req) => {
  const encabezado = req.headers.authorization || '';
  if (!encabezado.startsWith('Bearer ')) return null;
  const clave = secreto();
  try {
    return jwt.verify(encabezado.slice(7), clave);
  } catch {
    return null;
  }
};

module.exports = { crearToken, usuarioDesdeRequest };
