(function () {
  const API_BASE = '/api/v1';
  const TOKEN_KEY = 'dc_admin_token';
  const USER_KEY = 'dc_admin_user';

  const Api = {
    getToken() { return localStorage.getItem(TOKEN_KEY); },
    setToken(t) { localStorage.setItem(TOKEN_KEY, t); },
    clearToken() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); },

    getUser() {
      const raw = localStorage.getItem(USER_KEY);
      try { return raw ? JSON.parse(raw) : null; } catch { return null; }
    },
    setUser(u) { localStorage.setItem(USER_KEY, JSON.stringify(u)); },

    async request(method, path, body) {
      const headers = { 'Content-Type': 'application/json' };
      const token = this.getToken();
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      let payload;
      try { payload = await res.json(); } catch { payload = null; }

      if (!res.ok) {
        const err = new Error((payload && payload.error && payload.error.message) || `HTTP ${res.status}`);
        err.status = res.status;
        err.details = payload && payload.error && payload.error.details;
        if (res.status === 401) {
          this.clearToken();
          if (!location.hash.startsWith('#/login')) location.hash = '#/login';
        }
        throw err;
      }
      return (payload && payload.data) || {};
    },

    get(path) { return this.request('GET', path); },
    post(path, body) { return this.request('POST', path, body); },
    patch(path, body) { return this.request('PATCH', path, body); },
    del(path) { return this.request('DELETE', path); },

    // --- Auth
    login(email, password) {
      return this.request('POST', '/auth/login', { email, password });
    },
    me() { return this.get('/auth/me'); },

    // --- Admin
    stats() { return this.get('/admin/stats'); },

    // Users
    listUsers(q) {
      const qs = new URLSearchParams(q || {}).toString();
      return this.get(`/admin/users${qs ? '?' + qs : ''}`);
    },
    getUser(id) { return this.get(`/admin/users/${id}`); },
    createUser(body) { return this.post('/admin/users', body); },
    updateUser(id, body) { return this.patch(`/admin/users/${id}`, body); },
    resetUserPassword(id, newPassword) {
      return this.post(`/admin/users/${id}/reset-password`, { newPassword });
    },
    deleteUser(id) { return this.del(`/admin/users/${id}`); },

    // Foods
    listFoods(q) {
      const qs = new URLSearchParams(q || {}).toString();
      return this.get(`/foods${qs ? '?' + qs : ''}`);
    },
    getFood(id) { return this.get(`/foods/${id}`); },
    createFood(body) { return this.post('/foods', body); },
    updateFood(id, body) { return this.patch(`/foods/${id}`, body); },
    deleteFood(id) { return this.del(`/foods/${id}`); },

    // Categories
    listCategories() { return this.get('/categories'); },
    createCategory(body) { return this.post('/categories', body); },
    updateCategory(id, body) { return this.patch(`/categories/${id}`, body); },
    deleteCategory(id) { return this.del(`/categories/${id}`); },

    // Banners
    listBanners() { return this.get('/banners/all'); },
    createBanner(body) { return this.post('/banners', body); },
    updateBanner(id, body) { return this.patch(`/banners/${id}`, body); },
    deleteBanner(id) { return this.del(`/banners/${id}`); },

    // Orders
    listAllOrders(q) {
      const qs = new URLSearchParams(q || {}).toString();
      return this.get(`/orders/admin/all${qs ? '?' + qs : ''}`);
    },
    getOrder(id) { return this.get(`/orders/${id}`); },
    updateOrderStatus(id, status, note) {
      return this.patch(`/orders/${id}/status`, { status, note });
    },

    // Notifications
    listNotifications() { return this.get('/admin/notifications'); },
    fcmTokenStats()    { return this.get('/admin/fcm-tokens'); },
    sendNotification(body) { return this.post('/admin/notifications/send', body); },
  };

  window.Api = Api;
})();
