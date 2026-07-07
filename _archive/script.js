// State and data for the Coffee Roast Quiz

const DRINKS = [
  { key: 'espresso', name: 'Espresso', tagline: 'Zero fluff. All focus.', desc: 'You get things done before the meeting to plan getting things done.', icon: 'espresso' },
  { key: 'flatwhite', name: 'Flat White', tagline: 'Strong, balanced, unbothered.', desc: 'Strong opinions, smooth delivery. Deadlines fear you (politely).', icon: 'flatwhite' },
  { key: 'cappuccino', name: 'Cappuccino', tagline: 'Balanced with a flair.', desc: 'Balanced, bubbly, and a little extra. Meetings are your stage.', icon: 'cappuccino' },
  { key: 'latte', name: 'Latte', tagline: 'Soft power, hard results.', desc: 'You negotiate with foam and somehow always win.', icon: 'latte' },
  { key: 'americano', name: 'Americano', tagline: 'Practical drama-free energy.', desc: 'You call it efficiency; others call it mysterious calm.', icon: 'americano' },
  { key: 'mocha', name: 'Mocha', tagline: 'Sweet tooth, sharp mind.', desc: 'You contain multitudes (and cocoa).', icon: 'mocha' },
  { key: 'coldbrew', name: 'Cold Brew', tagline: 'Chill exterior, rocket fuel interior.', desc: 'Night mode at 9am. We respect the hustle.', icon: 'coldbrew' },
];

// 6 spicy-sarcasm questions, 4 options each.
// Each option maps points to one or more drinks.
const QUESTIONS = [
  {
    id: 'vibe',
    text: "Morning vibe check: what's your energy?",
    options: [
      { label: 'Laser-focused gremlin on a mission', map: { espresso: 2, coldbrew: 1 } },
      { label: 'Calm operator, chaos whisperer', map: { americano: 2, flatwhite: 1 } },
      { label: 'Bubbly but dangerous', map: { cappuccino: 2, mocha: 1 } },
      { label: 'Soft power strategist', map: { latte: 2, flatwhite: 1 } },
    ],
  },
  {
    id: 'deadline',
    text: 'Deadline appears. You…',
    options: [
      { label: 'Finish before anyone notices it exists', map: { espresso: 2, coldbrew: 1 } },
      { label: 'Plan, schedule, execute, nap', map: { americano: 2, flatwhite: 1 } },
      { label: 'Present with sparkle and a flourish', map: { cappuccino: 2, mocha: 1 } },
      { label: 'Charm it into extending itself', map: { latte: 2, mocha: 1 } },
    ],
  },
  {
    id: 'taste',
    text: 'Pick your flavor profile:',
    options: [
      { label: 'Bold and unapologetic', map: { espresso: 2, americano: 1 } },
      { label: 'Smooth and balanced', map: { flatwhite: 2, latte: 1 } },
      { label: 'Foamy and playful', map: { cappuccino: 2, latte: 1 } },
      { label: 'Dark with a secret sweet side', map: { coldbrew: 2, mocha: 1 } },
    ],
  },
  {
    id: 'meeting',
    text: 'In meetings you are…',
    options: [
      { label: 'The sniper: few words, maximum impact', map: { espresso: 2, americano: 1 } },
      { label: 'The chair: calm, collected, on time', map: { flatwhite: 2, americano: 1 } },
      { label: 'The emcee: energy and sparkle', map: { cappuccino: 2, mocha: 1 } },
      { label: 'The diplomat: everyone leaves happy', map: { latte: 2, flatwhite: 1 } },
    ],
  },
  {
    id: 'break',
    text: 'Your break looks like…',
    options: [
      { label: 'Speed run a task for fun', map: { espresso: 2, coldbrew: 1 } },
      { label: 'Walk, water, breathe, repeat', map: { americano: 2, flatwhite: 1 } },
      { label: 'Send a meme that unites the team', map: { cappuccino: 2, mocha: 1 } },
      { label: 'Luxurious sip with a side of plotting', map: { latte: 2, mocha: 1 } },
    ],
  },
  {
    id: 'weekend',
    text: 'Weekend mood:',
    options: [
      { label: 'Early up, personal project mode', map: { espresso: 2, coldbrew: 1 } },
      { label: 'Errands speed-run + chill', map: { americano: 2, flatwhite: 1 } },
      { label: 'Brunch main character', map: { cappuccino: 2, mocha: 1 } },
      { label: 'Cafe crawl and people-watching', map: { latte: 2, flatwhite: 1 } },
    ],
  },
];

