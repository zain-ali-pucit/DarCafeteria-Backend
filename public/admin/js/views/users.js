(function () {
  window.Views = window.Views || {};

  let state = { search: '', role: '' };

  async function render() {
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <h5 class="panel-title"><i class="fa-solid fa-users me-2"></i> Users</h5>
          <div class="ms-auto d-flex gap-2 flex-wrap">
            <input type="search" id="user-search" class="form-control form-control-sm" placeholder="Search name/email/phone" value="${UI.escape(state.search)}" style="min-width:220px" />
            <select id="user-role" class="form-select form-select-sm" style="min-width:140px">
              <option value="" ${state.role === '' ? 'selected' : ''}>All roles</option>
              <option value="customer" ${state.role === 'customer' ? 'selected' : ''}>Customers</option>
              <option value="admin" ${state.role === 'admin' ? 'selected' : ''}>Admins</option>
            </select>
          </div>
        </div>
        <div id="user-body"></div>
      </div>
    `;

    let searchT;
    document.getElementById('user-search').addEventListener('input', (e) => {
      clearTimeout(searchT);
      searchT = setTimeout(() => { state.search = e.target.value; loadTable(); }, 300);
    });
    document.getElementById('user-role').addEventListener('change', (e) => {
      state.role = e.target.value; loadTable();
    });

    await loadTable();
  }

  async function loadTable() {
    const body = document.getElementById('user-body');
    UI.setLoading(body);
    const q = {};
    if (state.search) q.search = state.search;
    if (state.role) q.role = state.role;
    const { users } = await Api.listUsers(q);

    if (!users.length) {
      body.innerHTML = UI.emptyState('fa-users', 'No users', '');
      return;
    }

    body.innerHTML = `
      <div class="table-responsive">
        <table class="table align-middle">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${users.map(row).join('')}</tbody>
        </table>
      </div>
    `;

    body.querySelectorAll('[data-view]').forEach((btn) => {
      btn.addEventListener('click', () => openDetail(btn.dataset.view));
    });
    body.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => openForm(btn.dataset.edit));
    });
    body.querySelectorAll('[data-reset]').forEach((btn) => {
      btn.addEventListener('click', () => resetPassword(btn.dataset.reset, btn.dataset.name));
    });
    body.querySelectorAll('[data-toggle-active]').forEach((btn) => {
      btn.addEventListener('click', () => toggleActive(btn.dataset.toggleActive, btn.dataset.value === 'true'));
    });
    body.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', () => remove(btn.dataset.delete, btn.dataset.name));
    });
  }

  function row(u) {
    const me = Api.getUser();
    const isSelf = me && me.id === u.id;
    return `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-2">
            <div class="user-card"><div class="avatar">${UI.escape((u.fullName || u.email || '?').charAt(0).toUpperCase())}</div></div>
            <div><strong>${UI.escape(u.fullName)}</strong>${isSelf ? ' <span class="chip primary">you</span>' : ''}</div>
          </div>
        </td>
        <td>${UI.escape(u.email)}</td>
        <td>${UI.escape(u.phone || '—')}</td>
        <td><span class="chip ${u.role === 'admin' ? 'primary' : 'neutral'}">${UI.escape(u.role)}</span></td>
        <td>${u.isActive ? '<span class="chip success">Active</span>' : '<span class="chip danger">Disabled</span>'}</td>
        <td class="text-nowrap-cell small text-muted">${UI.formatDate(u.joinDate || u.createdAt)}</td>
        <td class="text-nowrap-cell">
          <button class="btn btn-sm btn-light" data-view="${u.id}">View</button>
          <button class="btn btn-sm btn-light" data-edit="${u.id}"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-sm btn-light" data-reset="${u.id}" data-name="${UI.escape(u.fullName)}"><i class="fa-solid fa-key"></i></button>
          ${!isSelf ? `
            <button class="btn btn-sm btn-light" data-toggle-active="${u.id}" data-value="${u.isActive}">
              <i class="fa-solid ${u.isActive ? 'fa-user-slash' : 'fa-user-check'}"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" data-delete="${u.id}" data-name="${UI.escape(u.fullName)}"><i class="fa-solid fa-trash"></i></button>
          ` : ''}
        </td>
      </tr>
    `;
  }

  async function toggleActive(id, current) {
    try {
      await Api.updateUser(id, { isActive: !current });
      UI.toast(current ? 'User disabled' : 'User activated');
      loadTable();
    } catch (err) { UI.toast(err.message, 'danger'); }
  }

  async function remove(id, name) {
    const ok = await UI.confirm('Delete user', `Delete "${name}"? This also removes their orders.`, 'Delete');
    if (!ok) return;
    try { await Api.deleteUser(id); UI.toast('Deleted'); loadTable(); }
    catch (err) { UI.toast(err.message, 'danger'); }
  }

  async function resetPassword(id, name) {
    const bodyHtml = `
      <p>Set a new password for <strong>${UI.escape(name)}</strong>:</p>
      <input name="newPassword" type="text" class="form-control" required minlength="6" placeholder="At least 6 characters" />
    `;
    await UI.openForm({
      title: 'Reset password',
      bodyHtml,
      submitLabel: 'Set password',
      onSubmit: async (form) => {
        const v = form.querySelector('[name=newPassword]').value;
        await Api.resetUserPassword(id, v);
        UI.toast('Password updated');
      },
    });
  }

  async function openDetail(id) {
    const { user, stats } = await Api.getUser(id);
    const orders = user.orders || [];
    UI.renderModal({
      title: user.fullName,
      bodyHtml: `
        <div class="row g-3">
          <div class="col-md-6">
            <div class="small text-muted">Email</div>
            <div>${UI.escape(user.email)}</div>
          </div>
          <div class="col-md-6">
            <div class="small text-muted">Phone</div>
            <div>${UI.escape(user.phone || '—')}</div>
          </div>
          <div class="col-md-6">
            <div class="small text-muted">Address</div>
            <div>${UI.escape(user.address || '—')}</div>
          </div>
          <div class="col-md-6">
            <div class="small text-muted">Joined</div>
            <div>${UI.formatDate(user.joinDate || user.createdAt)}</div>
          </div>
        </div>

        <div class="row g-3 mt-1">
          <div class="col-4"><div class="stat-card"><div class="label">Orders</div><div class="value">${stats.totalOrders}</div></div></div>
          <div class="col-4"><div class="stat-card"><div class="label">Spent</div><div class="value">${UI.money(stats.totalSpent)}</div></div></div>
          <div class="col-4"><div class="stat-card"><div class="label">Favorites</div><div class="value">${stats.favoritesCount}</div></div></div>
        </div>

        <h6 class="form-section-title">Recent orders</h6>
        ${
          orders.length
            ? `<div class="table-responsive"><table class="table">
                <thead><tr><th>Order</th><th>Total</th><th>Status</th><th>Placed</th></tr></thead>
                <tbody>
                  ${orders.map((o) => `
                    <tr>
                      <td><strong>${UI.escape(o.orderNumber)}</strong></td>
                      <td>${UI.money(o.total)}</td>
                      <td>${UI.statusChip(o.status)}</td>
                      <td class="small text-muted">${UI.formatDate(o.placedAt)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table></div>`
            : '<p class="text-muted">No orders yet.</p>'
        }
      `,
    });
  }

  async function openForm(id) {
    const { user } = await Api.getUser(id);
    const me = Api.getUser();
    const isSelf = me && me.id === user.id;

    const bodyHtml = `
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label">Full name</label>
          <input name="fullName" class="form-control" required value="${UI.escape(user.fullName)}" />
        </div>
        <div class="col-md-6">
          <label class="form-label">Phone</label>
          <input name="phone" class="form-control" value="${UI.escape(user.phone || '')}" />
        </div>
        <div class="col-12">
          <label class="form-label">Address</label>
          <input name="address" class="form-control" value="${UI.escape(user.address || '')}" />
        </div>
        <div class="col-md-6">
          <label class="form-label">Role</label>
          <select name="role" class="form-select" ${isSelf ? 'disabled' : ''}>
            <option value="customer" ${user.role === 'customer' ? 'selected' : ''}>Customer</option>
            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
          </select>
          ${isSelf ? '<div class="form-text">You cannot change your own role here.</div>' : ''}
        </div>
        <div class="col-md-6 d-flex align-items-end">
          <div class="form-check">
            <input class="form-check-input" type="checkbox" name="isActive" ${user.isActive ? 'checked' : ''} ${isSelf ? 'disabled' : ''} />
            <label class="form-check-label">Active</label>
          </div>
        </div>
      </div>
    `;

    await UI.openForm({
      title: 'Edit user',
      bodyHtml,
      submitLabel: 'Save changes',
      onSubmit: async (form) => {
        const data = {
          fullName: form.querySelector('[name=fullName]').value.trim(),
          phone: form.querySelector('[name=phone]').value.trim() || null,
          address: form.querySelector('[name=address]').value.trim() || null,
        };
        if (!isSelf) {
          data.role = form.querySelector('[name=role]').value;
          data.isActive = form.querySelector('[name=isActive]').checked;
        }
        await Api.updateUser(id, data);
        UI.toast('User updated');
        loadTable();
      },
    });
  }

  Views.Users = { render };
})();
