# 🪢 Operação Pai d'égua: cabo de guerra matemático

> **Jogo educacional multiplayer** de matemática para sala de aula — disputado em tempo real entre duplas de alunos via navegador, com painel de controle para o professor.

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Estrutura de Arquivos](#estrutura-de-arquivos)
4. [Instalação e Execução](#instalação-e-execução)
5. [Fluxo de Jogo (Aluno)](#fluxo-de-jogo-aluno)
6. [Painel do Professor](#painel-do-professor)
7. [Motor de Eventos (Socket.IO)](#motor-de-eventos-socketio)
8. [Servidor — server.js](#servidor--serverjs)
9. [Cliente Aluno — app.js](#cliente-aluno--appjs)
10. [Motor de Áudio — audio.js](#motor-de-áudio--audiojs)
11. [Geração de PDF — professor.js](#geração-de-pdf--professorjs)
12. [Configurações do Jogo](#configurações-do-jogo)
13. [Estatísticas e Relatório](#estatísticas-e-relatório)
14. [Protocolo de Comunicação (Eventos)](#protocolo-de-comunicação-eventos)
15. [Design e Estilização](#design-e-estilização)
16. [Limitações e Decisões de Projeto](#limitações-e-decisões-de-projeto)
17. [Guia de Uso em Sala de Aula](#guia-de-uso-em-sala-de-aula)
18. [Troubleshooting](#troubleshooting)
19. [Créditos](#créditos)

---

## Visão Geral

**Operação Pai d'égua: cabo de guerra matemático** é um jogo web multiplayer em tempo real projetado para uso em sala de aula, especialmente em contextos com Chromebooks e redes Wi-Fi internas. Dois alunos (um por dispositivo) entram na mesma **mesa** e competem respondendo questões matemáticas individualmente. A cada resposta correta, o jogador "puxa a corda" para o seu lado. O primeiro a puxar a corda até o limite (6 posições) vence a partida.

### Características Principais

| Recurso | Detalhe |
|---|---|
| **Multiplayer real-time** | WebSocket via Socket.IO — sem polling |
| **Até 18 mesas simultâneas** | 36 alunos jogando ao mesmo tempo |
| **5 operações matemáticas** | Soma, Subtração, Multiplicação, Divisão, Pai D'égua (híbrido) |
| **Mecânica de cabo de guerra** | Corda com posição contínua — vitória por posição, não por pontos fixos |
| **Ranking por vitórias** | Painel do professor mostra vitórias acumuladas na sessão |
| **Geração de relatório PDF** | Relatório pedagógico automático com insights sobre desempenho |
| **Motor de áudio procedural** | Sons sintetizados via Web Audio API — sem arquivos externos |
| **QR Code de acesso** | Professor gera QR Code com a URL da rede local |
| **Nome persistente** | localStorage salva o nome do aluno entre sessões |

---

## Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────┐
│                     NAVEGADOR DO ALUNO                  │
│   index.html + style.css + app.js + audio.js            │
│   Socket.IO Client ──────────────────────────────────┐  │
└──────────────────────────────────────────────────────┼──┘
                                                       │  WebSocket
┌─────────────────────────────────────────────────────┼──┐
│                     SERVIDOR NODE.JS                 │  │
│   server.js (Express + Socket.IO + Game State)       │  │
│   ┌───────────────────────────────────────────────┐  │  │
│   │  Map<roomId, GameState> — 18 mesas em memória │  │  │
│   │  sessionStats — acertos/erros por aluno       │  │  │
│   └───────────────────────────────────────────────┘  │  │
└──────────────────────────────────────────────────────┼──┘
                                                       │  WebSocket
┌─────────────────────────────────────────────────────┼──┐
│                  NAVEGADOR DO PROFESSOR              │  │
│   professor.html + professor.css + professor.js      │  │
│   Socket.IO Client ──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Tecnologias Utilizadas

| Camada | Tecnologia | Versão | Motivo |
|---|---|---|---|
| Servidor HTTP | Node.js + Express | ^4.21.0 | Leve, sem dependências pesadas |
| WebSocket | Socket.IO | ^4.7.5 | Bidirecional, reconexão automática |
| Frontend | HTML5 + CSS3 + JS puro | — | Sem build step, compatível com Chromebook |
| Áudio | Web Audio API | nativa | Sem arquivos externos, sem latência de rede |
| QR Code | qrcodejs (cdnjs) | 1.0.0 | Expõe `QRCode` global de forma confiável |
| PDF | jsPDF (cdnjs) | 2.5.1 | Geração 100% client-side, sem servidor |
| Fontes | Google Fonts — Outfit | — | Tipografia moderna e legível |

---

## Estrutura de Arquivos

```
cabo-de-guerra/
├── server.js              # Servidor principal: Express + Socket.IO + lógica do jogo
├── package.json           # Dependências e script de start
├── package-lock.json      # Lock de versões exatas
├── .gitignore
├── README.md              # Esta documentação
│
└── public/                # Arquivos estáticos servidos pelo Express
    ├── index.html         # Interface do aluno (5 telas em SPA)
    ├── style.css          # Estilos da interface do aluno
    ├── app.js             # Lógica client-side do aluno
    ├── audio.js           # Motor de áudio procedural (Web Audio API)
    ├── professor.html     # Interface do professor (dashboard)
    ├── professor.css      # Estilos do painel do professor
    └── professor.js       # Lógica do painel + geração de PDF
```

---

## Instalação e Execução

### Pré-requisitos

- **Node.js** v18+ instalado
- Rede Wi-Fi local (professor e alunos no mesmo roteador)
- Chromebooks dos alunos com Chrome 90+

### Passo a Passo

```bash
# 1. Entrar no diretório
cd cabo-de-guerra

# 2. Instalar dependências (apenas na primeira vez)
npm install

# 3. Iniciar o servidor
npm start
```

O terminal exibirá:

```
═══════════════════════════════════════════════
  🎮 CABO DE GUERRA: MATEMÁTICA
  📊 18 Mesas disponíveis (até 36 jogadores)
═══════════════════════════════════════════════
  🏠 Local:    http://localhost:3000
  📡 Rede:     http://192.168.X.X:3000
═══════════════════════════════════════════════
```

- **Professor** acessa: `http://localhost:3000/professor`
- **Alunos** acessam: `http://192.168.X.X:3000` (endereço de rede exibido no terminal)

> 💡 O professor pode usar o botão **QR Code para Alunos** para gerar um QR code com o endereço de rede — os alunos apontam a câmera e já acessam.

### Reiniciar o Servidor

Se o código do servidor for modificado, é necessário reiniciar:

```powershell
# Parar e reiniciar (PowerShell)
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
npm start
```

---

## Fluxo de Jogo (Aluno)

O jogo do aluno é uma **SPA (Single Page Application)** com 5 telas que alternam via classes CSS:

```
[Seleção de Mesa] → [Entrada de Nome] → [Lobby] → [Jogo] → [Resultado]
                                            ↑                     │
                                            └─────────────────────┘
                                              (Jogar Novamente)
```

### Tela 1 — Seleção de Mesa

- Exibe grade com 18 botões de mesa
- Cores semânticas:
  - **Cinza claro**: Mesa livre (0 jogadores)
  - **Amarelo/âmbar**: Mesa com 1 jogador aguardando
  - **Vermelho**: Mesa cheia (2 jogadores) ou em jogo
- Atualiza em tempo real via evento `rooms-list`
- Ao clicar: verifica localStorage para nome salvo
  - Se há nome salvo → vai direto ao Lobby
  - Se não há nome → vai para Tela de Nome

### Tela 2 — Entrada de Nome

- Input de texto com máximo de 20 caracteres
- Nome salvo no `localStorage` com chave `cdg_playerName`
- Enviado ao servidor via `set-player-name`
- Suporte a `Enter` para confirmar
- Botão "Trocar nome" limpa o localStorage

### Tela 3 — Lobby

- Exibe a mesa selecionada e os dois lados (Lado 1 / Lado 2)
- Grid de botões de operação (5 opções)
- Destaca o painel do próprio jogador com borda colorida
- Indica "✅ Pronto!" quando o adversário se conecta
- Jogo inicia automaticamente quando:
  - 2 jogadores presentes **E**
  - Operação definida (por qualquer jogador ou pelo professor)

### Tela 4 — Jogo

#### Placar Superior
- Mostra o score de acertos de cada lado
- Centro mostra a posição da corda com setas (← N ou N →)

#### Animação da Corda
- Corda SVG com indicador central
- Personagens 🏃‍♂️ e 🏃 se deslocam proporcionalmente à posição da corda
- Tensão visual máxima a 2 posições do limite

#### Problema Matemático
- Exibe: `A [símbolo] B = [ _ ]`
- Gerado pelo servidor, único para cada jogador
- Resposta digitada via teclado numérico na tela (ou teclado físico)

#### Numpad
- Botões 0–9, apagar (⌫), confirmar (✓)
- Suporte a teclado físico: 0-9, Backspace, Enter
- Anti-duplo-clique: `canSubmit = false` após envio, reativado com novo problema

#### Feedback Visual + Sonoro
- ✅ Correto: animação verde + som ascendente
- ❌ Errado: animação de shake + som descendente

### Tela 5 — Resultado

- Ícone 🏆 (vitória) ou 😢 (derrota)
- Placar final de acertos de cada lado
- **Painel de vitórias da sessão**: "Armando: 1 vit. | bcd: 1 vit."
- Confetti animado para o vencedor (80 peças coloridas)
- Botão "Jogar Novamente" → reinicia partida, mantém nomes e vitórias acumuladas
- Botão "Sair" → volta à seleção de mesas, reseta tudo

---

## Painel do Professor

Acesso: `http://localhost:3000/professor`

### Header

| Elemento | Descrição |
|---|---|
| Título | "👨‍🏫 Painel do Professor" |
| Subtítulo | "Operação Pai d'égua: cabo de guerra matemático" |
| Stat: Aguardando | Número de mesas em lobby |
| Stat: Jogando | Número de mesas com jogo ativo |
| Stat: Finalizadas | Número de mesas com jogo encerrado |

### Controles Globais

| Botão | Ação |
|---|---|
| + Soma / − Subtração / × Multiplicação / ÷ Divisão / 🔀 Pai D'égua | Define operação em **todas** as mesas em lobby simultaneamente |
| 📱 QR Code para Alunos | Gera QR Code com o endereço de rede local (via `/api/info`) |
| 🔄 Reiniciar TODAS as Mesas | Reseta todas as 18 mesas (com confirmação) |
| 📄 Criar Relatório | Encerra a sessão, zera todas as mesas e gera PDF de desempenho |

### Ranking Geral da Turma

- Atualizado em tempo real
- Ordenado por **número de vitórias** (não pontos)
- Medalhas: 🥇🥈🥉 para os 3 primeiros
- Exibe: nome, mesa, e contagem de vitórias (`"1 vitória"` / `"N vitórias"`)

### Grid de Mesas (18 cards)

Cada card exibe:
- **Número da mesa** e **status** (Aguardando / Jogando / Finalizada)
- Número de jogadores (0/2, 1/2, 2/2)
- Operação selecionada
- Placar atual (durante jogo ou ao final)
- Vencedor da última partida
- Botão "🔄 Reiniciar" individual

Cores dos cards:
- **Cinza**: Lobby / aguardando
- **Azul**: Jogo em andamento
- **Verde**: Jogo finalizado

---

## Motor de Eventos (Socket.IO)

### Salas (Rooms) do Socket.IO

| Room | Quem entra | Propósito |
|---|---|---|
| `professor-room` | Professor | Receber `dashboard-update` |
| `room-{N}` | Ambos jogadores da mesa N | Broadcast geral da mesa |
| `room-{N}-team-{T}` | Jogador do time T na mesa N | Mensagens privadas (problema, acerto) |

---

## Servidor — server.js

### Inicialização

```javascript
const CONFIG = {
  pointsToWin: 6,      // posições da corda para vencer
  minOperand: 1,       // mínimo dos operandos (soma/subtração)
  maxOperand: 20,      // máximo dos operandos
  totalRooms: 18,      // número de mesas
  operations: [...],   // lista de operações válidas
};
```

### Estrutura de uma Mesa (Room)

```javascript
{
  status: 'lobby' | 'playing' | 'finished',
  operation: null | 'addition' | 'subtraction' | 'multiplication' | 'division' | 'hybrid',
  winner: null | 1 | 2,
  ropePosition: 0,          // -6 (time 1 vence) a +6 (time 2 vence)
  teams: {
    1: {
      players: 0 | 1,       // 1 se há jogador, 0 se não há
      score: 0,             // acertos na partida atual
      problem: null | {...}, // problema atual
      socketId: null | str, // socket do jogador
      playerName: null | str,
      sessionWins: 0,       // vitórias acumuladas na sessão
    },
    2: { /* mesma estrutura */ }
  }
}
```

### Geração de Problemas

```javascript
function generateProblem(operation)
```

| Operação | Intervalos | Observações |
|---|---|---|
| `addition` | a, b ∈ [1, 20] | Resultado pode chegar a 40 |
| `subtraction` | a ∈ [2, 20], b ∈ [1, a] | Resultado sempre ≥ 1 (sem negativos) |
| `multiplication` | a, b ∈ [1, 10] | Máximo 100 |
| `division` | divisor ∈ [2, 10], quociente ∈ [1, 10] | Resultado inteiro garantido |
| `hybrid` | Sorteia aleatoriamente uma das 4 acima | Modo "Pai D'égua" |

Retorna: `{ a, b, answer, symbol }`

### Estatísticas de Sessão (sessionStats)

Estrutura em memória, resetada ao encerrar sessão:

```javascript
sessionStats = {
  players: {
    "NomeAluno": {
      wins:           Number,  // vitórias (jogos ganhos)
      losses:         Number,  // derrotas (jogos perdidos)
      correctAnswers: Number,  // respostas corretas totais
      wrongAnswers:   Number,  // respostas erradas totais
      operations: {
        "addition": { correct: Number, wrong: Number },
        // ... por operação
      }
    }
  },
  operations: {
    "addition": { correct: Number, wrong: Number, gamesPlayed: Number },
    // ... por operação
  },
  totalGames: Number,
  sessionStart: Date,
}
```

### Endpoints HTTP

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/` | Serve `index.html` (alunos) |
| `GET` | `/professor` | Serve `professor.html` |
| `GET` | `/api/info` | Retorna `{ url, ip, port }` com IP de rede detectado automaticamente |
| `GET` | `/socket.io/...` | Servido pelo Socket.IO automaticamente |

#### `/api/info` — Detecção de IP

O servidor percorre as interfaces de rede priorizando:
1. Interfaces Wi-Fi (nome contendo "wi-fi", "wifi", "wireless", "wlan")
2. Qualquer outra interface IPv4 não-loopback
3. Fallback: `localhost`

---

## Cliente Aluno — app.js

### Estado do Cliente

```javascript
let myRoom = null;          // ID da mesa atual
let myTeam = null;          // 1 ou 2
let team1Name = 'Lado 1';   // nome do jogador do time 1
let team2Name = 'Lado 2';   // nome do jogador do time 2
let team1Wins = 0;          // vitórias do time 1 na sessão
let team2Wins = 0;          // vitórias do time 2 na sessão
let currentAnswer = '';     // digitação atual (max 3 dígitos)
let pointsToWin = 6;        // limite da corda (espelhado do servidor)
let canSubmit = true;       // flag anti-spam de resposta
```

### Funções Principais

| Função | Descrição |
|---|---|
| `showScreen(name)` | Alterna entre as 5 telas da SPA |
| `joinRoom(roomId)` | Entra em uma mesa, gerencia nome salvo |
| `confirmName()` | Valida e salva nome no localStorage |
| `clearSavedName()` | Remove nome do localStorage |
| `selectOperation(op)` | Emite `select-operation` ao servidor |
| `pressNumber(num)` | Adiciona dígito à resposta atual |
| `clearAnswer()` | Remove último dígito (backspace) |
| `submitAnswer()` | Emite `submit-answer` e bloqueia novos envios |
| `updateRopePosition(pos)` | Atualiza posição visual da corda e personagens |
| `createConfetti()` | Gera 80 peças de confetti animadas |
| `restartGame()` | Emite `restart-game` (mantém nomes e vitórias) |
| `leaveRoom()` | Emite `leave-room` (reset completo) |

### Persistência de Nome

```javascript
// Salvar
localStorage.setItem('cdg_playerName', name);

// Recuperar
const savedName = localStorage.getItem('cdg_playerName');

// Remover
localStorage.removeItem('cdg_playerName');
```

---

## Motor de Áudio — audio.js

Implementado como **IIFE** (Immediately Invoked Function Expression) — módulo isolado sem dependências externas.

```javascript
const AudioEngine = (() => { ... })();
```

### Princípio de Funcionamento

Todos os sons são **sintetizados em tempo real** via Web Audio API:
- **Osciladores** (`OscillatorNode`): ondas `sine`, `triangle`, `square`, `sawtooth`
- **Envelope ADSR**: Attack, Decay, Sustain, Release implementados com `linearRampToValueAtTime`
- **Ruído branco**: Buffer com valores aleatórios para sons de impacto

### Inicialização

```javascript
AudioEngine.init()
```

Cria o `AudioContext` uma única vez (necessário por políticas de autoplay dos navegadores — deve ser chamado após interação do usuário).

### Eventos Sonoros

| Método | Trigger | Descrição |
|---|---|---|
| `correct()` | Resposta certa | Tom ascendente; frequência sobe com combo (até 1047 Hz) |
| `wrong()` | Resposta errada | Tom descendente sawtooth + glide para baixo; reseta combo |
| `gameStart()` | Início da partida | Arpejo de 4 notas + noise burst |
| `win()` | Vitória | Melodia de 8 notas com chord final por 0,6s |
| `lose()` | Derrota | Arpejo descendente de 4 notas |
| `ropePull(dir)` | Corda se move | Tone curto com glide direcional + ruído |
| `tension()` | Corda a 2 do limite | Pulso grave de aviso (110 Hz square) |
| `lobbyJoin()` | Entrar em uma mesa | Dois tons curtos ascendentes |

---

## Geração de PDF — professor.js

### Fluxo Completo

```
Professor clica "Criar Relatório"
  → confirm() dialog
  → socket.emit('professor-end-session')
  → Servidor: captura sessionStats, reseta tudo, emite 'session-report'
  → Cliente: recebe 'session-report' → generatePDF(data)
  → jsPDF gera documento A4
  → doc.save() dispara download no navegador
  → showToast('PDF gerado! Verifique a pasta Downloads...')
```

### Estrutura do PDF (4 seções)

#### Seção 1 — Cabeçalho

| Campo | Conteúdo |
|---|---|
| Título | "OPERACAO PAI D'EGUA: CABO DE GUERRA MATEMATICO" |
| Subtítulo | "Relatorio de Desempenho da Turma" |
| Datas | Início e término da sessão |
| Total de partidas | Número de jogos completos |
| Instituição | CISEB / Prof. Fábio Fabuloso |

#### Seção 2 — Ranking Geral por Vitórias

Tabela ordenada por vitórias (`desc`) com:
- Posição (1o, 2o, 3o...)
- Nome do aluno
- Vitórias / Derrotas
- Acertos / Erros
- Aproveitamento (%)

#### Seção 3 — Desempenho Individual

Tabela ordenada por taxa de acerto (`desc`) com:
- Nome, total de respostas, acertos, erros, taxa de acerto
- Código de cor: **verde** ≥ 70%, **amarelo** 40-69%, **vermelho** < 40%

#### Seção 4 — Dificuldade por Operação

Tabela ordenada por taxa de erro (`desc`) com:
- Operação, partidas jogadas, respostas totais, acertos, erros, taxa de erro, nível (ALTA/MEDIA/BAIXA)

#### Seção 5 — Insights Pedagógicos

Gerado automaticamente com base nos dados:
- `DESTAQUE DA AULA:` — aluno com mais vitórias e melhor aproveitamento
- `OPERACAO MAIS DIFICIL:` — com recomendação de reforço
- `OPERACAO MAIS FACIL:` — se houver
- `ATENCAO ESPECIAL:` — alunos com < 40% de aproveitamento (mínimo 3 respostas)
- `EXCELENTE DESEMPENHO:` — alunos com ≥ 80%

#### Rodapé (todas as páginas)

"Operacao Pai d'egua: cabo de guerra matematico - Prof. Fabio Fabuloso - CISEB 2026 | Pagina N de M"

> **Nota técnica:** jsPDF não suporta caracteres Unicode emoji. Toda a geração de PDF usa apenas caracteres ASCII/Latin-1 para garantir compatibilidade.

---

## Configurações do Jogo

Todas as configurações ficam no objeto `CONFIG` em `server.js`:

```javascript
const CONFIG = {
  pointsToWin: 6,          // Posições para vencer (default: 6)
  minOperand: 1,           // Operando mínimo (soma/subtração)
  maxOperand: 20,          // Operando máximo (soma/subtração)
  totalRooms: 18,          // Número de mesas
  operations: ['addition', 'subtraction', 'multiplication', 'division', 'hybrid'],
};
```

Para aumentar a dificuldade: aumente `pointsToWin` ou `maxOperand`.
Para menos mesas: diminua `totalRooms`.

---

## Estatísticas e Relatório

### O que é rastreado

| Dado | Quando registrado | Onde |
|---|---|---|
| Resposta correta por aluno | A cada `submit-answer` correto | `sessionStats.players[name].correctAnswers` |
| Resposta errada por aluno | A cada `submit-answer` errado | `sessionStats.players[name].wrongAnswers` |
| Acertos por operação | Junto com resposta correta | `sessionStats.operations[op].correct` |
| Erros por operação | Junto com resposta errada | `sessionStats.operations[op].wrong` |
| Vitória por aluno | Quando `ropeWinner` é declarado | `sessionStats.players[name].wins` |
| Derrota por aluno | Quando `ropeWinner` é declarado | `sessionStats.players[name].losses` |
| Partidas por operação | A cada `game-over` | `sessionStats.operations[op].gamesPlayed` |

### Ciclo de Vida das Estatísticas

- **Início:** `sessionStats` inicializado quando o servidor sobe
- **Acumulação:** Ao longo de todas as partidas de todas as mesas
- **Coleta:** Quando professor clica "Criar Relatório" (`professor-end-session`)
- **Reset:** Logo após a coleta — `sessionStats` é reiniciado
- **Persistência:** **Apenas em memória** — reiniciar o servidor zera tudo

---

## Protocolo de Comunicação (Eventos)

### Eventos: Cliente → Servidor

| Evento | Payload | Descrição |
|---|---|---|
| `join-as-professor` | — | Entra na sala `professor-room` |
| `join-room` | `roomId: Number` | Aluno se junta a uma mesa |
| `set-player-name` | `name: String` | Define nome do jogador |
| `select-operation` | `operation: String` | Aluno escolhe operação |
| `join-team` | `teamId: 1\|2` | Aluno escolhe time (legado) |
| `submit-answer` | `answer: Number` | Envia resposta ao servidor |
| `restart-game` | — | Reinicia partida (mantém vitórias) |
| `leave-room` | — | Sai da mesa (reset completo) |
| `global-set-operation` | `operation: String` | Professor define operação em todas as mesas |
| `global-reset-all` | — | Professor reseta todas as mesas |
| `professor-reset-room` | `roomId: Number` | Professor reseta uma mesa |
| `professor-end-session` | — | Encerra sessão, gera relatório, reseta tudo |

### Eventos: Servidor → Cliente

| Evento | Destino | Payload principal | Descrição |
|---|---|---|---|
| `rooms-list` | Todos | `[{id, players, status}]` | Lista de mesas (lobby) |
| `dashboard-update` | `professor-room` | Array com dados das 18 mesas | Atualização completa do painel |
| `team-assigned` | Socket (aluno) | `teamId: 1\|2` | Time atribuído automaticamente |
| `lobby-state` | `room-{N}` | `{team1Ready, team2Ready, operation, ...}` | Estado do lobby |
| `game-start` | `room-{N}-team-{T}` | `{problem, pointsToWin, team1Wins, ...}` | Início da partida |
| `answer-result` | `room-{N}-team-{T}` | `{correct, newProblem, myScore}` | Resultado da resposta |
| `rope-update` | `room-{N}` | `{ropePosition, team1Score, team2Score}` | Atualização da corda |
| `game-over` | `room-{N}` | `{winner, team1Score, team2Score, team1Wins, team2Wins, ...}` | Fim de partida |
| `game-reset` | `room-{N}` | `{reason: String}` | Partida foi resetada |
| `room-full` | Socket (aluno) | `roomId` | Mesa lotada |
| `team-taken` | Socket (aluno) | `teamId` | Time já ocupado |
| `session-report` | Socket (professor) | `{sessionStart, sessionEnd, totalGames, players, operations, rooms}` | Dados para o PDF |

---

## Design e Estilização

### Identidade Visual

| Elemento | Valor |
|---|---|
| Fundo principal | `#0f0e17` (azul-marinho quase preto) |
| Fundo secundário | `#1a1932` |
| Accent / destaque | `#ff8906` (laranja vibrante) |
| Sucesso | `#22c55e` (verde) |
| Erro | `#ef4444` (vermelho) |
| Aviso | `#fbbf24` (amarelo) |
| Info | `#3b82f6` (azul) |
| Fonte | Outfit (Google Fonts) — pesos 400, 600, 700, 800, 900 |

### Temas por Time (aluno)

```css
body.team-1  /* Azul — Lado 1 */
body.team-2  /* Vermelho — Lado 2 */
```

### Responsividade

| Breakpoint | Grid de mesas |
|---|---|
| > 900px | 6 colunas |
| 500–900px | 3 colunas |
| < 500px | 2 colunas |

### QR Code

- Biblioteca: **qrcodejs** (`cdnjs.cloudflare.com`)
- API: `new QRCode(divElement, { text, width, height, colorDark, colorLight })`
- Renderiza dentro de `<div id="qr-canvas">` (não `<canvas>`) — a library injeta uma `<img>` no elemento

> **Nota:** A CDN `cdn.jsdelivr.net/npm/qrcode` usa API diferente (`QRCode.toCanvas(canvas, url)`) e é incompatível. Usar sempre `cdnjs.cloudflare.com/ajax/libs/qrcodejs`.

---

## Limitações e Decisões de Projeto

### Estado em Memória

Todo o estado do jogo é mantido em memória RAM (`Map` de rooms, `sessionStats`). **Reiniciar o servidor zera tudo.** Isso é intencional para a proposta de uso em sala de aula — cada aula é uma sessão nova.

### Sem Autenticação

Qualquer pessoa na rede local pode acessar tanto a tela do aluno quanto o painel do professor. Isso é aceitável no contexto de uma rede Wi-Fi escolar controlada.

### Sem Banco de Dados

Dados históricos não são persistidos. O relatório PDF é o único registro permanente da sessão.

### jsPDF e Emojis

jsPDF (até versão 2.x) não suporta renderização de caracteres Unicode emoji nativamente. Todo o conteúdo do PDF usa apenas ASCII/Latin-1. Para suporte a emojis no PDF seria necessário embutir uma fonte personalizada.

### Disconnect durante Partida

Se um jogador desconectar durante uma partida em andamento, a mesa é totalmente resetada via `createFreshGame()`. O adversário é redirecionado à tela de seleção de mesas. Esta é uma limitação intencional (simplifica o estado).

### Uma Operação por Mesa

A operação é definida por mesa e não muda durante a partida. No modo "Pai D'égua" (`hybrid`), a operação é sorteada **por problema** — cada questão pode ser de uma operação diferente.

---

## Guia de Uso em Sala de Aula

### Preparação (professor, antes da aula)

1. Ligar o computador e conectá-lo ao Wi-Fi da sala
2. Abrir terminal e executar `npm start` na pasta do projeto
3. Anotar o **endereço de rede** exibido (`http://192.168.X.X:3000`)
4. Abrir `http://localhost:3000/professor` no computador do professor

### Início da Aula

1. Distribuir os Chromebooks (2 por dupla)
2. Clicar em **📱 QR Code para Alunos** para exibir o QR Code
3. Alunos apontam a câmera → acessam o endereço automaticamente

### Durante a Aula

- Professor pode **definir a operação globalmente** para todas as mesas de uma vez
- Professor acompanha o status de cada mesa em tempo real
- Professor pode **reiniciar mesas individuais** se necessário
- O **Ranking Geral** atualiza automaticamente — pode ser exibido no projetor

### Encerramento

1. Clicar em **📄 Criar Relatório**
2. Confirmar — isso zera todas as mesas automaticamente
3. O PDF é baixado automaticamente para a pasta Downloads do navegador
4. Compartilhar/imprimir o relatório para análise pedagógica

---

## Troubleshooting

### Alunos não conseguem acessar o jogo

**Causa:** Professor e alunos não estão na mesma rede Wi-Fi.
**Solução:** Verificar se todos os dispositivos estão conectados ao mesmo roteador.

### QR Code diz "QRCode is not defined"

**Causa:** CDN do qrcodejs não carregou.
**Solução:** Verificar conexão com a internet do computador do professor. A CDN usada é `cdnjs.cloudflare.com`.

### PDF não é gerado / nenhum download aparece

**Causa:** jsPDF não carregou (CDN offline ou bloqueada).
**Solução:** O toast de erro indicará. Verificar conexão. Alternativamente, testar em modo de navegação anônima.

### Vitórias aparecem como "0" no painel do professor

**Causa:** Servidor não foi reiniciado após atualização do código.
**Solução:**
```powershell
Get-Process -Name node | Stop-Process -Force
npm start
```

### Mesa não reinicia após "Criar Relatório"

**Causa:** Servidor desatualizado. Mesma solução acima.

### Jogo reiniciou sozinho no meio de uma partida

**Causa:** Um dos jogadores perdeu conexão. O servidor reseta a mesa automaticamente quando um jogador desconecta durante uma partida ativa.
**Solução:** Alunos se reconectam e entram na mesa novamente.

### Som não toca

**Causa:** Políticas de autoplay do Chrome requerem interação do usuário antes.
**Solução:** `AudioEngine.init()` é chamado ao clicar em uma mesa — qualquer interação resolve.

---

## Créditos

**Desenvolvido por:** Prof. Fábio Fabuloso  
**Instituição:** CISEB Celso Rodrigues — Santo Antônio do Tauá, Pará  
**Ano:** 2026  
**Disciplina:** Matemática — Ensino Fundamental

**Stack:**
- Node.js + Express + Socket.IO (servidor)
- HTML5 + CSS3 + JavaScript puro (cliente)
- Web Audio API (áudio procedural)
- qrcodejs (QR Code)
- jsPDF (geração de PDF)
- Google Fonts — Outfit

---

*"A matemática é a linguagem com a qual Deus escreveu o universo." — Galileu Galilei*
