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
  let ahorros = [];

  // Dinero que aún se puede gastar: ingresos - gastos - lo apartado en ahorros
  const saldoDisponible = () => sumarMontos(ingresos) - sumarMontos(gastos) - sumarMontos(ahorros);

  // Muestra el nombre de la categoría ("Alimentación"), no su código interno
  const nombreCategoria = (codigo) => {
    const opcion = [...document.querySelectorAll('#categoria-gasto option')].find((o) => o.value === codigo);
    return opcion ? opcion.textContent : codigo;
  };

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
          <span class="history-item-name">${escapar(gasto.descripcion)} (${escapar(nombreCategoria(gasto.categoria))})</span>
          <span class="history-item-date">${escapar(gasto.fecha)}</span>
        </div>
        <span class="history-item-amount">- ${formatCOP(gasto.monto)}</span>
      `;
      listaHistorial.appendChild(item);
    });
  }

  function actualizarInterfaz() {
    const saldo = saldoDisponible();

    if (ingresosTotalElement) ingresosTotalElement.textContent = formatCOP(sumarMontos(ingresos));
    if (gastosTotalElement) gastosTotalElement.textContent = formatCOP(sumarMontos(gastos));

    if (saldoTotalElement) {
      saldoTotalElement.textContent = formatCOP(saldo);
      saldoTotalElement.style.color = saldo < 0 ? '#dc2626' : '';
    }

    renderizarHistorial();
  }

  async function cargarDatos() {
    try {
      [gastos, ingresos, ahorros] = await Promise.all([
        apiFetch('/api/gastos'),
        apiFetch('/api/ingresos'),
        apiFetch('/api/ahorros')
      ]);
    } catch (error) {
      alert(error.message);
    }
    actualizarInterfaz();
  }

  formGastos.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nuevoGasto = {
      descripcion: document.getElementById('descripcion-gasto').value.trim(),
      monto: parseFloat(document.getElementById('monto-gasto').value),
      categoria: document.getElementById('categoria-gasto').value,
      fecha: document.getElementById('fecha-gasto').value,
      notas: document.getElementById('notas-gasto').value
    };

    // Sin ingresos (o sin saldo suficiente) no se pueden registrar gastos
    // (el backend también lo comprueba)
    const saldo = saldoDisponible();
    if (superaSaldo(nuevoGasto.monto, saldo)) {
      alert(ingresos.length === 0
        ? '⚠️ Primero registra un ingreso. Sin ingresos no puedes agregar gastos.'
        : `⚠️ No tienes saldo suficiente para este gasto. Saldo disponible: ${formatCOP(Math.max(saldo, 0))}.`);
      return;
    }

    const boton = formGastos.querySelector('button[type="submit"]');
    if (boton) boton.disabled = true;
    try {
      await apiFetch('/api/gastos', { method: 'POST', body: JSON.stringify(nuevoGasto) });
      formGastos.reset();
      await cargarDatos();
    } catch (error) {
      alert(error.message);
    } finally {
      if (boton) boton.disabled = false;
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
