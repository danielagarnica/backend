// js/ingresos.js

document.addEventListener('DOMContentLoaded', () => {
  const formIngresos = document.getElementById('ingreso-form');
  const totalIngresosElement = document.querySelector('.card-total-ingresos .card-amount');
  const listaHistorial = document.getElementById('lista-historial-ingresos');
  const btnReset = document.getElementById('btn-reset-ingresos');

  let ingresos = [];

  function renderizarHistorial() {
    if (!listaHistorial) return;
    listaHistorial.innerHTML = '';

    if (ingresos.length === 0) {
      listaHistorial.innerHTML = '<p style="color: #9ca3af; font-size: 0.875rem; text-align: center;">No hay ingresos registrados aún.</p>';
      return;
    }

    // El backend ya los entrega del más reciente al más antiguo
    ingresos.forEach((ingreso) => {
      const item = document.createElement('div');
      item.className = 'history-item';

      item.innerHTML = `
        <div class="history-item-info">
          <span class="history-item-name">${escapar(ingreso.tipo)}</span>
          <span class="history-item-date">${escapar(ingreso.fecha)}</span>
        </div>
        <span class="history-item-amount">+ ${formatCOP(ingreso.monto)}</span>
      `;
      listaHistorial.appendChild(item);
    });
  }

  function actualizarInterfaz() {
    const totalIngresos = ingresos.reduce((total, ing) => total + ing.monto, 0);
    if (totalIngresosElement) totalIngresosElement.textContent = formatCOP(totalIngresos);
    renderizarHistorial();
  }

  async function cargarIngresos() {
    try {
      ingresos = await apiFetch('/api/ingresos');
    } catch (error) {
      alert(error.message);
    }
    actualizarInterfaz();
  }

  formIngresos.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nuevoIngreso = {
      tipo: document.getElementById('tipo-ingreso').value,
      monto: parseFloat(document.getElementById('monto-ingreso').value),
      fecha: document.getElementById('fecha-ingreso').value,
      notas: document.getElementById('notas-ingreso').value
    };

    try {
      await apiFetch('/api/ingresos', { method: 'POST', body: JSON.stringify(nuevoIngreso) });
      formIngresos.reset();
      await cargarIngresos();
    } catch (error) {
      alert(error.message);
    }
  });

  btnReset.addEventListener('click', async () => {
    if (!confirm('¿Estás seguro de que deseas borrar todo el historial de ingresos?')) return;
    try {
      await apiFetch('/api/ingresos', { method: 'DELETE' });
      await cargarIngresos();
    } catch (error) {
      alert(error.message);
    }
  });

  cargarIngresos();
});
