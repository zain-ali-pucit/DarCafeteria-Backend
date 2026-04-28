(function () {
  window.Views = window.Views || {};

  // Cache once per render so we can populate the user-picker dropdown
  // without an extra round trip when the form is opened.
  let cachedUsers = null;

  async function render() {
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="row g-3">
        <div class="col-lg-7">
          <div class="panel">
            <div class="panel-header">
              <h5 class="panel-title"><i class="fa-solid fa-paper-plane me-2"></i> Send a push notification</h5>
            </div>
            <div class="panel-body">
              <form id="notif-form">
                <div class="row g-3">
                  <div class="col-md-6">
                    <label class="form-label">Audience</label>
                    <select name="target" class="form-select" id="notif-target">
                      <option value="all">Everyone (all active devices)</option>
                      <option value="user">A specific user…</option>
                      <option value="topic">A topic…</option>
                      <option value="token">A specific device token…</option>
                    </select>
                  </div>

                  <div class="col-md-6 target-field" data-show="user">
                    <label class="form-label">User</label>
                    <select name="userId" class="form-select" id="notif-user-select">
                      <option value="">Loading users…</option>
                    </select>
                  </div>

                  <div class="col-md-6 target-field d-none" data-show="topic">
                    <label class="form-label">Topic name</label>
                    <input type="text" name="topic" class="form-control" placeholder="e.g. promotions" />
                    <div class="form-text">Devices must subscribe to this topic to receive the message.</div>
                  </div>

                  <div class="col-md-6 target-field d-none" data-show="token">
                    <label class="form-label">FCM token</label>
                    <input type="text" name="token" class="form-control" placeholder="paste a registration token" />
                  </div>

                  <div class="col-12">
                    <label class="form-label">Title *</label>
                    <input type="text" name="title" class="form-control" maxlength="160" required placeholder="Order ready!" />
                  </div>

                  <div class="col-12">
                    <label class="form-label">Body *</label>
                    <textarea name="body" class="form-control" rows="3" maxlength="4000" required placeholder="Your biryani is on its way."></textarea>
                  </div>

                  <div class="col-12">
                    <label class="form-label">Extra data (optional, JSON)</label>
                    <textarea name="data" class="form-control font-monospace small" rows="3" placeholder='{"orderId": "DC12345"}'></textarea>
                    <div class="form-text">Forwarded as the FCM <code>data</code> payload — keys + string values.</div>
                  </div>
                </div>

                <div class="d-flex justify-content-end mt-3">
                  <button type="submit" class="btn btn-primary" id="notif-send-btn">
                    <span class="btn-label"><i class="fa-solid fa-paper-plane me-1"></i> Send</span>
                    <span class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div class="col-lg-5">
          <div class="panel">
            <div class="panel-header">
              <h5 class="panel-title"><i class="fa-solid fa-mobile-screen me-2"></i> Reachable devices</h5>
            </div>
            <div class="panel-body" id="notif-stats">
              <div class="text-muted small">Loading…</div>
            </div>
          </div>
          <div class="panel mt-3">
            <div class="panel-header">
              <h5 class="panel-title"><i class="fa-solid fa-clock-rotate-left me-2"></i> Recent sends</h5>
              <button class="btn btn-sm btn-light ms-auto" id="notif-refresh"><i class="fa-solid fa-rotate"></i></button>
            </div>
            <div class="panel-body" id="notif-history">
              <div class="text-muted small">Loading…</div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Show / hide the per-target field block(s) when the audience changes.
    const targetSelect = document.getElementById('notif-target');
    targetSelect.addEventListener('change', () => syncTargetFields(targetSelect.value));
    syncTargetFields(targetSelect.value);

    document.getElementById('notif-form').addEventListener('submit', onSubmit);
    document.getElementById('notif-refresh').addEventListener('click', () => {
      loadStats();
      loadHistory();
    });

    await Promise.all([loadStats(), loadHistory(), loadUsers()]);
  }

  function syncTargetFields(target) {
    document.querySelectorAll('.target-field').forEach((node) => {
      node.classList.toggle('d-none', node.dataset.show !== target);
    });
  }

  async function loadUsers() {
    const select = document.getElementById('notif-user-select');
    if (!cachedUsers) {
      try {
        const { users } = await Api.listUsers();
        cachedUsers = users;
      } catch (err) {
        select.innerHTML = `<option value="">${UI.escape(err.message)}</option>`;
        return;
      }
    }
    select.innerHTML = `
      <option value="">Choose a user…</option>
      ${cachedUsers.map((u) => `
        <option value="${u.id}">${UI.escape(u.fullName)} — ${UI.escape(u.email)}</option>
      `).join('')}
    `;
  }

  async function loadStats() {
    const host = document.getElementById('notif-stats');
    try {
      const { active, total, byPlatform } = await Api.fcmTokenStats();
      const platforms = Object.entries(byPlatform || {})
        .map(([p, c]) => `
          <span class="chip neutral me-1 mb-1">
            <i class="fa-brands fa-${p === 'ios' ? 'apple' : (p === 'android' ? 'android' : 'chrome')} me-1"></i>
            ${UI.escape(p)} · ${c}
          </span>
        `).join('');
      host.innerHTML = `
        <div class="d-flex align-items-baseline gap-3 mb-2">
          <div class="display-6 mb-0 text-primary">${active}</div>
          <div class="text-muted small">active devices · ${total} total</div>
        </div>
        <div>${platforms || '<span class="text-muted small">No registered devices yet.</span>'}</div>
      `;
    } catch (err) {
      host.innerHTML = `<div class="alert alert-warning small mb-0">${UI.escape(err.message)}</div>`;
    }
  }

  async function loadHistory() {
    const host = document.getElementById('notif-history');
    try {
      const { notifications } = await Api.listNotifications();
      if (!notifications.length) {
        host.innerHTML = UI.emptyState(
          'fa-bell-slash',
          'No notifications sent yet',
          'Compose one on the left to get started.'
        );
        return;
      }
      host.innerHTML = `
        <div class="list-group list-group-flush">
          ${notifications.map(historyRow).join('')}
        </div>
      `;
    } catch (err) {
      host.innerHTML = `<div class="alert alert-warning small mb-0">${UI.escape(err.message)}</div>`;
    }
  }

  function historyRow(n) {
    const targetLabel =
      n.targetType === 'all' ? 'All devices' :
      n.targetType === 'user' ? `User ${n.targetValue.slice(0, 8)}…` :
      n.targetType === 'topic' ? `Topic "${UI.escape(n.targetValue)}"` :
      `Single device`;
    const okBadge = n.successCount > 0
      ? `<span class="chip success">${n.successCount} delivered</span>`
      : '';
    const failBadge = n.failureCount > 0
      ? `<span class="chip danger">${n.failureCount} failed</span>`
      : '';
    const errorLine = n.error
      ? `<div class="small text-danger mt-1"><i class="fa-solid fa-triangle-exclamation me-1"></i>${UI.escape(n.error)}</div>`
      : '';
    return `
      <div class="list-group-item px-0">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div class="flex-grow-1">
            <div class="fw-semibold">${UI.escape(n.title)}</div>
            <div class="small text-muted">${UI.escape(n.body)}</div>
            ${errorLine}
          </div>
          <div class="text-end small text-muted text-nowrap">
            ${UI.formatRelative(n.sentAt)}
          </div>
        </div>
        <div class="mt-2 d-flex flex-wrap gap-1 align-items-center">
          <span class="chip neutral">${UI.escape(targetLabel)}</span>
          ${okBadge}
          ${failBadge}
        </div>
      </div>
    `;
  }

  async function onSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.reportValidity()) return;

    const target = form.target.value;
    const title = form.title.value.trim();
    const body = form.body.value.trim();
    const dataRaw = form.data.value.trim();

    let parsedData = null;
    if (dataRaw) {
      try {
        parsedData = JSON.parse(dataRaw);
      } catch {
        UI.toast('Extra data must be valid JSON', 'danger');
        return;
      }
    }

    const payload = { target, title, body };
    if (parsedData) payload.data = parsedData;

    if (target === 'user') {
      const userId = form.userId.value;
      if (!userId) { UI.toast('Pick a user', 'warning'); return; }
      payload.userId = userId;
    } else if (target === 'topic') {
      const topic = form.topic.value.trim();
      if (!topic) { UI.toast('Enter a topic name', 'warning'); return; }
      payload.topic = topic;
    } else if (target === 'token') {
      const token = form.token.value.trim();
      if (!token) { UI.toast('Paste a device token', 'warning'); return; }
      payload.token = token;
    }

    const btn = document.getElementById('notif-send-btn');
    const label = btn.querySelector('.btn-label');
    const spinner = btn.querySelector('.spinner-border');
    btn.disabled = true;
    label.classList.add('d-none');
    spinner.classList.remove('d-none');
    try {
      const { delivery } = await Api.sendNotification(payload);
      const summary =
        delivery.recipients === 'topic'
          ? 'Sent to topic'
          : `Delivered to ${delivery.successCount} of ${delivery.recipients} device(s)`;
      UI.toast(summary, delivery.failureCount > 0 ? 'warning' : 'success');
      // Reset just the message fields; keep the audience selection intact
      // so the admin can fire another quickly.
      form.title.value = '';
      form.body.value = '';
      form.data.value = '';
      await Promise.all([loadStats(), loadHistory()]);
    } catch (err) {
      UI.toast(err.message || 'Send failed', 'danger');
    } finally {
      btn.disabled = false;
      label.classList.remove('d-none');
      spinner.classList.add('d-none');
    }
  }

  Views.Notifications = { render };
})();
