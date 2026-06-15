/* ══════════════════════════════════════════
   LEADERBOARD.JS
   ══════════════════════════════════════════ */

const podiumEl  = document.getElementById('podium');
const tableBody = document.getElementById('lb-body');
const currentUsername = document.body.dataset.username || '';

// ── Init ──────────────────────────────────
(async function init() {
  try {
    const res  = await fetch('/api/leaderboard');
    const data = await res.json();
    render(data.leaderboard || []);
  } catch {
    tableBody.innerHTML = `<tr><td colspan="3" class="lb-empty">Error loading.</td></tr>`;
  }
})();

// ── Render ────────────────────────────────
function render(lb) {
  if (lb.length === 0) {
    podiumEl.innerHTML = '';
    tableBody.innerHTML = `<tr><td colspan="3" class="lb-empty">No points awarded yet.</td></tr>`;
    return;
  }

  renderPodium(lb.slice(0, 3));
  renderTable(lb);
}

// ── Podium ─────────────────────────────────
const PLACE_CONFIG = [
  { cls: 'place-2', label: '2' },
  { cls: 'place-1', label: '1' },
  { cls: 'place-3', label: '3' },
];
// Order: 2nd, 1st, 3rd for visual podium layout
const PODIUM_ORDER = [1, 0, 2];

function renderPodium(top) {
  const crown = '👑';
  const avatars = ['⚽', '🏆', '🥇', '🎯', '🔮', '💥', '🌟'];

  const html = PODIUM_ORDER.map(i => {
    const p = top[i];
    if (!p) return '<div class="podium-place"></div>';
    const cfg  = PLACE_CONFIG[i];
    const rank = i + 1;
    return `
      <div class="podium-place ${cfg.cls}">
        <div class="podium-avatar">
          ${rank === 1 ? `<span class="podium-crown">${crown}</span>` : ''}
          ${avatars[i % avatars.length]}
        </div>
        <div class="podium-name">${esc(p.username)}</div>
        <div class="podium-pts">${p.total_points}<small> pts</small></div>
        <div class="podium-block"><span class="rank-num">${rank}</span></div>
      </div>`;
  }).join('');

  podiumEl.innerHTML = html;
}

// ── Table ─────────────────────────────────
function renderTable(lb) {
  tableBody.innerHTML = lb.map((p, i) => {
    const rank     = i + 1;
    const isYou    = p.username === currentUsername;
    const rankCls  = rank <= 3 ? `top-${rank}` : '';
    const initials = p.username.slice(0, 2).toUpperCase();

    return `
      <tr class="${isYou ? 'is-you' : ''}">
        <td><div class="rank-cell ${rankCls}">${rank}</div></td>
        <td>
          <div class="player-cell">
            <div class="player-avatar">${initials}</div>
            <span class="player-name">${esc(p.username)}${isYou ? '<span class="you-badge">Du</span>' : ''}</span>
          </div>
        </td>
        <td><div class="points-cell">${p.total_points}<small> pts</small></div></td>
      </tr>`;
  }).join('');
}

// ── Logout ────────────────────────────────
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/';
  });
}

// ── Util ──────────────────────────────────
function esc(str) {
  return str.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
