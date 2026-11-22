// js/storage.js
// Utilidades compartidas: conexión con el backend, sesión y formato de datos.

// Dirección del backend. Cámbiala cuando lo publiques en internet.
const API_URL = 'http://localhost:3000';

const formatCOP = (valor) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
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

// ---------- Sesión ----------
function obtenerToken() {
  return localStorage.getItem('token');
}

function guardarSesion(datos) {
  localStorage.setItem('token', datos.token);
  localStorage.setItem('usuarioActual', datos.usuario.email);
  localStorage.setItem('nombreUsuario', datos.usuario.nombre);
}

function cerrarSesion() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuarioActual');
  localStorage.removeItem('nombreUsuario');
}

// ---------- Llamadas al backend ----------
async function apiFetch(ruta, opciones = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opciones.headers || {}) };
  const token = obtenerToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let respuesta;
  try {
    respuesta = await fetch(API_URL + ruta, { ...opciones, headers });
  } catch (error) {
    throw new Error('No se pudo conectar con el servidor. ¿Está encendido el backend?');
  }

  let datos = null;
  try {
    datos = await respuesta.json();
  } catch (error) {
    // La respuesta no traía JSON
  }

  // Sesión vencida o inválida: vuelve al login
  if (respuesta.status === 401 && token) {
    cerrarSesion();
    window.location.href = 'login.html';
    throw new Error('Tu sesión terminó. Inicia sesión de nuevo.');
  }

  if (!respuesta.ok) {
    throw new Error((datos && datos.error) || 'Error en el servidor');
  }
  return datos;
}

// ---------- Protección de páginas ----------
const paginasPublicas = ['', 'index.html', 'login.html', 'registro.html'];
const paginaActual = window.location.pathname.split('/').pop();
if (!obtenerToken() && !paginasPublicas.includes(paginaActual)) {
  window.location.href = 'login.html';
}

// Al hacer clic en "Cerrar sesión", se borra la sesión
document.addEventListener('click', (e) => {
  if (e.target.closest('.logout')) cerrarSesion();
});

// Muestra el usuario real en la barra de navegación
document.addEventListener('DOMContentLoaded', () => {
  const nombre = localStorage.getItem('nombreUsuario');
  if (!nombre) return;

  const nombreEl = document.querySelector('.user-name');
  const avatarEl = document.querySelector('.user-avatar');
  if (nombreEl) nombreEl.textContent = nombre;
  if (avatarEl) avatarEl.textContent = nombre.charAt(0).toUpperCase();
});
