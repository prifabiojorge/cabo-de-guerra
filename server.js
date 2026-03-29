const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Professor dashboard route
app.get('/professor', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'professor.html'));
});

// API: retorna URL de rede para QR Code
app.get('/api/info', (req, res) => {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  let bestIP = 'localhost';

  for (const [name, addrs] of Object.entries(interfaces)) {
    for (const iface of addrs) {
      if (iface.family === 'IPv4' && !iface.internal) {
        const lower = name.toLowerCase();
        if (lower.includes('wi-fi') || lower.includes('wifi') ||
            lower.includes('wireless') || lower.includes('wlan')) {
          bestIP = iface.address;
          break;
        }
        if (bestIP === 'localhost') bestIP = iface.address;
      }
    }
    if (bestIP !== 'localhost') break;
  }

  res.json({
    url: `http://${bestIP}:${PORT}`,
    ip: bestIP,
    port: PORT,
  });
});

// ─── Game Configuration ───
const CONFIG = {
  pointsToWin: 6,
  minOperand: 1,
  maxOperand: 20,
  totalRooms: 18,
  operations: ['addition', 'subtraction', 'multiplication', 'division', 'hybrid'],
};

const OP_LABELS = {
  addition: 'Soma',
  subtraction: 'Subtração',
  multiplication: 'Multiplicação',
  division: 'Divisão',
  hybrid: "Modo Pai D'égua",
};

// ─── Session Statistics ───
// Tracks per-player and per-operation stats across the entire session
let sessionStats = {
  players: {},   // { playerName: { wins, losses, correctAnswers, wrongAnswers, operations: { op: { correct, wrong } } } }
  operations: {}, // { op: { correct, wrong, gamesPlayed } }
  totalGames: 0,
  sessionStart: new Date(),
};

function recordAnswer(playerName, operation, isCorrect) {
  if (!playerName) return;
  if (!sessionStats.players[playerName]) {
    sessionStats.players[playerName] = { wins: 0, losses: 0, correctAnswers: 0, wrongAnswers: 0, operations: {} };
  }
  const ps = sessionStats.players[playerName];
  if (isCorrect) ps.correctAnswers++; else ps.wrongAnswers++;

  const op = operation || 'unknown';
  if (!ps.operations[op]) ps.operations[op] = { correct: 0, wrong: 0 };
  if (isCorrect) ps.operations[op].correct++; else ps.operations[op].wrong++;

  if (!sessionStats.operations[op]) sessionStats.operations[op] = { correct: 0, wrong: 0, gamesPlayed: 0 };
  if (isCorrect) sessionStats.operations[op].correct++; else sessionStats.operations[op].wrong++;
}

function recordGameResult(winnerName, loserName) {
  if (winnerName) {
    if (!sessionStats.players[winnerName]) sessionStats.players[winnerName] = { wins: 0, losses: 0, correctAnswers: 0, wrongAnswers: 0, operations: {} };
    sessionStats.players[winnerName].wins++;
  }
  if (loserName) {
    if (!sessionStats.players[loserName]) sessionStats.players[loserName] = { wins: 0, losses: 0, correctAnswers: 0, wrongAnswers: 0, operations: {} };
    sessionStats.players[loserName].losses++;
  }
  sessionStats.totalGames++;
}

// ─── Rooms (Mesas) ───
const rooms = new Map();

function createFreshGame() {
  return {
    status: 'lobby', // lobby | playing | finished
    operation: null,
    teams: {
      1: { players: 0, score: 0, problem: null, socketId: null, playerName: null, sessionWins: 0 },
      2: { players: 0, score: 0, problem: null, socketId: null, playerName: null, sessionWins: 0 },
    },
    winner: null,
    ropePosition: 0,
  };
}

// Initialize all rooms
for (let i = 1; i <= CONFIG.totalRooms; i++) {
  rooms.set(i, createFreshGame());
}

