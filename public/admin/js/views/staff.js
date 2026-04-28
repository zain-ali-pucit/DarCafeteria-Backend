(function () {
  window.Views = window.Views || {};

  // Admin-side management for `role = 'staff'` users (riders). Staff don't
  // sign in to this admin panel — they use the Android app — so this view
  // is purely about creating/editing/deactivating their accounts.
  let state = { search: '' };

  async function render() {
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <h5 class="panel-title"><i class="fa-solid fa-motorcycle me-2"></i> Staff</h5>
          <div class="ms-auto d-flex gap-2 flex-wrap">
            <input type="search" id="staff-search" class="form-control form-control-sm" placeholder="Search name/email/phone" value="${UI.escape(state.search)}" style="min-width:240px" />
            <button class="btn btn-sm btn-primary" id="staff-create"><i class="fa-solid fa-plus"></i> New staff</button>
          </div>
        </div>
        <div id="staff-body"></div>
      </div>
    `;

    let searchT;
    document.getElementById('staff-search').addEventListener('input', (e) => {
      clearTimeout(searchT);
      searchT = setTimeout(() => { state.search = e.target.value; loadTable(); }, 300);
    });
    document.getElementById('staff-create').addEventListener('click', () => openCreateForm());

    await loadTable();
  }

  async function loadTable() {
    const body = document.getElementById('staff-body');
    UI.setLoading(body);
    const q = { role: 'staff' };
    if (state.search) q.search = state.search;
    const { users } = await Api.listUsers(q);

    if (!users.length) {
      body.innerHTML = UI.emptyState(
        'fa-motorcycle',
        'No staff yet',
        'Create a rider account so they can sign into the Android app.'
      );
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
              <th>Status</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${users.map(row).join('')}</tbody>
        </table>
      </div>
    `;

    body.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => openEditForm(btn.dataset.edit));
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
    return `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-2">
            <div class="user-card"><div class="avatar">${UI.escape((u.fullName || u.email || '?').charAt(0).toUpperCase())}</div></div>
            <div>
              <strong>${UI.escape(u.fullName)}</strong>
              <span class="chip primary">staff</span>
            </div>
          </div>
        </td>
        <td>${UI.escape(u.email)}</td>
        <td>${UI.escape(u.phone || '—')}</td>
        <td>${u.isActive ? '<span class="chip success">Active</span>' : '<span class="chip danger">Disabled</span>'}</td>
        <td class="text-nowrap-cell small text-muted">${UI.formatDate(u.joinDate || u.createdAt)}</td>
        <td class="text-nowrap-cell">
          <button class="btn btn-sm btn-light" data-edit="${u.id}"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-sm btn-light" data-reset="${u.id}" data-name="${UI.escape(u.fullName)}"><i class="fa-solid fa-key"></i></button>
          <button class="btn btn-sm btn-light" data-toggle-active="${u.id}" data-value="${u.isActive}">
            <i class="fa-solid ${u.isActive ? 'fa-user-slash' : 'fa-user-check'}"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" data-delete="${u.id}" data-name="${UI.escape(u.fullName)}"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `;
  }

  async function toggleActive(id, current) {
    try {
      await Api.updateUser(id, { isActive: !current });
      UI.toast(current ? 'Staff disabled' : 'Staff activated');
      loadTable();
    } catch (err) { UI.toast(err.message, 'danger'); }
  }

  async function remove(id, name) {
    const ok = await UI.confirm('Remove staff', `Remove staff "${name}"? Their past order pickups stay in history.`, 'Remove');
    if (!ok) return;
    try { await Api.deleteUser(id); UI.toast('Staff removed'); loadTable(); }
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

  async function openEditForm(id) {
    const { user } = await Api.getUser(id);

    const bodyHtml = `
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label">Full name *</label>
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
        <div class="col-12 d-flex">
          <div class="form-check">
            <input class="form-check-input" type="checkbox" name="isActive" ${user.isActive ? 'checked' : ''} />
            <label class="form-check-label">Active (can sign into the staff app)</label>
          </div>
        </div>
      </div>
    `;

    await UI.openForm({
      title: 'Edit staff',
      bodyHtml,
      submitLabel: 'Save changes',
      onSubmit: async (form) => {
        await Api.updateUser(id, {
          fullName: form.querySelector('[name=fullName]').value.trim(),
          phone: form.querySelector('[name=phone]').value.trim() || null,
          address: form.querySelector('[name=address]').value.trim() || null,
          isActive: form.querySelector('[name=isActive]').checked,
        });
        UI.toast('Staff updated');
        loadTable();
      },
    });
  }

  async function openCreateForm() {
    const bodyHtml = `
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label">Full name *</label>
          <input name="fullName" class="form-control" required placeholder="Khalid Al-Mansouri" />
        </div>
        <div class="col-md-6">
          <label class="form-label">Email *</label>
          <input name="email" type="email" class="form-control" required placeholder="rider@darcafeteria.qa" />
        </div>
        <div class="col-md-6">
          <label class="form-label">Phone</label>
          <input name="phone" class="form-control" placeholder="+974 5xxx xxxx" />
        </div>
        <div class="col-md-6">
          <label class="form-label">Initial password *</label>
          <input name="password" type="text" class="form-control" required minlength="6" placeholder="≥ 6 characters" />
        </div>
        <div class="col-12">
          <label class="form-label">Address</label>
          <input name="address" class="form-control" placeholder="Doha, Qatar" />
        </div>
        <div class="col-12 small text-muted">
          The new staff member can sign into the Android app with this email and password.
        </div>
      </div>
    `;
    await UI.openForm({
      title: 'New staff',
      bodyHtml,
      submitLabel: 'Create staff',
      onSubmit: async (form) => {
        await Api.createUser({
          fullName: form.querySelector('[name=fullName]').value.trim(),
          email: form.querySelector('[name=email]').value.trim(),
          password: form.querySelector('[name=password]').value,
          phone: form.querySelector('[name=phone]').value.trim() || null,
          address: form.querySelector('[name=address]').value.trim() || null,
          role: 'staff',
          avatarSymbol: 'figure.outdoor.cycle',
        });
        UI.toast('Staff created');
        loadTable();
      },
    });
  }

  Views.Staff = { render };
})();
