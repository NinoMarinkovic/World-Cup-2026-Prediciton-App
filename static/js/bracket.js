'use strict';

// ── State ──────────────────────────────────────────────────────────────────
let allMatches = [];
let myPredictions = {};
let activeMatchId = null;
let selectedWinner = null;

const ROUND_ORDER = ['R16', 'QF', 'SF', 'F'];

// ── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadBracket();
});

async function loadBracket() {
  try {
    const [matchRes, predRes] = await Promise.all([
      fetch('/api/knockout/matches'),
      fetch('/api/knockout/predictions'),
    ]);

    if (!matchRes.ok) throw new Error('Nicht autorisiert');

    const matchData = await matchRes.json();
    const predData  = predRes.ok ? await predRes.json() : { predictions: [] };

    allMatches = matchData.matches || [];
    myPredictions = {};
    (predData.predictions || []).forEach(p => {
      myPredictions[p.knockout_match_id] = p;
    });

    render();
  } catch (err) {
    console.error(err);
    showEmpty();
  }
}

// ── Render ─────────────────────────────────────────────────────────────────
function render() {
  hide('bracket-loading');

  if (!allMatches.length) { showEmpty(); return; }

  show('bracket-wrap');

  ROUND_ORDER.forEach(round => {
    const roundEl   = document.getElementById(`round-${round}`);
    const matchesEl = document.getElementById(`matches-${round}`);
    if (!matchesEl) return;

    const roundMatches = allMatches
      .filter(m => m.round === round)
      .sort((a, b) => a.slot - b.slot);

    if (!roundMatches.length) {
      roundEl.style.display = 'none';
      return;
    }
    roundEl.style.display = '';
    matchesEl.innerHTML = '';
    roundMatches.forEach(m => matchesEl.appendChild(buildMatchCard(m)));
  });
}

function buildMatchCard(match) {
  const pred   = myPredictions[match.id];
  const isPast = match.kickoff_time && new Date() >= new Date(match.kickoff_time);
  const isFinished = match.finished;
  const canTip = match.home_team && match.away_team && !isFinished && !isPast;

  const card = document.createElement('div');
  card.className = `match-card${isFinished ? ' finished' : ''}${pred ? ' has-tip' : ''}`;

  const homeName = match.home_team || '?';
  const awayName = match.away_team || '?';

  let scoreBlock = '';
  if (isFinished) {
    const hs = match.home_score ?? '-';
    const as = match.away_score ?? '-';
    const pen = (match.home_penalties != null)
      ? `<span class="penalties">(${match.home_penalties} : ${match.away_penalties} i.E.)</span>`
      : '';
    scoreBlock = `<div class="match-result">${hs} : ${as}${pen}</div>`;
  }

  let tipBlock = '';
  if (pred) {
    const pts = isFinished ? `<span class="tip-pts">${pred.points} Pkt.</span>` : '';
    const winner = pred.pred_winner ? ` · Sieger: <b>${pred.pred_winner}</b>` : '';
    tipBlock = `<div class="tip-badge">Tipp: ${pred.pred_home} : ${pred.pred_away}${winner}${pts}</div>`;
  }

  let timeBlock = '';
  if (match.kickoff_time && !isFinished) {
    const d = new Date(match.kickoff_time);
    timeBlock = `<div class="match-time">${d.toLocaleDateString('de-AT', { day:'2-digit', month:'2-digit' })} · ${d.toLocaleTimeString('de-AT', { hour:'2-digit', minute:'2-digit' })} Uhr</div>`;
  }

  card.innerHTML = `
    <div class="match-teams">
      <span class="team home">${homeName}</span>
      <span class="vs">vs</span>
      <span class="team away">${awayName}</span>
    </div>
    ${timeBlock}
    ${scoreBlock}
    ${tipBlock}
    ${canTip ? `<button class="btn-tip" onclick="openModal(${match.id})">${pred ? 'Tipp ändern' : 'Tippen'}</button>` : ''}
    ${isPast && !isFinished ? '<div class="closed-badge">Tipp geschlossen</div>' : ''}
  `;
  return card;
}