// ------- Simple SVG icons per drink (inline path strings) -------
function drinkIconSvg(key) {
  const common = 'stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"';
  switch (key) {
    case 'espresso':
      return `<svg viewBox="0 0 48 48" ${common}><path d="M10 16h24a4 4 0 0 1 4 4v2a10 10 0 0 1-10 10H20A10 10 0 0 1 10 22v-6z"/><path d="M38 20h4"/><path d="M14 34h20"/></svg>`;
    case 'flatwhite':
      return `<svg viewBox="0 0 48 48" ${common}><path d="M12 16h24v6a12 12 0 0 1-12 12h0A12 12 0 0 1 12 22v-6z"/><path d="M16 22c6 6 10 6 16 0"/></svg>`;
    case 'cappuccino':
      return `<svg viewBox="0 0 48 48" ${common}><path d="M8 18h24a6 6 0 0 1 6 6v2a12 12 0 0 1-12 12H20A12 12 0 0 1 8 26v-8z"/><path d="M38 22h4a6 6 0 0 1-6 6"/></svg>`;
    case 'latte':
      return `<svg viewBox="0 0 48 48" ${common}><path d="M16 10h16l-2 24a8 8 0 0 1-8 8h0a8 8 0 0 1-8-8l2-24z"/><path d="M18 18h12"/></svg>`;
    case 'americano':
      return `<svg viewBox="0 0 48 48" ${common}><rect x="12" y="14" width="20" height="20" rx="4"/><path d="M32 20h8a6 6 0 0 1-6 6"/></svg>`;
    case 'mocha':
      return `<svg viewBox="0 0 48 48" ${common}><path d="M12 16h24v6a10 10 0 0 1-10 10H22A10 10 0 0 1 12 22v-6z"/><path d="M18 24c2 0 4-2 6-2s4 2 6 2"/></svg>`;
    case 'coldbrew':
      return `<svg viewBox="0 0 48 48" ${common}><path d="M18 8h12l2 26a8 8 0 0 1-8 8h0a8 8 0 0 1-8-8l2-26z"/><path d="M18 16h12"/></svg>`;
    default:
      return '';
  }
}

// ------- SFX via WebAudio (tiny Halloween-y bleeps) -------
const AudioSFX = (() => {
  let ctx; let muted = true; let unlocked = false;
  function ensureContext() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  function unlock() {
    if (unlocked || !ctx) return;
    const b = ctx.createBuffer(1, 1, 22050); const s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(); unlocked = true;
  }
  function env(source, time = 0.2) {
    const gain = ctx.createGain();
    source.connect(gain); gain.connect(ctx.destination);
    const g = gain.gain; const now = ctx.currentTime;
    g.setValueAtTime(0.0001, now); g.exponentialRampToValueAtTime(0.25, now + 0.01);
    g.exponentialRampToValueAtTime(0.0001, now + time);
  }
  function tone(type, freq, time = 0.2) {
    ensureContext(); if (muted) return;
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    env(o, time); o.start(); o.stop(ctx.currentTime + time);
  }
  function noise(time = 0.18) {
    ensureContext(); if (muted) return;
    const bufferSize = 2 * ctx.sampleRate * time;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = ctx.createBufferSource(); src.buffer = buffer; env(src, time); src.start();
  }
  // Public cues
  function click() { // spooky chime
    ensureContext(); if (muted) return; tone('triangle', 660, 0.09); setTimeout(() => tone('triangle', 440, 0.12), 70);
  }
  function next() { // tiny cackle-ish wobble
    ensureContext(); if (muted) return; tone('square', 520, 0.08); setTimeout(() => tone('square', 580, 0.08), 60); setTimeout(() => noise(0.06), 30);
  }
  function submit() { // cauldron bubble pop
    ensureContext(); if (muted) return; noise(0.12); setTimeout(() => tone('sine', 220, 0.16), 30);
  }
  function share() { // ghostly whoosh
    ensureContext(); if (muted) return; tone('sine', 720, 0.06); setTimeout(() => tone('sine', 420, 0.14), 50);
  }
  function setMuted(v) { ensureContext(); muted = v; if (!unlocked) unlock(); }
  function isMuted() { return muted; }
  function attachUnlock(el) { ensureContext(); ['click','keydown','touchstart'].forEach(evt=> el.addEventListener(evt, unlock, { once: true })); }
  return { click, next, submit, share, setMuted, isMuted, attachUnlock };
})();

