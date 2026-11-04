'use strict';

/* =========================================================
   Muskelburg – Arena der Helden
   Training macht deinen Helden stärker, im Duell zählen Taktik, Ausrüstung und ein bisschen Glück.
   Spielregeln – hier lässt sich alles bequem anpassen
   ========================================================= */

const STATS = {
  str:  { name: 'Stärke',   icon: '💪' },
  end:  { name: 'Ausdauer', icon: '🫀' },
  mind: { name: 'Geist',    icon: '🧠' },
};
const BASE_STAT = 10;

// Taktiken wie Schere-Stein-Papier: jede schlägt eine andere, jede nutzt einen anderen Wert
const TACTICS = {
  A: { name: 'Auf Distanz', icon: '🏃', stat: 'end',  beats: 'C' },
  B: { name: 'Hinterhalt',  icon: '🥷', stat: 'mind', beats: 'A' },
  C: { name: 'Ansturm',     icon: '💥', stat: 'str',  beats: 'B' },
};
const T_WIN = 1.5, T_LOSE = 0.7; // Taktik schlägt / wird geschlagen
const FLAVOR = {
  AC: 'tänzelt dem Ansturm aus und kontert aus der Bewegung',
  CB: 'stürmt durch die Finte, bevor sie wirkt',
  BA: 'lockt den Läufer mit einer Finte in die Ecke',
  AA: 'Ausdauerduell – wer länger durchhält, gewinnt',
  BB: 'Taktik gegen Taktik – der klügere Kopf gewinnt',
  CC: 'Schlagabtausch – rohe Kraft entscheidet',
};

// Training: gives = Wertepunkte, perDay = höchstens so oft am Tag, heals = heilt eine Verletzung
const ACTIVITIES = [
  { id: 'milon',  name: 'Milon-Zirkel',      unit: '1 Durchgang · ca. 10 Min.',            icon: '🔁', gives: { str: 3, end: 1 }, taler: 10, perDay: 6 },
  { id: 'frei',   name: 'Freies Training',   unit: '15 Min. an Geräten oder Hanteln',      icon: '🏋️', gives: { str: 2, end: 1 }, taler: 8,  perDay: 4 },
  { id: 'cardio', name: 'Rad / Crosstrainer', unit: '10 Min.',                             icon: '🚴', gives: { end: 2 },         taler: 5,  perDay: 6 },
  { id: 'kurs',   name: 'Kurs',              unit: 'Yoga, Pilates, Rücken … · 1× am Tag',  icon: '🧘', gives: { mind: 4, end: 1 }, taler: 12, perDay: 1, heals: true, course: true },
  { id: 'dehnen', name: 'Dehnen & Mobility', unit: '10 Min. · bis 2× am Tag',              icon: '🤸', gives: { mind: 2 },        taler: 5,  perDay: 2, heals: true },
];
const COURSES = [
  { id: 'yoga', name: 'Yoga', icon: '🧘' }, { id: 'pilates', name: 'Pilates', icon: '🤸' },
  { id: 'ruecken', name: 'Rücken', icon: '🦴' }, { id: 'spinning', name: 'Spinning', icon: '🚲' },
  { id: 'sonstiges', name: 'Sonstiges', icon: '✨' },
];
// Gesund gelebt: heilt Verletzungen (je 1× am Tag)
const HEALTH = [
  { id: 'schlaf', name: 'Gut geschlafen', icon: '😴' },
  { id: 'essen',  name: 'Gesund gegessen', icon: '🥗' },
  { id: 'wasser', name: 'Genug getrunken', icon: '💧' },
];

const ENERGY_MAX = 5;        // ⚡ Kampfenergie – gibt es nur durchs Training
const ENERGY_START = 3;
const WOUND_MAX = 3;         // Verletzungen: je −10 % im Kampf
const WOUND_MALUS = 0.1;
const WOUND_HEAL_H = 48;     // ohne Zutun heilt eine Verletzung nach 48 Std.
const CHALLENGE_H = 12;      // so lange hat man Zeit, eine Herausforderung anzunehmen
const CHALLENGER_BONUS = 0.1;
const EXP_PER_FIGHT = 0.01, EXP_MAX = 0.2; // Kampferfahrung: +1 % je Kampf, höchstens +20 %
const LUCK_MIN = 0.75, LUCK_SPAN = 0.5;    // Glück: × 0,75 … 1,25
const RUHM_START = 1000;
const CATCHUP_PER_LEVEL = 0.1, CATCHUP_MAX = 0.5; // wer im Level hinten liegt, bekommt mehr Wertepunkte

const SEASON_WEEKS = 8;
const WEEK_GOAL_DAYS = 2;
const WEEK_CHEST = 40;       // Taler, + 25 % je Woche Serie (bis doppelt), dazu 1 ⚡
const TEAM_GOAL_DAYS = 5;
const TEAM_CHEST = 60;       // Taler für beide, dazu 1 ⚡

// Ausrüstung: Freischalten durch Training, dann mit Taler kaufen. bonus gilt je Taktik (all = alle)
// Fair verteilt: jede Taktik hat ein Einsteiger- (+4) und ein Profi-Gerät (+10). Die Freischalt-Zahlen sind so gewählt,
// dass jeder Weg etwa gleich viel Trainingszeit braucht (Cardio-Einheiten sind kürzer und häufiger → höhere Zahl).
const SLOTS = { weapon: 'Kampfgerät', armor: 'Outfit', trinket: 'Gadget' };
const ITEMS = [
  { id: 'boxhandschuhe', slot: 'weapon', icon: '🥊', name: 'Boxhandschuhe', cost: 60,  bonus: { C: 4 },  need: { what: 'kraft', n: 10 } },
  { id: 'springseil',   slot: 'weapon', icon: '🪢', name: 'Speed-Springseil', cost: 60, bonus: { A: 4 }, need: { what: 'cardio', n: 15 } },
  { id: 'kopfhoerer',   slot: 'weapon', icon: '🎧', name: 'Fokus-Kopfhörer', cost: 60, bonus: { B: 4 },  need: { what: 'geist', n: 6 } },
  { id: 'medizinball',  slot: 'weapon', icon: '🏐', name: 'Medizinball',    cost: 200, bonus: { C: 10 }, need: { what: 'kraft', n: 40 } },
  { id: 'laufschuhe',   slot: 'weapon', icon: '👟', name: 'Carbon-Laufschuhe', cost: 200, bonus: { A: 10 }, need: { what: 'cardio', n: 60 } },
  { id: 'tablet',       slot: 'weapon', icon: '📱', name: 'Analyse-Tablet', cost: 200, bonus: { B: 10 }, need: { what: 'geist', n: 25 } },
  { id: 'shirt',        slot: 'armor',  icon: '👕', name: 'Funktionsshirt', cost: 50,  bonus: { all: 2 }, need: { what: 'days', n: 5 } },
  { id: 'kompression',  slot: 'armor',  icon: '🦺', name: 'Kompressionsanzug', cost: 150, bonus: { all: 5 }, need: { what: 'days', n: 20 } },
  { id: 'champion',     slot: 'armor',  icon: '🥋', name: 'Champion-Kampfanzug', cost: 300, bonus: { all: 9 }, need: { what: 'boss', n: 3 } },
  { id: 'smartwatch',   slot: 'trinket', icon: '⌚', name: 'Smartwatch mit Gegner-Scan', cost: 100, bonus: {}, reveal: true, need: { what: 'geist', n: 5 },
    desc: 'zeigt vor dem Kampf Ausrüstung und Lieblingstaktik des Gegners' },
  { id: 'cap',          slot: 'trinket', icon: '🧢', name: 'Glücks-Cap',     cost: 100, bonus: {}, luck: 0.1, need: { what: 'weeks', n: 3 },
    desc: 'mehr Glück: nie wieder ein ganz schlechter Wurf' },
  { id: 'shake',        slot: 'trinket', icon: '🥤', name: 'Protein-Shaker', cost: 120, bonus: { all: 3 }, need: { what: 'wins', n: 10 } },
  { id: 'medaille',     slot: 'trinket', icon: '🏅', name: 'Siegermedaille', cost: 250, bonus: { all: 6 }, need: { what: 'days', n: 30 } },
];
const NEEDS = {
  kraft:  { label: 'Milon- oder Kraft-Einheiten', count: p => p.counts.milon + p.counts.frei },
  cardio: { label: 'Rad/Crosstrainer-Einheiten',  count: p => p.counts.cardio },
  geist:  { label: 'Kurse oder Dehn-Einheiten',   count: p => p.counts.kurs + p.counts.dehnen },
  days:   { label: 'Trainingstage',               count: p => p.life.days },
  weeks:  { label: 'Wochenziele',                 count: p => p.life.goals },
  wins:   { label: 'gewonnene Kämpfe',            count: p => p.life.wins },
  boss:   { label: 'besiegte Wochenbosse',        count: p => p.life.bossWins },
};

// Ränge nach Trainingseinheiten insgesamt – bleiben für immer
const RANKS = [
  { min: 0, icon: '🔰', name: 'Einsteiger' }, { min: 15, icon: '🥉', name: 'Fortgeschritten' }, { min: 40, icon: '🥈', name: 'Athlet' },
  { min: 80, icon: '🥇', name: 'Eisenathlet' }, { min: 150, icon: '💎', name: 'Profi' },
  { min: 300, icon: '🏆', name: 'Stahlkörper' }, { min: 500, icon: '👑', name: 'Legende aus Stahl' },
];

const BADGES = [
  { icon: '🌱', name: 'Erster Schritt', desc: '1 Training',            test: l => l.sessions >= 1 },
  { icon: '💪', name: 'Dranbleiber',    desc: '50 Trainings',          test: l => l.sessions >= 50 },
  { icon: '🦾', name: 'Maschine',       desc: '250 Trainings',         test: l => l.sessions >= 250 },
  { icon: '📅', name: 'Stammgast',      desc: '30 Trainingstage',      test: l => l.days >= 30 },
  { icon: '🔥', name: 'Feuer',          desc: '4 Wochenziele in Folge', test: l => l.bestStreak >= 4 },
  { icon: '⚔️', name: 'Erster Sieg',    desc: '1 Kampf gewonnen',      test: l => l.wins >= 1 },
  { icon: '🏅', name: 'Gladiator',      desc: '25 Kämpfe gewonnen',    test: l => l.wins >= 25 },
  { icon: '🤺', name: 'Duellant',       desc: '5 Duelle gegen Menschen', test: l => l.duels >= 5 },
  { icon: '🐲', name: 'Bossjäger',      desc: 'Wochenboss besiegt',    test: l => l.bossWins >= 1 },
  { icon: '🧘', name: 'Ausgeglichen',   desc: '10 Kurse oder Dehn-Einheiten', test: l => l.calm >= 10 },
  { icon: '🏆', name: 'Champion',       desc: 'eine Saison gewonnen',  test: l => l.seasonsWon >= 1 },
];

