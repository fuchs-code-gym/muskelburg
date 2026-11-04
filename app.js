'use strict';

/* =========================================================
   Hantelhelden – Jagd auf den Schweinehund
   Ihr jagt gemeinsam den inneren Schweinehund. Jedes Training ist ein Treffer,
   jeder faule Tag lässt ihn heilen. Spielregeln – hier lässt sich alles anpassen.
   ========================================================= */

const STATS = {
  str:  { name: 'Kraft',    icon: '💪', color: '#ff5a1f' },
  end:  { name: 'Ausdauer', icon: '🫀', color: '#2f6fed' },
  mind: { name: 'Geist',    icon: '🧠', color: '#8e6bd8' },
};
const BASE_STAT = 10;

// Training: type = Schadensart, base = Grundschaden, gives = Wertepunkte für den Helden
const ACTIVITIES = [
  { id: 'milon',  name: 'Milon-Zirkel',       unit: '1 Durchgang · ca. 10 Min.',        icon: '🔁', type: 'str',  base: 100, gives: { str: 3, end: 1 }, perDay: 6, pr: true },
  { id: 'frei',   name: 'Freies Training',    unit: '15 Min. Geräte oder Hanteln',      icon: '🏋️', type: 'str',  base: 80,  gives: { str: 2, end: 1 }, perDay: 4, pr: true },
  { id: 'cardio', name: 'Rad / Crosstrainer', unit: '10 Min.',                          icon: '🚴', type: 'end',  base: 50,  gives: { end: 2 },         perDay: 6 },
  { id: 'kurs',   name: 'Kurs',               unit: 'Yoga, Pilates, Rücken … · 1× am Tag', icon: '🧘', type: 'mind', base: 120, gives: { mind: 4, end: 1 }, perDay: 1, course: true },
  { id: 'dehnen', name: 'Dehnen & Mobility',  unit: '10 Min. · bis 2× am Tag',           icon: '🤸', type: 'mind', base: 50,  gives: { mind: 2 },        perDay: 2 },
];
const COURSES = [
  { id: 'yoga', name: 'Yoga', icon: '🧘' }, { id: 'pilates', name: 'Pilates', icon: '🤸' },
  { id: 'ruecken', name: 'Rücken', icon: '🦴' }, { id: 'spinning', name: 'Spinning', icon: '🚲' },
  { id: 'sonstiges', name: 'Sonstiges', icon: '✨' },
];
// Gesund gelebt: je +5 % Schaden auf die Trainings des Tages
const HEALTH = [
  { id: 'schlaf', name: 'Gut geschlafen', icon: '😴' },
  { id: 'essen',  name: 'Gesund gegessen', icon: '🥗' },
  { id: 'wasser', name: 'Genug getrunken', icon: '💧' },
];
const HEALTH_BONUS = 0.05;

// Schaden
const PR_MULT = 2.5;          // Neuer Rekord (Gewicht erhöht) = Volltreffer, 1× am Tag
const CRIT_MULT = 1.5;        // kritischer Treffer (Chance wächst mit Geist)
const CHEER_MULT = 1.25;      // vom Partner angefeuert
const COMEBACK_MULT = 1.25;   // wer in der Saison deutlich weniger Schaden hat
const DAY_FALLOFF = [1, 1, 1, 0.6, 0.6, 0.3]; // 1.–3. Einheit am Tag voll, danach weniger – Regeneration zählt

// Saison: der Schweinehund
const SEASON_DAYS = 42;
const BOSS_HP = 10000, BOSS_REGEN = 250, CHAPTER_GROWTH = 1.3; // je Kapitel 30 % stärker
const MONSTER_HP = 1800;
const MONSTERS = [
  { id: 'kobold', name: 'Keine-Zeit-Kobold', icon: '⏰', quote: '„Heute passt es echt nicht …“' },
  { id: 'sofa',   name: 'Sofa-Golem',        icon: '🛋️', quote: '„Bleib doch noch fünf Minuten liegen.“' },
  { id: 'regen',  name: 'Regen-Wicht',       icon: '🌧️', quote: '„Bei dem Wetter? Echt jetzt?“' },
  { id: 'pizza',  name: 'Pizza-Dämon',       icon: '🍕', quote: '„Eine geht noch …“' },
  { id: 'handy',  name: 'Handy-Hypnotiseur', icon: '📱', quote: '„Nur noch ein Video …“' },
  { id: 'muffel', name: 'Morgenmuffel',      icon: '😴', quote: '„Morgen. Ganz bestimmt.“' },
];

// Energie für Sparring – gibt es nur durchs Training
const ENERGY_MAX = 5, ENERGY_START = 2;
const CHALLENGE_H = 12;
const CHALLENGER_BONUS = 0.1;
const LUCK_MIN = 0.75, LUCK_SPAN = 0.5;
const CHEER_H = 24;

// Taktiken im Sparring: jede schlägt eine andere, jede nutzt einen anderen Wert
const TACTICS = {
  A: { name: 'Auf Distanz', icon: '🏃', stat: 'end',  beats: 'C' },
  B: { name: 'Finte',       icon: '🥷', stat: 'mind', beats: 'A' },
  C: { name: 'Ansturm',     icon: '💥', stat: 'str',  beats: 'B' },
};
const TACTIC_OF = { str: 'C', end: 'A', mind: 'B' };
const T_WIN = 1.5, T_LOSE = 0.7;
const FLAVOR = {
  AC: 'tänzelt dem Ansturm aus und kontert aus der Bewegung', CB: 'stürmt durch die Finte, bevor sie wirkt',
  BA: 'lockt den Läufer mit einer Finte in die Ecke', AA: 'Ausdauerduell – wer länger durchhält, gewinnt',
  BB: 'Taktik gegen Taktik – der klügere Kopf gewinnt', CC: 'Schlagabtausch – rohe Kraft entscheidet',
};

// Beute aus dem Spind: Vorlagen × Seltenheit
const SLOTS = { weapon: 'Kampfgerät', armor: 'Outfit', trinket: 'Gadget' };
const GEAR = [
  { id: 'boxhandschuhe', slot: 'weapon',  icon: '🥊', name: 'Boxhandschuhe',     type: 'str' },
  { id: 'medizinball',   slot: 'weapon',  icon: '🏐', name: 'Medizinball',       type: 'str' },
  { id: 'springseil',    slot: 'weapon',  icon: '🪢', name: 'Speed-Springseil',  type: 'end' },
  { id: 'laufschuhe',    slot: 'weapon',  icon: '👟', name: 'Carbon-Laufschuhe', type: 'end' },
  { id: 'kopfhoerer',    slot: 'weapon',  icon: '🎧', name: 'Fokus-Kopfhörer',   type: 'mind' },
  { id: 'tablet',        slot: 'weapon',  icon: '📱', name: 'Analyse-Tablet',    type: 'mind' },
  { id: 'shirt',         slot: 'armor',   icon: '👕', name: 'Funktionsshirt',    type: 'all' },
  { id: 'kompression',   slot: 'armor',   icon: '🦺', name: 'Kompressionsanzug', type: 'all' },
  { id: 'champion',      slot: 'armor',   icon: '🥋', name: 'Kampfanzug',        type: 'all' },
  { id: 'cap',           slot: 'trinket', icon: '🧢', name: 'Glücks-Cap',        type: 'crit' },
  { id: 'smartwatch',    slot: 'trinket', icon: '⌚', name: 'Smartwatch',        type: 'scan' },
  { id: 'shake',         slot: 'trinket', icon: '🥤', name: 'Protein-Shaker',    type: 'all' },
  { id: 'medaille',      slot: 'trinket', icon: '🏅', name: 'Siegermedaille',    type: 'all' },
];
const RARITY = [
  { id: 'common',    name: 'Gewöhnlich', color: '#9aa1ab', weight: 58, power: 4 },
  { id: 'rare',      name: 'Selten',     color: '#2f6fed', weight: 28, power: 8 },
  { id: 'epic',      name: 'Episch',     color: '#8e6bd8', weight: 11, power: 13 },
  { id: 'legendary', name: 'Legendär',   color: '#f2b233', weight: 3,  power: 20 },
];
const INV_MAX = 24;

// Talente: Meilensteine je Wert, schalten echte Effekte frei
const TALENTS = [
  { stat: 'str',  at: 25, icon: '🔨', name: 'Wuchtschlag',  desc: '+15 % Kraft-Schaden' },
  { stat: 'str',  at: 50, icon: '🏆', name: 'Rekordjäger',  desc: 'Volltreffer ×3 statt ×2,5' },
  { stat: 'end',  at: 25, icon: '🌬️', name: 'Zweiter Atem', desc: 'Combo wächst doppelt so schnell' },
  { stat: 'end',  at: 50, icon: '🏁', name: 'Marathon',     desc: '+25 % Ausdauer-Schaden' },
  { stat: 'mind', at: 25, icon: '🎯', name: 'Fokus',        desc: '+10 % Chance auf kritische Treffer' },
  { stat: 'mind', at: 50, icon: '🧘', name: 'Seelenruhe',   desc: 'Der Schweinehund heilt sich nur halb so stark' },
];

const RANKS = [
  { min: 0, icon: '🔰', name: 'Einsteiger' }, { min: 15, icon: '🥉', name: 'Fortgeschritten' }, { min: 40, icon: '🥈', name: 'Athlet' },
  { min: 80, icon: '🥇', name: 'Eisenathlet' }, { min: 150, icon: '💎', name: 'Profi' },
  { min: 300, icon: '🏆', name: 'Stahlkörper' }, { min: 500, icon: '👑', name: 'Legende aus Stahl' },
];
const BADGES = [
  { icon: '🌱', name: 'Erster Treffer',   desc: '1 Training',               test: l => l.sessions >= 1 },
  { icon: '💪', name: 'Dranbleiber',      desc: '50 Trainings',             test: l => l.sessions >= 50 },
  { icon: '📅', name: 'Stammgast',        desc: '30 Trainingstage',         test: l => l.days >= 30 },
  { icon: '🏆', name: 'Rekordjäger',      desc: '10 neue Rekorde',          test: l => l.prs >= 10 },
  { icon: '🔥', name: 'Volle Combo',      desc: '6 Trainingstage in 7 Tagen', test: l => l.bestCombo >= 6 },
  { icon: '👹', name: 'Ausreden-Jäger',   desc: '5 Wochenmonster besiegt', test: l => l.monsters >= 5 },
  { icon: '🐷', name: 'Schweinehund-Bezwinger', desc: 'Schweinehund besiegt', test: l => l.bossKills >= 1 },
  { icon: '👑', name: 'MVP',              desc: '3× Wochen-MVP',            test: l => l.crowns >= 3 },
  { icon: '🌟', name: 'Legendär',         desc: 'legendäre Beute gefunden', test: l => l.legendaries >= 1 },
  { icon: '🥊', name: 'Sparring-Ass',     desc: '5 Sparrings gewonnen',     test: l => l.wins >= 5 },
  { icon: '📣', name: 'Motivator',        desc: '10× angefeuert',           test: l => l.cheers >= 10 },
];

/* =========================================================
   Zustand & Speichern
   ========================================================= */

const DEVICE = new URLSearchParams(location.search).get('geraet') || '';
const KEY = 'hantelhelden-v1' + DEVICE;
const GAME_KEY = 'hantelhelden-game-v1' + DEVICE;
const DAY_MS = 86400000, H_MS = 3600e3;

function todayStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addDays(day, n) { const d = new Date(day + 'T12:00'); d.setDate(d.getDate() + n); return todayStr(d); }
function daysBetween(a, b) { return Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / DAY_MS); }
function rid() { return Math.random().toString(36).slice(2, 12); }

function newLife() {
  return { sessions: 0, days: 0, prs: 0, bestCombo: 0, monsters: 0, bossKills: 0, crowns: 0, legendaries: 0,
    wins: 0, duels: 0, cheers: 0 };
}
function newHero(name) {
  return {
    name, stats: { str: BASE_STAT, end: BASE_STAT, mind: BASE_STAT }, xp: 0, energy: ENERGY_START,
    counts: { milon: 0, frei: 0, cardio: 0, kurs: 0, dehnen: 0 },
    dmg: {},              // Datum → Schaden an diesem Tag
    inv: [], equip: { weapon: null, armor: null, trinket: null }, tactics: ['C', 'A', 'B'],
    life: newLife(), log: [], reports: [], outgoing: [], incoming: [],
    cheer: null, cheerSent: null, claimed: {}, resetId: null, updatedAt: 0,
  };
}
function freshState() {
  return {
    v: 1, current: 'a', players: { a: newHero('Spieler 1'), b: newHero('Spieler 2') },
    season: { no: 1, chapter: 1, start: todayStr(), result: null }, hall: [], pact: '', resetId: rid(),
  };
}

