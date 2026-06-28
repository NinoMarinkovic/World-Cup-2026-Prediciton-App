/* ══════════════════════════════════════════
   BRACKET.JS — Full Tournament Tree (mirrored)
   ══════════════════════════════════════════ */

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

const bracketRoot = document.getElementById('bracket-tree');

(async function init() {
  await Promise.all([fetchMatches(), fetchMyPredictions()]);
  render();
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

function byRound(roundKey) {
  return allMatches.filter(m => m.round === roundKey).sort((a, b) => a.slot - b.slot);
}

function render() {
  const r32 = byRound('R32');

  if (r32.length === 0) {
    bracketRoot.innerHTML = `
      <div class="bracket-empty">
        <div class="empty-icon">🏆</div>
        <p>The knockout stage hasn't been set yet.</p>
        <p>Check back once the group stage finishes.</p>
      </div>`;
    return;
  }

  const r16 = byRound('R16');
  const qf  = byRound('QF');
  const sf  = byRound('SF');
  const f   = byRound('F');
  const tp  = byRound('TP');

  // Split R32, R16, QF, SF into left/right halves
  const leftR32  = r32.slice(0, 8),  rightR32 = r32.slice(8, 16);
  const leftR16  = r16.slice(0, 4),  rightR16 = r16.slice(4, 8);
  const leftQF   = qf.slice(0, 2),   rightQF  = qf.slice(2, 4);
  const leftSF   = sf.slice(0, 1),   rightSF  = sf.slice(1, 2);

  const html = `
    <div class="full-bracket">

      <div class="bracket-side side-left">
        ${buildColumn('Round of 32', leftR32)}
        ${buildColumn('Round of 16', padTo(leftR16, 4))}
        ${buildColumn('Quarter-finals', padTo(leftQF, 2))}
        ${buildColumn('Semi-final', padTo(leftSF, 1))}
      </div>

      <div class="bracket-center">
        <div class="final-block">
          <div class="bracket-col-label">Final</div>
          ${f.length ? buildCard(f[0], true) : buildEmptyCard()}
          ${buildChampionBox(f[0])}
        </div>
        <div class="center-connector"></div>
        <div class="third-place-block">
          <div class="bracket-col-label">3rd Place</div>
          ${tp.length ? buildCard(tp[0]) : buildEmptyCard()}
        </div>
      </div>

      <div class="bracket-side side-right">
        ${buildColumn('Round of 32', rightR32)}
        ${buildColumn('Round of 16', padTo(rightR16, 4))}
        ${buildColumn('Quarter-finals', padTo(rightQF, 2))}
        ${buildColumn('Semi-final', padTo(rightSF, 1))}
      </div>

    </div>`;

  bracketRoot.innerHTML = html;
  bindEvents();
}

function padTo(arr, n) {
  const out = arr.slice();
  while (out.length < n) out.push(null);
  return out;
}

function buildColumn(label, matches) {
  const pairs = [];
  for (let i = 0; i < matches.length; i += 2) {
    const pairItems = matches.slice(i, i + 2);
    pairs.push(`
      <div class="bracket-pair">
        ${pairItems.map(m => m ? buildCard(m) : buildEmptyCard()).join('')}
      </div>`);
  }
  return `
    <div class="bracket-col">
      <div class="bracket-col-label">${label}</div>
      ${pairs.join('')}
    </div>`;
}

function buildEmptyCard() {
  return `
    <div class="ko-card is-empty">
      <div class="ko-team-row"><div class="ko-team-name tbd">TBD</div><div class="ko-team-score"></div></div>
      <div class="ko-team-row"><div class="ko-team-name tbd">TBD</div><div class="ko-team-score"></div></div>
    </div>`;
}

function buildCard(m, isFinal = false) {
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
      meta = `<div class="ko-card-meta">Pens: ${m.home_penalties}–${m.away_penalties}</div>`;
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
        <div class="ko-pen-note">If level, who wins on penalties?</div>
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
    <div class="ko-card ${!hasTeams ? 'is-empty' : ''} ${finished ? 'is-finished' : ''} ${predictable ? 'is-predictable' : ''} ${isFinal ? 'final-card' : ''}" data-id="${m.id}">
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

function buildChampionBox(finalMatch) {
  if (!finalMatch || !finalMatch.finished) return '';
  const homeWon = (finalMatch.home_score > finalMatch.away_score) ||
                   (finalMatch.home_score === finalMatch.away_score && finalMatch.home_penalties > finalMatch.away_penalties);
  const champion = homeWon ? finalMatch.home_team : finalMatch.away_team;
  return `
    <div class="champion-box">
      <div class="champion-trophy">🏆</div>
      <div class="champion-name">${esc(champion)}</div>
    </div>`;
}

function bindEvents() {
  bracketRoot.querySelectorAll('.ko-submit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      submitKoPrediction(btn.closest('.ko-card'));
    });
  });

  bracketRoot.querySelectorAll('.ko-pen-select button').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.closest('.ko-pen-select');
      group.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });
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