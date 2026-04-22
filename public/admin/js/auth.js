(function () {
  const Auth = {
    async attemptLogin(email, password) {
      const { user, token } = await Api.login(email, password);
      if (user.role !== 'admin') {
        Api.clearToken();
        throw new Error('This account does not have admin access');
      }
      Api.setToken(token);
      Api.setUser(user);
      return user;
    },

    logout() {
      Api.clearToken();
      location.hash = '#/login';
      location.reload();
    },

    bindLoginForm() {
      const form = document.getElementById('login-form');
      const errBox = document.getElementById('login-error');
      const submit = document.getElementById('login-submit');

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errBox.classList.add('d-none');
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        try {
          submit.disabled = true;
          submit.querySelector('.btn-label').classList.add('d-none');
          submit.querySelector('.spinner-border').classList.remove('d-none');
          await Auth.attemptLogin(email, password);
          location.hash = '#/dashboard';
          App.bootApp();
        } catch (err) {
          errBox.textContent = err.message || 'Login failed';
          errBox.classList.remove('d-none');
        } finally {
          submit.disabled = false;
          submit.querySelector('.btn-label').classList.remove('d-none');
          submit.querySelector('.spinner-border').classList.add('d-none');
        }
      });
    },
  };

  window.Auth = Auth;
})();
