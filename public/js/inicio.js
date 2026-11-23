// js/inicio.js

document.addEventListener('DOMContentLoaded', async () => {
  const totalAhorrosElement = document.getElementById('inicio-total-ahorros');
  const totalIngresosElement = document.getElementById('inicio-total-ingresos');
  const totalGastosElement = document.getElementById('inicio-total-gastos');
  const balanceActualElement = document.getElementById('inicio-balance-actual');
  const totalMetasElement = document.getElementById('inicio-total-metas');

  const sumar = (lista) => lista.reduce((total, item) => total + (item.monto || 0), 0);

  function actualizarPanelInicio(ahorros, ingresos, gastos, metas) {
    const totalAhorrado = sumar(ahorros);
    const totalIngresado = sumar(ingresos);
    const totalGastado = sumar(gastos);
    const balanceActual = totalIngresado - totalGastado;

    if (totalAhorrosElement) totalAhorrosElement.textContent = formatCOP(totalAhorrado);
    if (totalIngresosElement) totalIngresosElement.textContent = formatCOP(totalIngresado);
    if (totalGastosElement) totalGastosElement.textContent = formatCOP(totalGastado);
    if (totalMetasElement) totalMetasElement.textContent = metas.length;

    if (balanceActualElement) {
      balanceActualElement.textContent = formatCOP(balanceActual);
      balanceActualElement.style.color = balanceActual < 0 ? '#dc2626' : '';
    }

    const panelMetas = document.getElementById('panel-metas-body');
    const panelAhorros = document.getElementById('panel-ahorros-body');
    const contadorMetas = document.getElementById('inicio-contador-metas');
    const contadorAhorros = document.getElementById('inicio-contador-ahorros');

    if (contadorMetas) contadorMetas.textContent = metas.length;
    if (contadorAhorros) contadorAhorros.textContent = ahorros.length;

    // El backend entrega primero lo más reciente
    if (metas.length > 0 && panelMetas) {
      panelMetas.classList.remove('empty');
      const ultimaMeta = metas[0];
      let porcentaje = (ultimaMeta.ahorrado / ultimaMeta.objetivo) * 100;
      if (isNaN(porcentaje)) porcentaje = 0;

      panelMetas.innerHTML = `
        <div style="width: 100%; text-align: left;">
          <h4 style="margin: 0 0 10px 0; color: #1e3a8a;">${escapar(ultimaMeta.nombre)}</h4>
          <div style="width: 100%; background: #e5e7eb; border-radius: 99px; height: 10px; margin-bottom: 5px;">
            <div style="width: ${Math.min(porcentaje, 100)}%; background: #3b82f6; height: 100%; border-radius: 99px;"></div>
          </div>
          <small style="color: #6b7280;">Progreso: ${formatCOP(ultimaMeta.ahorrado)} / ${formatCOP(ultimaMeta.objetivo)}</small>
        </div>
      `;
    }

    if (ahorros.length > 0 && panelAhorros) {
      panelAhorros.classList.remove('empty');
      const ultimoAhorro = ahorros[0];

      panelAhorros.innerHTML = `
        <div style="width: 100%; text-align: left;">
          <h4 style="margin: 0 0 5px 0; color: #4b5563;">${escapar(ultimoAhorro.nombre)}</h4>
          <strong style="color: #8b5cf6; font-size: 1.2rem;">+ ${formatCOP(ultimoAhorro.monto)}</strong>
          <br><small style="color: #9ca3af;">${escapar(ultimoAhorro.fecha)}</small>
        </div>
      `;
    }
  }

  try {
    const [ahorros, ingresos, gastos, metas] = await Promise.all([
      apiFetch('/api/ahorros'),
      apiFetch('/api/ingresos'),
      apiFetch('/api/gastos'),
      apiFetch('/api/metas')
    ]);
    actualizarPanelInicio(ahorros, ingresos, gastos, metas);
  } catch (error) {
    alert(error.message);
  }
});