// Bot-Helden: Grundwerte + Wachstum pro Tag seit Spielbeginn; w = Vorliebe für Taktik A/B/C
const BOTS = [
  { id: 'puppe',  name: 'Trainingspuppe',  icon: '🎯', base: [8, 8, 8],    grow: 0,    w: [1, 1, 1], ruhm: 800,  info: 'perfekt zum Üben' },
  { id: 'mia',    name: 'Mini-Mia',        icon: '🐭', base: [11, 13, 11], grow: 0.1,  w: [2, 1, 1], ruhm: 880,  info: 'flink, aber schwach' },
  { id: 'fritz',  name: 'Faulpelz Fritz',  icon: '🦥', base: [14, 11, 15], grow: 0.2,  w: [1, 3, 1], ruhm: 940,  info: 'lauert lieber, statt zu laufen' },
  { id: 'hanno',  name: 'Hasenfuß Hanno',  icon: '🐰', base: [12, 20, 13], grow: 0.3,  w: [4, 1, 1], ruhm: 1000, info: 'hält immer Abstand' },
  { id: 'frieda', name: 'Fleißige Frieda', icon: '🐝', base: [19, 19, 19], grow: 0.45, w: [1, 1, 1], ruhm: 1060, info: 'ausgeglichen und zäh' },
  { id: 'rudi',   name: 'Raufbold Rudi', icon: '🦊', base: [27, 17, 21], grow: 0.55, w: [1, 1, 3], ruhm: 1120, info: 'stürmt am liebsten los' },
  { id: 'gisela', name: 'Weise Gisela',    icon: '🦉', base: [17, 20, 31], grow: 0.6,  w: [1, 3, 1], ruhm: 1180, info: 'Meisterin des Hinterhalts' },
  { id: 'olaf',   name: 'Olaf der Bär',    icon: '🐻', base: [37, 21, 15], grow: 0.75, w: [1, 1, 4], ruhm: 1240, info: 'pure Kraft' },
  { id: 'lotte',  name: 'Lotte Langarm',   icon: '🐙', base: [21, 35, 23], grow: 0.75, w: [3, 1, 1], ruhm: 1300, info: 'trifft aus jeder Entfernung' },
  { id: 'horst',  name: 'Wolfs-Horst',     icon: '🐺', base: [44, 40, 40], grow: 0.9,  w: [1, 1, 1], ruhm: 1400, info: 'der gefährlichste Kämpfer im Gym' },
];
// Wochenbosse: wechseln jede Woche, wachsen mit dem stärkeren Helden mit
const BOSSES = [
  { id: 'golem',  name: 'Der Bodybuilder',     icon: '🦍', base: [60, 30, 30], w: [1, 1, 3], info: 'langsam, aber unglaublich stark' },
  { id: 'drache', name: 'Die Marathon-Maschine', icon: '🤖', base: [40, 55, 35], w: [3, 1, 1], info: 'wird einfach nie müde' },
  { id: 'koenig', name: 'Der Großmeister',     icon: '🥋', base: [45, 45, 50], w: [1, 2, 1], info: 'listig und erfahren' },
];
const BOSS_REWARD = 100;

/* =========================================================
   Zustand & Speichern
   ========================================================= */

// ?geraet=2 in der Adresse = zweites, getrenntes Gerät im selben Browser (zum Testen)
const DEVICE = new URLSearchParams(location.search).get('geraet') || '';
const KEY = 'muskelburg-arena-v2' + DEVICE;
const GAME_KEY = 'muskelburg-arena-game-v2' + DEVICE;
const DAY_MS = 86400000, H_MS = 3600e3;

function todayStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function daysBetween(a, b) { return Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / DAY_MS); }
function rid() { return Math.random().toString(36).slice(2, 12); }

function newLife() {
  return { sessions: 0, days: 0, weeks: {}, streak: 0, bestStreak: 0, lastGoalWeek: null, goals: 0,
    wins: 0, fights: 0, duels: 0, bossWins: 0, seasonsWon: 0, calm: 0 };
}

function newHero(name) {
  return {
    name, stats: { str: BASE_STAT, end: BASE_STAT, mind: BASE_STAT }, xp: 0, taler: 0, energy: ENERGY_START,
    wounds: 0, woundAt: 0, ruhm: RUHM_START,
    counts: { milon: 0, frei: 0, cardio: 0, kurs: 0, dehnen: 0 },
    owned: {}, equip: { weapon: null, armor: null, trinket: null }, tactics: ['C', 'A', 'B'],
    life: newLife(), lastDay: null, log: [], reports: [],
    outgoing: [], incoming: [], // Herausforderungen an / von Menschen
    bossWeek: null, teamClaimed: {}, credited: false, season: null, resetId: null, updatedAt: 0,
  };
}

function freshState() {
  return {
    v: 1, startDay: todayStr(), created: todayStr(), current: 'a',
    players: { a: newHero('Spieler 1'), b: newHero('Spieler 2') },
    season: { no: 1, weeks: SEASON_WEEKS, winner: null }, hall: [], team: {}, resetId: rid(),
  };
}

// Fehlende Felder ergänzen – die Online-Datenbank lässt leere Listen und Objekte einfach weg
const asList = x => Array.isArray(x) ? x.filter(Boolean) : x ? Object.values(x) : [];
function normalizeHero(p, name = '') {
  const fresh = newHero(name);
  p = { ...fresh, ...p };
  for (const k of ['stats', 'counts', 'equip', 'life']) p[k] = { ...fresh[k], ...p[k] };
  p.life.weeks = p.life.weeks || {};
  p.owned = p.owned || {};
  p.teamClaimed = p.teamClaimed || {};
  p.tactics = asList(p.tactics).length === 3 ? asList(p.tactics) : fresh.tactics;
  for (const k of ['log', 'reports', 'outgoing', 'incoming']) p[k] = asList(p[k]);
  for (const r of p.reports) r.rounds = asList(r.rounds);
  for (const d of [...p.outgoing, ...p.incoming]) d.tactics = asList(d.tactics);
  return p;
}
function normalizeMeta(s) {
  s.season = { no: 1, weeks: SEASON_WEEKS, winner: null, ...s.season };
  s.hall = asList(s.hall);
  s.team = s.team || {};
  s.created = s.created || s.startDay;
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
  } catch (e) { /* kaputter oder blockierter Speicher → neues Spiel */ }
  return freshState();
}

function save() {
  if (online()) state.players[game.me].updatedAt = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignorieren */ }
  pushMine();
}

let state = load();
let tab = 'training';
let duelTarget = null;  // gewählter Gegner in der Arena
let duelPick = [];      // gewählte Taktiken (3 Runden)
let answering = null;   // Herausforderung, auf die gerade geantwortet wird
let freshReport = null; // gerade ausgetragener Kampf (wird animiert gezeigt)
const me = () => state.players[state.current];

/* =========================================================
   Online-Spiel: jedes Handy schreibt nur seinen eigenen Helden.
   Was den anderen betrifft (Herausforderungen, Ergebnisse), geht als Nachricht an dessen Handy.
   ========================================================= */

let game = null;
try { game = JSON.parse(localStorage.getItem(GAME_KEY)); } catch (e) { /* kein Spiel */ }
let sync = null;
let connected = false;
const online = () => !!(game && game.id);
const ownIds = () => online() ? [game.me] : Object.keys(state.players);
const mine = () => ownIds().map(id => state.players[id]);
if (online()) state.current = game.me;
state.outbox = state.outbox || [];

function saveGame(g) {
  game = g;
  try { localStorage.setItem(GAME_KEY, JSON.stringify(g)); } catch (e) { /* ignorieren */ }
}
const clean = x => JSON.parse(JSON.stringify(x)); // ohne undefined – mag die Datenbank nicht

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
function metaSet(patch) {
  if (!online()) return;
  state.outbox.push({ meta: patch });
  flushOutbox();
}
// Nachricht an einen Helden: eigener → sofort anwenden, sonst ans andere Handy schicken
function sendEvent(pid, ev) {
  if (ownIds().includes(pid)) { applyEvent(state.players[pid], ev); return; }
  state.outbox.push({ to: pid, ev });
  flushOutbox();
}

function applyEvent(p, ev) {
  if (ev.kind === 'challenge') {
    if (!p.incoming.some(d => d.id === ev.duel.id)) {
      p.incoming.push(ev.duel);
      if (p === me()) toast(`⚔️ ${ev.duel.fromName} fordert dich heraus!`, true);
    }
  } else if (ev.kind === 'result' && ev.defSide) {
    finishDefense(p, ev.result);
  } else if (ev.kind === 'result') {
    finishHumanDuel(p, ev.result);
  }
}

// Saisonwechsel oder Zurücksetzen auf den eigenen Helden anwenden
function reconcileOwn() {
  let changed = false;
  for (const id of ownIds()) {
    const p = state.players[id];
    if (p.resetId && p.resetId !== state.resetId) {
      state.players[id] = normalizeHero({ name: p.name, tactics: p.tactics });
      changed = true;
    } else if (p.season && p.season !== state.season.no) {
      // neue Saison: Ruhm und offene Kämpfe zurück, der Held selbst bleibt (er spiegelt echtes Training)
      Object.assign(p, { ruhm: RUHM_START, wounds: 0, outgoing: [], incoming: [], credited: false, bossWeek: null });
      changed = true;
    }
    const q = state.players[id];
    if (q.resetId !== state.resetId || q.season !== state.season.no) {
      q.resetId = state.resetId;
      q.season = state.season.no;
      changed = true;
    }
  }
  return changed;
}

function otherFromRemote(data, name) {
  if (!data) return normalizeHero({ name });
  const p = normalizeHero(data);
  if (p.resetId && p.resetId !== state.resetId) return normalizeHero({ name: p.name });
  return p;
}

const syncHandlers = {
  connection(ok) { connected = ok; renderSyncDot(); },
  meta(m) {
    if (!m) return;
    Object.assign(state, normalizeMeta({ startDay: m.startDay, created: m.created, season: m.season, hall: m.hall, team: m.team, resetId: m.resetId }));
    resolveAll();
    render();
  },
  player(pid, data, first) {
    if (pid === game.me) {
      // derselbe Held auf PC und Handy: der neuere Stand aus dem Netz gewinnt
      if (data && data.updatedAt > (state.players[pid].updatedAt || 0)) {
        state.players[pid] = normalizeHero(data);
        try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignorieren */ }
        if (!first) toast('🔄 Dein Held wurde von deinem anderen Gerät aktualisiert');
        render();
      } else if (first) pushMine();
      return;
    }
    state.players[pid] = otherFromRemote(data, pid === 'a' ? 'Spieler 1' : 'Spieler 2');
    render();
  },
  event(key, ev) {
    applyEvent(me(), ev);
    sync.removeEvent(game.id, game.me, key);
    save();
    render();
  },
};

