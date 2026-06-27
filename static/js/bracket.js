/* ══════════════════════════════════════════
   BRACKET.JS — Knockout Tournament Tree
   ══════════════════════════════════════════ */

const ROUNDS = [
  { key: 'R32', label: 'Round of 32' },
  { key: 'R16', label: 'Round of 16' },
  { key: 'QF',  label: 'Quarter-finals' },
  { key: 'SF',  label: 'Semi-finals' },
  { key: 'TP',  label: '3rd Place' },
  { key: 'F',   label: 'Final' },
];

const flagMap = {
  'Mexico': 'mx', 'South Africa': 'za', 'South Korea': 'kr', 'Czechia': 'cz',
  'Canada': 'ca', 'Bosnia & Herz.': 'ba', 'Qatar': 'qa', 'Switzerland': 'ch',
  'Brazil': 'br', 'Morocco': 'ma', 'Haiti': 'ht', 'Scotland': 'gb-sct',
  'USA': 'us', 'Paraguay': 'py', 'Australia': 'au', 'Turkey': 'tr',
  'Germany': 'de', 'Curacao': 'cw', 'Ivory Coast': 'ci', 'Ecuador': 'ec',
  'Netherlands': 'nl', 'Japan': 'jp', 'Peru': 'pe', 'Senegal': 'sn',
  'Belgium': 'be', 'Egypt': 'eg', 'Iran': 'ir', 'New Zealand': 'nz',
  'Spain': 'es', 'Cabo Verde': 'cv', 'Saudi Arabia': 'sa', 'Uruguay': 'uy',
  'Argentina': 'ar', 'Algeria': 'dz', 'Nigeria': 'ng', 'Honduras': 'hn',
  'France': 'fr', 'Norway': 'no', 'Congo DR': 'cd', 'Portugal': 'pt',
  'Venezuela': 've', 'Uzbekistan': 'uz', 'Colombia': 'co', 'England': 'gb-eng',
  'Croatia': 'hr', 'Ghana': 'gh', 'Panama': 'pa', 'Tunisia': 'tn',
  'Irak': 'iq', 'Austria': 'at', 'Jordan': 'jo', 'Sweden': 'se'
};

function esc(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function flagImg(team) {
  const code = flagMap[team];
  if (!code) return '';
  return `<img class="ko-team-flag" src="https://flagcdn.com/24x18/${code}.png" alt="">`;
}

let allMatches = [];
let myPredictions = {};
let currentRound = 'R32';

const roundSelect = document.getElementById('round-select');
const bracketTree = document.getElementById('bracket-tree');

(async function init() {
  await Promise.all([fetchMatches(), fetchMyPredictions()]);
  renderRound(currentRound);
})();

async function fetchMatches() {
  try {
    const res  = await fetch('/api/knockout/matches');
    const data = await res.json();
    allMatches = data.matches || [];
  } catch {
    allMatches = [];
  }
}

async function fetchMyPredictions() {
  try {
    const res  = await fetch('/api/knockout/predictions');
    const data = await res.json();
    (data.predictions || []).forEach(p => {
      myPredictions[p.knockout_match_id] = p;
    });
  } catch { /* not logged in or none yet */ }
}

roundSelect.addEventListener('change', () => {
  currentRound = roundSelect.value;
  renderRound(currentRound);
});

function renderRound(roundKey) {
  const matches = allMatches.filter(m => m.round === roundKey);

  if (matches.length === 0) {
    bracketTree.innerHTML = `
      <div class="bracket-empty">
        <div class="empty-icon">🏆</div>
        <p>This round hasn't been set yet.</p>
        <p>Check back once the previous round finishes.</p>
      </div>`;
    return;
  }

  matches.sort((a, b) => a.slot - b.slot);

  const cardsHtml = matches.map(m => buildKoCard(m)).join('');

  bracketTree.innerHTML = `
    <div class="bracket-column">
      ${cardsHtml}
    </div>`;

  bracketTree.querySelectorAll('.ko-card.is-predictable').forEach(card => {
    card.querySelector('.ko-submit-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      submitKoPrediction(card);
    });
  });

  bracketTree.querySelectorAll('.ko-pen-select button').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.closest('.ko-pen-select');
      group.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });
}

