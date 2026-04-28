(function () {
  window.Views = window.Views || {};

  let state = { categoryFilter: '', search: '' };
  let categories = [];

  async function render() {
    const container = document.getElementById('view-container');
    if (!categories.length) {
      const res = await Api.listCategories();
      categories = res.categories || [];
    }

    container.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <h5 class="panel-title"><i class="fa-solid fa-bowl-food me-2"></i> Menu items</h5>
          <div class="ms-auto d-flex gap-2 flex-wrap">
            <input type="search" id="foods-search" class="form-control form-control-sm" placeholder="Search…" value="${UI.escape(state.search)}" style="min-width:200px" />
            <select id="foods-category" class="form-select form-select-sm" style="min-width:160px">
              <option value="">All categories</option>
              ${categories.map((c) => `<option value="${c.key}" ${state.categoryFilter === c.key ? 'selected' : ''}>${UI.escape(c.name)}</option>`).join('')}
            </select>
            <button class="btn btn-sm btn-primary" id="food-create"><i class="fa-solid fa-plus"></i> New</button>
          </div>
        </div>
        <div id="foods-body"></div>
      </div>
    `;

    let searchT;
    document.getElementById('foods-search').addEventListener('input', (e) => {
      clearTimeout(searchT);
      searchT = setTimeout(() => { state.search = e.target.value; loadTable(); }, 300);
    });
    document.getElementById('foods-category').addEventListener('change', (e) => {
      state.categoryFilter = e.target.value; loadTable();
    });
    document.getElementById('food-create').addEventListener('click', () => openForm());

    await loadTable();
  }

  async function loadTable() {
    const body = document.getElementById('foods-body');
    UI.setLoading(body);
    // Admins need to see disabled items so they can re-enable them. The
    // backend honours this flag only for admin role.
    const q = { limit: 100, includeUnavailable: 'true' };
    if (state.categoryFilter) q.category = state.categoryFilter;
    if (state.search) q.search = state.search;
    const { items } = await Api.listFoods(q);

    if (!items.length) {
      body.innerHTML = UI.emptyState('fa-bowl-food', 'No items match', 'Try clearing filters or create a new item.');
      return;
    }

    body.innerHTML = `
      <div class="table-responsive">
        <table class="table align-middle">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Category</th>
              <th class="text-end">Price</th>
              <th>Rating</th>
              <th>Flags</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${items.map(row).join('')}
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
    body.querySelectorAll('[data-toggle-avail]').forEach((btn) => {
      btn.addEventListener('click', () => toggleAvailable(btn.dataset.toggleAvail, btn.dataset.value === 'true'));
    });
  }

  function row(f) {
    return `
      <tr>
        <td>${UI.gradientSwatch(f.gradientColors)}</td>
        <td>
          <strong>${UI.escape(f.name)}</strong><br/>
          <small class="text-muted">${UI.escape(f.nameAr || '')}</small>
        </td>
        <td><span class="chip neutral">${UI.escape(f.categoryKey)}</span></td>
        <td class="text-end text-nowrap-cell">${UI.money(f.price)}</td>
        <td><i class="fa-solid fa-star text-warning"></i> ${Number(f.rating || 0).toFixed(1)} <small class="text-muted">(${f.reviewCount || 0})</small></td>
        <td>
          ${f.isPopular ? '<span class="popular-badge"><i class="fa-solid fa-fire"></i> Popular</span> ' : ''}
          ${f.isChefSpecial ? '<span class="chef-badge"><i class="fa-solid fa-star"></i> Chef Special</span> ' : ''}
          ${!f.isAvailable ? '<span class="chip danger">Hidden</span>' : ''}
        </td>
        <td class="text-nowrap-cell">
          <button class="btn btn-sm btn-light" data-toggle-avail="${f.id}" data-value="${!!f.isAvailable}" title="${f.isAvailable ? 'Hide' : 'Show'}">
            <i class="fa-solid ${f.isAvailable ? 'fa-eye' : 'fa-eye-slash'}"></i>
          </button>
          <button class="btn btn-sm btn-light" data-edit="${f.id}"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-sm btn-outline-danger" data-delete="${f.id}" data-name="${UI.escape(f.name)}"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `;
  }

  async function toggleAvailable(id, current) {
    try {
      await Api.updateFood(id, { isAvailable: !current });
      UI.toast(current ? 'Item hidden' : 'Item is now visible');
      loadTable();
    } catch (err) { UI.toast(err.message, 'danger'); }
  }

  async function remove(id, name) {
    const ok = await UI.confirm('Delete food item', `Delete "${name}"? This cannot be undone.`, 'Delete');
    if (!ok) return;
    try {
      await Api.deleteFood(id);
      UI.toast('Deleted');
      loadTable();
    } catch (err) { UI.toast(err.message, 'danger'); }
  }

  async function openForm(id) {
    let item = null;
    if (id) {
      const res = await Api.getFood(id);
      item = res.item;
    }

    const opts = categories.map((c) => `<option value="${c.key}" ${item && item.categoryKey === c.key ? 'selected' : ''}>${UI.escape(c.name)}</option>`).join('');

    const bodyHtml = `
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label">Name (English) *</label>
          <input name="name" class="form-control" required value="${UI.escape(item ? item.name : '')}" />
        </div>
        <div class="col-md-6">
          <label class="form-label">Name (Arabic) *</label>
          <input name="nameAr" class="form-control" required dir="rtl" value="${UI.escape(item ? item.nameAr : '')}" />
        </div>

        <div class="col-12">
          <div class="alert alert-light border d-flex align-items-center mb-0 py-2">
            <i class="fa-solid fa-utensils me-2 text-primary"></i>
            <span class="small text-muted">All dishes are prepared by <strong>Dar</strong> (دار). The chef field is fixed brand-wide.</span>
          </div>
        </div>

        <div class="col-12">
          <label class="form-label">Description (English) *</label>
          <textarea name="description" class="form-control" rows="2" required>${UI.escape(item ? item.description : '')}</textarea>
        </div>
        <div class="col-12">
          <label class="form-label">Description (Arabic) *</label>
          <textarea name="descriptionAr" class="form-control" rows="2" required dir="rtl">${UI.escape(item ? item.descriptionAr : '')}</textarea>
        </div>

        <div class="col-md-3">
          <label class="form-label">Category *</label>
          <select name="categoryKey" class="form-select" required>${opts}</select>
        </div>
        <div class="col-md-3">
          <label class="form-label">Price (QAR) *</label>
          <input name="price" type="number" step="0.01" min="0" class="form-control" required value="${item ? item.price : ''}" />
        </div>
        <div class="col-md-2">
          <label class="form-label">Prep time (min)</label>
          <input name="prepTime" type="number" min="0" class="form-control" value="${item ? item.prepTime : 20}" />
        </div>
        <div class="col-md-2">
          <label class="form-label">Servings</label>
          <input name="servings" type="number" min="1" class="form-control" value="${item ? item.servings : 1}" />
        </div>
        <div class="col-md-2">
          <label class="form-label">Rating</label>
          <input name="rating" type="number" step="0.1" min="0" max="5" class="form-control" value="${item ? item.rating : 0}" />
        </div>

        <div class="col-md-6">
          <label class="form-label">Ingredients (English)</label>
          ${UI.tagInput('ingredients', item ? item.ingredients : [])}
        </div>
        <div class="col-md-6">
          <label class="form-label">Ingredients (Arabic)</label>
          ${UI.tagInput('ingredientsAr', item ? item.ingredientsAr : [])}
        </div>

        <div class="col-md-6">
          <label class="form-label">Tags (English)</label>
          ${UI.tagInput('tags', item ? item.tags : [])}
        </div>
        <div class="col-md-6">
          <label class="form-label">Tags (Arabic)</label>
          ${UI.tagInput('tagsAr', item ? item.tagsAr : [])}
        </div>

        <div class="col-md-6">
          <label class="form-label">Gradient colors (hex, e.g. <code>E07A45</code>)</label>
          ${UI.tagInput('gradientColors', item ? item.gradientColors : [])}
        </div>
        <div class="col-md-3">
          <label class="form-label">Symbol name</label>
          <input name="symbolName" class="form-control" value="${UI.escape(item ? item.symbolName || '' : 'fork.knife')}" />
        </div>
        <div class="col-md-3">
          <label class="form-label">Chef avatar symbol</label>
          <input name="chefAvatarSymbol" class="form-control" value="${UI.escape(item ? item.chefAvatarSymbol || '' : 'person.circle.fill')}" />
        </div>

        <div class="col-12">
          <div class="form-check form-check-inline">
            <input class="form-check-input" type="checkbox" name="isPopular" ${item && item.isPopular ? 'checked' : ''} />
            <label class="form-check-label">Popular</label>
          </div>
          <div class="form-check form-check-inline">
            <input class="form-check-input" type="checkbox" name="isChefSpecial" ${item && item.isChefSpecial ? 'checked' : ''} />
            <label class="form-check-label">Chef's Special</label>
          </div>
          <div class="form-check form-check-inline">
            <input class="form-check-input" type="checkbox" name="isAvailable" ${!item || item.isAvailable ? 'checked' : ''} />
            <label class="form-check-label">Available / visible</label>
          </div>
        </div>
      </div>
    `;

    await UI.openForm({
      title: id ? 'Edit menu item' : 'New menu item',
      bodyHtml,
      submitLabel: id ? 'Save changes' : 'Create item',
      onSubmit: async (form) => {
        UI.bindTagInputs(form); // keep tags readable
        const data = collect(form);
        if (id) {
          await Api.updateFood(id, data);
          UI.toast('Updated');
        } else {
          await Api.createFood(data);
          UI.toast('Created');
        }
        await loadTable();
      },
    });

    // Bind tag inputs after the modal is in the DOM
    const modalBody = document.getElementById('app-modal-body');
    UI.bindTagInputs(modalBody);
  }

  function collect(form) {
    const v = (n) => form.querySelector(`[name="${n}"]`).value;
    const b = (n) => form.querySelector(`[name="${n}"]`).checked;
    return {
      name: v('name'),
      nameAr: v('nameAr'),
      // chefName / chefNameAr are auto-filled server-side ("Dar" / "دار").
      description: v('description'),
      descriptionAr: v('descriptionAr'),
      categoryKey: v('categoryKey'),
      price: parseFloat(v('price')) || 0,
      prepTime: parseInt(v('prepTime'), 10) || 0,
      servings: parseInt(v('servings'), 10) || 1,
      rating: parseFloat(v('rating')) || 0,
      symbolName: v('symbolName'),
      chefAvatarSymbol: v('chefAvatarSymbol'),
      ingredients: UI.readTagInput(form, 'ingredients'),
      ingredientsAr: UI.readTagInput(form, 'ingredientsAr'),
      tags: UI.readTagInput(form, 'tags'),
      tagsAr: UI.readTagInput(form, 'tagsAr'),
      gradientColors: UI.readTagInput(form, 'gradientColors'),
      isPopular: b('isPopular'),
      isChefSpecial: b('isChefSpecial'),
      isAvailable: b('isAvailable'),
    };
  }

  Views.Foods = { render };
})();