function startSync() {
  if (!online() || !window.MB_SYNC || sync) return;
  sync = window.MB_SYNC;
  sync.watch(game.id, game.me, syncHandlers);
  flushOutbox();
}
window.addEventListener('mb-sync-ready', startSync);

/* ---------- Spiel erstellen / beitreten ---------- */

function inviteLink() { return `${location.origin}${location.pathname}#arena=${game.id}`; }
const setupName = () => (document.getElementById('setup-name').value || '').trim().slice(0, 20);

async function createGame() {
  const name = setupName();
  if (!name) { toast('Gib zuerst deinen Namen ein'); return; }
  if (!window.MB_SYNC) { toast('Keine Verbindung – bitte mit Internet versuchen'); return; }
  state = freshState();
  state.players.a.name = name;
  state.outbox = [];
  saveGame({ id: rid() + rid(), me: 'a' });
  state.current = 'a';
  reconcileOwn();
  await window.MB_SYNC.createGame(game.id, clean({ startDay: state.startDay, created: state.created, season: state.season, hall: [], team: {}, resetId: state.resetId }));
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
  const id = joinId;
  saveGame({ id, me: pid });
  joinId = null;
  history.replaceState(null, '', location.pathname + location.search);
  state = freshState();
  state.current = pid;
  state.outbox = [];
  if (snap && snap.meta) Object.assign(state, normalizeMeta(snap.meta));
  state.players[pid] = existing ? normalizeHero(existing) : normalizeHero({ name });
  for (const other of Object.keys(state.players)) {
    if (other !== pid) state.players[other] = otherFromRemote(snap && snap.players && snap.players[other], other === 'a' ? 'Spieler 1' : 'Spieler 2');
  }
  reconcileOwn();
  save();
  startSync();
  setupStep = null;
  toast(`⚔️ Willkommen in der Arena, ${me().name}!`, true);
  render();
}

function playLocal() { saveGame({ local: true }); setupStep = null; render(); }

async function shareInvite() {
  const url = inviteLink();
  try {
    if (navigator.share) { await navigator.share({ title: 'Muskelburg', text: 'Komm in die Arena! 💪⚔️', url }); return; }
  } catch (e) { /* abgebrochen */ }
  try { await navigator.clipboard.writeText(url); toast('🔗 Link kopiert'); } catch (e) { prompt('Diesen Link schicken:', url); }
}

function leaveGame() {
  if (!confirm('Dieses Gerät vom Spiel abmelden? Dein Held bleibt online gespeichert – mit dem Einladungslink kommst du wieder rein.')) return;
  try { localStorage.removeItem(GAME_KEY); localStorage.removeItem(KEY); } catch (e) { /* ignorieren */ }
  location.reload();
}

let setupStep = null;
let joinId = (location.hash.match(/arena=([a-z0-9]+)/) || [])[1] || null;
if (joinId && game && game.id === joinId) { joinId = null; history.replaceState(null, '', location.pathname + location.search); }

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

function weekKey(d = new Date()) {
  const x = new Date(d);
  x.setDate(x.getDate() - (x.getDay() + 6) % 7);
  return todayStr(x);
}
function prevWeekKey() { const d = new Date(); d.setDate(d.getDate() - 7); return weekKey(d); }
function currentStreak(life) { return life.lastGoalWeek === weekKey() || life.lastGoalWeek === prevWeekKey() ? life.streak : 0; }
function chestFor(streak) { return Math.round(WEEK_CHEST * (1 + 0.25 * Math.min(4, Math.max(0, streak - 1)))); }
function teamDays(wk = weekKey()) { return sum(Object.values(state.players).map(p => p.life.weeks[wk] || 0)); }

function doneToday(p, id) { return p.log.filter(e => e.kind === 'train' && e.id === id && todayStr(new Date(e.t)) === todayStr()).length; }
function healthDone(p, id) { return p.log.some(e => e.kind === 'health' && e.id === id && todayStr(new Date(e.t)) === todayStr()); }

// Aufhol-Bonus: wer im Level hinter dem anderen Spieler liegt, bekommt mehr Wertepunkte
function catchUp(p) {
  const others = Object.values(state.players).filter(x => x !== p);
  const lead = Math.max(...others.map(levelOf));
  return Math.min(CATCHUP_MAX, Math.max(0, lead - levelOf(p)) * CATCHUP_PER_LEVEL);
}

function itemOf(id) { return id && byId(ITEMS, id); }
function equipped(p) { return Object.values(p.equip).map(itemOf).filter(Boolean); }
function needProgress(p, item) { const n = NEEDS[item.need.what]; return { have: n.count(p), n: item.need.n, label: n.label }; }
function unlocked(p, item) { const g = needProgress(p, item); return g.have >= g.n; }

/* ---------- Kämpfer & Kampf ---------- */

// Alles, was im Kampf zählt – als Momentaufnahme (wird bei Herausforderungen mitgeschickt)
function fighterOf(p) {
  const bonus = { A: 0, B: 0, C: 0 };
  let luck = 0, reveal = false;
  for (const it of equipped(p)) {
    for (const t in bonus) bonus[t] += (it.bonus[t] || 0) + (it.bonus.all || 0);
    luck += it.luck || 0;
    reveal = reveal || !!it.reveal;
  }
  return {
    name: p.name, icon: '🤼', level: levelOf(p), stats: { ...p.stats }, bonus, luck, reveal,
    exp: Math.min(EXP_MAX, p.life.fights * EXP_PER_FIGHT), wounds: p.wounds, ruhm: p.ruhm,
    items: equipped(p).map(i => i.id), favorite: p.tactics[0],
  };
}

function botStats(bot, growth) {
  const [s, e, m] = bot.base;
  return { str: s + growth, end: e + growth, mind: m + growth };
}
function fighterOfBot(bot) {
  const days = Math.max(0, daysBetween(state.created, todayStr()));
  const st = botStats(bot, bot.grow * days);
  const lvl = 1 + Math.floor(Math.sqrt((sum(st) - 3 * BASE_STAT) / 4));
  return { name: bot.name, icon: bot.icon, level: Math.max(1, lvl), stats: st, bonus: { A: 0, B: 0, C: 0 }, luck: 0,
    exp: 0.05, wounds: 0, ruhm: bot.ruhm, items: [], bot, favorite: 'ABC'[bot.w.indexOf(Math.max(...bot.w))] };
}
function bossOfWeek() {
  const wk = weekKey();
  const boss = BOSSES[Math.floor(daysBetween('2026-01-05', wk) / 7) % BOSSES.length];
  const lvl = Math.max(...Object.values(state.players).map(levelOf));
  const f = 1 + 0.08 * lvl;
  const st = { str: boss.base[0] * f, end: boss.base[1] * f, mind: boss.base[2] * f };
  return { name: boss.name, icon: boss.icon, level: lvl + 3, stats: st, bonus: { A: 0, B: 0, C: 0 }, luck: 0, exp: 0.1,
    wounds: 0, ruhm: 1500, items: [], bot: boss, boss: true, favorite: 'ABC'[boss.w.indexOf(Math.max(...boss.w))] };
}

// Bot wählt Taktiken nach Vorliebe (und etwas Zufall)
function botTactics(bot, seed) {
  const total = sum(bot.w);
  return [0, 1, 2].map(i => {
    let r = hash01(`${seed}:bt${i}`) * total;
    for (let k = 0; k < 3; k++) if ((r -= bot.w[k]) < 0) return 'ABC'[k];
    return 'C';
  });
}

// Wert einer Taktik ohne Glück – für die Vorschau
function tacticPower(f, t, challenger = false) {
  return (f.stats[TACTICS[t].stat] + f.bonus[t]) * (1 + f.exp) * (1 - WOUND_MALUS * f.wounds) * (challenger ? 1 + CHALLENGER_BONUS : 1);
}

// 3 Runden; wer mehr Runden gewinnt, gewinnt den Kampf. seed macht das Ergebnis auf beiden Handys gleich
function fight(att, def, attT, defT, seed) {
  const rounds = [];
  let aw = 0, dw = 0, at = 0, dt = 0;
  for (let i = 0; i < 3; i++) {
    const [a, d] = [attT[i], defT[i]];
    const ma = TACTICS[a].beats === d ? T_WIN : TACTICS[d].beats === a ? T_LOSE : 1;
    const md = TACTICS[d].beats === a ? T_WIN : TACTICS[a].beats === d ? T_LOSE : 1;
    const la = LUCK_MIN + att.luck + (LUCK_SPAN - att.luck) * hash01(`${seed}:a${i}`);
    const ld = LUCK_MIN + def.luck + (LUCK_SPAN - def.luck) * hash01(`${seed}:d${i}`);
    const as = Math.round(tacticPower(att, a, true) * ma * la);
    const ds = Math.round(tacticPower(def, d) * md * ld);
    if (as >= ds) aw++; else dw++;
    at += as; dt += ds;
    rounds.push({ a, d, as, ds });
  }
  return { rounds, attWin: aw > dw || (aw === dw && at >= dt) };
}

function eloDelta(winner, loser, k = 32) {
  const exp = 1 / (1 + 10 ** ((loser - winner) / 400));
  return Math.max(4, Math.round(k * (1 - exp)));
}

// Ergebnis für einen Helden verbuchen (Ruhm, Taler, Verletzung, Bericht)
function bookFight(p, { win, opp, rounds, mineAtt, delta, kind, taler }) {
  p.life.fights++;
  if (win) p.life.wins++;
  if (kind === 'human') p.life.duels++;
  p.ruhm = Math.max(0, p.ruhm + (win ? delta : -delta));
  p.taler += taler;
  let wound = false;
  if (!win && p.wounds < WOUND_MAX) {
    p.wounds++;
    p.woundAt = Date.now();
    wound = true;
  }
  const r = { t: Date.now(), id: rid(), opp: opp.name, oppIcon: opp.icon, kind, win, rounds, mineAtt, delta: win ? delta : -delta, taler, wound };
  p.reports.unshift(r);
  p.reports.length = Math.min(p.reports.length, 30);
  return r;
}

/* ---------- Duelle gegen Menschen ---------- */

// Ergebnis beim Herausforderer verbuchen (kommt vom anderen Handy oder nach Ablauf der Frist)
function finishHumanDuel(p, res) {
  const o = p.outgoing.find(x => x.id === res.id);
  if (!o) return;
  p.outgoing = p.outgoing.filter(x => x !== o);
  const r = bookFight(p, { win: res.attWin, opp: { name: res.defName, icon: '🤼' }, rounds: res.rounds, mineAtt: true,
    delta: res.delta, kind: 'human', taler: res.attWin ? 25 : 5 });
  if (res.auto) r.auto = true;
  if (p === me()) { freshReport = r.id; toast(res.attWin ? `🏆 Duell gegen ${res.defName} gewonnen!` : `💀 Duell gegen ${res.defName} verloren`, true); }
}