// ------- App State -------
const state = {
  currentIndex: 0,
  answers: new Array(QUESTIONS.length).fill(null),
  muted: true,
  mode: 'quiz',
};

// ------- DOM refs -------
const $question = document.getElementById('questionText');
const $options = document.getElementById('options');
const $prev = document.getElementById('prevBtn');
const $next = document.getElementById('nextBtn');
const $submit = document.getElementById('submitBtn');
const $progressBar = document.getElementById('progressBar');
const $progressCount = document.getElementById('progressCount');
const $quizView = document.getElementById('quizView');
const $resultView = document.getElementById('resultView');
const $resultIcon = document.getElementById('resultIcon');
const $resultTitle = document.getElementById('resultTitle');
const $resultTag = document.getElementById('resultTag');
const $resultDesc = document.getElementById('resultDesc');
const $share = document.getElementById('shareBtn');
const $restart = document.getElementById('restartBtn');
const $mute = document.getElementById('muteToggle');

// ------- Init -------
init();

function init() {
  // Audio
  const savedMuted = localStorage.getItem('coffee-quiz-muted');
  state.muted = savedMuted ? savedMuted === 'true' : true;
  AudioSFX.setMuted(state.muted);
  updateMuteButton();
  AudioSFX.attachUnlock(document.body);

  // If result in URL, show directly
  const url = new URL(window.location.href);
  const resultKey = url.searchParams.get('result');
  if (resultKey) {
    const drink = DRINKS.find(d => d.key === resultKey);
    if (drink) { renderResult(drink); return; }
  }
  renderQuestion();
  bindEvents();
}

function bindEvents() {
  $prev.addEventListener('click', () => { if (state.currentIndex > 0) { state.currentIndex--; renderQuestion(); } });
  $next.addEventListener('click', () => { if (state.currentIndex < QUESTIONS.length - 1) { state.currentIndex++; renderQuestion(); AudioSFX.next(); } });
  $submit.addEventListener('click', () => { const drink = computeResult(); renderResult(drink); AudioSFX.submit(); });
  $share.addEventListener('click', handleShare);
  $restart.addEventListener('click', restart);
  $mute.addEventListener('click', () => { state.muted = !state.muted; localStorage.setItem('coffee-quiz-muted', String(state.muted)); AudioSFX.setMuted(state.muted); updateMuteButton(); });
}

function updateMuteButton() {
  $mute.setAttribute('aria-pressed', String(!state.muted));
  $mute.innerHTML = state.muted ? '<span class="icon-sound-off"></span>' : '<span class="icon-sound-on"></span>';
}