function buildKoCard(m) {
  const hasTeams  = m.home_team && m.away_team;
  const finished  = m.finished;
  const kickoff   = m.kickoff_time ? new Date(m.kickoff_time) : null;
  const now       = new Date();
  const locked    = kickoff && kickoff <= now && !finished;
  const predictable = hasTeams && !finished && !locked;

  const homeName = m.home_team || 'TBD';
  const awayName = m.away_team || 'TBD';

  let homeWinnerClass = '';
  let awayWinnerClass = '';
  if (finished) {
    const homeWon = (m.home_score > m.away_score) ||
                     (m.home_score === m.away_score && m.home_penalties > m.away_penalties);
    homeWinnerClass = homeWon ? 'is-winner' : '';
    awayWinnerClass = !homeWon ? 'is-winner' : '';
  }

  const homeScoreDisplay = finished ? m.home_score : '';
  const awayScoreDisplay = finished ? m.away_score : '';

  let meta = '';
  if (finished) {
    if (m.home_penalties !== null && m.home_penalties !== undefined) {
      meta = `<div class="ko-card-meta">Penalties: ${m.home_penalties}–${m.away_penalties}</div>`;
    }
  } else if (kickoff) {
    meta = `<div class="ko-card-meta">⏱ ${kickoff.toLocaleString('de-AT', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}</div>`;
  }

  const existing = myPredictions[m.id];
  let predictForm = '';
  if (predictable) {
    const prefHome = existing ? existing.pred_home : '';
    const prefAway = existing ? existing.pred_away : '';
    predictForm = `
      <div class="ko-predict-row">
        <div class="ko-predict-inputs">
          <input type="number" class="ko-pred-home" min="0" max="99" placeholder="0" value="${prefHome}">
          <span class="pred-separator">:</span>
          <input type="number" class="ko-pred-away" min="0" max="99" placeholder="0" value="${prefAway}">
        </div>
        <div class="ko-pen-note">If level after 90 min, who wins on penalties?</div>
        <div class="ko-pen-select">
          <button type="button" class="${existing && existing.pred_winner === m.home_team ? 'selected' : ''}" data-team="${esc(homeName)}">${esc(homeName)}</button>
          <button type="button" class="${existing && existing.pred_winner === m.away_team ? 'selected' : ''}" data-team="${esc(awayName)}">${esc(awayName)}</button>
        </div>
        <button class="btn btn-primary ko-submit-btn" data-match-id="${m.id}">
          ${existing ? '✓ Update tip' : 'Submit tip'}
        </button>
      </div>`;
  }

  return `
    <div class="ko-card ${!hasTeams ? 'is-empty' : ''} ${finished ? 'is-finished' : ''} ${predictable ? 'is-predictable' : ''}" data-id="${m.id}">
      <div class="ko-team-row ${homeWinnerClass}">
        <div class="ko-team-name ${!m.home_team ? 'tbd' : ''}">${flagImg(homeName)} ${esc(homeName)}</div>
        <div class="ko-team-score">${homeScoreDisplay}</div>
      </div>
      <div class="ko-team-row ${awayWinnerClass}">
        <div class="ko-team-name ${!m.away_team ? 'tbd' : ''}">${flagImg(awayName)} ${esc(awayName)}</div>
        <div class="ko-team-score">${awayScoreDisplay}</div>
      </div>
      ${meta}
      ${predictForm}
    </div>`;
}

async function submitKoPrediction(card) {
  const matchId   = parseInt(card.dataset.id);
  const predHome  = parseInt(card.querySelector('.ko-pred-home').value);
  const predAway  = parseInt(card.querySelector('.ko-pred-away').value);
  const selectedBtn = card.querySelector('.ko-pen-select button.selected');
  const predWinner  = selectedBtn ? selectedBtn.dataset.team : null;

  if (isNaN(predHome) || isNaN(predAway)) {
    showToast('Please fill in both score fields.', 'error');
    return;
  }
  if (predHome === predAway && !predWinner) {
    showToast('Score is level — pick a penalty winner.', 'error');
    return;
  }

  const btn = card.querySelector('.ko-submit-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="loader"></span>';

  try {
    const res = await fetch('/api/knockout/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        knockout_match_id: matchId,
        pred_home: predHome,
        pred_away: predAway,
        pred_winner: predHome === predAway ? predWinner : null
      })
    });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Could not save tip.', 'error');
    } else {
      showToast('Tip saved!', 'success');
      btn.textContent = '✓ Update tip';
    }
  } catch {
    showToast('Network error. Please try again.', 'error');
  } finally {
    btn.disabled = false;
    if (btn.innerHTML.includes('loader')) btn.textContent = 'Submit tip';
  }
}

function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// Logout
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/';
  });
}