// js/ahorros.js

document.addEventListener('DOMContentLoaded', () => {
  const formAhorros = document.getElementById('ahorros-form');
  const totalAhorradoElement = document.querySelector('.card-total .card-amount');
  const barraProgreso = document.querySelector('.progress-bar-fill');
  const porcentajeTexto = document.querySelector('.progress-info .percent');
  const listaHistorial = document.getElementById('lista-historial-ahorros');
  const btnReset = document.getElementById('btn-reset-ahorros');

  let ahorros = [];
  let ingresos = [];

  function renderizarHistorial() {
    if (!listaHistorial) return;
    listaHistorial.innerHTML = '';

    if (ahorros.length === 0) {
      listaHistorial.innerHTML = '<p style="color: #9ca3af; font-size: 0.875rem; text-align: center;">No hay ahorros registrados aún.</p>';
      return;
    }

    ahorros.forEach((ahorro) => {
      const item = document.createElement('div');
      item.className = 'history-item';

      item.innerHTML = `
        <div class="history-item-info">
          <span class="history-item-name">${escapar(ahorro.nombre)}</span>
          <span class="history-item-date">${escapar(ahorro.fecha)}</span>
        </div>
        <span class="history-item-amount">+ ${formatCOP(ahorro.monto)}</span>
      `;
      listaHistorial.appendChild(item);
    });
  }

  function actualizarInterfaz() {
    const totalAhorrado = ahorros.reduce((total, a) => total + a.monto, 0);
    if (totalAhorradoElement) totalAhorradoElement.textContent = formatCOP(totalAhorrado);

    // La barra de progreso compara lo ahorrado con los ingresos totales
    const ingresosTotales = ingresos.reduce((total, i) => total + i.monto, 0);
    const porcentaje = ingresosTotales > 0 ? (totalAhorrado / ingresosTotales) * 100 : 0;

    if (porcentajeTexto) porcentajeTexto.textContent = `${Math.min(porcentaje, 100).toFixed(1)}%`;
    if (barraProgreso) barraProgreso.style.width = `${Math.min(porcentaje, 100)}%`;

    renderizarHistorial();
  }

  async function cargarDatos() {
    try {
      [ahorros, ingresos] = await Promise.all([
        apiFetch('/api/ahorros'),
        apiFetch('/api/ingresos')
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
        nombre: document.getElementById('nombre-ahorro').value,
        monto: parseFloat(document.getElementById('monto-ahorro').value),
        fecha: document.getElementById('fecha-ahorro').value,
        notas: document.getElementById('notas-ahorro').value
      };

      try {
        // El backend también suma este monto a la meta que tenga el mismo nombre
        await apiFetch('/api/ahorros', { method: 'POST', body: JSON.stringify(nuevoAhorro) });
        formAhorros.reset();
        await cargarDatos();
      } catch (error) {
        alert(error.message);
      }
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', async () => {
      if (!confirm('¿Estás seguro de que deseas borrar todo el historial de ahorros?')) return;
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
