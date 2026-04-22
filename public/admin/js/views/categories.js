(function () {
  window.Views = window.Views || {};

  async function render() {
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <h5 class="panel-title"><i class="fa-solid fa-tags me-2"></i> Categories</h5>
          <button class="btn btn-sm btn-primary ms-auto" id="cat-create"><i class="fa-solid fa-plus"></i> New category</button>
        </div>
        <div id="cat-body"></div>
      </div>
    `;

    document.getElementById('cat-create').addEventListener('click', () => openForm());
    await loadTable();
  }

  async function loadTable() {
    const body = document.getElementById('cat-body');
    UI.setLoading(body);
    const { categories } = await Api.listCategories();

    if (!categories.length) {
      body.innerHTML = UI.emptyState('fa-tags', 'No categories', 'Create your first category.');
      return;
    }

    body.innerHTML = `
      <div class="table-responsive">
        <table class="table align-middle">
          <thead>
            <tr>
              <th>Key</th>
              <th>Name (EN)</th>
              <th>Name (AR)</th>
              <th>Symbol</th>
              <th>Order</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${categories.map(row).join('')}
          </tbody>
        </table>
      </div>
    `;

    body.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => openForm(btn.dataset.edit));
    });
    body.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', () => remove(btn.dataset.delete, btn.dataset.name));
    });
  }

  function row(c) {
    return `
      <tr data-cat-id="${c.id}">
        <td><code>${UI.escape(c.key)}</code></td>
        <td><strong>${UI.escape(c.name)}</strong></td>
        <td dir="rtl">${UI.escape(c.nameAr)}</td>
        <td><code>${UI.escape(c.symbolName || '—')}</code></td>
        <td>${c.sortOrder}</td>
        <td class="text-nowrap-cell">
          <button class="btn btn-sm btn-light" data-edit='${c.id}'><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-sm btn-outline-danger" data-delete='${c.id}' data-name="${UI.escape(c.name)}"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `;
  }

  async function remove(id, name) {
    const ok = await UI.confirm('Delete category', `Delete "${name}"?`, 'Delete');
    if (!ok) return;
    try { await Api.deleteCategory(id); UI.toast('Deleted'); loadTable(); }
    catch (err) { UI.toast(err.message, 'danger'); }
  }

  async function openForm(id) {
    let cat = null;
    if (id) {
      const { categories } = await Api.listCategories();
      cat = categories.find((c) => c.id === id);
    }

    const bodyHtml = `
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label">Key *</label>
          <input name="key" class="form-control" required pattern="[A-Za-z0-9_-]+" value="${UI.escape(cat ? cat.key : '')}" />
          <div class="form-text">Used by food items to reference this category. No spaces.</div>
        </div>
        <div class="col-md-6">
          <label class="form-label">Sort order</label>
          <input name="sortOrder" type="number" class="form-control" value="${cat ? cat.sortOrder : 0}" />
        </div>
        <div class="col-md-6">
          <label class="form-label">Name (English) *</label>
          <input name="name" class="form-control" required value="${UI.escape(cat ? cat.name : '')}" />
        </div>
        <div class="col-md-6">
          <label class="form-label">Name (Arabic) *</label>
          <input name="nameAr" class="form-control" required dir="rtl" value="${UI.escape(cat ? cat.nameAr : '')}" />
        </div>
        <div class="col-md-6">
          <label class="form-label">SF Symbol</label>
          <input name="symbolName" class="form-control" value="${UI.escape(cat ? cat.symbolName || '' : '')}" placeholder="fork.knife" />
        </div>
      </div>
    `;

    await UI.openForm({
      title: id ? 'Edit category' : 'New category',
      bodyHtml,
      submitLabel: id ? 'Save changes' : 'Create category',
      onSubmit: async (form) => {
        const data = {
          key: form.querySelector('[name=key]').value.trim(),
          name: form.querySelector('[name=name]').value.trim(),
          nameAr: form.querySelector('[name=nameAr]').value.trim(),
          symbolName: form.querySelector('[name=symbolName]').value.trim() || null,
          sortOrder: parseInt(form.querySelector('[name=sortOrder]').value, 10) || 0,
        };
        if (id) { await Api.updateCategory(id, data); UI.toast('Updated'); }
        else { await Api.createCategory(data); UI.toast('Created'); }
        loadTable();
      },
    });
  }

  Views.Categories = { render };
})();
