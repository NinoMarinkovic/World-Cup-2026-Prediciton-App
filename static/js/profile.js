/* ══════════════════════════════════════════
   PROFILE.JS — User Stats
   ══════════════════════════════════════════ */

(async function init() {
  try {
    const [profileRes, statsRes, historyRes] = await Promise.all([
      fetch('/api/profile/'),
      fetch('/api/stats'),
      fetch('/api/pointshistory')
    ]);

    if (!profileRes.ok) {
      showError();
      return;
    }

    const profile = await profileRes.json();
    const stats   = statsRes.ok   ? await statsRes.json()   : null;
    const history = historyRes.ok ? await historyRes.json() : null;

    render(profile, stats, history);
  } catch {
    showError();
  }
})();

function render(d, s, h) {
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

  setBar('bar-exact',    d.exact_score_count,      total, 'bar-exact-count');
  setBar('bar-tendency', d.correct_tendency_count, total, 'bar-tendency-count');
  setBar('bar-miss',     missCount,                total, 'bar-miss-count');

  // Points history chart
  // Points history chart — accept different API shapes (history or predictions)
  const histArray = h && (h.history || h.predictions || h) ? (h.history || h.predictions || h) : null;
  if (histArray && Array.isArray(histArray) && histArray.length > 1) {
    renderChart(histArray);
  }

  // Extra stats
  if (s) {
    const favTeamEl   = document.getElementById('stat-fav-team');
    const bestRoundEl = document.getElementById('stat-best-round');
    if (favTeamEl)   favTeamEl.textContent   = s.most_predicted_team || '—';
    if (bestRoundEl) bestRoundEl.textContent = s.best_round          || '—';
  }

  // Hide loader
  document.getElementById('profile-loading').style.display = 'none';
  document.getElementById('profile-content').style.display = 'block';

  // No predictions yet
  if (d.total_predictions === 0) {
    document.getElementById('breakdown-section').style.display          = 'none';
    document.getElementById('chart-section').style.display              = 'none';
    document.getElementById('extra-stats-section').style.display        = 'none';
    document.getElementById('extra-stats-section-content').style.display = 'none';
    document.getElementById('profile-empty').style.display              = 'block';
  }
}

function renderChart(history) {
  const section = document.getElementById('chart-section');
  section.style.display = 'block';

  const labels = history.map((_, i) => {
    const h = history[i];
    return h.home_team && h.away_team ? `${h.home_team} vs ${h.away_team}` : `Match ${i + 1}`;
  });

  const data = history.map(h => h.cumulative_points);

  const ctx = document.getElementById('points-chart').getContext('2d');

  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Cumulative points',
        data,
        borderColor: '#D4AF37',
        backgroundColor: 'rgba(212,175,55,0.08)',
        borderWidth: 2,
        pointBackgroundColor: '#D4AF37',
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.3,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.raw} pts total`,
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: 'rgba(255,255,255,0.4)',
            maxRotation: 45,
            font: { size: 10 },
            callback: function(val, i) {
              const label = this.getLabelForValue(val);
              return label.length > 15 ? label.slice(0, 13) + '…' : label;
            }
          },
          grid: { color: 'rgba(255,255,255,0.05)' }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: 'rgba(255,255,255,0.4)',
            stepSize: 1,
          },
          grid: { color: 'rgba(255,255,255,0.05)' }
        }
      }
    }
  });
}

function setBar(barId, count, total, countId) {
  const pct = Math.round((count / total) * 100);
  const bar = document.getElementById(barId);
  if (bar) setTimeout(() => { bar.style.width = pct + '%'; }, 100);
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
