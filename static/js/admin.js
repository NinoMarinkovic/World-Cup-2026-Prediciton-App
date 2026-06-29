/* ── Tab switching ── */
  function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach((b, i) => {
      b.classList.toggle('active', (i === 0 && tab === 'group') || (i === 1 && tab === 'knockout'));
    });
    document.getElementById('tab-group').classList.toggle('active', tab === 'group');
    document.getElementById('tab-knockout').classList.toggle('active', tab === 'knockout');
    if (tab === 'knockout') loadKoMatches();
  }

  /* ══════════════════════════════════════════
     GROUP STAGE
  ══════════════════════════════════════════ */
  async function loadMatches() {
    try {
      const res  = await fetch('/api/matches');
      const data = await res.json();
      renderGroupLists(data.matches || []);
    } catch {
      document.getElementById('pending-list').innerHTML = '<div class="empty">Failed to load matches.</div>';
    }
  }

  function renderGroupLists(matches) {
    const pending  = matches.filter(m => !m.finished);
    const finished = matches.filter(m =>  m.finished);

    document.getElementById('pending-list').innerHTML = pending.length
      ? pending.map(m => buildMatchRow(m, 'group')).join('')
      : '<div class="empty">No pending matches.</div>';

    document.getElementById('finished-list').innerHTML = finished.length
      ? finished.map(m => buildFinishedRow(m)).join('')
      : '<div class="empty">No finished matches yet.</div>';

    document.querySelectorAll('#tab-group .submit-btn').forEach(btn => {
      btn.addEventListener('click', () => submitGroupResult(btn));
    });
  }

  function buildMatchRow(m, tab) {
    const home = m.home_team || 'TBD';
    const away = m.away_team || 'TBD';
    const time = m.kickoff_time ? formatDate(m.kickoff_time) : '—';
    return `
      <div class="match-row">
        <div class="match-header">
          <div>
            <div class="match-teams">${home} vs ${away}</div>
            <div class="match-time">${time}</div>
          </div>
        </div>
        <div class="match-controls">
          <div class="score-group">
            <input class="score-input home-score" type="number" min="0" max="99" placeholder="0">
            <span class="sep">:</span>
            <input class="score-input away-score" type="number" min="0" max="99" placeholder="0">
          </div>
          <button class="btn-submit submit-btn" data-match-id="${m.id}">Submit</button>
        </div>
      </div>`;
  }

  function buildFinishedRow(m) {
    const home = m.home_team || 'TBD';
    const away = m.away_team || 'TBD';
    return `
      <div class="match-row is-finished">
        <div class="match-header no-controls">
          <div>
            <div class="match-teams">${home} vs ${away}</div>
            <div class="match-time">${m.kickoff_time ? formatDate(m.kickoff_time) : '—'}</div>
          </div>
          <div class="score-display">${m.home_score ?? '—'} : ${m.away_score ?? '—'}</div>
        </div>
      </div>`;
  }

  async function submitGroupResult(btn) {
    const row       = btn.closest('.match-row');
    const matchId   = parseInt(btn.dataset.matchId);
    const homeScore = parseInt(row.querySelector('.home-score').value);
    const awayScore = parseInt(row.querySelector('.away-score').value);

    if (isNaN(homeScore) || isNaN(awayScore)) {
      showToast('Please enter both scores.', 'error'); return;
    }

    btn.disabled = true; btn.textContent = '...';

    try {
      const res  = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: matchId, home_score: homeScore, away_score: awayScore })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Error submitting result.', 'error');
        btn.disabled = false; btn.textContent = 'Submit';
      } else {
        showToast(`Result saved: ${homeScore} : ${awayScore}`, 'success');
        await loadMatches();
      }
    } catch {
      showToast('Network error.', 'error');
      btn.disabled = false; btn.textContent = 'Submit';
    }
  }

  /* ══════════════════════════════════════════
     KNOCKOUT
  ══════════════════════════════════════════ */
  const ROUND_ORDER  = ['R32', 'R16', 'QF', 'SF', 'TP', 'F'];
  const ROUND_LABELS = {
    R32: 'Round of 32', R16: 'Round of 16',
    QF: 'Quarter-finals', SF: 'Semi-finals',
    TP: '3rd Place', F: 'Final'
  };

  async function loadKoMatches() {
    document.getElementById('ko-pending-list').innerHTML  = '<div class="loading">Loading...</div>';
    document.getElementById('ko-finished-list').innerHTML = '<div class="loading">Loading...</div>';
    try {
      const res  = await fetch('/api/knockout/matches');
      const data = await res.json();
      renderKoLists(data.matches || []);
    } catch {
      document.getElementById('ko-pending-list').innerHTML = '<div class="empty">Failed to load.</div>';
    }
  }

  function renderKoLists(matches) {
    const pending  = matches.filter(m => !m.finished);
    const finished = matches.filter(m =>  m.finished);

    // Pending
    if (!pending.length) {
      document.getElementById('ko-pending-list').innerHTML = '<div class="empty">No pending knockout matches.</div>';
    } else {
      const byRound = {};
      pending.forEach(m => { (byRound[m.round] = byRound[m.round] || []).push(m); });
      let html = '';
      ROUND_ORDER.forEach(r => {
        if (!byRound[r]) return;
        html += `<div class="round-header">${ROUND_LABELS[r]}</div>`;
        byRound[r].forEach(m => { html += buildKoRow(m); });
      });
      document.getElementById('ko-pending-list').innerHTML = html;
    }

    // Finished
    if (!finished.length) {
      document.getElementById('ko-finished-list').innerHTML = '<div class="empty">No finished knockout matches yet.</div>';
    } else {
      const byRound = {};
      finished.forEach(m => { (byRound[m.round] = byRound[m.round] || []).push(m); });
      let html = '';
      ROUND_ORDER.forEach(r => {
        if (!byRound[r]) return;
        html += `<div class="round-header">${ROUND_LABELS[r]}</div>`;
        byRound[r].forEach(m => { html += buildKoFinishedRow(m); });
      });
      document.getElementById('ko-finished-list').innerHTML = html;
    }

    document.querySelectorAll('.ko-submit-btn').forEach(btn => {
      btn.addEventListener('click', () => submitKoResult(btn));
    });
  }

  function buildKoRow(m) {
    const home = m.home_team || 'TBD';
    const away = m.away_team || 'TBD';
    const time = m.kickoff_time ? formatDate(m.kickoff_time) : '—';
    return `
      <div class="match-row">
        <div class="match-header">
          <div>
            <div class="match-teams">${home} vs ${away}</div>
            <div class="match-time">Slot ${m.slot ?? '—'} &middot; ${time}</div>
          </div>
        </div>
        <div class="match-controls">
          <div class="score-group">
            <input class="score-input ko-home-score" type="number" min="0" max="99" placeholder="0">
            <span class="sep">:</span>
            <input class="score-input ko-away-score" type="number" min="0" max="99" placeholder="0">
          </div>
          <select class="winner-select ko-winner">
            <option value="">Winner (if draw)</option>
            <option value="${home}">${home}</option>
            <option value="${away}">${away}</option>
          </select>
          <button class="btn-submit ko-submit-btn" data-match-id="${m.id}">Submit</button>
        </div>
      </div>`;
  }

  function buildKoFinishedRow(m) {
    const home = m.home_team || 'TBD';
    const away = m.away_team || 'TBD';
    return `
      <div class="match-row is-finished">
        <div class="match-header no-controls">
          <div>
            <div class="match-teams">${home} vs ${away}</div>
            <div class="match-time">Winner: <strong style="color:#D4AF37">${m.winner || '—'}</strong></div>
          </div>
          <div class="score-display">${m.home_score ?? '—'} : ${m.away_score ?? '—'}</div>
        </div>
      </div>`;
  }

  async function submitKoResult(btn) {
    const row       = btn.closest('.match-row');
    const matchId   = parseInt(btn.dataset.matchId);
    const homeScore = parseInt(row.querySelector('.ko-home-score').value);
    const awayScore = parseInt(row.querySelector('.ko-away-score').value);
    const winner    = row.querySelector('.ko-winner').value.trim();

    if (isNaN(homeScore) || isNaN(awayScore)) {
      showToast('Please enter both scores.', 'error'); return;
    }
    if (homeScore === awayScore && !winner) {
      showToast('Scores are equal — select a winner (penalties).', 'error'); return;
    }

    btn.disabled = true; btn.textContent = '...';

    try {
      const res  = await fetch('/api/knockout/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          knockout_match_id: matchId,
          home_score: homeScore,
          away_score: awayScore,
          winner: winner || null
        })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Error submitting result.', 'error');
        btn.disabled = false; btn.textContent = 'Submit';
      } else {
        showToast(`Result saved: ${homeScore} : ${awayScore}`, 'success');
        await loadKoMatches();
      }
    } catch {
      showToast('Network error.', 'error');
      btn.disabled = false; btn.textContent = 'Submit';
    }
  }

  /* ── Shared ── */
  function formatDate(dt) {
    return new Date(dt).toLocaleString('en-GB', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function showToast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/';
  }

  loadMatches();