// Kampf zwischen Herausforderung d und Verteidiger p austragen
function resolveDuel(d, defender, defT, auto) {
  const def = fighterOf(defender);
  const res = fight(d.snap, def, d.tactics, defT, d.id);
  const delta = res.attWin ? eloDelta(d.snap.ruhm, defender.ruhm) : eloDelta(defender.ruhm, d.snap.ruhm);
  return { id: d.id, rounds: res.rounds, attWin: res.attWin, delta, attName: d.fromName, defName: defender.name, auto };
}

// Abgelaufene Herausforderungen: der Herausforderer entscheidet mit der Standard-Taktik des anderen
function expireDuels(p) {
  let changed = false;
  for (const o of p.outgoing.filter(o => Date.now() > o.deadline)) {
    const defender = state.players[o.to];
    const res = resolveDuel(o, defender, defender.tactics, true);
    finishHumanDuel(p, res);
    sendEvent(o.to, { kind: 'result', result: res, defSide: true });
    changed = true;
  }
  return changed;
}

/* ---------- Belohnungen & Zeit ---------- */

function claimRewards(p) {
  let changed = false;
  const w = state.season.winner;
  if (w && w.pid === idOf(p) && !p.credited) { p.credited = true; p.life.seasonsWon++; changed = true; }
  const wk = weekKey();
  if (state.team[wk] && !p.teamClaimed[wk]) {
    p.teamClaimed[wk] = true;
    p.taler += TEAM_CHEST;
    p.energy = Math.min(ENERGY_MAX, p.energy + 1);
    if (p === me()) toast(`🤝 Teamziel geschafft! +${TEAM_CHEST} 🪙 und +1 ⚡`, true);
    changed = true;
  }
  // Verletzungen heilen mit der Zeit von allein
  if (p.wounds && Date.now() - p.woundAt > WOUND_HEAL_H * H_MS) { p.wounds--; p.woundAt = Date.now(); changed = true; }
  return changed;
}

function seasonEndDay() { const d = new Date(state.startDay + 'T12:00'); d.setDate(d.getDate() + state.season.weeks * 7); return todayStr(d); }
function daysLeft() { return daysBetween(todayStr(), seasonEndDay()); }

function standings() {
  return [
    ...Object.entries(state.players).map(([pid, p]) => ({ pid, name: p.name, icon: rankOf(p.life).icon, ruhm: p.ruhm, level: levelOf(p), info: rankOf(p.life).name })),
    ...BOTS.map(b => ({ name: b.name, icon: b.icon, ruhm: b.ruhm, level: fighterOfBot(b).level, info: 'Bot · ' + b.info, bot: true })),
  ].sort((x, y) => y.ruhm - x.ruhm);
}

function checkSeasonEnd() {
  if (state.season.winner || daysLeft() > 0) return false;
  const best = standings()[0];
  state.season.winner = { name: best.name, how: `hatte am Saisonende den meisten Ruhm (${num(best.ruhm)})`, pid: best.pid || null };
  metaSet({ 'season/winner': state.season.winner });
  return true;
}

function resolveAll() {
  if (!game) return false;
  let changed = reconcileOwn();
  for (const p of mine()) {
    changed = claimRewards(p) || changed;
    changed = expireDuels(p) || changed;
  }
  changed = checkSeasonEnd() || changed;
  if (changed) save();
  return changed;
}

/* =========================================================
   Aktionen
   ========================================================= */

function train(arg) {
  const [actId, course] = arg.split(':');
  const p = me();
  const L = p.life;
  const a = byId(ACTIVITIES, actId);
  if (doneToday(p, a.id) >= a.perDay) return;
  const firstToday = p.lastDay !== todayStr();
  const levelBefore = levelOf(p), rankBefore = rankOf(L), badgesBefore = earnedBadges(L).length;
  const f = 1 + catchUp(p);
  const got = {};
  for (const s in a.gives) { got[s] = Math.round(a.gives[s] * f * 10) / 10; p.stats[s] += got[s]; }
  p.xp += sum(got);
  const taler = a.taler * (firstToday ? 2 : 1);
  const energy = Math.min(ENERGY_MAX - p.energy, firstToday ? 2 : 1);
  p.taler += taler;
  p.energy += energy;
  p.counts[a.id]++;
  const entry = { t: Date.now(), kind: 'train', id: a.id, got, taler, energy, firstToday, prevDay: p.lastDay, wk: weekKey() };
  if (a.course) entry.course = course || 'sonstiges';
  if (a.heals && p.wounds) { p.wounds--; entry.healed = true; }
  if (a.id === 'kurs' || a.id === 'dehnen') L.calm++;

  L.sessions++;
  if (firstToday) {
    L.days++;
    L.weeks[entry.wk] = (L.weeks[entry.wk] || 0) + 1;
    if (L.weeks[entry.wk] === WEEK_GOAL_DAYS) {
      entry.chest = { prev: { streak: L.streak, bestStreak: L.bestStreak, lastGoalWeek: L.lastGoalWeek } };
      L.streak = L.lastGoalWeek === prevWeekKey() ? L.streak + 1 : 1;
      L.bestStreak = Math.max(L.bestStreak, L.streak);
      L.lastGoalWeek = entry.wk;
      L.goals++;
      entry.chest.taler = chestFor(L.streak);
      entry.chest.energy = Math.min(1, ENERGY_MAX - p.energy);
      p.taler += entry.chest.taler;
      p.energy += entry.chest.energy;
    }
    if (!state.team[entry.wk] && teamDays(entry.wk) >= TEAM_GOAL_DAYS) {
      state.team[entry.wk] = true;
      metaSet({ ['team/' + entry.wk]: true });
    }
  }
  p.log.unshift(entry);
  p.log.length = Math.min(p.log.length, 200);
  p.lastDay = todayStr();
  resolveAll();
  save();

  toast(`${a.icon} ${fmtStats(got, '+')} · +${taler} 🪙${energy ? ` · +${energy} ⚡` : ''}${firstToday ? ' · Tagesbonus!' : ''}`);
  if (entry.healed) toast('🩹 Eine Verletzung ist geheilt');
  if (entry.chest) toast(`🎁 Wochenziel geschafft! +${entry.chest.taler} 🪙`, true);
  if (levelOf(p) > levelBefore) toast(`⭐ Level ${levelOf(p)}! Dein Held wird stärker.`, true);
  const rank = rankOf(L);
  if (rank !== rankBefore) toast(`${rank.icon} Neuer Rang: ${rank.name}!`, true);
  const badges = earnedBadges(L);
  if (badges.length > badgesBefore) toast(`${badges[badges.length - 1].icon} Abzeichen: ${badges[badges.length - 1].name}!`, true);
  const nowOpen = ITEMS.filter(it => !p.owned[it.id] && unlocked(p, it) && needProgress(p, it).have === it.need.n);
  for (const it of nowOpen) toast(`🔓 Neu freigeschaltet: ${it.icon} ${it.name}`, true);
  render();
}

function health(id) {
  const p = me();
  if (healthDone(p, id)) return;
  const h = byId(HEALTH, id);
  const healed = p.wounds > 0;
  if (healed) p.wounds--;
  p.taler += 2;
  p.log.unshift({ t: Date.now(), kind: 'health', id, healed });
  save();
  toast(`${h.icon} ${h.name} · +2 🪙${healed ? ' · 🩹 Verletzung geheilt' : ''}`);
  render();
}

function buy(id) {
  const p = me();
  const it = itemOf(id);
  if (p.owned[id] || !unlocked(p, it) || p.taler < it.cost) return;
  p.taler -= it.cost;
  p.owned[id] = true;
  p.equip[it.slot] = id;
  p.log.unshift({ t: Date.now(), kind: 'buy', id, cost: it.cost });
  save();
  toast(`${it.icon} ${it.name} gekauft und angelegt!`, true);
  render();
}

function equip(id) {
  const p = me();
  const it = itemOf(id);
  if (!p.owned[id]) return;
  p.equip[it.slot] = p.equip[it.slot] === id ? null : id;
  save();
  render();
}

function setDefault(arg) {
  const [i, t] = arg.split(':');
  me().tactics[Number(i)] = t;
  save();
  render();
}

// Arena: Gegner wählen, Taktiken wählen, kämpfen
function pickOpp(id) { duelTarget = id; duelPick = []; answering = null; render(); scrollToTop(); }
function pickAnswer(id) { answering = id; duelTarget = null; duelPick = []; render(); scrollToTop(); }
function pickTactic(t) { if (duelPick.length < 3) duelPick.push(t); render(); }
function clearPick() { duelPick = []; render(); }
function closeDuel() { duelTarget = null; answering = null; duelPick = []; render(); }
const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

function opponentOf(id) {
  if (id === 'boss') return bossOfWeek();
  const bot = byId(BOTS, id);
  if (bot) return fighterOfBot(bot);
  return fighterOf(state.players[id]);
}

function startFight() {
  const p = me();
  if (duelPick.length < 3) return;
  if (answering) { answerChallenge(); return; }
  if (p.energy < 1) { toast('⚡ Keine Energie – trainiere, um neue zu bekommen!'); return; }
  const id = duelTarget;
  if (state.players[id]) { challengeHuman(id); return; }
  const opp = opponentOf(id);
  if (opp.boss && p.bossWeek === weekKey()) { toast('Den Wochenboss hast du schon besiegt – nächste Woche kommt ein neuer!'); return; }
  const seed = rid();
  const res = fight(fighterOf(p), opp, duelPick, botTactics(opp.bot, seed), seed);
  p.energy--;
  const delta = res.attWin ? eloDelta(p.ruhm, opp.ruhm, 24) : eloDelta(opp.ruhm, p.ruhm, 24);
  const bossWin = opp.boss && res.attWin;
  const r = bookFight(p, { win: res.attWin, opp, rounds: res.rounds, mineAtt: true, delta: opp.boss ? (res.attWin ? 30 : 0) : delta,
    kind: opp.boss ? 'boss' : 'bot', taler: bossWin ? BOSS_REWARD : res.attWin ? 10 + opp.level : 2 });
  if (bossWin) { p.bossWeek = weekKey(); p.life.bossWins++; }
  freshReport = r.id;
  duelTarget = null; duelPick = [];
  save();
  render();
  scrollToTop();
}

function challengeHuman(pid) {
  const p = me();
  const other = state.players[pid];
  if (p.outgoing.some(o => o.to === pid)) { toast(`Du wartest schon auf eine Antwort von ${other.name}`); return; }
  const d = { id: rid() + rid(), from: idOf(p), to: pid, fromName: p.name, toName: other.name, tactics: [...duelPick],
    at: Date.now(), deadline: Date.now() + CHALLENGE_H * H_MS, snap: fighterOf(p) };
  p.energy--;
  p.outgoing.push(d);
  p.log.unshift({ t: Date.now(), kind: 'challenge', name: other.name });
  sendEvent(pid, { kind: 'challenge', duel: d });
  duelTarget = null; duelPick = [];
  save();
  toast(`⚔️ Herausforderung an ${other.name} geschickt – sie/er hat ${CHALLENGE_H} Std. Zeit`, true);
  render();
}

