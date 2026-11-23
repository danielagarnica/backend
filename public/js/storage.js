// js/storage.js
// Utilidades compartidas: conexión con el backend, sesión y formato de datos.
//
// La sesión vive en una cookie HttpOnly que crea el backend al iniciar sesión.
// Este código NO puede leerla (a propósito): el navegador la envía sola en cada
// petición. Por eso aquí no se guarda ningún token en localStorage.

// La página y la API están en el mismo servidor: basta con rutas relativas.
const API_URL = '';

const formatCOP = (valor) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(valor);

// Evita que un texto escrito por el usuario se ejecute como HTML
const escapar = (texto) =>
  String(texto ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

// ---------- Utilidades de datos ----------
const sumarMontos = (lista) => lista.reduce((total, item) => total + (Number(item.monto) || 0), 0);

// Fecha de hoy en formato AAAA-MM-DD, según la hora local
function fechaHoy() {
  const hoy = new Date();
  hoy.setMinutes(hoy.getMinutes() - hoy.getTimezoneOffset());
  return hoy.toISOString().slice(0, 10);
}

// Una meta está activa si no se ha cumplido y su fecha límite no ha pasado
const esMetaActiva = (meta) => Number(meta.ahorrado || 0) < Number(meta.objetivo) && meta.fecha >= fechaHoy();

// Compara en centavos para evitar errores de redondeo con decimales
const superaSaldo = (monto, saldo) => Math.round(monto * 100) > Math.round(saldo * 100);

// ---------- Llamadas al backend ----------
async function apiFetch(ruta, opciones = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opciones.headers || {}) };

  let respuesta;
  try {
    respuesta = await fetch(API_URL + ruta, {
      ...opciones,
      headers,
      credentials: 'same-origin' // envía la cookie de sesión
    });
  } catch (error) {
    throw new Error('No se pudo conectar con el servidor. ¿Está encendido el backend?');
  }

  let datos = null;
  try {
    datos = await respuesta.json();
  } catch (error) {
    // La respuesta no traía JSON
  }

  // Sesión vencida o inválida en una página privada: vuelve al login.
  // (En /api/auth/login un 401 es "contraseña incorrecta", no se redirige.)
  if (respuesta.status === 401 && !ruta.startsWith('/api/auth/login')) {
    window.location.href = 'login.html';
    throw new Error('Tu sesión terminó. Inicia sesión de nuevo.');
  }

  if (!respuesta.ok) {
    throw new Error((datos && datos.error) || 'Error en el servidor');
  }
  return datos;
}

// ---------- Cerrar sesión ----------
// El enlace "Cerrar sesión" primero le pide al backend borrar la cookie
// y luego sigue hacia index.html.
document.addEventListener('click', async (e) => {
  const enlace = e.target.closest('.logout');
  if (!enlace) return;

  e.preventDefault();
  try {
    await fetch(API_URL + '/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
  } catch (error) {
    // Aunque falle la red, se sale de la página
  }
  window.location.href = enlace.getAttribute('href') || 'index.html';
});

// ---------- Nombre del usuario en la barra de navegación ----------
document.addEventListener('DOMContentLoaded', async () => {
  const nombreEl = document.querySelector('.user-name');
  const avatarEl = document.querySelector('.user-avatar');
  if (!nombreEl && !avatarEl) return; // Páginas públicas (index, login, registro)

  try {
    const { usuario } = await apiFetch('/api/auth/me');
    if (nombreEl) nombreEl.textContent = usuario.nombre;
    if (avatarEl) avatarEl.textContent = usuario.nombre.charAt(0).toUpperCase();
    const saludoEl = document.getElementById('saludo-usuario');
    if (saludoEl) saludoEl.textContent = `¡Bienvenido, ${usuario.nombre.split(' ')[0]}!`;
  } catch (error) {
    // Sin sesión: apiFetch ya redirige al login
  }
});