const asList = x => Array.isArray(x) ? x.filter(Boolean) : x ? Object.values(x) : [];
function normalizeHero(p, name = '') {
  const fresh = newHero(name);
  p = { ...fresh, ...p };
  for (const k of ['stats', 'counts', 'equip', 'life']) p[k] = { ...fresh[k], ...p[k] };
  for (const k of ['dmg', 'claimed']) p[k] = p[k] || {};
  p.tactics = asList(p.tactics).length === 3 ? asList(p.tactics) : fresh.tactics;
  for (const k of ['inv', 'log', 'reports', 'outgoing', 'incoming']) p[k] = asList(p[k]);
  for (const r of p.reports) r.rounds = asList(r.rounds);
  for (const d of [...p.outgoing, ...p.incoming]) d.tactics = asList(d.tactics);
  for (const e of p.log) { e.mults = asList(e.mults); e.got = e.got || {}; }
  return p;
}
function normalizeMeta(s) {
  s.season = { no: 1, chapter: 1, start: todayStr(), result: null, ...s.season };
  s.hall = asList(s.hall);
  s.pact = s.pact || '';
  s.stake = s.stake || '';
  s.resetId = s.resetId || rid();
  return s;
}
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.v === 1) {
      for (const id in s.players) s.players[id] = normalizeHero(s.players[id]);
      return normalizeMeta(s);
    }
  } catch (e) { /* kaputter Speicher → neues Spiel */ }
  return freshState();
}
function save() {
  if (online()) state.players[game.me].updatedAt = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignorieren */ }
  pushMine();
}

let state = load();
let tab = 'jagd';
let duelPick = [], answering = null, duelOpen = false, freshReport = null;
let pending = null;       // Training, das gerade eingetragen wird (Minispiel)
let hitShow = null;       // Ergebnis-Anzeige nach dem Treffer
let prOn = false;         // „Neuer Rekord“ angehakt
const me = () => state.players[state.current];

/* =========================================================
   Online-Spiel: jedes Handy schreibt nur seinen eigenen Helden.
   Der Schweinehund wird aus dem Schaden beider Helden berechnet – so gibt es nie Streit um seine Lebenspunkte.
   ========================================================= */

let game = null;
try { game = JSON.parse(localStorage.getItem(GAME_KEY)); } catch (e) { /* kein Spiel */ }
let sync = null, connected = false;
const online = () => !!(game && game.id);
const ownIds = () => online() ? [game.me] : Object.keys(state.players);
const mine = () => ownIds().map(id => state.players[id]);
const partnerOf = p => Object.values(state.players).find(x => x !== p);
if (online()) state.current = game.me;
state.outbox = state.outbox || [];

function saveGame(g) { game = g; try { localStorage.setItem(GAME_KEY, JSON.stringify(g)); } catch (e) { /* ignorieren */ } }
const clean = x => JSON.parse(JSON.stringify(x));

function pushMine() {
  if (!online() || !sync) return;
  sync.setPlayer(game.id, game.me, clean(state.players[game.me]));
  flushOutbox();
}
function flushOutbox() {
  if (!online() || !sync) return;
  while (state.outbox.length) {
    const o = state.outbox.shift();
    if (o.meta) sync.updateMeta(game.id, clean(o.meta));
    else sync.sendEvent(game.id, o.to, clean(o.ev));
  }
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignorieren */ }
}
function metaSet(patch) { if (!online()) return; state.outbox.push({ meta: patch }); flushOutbox(); }
function sendEvent(pid, ev) {
  if (ownIds().includes(pid)) { applyEvent(state.players[pid], ev); return; }
  state.outbox.push({ to: pid, ev });
  flushOutbox();
}

function applyEvent(p, ev) {
  if (ev.kind === 'challenge') {
    if (!p.incoming.some(d => d.id === ev.duel.id)) {
      p.incoming.push(ev.duel);
      if (p === me()) toast(`🥊 ${ev.duel.fromName} fordert dich zum Sparring!`, true);
    }
  } else if (ev.kind === 'result') {
    if (ev.defSide) finishDefense(p, ev.result); else finishChallenge(p, ev.result);
  } else if (ev.kind === 'cheer') {
    p.cheer = { from: ev.from, until: Date.now() + CHEER_H * H_MS };
    if (p === me()) toast(`📣 ${ev.from} feuert dich an! Nächstes Training +25 % Schaden`, true);
  }
}

function reconcileOwn() {
  let changed = false;
  for (const id of ownIds()) {
    const p = state.players[id];
    if (p.resetId && p.resetId !== state.resetId) { state.players[id] = normalizeHero({ name: p.name }); changed = true; }
    if (state.players[id].resetId !== state.resetId) { state.players[id].resetId = state.resetId; changed = true; }
  }
  return changed;
}
function otherFromRemote(data, name) {
  if (!data) return normalizeHero({ name });
  const p = normalizeHero(data);
  return p.resetId && p.resetId !== state.resetId ? normalizeHero({ name: p.name }) : p;
}

const syncHandlers = {
  connection(ok) { connected = ok; renderSyncDot(); },
  meta(m) {
    if (!m) return;
    Object.assign(state, normalizeMeta({ season: m.season, hall: m.hall, pact: m.pact, stake: m.stake, resetId: m.resetId }));
    resolveAll();
    render();
  },
  player(pid, data, first) {
    if (pid === game.me) {
      if (data && data.updatedAt > (state.players[pid].updatedAt || 0)) {
        state.players[pid] = normalizeHero(data);
        try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignorieren */ }
        if (!first) toast('🔄 Dein Held wurde von deinem anderen Gerät aktualisiert');
        render();
      } else if (first) pushMine();
      return;
    }
    const before = state.players[pid] ? seasonDamage(state.players[pid]) : 0;
    state.players[pid] = otherFromRemote(data, pid === 'a' ? 'Spieler 1' : 'Spieler 2');
    const gained = seasonDamage(state.players[pid]) - before;
    if (!first && gained > 0 && !hitShow) toast(`⚡ ${state.players[pid].name} trifft den Schweinehund: −${num(gained)}!`);
    render();
  },
  event(key, ev) { applyEvent(me(), ev); sync.removeEvent(game.id, game.me, key); save(); render(); },
};
function startSync() {
  if (!online() || !window.MB_SYNC || sync) return;
  sync = window.MB_SYNC;
  sync.watch(game.id, game.me, syncHandlers);
  flushOutbox();
}
window.addEventListener('mb-sync-ready', startSync);

/* ---------- Spiel erstellen / beitreten ---------- */

function inviteLink() { return `${location.origin}${location.pathname}#jagd=${game.id}`; }
const setupName = () => (document.getElementById('setup-name').value || '').trim().slice(0, 20);
let setupStep = null, joinInfo = null;
let joinId = (location.hash.match(/jagd=([a-z0-9]+)/) || [])[1] || null;
// Spielanleitung: beim allerersten Start automatisch zeigen
const INTRO_KEY = 'hantelhelden-intro-v1' + DEVICE;
let introPage = null;
try { if (!localStorage.getItem(INTRO_KEY)) introPage = 0; } catch (e) { introPage = 0; }
if (joinId && game && game.id === joinId) { joinId = null; history.replaceState(null, '', location.pathname + location.search); }

// Startcode: Nur wer ihn kennt, kann ein neues Spiel anlegen (Einladungslinks funktionieren ohne Code)
const START_CODE_HASH = '19c1ed8cbe065bf3d09d5d278d0e83b8dbf53ec39bc3c45f1b27737fafc790ce';
async function codeOk() {
  const el = document.getElementById('setup-code');
  const v = (el ? el.value : '').trim().toLowerCase();
  if (!v) { toast('🔒 Bitte den Startcode eingeben'); return false; }
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v));
    const hex = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    if (hex === START_CODE_HASH) return true;
  } catch (e) { /* ohne Verschlüsselung kein Start */ }
  toast('🔒 Falscher Startcode');
  return false;
}

// Einsatz: Fällt der Schweinehund nicht, gibt der mit weniger Schaden etwas aus
const STAKES = ['🥙 Döner', '🥤 Protein-Shake', '☕ Kaffee', '🍦 Eis'];
let setupStake = STAKES[0];
function stakeLoser() {
  const ps = Object.values(state.players);
  if (ps.length < 2) return null;
  const [top, low] = [...ps].sort((x, y) => seasonDamage(y) - seasonDamage(x));
  if (seasonDamage(top) === seasonDamage(low)) return null;
  return { payer: low, winner: top };
}
function setStake() {
  const v = prompt('Euer Einsatz: Was gibt der mit weniger Schaden aus, wenn der Schweinehund überlebt? (z. B. 🥙 Döner, 🥤 Protein-Shake)', state.stake || '');
  if (v === null) return;
  state.stake = v.trim().slice(0, 60);
  metaSet({ stake: state.stake });
  save();
  render();
}

async function createGame() {
  const name = setupName();
  if (!name) { toast('Gib zuerst deinen Namen ein'); return; }
  if (!(await codeOk())) return;
  if (!window.MB_SYNC) { toast('Keine Verbindung – bitte mit Internet versuchen'); return; }
  state = freshState();
  state.stake = setupStake;
  state.players.a.name = name;
  state.outbox = [];
  saveGame({ id: rid() + rid(), me: 'a' });
  state.current = 'a';
  reconcileOwn();
  await window.MB_SYNC.createGame(game.id, clean({ season: state.season, hall: [], pact: '', stake: state.stake, resetId: state.resetId }));
  save();
  startSync();
  setupStep = 'invite';
  render();
}
async function joinGame(pid) {
  const snap = joinInfo;
  const existing = snap && snap.players && snap.players[pid] && snap.players[pid].updatedAt ? snap.players[pid] : null;
  const name = setupName();
  if (!name && !existing) { toast('Gib zuerst deinen Namen ein'); return; }
  saveGame({ id: joinId, me: pid });
  joinId = null;
  history.replaceState(null, '', location.pathname + location.search);
  state = freshState();
  state.current = pid;
  state.outbox = [];
  if (snap && snap.meta) Object.assign(state, normalizeMeta(snap.meta));
  state.players[pid] = existing ? normalizeHero(existing) : normalizeHero({ name });
  for (const o of Object.keys(state.players)) {
    if (o !== pid) state.players[o] = otherFromRemote(snap && snap.players && snap.players[o], o === 'a' ? 'Spieler 1' : 'Spieler 2');
  }
  reconcileOwn();
  save();
  startSync();
  toast(`🐷 Willkommen bei der Jagd, ${me().name}!`, true);
  render();
}
async function playLocal() {
  if (!(await codeOk())) return;
  saveGame({ local: true }); state.stake = setupStake; save(); setupStep = null; render();
}
async function shareInvite() {
  const url = inviteLink();
  try { if (navigator.share) { await navigator.share({ title: 'Hantelhelden', text: 'Hilf mir, den inneren Schweinehund zu jagen! 🐷💪', url }); return; } } catch (e) { /* abgebrochen */ }
  try { await navigator.clipboard.writeText(url); toast('🔗 Link kopiert'); } catch (e) { prompt('Diesen Link schicken:', url); }
}
function leaveGame() {
  if (!confirm('Dieses Gerät vom Spiel abmelden? Dein Held bleibt online gespeichert – mit dem Einladungslink kommst du wieder rein.')) return;
  try { localStorage.removeItem(GAME_KEY); localStorage.removeItem(KEY); } catch (e) { /* ignorieren */ }
  location.reload();
}
async function loadJoinInfo() {
  if (!window.MB_SYNC) { window.addEventListener('mb-sync-ready', loadJoinInfo, { once: true }); return; }
  try { joinInfo = (await window.MB_SYNC.getGame(joinId)) || { missing: true }; } catch (e) { joinInfo = { error: true }; }
  render();
}

/* =========================================================
   Regeln
   ========================================================= */

const sum = o => Object.values(o).reduce((a, b) => a + b, 0);
const byId = (list, id) => list.find(x => x.id === id);
const num = n => Math.round(n).toLocaleString('de-DE');
function hash01(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  h ^= h >>> 15; h = Math.imul(h, 2246822507); h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}
function levelOf(p) { return 1 + Math.floor(Math.sqrt(p.xp / 4)); }
function xpFor(level) { return 4 * (level - 1) ** 2; }
function rankOf(life) { return [...RANKS].reverse().find(r => life.sessions >= r.min); }
function nextRank(life) { return RANKS.find(r => r.min > life.sessions); }
function earnedBadges(life) { return BADGES.filter(b => b.test(life)); }
function idOf(p) { return Object.keys(state.players).find(id => state.players[id] === p); }
function weekKey(d = new Date()) { const x = new Date(d); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return todayStr(x); }
const hasTalent = (p, stat, at) => p.stats[stat] >= at;

function doneToday(p, id) { return p.log.filter(e => e.kind === 'train' && e.id === id && e.day === todayStr()).length; }
function sessionsToday(p) { return p.log.filter(e => e.kind === 'train' && e.day === todayStr()).length; }
function healthToday(p) { return p.log.filter(e => e.kind === 'health' && e.day === todayStr()).map(e => e.id); }
function prToday(p) { return p.log.some(e => e.kind === 'train' && e.pr && e.day === todayStr()); }