function answerChallenge() {
  const p = me();
  const d = p.incoming.find(x => x.id === answering);
  answering = null;
  if (!d) return;
  if (Date.now() > d.deadline) { toast('Zu spät – die Frist ist abgelaufen, es wird automatisch gekämpft'); duelPick = []; render(); return; }
  const res = resolveDuel(d, p, [...duelPick], false);
  duelPick = [];
  p.incoming = p.incoming.filter(x => x !== d);
  const r = bookFight(p, { win: !res.attWin, opp: { name: d.fromName, icon: '🤼' }, rounds: res.rounds, mineAtt: false,
    delta: res.delta, kind: 'human', taler: res.attWin ? 5 : 25 });
  freshReport = r.id;
  sendEvent(d.from, { kind: 'result', result: res });
  save();
  render();
  scrollToTop();
}

// Ergebnis kommt beim Verteidiger an (nach Ablauf der Frist)
function finishDefense(p, res) {
  const d = p.incoming.find(x => x.id === res.id);
  if (!d) return;
  p.incoming = p.incoming.filter(x => x !== d);
  const r = bookFight(p, { win: !res.attWin, opp: { name: res.attName, icon: '🤼' }, rounds: res.rounds, mineAtt: false,
    delta: res.delta, kind: 'human', taler: res.attWin ? 5 : 25 });
  r.auto = true;
  if (p === me()) toast(`⏰ Duell gegen ${res.attName} automatisch ausgetragen – ${res.attWin ? 'verloren' : 'gewonnen!'}`, true);
}

function undo() {
  const p = me();
  const e = p.log[0];
  if (!e || !['train', 'health'].includes(e.kind) || !confirm('Letzten Eintrag rückgängig machen?')) return;
  if (e.kind === 'train') {
    const L = p.life;
    for (const s in e.got) p.stats[s] = Math.max(BASE_STAT, p.stats[s] - e.got[s]);
    p.xp = Math.max(0, p.xp - sum(e.got));
    p.taler = Math.max(0, p.taler - e.taler - (e.chest ? e.chest.taler : 0));
    p.energy = Math.max(0, p.energy - e.energy - (e.chest ? e.chest.energy : 0));
    p.counts[e.id] = Math.max(0, p.counts[e.id] - 1);
    if (e.healed) p.wounds++;
    if (e.id === 'kurs' || e.id === 'dehnen') L.calm = Math.max(0, L.calm - 1);
    L.sessions = Math.max(0, L.sessions - 1);
    if (e.firstToday) { L.days = Math.max(0, L.days - 1); L.weeks[e.wk] = Math.max(0, (L.weeks[e.wk] || 1) - 1); }
    if (e.chest) { Object.assign(L, e.chest.prev); L.goals = Math.max(0, L.goals - 1); }
    p.lastDay = e.prevDay;
  } else {
    p.taler = Math.max(0, p.taler - 2);
    if (e.healed) p.wounds++;
  }
  p.log.shift();
  save();
  render();
}

function rename(id) {
  const p = state.players[id];
  const name = prompt('Neuer Name:', p.name);
  if (name && name.trim()) { p.name = name.trim().slice(0, 20); save(); render(); }
}

function reset() {
  if (!confirm('Wirklich ALLES zurücksetzen? Beide Helden starten neu – auch Ränge, Abzeichen und Ruhmeshalle. Das gilt für beide Handys.')) return;
  const fresh = freshState();
  for (const k of ['startDay', 'created', 'season', 'hall', 'team', 'resetId']) state[k] = fresh[k];
  metaSet({ startDay: state.startDay, created: state.created, season: state.season, hall: null, team: null, resetId: state.resetId });
  reconcileOwn();
  save();
  toast('🔄 Neues Spiel – alles auf Anfang!', true);
  render();
}

function newSeason() {
  const w = state.season.winner;
  if (!w || !confirm('Neue Saison starten? Ruhm beginnt wieder bei 1000 – eure Helden, Gegenstände und Abzeichen bleiben.')) return;
  state.hall.unshift({ no: state.season.no, name: w.name, how: w.how, day: todayStr() });
  state.season = { no: state.season.no + 1, weeks: SEASON_WEEKS, winner: null };
  state.startDay = todayStr();
  metaSet({ hall: state.hall, season: state.season, startDay: state.startDay });
  reconcileOwn();
  save();
  toast(`⚔️ Saison ${state.season.no} beginnt!`, true);
  render();
}

const actions = {
  train, health, buy, equip, undo, rename, reset, newSeason,
  setdefault: setDefault, opp: pickOpp, answer: pickAnswer, tactic: pickTactic, clearpick: clearPick, closeduel: closeDuel, fight: startFight,
  create: createGame, join: joinGame, local: playLocal, share: shareInvite, leave: leaveGame,
  setupdone: () => { setupStep = null; render(); },
  seen: () => { freshReport = null; render(); },
  tab: t => { tab = t; render(); window.scrollTo(0, 0); },
  player: id => { if (online()) return; state.current = id; closeDuel(); save(); render(); },
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (el && !el.disabled && actions[el.dataset.act]) actions[el.dataset.act](el.dataset.arg);
});

/* =========================================================
   Anzeige
   ========================================================= */

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function fmtStats(o, sign = '') {
  return Object.entries(o).filter(([, n]) => n > 0).map(([s, n]) => `${sign}${String(Math.round(n * 10) / 10).replace('.', ',')} ${STATS[s].icon}`).join('  ');
}
function fmtDur(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, sec = s % 60;
  return (h ? `${h}:${String(m).padStart(2, '0')}` : `${m}`) + `:${String(sec).padStart(2, '0')}`;
}
const fmtTime = t => new Date(t).toLocaleString('de-DE', { weekday: 'short', hour: '2-digit', minute: '2-digit' });

function renderHeader() {
  document.getElementById('players').innerHTML = Object.entries(state.players).map(([id, p]) => `
    <button class="pchip ${id === state.current ? 'on' : ''} ${online() && id !== game.me ? 'other' : ''}" data-act="player" data-arg="${id}">
      <b>${rankOf(p.life).icon} ${esc(p.name)}</b><small>${num(p.ruhm)} 🏆</small>
    </button>`).join('');
  renderSyncDot();
  const p = me();
  const lvl = levelOf(p);
  const pct = (p.xp - xpFor(lvl)) / (xpFor(lvl + 1) - xpFor(lvl)) * 100;
  document.getElementById('resbar').innerHTML = `
    <div class="res"><div class="res-top"><span>⭐ Level</span><b>${lvl}</b></div><div class="meter"><i style="width:${pct}%"></i></div></div>
    <div class="res"><div class="res-top"><span>⚡ Energie</span><b>${p.energy}/${ENERGY_MAX}</b></div><div class="meter energy"><i style="width:${p.energy / ENERGY_MAX * 100}%"></i></div></div>
    <div class="res"><div class="res-top"><span>🪙 Taler</span><b>${num(p.taler)}</b></div>
      <div class="hearts">${'❤️'.repeat(WOUND_MAX - p.wounds)}${'🩹'.repeat(p.wounds)}</div></div>`;
  for (const btn of document.querySelectorAll('#tabs button')) btn.classList.toggle('on', btn.dataset.arg === tab);
  const badge = document.getElementById('arena-badge');
  if (badge) badge.textContent = me().incoming.length || '';
}

/* ---------- Held als Zeichnung ---------- */

function heroSvg(p, size = "") {
  const lvl = levelOf(p);
  const st = p.stats;
  const sh = Math.min(15, 9 + (st.str - BASE_STAT) / 12); // Schulterbreite wächst mit der Stärke
  const weapon = itemOf(p.equip.weapon), armor = itemOf(p.equip.armor), trinket = itemOf(p.equip.trinket);
  // Shorts-Farbe zeigt die Level-Stufe
  const shorts = lvl >= 15 ? '#7b2d8e' : lvl >= 8 ? '#c0262c' : lvl >= 4 ? '#2f6fed' : '#2b2f38';
  const body = armor ? { shirt: '#2f6fed', kompression: '#1b1d22', champion: '#e2b13c' }[armor.id] : '#ff5a1f';
  const shoes = weapon && weapon.id === 'laufschuhe' ? '#c8f230' : '#f4f5f7';
  const aura = st.mind >= 30 ? `<circle cx="50" cy="52" r="${Math.min(46, 30 + (st.mind - 30) / 4)}" class="h-aura"/>` : '';
  const lh = [50 - sh - 2, 63], rh = [50 + sh + 2, 63]; // Hände
  const weaponSvg = !weapon ? '' : {
    boxhandschuhe: `<circle cx="${lh[0]}" cy="${lh[1]}" r="5.5" fill="#d62828" stroke="#7a1010"/><circle cx="${rh[0]}" cy="${rh[1]}" r="5.5" fill="#d62828" stroke="#7a1010"/>`,
    medizinball: `<circle cx="${rh[0] + 4}" cy="${rh[1] - 2}" r="7.5" fill="#6b4a2b" stroke="#3b2814"/><path d="M${rh[0] - 3} ${rh[1] - 2} h15 M${rh[0] + 4} ${rh[1] - 9} v15" stroke="#3b2814" stroke-width="1"/>`,
    springseil: `<path d="M${lh[0]} ${lh[1]} Q50 112 ${rh[0]} ${rh[1]}" fill="none" stroke="#2f6fed" stroke-width="1.5"/><rect x="${lh[0] - 1.5}" y="${lh[1] - 4}" width="3" height="8" rx="1.5" fill="#111"/><rect x="${rh[0] - 1.5}" y="${rh[1] - 4}" width="3" height="8" rx="1.5" fill="#111"/>`,
    kopfhoerer: '<path d="M39 28 Q50 8 61 28" fill="none" stroke="#111" stroke-width="2.5"/><rect x="36.5" y="24" width="5" height="9" rx="2" fill="#ff5a1f"/><rect x="58.5" y="24" width="5" height="9" rx="2" fill="#ff5a1f"/>',
    laufschuhe: '',
    tablet: `<rect x="${rh[0] - 2}" y="${rh[1] - 15}" width="11" height="15" rx="1.5" fill="#111"/><rect x="${rh[0] - 0.5}" y="${rh[1] - 13.5}" width="8" height="11" fill="#6b9bff"/>`,
  }[weapon.id];
  const gadget = !trinket ? '' : {
    smartwatch: `<rect x="${lh[0] - 3}" y="55" width="6" height="5" rx="1" fill="#111" stroke="#c8f230" stroke-width=".8"/>`,
    cap: '<path d="M39.5 25 Q50 11 60.5 25 Z" fill="#c0262c"/><path d="M58 24.5 h8 q-1 2 -8 2 z" fill="#8f1b1f"/>',
    shake: '<rect x="24" y="76" width="8" height="14" rx="2" fill="#e8eaee" stroke="#9aa1ab"/><rect x="24" y="74" width="8" height="3" rx="1" fill="#ff5a1f"/>',
    medaille: '<path d="M46 38 L50 47 L54 38" fill="none" stroke="#2f6fed" stroke-width="2"/><circle cx="50" cy="49" r="3.8" fill="#f2b233" stroke="#a87412"/>',
  }[trinket.id];
  return `
    <svg class="hero ${size}" viewBox="0 0 100 100" aria-label="Held">
      ${aura}
      <ellipse cx="50" cy="94" rx="24" ry="4" class="h-shadow"/>
      <rect x="42" y="66" width="6" height="24" rx="3" fill="#e2b48c"/><rect x="52" y="66" width="6" height="24" rx="3" fill="#e2b48c"/>
      <rect x="40" y="64" width="20" height="11" rx="3" fill="${armor && armor.id === 'kompression' ? '#1b1d22' : shorts}"/>
      <rect x="39" y="86" width="10" height="6" rx="3" fill="${shoes}" stroke="#9aa1ab"/><rect x="51" y="86" width="10" height="6" rx="3" fill="${shoes}" stroke="#9aa1ab"/>
      <path d="M${50 - sh} 40 Q50 36 ${50 + sh} 40 L${50 + sh - 3} 70 L${50 - sh + 3} 70 Z" fill="${body}" stroke="rgba(0,0,0,.25)"/>
      ${armor && armor.id === 'kompression' ? `<path d="M${50 - sh + 2} 44 L${50 - sh + 5} 68 M${50 + sh - 2} 44 L${50 + sh - 5} 68" stroke="#c8f230" stroke-width="1.5"/>` : ''}
      ${armor && armor.id === 'champion' ? `<path d="M${50 - sh + 1} 52 h${2 * sh - 2}" stroke="#c0262c" stroke-width="3"/>` : ''}
      <rect x="${50 - sh - 5}" y="41" width="6" height="22" rx="3" fill="#e2b48c"/>
      <rect x="${50 + sh - 1}" y="41" width="6" height="22" rx="3" fill="#e2b48c"/>
      <circle cx="50" cy="28" r="10" fill="#e9c19b"/>
      <path d="M40 26 q10 -14 20 0 q-4 -5 -10 -5 q-6 0 -10 5z" fill="#5a3a22"/>
      <circle cx="46.5" cy="29" r="1.2" fill="#2b2118"/><circle cx="53.5" cy="29" r="1.2" fill="#2b2118"/>
      <path d="M46 33 q4 ${p.wounds ? -1 : 2.5} 8 0" fill="none" stroke="#2b2118" stroke-width="1"/>
      ${p.wounds ? '<rect x="56" y="30" width="7" height="3.5" rx="1.5" fill="#f4f1ea" stroke="#c9b8a0" transform="rotate(-20 59 32)"/>' : ''}
      ${gadget}
      ${weaponSvg}
      <text x="50" y="12" class="h-lvl">Lv ${lvl}</text>
    </svg>`;
}

