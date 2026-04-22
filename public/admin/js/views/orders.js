(function () {
  window.Views = window.Views || {};

  const STATUS_FLOW = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Delivered'];
  const ALL_STATUSES = [...STATUS_FLOW, 'Cancelled'];

  let state = { statusFilter: '' };

  async function render() {
    const container = document.getElementById('view-container');

    container.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <h5 class="panel-title"><i class="fa-solid fa-receipt me-2"></i> All orders</h5>
          <div class="ms-auto d-flex gap-2 flex-wrap">
            <select id="orders-status-filter" class="form-select form-select-sm" style="min-width:150px">
              <option value="">All statuses</option>
              ${ALL_STATUSES.map((s) => `<option value="${s}" ${state.statusFilter === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
            <button class="btn btn-sm btn-light" id="orders-refresh"><i class="fa-solid fa-rotate"></i></button>
          </div>
        </div>
        <div id="orders-body"></div>
      </div>
    `;

    document.getElementById('orders-status-filter').addEventListener('change', (e) => {
      state.statusFilter = e.target.value;
      loadTable();
    });
    document.getElementById('orders-refresh').addEventListener('click', loadTable);

    await loadTable();
  }

  async function loadTable() {
    const body = document.getElementById('orders-body');
    UI.setLoading(body);
    const q = state.statusFilter ? { status: state.statusFilter } : {};
    const { orders } = await Api.listAllOrders(q);

    if (!orders.length) {
      body.innerHTML = UI.emptyState('fa-receipt', 'No orders match this filter', '');
      return;
    }

    body.innerHTML = `
      <div class="table-responsive">
        <table class="table align-middle">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Placed</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${orders.map(row).join('')}
          </tbody>
        </table>
      </div>
    `;

    body.querySelectorAll('[data-view-order]').forEach((btn) => {
      btn.addEventListener('click', () => openOrder(btn.dataset.viewOrder));
    });
    body.querySelectorAll('[data-advance]').forEach((btn) => {
      btn.addEventListener('click', () => advanceStatus(btn.dataset.advance, btn.dataset.next));
    });
  }

  function row(o) {
    const nextStatus = nextOf(o.status);
    return `
      <tr>
        <td><strong>${UI.escape(o.orderNumber)}</strong></td>
        <td>
          ${UI.escape(o.user ? o.user.fullName : '—')}<br/>
          <span class="small text-muted">${UI.escape(o.user ? o.user.email : '')}</span>
        </td>
        <td><span class="chip neutral">${o.items ? o.items.length : 0} items</span></td>
        <td class="text-nowrap-cell">${UI.money(o.total)}</td>
        <td>${UI.statusChip(o.status)}</td>
        <td class="text-nowrap-cell small text-muted">${UI.formatRelative(o.placedAt)}</td>
        <td class="text-nowrap-cell">
          ${nextStatus
            ? `<button class="btn btn-sm btn-primary" data-advance="${o.id}" data-next="${nextStatus}">
                 <i class="fa-solid fa-arrow-right"></i> ${nextStatus}
               </button>`
            : ''}
          <button class="btn btn-sm btn-light" data-view-order="${o.id}">View</button>
        </td>
      </tr>
    `;
  }

  function nextOf(status) {
    const i = STATUS_FLOW.indexOf(status);
    if (i === -1 || i >= STATUS_FLOW.length - 1) return null;
    return STATUS_FLOW[i + 1];
  }

  async function advanceStatus(id, next) {
    try {
      await Api.updateOrderStatus(id, next);
      UI.toast(`Order moved to ${next}`);
      await loadTable();
    } catch (err) {
      UI.toast(err.message, 'danger');
    }
  }

  async function openOrder(id) {
    const { order } = await Api.getOrder(id);
    const itemsHtml = (order.items || []).map((it) => `
      <tr>
        <td>${UI.escape(it.nameSnapshot)}<br/><small class="text-muted">${UI.escape(it.nameArSnapshot || '')}</small></td>
        <td class="text-center">${it.quantity}</td>
        <td class="text-end">${UI.money(it.priceSnapshot)}</td>
        <td class="text-end">${UI.money(it.subtotal)}</td>
      </tr>
      ${it.specialNote ? `<tr><td colspan="4" class="small text-muted">Note: ${UI.escape(it.specialNote)}</td></tr>` : ''}
    `).join('');

    const history = (order.statusHistory || [])
      .slice()
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map((h) => `
        <li class="list-group-item d-flex align-items-center">
          ${UI.statusChip(h.status)}
          <span class="small text-muted ms-2">${UI.formatDate(h.createdAt)}</span>
          ${h.note ? `<span class="ms-2">${UI.escape(h.note)}</span>` : ''}
        </li>
      `).join('');

    UI.renderModal({
      title: `Order ${order.orderNumber}`,
      bodyHtml: `
        <div class="row g-3 mb-3">
          <div class="col-md-6">
            <div class="small text-muted">Customer</div>
            <div><strong>${UI.escape(order.user ? order.user.fullName : '—')}</strong></div>
            <div class="small text-muted">${UI.escape(order.user ? order.user.email : '')}</div>
          </div>
          <div class="col-md-6">
            <div class="small text-muted">Status</div>
            <div>${UI.statusChip(order.status)}</div>
            <div class="small text-muted mt-1">Placed ${UI.formatDate(order.placedAt)}</div>
          </div>
          <div class="col-12">
            <div class="small text-muted">Delivery address</div>
            <div>${UI.escape(order.deliveryAddress || '—')}</div>
          </div>
          ${order.notes ? `
          <div class="col-12">
            <div class="small text-muted">Notes</div>
            <div>${UI.escape(order.notes)}</div>
          </div>` : ''}
        </div>

        <h6 class="form-section-title">Items</h6>
        <div class="table-responsive">
          <table class="table">
            <thead><tr><th>Item</th><th class="text-center">Qty</th><th class="text-end">Price</th><th class="text-end">Subtotal</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
            <tfoot>
              <tr><td colspan="3" class="text-end">Subtotal</td><td class="text-end">${UI.money(order.subtotal)}</td></tr>
              <tr><td colspan="3" class="text-end">Delivery fee</td><td class="text-end">${UI.money(order.deliveryFee)}</td></tr>
              <tr><td colspan="3" class="text-end"><strong>Total</strong></td><td class="text-end"><strong>${UI.money(order.total)}</strong></td></tr>
            </tfoot>
          </table>
        </div>

        <h6 class="form-section-title">History</h6>
        <ul class="list-group list-group-flush">${history || '<li class="list-group-item text-muted">No history</li>'}</ul>

        <h6 class="form-section-title">Update status</h6>
        <div class="d-flex gap-2 flex-wrap">
          ${ALL_STATUSES.map((s) => `
            <button type="button" class="btn btn-sm ${s === order.status ? 'btn-primary' : 'btn-outline-secondary'}" data-set-status="${s}">${s}</button>
          `).join('')}
        </div>
      `,
    });

    document.querySelectorAll('[data-set-status]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const status = btn.dataset.setStatus;
        if (status === order.status) return;
        try {
          await Api.updateOrderStatus(order.id, status);
          UI.toast(`Order marked as ${status}`);
          UI.closeModal();
          await loadTable();
        } catch (err) {
          UI.toast(err.message, 'danger');
        }
      });
    });
  }

  Views.Orders = { render };
})();
