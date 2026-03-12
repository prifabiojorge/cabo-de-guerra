/* ═══════════════════════════════════════════════
   CABO DE GUERRA: MATEMÁTICA — Client Logic
   ═══════════════════════════════════════════════ */

const socket = io();

// ─── State ───
let myRoom = null;
let myTeam = null;
let currentAnswer = '';
let pointsToWin = 6;
let canSubmit = true;

// ─── DOM References ───
const screens = {
    roomSelect: document.getElementById('screen-room-select'),
    lobby: document.getElementById('screen-lobby'),
    game: document.getElementById('screen-game'),
    result: document.getElementById('screen-result'),
};

const dom = {
    // Room Select
    roomGrid: document.getElementById('room-grid'),

    // Lobby
    roomBadge: document.getElementById('room-badge'),
    btnTeam1: document.getElementById('btn-team1'),
    btnTeam2: document.getElementById('btn-team2'),
    team1Status: document.getElementById('team1-status'),
    team2Status: document.getElementById('team2-status'),
    opStatus: document.getElementById('op-status'),

    // Game
    scoreT1: document.getElementById('score-t1'),
    scoreT2: document.getElementById('score-t2'),
    pointsToWinLabel: document.getElementById('points-to-win'),
    operandA: document.getElementById('operand-a'),
    operandB: document.getElementById('operand-b'),
    operator: document.getElementById('operator'),
    answerDisplay: document.getElementById('answer-display'),
    feedback: document.getElementById('feedback'),
    ropeIndicator: document.getElementById('rope-indicator'),
    charLeft: document.getElementById('char-left'),
    charRight: document.getElementById('char-right'),

    // Result
    resultIcon: document.getElementById('result-icon'),
    resultTitle: document.getElementById('result-title'),
    resultMessage: document.getElementById('result-message'),
    finalScoreT1: document.getElementById('final-score-t1'),
    finalScoreT2: document.getElementById('final-score-t2'),
    confettiContainer: document.getElementById('confetti-container'),
};

// ─── Screen Switching ───
function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
}

// ─── Operation Labels ───
const OP_LABELS = {
  addition: 'Soma (+)',
  subtraction: 'Subtração (−)',
  multiplication: 'Multiplicação (×)',
  division: 'Divisão (÷)',
  hybrid: "Modo Pai D'égua (🔀)",
};

// ═══ ROOM SELECT ═══

socket.on('rooms-list', (roomsList) => {
    dom.roomGrid.innerHTML = '';
    roomsList.forEach(room => {
        const btn = document.createElement('button');
        btn.className = 'room-btn';

        let statusText = 'Livre';
        if (room.players === 1) {
            btn.classList.add('has-1');
            statusText = '1/2 jogadores';
        } else if (room.players >= 2) {
            btn.classList.add('full');
            statusText = room.status === 'playing' ? 'Jogando' : 'Lotada';
        }

        btn.innerHTML = `
            <span class="room-btn-number">${room.id}</span>
            <span class="room-btn-status">${statusText}</span>
        `;
        btn.onclick = () => joinRoom(room.id);
        dom.roomGrid.appendChild(btn);
    });
});

function joinRoom(roomId) {
    myRoom = roomId;
    socket.emit('join-room', roomId);
    dom.roomBadge.textContent = `Mesa ${roomId}`;
    showScreen('lobby');
}

socket.on('room-full', (roomId) => {
    alert(`A Mesa ${roomId} já está cheia! Escolha outra.`);
    myRoom = null;
    showScreen('roomSelect');
});

// ═══ LOBBY ═══

function selectOperation(operation) {
    socket.emit('select-operation', operation);
}

function joinTeam(teamId) {
    socket.emit('join-team', teamId);
    myTeam = teamId;

    if (teamId === 1) {
        dom.btnTeam1.classList.add('joined');
        dom.btnTeam2.classList.add('taken');
    } else {
        dom.btnTeam2.classList.add('joined');
        dom.btnTeam1.classList.add('taken');
    }
}

socket.on('lobby-state', (data) => {
    dom.team1Status.textContent = data.team1Ready ? '✅ Pronto!' : 'Aguardando...';
    dom.team2Status.textContent = data.team2Ready ? '✅ Pronto!' : 'Aguardando...';

    if (data.team1Ready) dom.btnTeam1.classList.add('ready');
    else dom.btnTeam1.classList.remove('ready');

    if (data.team2Ready) dom.btnTeam2.classList.add('ready');
    else dom.btnTeam2.classList.remove('ready');

    // Update operation selection UI
    document.querySelectorAll('.op-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.op === data.operation);
    });
    if (data.operation) {
        dom.opStatus.textContent = `✅ ${OP_LABELS[data.operation]}`;
        dom.opStatus.classList.add('chosen');
    } else {
        dom.opStatus.textContent = 'Nenhuma operação selecionada';
        dom.opStatus.classList.remove('chosen');
    }
});

socket.on('team-taken', (teamId) => {
    alert(`O Time ${teamId} já está ocupado! Escolha o outro time.`);
    myTeam = null;
    dom.btnTeam1.classList.remove('joined', 'taken');
    dom.btnTeam2.classList.remove('joined', 'taken');
});

// ═══ GAME START ═══
socket.on('game-start', (data) => {
    myTeam = data.teamId;
    pointsToWin = data.pointsToWin;

    document.body.className = `team-${myTeam}`;

    dom.pointsToWinLabel.textContent = `/ ${pointsToWin}`;
    dom.scoreT1.textContent = '0';
    dom.scoreT2.textContent = '0';

    setProblem(data.problem);
    updateRopePosition(0);
    showScreen('game');
});

