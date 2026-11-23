// js/cookies.js
// Aviso de cookies.
// PocketPet solo usa una cookie necesaria: "pp_sesion", que crea el backend al
// iniciar sesión (HttpOnly, 7 días). Los datos financieros se guardan en la
// base de datos, no en el navegador. No hay cookies de publicidad ni de terceros.
// La decisión del usuario sobre este aviso se recuerda en localStorage.

(function () {
  const CLAVE = 'pocketpet_consentimiento_cookies';
  const VERSION = 1; // subir este número si cambia la política, para volver a preguntar

  function leerConsentimiento() {
    try {
      const dato = JSON.parse(localStorage.getItem(CLAVE));
      return dato && dato.version === VERSION ? dato : null;
    } catch {
      return null;
    }
  }

  function guardarConsentimiento(estado) {
    try {
      localStorage.setItem(CLAVE, JSON.stringify({
        estado,            // 'aceptado' o 'solo_necesarias'
        version: VERSION,
        fecha: new Date().toISOString(),
      }));
    } catch {
      // Si el navegador bloquea el almacenamiento, el aviso volverá a salir
    }
  }

  // Disponible para el resto de la app, por si en el futuro se agregan
  // cookies opcionales (por ejemplo, analítica)
  window.consentimientoCookies = function () {
    const dato = leerConsentimiento();
    return dato ? dato.estado : null;
  };

  function cerrarBanner() {
    const banner = document.getElementById('cookie-banner');
    if (banner) banner.remove();
  }

  function mostrarBanner() {
    if (document.getElementById('cookie-banner')) return;

    const banner = document.createElement('section');
    banner.id = 'cookie-banner';
    banner.className = 'cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-labelledby', 'cookie-titulo');
    banner.setAttribute('aria-describedby', 'cookie-texto');

    banner.innerHTML = `
      <h2 id="cookie-titulo">🍪 Usamos cookies</h2>
      <p id="cookie-texto">
        PocketPet usa una cookie necesaria para mantener tu sesión iniciada.
        Tus ingresos, gastos, metas y ahorros se guardan de forma segura en
        nuestra base de datos. No usamos cookies de publicidad ni compartimos
        tus datos con terceros.
      </p>
      <div class="cookie-detalle" id="cookie-detalle" hidden>
        <strong>¿Qué guardamos?</strong>
        <ul>
          <li><strong>Necesaria (siempre activa):</strong> la cookie
            <code>pp_sesion</code>, que mantiene tu sesión iniciada durante 7 días.
            Es segura: el código de la página no puede leerla. Sin ella no
            podrías iniciar sesión.</li>
          <li><strong>Preferencias:</strong> tu decisión sobre este aviso, guardada
            en este navegador.</li>
          <li><strong>Publicidad o analítica:</strong> no se usan.</li>
        </ul>
        <p style="margin:0.5rem 0 0">Tu cuenta (con la contraseña cifrada) y tus
          registros financieros se guardan en la base de datos de PocketPet, no en
          tu navegador. Puedes borrar tus registros con "Reiniciar datos" en cada
          sección, y la cookie de sesión se borra al cerrar sesión.</p>
      </div>
      <div class="cookie-acciones">
        <button type="button" class="cookie-btn-info" aria-expanded="false" aria-controls="cookie-detalle">Más información</button>
        <button type="button" class="cookie-btn-rechazar">Solo necesarias</button>
        <button type="button" class="cookie-btn-aceptar">Aceptar</button>
      </div>
    `;

    const detalle = banner.querySelector('#cookie-detalle');
    const btnInfo = banner.querySelector('.cookie-btn-info');

    btnInfo.addEventListener('click', () => {
      detalle.hidden = !detalle.hidden;
      btnInfo.setAttribute('aria-expanded', String(!detalle.hidden));
      btnInfo.textContent = detalle.hidden ? 'Más información' : 'Ocultar información';
    });

    banner.querySelector('.cookie-btn-aceptar').addEventListener('click', () => {
      guardarConsentimiento('aceptado');
      cerrarBanner();
    });

    banner.querySelector('.cookie-btn-rechazar').addEventListener('click', () => {
      guardarConsentimiento('solo_necesarias');
      cerrarBanner();
    });

    document.body.appendChild(banner);
    banner.querySelector('.cookie-btn-aceptar').focus({ preventScroll: true });
  }

  // Enlace "Preferencias de cookies" para volver a abrir el aviso
  function agregarEnlacePreferencias() {
    if (document.querySelector('.cookie-preferencias')) return;

    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'cookie-preferencias';
    boton.textContent = 'Preferencias de cookies';
    boton.addEventListener('click', mostrarBanner);

    const pie = document.querySelector('.footer-text');      // página principal
    const menuUsuario = document.querySelector('.user-dropdown'); // páginas internas
    const enlaceCambio = document.querySelector('.switch-link');  // login y registro

    if (pie) {
      pie.append(' · ', boton);
    } else if (menuUsuario) {
      boton.classList.add('cookie-preferencias-menu');
      menuUsuario.prepend(boton);
    } else if (enlaceCambio) {
      const parrafo = document.createElement('p');
      parrafo.style.cssText = 'text-align:center;margin-top:0.75rem;';
      parrafo.appendChild(boton);
      enlaceCambio.after(parrafo);
    } else {
      boton.classList.add('cookie-preferencias-flotante');
      document.body.appendChild(boton);
    }
  }

  function iniciar() {
    agregarEnlacePreferencias();
    if (!leerConsentimiento()) mostrarBanner();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
