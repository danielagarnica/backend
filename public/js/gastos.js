// js/gastos.js

document.addEventListener('DOMContentLoaded', () => {
  const formGastos = document.getElementById('gastos-form');
  const ingresosTotalElement = document.getElementById('gasto-ingresos-total');
  const gastosTotalElement = document.getElementById('gasto-gastos-total');
  const saldoTotalElement = document.getElementById('gasto-saldo-total');
  const listaHistorial = document.getElementById('lista-historial-gastos');
  const btnReset = document.getElementById('btn-reset-gastos');

  let gastos = [];
  let ingresos = [];

  const sumar = (lista) => lista.reduce((total, item) => total + item.monto, 0);

  function renderizarHistorial() {
    if (!listaHistorial) return;
    listaHistorial.innerHTML = '';

    if (gastos.length === 0) {
      listaHistorial.innerHTML = '<p style="color: #9ca3af; font-size: 0.875rem; text-align: center;">No hay gastos registrados aún.</p>';
      return;
    }

    gastos.forEach((gasto) => {
      const item = document.createElement('div');
      item.className = 'history-item';

      item.innerHTML = `
        <div class="history-item-info">
          <span class="history-item-name">${escapar(gasto.descripcion)} (${escapar(gasto.categoria)})</span>
          <span class="history-item-date">${escapar(gasto.fecha)}</span>
        </div>
        <span class="history-item-amount">- ${formatCOP(gasto.monto)}</span>
      `;
      listaHistorial.appendChild(item);
    });
  }

  function actualizarInterfaz() {
    const totalGastos = sumar(gastos);
    const totalIngresos = sumar(ingresos);
    const saldoDisponible = totalIngresos - totalGastos;

    if (ingresosTotalElement) ingresosTotalElement.textContent = formatCOP(totalIngresos);
    if (gastosTotalElement) gastosTotalElement.textContent = formatCOP(totalGastos);

    if (saldoTotalElement) {
      saldoTotalElement.textContent = formatCOP(saldoDisponible);
      saldoTotalElement.style.color = saldoDisponible < 0 ? '#dc2626' : '';
    }

    renderizarHistorial();
  }

  async function cargarDatos() {
    try {
      [gastos, ingresos] = await Promise.all([
        apiFetch('/api/gastos'),
        apiFetch('/api/ingresos')
      ]);
    } catch (error) {
      alert(error.message);
    }
    actualizarInterfaz();
  }

  formGastos.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nuevoGasto = {
      descripcion: document.getElementById('descripcion-gasto').value,
      monto: parseFloat(document.getElementById('monto-gasto').value),
      categoria: document.getElementById('categoria-gasto').value,
      fecha: document.getElementById('fecha-gasto').value,
      notas: document.getElementById('notas-gasto').value
    };

    if (sumar(gastos) + nuevoGasto.monto > sumar(ingresos)) {
      alert('⚠️ Advertencia: Este gasto superará tus ingresos registrados.');
    }

    try {
      await apiFetch('/api/gastos', { method: 'POST', body: JSON.stringify(nuevoGasto) });
      formGastos.reset();
      await cargarDatos();
    } catch (error) {
      alert(error.message);
    }
  });

  btnReset.addEventListener('click', async () => {
    if (!confirm('¿Estás seguro de que deseas borrar todo el historial de gastos?')) return;
    try {
      await apiFetch('/api/gastos', { method: 'DELETE' });
      await cargarDatos();
    } catch (error) {
      alert(error.message);
    }
  });

  cargarDatos();
});