// Combo: Trainingstage in den letzten 7 Tagen (Ruhetage sind erlaubt und brechen nichts)
function comboDays(p) {
  let n = 0;
  for (let i = 0; i < 7; i++) if (p.dmg[addDays(todayStr(), -i)]) n++;
  return n;
}
function comboMult(p, extraToday = false) {
  let days = comboDays(p);
  if (extraToday && !p.dmg[todayStr()]) days++;
  const step = hasTalent(p, 'end', 25) ? 0.2 : 0.1;
  return Math.min(1.5, 1 + step * Math.max(0, days - 1));
}

/* ---------- Saison & Schweinehund ---------- */

const chapterF = () => CHAPTER_GROWTH ** (state.season.chapter - 1);
const seasonEnd = () => addDays(state.season.start, SEASON_DAYS);
const inSeason = day => day >= state.season.start && day < seasonEnd();
// Schaden eines Tages – am Starttag zählt nur, was nach dem Saisonstart dazukam
function dayDmg(p, d) {
  const carry = d === state.season.start && state.season.carry ? state.season.carry[idOf(p)] || 0 : 0;
  return Math.max(0, (p.dmg[d] || 0) - carry);
}
function seasonDamage(p) { return sum(Object.keys(p.dmg).filter(inSeason).map(d => dayDmg(p, d))); }
function weekDamage(p, wk = weekKey()) {
  return sum(Object.keys(p.dmg).filter(d => d >= wk && d < addDays(wk, 7) && inSeason(d)).map(d => dayDmg(p, d)));
}
function bossMax() { return Math.round(BOSS_HP * chapterF()); }
// Lebenspunkte: Maximum − Schaden beider + Heilung an Tagen, an denen niemand trainiert hat
function bossState() {
  const max = bossMax();
  const players = Object.values(state.players);
  const half = players.some(p => hasTalent(p, 'mind', 50));
  const regen = Math.round(BOSS_REGEN * chapterF() * (half ? 0.5 : 1));
  const last = state.season.result ? state.season.result.day : todayStr();
  let hp = max, lazy = 0;
  for (let d = state.season.start; d <= last && d < seasonEnd(); d = addDays(d, 1)) {
    const dealt = sum(players.map(p => dayDmg(p, d)));
    if (!dealt && d < todayStr()) { lazy++; hp = Math.min(max, hp + regen); }
    hp -= dealt;
  }
  return { hp: Math.max(0, Math.round(hp)), max, regen, lazy };
}
function monsterOfWeek(wk = weekKey()) {
  const i = Math.max(0, Math.floor(daysBetween(state.season.start, wk) / 7) + state.season.no) % MONSTERS.length;
  const m = MONSTERS[i];
  const max = Math.round(MONSTER_HP * chapterF());
  const dealt = sum(Object.values(state.players).map(p => weekDamage(p, wk)));
  return { ...m, max, hp: Math.max(0, max - dealt), wk };
}
function daysLeft() { return Math.max(0, daysBetween(todayStr(), seasonEnd())); }

// Saisonende: Schweinehund besiegt oder Zeit abgelaufen
function checkSeason() {
  if (state.season.result) return false;
  const b = bossState();
  if (b.hp <= 0) state.season.result = { won: true, day: todayStr() };
  else if (todayStr() >= seasonEnd()) state.season.result = { won: false, day: addDays(seasonEnd(), -1) };
  else return false;
  metaSet({ 'season/result': state.season.result });
  return true;
}

// Belohnungen abholen: Wochenmonster, Schweinehund, MVP-Krone der Vorwoche
function claimRewards(p) {
  let changed = false;
  const mon = monsterOfWeek();
  if (mon.hp <= 0 && !p.claimed['m' + state.season.no + mon.wk]) {
    p.claimed['m' + state.season.no + mon.wk] = true;
    p.life.monsters++;
    const item = dropLoot(p, 2);
    if (p === me()) queueReveal({ title: `${mon.icon} ${mon.name} besiegt!`, item });
    changed = true;
  }
  const res = state.season.result;
  if (res && res.won && !p.claimed['s' + state.season.no]) {
    p.claimed['s' + state.season.no] = true;
    p.life.bossKills++;
    const item = dropLoot(p, 3);
    if (p === me()) queueReveal({ title: '🐷 Der Schweinehund ist besiegt!', item });
    changed = true;
  }
  const last = addDays(weekKey(), -7);
  if (!p.claimed['c' + last] && (inSeason(last) || inSeason(addDays(last, 6)))) {
    p.claimed['c' + last] = true;
    const mineW = weekDamage(p, last), other = partnerOf(p) ? weekDamage(partnerOf(p), last) : 0;
    if (mineW > 0 && mineW >= other) { p.life.crowns++; if (p === me()) toast('👑 Du warst letzte Woche MVP!', true); }
    changed = true;
  }
  return changed;
}

function resolveAll() {
  if (!game) return false;
  let changed = reconcileOwn();
  changed = checkSeason() || changed;
  for (const p of mine()) {
    changed = claimRewards(p) || changed;
    changed = expireDuels(p) || changed;
    if (p.cheer && p.cheer.until < Date.now()) { p.cheer = null; changed = true; }
  }
  if (changed) save();
  return changed;
}

/* ---------- Beute ---------- */

function rollRarity(minIndex = 0) {
  const pool = RARITY.slice(minIndex);
  let r = Math.random() * sum(pool.map(x => x.weight));
  for (const x of pool) if ((r -= x.weight) < 0) return x;
  return pool[0];
}
function dropLoot(p, minRarity = 0) {
  const g = GEAR[Math.floor(Math.random() * GEAR.length)];
  const rar = rollRarity(minRarity);
  const item = { uid: rid(), g: g.id, r: rar.id, at: Date.now() };
  p.inv.unshift(item);
  if (rar.id === 'legendary') p.life.legendaries++;
  // volles Inventar: schwächstes, nicht angelegtes Teil fliegt raus
  while (p.inv.length > INV_MAX) {
    const worn = new Set(Object.values(p.equip));
    const spare = p.inv.filter(i => !worn.has(i.uid)).sort((a, b) => rarityOf(a).power - rarityOf(b).power)[0];
    p.inv = p.inv.filter(i => i !== spare);
  }
  if (!p.equip[g.slot]) p.equip[g.slot] = item.uid; // leerer Platz → gleich anlegen
  return item;
}
const gearOf = item => byId(GEAR, item.g);
const rarityOf = item => byId(RARITY, item.r);
function equippedItems(p) { return Object.values(p.equip).map(uid => p.inv.find(i => i.uid === uid)).filter(Boolean); }
function itemBonusText(item) {
  const g = gearOf(item), pw = rarityOf(item).power;
  if (g.type === 'all') return `+${Math.round(pw / 2)} % Schaden`;
  if (g.type === 'crit') return `+${Math.round(pw / 2)} % Krit-Chance`;
  if (g.type === 'scan') return `+${Math.round(pw / 2)} % Schaden · verrät im Sparring die Gegner-Taktik`;
  return `+${pw} % ${STATS[g.type].icon} ${STATS[g.type].name}-Schaden`;
}
function gearBonus(p, type) {
  let b = 0;
  for (const it of equippedItems(p)) {
    const g = gearOf(it), pw = rarityOf(it).power;
    if (g.type === type) b += pw;
    if (g.type === 'all' || g.type === 'scan') b += pw / 2;
  }
  return b / 100;
}
function critChance(p) {
  let c = 0.05 + (p.stats.mind - BASE_STAT) / 400 + (hasTalent(p, 'mind', 25) ? 0.1 : 0);
  for (const it of equippedItems(p)) if (gearOf(it).type === 'crit') c += rarityOf(it).power / 200;
  return Math.min(0.5, c);
}

/* ---------- Schaden eines Trainings ---------- */

function damageOf(p, a, { pr = false, timing = 1, crit = false } = {}) {
  const mults = [];
  let dmg = a.base * (1 + p.stats[a.type] / 100);
  const add = (label, f) => { if (f !== 1) { mults.push({ label, f }); dmg *= f; } };
  add('Ausrüstung', 1 + gearBonus(p, a.type));
  if (a.type === 'str' && hasTalent(p, 'str', 25)) add('Wuchtschlag', 1.15);
  if (a.type === 'end' && hasTalent(p, 'end', 50)) add('Marathon', 1.25);
  add('Combo', comboMult(p, true));
  if (pr) add('Neuer Rekord', hasTalent(p, 'str', 50) ? 3 : PR_MULT);
  if (crit) add('Kritisch', CRIT_MULT);
  add('Schlag', timing);
  if (p.cheer) add('Angefeuert', CHEER_MULT);
  const other = partnerOf(p);
  if (other && seasonDamage(other) > 500 && seasonDamage(p) < 0.6 * seasonDamage(other)) add('Comeback', COMEBACK_MULT);
  add('Gesund gelebt', 1 + HEALTH_BONUS * healthToday(p).length);
  add('Erholung nötig', DAY_FALLOFF[Math.min(sessionsToday(p), DAY_FALLOFF.length - 1)]);
  return { dmg: Math.round(dmg), mults };
}

/* =========================================================
   Aktionen
   ========================================================= */

// 1. Training antippen → Minispiel
function startTrain(arg) {
  const [actId, course] = arg.split(':');
  const a = byId(ACTIVITIES, actId);
  if (doneToday(me(), a.id) >= a.perDay) return;
  if (state.season.result) { toast('Die Jagd ist vorbei – starte unter „Saison“ die nächste!'); return; }
  pending = { a, course, pr: a.pr && prOn && !prToday(me()), t0: performance.now() };
  render();
}

// 2. Im richtigen Moment tippen: Mitte = perfekt
const SWING_MS = 1100;
// Position direkt vom Bildschirm ablesen – so zählt genau das, was man sieht
function swingPos() {
  const bar = document.querySelector('.swingbar'), mk = document.querySelector('.swingbar .marker');
  if (!bar || !mk) return 0.5;
  const b = bar.getBoundingClientRect(), m = mk.getBoundingClientRect();
  return Math.min(1, Math.max(0, (m.left + m.width / 2 - b.left) / b.width));
}
function strike(skip) {
  if (!pending) return;
  const pos = skip ? 0.5 : swingPos();
  const acc = 1 - Math.abs(pos - 0.5) * 2;
  const timing = skip ? 1 : Math.round((0.85 + 0.45 * acc) * 100) / 100;
  doTrain(pending, timing, skip ? '' : acc > 0.9 ? 'PERFEKT!' : acc > 0.65 ? 'Stark!' : acc > 0.35 ? 'Gut' : 'Daneben …');
}

// 3. Eintragen, Schaden, Beute
function doTrain(pend, timing, grade) {
  const p = me();
  const { a, course, pr } = pend;
  pending = null;
  const L = p.life;
  const before = { level: levelOf(p), rank: rankOf(L), badges: earnedBadges(L).length, boss: bossState().hp, mon: monsterOfWeek().hp, stats: { ...p.stats } };
  const crit = Math.random() < critChance(p);
  const { dmg, mults } = damageOf(p, a, { pr, timing, crit });
  const firstToday = !p.dmg[todayStr()];
  p.dmg[todayStr()] = (p.dmg[todayStr()] || 0) + dmg;
  const got = {};
  for (const s in a.gives) { got[s] = a.gives[s]; p.stats[s] += got[s]; }
  p.xp += sum(got);
  const energy = Math.min(1, ENERGY_MAX - p.energy);
  p.energy += energy;
  p.counts[a.id]++;
  L.sessions++;
  if (firstToday) L.days++;
  if (pr) L.prs++;
  L.bestCombo = Math.max(L.bestCombo, comboDays(p));
  const usedCheer = !!p.cheer;
  p.cheer = null;
  const item = dropLoot(p, 0);
  p.log.unshift({ t: Date.now(), day: todayStr(), kind: 'train', id: a.id, course, dmg, got, energy, pr, crit, firstToday,
    usedCheer, item: item.uid, mults });
  p.log.length = Math.min(p.log.length, 200);
  resolveAll();
  save();
  hitShow = { dmg, mults, grade, crit, pr, item, a, bossBefore: before.boss, boss: bossState().hp, monKilled: before.mon > 0 && monsterOfWeek().hp <= 0 };
  if (levelOf(p) > before.level) toast(`⭐ Level ${levelOf(p)}!`, true);
  if (rankOf(L) !== before.rank) toast(`${rankOf(L).icon} Neuer Rang: ${rankOf(L).name}!`, true);
  const badges = earnedBadges(L);
  if (badges.length > before.badges) toast(`${badges[badges.length - 1].icon} Abzeichen: ${badges[badges.length - 1].name}!`, true);
  for (const t of TALENTS) if (p.stats[t.stat] >= t.at && before.stats[t.stat] < t.at) toast(`${t.icon} Talent freigeschaltet: ${t.name}!`, true);
  render();
}

function health(id) {
  const p = me();
  if (healthToday(p).includes(id)) return;
  p.log.unshift({ t: Date.now(), day: todayStr(), kind: 'health', id });
  save();
  toast(`${byId(HEALTH, id).icon} +5 % Schaden auf deine Trainings heute`);
  render();
}