/* ---------- Training ---------- */

function viewTraining() {
  const p = me();
  const L = p.life;
  const first = p.lastDay !== todayStr();
  const weekDays = L.weeks[weekKey()] || 0;
  const streak = currentStreak(L);
  const team = teamDays();
  const cu = catchUp(p);
  return `
    ${challengeBanner(p)}
    <section class="banner ${first ? 'sun' : 'done'}">
      ${first ? '☀️ <b>Erstes Training heute:</b> doppelte Taler und +1 ⚡ extra!' : '✅ Heute schon trainiert – stark!'}
    </section>
    ${cu ? `<section class="banner catchup">🚀 <b>Aufhol-Bonus +${Math.round(cu * 100)} %</b> auf alle Wertepunkte – du holst auf!</section>` : ''}
    ${p.wounds ? `<section class="banner hurt">🩹 <b>${p.wounds} ${p.wounds === 1 ? 'Verletzung' : 'Verletzungen'}</b> (−${p.wounds * WOUND_MALUS * 100} % im Kampf). Heilt durch gesunde Lebensweise, Kurse, Dehnen – oder mit der Zeit.</section>` : ''}
    <div class="minis">
      <div class="mini" data-act="tab" data-arg="profil">
        <b>🎁 Woche ${Math.min(weekDays, WEEK_GOAL_DAYS)}/${WEEK_GOAL_DAYS}</b>
        <small>${weekDays >= WEEK_GOAL_DAYS ? 'Truhe geöffnet ✓' : 'Trainingstage bis zur Truhe'}${streak ? ` · 🔥 ${streak}` : ''}</small>
      </div>
      <div class="mini" data-act="tab" data-arg="profil">
        <b>🤝 Team ${Math.min(team, TEAM_GOAL_DAYS)}/${TEAM_GOAL_DAYS}</b>
        <small>${state.team[weekKey()] ? 'Teamtruhe geöffnet ✓' : 'gemeinsame Trainingstage'}</small>
      </div>
    </div>
    <h2>Training eintragen <small>jede Einheit: +⚡ für die Arena</small></h2>
    <div class="acts">${ACTIVITIES.map(a => actCard(p, a, cu)).join('')}</div>
    <h2>Gesund gelebt <small>heilt Verletzungen</small></h2>
    <div class="health">${HEALTH.map(h => `
      <button class="chip-btn ${healthDone(p, h.id) ? 'done' : ''}" data-act="health" data-arg="${h.id}" ${healthDone(p, h.id) ? 'disabled' : ''}>
        ${h.icon} ${h.name}${healthDone(p, h.id) ? ' ✓' : ''}</button>`).join('')}</div>
    <p class="hint">Nach jeder Einheit einmal tippen. Vertippt? Unter „Profil“ lässt sich der letzte Eintrag zurücknehmen.</p>`;
}

function actCard(p, a, cu) {
  const done = doneToday(p, a.id);
  const full = done >= a.perDay;
  const gain = {};
  for (const s in a.gives) gain[s] = a.gives[s] * (1 + cu);
  const head = `
    <span class="act-icon">${a.icon}</span>
    <span class="act-name">${a.name} <small>${done}/${a.perDay} heute</small></span>
    <span class="act-unit">${a.unit}</span>
    <span class="act-gain">${full ? 'für heute geschafft ✓' : fmtStats(gain, '+')}</span>`;
  if (a.course) {
    return `<div class="act wide course ${full ? 'is-done' : ''}">${head}
      ${full ? '' : `<div class="course-chips">${COURSES.map(c => `<button class="chip-btn" data-act="train" data-arg="kurs:${c.id}">${c.icon} ${c.name}</button>`).join('')}</div>`}</div>`;
  }
  return `<button class="act ${a.id === 'milon' ? 'wide main' : ''}" data-act="train" data-arg="${a.id}" ${full ? 'disabled' : ''}>${head}</button>`;
}

/* ---------- Held ---------- */

function viewHeld() {
  const p = me();
  const f = fighterOf(p);
  const lvl = levelOf(p);
  return `
    <section class="card hero-card">
      ${heroSvg(p, "big")}
      <div class="hero-side">
        <b class="hero-name">${esc(p.name)}</b>
        <small>${rankOf(p.life).icon} ${rankOf(p.life).name} · Level ${lvl}</small>
        <div class="meter"><i style="width:${(p.xp - xpFor(lvl)) / (xpFor(lvl + 1) - xpFor(lvl)) * 100}%"></i></div>
        <small>${num(xpFor(lvl + 1) - p.xp)} Wertepunkte bis Level ${lvl + 1}</small>
        ${Object.entries(STATS).map(([s, info]) => `
          <div class="stat"><span>${info.icon} ${info.name}</span><b>${num(p.stats[s])}</b></div>`).join('')}
        <small>⚔️ ${p.life.wins} Siege / ${p.life.fights} Kämpfe · Erfahrung +${Math.round(f.exp * 100)} %</small>
      </div>
    </section>

    <h2>Taktiken <small>so stark bist du je Taktik</small></h2>
    <div class="tactic-info">${Object.entries(TACTICS).map(([t, T]) => `
      <div class="card tinfo"><span class="big-icon">${T.icon}</span><b>${T.name}</b><small>nutzt ${STATS[T.stat].icon} ${STATS[T.stat].name}${f.bonus[t] ? ` · +${f.bonus[t]} Ausrüstung` : ''}<br>schlägt ${TACTICS[T.beats].icon} ${TACTICS[T.beats].name}</small><b class="tpow">${num(tacticPower(f, t))}</b></div>`).join('')}
    </div>

    <h2>Standard-Verteidigung <small>falls du nicht rechtzeitig antwortest</small></h2>
    <div class="card">${[0, 1, 2].map(i => `
      <div class="defrow"><span>Runde ${i + 1}</span>${Object.entries(TACTICS).map(([t, T]) => `
        <button class="tbtn small ${p.tactics[i] === t ? 'on' : ''}" data-act="setdefault" data-arg="${i}:${t}">${T.icon}</button>`).join('')}</div>`).join('')}
    </div>

    <h2>Ausrüstung <small>verborgen, bis der Kampf beginnt</small></h2>
    ${Object.entries(SLOTS).map(([slot, label]) => `
      <h3 class="slot">${label}</h3>
      <div class="items">${ITEMS.filter(it => it.slot === slot).map(it => itemCard(p, it)).join('')}</div>`).join('')}`;
}

function itemCard(p, it) {
  const g = needProgress(p, it);
  const owned = p.owned[it.id];
  const on = p.equip[it.slot] === it.id;
  const bonus = Object.entries(it.bonus).map(([t, n]) => `+${n} ${t === 'all' ? 'alle Taktiken' : TACTICS[t].icon}`).join(' ');
  let action;
  if (owned) action = `<button class="btn small ${on ? 'primary' : ''}" data-act="equip" data-arg="${it.id}">${on ? 'angelegt ✓' : 'anlegen'}</button>`;
  else if (g.have >= g.n) action = `<button class="btn small primary" data-act="buy" data-arg="${it.id}" ${p.taler < it.cost ? 'disabled' : ''}>kaufen · ${it.cost} 🪙</button>`;
  else action = `<div class="meter"><i style="width:${g.have / g.n * 100}%"></i></div><small>🔒 ${g.have}/${g.n} ${g.label}</small>`;
  return `
    <div class="card item ${owned ? 'owned' : ''} ${on ? 'on' : ''}">
      <span class="item-icon">${it.icon}</span>
      <b>${it.name}</b>
      <small>${[bonus, it.desc].filter(Boolean).join(' · ')}</small>
      ${action}
    </div>`;
}

/* ---------- Arena ---------- */

