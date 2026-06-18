/* ══════════════════════════════════════════
   INDEX.JS — Login / Register
   ══════════════════════════════════════════ */

const tabs    = document.querySelectorAll('.auth-tab');
const forms   = document.querySelectorAll('.auth-form');
const alertEl = document.getElementById('auth-alert');

function initializeAuthTabState() {
  forms.forEach(f => f.classList.add('hidden'));
  const activeTab = document.querySelector('.auth-tab.active');
  if (activeTab) {
    const target = document.getElementById(activeTab.dataset.target);
    target?.classList.remove('hidden');
  }
}

window.addEventListener('DOMContentLoaded', initializeAuthTabState);

// ── Tab switching ──────────────────────────
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    forms.forEach(f => f.classList.add('hidden'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.target).classList.remove('hidden');
    clearAlert();
  });
});

// ── Alert helpers ──────────────────────────
function showAlert(msg, type = 'error') {
  if (!alertEl) return;
  alertEl.textContent = msg;
  alertEl.className = `alert alert-${type}`;
  alertEl.style.display = 'flex';
}
function clearAlert() {
  if (!alertEl) return;
  alertEl.style.display = 'none';
  alertEl.textContent = '';
}

// ── Toast ──────────────────────────────────
function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ── Register ───────────────────────────────
document.getElementById('register-form').addEventListener('submit', async e => {
  e.preventDefault();
  clearAlert();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;
  btn.innerHTML = '<span class="loader"></span>';

  const name     = document.getElementById('reg-name').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;

  try {
    const res  = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      showAlert(data.error || 'Registration failed.');
    } else {
      showToast('Account created! Please log in.', 'success');
      e.target.reset();
      // Switch to login tab
      tabs[0].click();
    }
  } catch {
    showAlert('Network error. Please try again.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create account';
  }
});

// ── Login ──────────────────────────────────
document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  clearAlert();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;
  btn.innerHTML = '<span class="loader"></span>';

  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const res  = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      const msg = data.locked
        ? 'Too many failed attempts. Account locked.'
        : `${data.error}${data.remaining != null ? ` (${data.remaining} attempts left)` : ''}`;
      showAlert(msg);
    } else {
      showToast(`Welcome back, ${data.username}!`, 'success');
      setTimeout(() => window.location.href = '/matches', 800);
    }
  } catch {
    showAlert('Network error. Please try again.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Log in';
  }
});
