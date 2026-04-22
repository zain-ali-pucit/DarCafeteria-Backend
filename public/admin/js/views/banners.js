(function () {
  window.Views = window.Views || {};

  async function render() {
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <h5 class="panel-title"><i class="fa-solid fa-images me-2"></i> Promotional banners</h5>
          <button class="btn btn-sm btn-primary ms-auto" id="banner-create"><i class="fa-solid fa-plus"></i> New banner</button>
        </div>
        <div id="banner-body"></div>
      </div>
    `;
    document.getElementById('banner-create').addEventListener('click', () => openForm());
    await loadTable();
  }

  async function loadTable() {
    const body = document.getElementById('banner-body');
    UI.setLoading(body);
    const { banners } = await Api.listBanners();

    if (!banners.length) {
      body.innerHTML = UI.emptyState('fa-images', 'No banners', 'Create your first banner.');
      return;
    }

    body.innerHTML = `
      <div class="row g-3 p-3">
        ${banners.map(card).join('')}
      </div>
    `;

    body.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => openForm(btn.dataset.edit));
    });
    body.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', () => remove(btn.dataset.delete));
    });
    body.querySelectorAll('[data-toggle-active]').forEach((btn) => {
      btn.addEventListener('click', () => toggleActive(btn.dataset.toggleActive, btn.dataset.value === 'true'));
    });
  }

  function card(b) {
    const stops = (b.gradientColors || []).map((c) => `#${c.replace(/^#/, '')}`).join(', ');
    return `
      <div class="col-md-6 col-xl-4">
        <div class="panel h-100">
          <div style="height:110px;background:linear-gradient(135deg, ${stops || '#ccc, #999'});color:#fff;display:flex;align-items:center;justify-content:center;font-size:36px;">
            <i class="fa-solid ${iconHint(b.symbolName)}"></i>
          </div>
          <div class="panel-body">
            <div class="small text-muted">${UI.escape(b.taglineKey)}</div>
            <div><strong>${UI.escape(b.titleKey)}</strong></div>
            <div class="small text-muted">${UI.escape(b.subtitleKey)}</div>
            <div class="mt-2 d-flex align-items-center gap-2">
              <span class="chip ${b.isActive ? 'success' : 'neutral'}">${b.isActive ? 'Active' : 'Hidden'}</span>
              <span class="chip neutral">Order ${b.sortOrder}</span>
            </div>
          </div>
          <div class="panel-header" style="justify-content:flex-end;gap:6px;">
            <button class="btn btn-sm btn-light" data-toggle-active="${b.id}" data-value="${b.isActive}"><i class="fa-solid ${b.isActive ? 'fa-eye-slash' : 'fa-eye'}"></i></button>
            <button class="btn btn-sm btn-light" data-edit="${b.id}"><i class="fa-solid fa-pen"></i></button>
            <button class="btn btn-sm btn-outline-danger" data-delete="${b.id}"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      </div>
    `;
  }

  // Best-effort mapping from SF Symbol names to Font Awesome icons
  function iconHint(sym) {
    if (!sym) return 'fa-star';
    if (sym.includes('star')) return 'fa-star';
    if (sym.includes('bicycle')) return 'fa-bicycle';
    if (sym.includes('sun')) return 'fa-sun';
    if (sym.includes('moon')) return 'fa-moon';
    if (sym.includes('fork')) return 'fa-utensils';
    if (sym.includes('flame')) return 'fa-fire';
    if (sym.includes('leaf')) return 'fa-leaf';
    if (sym.includes('cup')) return 'fa-mug-hot';
    if (sym.includes('cake')) return 'fa-cake-candles';
    return 'fa-tag';
  }

  async function toggleActive(id, current) {
    try {
      await Api.updateBanner(id, { isActive: !current });
      UI.toast(current ? 'Banner hidden' : 'Banner active');
      loadTable();
    } catch (err) { UI.toast(err.message, 'danger'); }
  }

  async function remove(id) {
    const ok = await UI.confirm('Delete banner', 'Delete this banner?', 'Delete');
    if (!ok) return;
    try { await Api.deleteBanner(id); UI.toast('Deleted'); loadTable(); }
    catch (err) { UI.toast(err.message, 'danger'); }
  }

  async function openForm(id) {
    let banner = null;
    if (id) {
      const { banners } = await Api.listBanners();
      banner = banners.find((b) => b.id === id);
    }

    const bodyHtml = `
      <div class="row g-3">
        <div class="col-md-4">
          <label class="form-label">Tagline key *</label>
          <input name="taglineKey" class="form-control" required value="${UI.escape(banner ? banner.taglineKey : '')}" placeholder="banner.tagline.signature" />
        </div>
        <div class="col-md-4">
          <label class="form-label">Title key *</label>
          <input name="titleKey" class="form-control" required value="${UI.escape(banner ? banner.titleKey : '')}" placeholder="banner.title.taste" />
        </div>
        <div class="col-md-4">
          <label class="form-label">Subtitle key *</label>
          <input name="subtitleKey" class="form-control" required value="${UI.escape(banner ? banner.subtitleKey : '')}" placeholder="banner.sub.biryani" />
        </div>

        <div class="col-md-6">
          <label class="form-label">Gradient colors (hex)</label>
          ${UI.tagInput('gradientColors', banner ? banner.gradientColors : [])}
        </div>
        <div class="col-md-4">
          <label class="form-label">Symbol name</label>
          <input name="symbolName" class="form-control" value="${UI.escape(banner ? banner.symbolName || '' : '')}" placeholder="star.fill" />
        </div>
        <div class="col-md-2">
          <label class="form-label">Order</label>
          <input name="sortOrder" type="number" class="form-control" value="${banner ? banner.sortOrder : 0}" />
        </div>

        <div class="col-12">
          <div class="form-check">
            <input class="form-check-input" type="checkbox" name="isActive" ${!banner || banner.isActive ? 'checked' : ''} />
            <label class="form-check-label">Active / visible in app</label>
          </div>
        </div>
      </div>
    `;

    await UI.openForm({
      title: id ? 'Edit banner' : 'New banner',
      bodyHtml,
      submitLabel: id ? 'Save changes' : 'Create banner',
      onSubmit: async (form) => {
        const data = {
          taglineKey: form.querySelector('[name=taglineKey]').value.trim(),
          titleKey: form.querySelector('[name=titleKey]').value.trim(),
          subtitleKey: form.querySelector('[name=subtitleKey]').value.trim(),
          symbolName: form.querySelector('[name=symbolName]').value.trim() || null,
          sortOrder: parseInt(form.querySelector('[name=sortOrder]').value, 10) || 0,
          isActive: form.querySelector('[name=isActive]').checked,
          gradientColors: UI.readTagInput(form, 'gradientColors'),
        };
        if (id) { await Api.updateBanner(id, data); UI.toast('Updated'); }
        else { await Api.createBanner(data); UI.toast('Created'); }
        loadTable();
      },
    });

    UI.bindTagInputs(document.getElementById('app-modal-body'));
  }

  Views.Banners = { render };
})();