function challengeBanner(p) {
  if (!p.incoming.length) return '';
  return `<section class="card incoming">${p.incoming.map(d => `
    <div class="row">
      <span><b>⚔️ ${esc(d.fromName)} fordert dich heraus!</b>
      <small>${Date.now() > d.deadline ? 'Frist abgelaufen – wird automatisch ausgetragen' : `noch <b data-eta="${d.deadline}">${fmtDur(d.deadline - Date.now())}</b> – sonst kämpfst du mit deiner Standard-Taktik`}</small></span>
      ${Date.now() > d.deadline ? '' : `<button class="btn small primary" data-act="answer" data-arg="${d.id}">Annehmen</button>`}
    </div>`).join('')}</section>`;
}

function chance(me_, opp) {
  // grobe Siegchance: beste eigene Taktik gegen den Durchschnitt des Gegners
  const mine = Math.max(...'ABC'.split('').map(t => tacticPower(me_, t, true)));
  const theirs = sum('ABC'.split('').map(t => tacticPower(opp, t))) / 3;
  const r = mine / theirs;
  return r >= 1.3 ? ['🟢', 'gute Chancen'] : r >= 0.95 ? ['🟠', 'ausgeglichen'] : ['🔴', 'schwer'];
}

function viewArena() {
  const p = me();
  if (duelTarget || answering) return duelSetup(p);
  const mf = fighterOf(p);
  const humans = Object.keys(state.players).filter(id => id !== state.current);
  const boss = bossOfWeek();
  const bossDone = p.bossWeek === weekKey();
  const fresh = freshReport && p.reports.find(r => r.id === freshReport);
  return `
    ${fresh ? reportCard(fresh, true) : ''}
    ${challengeBanner(p)}
    ${p.outgoing.length ? `<section class="card waiting">${p.outgoing.map(o => `
      <div class="row"><span><b>⏳ Warte auf ${esc(o.toName)}</b><small>wird spätestens in <b data-eta="${o.deadline}">${fmtDur(o.deadline - Date.now())}</b> automatisch ausgetragen</small></span></div>`).join('')}</section>` : ''}
    <p class="hint">${p.energy ? `⚡ ${p.energy} Kämpfe möglich – jeder Kampf kostet 1 ⚡.` : '⚡ Keine Energie mehr – jedes Training lädt 1 ⚡ auf.'}</p>

    <h2>Mitspieler</h2>
    ${humans.map(id => {
      const o = state.players[id];
      const [dot, txt] = chance(mf, fighterOf(o));
      const waiting = p.outgoing.some(x => x.to === id);
      return oppRow(id, heroSvg(o, 'mini'), o.name, `Level ${levelOf(o)} · ${num(o.ruhm)} 🏆 · ${dot} ${txt}`, waiting ? 'wartet …' : 'Herausfordern', waiting || !p.energy);
    }).join('')}

    <h2>Wochenboss <small>neu jeden Montag</small></h2>
    ${oppRow('boss', boss.icon, boss.name, bossDone ? '✓ diese Woche besiegt' : `${boss.bot.info} · Belohnung ${BOSS_REWARD} 🪙 · ${chance(mf, boss).join(' ')}`, bossDone ? 'besiegt' : 'Kämpfen', bossDone || !p.energy, 'boss')}

    <h2>Bot-Helden</h2>
    ${BOTS.map(b => { const f = fighterOfBot(b); const [dot, txt] = chance(mf, f);
      return oppRow(b.id, b.icon, b.name, `Level ${f.level} · ${b.info} · ${dot} ${txt}`, 'Kämpfen', !p.energy); }).join('')}

    ${p.reports.length ? `<h2>Kampfberichte</h2>${p.reports.slice(0, 8).map(r => reportCard(r, false)).join('')}` : ''}`;
}

function oppRow(id, icon, name, info, label, disabled, cls = '') {
  return `
    <div class="card opp ${cls}">
      <span class="big-icon">${icon}</span>
      <div class="bld-title"><b>${esc(name)}</b><small>${info}</small></div>
      <button class="btn small primary" data-act="opp" data-arg="${id}" ${disabled ? 'disabled' : ''}>${label}</button>
    </div>`;
}

function duelSetup(p) {
  const d = answering && p.incoming.find(x => x.id === answering);
  const opp = d ? d.snap : opponentOf(duelTarget);
  const mf = fighterOf(p);
  const see = mf.reveal;
  const title = d ? `${esc(d.fromName)} fordert dich heraus` : `Kampf gegen ${esc(opp.name)}`;
  return `
    <section class="card duel">
      <div class="goal-head">
        <span class="big-icon">${opp.icon}</span>
        <div class="bld-title"><b>${title}</b><small>Level ${opp.level}${opp.bot ? ' · ' + opp.bot.info : ''}</small></div>
        <button class="btn small" data-act="closeduel">✕</button>
      </div>
      <div class="intel">
        ${see ? `⌚ <b>Gegner-Scan:</b> ${opp.items.filter(itemOf).length ? opp.items.filter(itemOf).map(id => `${itemOf(id).icon} ${itemOf(id).name}`).join(', ') : 'keine Ausrüstung'} · Lieblingstaktik ${TACTICS[opp.favorite].icon} ${TACTICS[opp.favorite].name}`
          : '❔ Ausrüstung und Taktik des Gegners sind verborgen – die ⌚ Smartwatch mit Gegner-Scan würde sie zeigen.'}
        ${d ? '<br>⚠️ Der Herausforderer hat seine 3 Taktiken schon gewählt und bekommt +10 % Angriffsbonus.' : '<br>💥 Als Herausforderer bekommst du +10 % Angriffsbonus.'}
      </div>
      <h3>Wähle deine Taktik für Runde ${Math.min(3, duelPick.length + 1)} von 3</h3>
      <div class="picked">${[0, 1, 2].map(i => `<span class="pick ${duelPick[i] ? 'on' : ''}">${duelPick[i] ? TACTICS[duelPick[i]].icon : i + 1}</span>`).join('')}
        ${duelPick.length ? '<button class="btn small" data-act="clearpick">neu wählen</button>' : ''}</div>
      <div class="tactics">${Object.entries(TACTICS).map(([t, T]) => `
        <button class="tbtn" data-act="tactic" data-arg="${t}" ${duelPick.length >= 3 ? 'disabled' : ''}>
          <span>${T.icon}</span><b>${T.name}</b><small>Kraft ${num(tacticPower(mf, t, !d))} · schlägt ${TACTICS[T.beats].icon}</small></button>`).join('')}
      </div>
      <button class="btn primary big" data-act="fight" ${duelPick.length < 3 ? 'disabled' : ''}>
        ${d ? '⚔️ Kämpfen!' : state.players[duelTarget] ? `⚔️ Herausforderung schicken (1 ⚡)` : '⚔️ Kampf! (1 ⚡)'}</button>
      <p class="hint">${TACTICS.A.icon} Distanz schlägt ${TACTICS.C.icon} Ansturm · ${TACTICS.C.icon} Ansturm schlägt ${TACTICS.B.icon} Hinterhalt · ${TACTICS.B.icon} Hinterhalt schlägt ${TACTICS.A.icon} Distanz. Dazu kommt ein bisschen Glück 🎲.</p>
    </section>`;
}

function reportCard(r, animate) {
  const meName = 'Dein Held';
  const rows = r.rounds.map((x, i) => {
    const [mt, ot, ms, os] = r.mineAtt ? [x.a, x.d, x.as, x.ds] : [x.d, x.a, x.ds, x.as];
    const won = ms > os || (ms === os && r.mineAtt);
    const key = won ? mt + ot : ot + mt;
    const who = won ? meName : esc(r.opp);
    return `
      <div class="round ${won ? 'won' : 'lost'}" style="${animate ? `animation-delay:${0.4 + i * 0.9}s` : ''}">
        <div class="round-vs"><span>${TACTICS[mt].icon} <b>${ms}</b></span><small>Runde ${i + 1}</small><span><b>${os}</b> ${TACTICS[ot].icon}</span></div>
        <small>${who} ${FLAVOR[key] || 'gewinnt die Runde'}</small>
      </div>`;
  }).join('');
  const kindLabel = { human: 'Duell', bot: 'Arena', boss: 'Wochenboss' }[r.kind];
  return `
    <section class="card report ${r.win ? 'won' : 'lost'} ${animate ? 'fresh' : ''}">
      <div class="goal-head">
        <span class="big-icon">${r.oppIcon}</span>
        <div class="bld-title"><b>${kindLabel} gegen ${esc(r.opp)}</b><small>${r.mineAtt ? 'du hast angegriffen' : 'du hast verteidigt'}${r.auto ? ' · automatisch' : ''} · ${fmtTime(r.t)}</small></div>
      </div>
      ${rows}
      <div class="verdict" style="${animate ? 'animation-delay:3.2s' : ''}">
        <b>${r.win ? '🏆 Sieg!' : '💀 Niederlage'}</b>
        <small>${r.delta ? `${r.delta > 0 ? '+' : ''}${r.delta} 🏆 Ruhm · ` : ''}+${r.taler} 🪙${r.wound ? ' · 🩹 verletzt' : ''}</small>
      </div>
      ${animate ? '<button class="btn small" data-act="seen">OK</button>' : ''}
    </section>`;
}

/* ---------- Rangliste ---------- */

function viewRang() {
  const rows = standings();
  const medal = i => ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;
  const left = daysLeft();
  return `
    <h2>Saison ${state.season.no} <small>${state.season.winner ? 'beendet' : `noch ${left} ${left === 1 ? 'Tag' : 'Tage'}`}</small></h2>
    <p class="hint">Wer nach ${state.season.weeks} Wochen den meisten 🏆 Ruhm hat, wird Champion – auch ein Bot kann gewinnen. Eure Helden bleiben über alle Saisons, nur der Ruhm startet neu.</p>
    <div class="card list">${rows.map((r, i) => `
      <div class="row ${r.pid === state.current ? 'me' : ''}">
        <span class="rank">${medal(i)}</span>
        <span class="big-icon who-icon">${r.icon}</span>
        <span class="who"><b>${esc(r.name)}</b><small>${esc(r.info)}</small></span>
        <span class="pts"><b>${num(r.ruhm)}</b><small>Level ${r.level}</small></span>
      </div>`).join('')}</div>

    <h2>🏛️ Ruhmeshalle</h2>
    <div class="card list">${state.hall.length ? state.hall.map(h => `
      <div class="row"><span><b>🏆 Saison ${h.no}: ${esc(h.name)}</b><small>${esc(h.how)}</small></span><small>${new Date(h.day + 'T12:00').toLocaleDateString('de-DE')}</small></div>`).join('')
      : '<div class="row muted">Noch leer – wer wird der erste Champion?</div>'}</div>`;
}

/* ---------- Profil ---------- */

