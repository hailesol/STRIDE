/* ══════════════════════════════════
   STRIDE — Auth Module
   Handles sign up, login, logout,
   and session management via
   localStorage.
   ══════════════════════════════════ */

const USERS_KEY   = 'stride_users';
const SESSION_KEY = 'stride_session';

/* ── Storage helpers ── */

function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getSession() {
  return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
}

function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/* ── Tab switching ── */

function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));

  document.querySelector(`.auth-tab[onclick="switchTab('${tab}')"]`).classList.add('active');
  document.getElementById(`${tab}-form`).classList.add('active');
}

/* ── Login ── */

function handleLogin(e) {
  e.preventDefault();

  const email    = document.getElementById('login-email').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;
  const users    = getUsers();
  const errorEl  = document.getElementById('login-error');

  if (users[email] && users[email].password === btoa(password)) {
    errorEl.classList.remove('show');
    const session = { email, name: users[email].name };
    saveSession(session);
    showDashboard(session);
  } else {
    errorEl.classList.add('show');
  }
}

/* ── Sign up ── */

function handleSignup(e) {
  e.preventDefault();

  const name     = document.getElementById('signup-name').value.trim();
  const email    = document.getElementById('signup-email').value.trim().toLowerCase();
  const password = document.getElementById('signup-password').value;
  const users    = getUsers();
  const errorEl  = document.getElementById('signup-error');

  if (users[email]) {
    errorEl.classList.add('show');
    return;
  }

  errorEl.classList.remove('show');
  users[email] = { name, password: btoa(password), plans: [] };
  saveUsers(users);

  const session = { email, name };
  saveSession(session);
  showDashboard(session);
  showToast(`Welcome to STRIDE, ${name}! 🎉`, 'success');
}

/* ── Logout ── */

function logout() {
  localStorage.removeItem(SESSION_KEY);
  document.getElementById('auth-screen').classList.add('active');
  document.getElementById('dashboard-screen').classList.remove('active');
  document.getElementById('login-email').value    = '';
  document.getElementById('login-password').value = '';
  showToast('Logged out. See you next run! 👋', 'info');
}

/* ── Show dashboard after auth ── */

function showDashboard(session) {
  document.getElementById('auth-screen').classList.remove('active');
  document.getElementById('dashboard-screen').classList.add('active');
  document.getElementById('topbar-username').textContent       = session.name;
  document.getElementById('user-avatar-initials').textContent  = session.name.charAt(0).toUpperCase();
}

/* ── Auto-login on page load ── */

window.addEventListener('DOMContentLoaded', () => {
  const session = getSession();
  if (session) {
    showDashboard(session);
  }
});