function renderQuestion() {
  state.mode = 'quiz';
  const q = QUESTIONS[state.currentIndex];
  $quizView.hidden = false; $resultView.hidden = true;
  $question.textContent = q.text;
  $options.innerHTML = '';
  q.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.setAttribute('role', 'listitem');
    btn.setAttribute('aria-pressed', String(state.answers[state.currentIndex] === idx));
    btn.innerHTML = `<span>${opt.label}</span>`;
    btn.addEventListener('click', () => {
      state.answers[state.currentIndex] = idx; markSelection(); AudioSFX.click();
      // Auto-advance if not last
      if (state.currentIndex < QUESTIONS.length - 1) { setTimeout(() => { state.currentIndex++; renderQuestion(); }, 120); }
      else { updateNav(); }
    });
    $options.appendChild(btn);
  });
  markSelection();
  updateNav();
  updateProgress();
}

function markSelection() {
  const children = Array.from($options.children);
  children.forEach((el, i) => el.setAttribute('aria-pressed', String(state.answers[state.currentIndex] === i)));
}

function updateNav() {
  const last = state.currentIndex === QUESTIONS.length - 1;
  const hasAnswer = state.answers[state.currentIndex] != null;
  $prev.disabled = state.currentIndex === 0;
  $next.hidden = last;
  $submit.hidden = !last;
  $next.disabled = !hasAnswer;
  $submit.disabled = !hasAnswer;
}

function updateProgress() {
  const answered = state.answers.filter(v => v != null).length;
  const pct = Math.round((state.currentIndex + 1) / QUESTIONS.length * 100);
  $progressBar.style.width = `${pct}%`;
  $progressCount.textContent = `${answered}/${QUESTIONS.length}`;
}

function computeResult() {
  const scores = Object.fromEntries(DRINKS.map(d => [d.key, 0]));
  state.answers.forEach((ansIdx, qIdx) => {
    const opt = QUESTIONS[qIdx].options[ansIdx];
    Object.entries(opt.map).forEach(([k, v]) => { scores[k] += v; });
  });
  // tie-breaker: count first-choice hits then fixed priority order
  const firstChoiceHits = Object.fromEntries(DRINKS.map(d => [d.key, 0]));
  state.answers.forEach((ansIdx, qIdx) => {
    const opt = QUESTIONS[qIdx].options[ansIdx];
    const max = Math.max(...Object.values(opt.map));
    Object.entries(opt.map).forEach(([k, v]) => { if (v === max) firstChoiceHits[k]++; });
  });
  const priority = DRINKS.map(d => d.key);
  const winnerKey = Object.keys(scores).sort((a, b) => {
    if (scores[b] !== scores[a]) return scores[b] - scores[a];
    if (firstChoiceHits[b] !== firstChoiceHits[a]) return firstChoiceHits[b] - firstChoiceHits[a];
    return priority.indexOf(a) - priority.indexOf(b);
  })[0];
  return DRINKS.find(d => d.key === winnerKey);
}

function renderResult(drink) {
  state.mode = 'result';
  $quizView.hidden = true; $resultView.hidden = false;
  $resultIcon.innerHTML = drinkIconSvg(drink.icon);
  $resultTitle.textContent = `You are a ${drink.name}`;
  $resultTag.textContent = drink.tagline;
  $resultDesc.textContent = drink.desc;
  // Update URL with result key
  const url = new URL(window.location.href); url.searchParams.set('result', drink.key); history.replaceState({}, '', url);
}

async function handleShare() {
  const url = new URL(window.location.href).toString();
  try {
    await navigator.clipboard.writeText(url);
    $share.textContent = 'Link copied';
    setTimeout(() => ($share.textContent = 'Share this roast'), 1200);
    AudioSFX.share();
  } catch {
    // Fallback: open share sheet if available
    if (navigator.share) {
      try { await navigator.share({ title: 'Coffee Roast Quiz', url }); } catch {}
    }
  }
}

function restart() {
  state.currentIndex = 0; state.answers = new Array(QUESTIONS.length).fill(null);
  const url = new URL(window.location.href); url.searchParams.delete('result'); history.replaceState({}, '', url);
  renderQuestion();
}



