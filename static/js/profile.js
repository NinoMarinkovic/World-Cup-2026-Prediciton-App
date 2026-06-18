/* ══════════════════════════════════════════
   PROFILE.JS — User Stats
   ══════════════════════════════════════════ */

(async function init() {
  try {
    const [profileRes, statsRes] = await Promise.all([
      fetch('/api/profile/'),
      fetch('/api/stats')
    ]);

    if (!profileRes.ok) {
      showError();
      return;
    }

    const profile = await profileRes.json();
    const stats   = statsRes.ok ? await statsRes.json() : null;

    render(profile, stats);
  } catch {
    showError();
  }
})();

function render(d, s) {
  // Header
  document.getElementById('profile-initials').textContent = d.username.slice(0, 2).toUpperCase();
  document.getElementById('profile-name').textContent = d.username;

  // Stats
  document.getElementById('stat-points').textContent      = d.total_points;
  document.getElementById('stat-predictions').textContent = d.total_predictions;
  document.getElementById('stat-exact').textContent       = d.exact_score_count;
  document.getElementById('stat-accuracy').textContent    = d.accuracy;

  // Breakdown bars
  const total = d.total_predictions || 1;
  const missCount = d.total_predictions - d.exact_score_count - d.correct_tendency_count;

  setBar('bar-exact',    d.exact_score_count,        total, 'bar-exact-count');
  setBar('bar-tendency', d.correct_tendency_count,   total, 'bar-tendency-count');
  setBar('bar-miss',     missCount,                  total, 'bar-miss-count');

  // Extra stats
  if (s) {
    const favTeamEl = document.getElementById('stat-fav-team');
    const bestRoundEl = document.getElementById('stat-best-round');
    if (favTeamEl) favTeamEl.textContent = s.most_predicted_team || '—';
    if (bestRoundEl) bestRoundEl.textContent = s.best_round || '—';
  }

  // Hide loader
  document.getElementById('profile-loading').style.display = 'none';
  document.getElementById('profile-content').style.display = 'block';

  // No predictions yet
  if (d.total_predictions === 0) {
    document.getElementById('breakdown-section').style.display = 'none';
    document.getElementById('extra-stats-section').style.display = 'none';
    document.getElementById('extra-stats-section-content').style.display = 'none';
    document.getElementById('profile-empty').style.display = 'block';
  }
}

function setBar(barId, count, total, countId) {
  const pct = Math.round((count / total) * 100);
  const bar = document.getElementById(barId);
  if (bar) {
    setTimeout(() => { bar.style.width = pct + '%'; }, 100);
  }
  const countEl = document.getElementById(countId);
  if (countEl) countEl.textContent = count;
}

function showError() {
  document.getElementById('profile-loading').style.display = 'none';
  document.getElementById('profile-content').innerHTML = `
    <div class="profile-empty">
      <div class="empty-icon">⚠️</div>
      <p>Could not load profile. Please refresh.</p>
    </div>`;
  document.getElementById('profile-content').style.display = 'block';
}

// Logout
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/';
  });
}
