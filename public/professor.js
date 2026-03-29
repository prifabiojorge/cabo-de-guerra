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
  renderRanking(data);
});

function renderMesas(mesas) {
  const grid = document.getElementById('mesas-grid');
  grid.innerHTML = '';

  mesas.forEach(mesa => {
    const card = document.createElement('div');
    card.className = `mesa-card status-${mesa.status}`;

    const players = mesa.team1Players + mesa.team2Players;

    let bodyHTML = '';

    bodyHTML += `
      <div class="mesa-info-row">
        <span class="mesa-info-label">Jogadores</span>
        <span class="mesa-info-value">${players}/2</span>
      </div>
    `;

    if (mesa.operationLabel) {
      bodyHTML += `
        <div class="mesa-info-row">
          <span class="mesa-info-label">Operação</span>
          <span class="mesa-info-value">${mesa.operationLabel}</span>
        </div>
      `;
    }

    if (mesa.status === 'playing' || mesa.status === 'finished') {
      bodyHTML += `
        <div class="mesa-scoreboard">
          <span class="mesa-score-t1">${mesa.team1Score}</span>
          <span class="mesa-score-vs">×</span>
          <span class="mesa-score-t2">${mesa.team2Score}</span>
        </div>
      `;
    }

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

// ─── Ranking (por vitórias) ───
function renderRanking(mesas) {
  const list = document.getElementById('ranking-list');
  const players = [];

  mesas.forEach(mesa => {
    if (mesa.team1Name) {
      players.push({ name: mesa.team1Name, wins: mesa.team1Wins || 0, mesa: mesa.id });
    }
    if (mesa.team2Name) {
      players.push({ name: mesa.team2Name, wins: mesa.team2Wins || 0, mesa: mesa.id });
    }
  });

  if (players.length === 0) {
    list.innerHTML = '<p class="ranking-empty">Nenhum aluno jogou ainda...</p>';
    return;
  }

  players.sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name));

  list.innerHTML = players.map((p, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`;
    const isLeader = i === 0 ? ' ranking-leader' : '';
    const winsLabel = p.wins === 1 ? '1 vitória' : `${p.wins} vitórias`;
    return `
      <div class="ranking-item${isLeader}">
        <span class="ranking-pos">${medal}</span>
        <span class="ranking-name">${p.name}</span>
        <span class="ranking-meta">Mesa ${p.mesa}</span>
        <span class="ranking-score">${winsLabel}</span>
      </div>
    `;
  }).join('');
}

// ─── QR Code ───
let _qrInstance = null;

async function showQRCode() {
  try {
    const url = 'https://cabo-de-guerra.onrender.com';

    const container = document.getElementById('qr-canvas');
    const modal = document.getElementById('qr-modal');
    const urlText = document.getElementById('qr-url-text');

    container.innerHTML = '';
    _qrInstance = null;

    _qrInstance = new QRCode(container, {
      text: url,
      width: 260,
      height: 260,
      colorDark: '#0f0e17',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H,
    });

    urlText.textContent = url;
    modal.classList.add('active');
  } catch (err) {
    alert('Não foi possível gerar o QR Code: ' + err.message);
  }
}

function hideQRCode() {
  document.getElementById('qr-modal').classList.remove('active');
}

// ─── Report ───
const OP_LABELS_PT = {
  addition:       'Soma',
  subtraction:    'Subtracao',
  multiplication: 'Multiplicacao',
  division:       'Divisao',
  hybrid:         'Pai D\'egua',
  unknown:        'Desconhecida',
};

socket.on('session-report', (data) => {
  generatePDF(data);
});

function createReport() {
  if (!confirm('Criar o relatório encerrará a sessão e zerará TODAS as mesas.\nDeseja continuar?')) return;
  const btn = document.getElementById('btn-criar-relatorio');
  btn.disabled = true;
  btn.textContent = '⏳ Gerando...';
  socket.emit('professor-end-session');
  // Fallback: re-enable after 8s if server doesn't respond
  setTimeout(() => {
    btn.disabled = false;
    btn.textContent = '📄 Criar Relatório';
  }, 8000);
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('pdf-toast');
  if (!t) return;
  t.textContent = msg;
  t.className = `pdf-toast show ${type}`;
  setTimeout(() => { t.className = 'pdf-toast'; }, 4000);
}

function generatePDF(data) {
  const btn = document.getElementById('btn-criar-relatorio');
  const resetBtn = () => {
    if (btn) { btn.disabled = false; btn.textContent = '📄 Criar Relatório'; }
  };

  if (!window.jspdf || !window.jspdf.jsPDF) {
    showToast('Erro: jsPDF nao carregou. Verifique sua conexao.', 'error');
    resetBtn();
    return;
  }

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const W = 210;
    const margin = 14;
    let y = 0;

    // Cores (sem emojis — jsPDF nao suporta unicode emoji)
    const C_NAVY    = [15, 14, 23];
    const C_ORANGE  = [255, 137, 6];
    const C_SECTION = [26, 25, 50];
    const C_GREEN   = [34, 197, 94];
    const C_RED     = [239, 68, 68];
    const C_YELLOW  = [200, 150, 0];
    const C_EVEN    = [240, 240, 248];
    const C_ODD     = [255, 255, 255];
    const C_DARK    = [20, 20, 40];
    const C_MUTED   = [120, 120, 150];
    const C_LIGHT   = [150, 150, 180];

    function checkPage(needed) {
      if (y + (needed || 20) > 280) { doc.addPage(); y = 14; }
    }

    function sectionTitle(title) {
      checkPage(18);
      doc.setFillColor(...C_SECTION);
      doc.rect(margin, y, W - margin * 2, 8, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C_ORANGE);
      doc.text(title, margin + 3, y + 5.5);
      y += 11;
    }

    function tableRow(cols, colWidths, rowIdx, bold, textColor) {
      const rowH = 7;
      doc.setFillColor(...(rowIdx % 2 === 0 ? C_EVEN : C_ODD));
      doc.rect(margin, y, W - margin * 2, rowH, 'F');
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...(textColor || C_DARK));
      let x = margin + 2;
      cols.forEach((col, i) => {
        doc.text(String(col), x, y + 4.8, { maxWidth: colWidths[i] - 2 });
        x += colWidths[i];
      });
      y += rowH;
    }

    // ── Cabecalho ──
    doc.setFillColor(...C_NAVY);
    doc.rect(0, 0, W, 40, 'F');

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C_ORANGE);
    doc.text('OPERACAO PAI D\'EGUA: CABO DE GUERRA MATEMATICO', margin, 16);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 200, 220);
    doc.text('Relatorio de Desempenho da Turma', margin, 24);

    const startStr = new Date(data.sessionStart).toLocaleString('pt-BR');
    const endStr   = new Date(data.sessionEnd).toLocaleString('pt-BR');
    doc.setFontSize(8);
    doc.setTextColor(...C_LIGHT);
    doc.text('Inicio: ' + startStr + '   |   Termino: ' + endStr, margin, 31);
    doc.text('Total de partidas disputadas: ' + data.totalGames, margin, 37);
    doc.text('CISEB Celso Rodrigues / Santo Antonio do Taua - 2026 - Prof. Fabio Fabuloso', W - margin, 37, { align: 'right' });

    y = 48;

    // ── Montar lista de alunos ──
    const players = Object.entries(data.players || {}).map(([name, s]) => ({
      name,
      wins:    s.wins    || 0,
      losses:  s.losses  || 0,
      correct: s.correctAnswers || 0,
      wrong:   s.wrongAnswers   || 0,
      total:   (s.correctAnswers || 0) + (s.wrongAnswers || 0),
      rate:    ((s.correctAnswers || 0) + (s.wrongAnswers || 0)) > 0
        ? Math.round((s.correctAnswers / ((s.correctAnswers || 0) + (s.wrongAnswers || 0))) * 100)
        : 0,
    }));

    // 1. Ranking por vitorias
    sectionTitle('1. RANKING GERAL POR VITORIAS');
    const byWins = [...players].sort((a, b) => b.wins - a.wins || b.rate - a.rate);

    tableRow(['Pos.', 'Aluno', 'Vitorias', 'Derrotas', 'Acertos', 'Erros', 'Aproveit.'],
             [10, 58, 24, 24, 20, 18, 28], -1, true, C_SECTION);

    if (byWins.length === 0) {
      doc.setTextColor(...C_MUTED); doc.setFontSize(9);
      doc.text('Nenhum aluno registrado nesta sessao.', margin + 4, y + 5);
      y += 12;
    } else {
      byWins.forEach((p, i) => {
        checkPage(8);
        const pos = (i === 0 ? '1o' : i === 1 ? '2o' : i === 2 ? '3o' : (i + 1) + 'o');
        tableRow([pos, p.name, p.wins, p.losses, p.correct, p.wrong, p.rate + '%'],
                 [10, 58, 24, 24, 20, 18, 28], i);
      });
    }
    y += 8;

    // 2. Desempenho individual
    checkPage(35);
    sectionTitle('2. DESEMPENHO INDIVIDUAL (APROVEITAMENTO)');
    const byRate = [...players].sort((a, b) => b.rate - a.rate || b.correct - a.correct);

    tableRow(['Aluno', 'Respostas', 'Acertos', 'Erros', 'Taxa de Acerto'],
             [65, 28, 28, 28, 33], -1, true, C_SECTION);
    byRate.forEach((p, i) => {
      checkPage(8);
      const color = p.rate >= 70 ? C_GREEN : (p.rate >= 40 ? C_YELLOW : C_RED);
      tableRow([p.name, p.total, p.correct, p.wrong, p.rate + '%'],
               [65, 28, 28, 28, 33], i, false, color);
    });
    y += 8;

    // 3. Dificuldade por operacao
    checkPage(35);
    sectionTitle('3. DIFICULDADE POR OPERACAO');

    const ops = Object.entries(data.operations || {}).map(([op, s]) => ({
      name:      OP_LABELS_PT[op] || op,
      correct:   s.correct    || 0,
      wrong:     s.wrong      || 0,
      games:     s.gamesPlayed || 0,
      total:     (s.correct || 0) + (s.wrong || 0),
      errorRate: ((s.correct || 0) + (s.wrong || 0)) > 0
        ? Math.round((s.wrong / ((s.correct || 0) + (s.wrong || 0))) * 100) : 0,
    })).sort((a, b) => b.errorRate - a.errorRate);

    tableRow(['Operacao', 'Partidas', 'Respostas', 'Acertos', 'Erros', 'Tx.Erro', 'Nivel'],
             [42, 22, 25, 25, 20, 22, 26], -1, true, C_SECTION);

    if (ops.length === 0) {
      doc.setTextColor(...C_MUTED); doc.setFontSize(9);
      doc.text('Nenhuma operacao registrada.', margin + 4, y + 5);
      y += 12;
    } else {
      ops.forEach((op, i) => {
        checkPage(8);
        const nivel = op.errorRate >= 60 ? 'ALTA' : (op.errorRate >= 35 ? 'MEDIA' : 'BAIXA');
        const color = op.errorRate >= 60 ? C_RED  : (op.errorRate >= 35 ? C_YELLOW : C_GREEN);
        tableRow([op.name, op.games, op.total, op.correct, op.wrong, op.errorRate + '%', nivel],
                 [42, 22, 25, 25, 20, 22, 26], i, false, color);
      });
    }
    y += 8;

    // 4. Insights pedagogicos
    checkPage(40);
    sectionTitle('4. INSIGHTS PEDAGOGICOS');

    const insights = [];
    if (byWins.length > 0) {
      insights.push('DESTAQUE DA AULA: ' + byWins[0].name +
        ' com ' + byWins[0].wins + ' vitoria(s) e ' + byWins[0].rate + '% de aproveitamento.');
    }
    const hardest = ops.find(o => o.total > 0);
    if (hardest) {
      insights.push('OPERACAO MAIS DIFICIL: ' + hardest.name +
        ' (' + hardest.errorRate + '% de erros). Recomenda-se reforco neste conteudo.');
    }
    const easiest = [...ops].reverse().find(o => o.total > 0);
    if (easiest && easiest !== hardest) {
      insights.push('OPERACAO MAIS FACIL: ' + easiest.name +
        ' (' + easiest.errorRate + '% de erros).');
    }
    const struggling = byRate.filter(p => p.rate < 40 && p.total >= 3);
    if (struggling.length > 0) {
      insights.push('ATENCAO ESPECIAL (abaixo de 40%): ' + struggling.map(p => p.name).join(', ') + '.');
    }
    const excellent = byRate.filter(p => p.rate >= 80 && p.total >= 3);
    if (excellent.length > 0) {
      insights.push('EXCELENTE DESEMPENHO (acima de 80%): ' + excellent.map(p => p.name).join(', ') + '.');
    }
    if (data.totalGames === 0) {
      insights.push('Nenhuma partida foi completada nesta sessao.');
    }
    if (insights.length === 0) {
      insights.push('Dados insuficientes para gerar insights automaticos.');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    insights.forEach((ins, i) => {
      checkPage(12);
      const bgC = i % 2 === 0 ? [245, 245, 252] : [255, 255, 255];
      const lines = doc.splitTextToSize(ins, W - margin * 2 - 6);
      const rowH = lines.length * 5.5 + 5;
      doc.setFillColor(...bgC);
      doc.rect(margin, y, W - margin * 2, rowH, 'F');
      doc.setTextColor(...C_DARK);
      doc.text(lines, margin + 3, y + 5);
      y += rowH + 2;
    });

    // Footer em todas as paginas
    const pageCount = doc.getNumberOfPages();
    for (let pn = 1; pn <= pageCount; pn++) {
      doc.setPage(pn);
      const footerY = 290;
      doc.setFillColor(...C_NAVY);
      doc.rect(0, footerY - 4, W, 12, 'F');
      doc.setFontSize(7.5);
      doc.setTextColor(...C_LIGHT);
      doc.text('Operacao Pai d\'egua: cabo de guerra matematico - Prof. Fabio Fabuloso - CISEB 2026', margin, footerY + 2);
      doc.text('Pagina ' + pn + ' de ' + pageCount, W - margin, footerY + 2, { align: 'right' });
    }

    // Download
    const dateStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    doc.save('relatorio-operacao-pai-degua-' + dateStr + '.pdf');

    showToast('PDF gerado! Verifique a pasta Downloads do seu navegador.', 'success');

  } catch (err) {
    console.error('[PDF] Erro ao gerar:', err);
    showToast('Erro ao gerar PDF: ' + err.message, 'error');
  } finally {
    resetBtn();
  }
}