// ═══ PROBLEM DISPLAY ═══
function setProblem(problem) {
    dom.operandA.textContent = problem.a;
    dom.operandB.textContent = problem.b;
    if (problem.symbol) dom.operator.textContent = problem.symbol;
    currentAnswer = '';
    dom.answerDisplay.textContent = '\u00A0';
    canSubmit = true;
}

// ═══ NUMPAD ═══
function pressNumber(num) {
    if (!canSubmit) return;
    if (currentAnswer.length >= 3) return;
    currentAnswer += num.toString();
    dom.answerDisplay.textContent = currentAnswer;
}

function clearAnswer() {
    if (!canSubmit) return;
    if (currentAnswer.length > 0) {
        currentAnswer = currentAnswer.slice(0, -1);
        dom.answerDisplay.textContent = currentAnswer || '\u00A0';
    }
}

function submitAnswer() {
    if (!canSubmit || currentAnswer === '') return;
    canSubmit = false;
    socket.emit('submit-answer', parseInt(currentAnswer));
}

// Keyboard support
document.addEventListener('keydown', (e) => {
    if (screens.game.classList.contains('active')) {
        if (e.key >= '0' && e.key <= '9') {
            pressNumber(parseInt(e.key));
        } else if (e.key === 'Backspace') {
            clearAnswer();
        } else if (e.key === 'Enter') {
            submitAnswer();
        }
    }
});

// ═══ ANSWER RESULT ═══
socket.on('answer-result', (data) => {
    const feedbackEl = dom.feedback;

    if (data.correct) {
        feedbackEl.textContent = '✅ Correto!';
        feedbackEl.className = 'feedback correct';
    } else {
        feedbackEl.textContent = '❌ Errado!';
        feedbackEl.className = 'feedback wrong';
        document.querySelector('.problem-area').classList.add('shake');
        setTimeout(() => {
            document.querySelector('.problem-area').classList.remove('shake');
        }, 400);
    }

    setTimeout(() => {
        feedbackEl.classList.add('hidden');
    }, 1200);

    setProblem(data.newProblem);
});

// ═══ ROPE UPDATE ═══
socket.on('rope-update', (data) => {
    updateRopePosition(data.ropePosition);
    dom.scoreT1.textContent = data.team1Score;
    dom.scoreT2.textContent = data.team2Score;
});

function updateRopePosition(position) {
    const maxDisplacement = pointsToWin;
    const percent = 50 + (position / maxDisplacement) * 40;
    dom.ropeIndicator.style.left = `${percent}%`;

    const pullStrength = Math.abs(position) * 2;
    if (position < 0) {
        dom.charLeft.style.transform = `translateX(${-pullStrength}px)`;
        dom.charRight.style.transform = `translateX(${-pullStrength}px)`;
    } else if (position > 0) {
        dom.charLeft.style.transform = `translateX(${pullStrength}px)`;
        dom.charRight.style.transform = `translateX(${pullStrength}px)`;
    } else {
        dom.charLeft.style.transform = '';
        dom.charRight.style.transform = '';
    }
}

// ═══ GAME OVER ═══
socket.on('game-over', (data) => {
    const isWinner = data.winner === myTeam;

    dom.resultIcon.textContent = isWinner ? '🏆' : '😢';
    dom.resultTitle.textContent = isWinner ? 'Vitória!' : 'Derrota!';
    dom.resultTitle.className = `result-title ${isWinner ? 'win' : 'lose'}`;
    dom.resultMessage.textContent = `Time ${data.winner} venceu o Cabo de Guerra!`;

    dom.finalScoreT1.textContent = data.team1Score;
    dom.finalScoreT2.textContent = data.team2Score;

    const rsTeam1 = document.querySelector('.rs-team1');
    const rsTeam2 = document.querySelector('.rs-team2');
    rsTeam1.classList.remove('winner');
    rsTeam2.classList.remove('winner');
    if (data.winner === 1) rsTeam1.classList.add('winner');
    else rsTeam2.classList.add('winner');

    if (isWinner) {
        createConfetti();
    }

    showScreen('result');
});

// ═══ CONFETTI ═══
function createConfetti() {
    dom.confettiContainer.innerHTML = '';
    const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#01a3a4', '#ff8906'];

    for (let i = 0; i < 80; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left = Math.random() * 100 + '%';
        piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        piece.style.width = (Math.random() * 8 + 5) + 'px';
        piece.style.height = (Math.random() * 8 + 5) + 'px';
        piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        piece.style.animationDuration = (Math.random() * 2 + 2) + 's';
        piece.style.animationDelay = Math.random() * 1.5 + 's';
        dom.confettiContainer.appendChild(piece);
    }
}

// ═══ GAME RESET ═══
socket.on('game-reset', (data) => {
    myTeam = null;
    currentAnswer = '';
    canSubmit = true;
    document.body.className = '';

    dom.btnTeam1.classList.remove('joined', 'taken', 'ready');
    dom.btnTeam2.classList.remove('joined', 'taken', 'ready');
    dom.team1Status.textContent = 'Aguardando...';
    dom.team2Status.textContent = 'Aguardando...';
    dom.confettiContainer.innerHTML = '';

    // Reset operation selection UI
    document.querySelectorAll('.op-btn').forEach(btn => btn.classList.remove('selected'));
    dom.opStatus.textContent = 'Nenhuma operação selecionada';
    dom.opStatus.classList.remove('chosen');

    // Stay in the same room — go back to lobby
    showScreen('lobby');
});

function restartGame() {
    socket.emit('restart-game');
}
