// js/metas.js

document.addEventListener('DOMContentLoaded', () => {
  const formMetas = document.getElementById('metas-form');
  const metasActivasElement = document.getElementById('metas-activas-total');
  const listaHistorial = document.getElementById('lista-historial-metas');
  const btnReset = document.getElementById('btn-reset-metas');

  let metas = [];

  function renderizarHistorial() {
    if (!listaHistorial) return;
    listaHistorial.innerHTML = '';

    if (metas.length === 0) {
      listaHistorial.innerHTML = '<p style="color: #9ca3af; font-size: 0.875rem; text-align: center;">No tienes metas registradas aún.</p>';
      return;
    }

    metas.forEach((meta) => {
      let porcentaje = (meta.ahorrado / meta.objetivo) * 100;
      if (porcentaje > 100) porcentaje = 100;
      if (isNaN(porcentaje)) porcentaje = 0;

      const item = document.createElement('div');
      item.className = 'history-item';

      item.innerHTML = `
        <div class="history-item-info">
          <div class="history-item-top">
            <span class="history-item-name">🎯 ${escapar(meta.nombre)}</span>
            <span class="history-item-date">Límite: ${escapar(meta.fecha)}</span>
          </div>
          <div class="meta-progress-bar">
            <div class="meta-progress-fill" style="width: ${porcentaje}%;"></div>
          </div>
          <div class="meta-amounts">
            <span>Ahorrado: ${formatCOP(meta.ahorrado)}</span>
            <span>Objetivo: ${formatCOP(meta.objetivo)}</span>
          </div>
        </div>
      `;
      listaHistorial.appendChild(item);
    });
  }

  function actualizarInterfaz() {
    // Solo cuentan las metas sin cumplir y con fecha límite vigente
    if (metasActivasElement) metasActivasElement.textContent = metas.filter(esMetaActiva).length;
    renderizarHistorial();
  }

  // La fecha límite no puede ser anterior a hoy
  const campoFecha = document.getElementById('fecha-limite');
  if (campoFecha) campoFecha.min = fechaHoy();

  async function cargarMetas() {
    try {
      metas = await apiFetch('/api/metas');
    } catch (error) {
      alert(error.message);
    }
    actualizarInterfaz();
  }

  if (formMetas) {
    formMetas.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nuevaMeta = {
        nombre: document.getElementById('nombre-meta').value.trim(),
        categoria: document.getElementById('categoria-meta').value,
        fecha: document.getElementById('fecha-limite').value,
        objetivo: parseFloat(document.getElementById('monto-objetivo').value),
        ahorrado: parseFloat(document.getElementById('monto-ahorrado').value) || 0
      };

      if (!nuevaMeta.nombre) return alert('⚠️ Escribe un nombre para la meta.');
      if (nuevaMeta.fecha < fechaHoy()) return alert('⚠️ La fecha límite no puede estar en el pasado.');
      if (!(nuevaMeta.objetivo > 0)) return alert('⚠️ El monto objetivo debe ser mayor que $0.');

      try {
        await apiFetch('/api/metas', { method: 'POST', body: JSON.stringify(nuevaMeta) });
        formMetas.reset();
        await cargarMetas();
      } catch (error) {
        alert(error.message);
      }
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', async () => {
      if (!confirm('¿Borrar todas las metas?')) return;
      try {
        await apiFetch('/api/metas', { method: 'DELETE' });
        await cargarMetas();
      } catch (error) {
        alert(error.message);
      }
    });
  }

  cargarMetas();
});