function cheer() {
  const p = me(), other = partnerOf(p);
  if (p.cheerSent === todayStr()) return;
  p.cheerSent = todayStr();
  p.life.cheers++;
  sendEvent(idOf(other), { kind: 'cheer', from: p.name });
  save();
  toast(`📣 ${other.name} angefeuert – nächstes Training +25 %!`);
  render();
}

function equip(uid) {
  const p = me();
  const it = p.inv.find(i => i.uid === uid);
  if (!it) return;
  const slot = gearOf(it).slot;
  p.equip[slot] = p.equip[slot] === uid ? null : uid;
  save();
  render();
}
function scrap(uid) {
  const p = me();
  if (Object.values(p.equip).includes(uid)) { toast('Erst ablegen, dann aussortieren'); return; }
  p.inv = p.inv.filter(i => i.uid !== uid);
  save();
  render();
}

function undo() {
  const p = me();
  const e = p.log[0];
  if (!e || !['train', 'health'].includes(e.kind) || e.day !== todayStr() || !confirm('Letzten Eintrag rückgängig machen?')) return;
  if (e.kind === 'train') {
    const L = p.life;
    p.dmg[e.day] = Math.max(0, (p.dmg[e.day] || 0) - e.dmg);
    if (!p.dmg[e.day]) delete p.dmg[e.day];
    for (const s in e.got) p.stats[s] = Math.max(BASE_STAT, p.stats[s] - e.got[s]);
    p.xp = Math.max(0, p.xp - sum(e.got));
    p.energy = Math.max(0, p.energy - e.energy);
    p.counts[e.id] = Math.max(0, p.counts[e.id] - 1);
    L.sessions = Math.max(0, L.sessions - 1);
    if (e.firstToday) L.days = Math.max(0, L.days - 1);
    if (e.pr) L.prs = Math.max(0, L.prs - 1);
    const it = p.inv.find(i => i.uid === e.item);
    if (it) {
      if (it.r === 'legendary') L.legendaries = Math.max(0, L.legendaries - 1);
      for (const s in p.equip) if (p.equip[s] === it.uid) p.equip[s] = null;
      p.inv = p.inv.filter(i => i !== it);
    }
  }
  p.log.shift();
  save();
  render();
}

function setPact() {
  const v = prompt('Was gönnt ihr euch in echt, wenn der Schweinehund fällt? (z. B. Saunatag, Steak-Essen, neue Laufschuhe)', state.pact || '');
  if (v === null) return;
  state.pact = v.trim().slice(0, 80);
  metaSet({ pact: state.pact });
  save();
  render();
}

function newSeason() {
  const r = state.season.result;
  if (!r) return;
  const ch = state.season.chapter;
  const sl = !r.won && state.stake ? stakeLoser() : null;
  state.hall.unshift({ no: state.season.no, chapter: ch, won: r.won, day: r.day, pact: state.pact,
    paid: sl ? `${sl.payer.name} → ${sl.winner.name}: ${state.stake}` : '',
    mvp: [...Object.values(state.players)].sort((x, y) => seasonDamage(y) - seasonDamage(x))[0].name });
  const carry = {};
  for (const [id, p] of Object.entries(state.players)) carry[id] = p.dmg[todayStr()] || 0;
  state.season = { no: state.season.no + 1, chapter: r.won ? ch + 1 : ch, start: todayStr(), result: null, carry };
  state.pact = '';
  metaSet({ hall: state.hall, season: state.season, pact: '' });
  save();
  toast(r.won ? `🐷 Kapitel ${state.season.chapter}: Der Schweinehund ist zurück – und stärker!` : '🐷 Revanche! Diesmal kriegt ihr ihn.', true);
  render();
  setTimeout(setPact, 400);
}

function reset() {
  if (!confirm('Wirklich ALLES zurücksetzen? Beide Helden starten neu – für beide Handys.')) return;
  const fresh = freshState();
  for (const k of ['season', 'hall', 'pact', 'resetId']) state[k] = fresh[k];
  metaSet({ season: state.season, hall: null, pact: '', resetId: state.resetId });
  reconcileOwn();
  save();
  toast('🔄 Neues Spiel – alles auf Anfang!', true);
  render();
}
function rename(id) {
  const p = state.players[id];
  const name = prompt('Neuer Name:', p.name);
  if (name && name.trim()) { p.name = name.trim().slice(0, 20); save(); render(); }
}

/* ---------- Sparring ---------- */

function fighterOf(p) {
  const bonus = { A: 0, B: 0, C: 0 };
  let scan = false, luck = 0;
  for (const it of equippedItems(p)) {
    const g = gearOf(it), pw = rarityOf(it).power / 2;
    if (TACTIC_OF[g.type]) bonus[TACTIC_OF[g.type]] += pw;
    if (g.type === 'all') for (const t in bonus) bonus[t] += pw / 2;
    if (g.type === 'crit') luck += 0.05;
    if (g.type === 'scan') scan = true;
  }
  return { name: p.name, level: levelOf(p), stats: { ...p.stats }, bonus, luck, scan,
    exp: Math.min(0.2, p.life.duels * 0.01), favorite: p.tactics[0] };
}
function tacticPower(f, t, challenger = false) {
  return (f.stats[TACTICS[t].stat] + f.bonus[t]) * (1 + f.exp) * (challenger ? 1 + CHALLENGER_BONUS : 1);
}
function fight(att, def, attT, defT, seed) {
  const rounds = [];
  let aw = 0, dw = 0, at = 0, dt = 0;
  for (let i = 0; i < 3; i++) {
    const [a, d] = [attT[i], defT[i]];
    const ma = TACTICS[a].beats === d ? T_WIN : TACTICS[d].beats === a ? T_LOSE : 1;
    const md = TACTICS[d].beats === a ? T_WIN : TACTICS[a].beats === d ? T_LOSE : 1;
    const la = LUCK_MIN + att.luck + (LUCK_SPAN - att.luck) * hash01(`${seed}:a${i}`);
    const ld = LUCK_MIN + def.luck + (LUCK_SPAN - def.luck) * hash01(`${seed}:d${i}`);
    const as = Math.round(tacticPower(att, a, true) * ma * la), ds = Math.round(tacticPower(def, d) * md * ld);
    if (as >= ds) aw++; else dw++;
    at += as; dt += ds;
    rounds.push({ a, d, as, ds });
  }
  return { rounds, attWin: aw > dw || (aw === dw && at >= dt) };
}
// Ergebnis verbuchen: Sieger bekommt eine seltene Beute aus dem Spind
function bookDuel(p, { win, opp, rounds, mineAtt, auto }) {
  p.life.duels++;
  let item = null;
  if (win) { p.life.wins++; item = dropLoot(p, 1); }
  const r = { t: Date.now(), id: rid(), opp, win, rounds, mineAtt, auto: !!auto, item: item && item.uid };
  p.reports.unshift(r);
  p.reports.length = Math.min(p.reports.length, 20);
  if (p === me()) freshReport = r.id;
  return r;
}
function resolveDuel(d, defender, defT, auto) {
  const res = fight(d.snap, fighterOf(defender), d.tactics, defT, d.id);
  return { id: d.id, rounds: res.rounds, attWin: res.attWin, attName: d.fromName, defName: defender.name, auto };
}
function finishChallenge(p, res) {
  const o = p.outgoing.find(x => x.id === res.id);
  if (!o) return;
  p.outgoing = p.outgoing.filter(x => x !== o);
  bookDuel(p, { win: res.attWin, opp: res.defName, rounds: res.rounds, mineAtt: true, auto: res.auto });
  if (p === me()) toast(res.attWin ? `🥊 Sparring gegen ${res.defName} gewonnen!` : `😵 Sparring gegen ${res.defName} verloren`, true);
}
function finishDefense(p, res) {
  const d = p.incoming.find(x => x.id === res.id);
  if (!d) return;
  p.incoming = p.incoming.filter(x => x !== d);
  bookDuel(p, { win: !res.attWin, opp: res.attName, rounds: res.rounds, mineAtt: false, auto: true });
  if (p === me()) toast(`⏰ Sparring gegen ${res.attName} automatisch ausgetragen – ${res.attWin ? 'verloren' : 'gewonnen!'}`, true);
}
function expireDuels(p) {
  let changed = false;
  for (const o of p.outgoing.filter(o => Date.now() > o.deadline)) {
    const res = resolveDuel(o, state.players[o.to], state.players[o.to].tactics, true);
    finishChallenge(p, res);
    sendEvent(o.to, { kind: 'result', result: res, defSide: true });
    changed = true;
  }
  return changed;
}
function pickTactic(t) { if (duelPick.length < 3) duelPick.push(t); render(); }
function sendDuel() {
  const p = me();
  if (duelPick.length < 3) return;
  if (answering) {
    const d = p.incoming.find(x => x.id === answering);
    answering = null;
    if (!d || Date.now() > d.deadline) { duelPick = []; duelOpen = false; render(); return; }
    const res = resolveDuel(d, p, [...duelPick], false);
    p.incoming = p.incoming.filter(x => x !== d);
    bookDuel(p, { win: !res.attWin, opp: d.fromName, rounds: res.rounds, mineAtt: false });
    sendEvent(d.from, { kind: 'result', result: res });
  } else {
    if (p.energy < 1) { toast('⚡ Keine Energie – jedes Training lädt 1 ⚡'); return; }
    const other = partnerOf(p);
    const d = { id: rid() + rid(), from: idOf(p), to: idOf(other), fromName: p.name, toName: other.name, tactics: [...duelPick],
      at: Date.now(), deadline: Date.now() + CHALLENGE_H * H_MS, snap: fighterOf(p) };
    p.energy--;
    p.outgoing.push(d);
    sendEvent(d.to, { kind: 'challenge', duel: d });
    toast(`🥊 Herausforderung an ${other.name} geschickt – ${CHALLENGE_H} Std. Zeit zum Antworten`, true);
  }
  duelPick = []; duelOpen = false;
  save();
  render();
}

const actions = {
  train: startTrain, strike: () => strike(false), skip: () => strike(true), health, cheer, equip, scrap, undo, rename, reset,
  newSeason, pact: setPact, stake: setStake,
  pickstake: s => { if (s === 'eigen') { const v = prompt('Euer Einsatz (z. B. 🍕 Pizza):', ''); if (!v || !v.trim()) return; setupStake = v.trim().slice(0, 60); } else setupStake = s; render(); },
  pr: () => { prOn = !prOn; render(); },
  closehit: () => { hitShow = null; nextReveal(); render(); },
  closereveal: () => { reveal = null; nextReveal(); render(); },
  duel: () => { duelOpen = true; answering = null; duelPick = []; render(); },
  answer: id => { tab = 'sparring'; answering = id; duelOpen = true; duelPick = []; render(); window.scrollTo(0, 0); },
  tactic: pickTactic, clearpick: () => { duelPick = []; render(); },
  closeduel: () => { duelOpen = false; answering = null; duelPick = []; render(); },
  fight: sendDuel, seen: () => { freshReport = null; render(); },
  setdefault: arg => { const [i, t] = arg.split(':'); me().tactics[Number(i)] = t; save(); render(); },
  create: createGame, join: joinGame, local: playLocal, share: shareInvite, leave: leaveGame,
  setupdone: () => { setupStep = null; render(); },
  intro: () => { introPage = 0; render(); window.scrollTo(0, 0); },
  intronext: () => { introPage = Math.min(INTRO.length - 1, introPage + 1); render(); window.scrollTo(0, 0); },
  introprev: () => { introPage = Math.max(0, introPage - 1); render(); window.scrollTo(0, 0); },
  introdone: () => { introPage = null; try { localStorage.setItem(INTRO_KEY, '1'); } catch (e) { /* ignorieren */ } render(); window.scrollTo(0, 0); },
  tab: t => { tab = t; render(); window.scrollTo(0, 0); },
  player: id => { if (online()) return; state.current = id; duelOpen = false; save(); render(); },
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (el && !el.disabled && actions[el.dataset.act]) actions[el.dataset.act](el.dataset.arg);
});

// Belohnungs-Karten nacheinander zeigen (Wochenmonster, Schweinehund)
const revealQueue = [];
let reveal = null;
function queueReveal(r) { revealQueue.push(r); }
function nextReveal() { if (!reveal && !hitShow && !pending) reveal = revealQueue.shift() || null; }

