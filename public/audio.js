/* ═══════════════════════════════════════════════
   CABO DE GUERRA — Audio Engine
   Motor de síntese sonora via Web Audio API
   ═══════════════════════════════════════════════ */

const AudioEngine = (() => {
  let ctx = null;
  let comboCount = 0;

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }

  function playTone({ freq = 440, type = 'sine', start = 0, duration = 0.15,
                      gainPeak = 0.4, attack = 0.01, decay = 0.05, sustain = 0.3, release = 0.1 }) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
    const t = ctx.currentTime + start;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(gainPeak, t + attack);
    gain.gain.linearRampToValueAtTime(gainPeak * sustain, t + attack + decay);
    gain.gain.setValueAtTime(gainPeak * sustain, t + duration - release);
    gain.gain.linearRampToValueAtTime(0, t + duration);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  function playNoise({ start = 0, duration = 0.08, gain = 0.15 }) {
    if (!ctx) return;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(gain, ctx.currentTime + start);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + start + duration);
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    source.start(ctx.currentTime + start);
  }

  function correct() {
    init();
    comboCount++;
    const step = Math.min(comboCount - 1, 4);
    const baseFreqs = [523, 659, 784, 880, 1047];
    const freq = baseFreqs[step];

    playTone({ freq, type: 'sine', duration: 0.25, gainPeak: 0.45, attack: 0.005 });
    playTone({ freq: freq * 2, type: 'triangle', duration: 0.15, gainPeak: 0.15, attack: 0.005 });
    playNoise({ duration: 0.04, gain: 0.1 });

    if (comboCount >= 3) {
      playTone({ freq: freq * 1.5, type: 'sine', start: 0.12, duration: 0.18, gainPeak: 0.2 });
    }
  }

  function wrong() {
    init();
    comboCount = 0;
    playTone({ freq: 200, type: 'sawtooth', duration: 0.18, gainPeak: 0.25, attack: 0.005 });
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(90, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  }

  function gameStart() {
    init();
    comboCount = 0;
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      playTone({ freq, type: 'triangle', start: i * 0.1, duration: 0.15,
                 gainPeak: 0.3, attack: 0.01 });
    });
    playNoise({ start: 0, duration: 0.06, gain: 0.12 });
  }

  function win() {
    init();
    const melody = [
      { freq: 523, start: 0.00 },
      { freq: 659, start: 0.10 },
      { freq: 784, start: 0.20 },
      { freq: 1047, start: 0.30 },
      { freq: 1319, start: 0.40 },
      { freq: 1047, start: 0.55 },
      { freq: 1319, start: 0.70 },
      { freq: 1568, start: 0.85 },
    ];
    melody.forEach(({ freq, start }) => {
      playTone({ freq, type: 'sine', start, duration: 0.22, gainPeak: 0.35, attack: 0.01 });
      playTone({ freq: freq * 2, type: 'triangle', start, duration: 0.12, gainPeak: 0.08 });
    });
    for (let i = 0; i < 5; i++) {
      playNoise({ start: i * 0.04, duration: 0.06, gain: 0.18 });
    }
    [523, 659, 784].forEach((freq, i) => {
      playTone({ freq, type: 'sine', start: 1.0 + i * 0.01,
                 duration: 0.6, gainPeak: 0.25, attack: 0.02, release: 0.4 });
    });
  }

  function lose() {
    init();
    const notes = [392, 330, 262, 196];
    notes.forEach((freq, i) => {
      playTone({ freq, type: 'triangle', start: i * 0.12, duration: 0.18,
                 gainPeak: 0.2, attack: 0.01 });
    });
  }

  function ropePull(direction) {
    init();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    const freqStart = direction < 0 ? 300 : 200;
    const freqEnd   = direction < 0 ? 180 : 320;
    osc.frequency.setValueAtTime(freqStart, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(freqEnd, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.18);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
    playNoise({ duration: 0.1, gain: 0.08 });
  }

  function tension() {
    init();
    playTone({ freq: 110, type: 'square', duration: 0.08, gainPeak: 0.18, attack: 0.005 });
  }

  function lobbyJoin() {
    init();
    playTone({ freq: 880, type: 'sine', duration: 0.12, gainPeak: 0.2, attack: 0.005 });
    playTone({ freq: 1109, type: 'sine', start: 0.1, duration: 0.15, gainPeak: 0.2, attack: 0.005 });
  }

  return { correct, wrong, gameStart, win, lose, ropePull, tension, lobbyJoin, init };
})();
