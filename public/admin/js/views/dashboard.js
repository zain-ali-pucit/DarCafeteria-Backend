(function () {
  window.Views = window.Views || {};

  async function render() {
    const container = document.getElementById('view-container');
    UI.setLoading(container);

    const stats = await Api.stats();

    container.innerHTML = `
      <div class="row g-3 mb-4">
        ${statCard('Orders', stats.orders.total, `${stats.orders.active} active · ${stats.orders.lastWeek} this week`, 'fa-receipt')}
        ${statCard('Revenue', UI.money(stats.revenue.total), `${UI.money(stats.revenue.lastWeek)} this week`, 'fa-money-bill-wave')}
        ${statCard('Customers', stats.users.customers, `${stats.users.total} total users`, 'fa-users')}
        ${statCard('Menu Items', stats.foods.available, `${stats.foods.total} total · ${stats.foods.total - stats.foods.available} hidden`, 'fa-bowl-food')}
      </div>

      <div class="row g-3">
        <div class="col-xl-8">
          <div class="panel">
            <div class="panel-header">
              <h5 class="panel-title"><i class="fa-solid fa-clock-rotate-left me-2"></i> Recent orders</h5>
              <a href="#/orders" class="ms-auto small text-decoration-none">View all →</a>
            </div>
            <div class="table-responsive">
              <table class="table align-middle">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Placed</th>
                  </tr>
                </thead>
                <tbody>
                  ${
                    stats.recentOrders.length
                      ? stats.recentOrders.map(recentRow).join('')
                      : `<tr><td colspan="5">${UI.emptyState('fa-receipt', 'No orders yet', 'Orders placed from the app will show here.')}</td></tr>`
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="col-xl-4">
          <div class="panel">
            <div class="panel-header">
              <h5 class="panel-title"><i class="fa-solid fa-trophy me-2"></i> Top selling</h5>
            </div>
            <ul class="list-group list-group-flush">
              ${
                stats.topFoods.length
                  ? stats.topFoods
                      .map(
                        (t, i) => `
                <li class="list-group-item d-flex align-items-center">
                  <span class="chip neutral me-2">#${i + 1}</span>
                  <div class="flex-grow-1"><strong>${UI.escape(t.name)}</strong></div>
                  <span class="chip primary">${t.sold} sold</span>
                </li>
              `
                      )
                      .join('')
                  : `<li class="list-group-item">${UI.emptyState('fa-chart-line', 'No sales yet', '')}</li>`
              }
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  function statCard(label, value, sub, icon) {
    return `
      <div class="col-6 col-lg-3">
        <div class="stat-card d-flex gap-3 align-items-start">
          <div class="icon"><i class="fa-solid ${icon}"></i></div>
          <div class="flex-grow-1">
            <div class="label">${UI.escape(label)}</div>
            <div class="value">${UI.escape(String(value))}</div>
            <div class="sub">${UI.escape(sub)}</div>
          </div>
        </div>
      </div>
    `;
  }

  function recentRow(o) {
    return `
      <tr>
        <td><strong>${UI.escape(o.orderNumber)}</strong></td>
        <td>
          ${UI.escape(o.user ? o.user.fullName : '—')}<br/>
          <span class="small text-muted">${UI.escape(o.user ? o.user.email : '')}</span>
        </td>
        <td class="text-nowrap-cell">${UI.money(o.total)}</td>
        <td>${UI.statusChip(o.status)}</td>
        <td class="text-nowrap-cell"><span class="small text-muted">${UI.formatRelative(o.placedAt)}</span></td>
      </tr>
    `;
  }

  Views.Dashboard = { render };
})();