/* =========================================================
   Anzeige
   ========================================================= */

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function fmtDur(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, sec = s % 60;
  return (h ? `${h}:${String(m).padStart(2, '0')}` : `${m}`) + `:${String(sec).padStart(2, '0')}`;
}
const fmtTime = t => new Date(t).toLocaleString('de-DE', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
const fmtMult = f => '×' + String(Math.round(f * 100) / 100).replace('.', ',');

function renderHeader() {
  const wk = weekKey();
  const lead = Math.max(...Object.values(state.players).map(p => weekDamage(p, wk)));
  document.getElementById('players').innerHTML = Object.entries(state.players).map(([id, p]) => `
    <button class="pchip ${id === state.current ? 'on' : ''} ${online() && id !== game.me ? 'other' : ''}" data-act="player" data-arg="${id}">
      <b>${lead > 0 && weekDamage(p, wk) === lead ? '👑 ' : ''}${esc(p.name)}</b><small>${num(weekDamage(p, wk))} ⚡</small>
    </button>`).join('');
  renderSyncDot();
  const p = me(), lvl = levelOf(p);
  document.getElementById('resbar').innerHTML = `
    <div class="res"><div class="res-top"><span>⭐ Level</span><b>${lvl}</b></div><div class="meter"><i style="width:${(p.xp - xpFor(lvl)) / (xpFor(lvl + 1) - xpFor(lvl)) * 100}%"></i></div></div>
    <div class="res"><div class="res-top"><span>🔥 Combo</span><b>${fmtMult(comboMult(p))}</b></div><div class="meter combo"><i style="width:${comboDays(p) / 7 * 100}%"></i></div></div>
    <div class="res"><div class="res-top"><span>⚡ Energie</span><b>${p.energy}/${ENERGY_MAX}</b></div><div class="meter energy"><i style="width:${p.energy / ENERGY_MAX * 100}%"></i></div></div>`;
  for (const btn of document.querySelectorAll('#tabs button')) btn.classList.toggle('on', btn.dataset.arg === tab);
  const badge = document.getElementById('spar-badge');
  if (badge) badge.textContent = p.incoming.length || '';
}
function renderSyncDot() { const el = document.getElementById('sync-dot'); if (el) el.className = online() ? (connected ? 'on' : 'off') : ''; }

/* ---------- Der Schweinehund ---------- */

function bossSvg(hpPct, chapter, extra = '') {
  const hurt = hpPct < 0.7, beaten = hpPct < 0.4, dizzy = hpPct < 0.15, ko = hpPct <= 0;
  const O = 'stroke="#15171c" stroke-width="2.4" stroke-linejoin="round"';
  const skin = chapter >= 3 ? '#e58fa6' : '#f4a9bb', dark = chapter >= 3 ? '#c56d86' : '#e48aa2';
  const pants = ['#8a8f99', '#4b5563', '#7c2d12', '#1f2937'][Math.min(3, chapter - 1)];
  const eye = x => ko ? `<path d="M${x - 5} 61 l10 10 M${x + 5} 61 l-10 10" stroke="#15171c" stroke-width="3" stroke-linecap="round"/>`
    : `<ellipse cx="${x}" cy="66" rx="7" ry="${dizzy ? 7 : 6}" fill="#fff" ${O}/><circle cx="${x + (dizzy ? 0 : 1)}" cy="${dizzy ? 66 : 67}" r="3" fill="#15171c"/>
       ${dizzy ? '' : `<path d="M${x - 8} ${beaten ? 62 : 64} Q${x} ${beaten ? 66 : 58} ${x + 8} ${beaten ? 62 : 64}" fill="${skin}" ${O}/>`}`;
  return `
    <svg class="boss ${extra}" viewBox="0 0 220 190" aria-label="Der Schweinehund">
      <ellipse cx="110" cy="178" rx="70" ry="8" fill="rgba(0,0,0,.25)"/>
      <rect x="22" y="112" width="176" height="56" rx="18" fill="#5b4bd6" ${O}/>
      <rect x="10" y="100" width="34" height="68" rx="14" fill="#6c5ce7" ${O}/><rect x="176" y="100" width="34" height="68" rx="14" fill="#6c5ce7" ${O}/>
      <ellipse cx="110" cy="120" rx="58" ry="46" fill="${skin}" ${O}/>
      <ellipse cx="110" cy="128" rx="38" ry="30" fill="#fbd0da"/>
      <path d="M52 132 Q110 120 168 132 L164 166 Q110 176 56 166 Z" fill="${pants}" ${O}/>
      <path d="M58 140 Q110 130 162 140" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="4 4" opacity=".6"/>
      <g transform="rotate(${ko ? 40 : 12} 172 108)"><rect x="160" y="84" width="28" height="38" rx="4" fill="#ffd23f" ${O}/>
        <text x="174" y="108" font-size="9" font-weight="900" text-anchor="middle" fill="#c0262c">CHIPS</text></g>
      <ellipse cx="166" cy="112" rx="10" ry="8" fill="${skin}" ${O}/>
      <ellipse cx="56" cy="114" rx="10" ry="9" fill="${skin}" ${O}/>
      <path d="M62 44 Q50 70 64 86 Q70 60 78 48 Z" fill="#8a5a3b" ${O}/>
      <path d="M158 44 Q170 70 156 86 Q150 60 142 48 Z" fill="#8a5a3b" ${O}/>
      <ellipse cx="110" cy="68" rx="46" ry="38" fill="${skin}" ${O}/>
      <path d="M92 44 q18 -8 36 0 M96 50 q14 -6 28 0" fill="none" stroke="${dark}" stroke-width="2.4" stroke-linecap="round"/>
      ${eye(92)}${eye(128)}
      ${beaten && !ko ? '<ellipse cx="128" cy="66" rx="10" ry="9" fill="none" stroke="#6b3fa0" stroke-width="3" opacity=".7"/>' : ''}
      <ellipse cx="110" cy="84" rx="18" ry="12" fill="${dark}" ${O}/>
      <ellipse cx="104" cy="84" rx="3" ry="4.5" fill="#7a3346"/><ellipse cx="116" cy="84" rx="3" ry="4.5" fill="#7a3346"/>
      <path d="M94 ${ko ? 100 : 98} Q110 ${ko ? 94 : hurt ? 96 : 106} 126 ${ko ? 100 : 98}" fill="none" stroke="#15171c" stroke-width="2.6" stroke-linecap="round"/>
      ${hurt ? `<g transform="rotate(18 133 38)"><rect x="120" y="34" width="26" height="9" rx="4" fill="#fff" ${O}/><path d="M128 36 v6 M136 36 v6" stroke="#c9b8a0" stroke-width="1.5"/></g>` : ''}
      ${beaten ? '<path d="M152 56 q4 8 0 12 q-4 -4 0 -12z M160 70 q3 6 0 9 q-3 -3 0 -9z" fill="#6bc4ff"/>' : ''}
      ${dizzy && !ko ? '<g class="stars"><text x="80" y="26" font-size="16">⭐</text><text x="120" y="20" font-size="14">💫</text><text x="146" y="30" font-size="14">⭐</text></g>' : ''}
      ${ko ? '<text x="110" y="30" font-size="26" font-weight="900" text-anchor="middle" fill="#e5383b" stroke="#15171c" stroke-width="1.5">K.O.</text>' : ''}
    </svg>`;
}

/* ---------- Held ---------- */

function heroSvg(p, size = '') {
  const lvl = levelOf(p);
  const st = p.stats;
  const k = Math.min(1, (st.str - BASE_STAT) / 60);
  const sw = 12 + 5 * k, bi = 3.6 + 2.6 * k;
  const worn = slot => { const it = p.inv.find(i => i.uid === p.equip[slot]); return it ? it.g : null; };
  const weapon = worn('weapon'), armor = worn('armor'), trinket = worn('trinket');
  const tier = lvl >= 15 ? '#f2b233' : lvl >= 8 ? '#e5383b' : lvl >= 4 ? '#2f6fed' : '#9aa1ab';
  const shirt = armor ? { shirt: '#2f6fed', kompression: '#2a2f39', champion: '#f2b233' }[armor] : '#ff5a1f';
  const shorts = armor === 'kompression' ? '#2a2f39' : '#3a3f4b';
  const shoes = weapon === 'laufschuhe' ? '#c8f230' : '#ffffff';
  const O = 'stroke="#15171c" stroke-width="1.4" stroke-linejoin="round"';
  const skin = '#f1c08f', hair = '#3b2a20';
  const sL = [50 - sw, 43], eL = [50 - sw - 9, 47], fL = [50 - sw - 8, 33];
  const sR = [50 + sw, 43], eR = [50 + sw + 9, 47], fR = [50 + sw + 8, 33];
  const limb = (a, b) => `<path d="M${a[0]} ${a[1]} L${b[0]} ${b[1]}" stroke="#15171c" stroke-width="8.6" stroke-linecap="round"/>
    <path d="M${a[0]} ${a[1]} L${b[0]} ${b[1]}" stroke="${skin}" stroke-width="6" stroke-linecap="round"/>`;
  const arm = (s, e, f, dir) => `${limb(s, e)}${limb(e, f)}
    <circle cx="${(s[0] + e[0]) / 2 + dir * 0.5}" cy="${(s[1] + e[1]) / 2 - 2}" r="${bi}" fill="${skin}" ${O}/>
    <circle cx="${f[0]}" cy="${f[1]}" r="4" fill="${skin}" ${O}/>`;
  const extra = [];
  if (weapon) extra.push({
    boxhandschuhe: `<circle cx="${fL[0]}" cy="${fL[1]}" r="6" fill="#e5383b" ${O}/><circle cx="${fR[0]}" cy="${fR[1]}" r="6" fill="#e5383b" ${O}/>
      <rect x="${fL[0] - 4}" y="${fL[1] + 4}" width="8" height="3" rx="1" fill="#fff" ${O}/><rect x="${fR[0] - 4}" y="${fR[1] + 4}" width="8" height="3" rx="1" fill="#fff" ${O}/>`,
    springseil: `<path d="M${fL[0]} ${fL[1]} Q50 -10 ${fR[0]} ${fR[1]}" fill="none" stroke="#2f6fed" stroke-width="1.6"/>
      <rect x="${fL[0] - 2}" y="${fL[1] - 6}" width="4" height="9" rx="2" fill="#15171c"/><rect x="${fR[0] - 2}" y="${fR[1] - 6}" width="4" height="9" rx="2" fill="#15171c"/>`,
    kopfhoerer: `<path d="M37.5 22 Q50 2 62.5 22" fill="none" stroke="#15171c" stroke-width="3" stroke-linecap="round"/><rect x="35" y="19" width="6" height="10" rx="3" fill="#ff5a1f" ${O}/><rect x="59" y="19" width="6" height="10" rx="3" fill="#ff5a1f" ${O}/>`,
    medizinball: `<circle cx="74" cy="82" r="8" fill="#7a5530" ${O}/><path d="M66 82 h16 M74 74 v16" stroke="#15171c" stroke-width="1"/>`,
    laufschuhe: '',
    tablet: `<rect x="${fR[0] - 1}" y="${fR[1] - 14}" width="12" height="16" rx="2" fill="#15171c"/><rect x="${fR[0] + 1}" y="${fR[1] - 12}" width="8" height="11" rx="1" fill="#6b9bff"/>`,
  }[weapon] || '');
  if (trinket) extra.push({
    smartwatch: `<rect x="${fL[0] - 3.5}" y="${fL[1] + 3.5}" width="7" height="5" rx="1.5" fill="#15171c"/><rect x="${fL[0] - 2}" y="${fL[1] + 4.6}" width="4" height="2.8" rx=".6" fill="#c8f230"/>`,
    cap: `<path d="M38.5 21 Q39 9 50 9 Q61 9 61.5 21 Z" fill="#e5383b" ${O}/><path d="M58 20 Q68 19 70 22 Q62 23 58 22 Z" fill="#b8282b" ${O}/>`,
    shake: `<rect x="21" y="74" width="9" height="15" rx="2.5" fill="#f4f5f7" ${O}/><rect x="21" y="71" width="9" height="4" rx="1.5" fill="#ff5a1f" ${O}/>`,
    medaille: `<path d="M45 40 L50 50 L55 40" fill="none" stroke="#2f6fed" stroke-width="2.4"/><circle cx="50" cy="52" r="4.2" fill="#f2b233" ${O}/>`,
  }[trinket] || '');
  return `
    <svg class="hero ${size}" viewBox="0 0 100 ${size === 'mini' ? 100 : 104}" aria-label="Held">
      <circle cx="50" cy="52" r="46" class="h-bg"/>
      <circle cx="50" cy="52" r="46" fill="none" stroke="${tier}" stroke-width="3"/>
      ${st.mind >= 30 ? '<circle cx="50" cy="52" r="41" fill="none" stroke="#8e6bd8" stroke-width="1.5" stroke-dasharray="3 3" opacity=".8"/>' : ''}
      <ellipse cx="50" cy="91" rx="20" ry="3" class="h-shadow"/>
      <rect x="42" y="68" width="6.5" height="17" rx="3" fill="${skin}" ${O}/><rect x="51.5" y="68" width="6.5" height="17" rx="3" fill="${skin}" ${O}/>
      <path d="M36 84 h13 v3 a3 3 0 0 1 -3 3 h-10 a3 3 0 0 1 0 -6z" fill="${shoes}" ${O}/>
      <path d="M64 84 h-13 v3 a3 3 0 0 0 3 3 h10 a3 3 0 0 0 0 -6z" fill="${shoes}" ${O}/>
      <path d="M38.5 63 h23 l1.5 11 h-10.5 l-2.5 -3 l-2.5 3 h-10.5z" fill="${shorts}" ${O}/>
      ${arm(sL, eL, fL, -1)}${arm(sR, eR, fR, 1)}
      <path d="M${50 - sw} 41 Q50 35 ${50 + sw} 41 L${50 + sw - 5} 65 L${50 - sw + 5} 65 Z" fill="${shirt}" ${O}/>
      ${armor === 'kompression' ? `<path d="M${50 - sw + 3} 44 L${50 - sw + 7} 63 M${50 + sw - 3} 44 L${50 + sw - 7} 63" stroke="#c8f230" stroke-width="1.6"/>` : ''}
      ${armor === 'champion' ? `<path d="M${50 - sw + 2} 52 H${50 + sw - 2}" stroke="#e5383b" stroke-width="3"/>` : ''}
      ${!armor ? '<path d="M44 41 Q50 46 56 41" fill="none" stroke="#15171c" stroke-width="1.2"/>' : ''}
      <rect x="46" y="33" width="8" height="6" fill="${skin}" ${O}/>
      <circle cx="38.8" cy="24.5" r="2.6" fill="${skin}" ${O}/><circle cx="61.2" cy="24.5" r="2.6" fill="${skin}" ${O}/>
      <circle cx="50" cy="23" r="11.5" fill="${skin}" ${O}/>
      <path d="M38.6 21.5 Q38 9.5 50 9.5 Q62 9.5 61.4 21.5 Q58 15.5 51 16.5 Q44 15 38.6 21.5z" fill="${hair}" ${O}/>
      <path d="M44 20.5 l3.5 -.8 M56 20.5 l-3.5 -.8" stroke="#15171c" stroke-width="1.2" stroke-linecap="round"/>
      <circle cx="45.8" cy="24" r="1.5" fill="#15171c"/><circle cx="54.2" cy="24" r="1.5" fill="#15171c"/>
      <path d="M45.5 28.5 Q50 32.5 54.5 28.5" fill="none" stroke="#15171c" stroke-width="1.3" stroke-linecap="round"/>
      ${extra.join('')}
      ${size === 'mini' ? '' : `<rect x="37" y="93" width="26" height="9" rx="4.5" fill="${tier}"/><text x="50" y="99.8" class="h-lvl">LV ${lvl}</text>`}
    </svg>`;
}

/* ---------- Jagd (Hauptbildschirm) ---------- */

function viewJagd() {
  const p = me(), other = partnerOf(p);
  const b = bossState(), mon = monsterOfWeek();
  const pct = b.hp / b.max;
  const res = state.season.result;
  const wk = weekKey();
  return `
    ${incomingBanner(p)}
    <section class="card bosscard ${res ? (res.won ? 'won' : 'lost') : ''}">
      <div class="boss-head">
        <div><div class="eyebrow">Kapitel ${state.season.chapter} · ${res ? 'Jagd beendet' : `noch ${daysLeft()} Tage`}</div>
          <b class="boss-name">Der innere Schweinehund</b></div>
        <span class="boss-hp-num">${num(b.hp)}<small> / ${num(b.max)}</small></span>
      </div>
      ${bossSvg(pct, state.season.chapter)}
      <div class="hpbar"><i style="width:${pct * 100}%"></i></div>
      <small class="boss-info">${res ? (res.won ? '🎉 Besiegt! Unter „Saison“ startet die nächste Jagd.' : '😤 Er hat überlebt … Unter „Saison“ startet die Revanche.')
        : `💤 Heilt sich um ${num(b.regen)} an jedem Tag, an dem keiner trainiert${b.lazy ? ` (schon ${b.lazy}× passiert)` : ''}.`}</small>
      ${state.pact ? `<div class="pact">🎁 <b>Euer Pakt:</b> ${esc(state.pact)}</div>` : '<button class="btn small ghost pactbtn" data-act="pact">🎁 Pakt festlegen: Was gönnt ihr euch, wenn er fällt?</button>'}
      ${state.stake ? stakeLine() : '<button class="btn small ghost pactbtn" data-act="stake">😬 Einsatz festlegen: Was zahlt der Faulere, wenn er überlebt?</button>'}
    </section>

    <section class="card monster ${mon.hp <= 0 ? 'down' : ''}">
      <span class="mon-icon">${mon.icon}</span>
      <div class="bld-title"><b>${mon.name}</b><small>${mon.hp <= 0 ? '✓ besiegt – Beute kassiert!' : `Wochenmonster · ${mon.quote}`}</small>
        <div class="hpbar small"><i style="width:${mon.hp / mon.max * 100}%"></i></div></div>
      <span class="mon-hp">${num(mon.hp)}</span>
    </section>

    <section class="card team">
      ${[p, other].map(x => `<div class="mate">${heroSvg(x, 'mini')}<div class="bld-title"><b>${esc(x === p ? 'Du' : x.name)}</b>
        <small>${num(weekDamage(x, wk))} diese Woche${x.dmg[todayStr()] ? ' · ✓ heute' : ''}</small></div></div>`).join('')}
      <button class="btn small" data-act="cheer" ${p.cheerSent === todayStr() ? 'disabled' : ''}>${p.cheerSent === todayStr() ? '📣 angefeuert ✓' : `📣 ${esc(other.name)} anfeuern`}</button>
    </section>
    ${p.cheer ? `<section class="banner cheer">📣 <b>${esc(p.cheer.from)} feuert dich an!</b> Dein nächstes Training macht +25 % Schaden.</section>` : ''}

    <h2>Zuschlagen <small>jedes Training = ein Treffer</small></h2>
    <div class="prtoggle ${prOn && !prToday(p) ? 'on' : ''} ${prToday(p) ? 'used' : ''}" data-act="pr">
      <span class="pr-box">${prOn && !prToday(p) ? '✓' : ''}</span>
      <span class="bld-title"><b>🏆 Neuer Rekord / Gewicht erhöht</b><small>${prToday(p) ? 'Heute schon einen Rekord eingetragen – stark!' : `Volltreffer ×${String(hasTalent(p, 'str', 50) ? 3 : PR_MULT).replace('.', ',')} für Milon oder freies Training (1× am Tag)`}</small></span>
    </div>
    <div class="acts">${ACTIVITIES.map(a => actCard(p, a)).join('')}</div>
    <h2>Gesund gelebt <small>je +5 % Schaden heute</small></h2>
    <div class="health">${HEALTH.map(h => { const done = healthToday(p).includes(h.id);
      return `<button class="chip-btn ${done ? 'done' : ''}" data-act="health" data-arg="${h.id}" ${done ? 'disabled' : ''}>${h.icon} ${h.name}${done ? ' ✓' : ''}</button>`; }).join('')}</div>
    <p class="hint">Vertippt? Unter „Profil“ lässt sich der letzte Eintrag von heute zurücknehmen.</p>`;
}

function actCard(p, a) {
  const done = doneToday(p, a.id), full = done >= a.perDay;
  const preview = damageOf(p, a, { pr: a.pr && prOn && !prToday(p) }).dmg;
  const head = `
    <span class="act-icon">${a.icon}</span>
    <span class="act-name">${a.name} <small>${done}/${a.perDay}</small></span>
    <span class="act-unit">${a.unit}</span>
    <span class="act-gain">${full ? 'für heute geschafft ✓' : `≈ ${num(preview)} Schaden`}</span>`;
  if (a.course) {
    return `<div class="act wide course ${full ? 'is-done' : ''}">${head}
      ${full ? '' : `<div class="course-chips">${COURSES.map(c => `<button class="chip-btn" data-act="train" data-arg="kurs:${c.id}">${c.icon} ${c.name}</button>`).join('')}</div>`}</div>`;
  }
  return `<button class="act ${a.id === 'milon' ? 'wide main' : ''}" data-act="train" data-arg="${a.id}" ${full ? 'disabled' : ''}>${head}</button>`;
}

// Minispiel: der Balken pendelt, Mitte treffen = perfekter Schlag
function swingOverlay() {
  return `
    <div class="overlay">
      <div class="ov-card swing">
        <div class="eyebrow">${pending.a.icon} ${pending.a.name}${pending.pr ? ' · 🏆 Rekord!' : ''}</div>
        <h2>Tipp, wenn der Balken in der Mitte ist!</h2>
        <div class="swingbar"><span class="zone"></span><i class="marker" style="animation-duration:${SWING_MS}ms"></i></div>
        <button class="btn primary big punch" data-act="strike">👊 ZUSCHLAGEN</button>
        <button class="btn small ghost" data-act="skip">ohne Minispiel eintragen</button>
      </div>
    </div>`;
}

function lootCard(it) {
  const g = gearOf(it), r = rarityOf(it);
  return `<div class="locker ${it.r}" style="--rar:${r.color}">
      <div class="locker-door"><span>SPIND</span></div>
      <div class="loot"><span class="loot-icon">${g.icon}</span><b>${g.name}</b><small class="rar">${r.name}</small><small>${itemBonusText(it)}</small></div>
    </div>`;
}

function hitOverlay() {
  const h = hitShow;
  const b = bossState();
  return `
    <div class="overlay">
      <div class="ov-card hit">
        ${h.grade ? `<div class="grade">${h.grade}</div>` : ''}
        <div class="boss-mini">${bossSvg(b.hp / b.max, state.season.chapter, 'shake')}<div class="dmg-float ${h.crit || h.pr ? 'big' : ''}">−${num(h.dmg)}</div></div>
        <div class="hpbar"><i class="drain" style="--from:${h.bossBefore / b.max * 100}%;--to:${h.boss / b.max * 100}%"></i></div>
        <small>${num(h.boss)} / ${num(b.max)} Lebenspunkte übrig${h.monKilled ? ' · 👹 Wochenmonster besiegt!' : ''}</small>
        <div class="mults">${h.mults.map(m => `<span class="mult ${m.f < 1 ? 'down' : ''}">${m.label} ${fmtMult(m.f)}</span>`).join('')}</div>
        ${lootCard(h.item)}
        <button class="btn primary" data-act="closehit">Weiter 💪</button>
      </div>
    </div>`;
}

function revealOverlay() {
  return `
    <div class="overlay">
      <div class="ov-card hit">
        <h2 class="center">${reveal.title}</h2>
        ${lootCard(reveal.item)}
        <button class="btn primary" data-act="closereveal">Stark! 💪</button>
      </div>
    </div>`;
}

/* ---------- Held ---------- */

function viewHeld() {
  const p = me(), lvl = levelOf(p);
  const worn = new Set(Object.values(p.equip));
  return `
    <section class="card hero-card">
      ${heroSvg(p, 'big')}
      <div class="hero-side">
        <b class="hero-name">${esc(p.name)}</b>
        <small>${rankOf(p.life).icon} ${rankOf(p.life).name} · Level ${lvl}</small>
        <div class="meter"><i style="width:${(p.xp - xpFor(lvl)) / (xpFor(lvl + 1) - xpFor(lvl)) * 100}%"></i></div>
        ${Object.entries(STATS).map(([s, info]) => `<div class="stat"><span>${info.icon} ${info.name}</span><b>${num(p.stats[s])}</b></div>`).join('')}
        <small>🎯 Krit-Chance ${Math.round(critChance(p) * 100)} %</small>
      </div>
    </section>

    <h2>Talente <small>schalten sich durchs Training frei</small></h2>
    <div class="talents">${TALENTS.map(t => {
      const have = p.stats[t.stat], on = have >= t.at;
      return `<div class="card talent ${on ? 'on' : ''}" style="--tc:${STATS[t.stat].color}">
        <span class="t-icon">${t.icon}</span><b>${t.name}</b><small>${t.desc}</small>
        ${on ? '<small class="t-ok">✓ aktiv</small>' : `<div class="meter"><i style="width:${Math.min(100, have / t.at * 100)}%"></i></div><small>${STATS[t.stat].icon} ${num(have)} / ${t.at}</small>`}
      </div>`; }).join('')}</div>

    <h2>Spind <small>${p.inv.length} / ${INV_MAX} Teile</small></h2>
    ${Object.entries(SLOTS).map(([slot, label]) => {
      const items = p.inv.filter(i => gearOf(i).slot === slot).sort((a, b) => rarityOf(b).power - rarityOf(a).power);
      return `<h3 class="slot">${label}</h3>
        <div class="items">${items.length ? items.map(i => itemCard(i, worn.has(i.uid))).join('') : '<p class="hint">Noch leer – jedes Training öffnet deinen Spind.</p>'}</div>`;
    }).join('')}`;
}
function itemCard(it, on) {
  const g = gearOf(it), r = rarityOf(it);
  return `
    <div class="card item ${on ? 'on' : ''}" style="--rar:${r.color}">
      <span class="item-icon">${g.icon}</span>
      <b>${g.name}</b>
      <small class="rar">${r.name}</small>
      <small>${itemBonusText(it)}</small>
      <div class="item-btns">
        <button class="btn small ${on ? 'primary' : ''}" data-act="equip" data-arg="${it.uid}">${on ? 'angelegt ✓' : 'anlegen'}</button>
        ${on ? '' : `<button class="btn small ghost" data-act="scrap" data-arg="${it.uid}" aria-label="aussortieren">🗑️</button>`}
      </div>
    </div>`;
}

/* ---------- Sparring ---------- */

function incomingBanner(p) {
  if (!p.incoming.length) return '';
  return `<section class="card incoming">${p.incoming.map(d => `
    <div class="row"><span><b>🥊 ${esc(d.fromName)} fordert dich zum Sparring!</b>
      <small>${Date.now() > d.deadline ? 'wird automatisch ausgetragen' : `noch <b data-eta="${d.deadline}">${fmtDur(d.deadline - Date.now())}</b> – sonst kämpfst du mit deiner Standard-Taktik`}</small></span>
      ${Date.now() > d.deadline ? '' : `<button class="btn small primary" data-act="answer" data-arg="${d.id}">Annehmen</button>`}</div>`).join('')}</section>`;
}

function viewSparring() {
  const p = me(), other = partnerOf(p);
  if (duelOpen) return duelSetup(p, other);
  const fresh = freshReport && p.reports.find(r => r.id === freshReport);
  const L = p.life;
  return `
    ${fresh ? reportCard(fresh, true) : ''}
    ${incomingBanner(p)}
    <section class="card versus">
      <div class="vs-side">${heroSvg(p, 'mini')}<b>Du</b><small>Level ${levelOf(p)}</small></div>
      <div class="vs-mid">VS</div>
      <div class="vs-side">${heroSvg(other, 'mini')}<b>${esc(other.name)}</b><small>Level ${levelOf(other)}</small></div>
    </section>
    ${p.outgoing.length ? p.outgoing.map(o => `<section class="card waiting"><b>⏳ Warte auf ${esc(o.toName)}</b><br><small>wird spätestens in <b data-eta="${o.deadline}">${fmtDur(o.deadline - Date.now())}</b> automatisch ausgetragen</small></section>`).join('')
      : `<button class="btn primary big" data-act="duel" ${p.energy < 1 ? 'disabled' : ''}>🥊 ${esc(other.name)} herausfordern (1 ⚡)</button>`}
    <p class="hint">${p.energy ? `⚡ ${p.energy} Energie – ` : '⚡ Keine Energie – '}jedes Training lädt 1 ⚡. 3 Runden, jede Taktik schlägt eine andere. Wer gewinnt, bekommt seltene Beute.</p>
    <div class="stats"><div><b>${L.wins}</b><small>Siege</small></div><div><b>${L.duels - L.wins}</b><small>Niederlagen</small></div>
      <div><b>${L.duels}</b><small>Sparrings</small></div><div><b>${Math.round(Math.min(0.2, L.duels * 0.01) * 100)} %</b><small>Erfahrung</small></div></div>

    <h2>Standard-Verteidigung <small>falls du nicht rechtzeitig antwortest</small></h2>
    <div class="card">${[0, 1, 2].map(i => `
      <div class="defrow"><span>Runde ${i + 1}</span>${Object.entries(TACTICS).map(([t, T]) => `
        <button class="tbtn small ${p.tactics[i] === t ? 'on' : ''}" data-act="setdefault" data-arg="${i}:${t}">${T.icon}</button>`).join('')}</div>`).join('')}
    </div>
    ${p.reports.length ? `<h2>Kampfberichte</h2>${p.reports.slice(0, 6).map(r => reportCard(r, false)).join('')}` : ''}`;
}

function duelSetup(p, other) {
  const d = answering && p.incoming.find(x => x.id === answering);
  const mf = fighterOf(p);
  const opp = d ? d.snap : fighterOf(other);
  return `
    <section class="card duel">
      <div class="goal-head"><span class="big-icon">🥊</span>
        <div class="bld-title"><b>${d ? `${esc(d.fromName)} fordert dich heraus` : `Sparring gegen ${esc(other.name)}`}</b><small>Level ${opp.level}</small></div>
        <button class="btn small" data-act="closeduel">✕</button></div>
      <div class="intel">${mf.scan ? `⌚ <b>Smartwatch-Scan:</b> Lieblingstaktik ${TACTICS[opp.favorite].icon} ${TACTICS[opp.favorite].name}` : '❔ Taktik des Gegners verborgen – eine ⌚ Smartwatch würde sie verraten.'}
        <br>${d ? '⚠️ Der Herausforderer hat schon gewählt und bekommt +10 %.' : '💥 Als Herausforderer bekommst du +10 %.'}</div>
      <h3>Taktik für Runde ${Math.min(3, duelPick.length + 1)} von 3</h3>
      <div class="picked">${[0, 1, 2].map(i => `<span class="pick ${duelPick[i] ? 'on' : ''}">${duelPick[i] ? TACTICS[duelPick[i]].icon : i + 1}</span>`).join('')}
        ${duelPick.length ? '<button class="btn small" data-act="clearpick">neu</button>' : ''}</div>
      <div class="tactics">${Object.entries(TACTICS).map(([t, T]) => `
        <button class="tbtn" data-act="tactic" data-arg="${t}" ${duelPick.length >= 3 ? 'disabled' : ''}>
          <span>${T.icon}</span><b>${T.name}</b><small>Kraft ${num(tacticPower(mf, t, !d))} · schlägt ${TACTICS[T.beats].icon}</small></button>`).join('')}</div>
      <button class="btn primary big" data-act="fight" ${duelPick.length < 3 ? 'disabled' : ''}>${d ? '🥊 Kämpfen!' : '🥊 Herausforderung schicken'}</button>
      <p class="hint">${TACTICS.A.icon} Distanz schlägt ${TACTICS.C.icon} Ansturm · ${TACTICS.C.icon} Ansturm schlägt ${TACTICS.B.icon} Finte · ${TACTICS.B.icon} Finte schlägt ${TACTICS.A.icon} Distanz · dazu etwas Glück 🎲</p>
    </section>`;
}

function reportCard(r, animate) {
  const rows = r.rounds.map((x, i) => {
    const [mt, ot, ms, os] = r.mineAtt ? [x.a, x.d, x.as, x.ds] : [x.d, x.a, x.ds, x.as];
    const won = ms > os || (ms === os && r.mineAtt);
    return `<div class="round ${won ? 'won' : 'lost'}" style="${animate ? `animation-delay:${0.4 + i * 0.9}s` : ''}">
      <div class="round-vs"><span>${TACTICS[mt].icon} <b>${ms}</b></span><small>Runde ${i + 1}</small><span><b>${os}</b> ${TACTICS[ot].icon}</span></div>
      <small>${won ? 'Dein Held' : esc(r.opp)} ${FLAVOR[won ? mt + ot : ot + mt]}</small></div>`;
  }).join('');
  const item = r.item && me().inv.find(i => i.uid === r.item);
  return `
    <section class="card report ${r.win ? 'won' : 'lost'} ${animate ? 'fresh' : ''}">
      <div class="goal-head"><span class="big-icon">🥊</span>
        <div class="bld-title"><b>Sparring gegen ${esc(r.opp)}</b><small>${r.mineAtt ? 'du hast herausgefordert' : 'du hast verteidigt'}${r.auto ? ' · automatisch' : ''} · ${fmtTime(r.t)}</small></div></div>
      ${rows}
      <div class="verdict" style="${animate ? 'animation-delay:3.2s' : ''}"><b>${r.win ? '🏆 Sieg!' : '😵 Niederlage'}</b>
        <small>${item ? `Beute: ${gearOf(item).icon} ${gearOf(item).name} (${rarityOf(item).name})` : r.win ? '' : 'Beim nächsten Mal!'}</small></div>
      ${animate ? '<button class="btn small" data-act="seen">OK</button>' : ''}
    </section>`;
}

function stakeLine() {
  const sl = stakeLoser();
  return `<div class="stake">${esc(state.stake)} <b>Einsatz:</b> Überlebt er, gibt der mit weniger Schaden aus.
    ${sl ? `<small>Stand jetzt zahlt: <b>${esc(sl.payer.name)}</b> 😬</small>` : ''}</div>`;
}

/* ---------- Saison ---------- */

function viewSaison() {
  const players = Object.values(state.players);
  const b = bossState();
  const weeks = [];
  for (let wk = weekKey(new Date(state.season.start + 'T12:00')); wk <= weekKey() && wk < seasonEnd(); wk = addDays(wk, 7)) weeks.push(wk);
  const res = state.season.result;
  return `
    ${res ? `<section class="card season-over ${res.won ? 'won' : 'lost'}">
      <div class="goal-head"><span class="big-icon">${res.won ? '🏆' : '😤'}</span>
        <div class="bld-title"><b>${res.won ? `Kapitel ${state.season.chapter} geschafft!` : 'Der Schweinehund hat überlebt'}</b>
          <small>${res.won ? (state.pact ? `Jetzt ist euer Pakt fällig: ${esc(state.pact)} 🎉` : 'Gönnt euch was!')
            : (() => { const sl = state.stake && stakeLoser(); return sl ? `Einsatz fällig: <b>${esc(sl.payer.name)}</b> gibt <b>${esc(sl.winner.name)}</b> ${esc(state.stake)} aus! Dann Revanche.` : 'Kein Problem – Revanche!'; })()}</small></div></div>
      <button class="btn primary" data-act="newSeason">${res.won ? `Kapitel ${state.season.chapter + 1} starten` : 'Revanche starten'}</button></section>` : ''}
    <h2>Jagd ${state.season.no} · Kapitel ${state.season.chapter} <small>${res ? 'beendet' : `noch ${daysLeft()} Tage`}</small></h2>
    <div class="card list">
      <div class="row"><span>🐷 Schweinehund</span><b>${num(b.hp)} / ${num(b.max)}</b></div>
      <div class="row"><span>💤 Faule Tage (er heilt sich)</span><b>${b.lazy}</b></div>
      <div class="row"><span>🎁 Pakt: ${state.pact ? esc(state.pact) : '–'}</span><button class="btn small ghost" data-act="pact">ändern</button></div>
      <div class="row"><span>😬 Einsatz bei Niederlage: ${state.stake ? esc(state.stake) : '–'}</span><button class="btn small ghost" data-act="stake">ändern</button></div>
    </div>

    <h2>Schaden in dieser Jagd</h2>
    <div class="card list">${[...players].sort((x, y) => seasonDamage(y) - seasonDamage(x)).map((x, i) => `
      <div class="row ${x === me() ? 'me' : ''}"><span class="rank">${['🥇', '🥈'][i] || ''}</span>
        <span class="who"><b>${esc(x.name)}</b><small>${rankOf(x.life).icon} ${rankOf(x.life).name} · 👑 ${x.life.crowns}× MVP</small></span>
        <span class="pts"><b>${num(seasonDamage(x))}</b><small>Schaden</small></span></div>`).join('')}</div>

    <h2>Wochen</h2>
    <div class="card list">${weeks.reverse().map(wk => {
      const m = monsterOfWeek(wk);
      const ds = players.map(x => [x, weekDamage(x, wk)]).sort((a, c) => c[1] - a[1]);
      return `<div class="row"><span>${m.icon} <b>${m.name}</b><small> · ${m.hp <= 0 ? 'besiegt ✓' : wk === weekKey() ? 'läuft' : 'entkommen'}</small></span>
        <small>${ds[0][1] ? `👑 ${esc(ds[0][0].name)}` : '–'}</small></div>`;
    }).join('')}</div>

    <h2>🏛️ Ruhmeshalle</h2>
    <div class="card list">${state.hall.length ? state.hall.map(h => `
      <div class="row"><span><b>${h.won ? '🏆' : '😤'} Jagd ${h.no} · Kapitel ${h.chapter}</b><small>${h.won ? 'Schweinehund besiegt' : 'entkommen'} · MVP ${esc(h.mvp)}${h.pact ? ` · Pakt: ${esc(h.pact)}` : ''}${h.paid ? ` · ${esc(h.paid)}` : ''}</small></span>
        <small>${new Date(h.day + 'T12:00').toLocaleDateString('de-DE')}</small></div>`).join('')
      : '<div class="row muted">Noch leer – erlegt den ersten Schweinehund!</div>'}</div>`;
}

/* ---------- Profil ---------- */

function viewProfil() {
  const p = me(), L = p.life;
  const rank = rankOf(L), next = nextRank(L);
  const earned = new Set(earnedBadges(L));
  const line = e => {
    if (e.kind === 'train') {
      const a = byId(ACTIVITIES, e.id), c = e.course && byId(COURSES, e.course);
      return `${c ? c.icon : a.icon} ${c ? `Kurs: ${c.name}` : a.name} <span class="muted">−${num(e.dmg)}${e.pr ? ' 🏆' : ''}${e.crit ? ' 🎯' : ''}</span>`;
    }
    const h = byId(HEALTH, e.id);
    return `${h.icon} ${h.name}`;
  };
  return `
    <h2>Profil von ${esc(p.name)}</h2>
    <section class="card">
      <div class="goal-head"><span class="big-icon">${rank.icon}</span>
        <div class="bld-title"><b>${rank.name}</b><small>Rang nach Trainingseinheiten – bleibt für immer</small></div></div>
      <div class="meter big"><i style="width:${next ? (L.sessions - rank.min) / (next.min - rank.min) * 100 : 100}%"></i></div>
      <small>${next ? `${L.sessions} / ${next.min} Einheiten → ${next.icon} ${next.name}` : `${L.sessions} Einheiten – höchster Rang!`}</small>
    </section>
    <div class="stats">
      <div><b>${num(L.sessions)}</b><small>Einheiten</small></div><div><b>${num(L.days)}</b><small>Trainingstage</small></div>
      <div><b>${num(L.prs)}</b><small>Rekorde</small></div><div><b>${num(L.bossKills)}</b><small>🐷 besiegt</small></div>
    </div>
    <h2>Abzeichen <small>${earned.size} / ${BADGES.length}</small></h2>
    <div class="badges">${BADGES.map(b => `<div class="badge ${earned.has(b) ? 'on' : ''}"><span>${b.icon}</span><b>${b.name}</b><small>${b.desc}</small></div>`).join('')}</div>

    <h2>Verlauf</h2>
    <div class="card list">${p.log.length ? p.log.slice(0, 30).map(e => `<div class="row log"><span>${line(e)}</span><small>${fmtTime(e.t)}</small></div>`).join('')
      : '<div class="row muted">Noch nichts eingetragen – ab ins Gym! 💪</div>'}</div>
    ${p.log.length && p.log[0].day === todayStr() ? '<button class="btn" data-act="undo">↩️ Letzten Eintrag rückgängig</button>' : ''}

    <h2>Einstellungen</h2>
    <div class="card list">
      <div class="row"><span>📖 So funktioniert's</span><button class="btn small" data-act="intro">Anleitung</button></div>
      ${ownIds().map(id => `<div class="row"><span>🧑 ${esc(state.players[id].name)}</span><button class="btn small" data-act="rename" data-arg="${id}">Umbenennen</button></div>`).join('')}
      ${online() ? `
        <div class="row"><span>${connected ? '🟢 Online verbunden' : '🟠 Gerade offline – wird nachgeholt'}</span></div>
        <div class="row"><span>🔗 Einladungslink</span><button class="btn small" data-act="share">Teilen</button></div>
        <div class="row"><span>📱 Dieses Gerät abmelden</span><button class="btn small" data-act="leave">Abmelden</button></div>`
      : '<div class="row"><span>📴 Nur auf diesem Gerät</span><button class="btn small" data-act="leave">Online spielen</button></div>'}
      <div class="row"><span>🏰 Altes Dorf-Spiel</span><a class="btn small" href="dorf/">Archiv</a></div>
    </div>
    <button class="btn danger" data-act="reset">Spiel zurücksetzen</button>`;
}

/* ---------- Startbildschirm ---------- */

function viewSetup() {
  const nameField = '<input id="setup-name" class="field" maxlength="20" placeholder="Dein Name" autocomplete="nickname">';
  if (setupStep === 'invite') {
    return `<section class="card setup"><div class="setup-icon">🐷</div><h2>Die Jagd beginnt!</h2>
      <p>Schick deinem Trainingspartner diesen Link – zusammen jagt ihr den inneren Schweinehund.</p>
      <div class="linkbox">${esc(inviteLink())}</div>
      <button class="btn primary" data-act="share">🔗 Link teilen</button>
      <button class="btn" data-act="setupdone">Los geht's 💪</button></section>`;
  }
  if (joinId) {
    if (!joinInfo) { loadJoinInfo(); return '<section class="card setup"><p>⏳ Lade Einladung …</p></section>'; }
    if (joinInfo.missing || joinInfo.error || !joinInfo.meta) {
      return `<section class="card setup"><div class="setup-icon">🤔</div><h2>Einladung nicht gefunden</h2>
        <p>${joinInfo.error ? 'Keine Verbindung – bitte mit Internet nochmal öffnen.' : 'Der Link ist ungültig oder das Spiel wurde gelöscht.'}</p></section>`;
    }
    const players = joinInfo.players || {};
    return `<section class="card setup">${bossSvg(1, 1)}<h2>Hilf bei der Jagd!</h2>
      <p>Dein Trainingspartner jagt den inneren Schweinehund – und braucht dich.</p>
      ${joinInfo.meta.stake ? `<div class="stake">${esc(joinInfo.meta.stake)} <b>Einsatz:</b> Überlebt er, gibt der mit weniger Schaden aus.</div>` : ''}${nameField}
      ${['a', 'b'].map(pid => { const taken = players[pid] && players[pid].updatedAt;
        return `<button class="btn ${taken ? '' : 'primary'}" data-act="join" data-arg="${pid}">${taken ? `Ich bin ${esc(players[pid].name)} (anderes Gerät)` : 'Mitmachen'}</button>`; }).join('')}
      <p class="hint">„Anderes Gerät“ nur, wenn du schon mitspielst und das Gerät wechselst.</p></section>`;
  }
  return `<section class="card setup">
      ${bossSvg(1, 1)}
      <h2>Jagt den inneren Schweinehund!</h2>
      <p>Er liegt auf dem Sofa und lacht euch aus. Jedes Training ist ein Treffer – und an jedem faulen Tag heilt er sich. Schafft ihr ihn in 6 Wochen?</p>
      <div class="stake-pick"><b>😬 Euer Einsatz</b>
        <small>Überlebt der Schweinehund, gibt der mit weniger Schaden dem anderen aus:</small>
        <div class="course-chips">${[...new Set([...STAKES, setupStake])].map(s => `<button class="chip-btn ${s === setupStake ? 'on' : ''}" data-act="pickstake" data-arg="${esc(s)}">${esc(s)}</button>`).join('')}
          <button class="chip-btn" data-act="pickstake" data-arg="eigen">✏️ Eigener</button></div></div>
      ${nameField}
      <input id="setup-code" class="field" maxlength="40" placeholder="🔒 Startcode" autocomplete="off" autocapitalize="none">
      <button class="btn primary big" data-act="create">Jagd starten</button>
      <p class="hint">Du hast einen Einladungslink bekommen? Dann öffne einfach den Link.</p>
      <button class="btn ghost" data-act="local">Nur auf diesem Gerät ausprobieren</button>
      <button class="btn small ghost" data-act="intro">📖 So funktioniert's</button>
    </section>`;
}

/* ---------- Spielanleitung (wird beim ersten Start vorgeschaltet) ---------- */

const INTRO = [
  { pic: () => bossSvg(1, 1), title: 'Euer Gegner: der innere Schweinehund',
    body: `<p>Er liegt auf dem Sofa, futtert Chips und lacht euch aus. Ihr seid zu zweit – und ihr jagt ihn <b>gemeinsam</b>.</p>
      <ul class="intro-list">
        <li>🎯 <b>Ziel:</b> ${BOSS_HP.toLocaleString('de-DE')} Lebenspunkte in <b>${SEASON_DAYS / 7} Wochen</b> runterprügeln.</li>
        <li>😴 An jedem Tag, an dem <b>keiner</b> trainiert, heilt er sich um ${BOSS_REGEN}.</li>
        <li>🏆 Geschafft? Dann kommt Kapitel 2 – mit einem stärkeren Schweinehund.</li>
        <li>😬 Nicht geschafft? Dann gibt der mit weniger Schaden den <b>Einsatz</b> aus – z. B. einen 🥙 Döner.</li>
      </ul>` },
  { pic: () => '<div class="intro-icon">👊</div>', title: 'Jedes Training ist ein Treffer',
    body: `<ol class="intro-steps">
        <li>Nach dem Gym im Tab <b>🐷 Jagd</b> antippen, was du gemacht hast: Milon, Freies Training, Rad/Crosstrainer, Kurs oder Dehnen.</li>
        <li><b>Zuschlagen:</b> Ein Balken pendelt – triff die Mitte für bis zu +30 % Schaden. Oder ohne Minispiel eintragen.</li>
        <li>Der Schweinehund steckt ein, seine Lebensleiste sinkt.</li>
      </ol>
      <p class="hint">Mehr Schaden gibt es für: 🏆 neuen Rekord (Gewicht gesteigert, 1× am Tag), 🔥 regelmäßiges Training (Combo), 🥗 gesund gelebt, 📣 Anfeuern vom Partner.</p>` },
  { pic: () => '<div class="intro-icon">🎁</div>', title: 'Beute & dein Held',
    body: `<ul class="intro-list">
        <li>🔐 Nach jedem Training öffnet sich dein <b>Spind</b> mit zufälliger Ausrüstung – von gewöhnlich bis <b style="color:#f5b81c">legendär</b>.</li>
        <li>🦾 Im Tab <b>Held</b> legst du sie an. Sie macht dich stärker.</li>
        <li>💪 Training steigert Kraft, Ausdauer und Geist und schaltet <b>Talente</b> frei.</li>
        <li>👹 Jede Woche taucht ein <b>Ausreden-Monster</b> auf – wer es erledigt, bekommt epische Beute.</li>
      </ul>` },
  { pic: () => '<div class="intro-icon">🥊</div>', title: 'Sparring & Saison',
    body: `<ul class="intro-list">
        <li>🥊 <b>Sparring:</b> Fordere deinen Partner heraus. Wähle 3 Taktiken – 🏃 schlägt 💥, 🥷 schlägt 🏃, 💥 schlägt 🥷. Er hat ${CHALLENGE_H} Stunden zum Antworten.</li>
        <li>⚡ Die Energie dafür bekommst du durchs Training.</li>
        <li>👑 Wer pro Woche mehr Schaden macht, bekommt die <b>MVP-Krone</b>.</li>
        <li>🎁 Optional: Legt einen <b>Pakt</b> fest – eure echte Belohnung, wenn er fällt.</li>
      </ul>
      <p class="hint">Diese Anleitung findest du jederzeit wieder unter 🏅 Profil.</p>` },
];

function viewIntro() {
  const i = introPage, pg = INTRO[i], last = i === INTRO.length - 1;
  return `<section class="card setup intro">
      <div class="intro-pic">${pg.pic()}</div>
      <div class="eyebrow">So funktioniert's · ${i + 1} / ${INTRO.length}</div>
      <h2>${pg.title}</h2>
      <div class="intro-body">${pg.body}</div>
      <div class="intro-dots">${INTRO.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
      <div class="intro-nav">
        ${i > 0 ? '<button class="btn" data-act="introprev">← Zurück</button>' : '<button class="btn ghost" data-act="introdone">Überspringen</button>'}
        <button class="btn primary" data-act="${last ? 'introdone' : 'intronext'}">${last ? "Los geht's 💪" : 'Weiter →'}</button>
      </div>
    </section>`;
}

const VIEWS = { jagd: viewJagd, held: viewHeld, sparring: viewSparring, saison: viewSaison, profil: viewProfil };

function render() {
  const setup = !game || joinId || setupStep;
  document.body.classList.toggle('setup-mode', !!setup || introPage !== null);
  if (introPage !== null) {
    document.getElementById('view').innerHTML = viewIntro();
    document.getElementById('overlay').innerHTML = '';
    return;
  }
  if (setup) {
    const keep = {};
    for (const id of ['setup-name', 'setup-code']) { const el = document.getElementById(id); if (el) keep[id] = el.value; }
    document.getElementById('view').innerHTML = viewSetup();
    for (const id in keep) { const el = document.getElementById(id); if (el) el.value = keep[id]; }
    document.getElementById('overlay').innerHTML = '';
    return;
  }
  resolveAll();
  nextReveal();
  renderHeader();
  document.getElementById('view').innerHTML = VIEWS[tab]();
  document.getElementById('overlay').innerHTML = pending ? swingOverlay() : hitShow ? hitOverlay() : reveal ? revealOverlay() : '';
  document.body.classList.toggle('ov-open', !!(pending || hitShow || reveal));
}

const toastQueue = [];
let toastBusy = false;
function toast(msg, big = false) { toastQueue.push([msg, big]); if (toastQueue.length > 3) toastQueue.shift(); if (!toastBusy) nextToast(); }
function nextToast() {
  const el = document.getElementById('toast');
  const t = toastQueue.shift();
  if (!t) { toastBusy = false; return; }
  toastBusy = true;
  el.textContent = t[0];
  el.className = 'show' + (t[1] ? ' big' : '');
  setTimeout(() => { el.className = ''; setTimeout(nextToast, 250); }, t[1] ? 2600 : 1600);
}

document.addEventListener('visibilitychange', () => { if (!document.hidden && !pending) render(); });
setInterval(() => {
  if (pending) return; // das Minispiel nicht stören
  if (resolveAll()) { render(); return; }
  const now = Date.now();
  for (const el of document.querySelectorAll('[data-eta]')) el.textContent = fmtDur(Number(el.dataset.eta) - now);
}, 1000);

render();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloaded && !pending) { reloaded = true; location.reload(); } });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
    .then(reg => document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update(); }))
    .catch(() => {});
}
