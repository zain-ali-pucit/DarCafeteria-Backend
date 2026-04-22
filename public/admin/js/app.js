(function () {
  const App = {
    currentView: null,

    routes: {
      dashboard: { title: 'Dashboard', render: () => Views.Dashboard.render() },
      orders:    { title: 'Orders',    render: () => Views.Orders.render() },
      foods:     { title: 'Menu / Foods', render: () => Views.Foods.render() },
      categories:{ title: 'Categories', render: () => Views.Categories.render() },
      banners:   { title: 'Banners',   render: () => Views.Banners.render() },
      users:     { title: 'Users',     render: () => Views.Users.render() },
    },

    async renderCurrentRoute() {
      const hash = location.hash || '#/dashboard';
      const [, route, ...rest] = hash.split('/');
      const def = this.routes[route] || this.routes.dashboard;

      document.getElementById('page-title').textContent = def.title;
      document.querySelectorAll('.sidebar-nav a').forEach((a) => {
        a.classList.toggle('active', a.dataset.route === (route || 'dashboard'));
      });

      const container = document.getElementById('view-container');
      UI.setLoading(container);
      try {
        await def.render(container, rest);
      } catch (err) {
        if (err && err.status === 401) return;
        container.innerHTML = `
          <div class="alert alert-danger">
            <strong>Couldn't load:</strong> ${UI.escape(err.message || String(err))}
          </div>`;
      }
    },

    updateCurrentUserCard() {
      const user = Api.getUser();
      if (!user) return;
      document.getElementById('current-user-name').textContent = user.fullName || 'Admin';
      document.getElementById('current-user-email').textContent = user.email || '';
      const initial = (user.fullName || user.email || 'A').trim().charAt(0).toUpperCase();
      document.getElementById('current-user-avatar').textContent = initial;
    },

    async bootApp() {
      // Verify token is still valid and user is admin
      try {
        const { user } = await Api.me();
        if (user.role !== 'admin') {
          Api.clearToken();
          return this.showLogin();
        }
        Api.setUser(user);
      } catch {
        return this.showLogin();
      }

      document.getElementById('login-screen').classList.add('d-none');
      document.getElementById('app-shell').classList.remove('d-none');
      this.updateCurrentUserCard();

      if (!location.hash || location.hash === '#/login') location.hash = '#/dashboard';
      await this.renderCurrentRoute();
    },

    showLogin() {
      document.getElementById('app-shell').classList.add('d-none');
      document.getElementById('login-screen').classList.remove('d-none');
      Auth.bindLoginForm();
    },

    bindShell() {
      document.getElementById('logout-btn').addEventListener('click', () => Auth.logout());

      const sidebar = document.getElementById('sidebar');
      document.getElementById('sidebar-toggle').addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
      document.querySelectorAll('.sidebar-nav a').forEach((a) => {
        a.addEventListener('click', () => sidebar.classList.remove('open'));
      });

      window.addEventListener('hashchange', () => this.renderCurrentRoute());
    },

    async init() {
      this.bindShell();
      if (Api.getToken()) {
        await this.bootApp();
      } else {
        this.showLogin();
      }
    },
  };

  window.App = App;
  document.addEventListener('DOMContentLoaded', () => App.init());
})();

window.Views = window.Views || {};
