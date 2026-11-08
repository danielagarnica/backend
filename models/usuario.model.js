const db = require('../database/connection');

// Busca un usuario por correo. Devuelve el usuario o null.
const buscarPorEmail = async (email) => {
  const resultado = await db.query(
    'SELECT id, nombre, email, password_hash FROM usuarios WHERE email = $1',
    [email]
  );
  return resultado.rows[0] || null;
};

// Crea un usuario nuevo y devuelve sus datos públicos (sin la contraseña).
const crear = async ({ nombre, email, passwordHash }) => {
  const resultado = await db.query(
    `INSERT INTO usuarios (nombre, email, password_hash, fecha_creacion)
     VALUES ($1, $2, $3, NOW())
     RETURNING id, nombre, email`,
    [nombre, email, passwordHash]
  );
  return resultado.rows[0];
};

module.exports = { buscarPorEmail, crear };
