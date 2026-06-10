/* ══════════════════════════════════════════
   MATCHES.JS — Spiele & Tipps
   ══════════════════════════════════════════ */

const flagMap = {
  'Mexico': '🇲🇽',
  'South Africa': '🇿🇦',
  'South Korea': '🇰🇷',
  'Czechia': '🇨🇿',
  'Canada': '🇨🇦',
  'Bosnia & Herz.': '🇧🇦',
  'Qatar': '🇶🇦',
  'Switzerland': '🇨🇭',
  'Brazil': '🇧🇷',
  'Morocco': '🇲🇦',
  'Haiti': '🇭🇹',
  'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'USA': '🇺🇸',
  'Paraguay': '🇵🇾',
  'Australia': '🇦🇺',
  'Turkey': '🇹🇷',
  'Germany': '🇩🇪',
  'Curacao': '🇨🇼',
  'Ivory Coast': '🇨🇮',
  'Ecuador': '🇪🇨',
  'Netherlands': '🇳🇱',
  'Japan': '🇯🇵',
  'Peru': '🇵🇪',
  'Senegal': '🇸🇳',
  'Belgium': '🇧🇪',
  'Egypt': '🇪🇬',
  'Iran': '🇮🇷',
  'New Zealand': '🇳🇿',
  'Spain': '🇪🇸',
  'Cabo Verde': '🇨🇻',
  'Saudi Arabia': '🇸🇦',
  'Uruguay': '🇺🇾',
  'Argentina': '🇦🇷',
  'Algeria': '🇩🇿',
  'Nigeria': '🇳🇬',
  'Honduras': '🇭🇳',
  'France': '🇫🇷',
  'Norway': '🇳🇴',
  'Congo DR': '🇨🇩',
  'Portugal': '🇵🇹',
  'Venezuela': '🇻🇪',
  'Uzbekistan': '🇺🇿',
  'Colombia': '🇨🇴',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Croatia': '🇭🇷',
  'Ghana': '🇬🇭',
  'Panama': '🇵🇦',
};

function getFlag(team) {
  return flagMap[team] || '🏳️';
}

const grid       = document.getElementById('matches-grid');
const filterBtns = document.querySelectorAll('.filter-btn');
let allMatches   = [];
let currentUser  = null;

// ── Init ──────────────────────────────────
(async function init() {
  await Promise.all([fetchUser(), fetchMatches()]);
  renderMatches('open');
})();

// ── Fetch current user ────────────────────
async function fetchUser() {
  try {
    const res = await fetch('/api/me');
    if (res.ok) currentUser = await res.json();
  } catch { /* not logged in */ }
}

// ── Fetch matches ─────────────────────────
async function fetchMatches() {
  showSkeletons();
  try {
    const res  = await fetch('/api/matches');
    const data = await res.json();
    allMatches = data.matches || [];
  } catch {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>Could not load matches. Please refresh.</p></div>`;
  }
}

// ── Filter buttons ────────────────────────
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderMatches(btn.dataset.filter);
  });
});

// ── Render ────────────────────────────────
function renderMatches(filter) {
  const now = new Date();
  let list = allMatches;

  if (filter === 'open')     list = allMatches.filter(m => !m.finished && new Date(m.kickoff_time) > now);
  if (filter === 'live')     list = allMatches.filter(m => !m.finished && new Date(m.kickoff_time) <= now);
  if (filter === 'finished') list = allMatches.filter(m => m.finished);

  if (list.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>No matches in this category.</p></div>`;
    return;
  }

  grid.innerHTML = list.map(m => buildCard(m, now)).join('');

  grid.querySelectorAll('.predict-btn').forEach(btn => {
    btn.addEventListener('click', () => submitPrediction(btn));
  });
}

// ── Build card HTML ───────────────────────
function buildCard(m, now) {
  const kickoff  = new Date(m.kickoff_time);
  const locked   = kickoff <= now && !m.finished;
  const finished = m.finished;

  const kickoffStr = kickoff.toLocaleString('de-AT', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });

  let badge = '';
  if (finished)    badge = '<span class="badge badge-finished">Abgeschlossen</span>';
  else if (locked) badge = '<span class="badge badge-locked">Gesperrt</span>';
  else             badge = '<span class="badge badge-open">Tipp offen</span>';

  let centerBlock = '';
  if (finished) {
    centerBlock = `<div class="vs-block"><div class="result-score">${m.home_score} : ${m.away_score}</div></div>`;
  } else {
    centerBlock = `<div class="vs-block"><div class="vs-text">VS</div></div>`;
  }

  let inputRow = '';
  if (!finished && !locked) {
    inputRow = `
      <div class="prediction-row">
        <input type="number" class="pred-home" min="0" max="99" placeholder="0" value="">
        <div class="pred-separator">:</div>
        <input type="number" class="pred-away" min="0" max="99" placeholder="0" value="">
      </div>`;
  }

  return `
    <div class="match-card ${finished ? 'is-finished' : ''} ${locked ? 'is-locked' : ''}" data-id="${m.id}">
      <div class="card-top">
        <span class="kickoff">⏱ ${kickoffStr}</span>
        ${badge}
      </div>
      <div class="card-body">
        <div class="teams">
          <div class="team">
            <div class="team-flag">${getFlag(m.home_team)}</div>
            <div class="team-name">${m.home_team}</div>
          </div>
          ${centerBlock}
          <div class="team">
            <div class="team-flag">${getFlag(m.away_team)}</div>
            <div class="team-name">${m.away_team}</div>
          </div>
        </div>
        ${inputRow}
      </div>
      ${!finished && !locked ? `
      <div class="card-footer">
        <button class="btn btn-primary predict-btn" data-match-id="${m.id}">Tipp abgeben</button>
      </div>` : ''}
    </div>`;
}

// ── Submit prediction ─────────────────────
async function submitPrediction(btn) {
  const card     = btn.closest('.match-card');
  const matchId  = parseInt(btn.dataset.matchId);
  const predHome = parseInt(card.querySelector('.pred-home').value);
  const predAway = parseInt(card.querySelector('.pred-away').value);

  if (isNaN(predHome) || isNaN(predAway)) {
    showToast('Bitte beide Felder ausfüllen.', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="loader"></span>';

  try {
    const res  = await fetch('/api/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match_id: matchId, pred_home: predHome, pred_away: predAway })
    });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Fehler beim Speichern.', 'error');
      btn.disabled = false;
      btn.textContent = 'Tipp abgeben';
    } else {
      showToast(`Tipp gespeichert: ${predHome} : ${predAway}`, 'success');
      btn.textContent = '✓ Gespeichert';
      btn.classList.add('btn-ghost');
      btn.classList.remove('btn-primary');
    }
  } catch {
    showToast('Netzwerkfehler. Bitte erneut versuchen.', 'error');
    btn.disabled = false;
    btn.textContent = 'Tipp abgeben';
  }
}

// ── Skeletons ─────────────────────────────
function showSkeletons() {
  grid.innerHTML = Array(6).fill('<div class="skeleton-card"></div>').join('');
}

// ── Toast ─────────────────────────────────
function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ── Logout ────────────────────────────────
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/';
  });
}