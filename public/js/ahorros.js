// js/ahorros.js

document.addEventListener('DOMContentLoaded', () => {
  const formAhorros = document.getElementById('ahorros-form');
  const selectMeta = document.getElementById('meta-ahorro');
  const totalAhorradoElement = document.querySelector('.card-total .card-amount');
  const barraProgreso = document.querySelector('.progress-bar-fill');
  const porcentajeTexto = document.querySelector('.progress-info .percent');
  const listaHistorial = document.getElementById('lista-historial-ahorros');
  const btnReset = document.getElementById('btn-reset-ahorros');

  let ahorros = [];
  let ingresos = [];
  let gastos = [];
  let metas = [];

  // Llena el selector con las metas del usuario. Se identifican por id, así
  // dos metas con el mismo nombre no se confunden.
  function cargarMetasEnSelector() {
    if (!selectMeta) return;
    const elegida = selectMeta.value;
    selectMeta.innerHTML = '<option value="">Sin meta asociada</option>';
    metas.forEach((meta) => {
      const opcion = document.createElement('option');
      opcion.value = String(meta.id);
      opcion.textContent = `${meta.nombre} (límite ${meta.fecha})`;
      selectMeta.appendChild(opcion);
    });
    selectMeta.value = metas.some((m) => String(m.id) === elegida) ? elegida : '';
  }

  function renderizarHistorial() {
    if (!listaHistorial) return;
    listaHistorial.innerHTML = '';

    if (ahorros.length === 0) {
      listaHistorial.innerHTML = '<p style="color: #9ca3af; font-size: 0.875rem; text-align: center;">No hay ahorros registrados aún.</p>';
      return;
    }

    ahorros.forEach((ahorro) => {
      const meta = metas.find((m) => m.id === ahorro.metaId);
      const destino = meta ? ` → 🎯 ${escapar(meta.nombre)}` : '';

      const item = document.createElement('div');
      item.className = 'history-item';

      item.innerHTML = `
        <div class="history-item-info">
          <span class="history-item-name">${escapar(ahorro.nombre)}${destino}</span>
          <span class="history-item-date">${escapar(ahorro.fecha)}</span>
        </div>
        <span class="history-item-amount">+ ${formatCOP(ahorro.monto)}</span>
      `;
      listaHistorial.appendChild(item);
    });
  }

  function actualizarInterfaz() {
    const totalAhorrado = sumarMontos(ahorros);
    if (totalAhorradoElement) totalAhorradoElement.textContent = formatCOP(totalAhorrado);

    // Tasa de ahorro: qué parte de los ingresos se ha ahorrado
    const ingresosTotales = sumarMontos(ingresos);
    const porcentaje = ingresosTotales > 0 ? (totalAhorrado / ingresosTotales) * 100 : 0;

    if (porcentajeTexto) porcentajeTexto.textContent = `${porcentaje.toFixed(1)}%`;
    if (barraProgreso) barraProgreso.style.width = `${Math.min(porcentaje, 100)}%`;

    cargarMetasEnSelector();
    renderizarHistorial();
  }

  async function cargarDatos() {
    try {
      [ahorros, ingresos, gastos, metas] = await Promise.all([
        apiFetch('/api/ahorros'),
        apiFetch('/api/ingresos'),
        apiFetch('/api/gastos'),
        apiFetch('/api/metas')
      ]);
    } catch (error) {
      alert(error.message);
    }
    actualizarInterfaz();
  }

  if (formAhorros) {
    formAhorros.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nuevoAhorro = {
        nombre: document.getElementById('nombre-ahorro').value.trim(),
        monto: parseFloat(document.getElementById('monto-ahorro').value),
        fecha: document.getElementById('fecha-ahorro').value,
        notas: document.getElementById('notas-ahorro').value,
        metaId: selectMeta && selectMeta.value ? Number(selectMeta.value) : null
      };

      // No se puede ahorrar más dinero del que hay disponible
      // (el backend también lo comprueba)
      const saldo = sumarMontos(ingresos) - sumarMontos(gastos) - sumarMontos(ahorros);
      if (superaSaldo(nuevoAhorro.monto, saldo)) {
        alert(ingresos.length === 0
          ? '⚠️ Primero registra un ingreso. Sin ingresos no puedes ahorrar.'
          : `⚠️ No tienes saldo suficiente. Saldo disponible: ${formatCOP(Math.max(saldo, 0))}.`);
        return;
      }

      const boton = formAhorros.querySelector('button[type="submit"]');
      if (boton) boton.disabled = true;
      try {
        // El backend suma este monto a la meta elegida
        await apiFetch('/api/ahorros', { method: 'POST', body: JSON.stringify(nuevoAhorro) });
        formAhorros.reset();
        await cargarDatos();
      } catch (error) {
        alert(error.message);
      } finally {
        if (boton) boton.disabled = false;
      }
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', async () => {
      if (!confirm('¿Estás seguro de que deseas borrar todo el historial de ahorros? También se descontarán de tus metas.')) return;
      try {
        await apiFetch('/api/ahorros', { method: 'DELETE' });
        await cargarDatos();
      } catch (error) {
        alert(error.message);
      }
    });
  }

  cargarDatos();
});
