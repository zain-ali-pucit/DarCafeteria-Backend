(function () {
  const UI = {};

  UI.el = (html) => {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstChild;
  };

  UI.escape = (str) => {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  UI.money = (n) => `QAR ${Number(n || 0).toFixed(2)}`;

  UI.formatDate = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  UI.formatRelative = (d) => {
    if (!d) return '—';
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const day = Math.floor(h / 24);
    if (day < 30) return `${day}d ago`;
    return UI.formatDate(d);
  };

  const STATUS_CHIP = {
    Pending: 'warning',
    Confirmed: 'info',
    Preparing: 'primary',
    Ready: 'info',
    PickedUp: 'primary',
    Delivered: 'success',
    Cancelled: 'danger',
  };

  UI.statusChip = (status) => {
    const cls = STATUS_CHIP[status] || 'neutral';
    return `<span class="chip ${cls}">${UI.escape(status)}</span>`;
  };

  UI.gradientSwatch = (colors) => {
    if (!Array.isArray(colors) || colors.length === 0) return '';
    const stops = colors.map((c) => `#${c.replace(/^#/, '')}`).join(', ');
    return `<span class="gradient-swatch" style="background:linear-gradient(135deg, ${stops});" title="${colors.join(', ')}"></span>`;
  };

  UI.toast = (message, variant = 'success') => {
    const host = document.getElementById('toast-host');
    const id = 't' + Date.now();
    const variants = {
      success: 'text-bg-success',
      danger: 'text-bg-danger',
      warning: 'text-bg-warning',
      info: 'text-bg-info',
    };
    const el = UI.el(`
      <div class="toast align-items-center ${variants[variant] || variants.info} border-0" id="${id}" role="alert">
        <div class="d-flex">
          <div class="toast-body">${UI.escape(message)}</div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      </div>
    `);
    host.appendChild(el);
    // eslint-disable-next-line no-undef
    const t = new bootstrap.Toast(el, { delay: 3500 });
    t.show();
    el.addEventListener('hidden.bs.toast', () => el.remove());
  };

  // Simple confirm dialog
  UI.confirm = (title, message, confirmText = 'Confirm', variant = 'danger') => {
    return new Promise((resolve) => {
      const modal = document.getElementById('app-modal');
      document.getElementById('app-modal-title').textContent = title;
      document.getElementById('app-modal-body').innerHTML = `<p class="mb-0">${UI.escape(message)}</p>`;
      const footer = document.getElementById('app-modal-footer');
      footer.innerHTML = `
        <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-${variant}" id="modal-confirm-btn">${UI.escape(confirmText)}</button>
      `;
      // eslint-disable-next-line no-undef
      const m = bootstrap.Modal.getOrCreateInstance(modal);
      let resolved = false;
      document.getElementById('modal-confirm-btn').onclick = () => {
        resolved = true;
        m.hide();
        resolve(true);
      };
      modal.addEventListener('hidden.bs.modal', function handler() {
        modal.removeEventListener('hidden.bs.modal', handler);
        if (!resolved) resolve(false);
      });
      m.show();
    });
  };

  UI.openForm = ({ title, bodyHtml, submitLabel = 'Save', onSubmit }) => {
    return new Promise((resolve) => {
      const modal = document.getElementById('app-modal');
      document.getElementById('app-modal-title').textContent = title;
      document.getElementById('app-modal-body').innerHTML = `<form id="app-modal-form">${bodyHtml}</form>`;
      const footer = document.getElementById('app-modal-footer');
      footer.innerHTML = `
        <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-primary" id="modal-submit-btn">
          <span class="btn-label">${UI.escape(submitLabel)}</span>
          <span class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span>
        </button>
      `;
      // eslint-disable-next-line no-undef
      const m = bootstrap.Modal.getOrCreateInstance(modal);
      let closedBy = null;

      const submitBtn = document.getElementById('modal-submit-btn');
      submitBtn.onclick = async () => {
        const form = document.getElementById('app-modal-form');
        if (!form.reportValidity()) return;
        try {
          submitBtn.disabled = true;
          submitBtn.querySelector('.btn-label').classList.add('d-none');
          submitBtn.querySelector('.spinner-border').classList.remove('d-none');
          const result = await onSubmit(form);
          closedBy = 'submit';
          m.hide();
          resolve(result || true);
        } catch (err) {
          UI.toast(err.message || 'Operation failed', 'danger');
          submitBtn.disabled = false;
          submitBtn.querySelector('.btn-label').classList.remove('d-none');
          submitBtn.querySelector('.spinner-border').classList.add('d-none');
        }
      };

      modal.addEventListener('hidden.bs.modal', function handler() {
        modal.removeEventListener('hidden.bs.modal', handler);
        if (closedBy !== 'submit') resolve(null);
      });
      m.show();
    });
  };

  UI.closeModal = () => {
    const modal = document.getElementById('app-modal');
    // eslint-disable-next-line no-undef
    const m = bootstrap.Modal.getInstance(modal);
    if (m) m.hide();
  };

  UI.renderModal = ({ title, bodyHtml, footerHtml = '' }) => {
    const modal = document.getElementById('app-modal');
    document.getElementById('app-modal-title').textContent = title;
    document.getElementById('app-modal-body').innerHTML = bodyHtml;
    document.getElementById('app-modal-footer').innerHTML =
      footerHtml || '<button type="button" class="btn btn-light" data-bs-dismiss="modal">Close</button>';
    // eslint-disable-next-line no-undef
    bootstrap.Modal.getOrCreateInstance(modal).show();
  };

  // Tag input — for ingredients, tags, gradientColors
  UI.tagInput = (name, initial = [], placeholder = 'Type and press Enter') => {
    const id = `tag-${name}-${Math.random().toString(36).slice(2, 8)}`;
    return `
      <div class="tag-input" data-tag-input="${id}" data-name="${name}">
        ${initial.map((v) => `
          <span class="tag" data-value="${UI.escape(v)}">${UI.escape(v)}<button type="button" aria-label="remove">×</button></span>
        `).join('')}
        <input type="text" placeholder="${UI.escape(placeholder)}" />
      </div>
    `;
  };

  UI.bindTagInputs = (rootEl) => {
    rootEl.querySelectorAll('[data-tag-input]').forEach((wrap) => {
      const input = wrap.querySelector('input');
      const addTag = (val) => {
        const v = (val || '').trim();
        if (!v) return;
        const span = UI.el(`
          <span class="tag" data-value="${UI.escape(v)}">${UI.escape(v)}<button type="button" aria-label="remove">×</button></span>
        `);
        wrap.insertBefore(span, input);
      };
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          addTag(input.value);
          input.value = '';
        } else if (e.key === 'Backspace' && !input.value) {
          const last = wrap.querySelectorAll('.tag');
          if (last.length) last[last.length - 1].remove();
        }
      });
      input.addEventListener('blur', () => {
        if (input.value.trim()) { addTag(input.value); input.value = ''; }
      });
      wrap.addEventListener('click', (e) => {
        if (e.target.matches('.tag button')) {
          e.target.parentElement.remove();
        }
      });
    });
  };

  UI.readTagInput = (rootEl, name) => {
    const wrap = rootEl.querySelector(`[data-tag-input][data-name="${name}"]`);
    if (!wrap) return [];
    return Array.from(wrap.querySelectorAll('.tag')).map((t) => t.getAttribute('data-value'));
  };

  UI.setLoading = (el) => {
    el.innerHTML = `<div class="text-center py-5 text-muted"><div class="spinner-border" role="status"></div></div>`;
  };

  UI.emptyState = (icon, title, sub) => `
    <div class="empty-state">
      <i class="fa-solid ${icon}"></i>
      <div class="h6 mb-1">${UI.escape(title)}</div>
      <div class="small">${UI.escape(sub || '')}</div>
    </div>
  `;

  window.UI = UI;
})();