// ─── Problem Generation ───
function generateProblem(operation) {
  let op = operation || 'addition';
  if (op === 'hybrid') {
    const ops = ['addition', 'subtraction', 'multiplication', 'division'];
    op = ops[Math.floor(Math.random() * ops.length)];
  }
  let a, b, answer, symbol;

  switch (op) {
    case 'subtraction': {
      a = Math.floor(Math.random() * CONFIG.maxOperand) + 2;
      b = Math.floor(Math.random() * a) + 1;
      answer = a - b;
      symbol = '−';
      break;
    }
    case 'multiplication': {
      a = Math.floor(Math.random() * 10) + 1;
      b = Math.floor(Math.random() * 10) + 1;
      answer = a * b;
      symbol = '×';
      break;
    }
    case 'division': {
      const divisor = Math.floor(Math.random() * 9) + 2;
      const quotient = Math.floor(Math.random() * 10) + 1;
      a = divisor * quotient;
      b = divisor;
      answer = quotient;
      symbol = '÷';
      break;
    }
    case 'addition':
    default: {
      a = Math.floor(Math.random() * (CONFIG.maxOperand - CONFIG.minOperand + 1)) + CONFIG.minOperand;
      b = Math.floor(Math.random() * (CONFIG.maxOperand - CONFIG.minOperand + 1)) + CONFIG.minOperand;
      answer = a + b;
      symbol = '+';
      break;
    }
  }

  return { a, b, answer, symbol };
}

// ─── Helper: Get room occupancy for all rooms ───
function getRoomsSummary() {
  const summary = [];
  for (let i = 1; i <= CONFIG.totalRooms; i++) {
    const room = rooms.get(i);
    summary.push({
      id: i,
      players: room.teams[1].players + room.teams[2].players,
      status: room.status,
    });
  }
  return summary;
}

// ─── Helper: Detailed dashboard data ───
function getDashboardData() {
  const data = [];
  for (let i = 1; i <= CONFIG.totalRooms; i++) {
    const room = rooms.get(i);
    data.push({
      id: i,
      status: room.status,
      operation: room.operation,
      operationLabel: room.operation ? OP_LABELS[room.operation] : null,
      team1Players: room.teams[1].players,
      team2Players: room.teams[2].players,
      team1Score: room.teams[1].score,
      team2Score: room.teams[2].score,
      team1Name: room.teams[1].playerName || null,
      team2Name: room.teams[2].playerName || null,
      team1Wins: room.teams[1].sessionWins || 0,
      team2Wins: room.teams[2].sessionWins || 0,
      winner: room.winner,
      ropePosition: room.ropePosition,
    });
  }
  return data;
}

function broadcastDashboard() {
  io.to('professor-room').emit('dashboard-update', getDashboardData());
}

// ─── Helper: Emit lobby state within a room ───
function emitLobbyState(roomId) {
  const room = rooms.get(roomId);
  io.to(`room-${roomId}`).emit('lobby-state', {
    team1Ready: room.teams[1].players > 0,
    team2Ready: room.teams[2].players > 0,
    team1Name: room.teams[1].playerName || null,
    team2Name: room.teams[2].playerName || null,
    status: room.status,
    operation: room.operation,
    roomId,
  });
}