function viewProfil() {
  const p = me();
  const L = p.life;
  const rank = rankOf(L), next = nextRank(L);
  const pct = next ? (L.sessions - rank.min) / (next.min - rank.min) * 100 : 100;
  const weekDays = L.weeks[weekKey()] || 0;
  const streak = currentStreak(L);
  const earned = new Set(earnedBadges(L));
  const dots = Array.from({ length: WEEK_GOAL_DAYS }, (_, i) => `<i class="${i < weekDays ? 'on' : ''}"></i>`).join('');
  return `
    <h2>Profil von ${esc(p.name)}</h2>
    <section class="card">
      <div class="goal-head"><span class="big-icon">${rank.icon}</span>
        <div class="bld-title"><b>${rank.name}</b><small>Rang nach Trainingseinheiten – bleibt für immer</small></div></div>
      <div class="meter big"><i style="width:${pct}%"></i></div>
      <small>${next ? `${L.sessions} / ${next.min} Einheiten → ${next.icon} ${next.name}` : `${L.sessions} Einheiten – höchster Rang!`}</small>
    </section>
    <section class="card">
      <div class="goal-head"><span class="big-icon">🎁</span>
        <div class="bld-title"><b>Wochenziel: ${WEEK_GOAL_DAYS} Trainingstage</b>
          <small>${weekDays >= WEEK_GOAL_DAYS ? 'Geschafft – Truhe geöffnet!' : `Truhe: ${chestFor(streak + 1)} 🪙 + 1 ⚡`}</small></div>
        <span class="dots">${dots}</span></div>
      <small>${streak ? `🔥 ${streak} ${streak === 1 ? 'Woche' : 'Wochen'} in Folge – die Truhe wächst (bis doppelt)` : 'Mehrere Wochen hintereinander, dann wächst die Truhe.'}</small>
    </section>
    <section class="card">
      <div class="goal-head"><span class="big-icon">🤝</span>
        <div class="bld-title"><b>Teamziel: zusammen ${TEAM_GOAL_DAYS} Trainingstage</b>
          <small>${state.team[weekKey()] ? 'Geschafft – Teamtruhe geöffnet!' : `Diese Woche ${teamDays()} / ${TEAM_GOAL_DAYS} · für beide ${TEAM_CHEST} 🪙 + 1 ⚡`}</small></div></div>
    </section>
    <div class="stats">
      <div><b>${num(L.sessions)}</b><small>Einheiten</small></div>
      <div><b>${num(L.days)}</b><small>Trainingstage</small></div>
      <div><b>${num(L.wins)}</b><small>Siege</small></div>
      <div><b>${L.bestStreak}</b><small>beste Serie</small></div>
    </div>
    <h2>Abzeichen <small>${earned.size} / ${BADGES.length}</small></h2>
    <div class="badges">${BADGES.map(b => `
      <div class="badge ${earned.has(b) ? 'on' : ''}"><span>${b.icon}</span><b>${b.name}</b><small>${b.desc}</small></div>`).join('')}</div>
    ${viewVerlauf(p)}`;
}

function viewVerlauf(p) {
  const line = e => {
    if (e.kind === 'train') {
      const a = byId(ACTIVITIES, e.id);
      const c = e.course && byId(COURSES, e.course);
      return `${c ? c.icon : a.icon} ${c ? `Kurs: ${c.name}` : a.name} <span class="muted">${fmtStats(e.got, '+')}${e.firstToday ? ' ☀️' : ''}</span>`;
    }
    if (e.kind === 'health') { const h = byId(HEALTH, e.id); return `${h.icon} ${h.name}${e.healed ? ' · 🩹 geheilt' : ''}`; }
    if (e.kind === 'buy') { const it = itemOf(e.id); return `${it.icon} ${it.name} gekauft <span class="muted">−${e.cost} 🪙</span>`; }
    if (e.kind === 'challenge') return `⚔️ ${esc(e.name)} herausgefordert`;
    return '';
  };
  return `
    <h2>Verlauf</h2>
    <div class="card list">
      ${p.log.length ? p.log.slice(0, 40).map(e => `<div class="row log"><span>${line(e)}</span><small>${fmtTime(e.t)}</small></div>`).join('')
        : '<div class="row muted">Noch nichts eingetragen – ab ins Gym! 💪</div>'}
    </div>
    ${p.log.length && ['train', 'health'].includes(p.log[0].kind) ? '<button class="btn" data-act="undo">↩️ Letzten Eintrag rückgängig</button>' : ''}

    <h2>Einstellungen</h2>
    <div class="card list">
      ${ownIds().map(id => `
        <div class="row"><span>🧑 ${esc(state.players[id].name)}</span><button class="btn small" data-act="rename" data-arg="${id}">Umbenennen</button></div>`).join('')}
      ${online() ? `
        <div class="row"><span>${connected ? '🟢 Online verbunden' : '🟠 Gerade offline – wird nachgeholt, sobald wieder Netz da ist'}</span></div>
        <div class="row"><span>🔗 Einladungslink für Mitspieler</span><button class="btn small" data-act="share">Teilen</button></div>
        <div class="row"><span>📱 Dieses Gerät abmelden</span><button class="btn small" data-act="leave">Abmelden</button></div>`
      : '<div class="row"><span>📴 Nur auf diesem Gerät</span><button class="btn small" data-act="leave">Online spielen</button></div>'}
      <div class="row"><span>🏰 Das alte Dorf-Spiel</span><a class="btn small" href="dorf/">Zum Archiv</a></div>
    </div>
    <button class="btn danger" data-act="reset">Spiel zurücksetzen</button>`;
}

/* ---------- Startbildschirm ---------- */

let joinInfo = null;
async function loadJoinInfo() {
  if (!window.MB_SYNC) { window.addEventListener('mb-sync-ready', loadJoinInfo, { once: true }); return; }
  try { joinInfo = (await window.MB_SYNC.getGame(joinId)) || { missing: true }; }
  catch (e) { joinInfo = { error: true }; }
  render();
}

function viewSetup() {
  const nameField = '<input id="setup-name" class="field" maxlength="20" placeholder="Name deines Helden" autocomplete="nickname">';
  if (setupStep === 'invite') {
    return `
      <section class="card setup">
        <div class="setup-icon">🎉</div>
        <h2>Dein Held ist bereit!</h2>
        <p>Schick jetzt deinem Trainingspartner diesen Link – wer ihn öffnet, betritt eure Arena.</p>
        <div class="linkbox">${esc(inviteLink())}</div>
        <button class="btn primary" data-act="share">🔗 Link teilen</button>
        <button class="btn" data-act="setupdone">Los geht's – ab ins Gym 💪</button>
        <p class="hint">Den Link findest du später auch unter Profil → Einstellungen.</p>
      </section>`;
  }
  if (joinId) {
    if (!joinInfo) { loadJoinInfo(); return '<section class="card setup"><p>⏳ Lade Einladung …</p></section>'; }
    if (joinInfo.missing || joinInfo.error || !joinInfo.meta) {
      return `<section class="card setup"><div class="setup-icon">🤔</div><h2>Einladung nicht gefunden</h2>
        <p>${joinInfo.error ? 'Keine Verbindung – bitte mit Internet nochmal öffnen.' : 'Der Link ist ungültig oder das Spiel wurde gelöscht.'}</p></section>`;
    }
    const players = joinInfo.players || {};
    return `
      <section class="card setup">
        <div class="setup-icon">⚔️</div>
        <h2>Einladung in die Arena</h2>
        <p>Wie heißt dein Held?</p>
        ${nameField}
        ${['a', 'b'].map(pid => {
          const taken = players[pid] && players[pid].updatedAt;
          return `<button class="btn ${taken ? '' : 'primary'}" data-act="join" data-arg="${pid}">
            ${taken ? `Ich bin ${esc(players[pid].name)} (anderes Gerät)` : 'Neuen Helden erschaffen'}</button>`;
        }).join('')}
        <p class="hint">„Anderes Gerät“ nur wählen, wenn du schon mitspielst und das Gerät wechselst.</p>
      </section>`;
  }
  return `
    <section class="card setup">
      <div class="setup-icon">🏋️</div>
      <h2>Willkommen in der Arena</h2>
      <p>Jedes Training macht deinen Helden stärker: Kraft, Ausdauer, Geist. In Duellen zählen Taktik, Ausrüstung – und ein bisschen Glück.</p>
      ${nameField}
      <button class="btn primary" data-act="create">Neues Spiel starten</button>
      <p class="hint">Du hast einen Einladungslink bekommen? Dann öffne einfach den Link.</p>
      <button class="btn" data-act="local">Nur auf diesem Gerät ausprobieren</button>
    </section>`;
}

function renderSyncDot() {
  const el = document.getElementById('sync-dot');
  if (el) el.className = online() ? (connected ? 'on' : 'off') : '';
}

const VIEWS = { training: viewTraining, held: viewHeld, arena: viewArena, rang: viewRang, profil: viewProfil };

function seasonBanner() {
  const w = state.season.winner;
  if (!w) return '';
  return `
    <section class="card season-over">
      <div class="goal-head"><span class="big-icon">🏆</span>
        <div class="bld-title"><b>Saison ${state.season.no} ist vorbei!</b><small>${esc(w.name)} ${esc(w.how)}.</small></div></div>
      <button class="btn primary" data-act="newSeason">Neue Saison starten</button>
    </section>`;
}

function render() {
  const setup = !game || joinId || setupStep;
  document.body.classList.toggle('setup-mode', !!setup);
  if (setup) {
    const typed = document.getElementById('setup-name');
    const name = typed ? typed.value : '';
    document.getElementById('view').innerHTML = viewSetup();
    const field = document.getElementById('setup-name');
    if (field) field.value = name;
    return;
  }
  resolveAll();
  renderHeader();
  document.getElementById('view').innerHTML = seasonBanner() + VIEWS[tab]();
}

// Meldungen nacheinander anzeigen (höchstens 3 in der Warteschlange)
const toastQueue = [];
let toastBusy = false;
function toast(msg, big = false) {
  toastQueue.push([msg, big]);
  if (toastQueue.length > 3) toastQueue.shift();
  if (!toastBusy) nextToast();
}
function nextToast() {
  const el = document.getElementById('toast');
  const t = toastQueue.shift();
  if (!t) { toastBusy = false; return; }
  toastBusy = true;
  el.textContent = t[0];
  el.className = 'show' + (t[1] ? ' big' : '');
  setTimeout(() => { el.className = ''; setTimeout(nextToast, 250); }, t[1] ? 2600 : 1600);
}

document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });

// Countdowns jede Sekunde aktualisieren
setInterval(() => {
  if (resolveAll()) { render(); return; }
  const now = Date.now();
  for (const el of document.querySelectorAll('[data-eta]')) el.textContent = fmtDur(Number(el.dataset.eta) - now);
}, 1000);

render();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  // neue Version gefunden → einmal neu laden, damit nie alte und neue Dateien gemischt werden
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !reloaded) { reloaded = true; location.reload(); }
  });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
    .then(reg => document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update(); }))
    .catch(() => {});
}
