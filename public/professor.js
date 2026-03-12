/* ═══════════════════════════════════════════════
   PAINEL DO PROFESSOR — Client Logic
   ═══════════════════════════════════════════════ */

const socket = io();

// Join as professor
socket.emit('join-as-professor');

const OP_LABELS = {
  addition: 'Soma',
  subtraction: 'Subtração',
  multiplication: 'Multiplicação',
  division: 'Divisão',
  hybrid: "Pai D'égua",
};

const STATUS_LABELS = {
  lobby: 'Aguardando',
  playing: 'Jogando',
  finished: 'Finalizada',
};

const STATUS_ICONS = {
  lobby: '⏳',
  playing: '🔵',
  finished: '🏆',
};

// ─── Dashboard Update ───
socket.on('dashboard-update', (data) => {
  renderMesas(data);
  updateStats(data);
});

function renderMesas(mesas) {
  const grid = document.getElementById('mesas-grid');
  grid.innerHTML = '';

  mesas.forEach(mesa => {
    const card = document.createElement('div');
    card.className = `mesa-card status-${mesa.status}`;

    const players = mesa.team1Players + mesa.team2Players;
    const hasPlayers = players > 0;

    let bodyHTML = '';

    // Players info
    bodyHTML += `
      <div class="mesa-info-row">
        <span class="mesa-info-label">Jogadores</span>
        <span class="mesa-info-value">${players}/2</span>
      </div>
    `;

    // Operation
    if (mesa.operationLabel) {
      bodyHTML += `
        <div class="mesa-info-row">
          <span class="mesa-info-label">Operação</span>
          <span class="mesa-info-value">${mesa.operationLabel}</span>
        </div>
      `;
    }

    // Scoreboard (if playing or finished)
    if (mesa.status === 'playing' || mesa.status === 'finished') {
      bodyHTML += `
        <div class="mesa-scoreboard">
          <span class="mesa-score-t1">${mesa.team1Score}</span>
          <span class="mesa-score-vs">×</span>
          <span class="mesa-score-t2">${mesa.team2Score}</span>
        </div>
      `;
    }

    // Winner
    if (mesa.status === 'finished' && mesa.winner) {
      bodyHTML += `
        <div class="mesa-winner">🏆 Time ${mesa.winner} venceu!</div>
      `;
    }

    card.innerHTML = `
      <div class="mesa-card-header">
        <span class="mesa-number">Mesa ${mesa.id}</span>
        <span class="mesa-status-badge">${STATUS_ICONS[mesa.status]} ${STATUS_LABELS[mesa.status]}</span>
      </div>
      <div class="mesa-body">
        ${bodyHTML}
      </div>
      <div class="mesa-card-footer">
        <button class="mesa-reset-btn" onclick="resetRoom(${mesa.id})">🔄 Reiniciar</button>
      </div>
    `;

    grid.appendChild(card);
  });
}

function updateStats(mesas) {
  let waiting = 0, playing = 0, finished = 0;
  mesas.forEach(m => {
    if (m.status === 'lobby') waiting++;
    else if (m.status === 'playing') playing++;
    else if (m.status === 'finished') finished++;
  });

  document.getElementById('stat-waiting').textContent = waiting;
  document.getElementById('stat-playing').textContent = playing;
  document.getElementById('stat-finished').textContent = finished;

  // Color the stats
  document.getElementById('stat-waiting').style.color = waiting > 0 ? '#a7a9be' : '#4a4a5a';
  document.getElementById('stat-playing').style.color = playing > 0 ? '#3b82f6' : '#4a4a5a';
  document.getElementById('stat-finished').style.color = finished > 0 ? '#22c55e' : '#4a4a5a';
}

// ─── Global Controls ───
function globalSetOperation(operation) {
  socket.emit('global-set-operation', operation);
}

function globalResetAll() {
  if (confirm('Tem certeza que deseja reiniciar TODAS as mesas?')) {
    socket.emit('global-reset-all');
  }
}

function resetRoom(roomId) {
  socket.emit('professor-reset-room', roomId);
}