// ─── Socket.IO Events ───
io.on('connection', (socket) => {
  console.log(`🔌 Jogador conectado: ${socket.id}`);
  let playerRoom = null;
  let playerTeam = null;
  let playerName = null;

  // Send rooms overview on connect
  socket.emit('rooms-list', getRoomsSummary());

  // ── Professor Dashboard ──
  socket.on('join-as-professor', () => {
    socket.join('professor-room');
    console.log(`👨‍🏫 Professor conectado: ${socket.id}`);
    socket.emit('dashboard-update', getDashboardData());
  });

  socket.on('global-set-operation', (operation) => {
    if (!CONFIG.operations.includes(operation)) return;
    console.log(`👨‍🏫 Professor definiu operação global: ${OP_LABELS[operation]}`);
    for (let i = 1; i <= CONFIG.totalRooms; i++) {
      const room = rooms.get(i);
      if (room.status === 'lobby') {
        room.operation = operation;
        emitLobbyState(i);
        tryStartGame(i);
      }
    }
    io.emit('rooms-list', getRoomsSummary());
    broadcastDashboard();
  });

  socket.on('global-reset-all', () => {
    console.log('👨‍🏫 Professor reiniciou TODAS as mesas!');
    for (let i = 1; i <= CONFIG.totalRooms; i++) {
      rooms.set(i, createFreshGame());
      io.to(`room-${i}`).emit('game-reset', { reason: 'Professor reiniciou o jogo.' });
    }
    io.emit('rooms-list', getRoomsSummary());
    broadcastDashboard();
  });

  socket.on('professor-reset-room', (roomId) => {
    roomId = parseInt(roomId);
    if (roomId < 1 || roomId > CONFIG.totalRooms) return;
    console.log(`👨‍🏫 Professor reiniciou Mesa ${roomId}`);
    rooms.set(roomId, createFreshGame());
    io.to(`room-${roomId}`).emit('game-reset', { reason: 'Professor reiniciou o jogo.' });
    io.emit('rooms-list', getRoomsSummary());
    broadcastDashboard();
  });

  // ── Join a Room (Mesa) — auto-assign team ──
  socket.on('join-room', (roomId) => {
    roomId = parseInt(roomId);
    if (roomId < 1 || roomId > CONFIG.totalRooms) return;

    const room = rooms.get(roomId);

    // Check if room is full (2 players)
    const totalPlayers = room.teams[1].players + room.teams[2].players;
    if (totalPlayers >= 2) {
      socket.emit('room-full', roomId);
      return;
    }

    // Auto-assign: first to join = Side 1, second = Side 2
    const assignedTeam = room.teams[1].players === 0 ? 1 : 2;
    playerRoom = roomId;
    playerTeam = assignedTeam;
    room.teams[assignedTeam].players = 1;
    room.teams[assignedTeam].socketId = socket.id;

    socket.join(`room-${roomId}`);
    socket.join(`room-${roomId}-team-${assignedTeam}`);
    socket.emit('team-assigned', assignedTeam);
    console.log(`🪑 Jogador ${socket.id} entrou na Mesa ${roomId} → Lado ${assignedTeam}`);

    // Send lobby state for this room
    emitLobbyState(roomId);

    // Broadcast updated rooms list to everyone in room-select
    io.emit('rooms-list', getRoomsSummary());
    broadcastDashboard();
  });

  // ── Set Player Name ──
  socket.on('set-player-name', (name) => {
    if (!playerRoom) return;
    const sanitized = String(name).trim().slice(0, 20) || 'Jogador';
    playerName = sanitized;
    const room = rooms.get(playerRoom);
    if (playerTeam && room.teams[playerTeam]) {
      room.teams[playerTeam].playerName = sanitized;
      broadcastDashboard();
    }
  });

  // ── Select Operation ──
  socket.on('select-operation', (operation) => {
    if (!playerRoom) return;
    const room = rooms.get(playerRoom);
    if (room.status !== 'lobby') return;
    if (!CONFIG.operations.includes(operation)) return;

    room.operation = operation;
    console.log(`🔢 Mesa ${playerRoom} — Operação: ${OP_LABELS[operation]}`);

    emitLobbyState(playerRoom);
    tryStartGame(playerRoom);
    broadcastDashboard();
  });

  // ── Join Team ──
  socket.on('join-team', (teamId) => {
    teamId = parseInt(teamId);
    if (teamId !== 1 && teamId !== 2) return;
    if (!playerRoom) return;

    const room = rooms.get(playerRoom);
    if (room.status !== 'lobby') return;

    if (room.teams[teamId].players > 0) {
      socket.emit('team-taken', teamId);
      return;
    }

    playerTeam = teamId;
    room.teams[teamId].players = 1;
    room.teams[teamId].socketId = socket.id;
    if (playerName) {
      room.teams[teamId].playerName = playerName;
    }
    socket.join(`room-${playerRoom}-team-${teamId}`);
    console.log(`👥 Mesa ${playerRoom} — Jogador ${socket.id} → Time ${teamId}`);

    emitLobbyState(playerRoom);
    tryStartGame(playerRoom);

    // Update rooms list for everyone
    io.emit('rooms-list', getRoomsSummary());
    broadcastDashboard();
  });

  // ── Submit Answer ──
  socket.on('submit-answer', (answer) => {
    if (!playerRoom || !playerTeam) return;
    const room = rooms.get(playerRoom);
    if (room.status !== 'playing') return;

    const team = room.teams[playerTeam];
    const parsedAnswer = parseInt(answer);
    const currentPlayerName = team.playerName || playerName;

    if (parsedAnswer === team.problem.answer) {
      // Correct!
      team.score++;
      room.ropePosition += (playerTeam === 1 ? -1 : 1);
      recordAnswer(currentPlayerName, room.operation, true);
      console.log(`✅ Mesa ${playerRoom} — Time ${playerTeam} acertou! Corda: ${room.ropePosition}`);

      const ropeWinner = room.ropePosition <= -CONFIG.pointsToWin ? 1
                       : room.ropePosition >= CONFIG.pointsToWin  ? 2
                       : null;

      if (ropeWinner !== null) {
        room.status = 'finished';
        room.winner = ropeWinner;
        room.teams[ropeWinner].sessionWins = (room.teams[ropeWinner].sessionWins || 0) + 1;

        const loserTeam = ropeWinner === 1 ? 2 : 1;
        const winnerName = room.teams[ropeWinner].playerName;
        const loserName = room.teams[loserTeam].playerName;
        recordGameResult(winnerName, loserName);

        // Register game for the operation used
        const op = room.operation || 'unknown';
        if (!sessionStats.operations[op]) sessionStats.operations[op] = { correct: 0, wrong: 0, gamesPlayed: 0 };
        sessionStats.operations[op].gamesPlayed++;

        console.log(`🏆 Mesa ${playerRoom} — Lado ${ropeWinner} venceu! (corda em ${room.ropePosition})`);
        io.to(`room-${playerRoom}`).emit('game-over', {
          winner: ropeWinner,
          team1Score: room.teams[1].score,
          team2Score: room.teams[2].score,
          team1Name: room.teams[1].playerName || 'Lado 1',
          team2Name: room.teams[2].playerName || 'Lado 2',
          team1Wins: room.teams[1].sessionWins,
          team2Wins: room.teams[2].sessionWins,
          ropePosition: room.ropePosition,
        });
        io.emit('rooms-list', getRoomsSummary());
        broadcastDashboard();
        return;
      }

      team.problem = generateProblem(room.operation);

      io.to(`room-${playerRoom}-team-${playerTeam}`).emit('answer-result', {
        correct: true,
        newProblem: { a: team.problem.a, b: team.problem.b, symbol: team.problem.symbol },
        myScore: team.score,
      });

      io.to(`room-${playerRoom}`).emit('rope-update', {
        ropePosition: room.ropePosition,
        team1Score: room.teams[1].score,
        team2Score: room.teams[2].score,
      });

      broadcastDashboard();
    } else {
      // Wrong answer
      recordAnswer(currentPlayerName, room.operation, false);
      console.log(`❌ Mesa ${playerRoom} — Time ${playerTeam} errou (respondeu ${parsedAnswer}, correto: ${team.problem.answer})`);

      team.problem = generateProblem(room.operation);

      io.to(`room-${playerRoom}-team-${playerTeam}`).emit('answer-result', {
        correct: false,
        newProblem: { a: team.problem.a, b: team.problem.b, symbol: team.problem.symbol },
        myScore: team.score,
      });
    }
  });

  // ── Disconnect ──
  socket.on('disconnect', () => {
    console.log(`🔌 Jogador desconectado: ${socket.id}`);
    if (playerRoom && playerTeam) {
      const room = rooms.get(playerRoom);
      if (room.status !== 'finished') {
        room.teams[playerTeam].players = 0;
        room.teams[playerTeam].socketId = null;
        room.teams[playerTeam].playerName = null;

        if (room.status === 'playing') {
          // Reset the room
          rooms.set(playerRoom, createFreshGame());
          io.to(`room-${playerRoom}`).emit('game-reset', { reason: 'Um jogador desconectou. O jogo foi reiniciado.' });
        } else {
          emitLobbyState(playerRoom);
        }
      }
      io.emit('rooms-list', getRoomsSummary());
      broadcastDashboard();
    }
  });

  // ── Restart Game (keep names, teams & session wins) ──
  socket.on('restart-game', () => {
    if (!playerRoom) return;
    console.log(`🔄 Mesa ${playerRoom} — Jogar novamente...`);
    const room = rooms.get(playerRoom);

    // Resetar apenas o estado da partida — NÃO remover jogadores dos canais
    room.status = 'lobby';
    room.teams[1].score = 0;
    room.teams[1].problem = null;
    room.teams[2].score = 0;
    room.teams[2].problem = null;
    room.winner = null;
    room.ropePosition = 0;
    // sessionWins, playerName, players, socketId — PRESERVADOS

    // Se a operação já estiver definida, iniciar o jogo diretamente
    if (room.operation) {
      startGame(playerRoom);
    } else {
      // Caso raro: operação ainda não definida — enviados ao lobby
      emitLobbyState(playerRoom);
    }

    io.emit('rooms-list', getRoomsSummary());
    broadcastDashboard();
  });

  // ── Professor: End Session & Generate Report ──
  socket.on('professor-end-session', () => {
    console.log('📊 Professor solicitou fim de sessão — gerando relatório...');

    // Capture current data before reset
    const reportData = {
      sessionStart: sessionStats.sessionStart,
      sessionEnd: new Date(),
      totalGames: sessionStats.totalGames,
      players: { ...sessionStats.players },
      operations: { ...sessionStats.operations },
      rooms: getDashboardData(),
    };

    // Reset all rooms
    for (let i = 1; i <= CONFIG.totalRooms; i++) {
      rooms.set(i, createFreshGame());
      io.to(`room-${i}`).emit('game-reset', { reason: 'Sessão encerrada pelo professor.' });
    }

    // Reset session stats
    sessionStats = {
      players: {},
      operations: {},
      totalGames: 0,
      sessionStart: new Date(),
    };

    io.emit('rooms-list', getRoomsSummary());
    broadcastDashboard();

    // Send report data only to professor
    socket.emit('session-report', reportData);
    console.log('✅ Sessão encerrada e dados do relatório enviados.');
  });

  // ── Leave Room (full reset) ──
  socket.on('leave-room', () => {
    if (!playerRoom) return;
    console.log(`🚪 Mesa ${playerRoom} — Jogador saiu`);
    const room = rooms.get(playerRoom);
    // Full reset via createFreshGame
    rooms.set(playerRoom, createFreshGame());
    io.to(`room-${playerRoom}`).emit('game-reset', { reason: 'Um jogador saiu.' });
    io.emit('rooms-list', getRoomsSummary());
    broadcastDashboard();
    playerRoom = null;
    playerTeam = null;
    playerName = null;
  });
});