// ── Modal ──────────────────────────────────────────────────────────────────
function openModal(matchId) {
  const match = allMatches.find(m => m.id === matchId);
  if (!match) return;

  activeMatchId  = matchId;
  selectedWinner = null;

  const pred = myPredictions[matchId];

  document.getElementById('modal-title').textContent =
    `${match.home_team} vs ${match.away_team}`;
  document.getElementById('modal-teams').textContent = roundLabel(match.round);
  document.getElementById('score-home-label').textContent = match.home_team;
  document.getElementById('score-away-label').textContent = match.away_team;
  document.getElementById('score-home').value = pred ? pred.pred_home : '';
  document.getElementById('score-away').value = pred ? pred.pred_away : '';

  // Winner buttons
  const wb = document.getElementById('winner-buttons');
  wb.innerHTML = '';
  [match.home_team, match.away_team].forEach(team => {
    const btn = document.createElement('button');
    btn.className = 'winner-btn';
    btn.textContent = team;
    if (pred && pred.pred_winner === team) {
      btn.classList.add('selected');
      selectedWinner = team;
    }
    btn.onclick = () => selectWinner(team, wb);
    wb.appendChild(btn);
  });

  // Score change: auto-show/hide winner select
  const homeInput = document.getElementById('score-home');
  const awayInput = document.getElementById('score-away');
  const updateWinner = () => {
    const h = parseInt(homeInput.value);
    const a = parseInt(awayInput.value);
    const wrap = document.getElementById('winner-wrap');
    if (!isNaN(h) && !isNaN(a) && h === a) {
      wrap.classList.remove('hidden');
    } else {
      wrap.classList.add('hidden');
      selectedWinner = null;
      wb.querySelectorAll('.winner-btn').forEach(b => b.classList.remove('selected'));
    }
  };
  homeInput.oninput = updateWinner;
  awayInput.oninput = updateWinner;
  updateWinner();

  clearError();
  show('tip-modal');
}

function selectWinner(team, container) {
  selectedWinner = team;
  container.querySelectorAll('.winner-btn').forEach(b => {
    b.classList.toggle('selected', b.textContent === team);
  });
}

function closeModal() {
  hide('tip-modal');
  activeMatchId = null;
}

async function submitTip() {
  const homeVal = parseInt(document.getElementById('score-home').value);
  const awayVal = parseInt(document.getElementById('score-away').value);

  if (isNaN(homeVal) || isNaN(awayVal) || homeVal < 0 || awayVal < 0) {
    showError('Bitte gültige Tore eingeben.');
    return;
  }
  if (homeVal === awayVal && !selectedWinner) {
    showError('Bei Gleichstand bitte einen Sieger wählen.');
    return;
  }

  const btn = document.getElementById('modal-submit');
  btn.disabled = true;
  btn.textContent = 'Speichern…';
  clearError();

  try {
    const res = await fetch('/api/knockout/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        knockout_match_id: activeMatchId,
        pred_home: homeVal,
        pred_away: awayVal,
        pred_winner: selectedWinner,
      }),
    });
    const data = await res.json();
    if (!res.ok) { showError(data.error || 'Fehler beim Speichern.'); return; }

    closeModal();
    await loadBracket();
  } catch {
    showError('Netzwerkfehler. Bitte erneut versuchen.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Tipp speichern';
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
function roundLabel(r) {
  return { R16: 'Achtelfinale', QF: 'Viertelfinale', SF: 'Halbfinale', F: 'Finale' }[r] || r;
}
function show(id)   { document.getElementById(id)?.classList.remove('hidden'); }
function hide(id)   { document.getElementById(id)?.classList.add('hidden'); }
function showEmpty(){ hide('bracket-loading'); show('bracket-empty'); }
function showError(msg) {
  const el = document.getElementById('modal-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}
function clearError() {
  const el = document.getElementById('modal-error');
  el.textContent = '';
  el.classList.add('hidden');
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/';
}