// ─── Game Start Logic ───
function tryStartGame(roomId) {
  const room = rooms.get(roomId);
  if (room.teams[1].players > 0 && room.teams[2].players > 0 && room.operation) {
    startGame(roomId);
  }
}

function startGame(roomId) {
  const room = rooms.get(roomId);
  room.status = 'playing';
  room.teams[1].problem = generateProblem(room.operation);
  room.teams[2].problem = generateProblem(room.operation);

  const p1 = room.teams[1].problem;
  const p2 = room.teams[2].problem;

  console.log(`🎮 Mesa ${roomId} — Jogo iniciado! Operação: ${OP_LABELS[room.operation]}`);

  io.to(`room-${roomId}-team-1`).emit('game-start', {
    teamId: 1,
    problem: { a: p1.a, b: p1.b, symbol: p1.symbol },
    pointsToWin: CONFIG.pointsToWin,
    operation: room.operation,
    roomId,
    team1Name: room.teams[1].playerName || 'Lado 1',
    team2Name: room.teams[2].playerName || 'Lado 2',
    team1Wins: room.teams[1].sessionWins,
    team2Wins: room.teams[2].sessionWins,
  });

  io.to(`room-${roomId}-team-2`).emit('game-start', {
    teamId: 2,
    problem: { a: p2.a, b: p2.b, symbol: p2.symbol },
    pointsToWin: CONFIG.pointsToWin,
    operation: room.operation,
    roomId,
    team1Name: room.teams[1].playerName || 'Lado 1',
    team2Name: room.teams[2].playerName || 'Lado 2',
    team1Wins: room.teams[1].sessionWins,
    team2Wins: room.teams[2].sessionWins,
  });

  io.emit('rooms-list', getRoomsSummary());
}

// ─── Start Server ───
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  let wifiIP = null;
  const allIPs = [];

  for (const [name, addrs] of Object.entries(interfaces)) {
    for (const iface of addrs) {
      if (iface.family === 'IPv4' && !iface.internal) {
        allIPs.push({ name, address: iface.address });
        const lowerName = name.toLowerCase();
        if (lowerName.includes('wi-fi') || lowerName.includes('wifi') || lowerName.includes('wireless') || lowerName.includes('wlan')) {
          wifiIP = iface.address;
        }
      }
    }
  }

  const bestIP = wifiIP || (allIPs.length > 0 ? allIPs[0].address : 'localhost');

  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('  🎮 OPERAÇÃO PAI D\'ÉGUA: CABO DE GUERRA MATEMÁTICO');
  console.log(`  📊 ${CONFIG.totalRooms} Mesas disponíveis (até ${CONFIG.totalRooms * 2} jogadores)`);
  console.log('═══════════════════════════════════════════════');
  console.log(`  🏠 Local:    http://localhost:${PORT}`);
  console.log(`  📡 Rede:     http://${bestIP}:${PORT}`);

  if (allIPs.length > 1) {
    console.log('');
    console.log('  📋 Todos os IPs disponíveis:');
    allIPs.forEach(ip => {
      const marker = ip.address === bestIP ? ' ← recomendado' : '';
      console.log(`     • ${ip.name}: http://${ip.address}:${PORT}${marker}`);
    });
  }

  console.log('');
  console.log('  Abra o endereço acima nos 36 Chromebooks!');
  console.log('═══════════════════════════════════════════════');
  console.log('');
});
