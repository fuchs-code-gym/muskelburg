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
const RECALC_V = 1;           // Version der Schadensregeln (für einmalige Neuberechnung alter Trainings)
// Werte-Bonus auf den Schaden flacht ab: 10 → +7 %, 50 → +23 %, 100 → +31 %, 300 → +42 %, nie mehr als +50 %.
// So bleibt es fair zwischen alten Hasen und Neuen.
const STAT_CAP = 0.5, STAT_HALF = 60;
const statBonus = v => STAT_CAP * v / (v + STAT_HALF);

// Training in Zeitblöcken: type = Schadensart, base = Grundschaden je Block, gives = Wertepunkte je Block
const ACTIVITIES = [
  { id: 'kraft', name: 'Kraft', unit: '5 Min. am Limit · Geräte, Hanteln, Milon', icon: '💪', type: 'str', step: 5, maxMin: 60, base: 45, gives: { str: 2 }, pr: true },
  { id: 'puls', name: 'Ausdauer', unit: '10 Min. · Rad, Crosstrainer, Rudern', icon: '🫀', type: 'end', step: 10, maxMin: 120, base: 50, gives: { end: 2 } },
  { id: 'ausgleich', name: 'Ausgleich', unit: '10 Min. · Yoga, Pilates, Dehnen, Mobility', icon: '🧘', type: 'mind', step: 10, maxMin: 120, base: 45, gives: { mind: 2 } },
  // Kurs/Sport in 10-Min.-Schritten: wie Ausdauer (60 Min. = 300 Grundschaden), steigert Kraft und Ausdauer
  { id: 'sport', name: 'Kurs & Sport', unit: '10 Min. · Badminton, Bouldern, Spinning, Kurs', icon: '🏸', type: 'end', step: 10, maxMin: 120, base: 50, gives: { str: 1, end: 1 } },
];
// alte Einträge im Verlauf weiter anzeigen können
const OLD_ACTIVITIES = [
  { id: 'milon', name: 'Milon-Zirkel', icon: '🔁' }, { id: 'frei', name: 'Freies Training', icon: '🏋️' },
  { id: 'cardio', name: 'Rad / Crosstrainer', icon: '🚴' }, { id: 'kurs', name: 'Kurs', icon: '🧘' }, { id: 'dehnen', name: 'Dehnen & Mobility', icon: '🤸' },
];
const actOf = id => ACTIVITIES.find(a => a.id === id) || OLD_ACTIVITIES.find(a => a.id === id) || { name: 'Training', icon: '💪' };
const COURSES = [
  { id: 'yoga', name: 'Yoga', icon: '🧘' }, { id: 'pilates', name: 'Pilates', icon: '🤸' },
  { id: 'ruecken', name: 'Rücken', icon: '🦴' }, { id: 'spinning', name: 'Spinning', icon: '🚲' },
  { id: 'sonstiges', name: 'Sonstiges', icon: '✨' },
];
// Gesund gelebt: je +2 % Schaden auf die Trainings des Tages
const HEALTH = [
  { id: 'schlaf', name: 'Gut geschlafen', short: 'Schlaf', icon: '😴' },
  { id: 'essen',  name: 'Gesund gegessen', short: 'Essen', icon: '🥗' },
  { id: 'wasser', name: 'Genug getrunken', short: 'Trinken', icon: '💧' },
];
const HEALTH_NOW = HEALTH;
const HEALTH_BONUS = 0.02;

// Schaden
const PR_MULT = 2.5;          // Neuer Rekord (Gewicht erhöht) = Volltreffer, 1× am Tag
const CRIT_MULT = 1.5;        // kritischer Treffer (Chance wächst mit Geist)
const CHEER_MULT = 1.25;      // vom Partner angefeuert
const COMEBACK_MULT = 1.25;   // wer in der Saison deutlich weniger Schaden hat
// Erholung zählt: die ersten 90 Min. am Tag voll, bis 120 Min. 60 %, danach 30 %
const falloffAt = m => m < 90 ? 1 : m < 120 ? 0.6 : 0.3;

// Saison: der Schweinehund
const SEASON_DAYS = 42;          // alte Saisons: 6 Wochen; neue: ein Monat (season.end)
// Eichung: „3× pro Woche 30 Min. Kraft + 10 Min. Aufwärmen“ schafft knapp 7.000 im Monat (gerechnet).
// Werte gelten für 2 aktive Personen und 30 Tage; jede weitere aktive Person +50 %, wer ruht, zählt nicht.
const BOSS_DAYS = 30;
const BOSS_HP = 14000, BOSS_REGEN = 350, CHAPTER_GROWTH = 1.1; // je Kapitel 10 % stärker
const MONSTER_HP = 2800;
const REST_DAYS = 7;             // wer so lange nicht trainiert, ruht und zählt nicht für den Schweinehund
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
const CHEER_WEEK = 3;      // so oft darf jeder pro Woche anfeuern

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
  { id: 'common',    name: 'Gewöhnlich', color: '#9aa1ab', weight: 58, power: 1 },
  { id: 'rare',      name: 'Selten',     color: '#2f6fed', weight: 28, power: 2 },
  { id: 'epic',      name: 'Episch',     color: '#8e6bd8', weight: 11, power: 3 },
  { id: 'legendary', name: 'Legendär',   color: '#f2b233', weight: 3,  power: 5 },
];
const INV_MAX = 24;
// Gegenstandsstufe: steigt alle 12 Trainingstage (≈ 1 Monat bei 3×/Woche). Bonus = Seltenheit × Stufe.
// Alte Teile ohne Stufe zählen als Stufe 1.
const LEVEL_DAYS = 12;
const itemLevelFor = p => 1 + Math.floor((p.life.days || 0) / LEVEL_DAYS);

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
  { icon: '📣', name: 'Motivator',        desc: '10× angefeuert',           test: l => l.cheers >= 10 },
];

/* =========================================================
   Zustand & Speichern
   ========================================================= */

const DEVICE = new URLSearchParams(location.search).get('geraet') || '';
const KEY = 'hantelhelden-v1' + DEVICE;
// bis zu vier Helden pro Spiel
const PIDS = ['a', 'b', 'c', 'd'];
const defaultName = id => 'Spieler ' + (PIDS.indexOf(id) + 1);
const GAME_KEY = 'hantelhelden-game-v1' + DEVICE;
const DAY_MS = 86400000, H_MS = 3600e3;

let dayOverride = null;   // beim Nachtragen: so tun, als wäre heute dieser Tag
function withDay(day, fn) { const old = dayOverride; dayOverride = day; try { return fn(); } finally { dayOverride = old; } }
function todayStr(d) {
  if (!d && dayOverride) return dayOverride;
  d = d || new Date();
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
    counts: { kraft: 0, puls: 0, ausgleich: 0, sport: 0 },
    dmg: {},              // Datum → Schaden an diesem Tag
    inv: [], equip: { weapon: null, armor: null, trinket: null }, tactics: ['C', 'A', 'B'],
    life: newLife(), log: [], reports: [], outgoing: [], incoming: [],
    cheer: null, cheerSent: {}, claimed: {}, resetId: null, updatedAt: 0,
    cheerWeek: null,      // { wk, n }: wie oft diese Woche angefeuert
    together: {},         // „gemeinsam trainiert“: { '<pid>:<Tag>': true }
    away: [],             // Krank/Urlaub: [{ from, to, why }] (to leer = läuft noch)
    reacts: {},           // eigene Reaktionen auf Trainings anderer: { '<pid>:<t>': '🔥' }
    goal: null,           // Wochenziel, z. B. { kraft: 3, puls: 2, ausgleich: 1 }
    goalNext: null,       // gesenktes Ziel, das erst ab nächster Woche gilt: { from, goal }
    joined: null,         // Beitrittstag (leer = von Anfang an dabei)
  };
}

/* ---------- Wochenziel ---------- */
const GOAL_BONUS = 60;    // Bonus-Schaden je Training im Ziel, wenn das Wochenziel voll ist
// pro Tag zählt jede Trainingsart einmal fürs Ziel
function weekSessions(p, id, wk = weekKey()) {
  return new Set(p.log.filter(e => e.kind === 'train' && partsOf(e).some(x => x.id === id) && e.day >= wk && e.day < addDays(wk, 7)).map(e => e.day)).size;
}
const goalOf = (p, id) => (p.goal && p.goal[id]) || 0;
function goalTotal(p) { return sum(ACTIVITIES.map(a => goalOf(p, a.id))); }
function goalDone(p) { return sum(ACTIVITIES.map(a => Math.min(goalOf(p, a.id), weekSessions(p, a.id)))); }
const goalReached = p => goalTotal(p) > 0 && goalDone(p) >= goalTotal(p);
// Ziel ändern: Erhöhen geht immer. Senken gilt erst ab nächster Woche, sobald in dieser Woche trainiert wurde.
function setAway(why) {
  const p = me();
  if (awayNow(p)) return;
  p.away.push({ from: todayStr(), to: null, why });
  save();
  toast(why === 'krank' ? '🤒 Gute Besserung! Du zählst gerade nicht – weder für den Schweinehund noch fürs Wochenziel.' : '🏖️ Schönen Urlaub! Du zählst gerade nicht mit.', true);
  render();
}
function endAway(p = me(), quiet = false) {
  const a = awayNow(p);
  if (!a) return;
  if (a.from >= todayStr()) p.away = p.away.filter(x => x !== a); // am selben Tag zurück = nie weg gewesen
  else a.to = addDays(todayStr(), -1);
  if (!quiet) { save(); toast('💪 Willkommen zurück!', true); render(); }
}
function setGoal(p, draft) {
  const cur = p.goal, wk = weekKey();
  const lowers = cur && ACTIVITIES.some(a => (draft[a.id] || 0) < (cur[a.id] || 0));
  if (!lowers || !p.log.some(e => e.kind === 'train' && e.day >= wk)) {
    p.goal = { ...draft }; p.goalNext = null;
    return `🎯 Wochenziel: ${goalTotal(p)}× pro Woche`;
  }
  const now = {};
  for (const a of ACTIVITIES) now[a.id] = Math.max(draft[a.id] || 0, cur[a.id] || 0);
  p.goal = now; p.goalNext = { from: addDays(wk, 7), goal: { ...draft } };
  return '🔒 Senken gilt ab nächster Woche – diese Woche hast du schon trainiert';
}
function freshState() {
  return {
    v: 1, current: 'a', players: Object.fromEntries(PIDS.map(id => [id, newHero(defaultName(id))])),
    season: { no: 1, chapter: 1, start: todayStr(), end: monthEnd(todayStr()), result: null }, hall: [], pact: '', resetId: rid(),
  };
}

const asList = x => Array.isArray(x) ? x.filter(Boolean) : x ? Object.values(x) : [];
function normalizeHero(p, name = '') {
  const fresh = newHero(name);
  p = { ...fresh, ...p };
  for (const k of ['stats', 'counts', 'equip', 'life']) p[k] = { ...fresh[k], ...p[k] };
  for (const k of ['dmg', 'claimed', 'reacts', 'together']) p[k] = p[k] || {};
  if (!p.cheerSent || typeof p.cheerSent !== 'object') p.cheerSent = {};
  p.tactics = asList(p.tactics).length === 3 ? asList(p.tactics) : fresh.tactics;
  for (const k of ['inv', 'log', 'reports', 'outgoing', 'incoming', 'away']) p[k] = asList(p[k]);
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
      for (const id of PIDS) if (!s.players[id]) s.players[id] = newHero(defaultName(id)); // früher nur 2 Plätze
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
let sheetOpen = false;    // Auswahlfenster „Training eintragen“
let menu = {};            // im Menü gewählte Einheiten, z. B. { kraft: 2, puls: 1 }
let goalOpen = false, goalDraft = {};
let bossFold = true;      // Einsatz & Regeln auf der Jagd-Seite eingeklappt
const openFolds = new Set(['f2']); // aufgeklappte Abschnitte unter „Mehr“
let goalFold = true;
const RECAP_KEY = 'hantelhelden-recap' + DEVICE;
const HELD_KEY = 'hantelhelden-held' + DEVICE;
function heldSeen() { try { return Number(localStorage.getItem(HELD_KEY + state.current)) || 0; } catch (e) { return 0; } }
function markHeldSeen() { try { localStorage.setItem(HELD_KEY + state.current, String(Date.now())); } catch (e) { /* ignorieren */ } }
// neu angelegte Ausrüstung, die man noch nicht gesehen hat
function newGear(p) {
  const seen = heldSeen();
  return Object.values(p.equip || {}).map(uid => p.inv.find(i => i.uid === uid)).filter(it => it && (it.at || 0) > seen);
}
let calFold = false;      // Kalender aufgeklappt
let dayOpen = null;       // Tages-Fenster im Kalender
let backfillDay = null;   // Training wird für diesen vergangenen Tag nachgetragen
const BACKFILL_DAYS = 7;
const canBackfill = d => !state.season.result && d < todayStr() && d >= state.season.start && d >= addDays(todayStr(), -BACKFILL_DAYS);      // Wochenziel-Karte eingeklappt
let statsOf = null;       // Statistik-Fenster für diesen Spieler (id)
const me = () => state.players[state.current];

/* =========================================================
   Online-Spiel: jedes Handy schreibt nur seinen eigenen Helden.
   Der Schweinehund wird aus dem Schaden beider Helden berechnet – so gibt es nie Streit um seine Lebenspunkte.
   ========================================================= */

let game = null;
try { game = JSON.parse(localStorage.getItem(GAME_KEY)); } catch (e) { /* kein Spiel */ }
let sync = null, connected = false;
let gameDeleted = false; // Spiel wurde gelöscht → nichts mehr hochladen
const online = () => !!(game && game.id);
const ownIds = () => online() ? [game.me] : Object.keys(state.players);
const mine = () => ownIds().map(id => state.players[id]);
// Wer spielt mit? Online zählen nur Plätze, die jemand übernommen hat
const team = () => PIDS.filter(id => state.players[id] && (!online() || id === game.me || state.players[id].updatedAt)).map(id => state.players[id]);
const othersOf = p => team().filter(x => x !== p);
// Wer zählt an Tag d für den Schweinehund? Dabei (ab Beitritt) und in den letzten 7 Tagen trainiert –
// die ersten 7 Tage nach Jagd-Start bzw. Beitritt zählt jeder. Für künftige Tage gilt der heutige Stand.
const trainedDay = (p, d) => (p.dmg[d] || 0) > 0;
const AWAY = { krank: { icon: '🤒', name: 'krank' }, urlaub: { icon: '🏖️', name: 'im Urlaub' } };
const awayOn = (p, d) => p.away.find(a => d >= a.from && (!a.to || d <= a.to)) || null;
const awayNow = p => p.away.find(a => !a.to) || null;
function activeOn(p, d) {
  if (d > todayStr()) d = todayStr();
  if (awayOn(p, d)) return false;
  // nach Krankheit/Urlaub: wieder 7 Tage Schonfrist
  const back = p.away.filter(a => a.to && a.to < d).map(a => addDays(a.to, 1)).sort().pop() || '';
  let from = p.joined && p.joined > state.season.start ? p.joined : state.season.start;
  if (back > from) from = back;
  if (d < from) return false;
  if (daysBetween(from, d) < REST_DAYS) return true;
  for (let k = 0; k < REST_DAYS; k++) if (trainedDay(p, addDays(d, -k))) return true;
  return false;
}
const resting = p => !activeOn(p, todayStr());
// Team-Faktor an einem Tag: 2 Aktive = 1, je weitere +0,5; allein = 0,5 (mindestens einer zählt immer)
const teamOn = d => Math.max(1, team().filter(p => activeOn(p, d)).length) / 2;
const teamF = () => teamOn(todayStr());
let sparTarget = null;    // Sparring-Gegner
function sparOpp(p) {
  const os = othersOf(p);
  return os.find(x => idOf(x) === sparTarget) || os[0] || null;
}
if (online()) state.current = game.me;
state.outbox = state.outbox || [];

function saveGame(g) { game = g; try { localStorage.setItem(GAME_KEY, JSON.stringify(g)); } catch (e) { /* ignorieren */ } }
const clean = x => JSON.parse(JSON.stringify(x));

function pushMine() {
  if (!online() || !sync || gameDeleted) return;
  sync.setPlayer(game.id, game.me, clean(state.players[game.me]));
  flushOutbox();
}
function flushOutbox() {
  if (!online() || !sync || gameDeleted) return;
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
  if (ev.kind === 'challenge' && false) {
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
    if (!m) {
      // Spiel ist online weg → NICHT sofort wegwerfen: dieses Handy hat noch eine Kopie und kann es wiederherstellen
      if (!gameDeleted) { gameDeleted = true; setTimeout(offerRestore, 300); }
      return;
    }
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
    // Held online weg (z. B. Spiel gelöscht) → lokale Kopie behalten, damit man wiederherstellen kann
    if (!data && (gameDeleted || (state.players[pid] && state.players[pid].updatedAt))) return;
    const before = state.players[pid] ? seasonDamage(state.players[pid]) : 0;
    state.players[pid] = otherFromRemote(data, defaultName(pid));
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

// Einsatz: Fällt der Schweinehund nicht, zahlt, wer sein eigenes Wochenziel am deutlichsten verfehlt hat
// (bei Gleichstand: wer weniger Schaden gemacht hat). Kein Ziel festgelegt = 0 %.
const STAKES = ['🥙 Döner', '🥤 Protein-Shake', '☕ Kaffee', '🍦 Eis'];
let setupStake = STAKES[0];
// gewertete Wochen: mindestens 4 Tage in der Jagd und schon vorbei (oder Jagd beendet)
function seasonWeeks() {
  const out = [], end = seasonEnd();
  for (let wk = weekKey(new Date(state.season.start + 'T12:00')); wk < end; wk = addDays(wk, 7)) {
    const from = wk > state.season.start ? wk : state.season.start, to = addDays(wk, 7) < end ? addDays(wk, 7) : end;
    if (daysBetween(from, to) >= 4 && (addDays(wk, 7) <= todayStr() || state.season.result)) out.push(wk);
  }
  return out;
}
// Anteil der geschafften Ziel-Trainings über die gewerteten Wochen (0…1), null = noch keine Woche gewertet
function goalRate(p) {
  const wks = seasonWeeks();
  if (!wks.length) return null;
  const total = goalTotal(p);
  if (!total) return 0;
  let done = 0, need = 0;
  for (const wk of wks) {
    let free = 0;
    for (let k = 0; k < 7; k++) if (!awayOn(p, addDays(wk, k))) free++;
    const n = total * free / 7;
    need += n;
    done += Math.min(n, sum(ACTIVITIES.map(a => Math.min(goalOf(p, a.id), weekSessions(p, a.id, wk)))));
  }
  return need ? done / need : 1;
}
function stakeLoser() {
  const ps = team();
  if (ps.length < 2 || !seasonWeeks().length) return null;
  const sorted = [...ps].sort((x, y) => goalRate(x) - goalRate(y) || seasonDamage(x) - seasonDamage(y));
  const low = sorted[0], top = sorted[sorted.length - 1];
  if (goalRate(top) === goalRate(low) && seasonDamage(top) === seasonDamage(low)) return null;
  return { payer: low, winner: top };
}
function setStake() {
  const v = prompt('Euer Einsatz: Was gibt aus, wer sein Wochenziel am deutlichsten verfehlt, wenn der Schweinehund überlebt? (z. B. 🥙 Döner, 🥤 Protein-Shake)', state.stake || '');
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
  if (existing && !confirm(`Bist du wirklich ${existing.name}? Dieses Gerät übernimmt dann den Helden von ${existing.name}.\n\nNeu dabei? Dann „Abbrechen“ und „Mitmachen“ wählen.`)) return;
  saveGame({ id: joinId, me: pid });
  joinId = null;
  history.replaceState(null, '', location.pathname + location.search);
  state = freshState();
  state.current = pid;
  state.outbox = [];
  if (snap && snap.meta) Object.assign(state, normalizeMeta(snap.meta));
  state.players[pid] = existing ? normalizeHero(existing) : normalizeHero({ name, joined: todayStr() });
  for (const o of PIDS) {
    if (o !== pid) state.players[o] = otherFromRemote(snap && snap.players && snap.players[o], defaultName(o));
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
// Online gelöschtes Spiel aus der Kopie auf diesem Handy zurückholen
async function offerRestore() {
  const known = PIDS.filter(id => state.players[id] && (state.players[id].updatedAt || id === game.me));
  const names = known.map(id => state.players[id].name).join(', ');
  if (confirm(`⚠️ Dieses Spiel wurde online gelöscht.\n\nAuf diesem Handy ist noch eine Kopie gespeichert (Helden: ${names}).\n\nJetzt für alle wiederherstellen?`)) {
    try {
      const now = await window.MB_SYNC.getGame(game.id);
      if (!now || !now.meta) await window.MB_SYNC.createGame(game.id, clean({ season: state.season, hall: state.hall, pact: state.pact, stake: state.stake, resetId: state.resetId }));
      for (const id of known) {
        if (id !== game.me && now && now.players && now.players[id]) continue; // schon von jemand anderem zurückgeholt
        if (id === game.me) state.players[id].updatedAt = Date.now();
        window.MB_SYNC.setPlayer(game.id, id, clean(state.players[id]));
      }
      gameDeleted = false;
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignorieren */ }
      alert('✅ Spiel wiederhergestellt! Der Einladungslink funktioniert wieder.');
      location.reload();
    } catch (e) { gameDeleted = false; toast('Wiederherstellen fehlgeschlagen – bitte App neu öffnen'); }
    return;
  }
  if (confirm('Nicht wiederherstellen. Soll das Spiel dann auch auf diesem Handy gelöscht werden?\n\n(„Abbrechen“ = Kopie behalten, beim nächsten Öffnen wird wieder gefragt.)')) {
    try { localStorage.removeItem(GAME_KEY); localStorage.removeItem(KEY); } catch (e) { /* ignorieren */ }
    location.reload();
  }
}
// Spiel endgültig löschen: entfernt alle Daten aus der Online-Datenbank (nur wer das Spiel angelegt hat)
async function deleteGame() {
  if (!online() || !window.MB_SYNC) { toast('Keine Verbindung – bitte mit Internet versuchen'); return; }
  if (game.me !== 'a') { toast('Nur wer das Spiel angelegt hat, kann es löschen'); return; }
  if (!confirm('Spiel für ALLE endgültig löschen? Alle Helden, Beute und der Verlauf werden aus der Online-Datenbank entfernt. Das lässt sich nicht rückgängig machen.')) return;
  const v = prompt('Zur Sicherheit bitte LÖSCHEN eintippen:', '');
  if (!v || v.trim().toUpperCase() !== 'LÖSCHEN') { toast('Nicht gelöscht'); return; }
  gameDeleted = true;
  try { await window.MB_SYNC.removeGame(game.id); } catch (e) { gameDeleted = false; toast('Löschen fehlgeschlagen – bitte nochmal versuchen'); return; }
  try { localStorage.removeItem(GAME_KEY); localStorage.removeItem(KEY); } catch (e) { /* ignorieren */ }
  alert('🗑️ Das Spiel wurde gelöscht.');
  location.reload();
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
function weekKey(d) { const x = new Date(d || (dayOverride ? dayOverride + 'T12:00' : Date.now())); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return todayStr(x); }

// ein Eintrag kann mehrere Einheiten enthalten (z. B. 2× Kraft + 1× Ausdauer)
const partsOf = e => e.parts ? asList(e.parts) : [{ id: e.id, n: 1, min: e.min || 10 }];
function minutesToday(p, id) { return sum(p.log.filter(e => e.kind === 'train' && e.day === todayStr()).flatMap(partsOf).filter(x => !id || x.id === id).map(x => x.min)); }
function healthToday(p) { return p.log.filter(e => e.kind === 'health' && e.day === todayStr() && HEALTH_NOW.some(h => h.id === e.id)).map(e => e.id); }
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
  return Math.min(1.5, 1 + 0.1 * Math.max(0, days - 1));
}

/* ---------- Saison & Schweinehund ---------- */

const chapterF = () => CHAPTER_GROWTH ** (state.season.chapter - 1);
// Jagd läuft bis Monatsende (end = erster Tag danach). Alte Jagd ohne Ende: bis 30.11.2026
const seasonEnd = () => state.season.end || '2026-12-01';
// erster Tag des nächsten Monats; bleiben weniger als 10 Tage, läuft die Jagd bis Ende des Folgemonats
function monthEnd(day) {
  const d = new Date(day + 'T12:00'); d.setDate(1); d.setMonth(d.getMonth() + 1);
  const end = todayStr(d);
  return daysBetween(day, end) < 10 ? monthEnd(end) : end;
}
const seasonLenF = () => daysBetween(state.season.start, seasonEnd()) / BOSS_DAYS;
// gleicher Tag im nächsten Monat (31.1. → 28./29.2.)
function addMonth(day) {
  const d = new Date(day + 'T12:00'), dd = d.getDate();
  d.setDate(1); d.setMonth(d.getMonth() + 1);
  d.setDate(Math.min(dd, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return todayStr(d);
}
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
// Lebenspunkte = Summe über alle Tage der Jagd: Tagesanteil × Team an diesem Tag × Kapitel
function bossMax() {
  let f = 0;
  for (let d = state.season.start; d < seasonEnd(); d = addDays(d, 1)) f += teamOn(d);
  return Math.round(BOSS_HP / BOSS_DAYS * chapterF() * f / 100) * 100;
}
// Lebenspunkte: Maximum − Schaden beider + Heilung an Tagen, an denen niemand trainiert hat
function bossState() {
  const max = bossMax();
  const players = Object.values(state.players);
  const regen = Math.round(BOSS_REGEN * chapterF() * teamF());
  const regenOn = d => Math.round(BOSS_REGEN * chapterF() * teamOn(d));
  const last = state.season.result ? state.season.result.day : todayStr();
  let hp = max, lazy = 0;
  for (let d = state.season.start; d <= last && d < seasonEnd(); d = addDays(d, 1)) {
    const dealt = sum(players.map(p => dayDmg(p, d)));
    if (!dealt && d < todayStr()) { lazy++; hp = Math.min(max, hp + regenOn(d)); }
    hp -= dealt;
  }
  return { hp: Math.max(0, Math.round(hp)), max, regen, lazy };
}
function monsterOfWeek(wk = weekKey()) {
  const i = Math.max(0, Math.floor(daysBetween(state.season.start, wk) / 7) + state.season.no) % MONSTERS.length;
  const m = MONSTERS[i];
  const ref = addDays(wk, 6) < todayStr() ? addDays(wk, 6) : todayStr();
  const max = Math.round(MONSTER_HP * chapterF() * teamOn(ref));
  const dealt = sum(Object.values(state.players).map(p => weekDamage(p, wk)));
  return { ...m, max, hp: Math.max(0, max - dealt), wk };
}
function daysLeft() { return Math.max(0, daysBetween(todayStr(), seasonEnd())); }

// Saisonende: Schweinehund besiegt oder Zeit abgelaufen
function checkSeason() {
  if (state.season.result) {
    if (todayStr() >= seasonEnd()) { newSeason(true); return true; }
    return false;
  }
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
    const mineW = weekDamage(p, last), other = Math.max(0, ...othersOf(p).map(x => weekDamage(x, last)));
    if (mineW > 0 && mineW >= other) { p.life.crowns++; if (p === me()) toast('👑 Du warst letzte Woche MVP!', true); }
    changed = true;
  }
  return changed;
}

const BACKUP_KEY = 'hantelhelden-sicherung' + DEVICE;
function backupDaily() {
  if (!online() || !sync || gameDeleted || !connected) return;
  let last = null;
  try { last = localStorage.getItem(BACKUP_KEY); } catch (e) { /* ignorieren */ }
  if (last === todayStr()) return;
  try { localStorage.setItem(BACKUP_KEY, todayStr()); } catch (e) { /* ignorieren */ }
  const players = {};
  for (const id of PIDS) if (state.players[id] && state.players[id].updatedAt) players[id] = clean(state.players[id]);
  const meta = clean({ season: state.season, hall: state.hall, pact: state.pact, stake: state.stake, resetId: state.resetId });
  window.MB_SYNC.saveBackup(game.id, String(new Date().getDay()), { day: todayStr(), t: Date.now(), meta, players })
    .catch(e => console.warn('Sicherung fehlgeschlagen', e));
}
async function restoreFromBackup(id = game && game.id) {
  if (!window.MB_SYNC || !id) return;
  let all = null;
  try { all = await window.MB_SYNC.getBackups(id); } catch (e) { toast('Keine Verbindung'); return; }
  const list = Object.values(all || {}).filter(b => b && b.meta).sort((a, b) => b.t - a.t);
  if (!list.length) { toast('Keine Sicherung gefunden'); return; }
  const pick = list.map((b, i) => `${i + 1}: ${new Date(b.t).toLocaleString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}`).join('\n');
  const v = prompt(`Welche Sicherung zurückholen? (Nummer eingeben)\n\n${pick}\n\nAchtung: Der aktuelle Stand aller Spieler wird damit ersetzt.`, '1');
  const b = list[Number(v) - 1];
  if (!b) return;
  if (!confirm(`Spiel wirklich auf den Stand vom ${new Date(b.t).toLocaleString('de-DE')} zurücksetzen – für alle?`)) return;
  const players = {};
  for (const [pid, data] of Object.entries(b.players || {})) players[pid] = { ...data, updatedAt: Date.now() };
  try { await window.MB_SYNC.restoreGame(id, b.meta, players); } catch (e) { toast('Zurückholen fehlgeschlagen'); return; }
  alert('✅ Sicherung zurückgeholt.');
  location.reload();
}
function resolveAll() {
  if (!game) return false;
  let changed = reconcileOwn();
  changed = checkSeason() || changed;
  backupDaily();
  for (const p of mine()) {
    changed = recalcHero(p) || changed;
    changed = claimTogether(p) || changed;
    changed = claimTeamTask(p) || changed;
    changed = claimRewards(p) || changed;
    changed = expireDuels(p) || changed;
    if (p.cheer && p.cheer.until < Date.now()) { p.cheer = null; changed = true; }
    if (p.goalNext && weekKey() >= p.goalNext.from) { p.goal = p.goalNext.goal; p.goalNext = null; changed = true; }
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
  const item = { uid: rid(), g: g.id, r: rar.id, lv: itemLevelFor(p), at: Date.now() };
  p.inv.unshift(item);
  if (rar.id === 'legendary') p.life.legendaries++;
  const old = p.inv.find(i => i.uid === p.equip[g.slot]);
  item.upgrade = !old || valueFor(p, item) > valueFor(p, old);
  autoEquip(p);
  return item;
}
// Ausrüstung verwaltet sich selbst: pro Platz das stärkste Teil, dazu die letzten paar Funde
// Haupt-Trainingsart der letzten 30 Tage (nach Minuten) → passende Teile werden bevorzugt
function mainType(p) {
  const m = { str: 0, end: 0, mind: 0 }, from = addDays(todayStr(), -30);
  for (const e of p.log) if (e.kind === 'train' && e.day >= from) for (const x of partsOf(e)) { const a = byId(ACTIVITIES, x.id); if (a) m[a.type] += x.min || 0; }
  return Object.keys(m).sort((x, y) => m[y] - m[x])[0];
}
// Wert eines Teils für diesen Helden: Teile für andere Trainingsarten zählen nur ein Drittel
function valueFor(p, it, main = mainType(p)) {
  const t = gearOf(it).type;
  return ['str', 'end', 'mind'].includes(t) && t !== main ? powerOf(it) / 3 : powerOf(it);
}
function autoEquip(p) {
  const main = mainType(p);
  for (const slot of Object.keys(SLOTS)) {
    const cur = p.inv.find(i => i.uid === p.equip[slot]);
    const best = p.inv.filter(i => gearOf(i).slot === slot).sort((a, b) => valueFor(p, b, main) - valueFor(p, a, main))[0];
    if (best && (!cur || valueFor(p, best, main) > valueFor(p, cur, main))) p.equip[slot] = best.uid;
    if (!best) p.equip[slot] = null;
  }
  const worn = new Set(Object.values(p.equip));
  p.inv = p.inv.filter((i, k) => worn.has(i.uid) || k < 5);
}
const gearOf = item => byId(GEAR, item.g);
const rarityOf = item => byId(RARITY, item.r);
const powerOf = item => rarityOf(item).power * (item.lv || 1);
function equippedItems(p) { return Object.values(p.equip).map(uid => p.inv.find(i => i.uid === uid)).filter(Boolean); }
const fmtPct = v => String(Math.round(v * 10) / 10).replace('.', ',');
function itemBonusText(item) {
  const g = gearOf(item), pw = powerOf(item);
  if (g.type === 'all') return `+${fmtPct(pw / 2)} % Schaden`;
  if (g.type === 'crit') return `+${fmtPct(pw / 2)} % Krit-Chance`;
  if (g.type === 'scan') return `+${fmtPct(pw / 2)} % Schaden · verrät im Sparring die Gegner-Taktik`;
  return `+${pw} % ${STATS[g.type].icon} ${STATS[g.type].name}-Schaden`;
}
function gearBonus(p, type) {
  let b = 0;
  for (const it of equippedItems(p)) {
    const g = gearOf(it), pw = powerOf(it);
    if (g.type === type) b += pw;
    if (g.type === 'all' || g.type === 'scan') b += pw / 2;
  }
  return b / 100;
}
function critChance(p) {
  let c = 0.05 + 0.3 * statBonus(p.stats.mind);
  for (const it of equippedItems(p)) if (gearOf(it).type === 'crit') c += powerOf(it) / 200;
  return Math.min(0.5, c);
}

/* ---------- Schaden eines Trainings ---------- */

function damageOf(p, a, { pr = false, timing = 1, crit = false, min = a.step, offset = 0 } = {}) {
  const mults = [];
  const n = Math.max(1, Math.round(min / a.step)); // Anzahl Blöcke
  let dmg = n * a.base * (1 + statBonus(p.stats[a.type]));
  const add = (label, f) => { if (f !== 1) { mults.push({ label, f }); dmg *= f; } };
  add('Ausrüstung', 1 + gearBonus(p, a.type));
  add('Combo', comboMult(p, true));
  // Rekord = ein Block zählt als Volltreffer
  if (pr) add('Neuer Rekord', 1 + (PR_MULT - 1) / n);
  if (crit) add('Kritisch', CRIT_MULT);
  add('Schlag', timing);
  if (p.cheer) add('Angefeuert', CHEER_MULT);
  const best = Math.max(0, ...othersOf(p).map(seasonDamage));
  if (best > 500 && seasonDamage(p) < 0.6 * best) add('Comeback', COMEBACK_MULT);
  add('Gesund gelebt', 1 + HEALTH_BONUS * healthToday(p).length);
  const done = minutesToday(p) + offset;
  let fall = 0;
  for (let m = 0; m < min; m += 5) fall += falloffAt(done + m);
  add('Erholung nötig', fall / Math.ceil(min / 5));
  return { dmg: Math.round(dmg), mults };
}

const LOG_MAX = 1000;
function trimLog(p) {
  if (p.log.length > LOG_MAX) p.log.length = LOG_MAX;
  const old = addDays(todayStr(), -45);
  for (const e of p.log) if (e.day < old && e.mults && e.mults.length) e.mults = [];
}

/* ---------- Einmalige Neuberechnung bisheriger Trainings mit den heutigen Regeln ----------
   Übernommen wird, was damals passiert ist (Krit, Minispiel, Rekord, Anfeuern, Comeback);
   neu gerechnet werden Werte-Bonus (gedeckelt), Ausrüstung (Stufen), Gesund-Haken (2 %), keine Talente. */

function recalcHero(p) {
  if ((p.recalc || 0) >= RECALC_V) return false;
  const known = id => ACTIVITIES.some(a => a.id === id);
  const trains = p.log.filter(e => e.kind === 'train');
  const st = { ...p.stats };
  for (const e of trains) for (const k in (e.got || {})) st[k] = Math.max(BASE_STAT, st[k] - e.got[k]);
  const order = [...trains].sort((x, y) => (x.day < y.day ? -1 : x.day > y.day ? 1 : x.t - y.t));
  const trainDays = new Set(Object.keys(p.dmg).filter(d => p.dmg[d] > 0));
  const gear = equippedItems(p), minsDone = {};
  for (const e of order) {
    const parts = partsOf(e);
    if (parts.length && parts.every(x => known(x.id))) {
      const was = Object.fromEntries(asList(e.mults).map(x => [x.label, x.f]));
      let cd = 0;
      for (let k = 0; k < 7; k++) if (k === 0 || trainDays.has(addDays(e.day, -k))) cd++;
      const comboF = Math.min(1.5, 1 + 0.1 * Math.max(0, cd - 1));
      const hs = p.log.filter(h => h.kind === 'health' && h.day === e.day && h.t < e.t && HEALTH_NOW.some(x => x.id === h.id)).length;
      let total = 0, offset = minsDone[e.day] || 0, prLeft = !!e.pr, top = -1, mults = [];
      for (const x of parts) {
        const a = byId(ACTIVITIES, x.id), min = x.min || a.step, n = Math.max(1, Math.round(min / a.step));
        const ms = [];
        let dmg = n * a.base * (1 + statBonus(st[a.type]));
        const add = (label, f) => { if (f !== 1) { ms.push({ label, f }); dmg *= f; } };
        let g = 0;
        for (const it of gear) if ((it.at || 0) <= e.t) {
          const gg = gearOf(it), pw = powerOf(it);
          if (gg.type === a.type) g += pw;
          if (gg.type === 'all' || gg.type === 'scan') g += pw / 2;
        }
        add('Ausrüstung', 1 + g / 100);
        add('Combo', comboF);
        if (prLeft && a.pr) { add('Neuer Rekord', 1 + (PR_MULT - 1) / n); prLeft = false; }
        if (e.crit) add('Kritisch', CRIT_MULT);
        add('Schlag', was['Schlag'] || 1);
        if (e.usedCheer) add('Angefeuert', CHEER_MULT);
        if (was['Comeback']) add('Comeback', COMEBACK_MULT);
        add('Gesund gelebt', 1 + HEALTH_BONUS * hs);
        let fall = 0;
        for (let m = 0; m < min; m += 5) fall += falloffAt(offset + m);
        add('Erholung nötig', fall / Math.ceil(min / 5));
        dmg = Math.round(dmg);
        total += dmg;
        if (dmg > top) { top = dmg; mults = ms; }
        offset += min;
      }
      p.dmg[e.day] = Math.max(0, (p.dmg[e.day] || 0) + total - (e.dmg || 0));
      e.dmg = total;
      e.mults = mults;
    }
    minsDone[e.day] = (minsDone[e.day] || 0) + sum(parts.map(x => x.min || 0));
    for (const k in (e.got || {})) st[k] += e.got[k];
  }
  p.recalc = RECALC_V;
  return true;
}

/* =========================================================
   Aktionen
   ========================================================= */

// 1. Training antippen → Minispiel
function startTrain() {
  const parts = ACTIVITIES.filter(a => menu[a.id] > 0).map(a => ({ a, n: menu[a.id] }));
  if (!parts.length) return;
  if (state.season.result) { toast('Die Jagd ist vorbei – starte unter „Mehr“ die nächste!'); return; }
  if (backfillDay) {
    const day = backfillDay, pend = { parts, pr: prOn && parts.some(x => x.a.pr) && withDay(day, () => !prToday(me())) };
    sheetOpen = false; menu = {}; backfillDay = null; prOn = false;
    withDay(day, () => doTrain(pend, 1, '📅 Nachgetragen'));
    const e = me().log.find(x => x.kind === 'train' && x.day === day);
    if (e) { e.added = todayStr(); save(); }
    render();
    return;
  }
  pending = { parts, pr: prOn && parts.some(x => x.a.pr) && !prToday(me()), t0: performance.now() };
  sheetOpen = false;
  menu = {};
  render();
}
// Menü: wie viele Einheiten heute noch gehen
// pro Eintragung bis zu maxMin (12 Schritte) – keine Tagesgrenze; viel am Tag bremst nur der Erholungs-Abzug
const unitsLeft = (p, a) => Math.floor(a.maxMin / a.step);
function menuStep(arg) {
  const [id, d] = arg.split(':');
  const a = byId(ACTIVITIES, id);
  menu[id] = Math.max(0, Math.min(unitsLeft(me(), a), (menu[id] || 0) + Number(d)));
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
  const { parts, pr } = pend;
  const a = parts[0].a;
  pending = null;
  if (!dayOverride) endAway(p, true);
  const L = p.life;
  const before = { level: levelOf(p), rank: rankOf(L), badges: earnedBadges(L).length, boss: bossState().hp, mon: monsterOfWeek().hp, stats: { ...p.stats } };
  const crit = Math.random() < critChance(p);
  // alle Einheiten zusammen = ein Treffer; Erholung zählt die Minuten der Reihe nach
  let dmg = 0, mults = [], offset = 0, prLeft = pr, top = 0;
  const got = {}, logParts = [];
  for (const { a: pa, n } of parts) {
    const min = n * pa.step;
    const r = damageOf(p, pa, { pr: prLeft && pa.pr, timing, crit, min, offset });
    if (prLeft && pa.pr) prLeft = false;
    dmg += r.dmg;
    if (r.dmg > top) { top = r.dmg; mults = r.mults; }
    offset += min;
    for (const s in pa.gives) got[s] = (got[s] || 0) + pa.gives[s] * n;
    p.counts[pa.id] = (p.counts[pa.id] || 0) + 1;
    logParts.push({ id: pa.id, n, min });
  }
  for (const s in got) p.stats[s] += got[s];
  const min = offset;
  const firstToday = !p.dmg[todayStr()];
  p.dmg[todayStr()] = (p.dmg[todayStr()] || 0) + dmg;
  p.xp += sum(got);
  const energy = firstToday ? Math.min(1, ENERGY_MAX - p.energy) : 0; // Spind und Energie: 1× am Tag
  p.energy += energy;
  L.sessions++;
  if (firstToday) L.days++;
  if (pr) L.prs++;
  L.bestCombo = Math.max(L.bestCombo, comboDays(p));
  const usedCheer = !!p.cheer;
  p.cheer = null;
  const item = firstToday ? dropLoot(p, 0) : null;
  p.log.unshift({ t: Date.now(), day: todayStr(), kind: 'train', id: a.id, parts: logParts, min, dmg, got, energy, pr, crit, firstToday,
    usedCheer, item: item ? item.uid : null, mults });
  trimLog(p);
  const gk = 'g' + weekKey();
  if (goalReached(p) && !p.claimed[gk]) {
    p.claimed[gk] = true;
    const bonus = GOAL_BONUS * goalTotal(p);
    p.dmg[todayStr()] += bonus;
    p.log[0].goalBonus = bonus;
    queueReveal({ title: `🎯 Wochenziel geschafft! +${num(bonus)} Bonus`, item: dropLoot(p, 2) });
  }
  resolveAll();
  save();
  hitShow = { dmg, mults, grade, crit, pr, item, a, bossBefore: before.boss, boss: bossState().hp, monKilled: before.mon > 0 && monsterOfWeek().hp <= 0 };
  if (levelOf(p) > before.level) toast(`⭐ Level ${levelOf(p)}!`, true);
  if (rankOf(L) !== before.rank) toast(`${rankOf(L).icon} Neuer Rang: ${rankOf(L).name}!`, true);
  const badges = earnedBadges(L);
  if (badges.length > before.badges) toast(`${badges[badges.length - 1].icon} Abzeichen: ${badges[badges.length - 1].name}!`, true);
  render();
}

function health(id) {
  const p = me(), day = sheetOpen && backfillDay ? backfillDay : todayStr();
  if (withDay(day, () => healthToday(p)).includes(id)) return;
  p.log.unshift({ t: Date.now(), day, kind: 'health', id });
  trimLog(p);
  save();
  toast(`${byId(HEALTH, id).icon} +2 % Schaden auf deine Trainings ${day === todayStr() ? 'heute' : 'an dem Tag'}`);
  render();
}

function cheer(pid) {
  const p = me(), o = state.players[pid];
  if (!o || o === p || p.cheerSent[pid] === todayStr()) return;
  if (cheersLeft(p) <= 0) { toast(`📣 Du hast diese Woche schon ${CHEER_WEEK}× angefeuert – ab Montag wieder`); return; }
  p.cheerWeek = { wk: weekKey(), n: (p.cheerWeek && p.cheerWeek.wk === weekKey() ? p.cheerWeek.n : 0) + 1 };
  p.cheerSent[pid] = todayStr();
  p.life.cheers++;
  sendEvent(pid, { kind: 'cheer', from: p.name });
  save();
  toast(`📣 ${o.name} angefeuert – nächstes Training +25 %!`);
  render();
}
const cheersLeft = p => CHEER_WEEK - (p.cheerWeek && p.cheerWeek.wk === weekKey() ? p.cheerWeek.n : 0);
const lastTrain = p => Object.keys(p.dmg).filter(d => p.dmg[d] > 0 && d <= todayStr()).sort().pop() || null;
function cheerRow(p) {
  const os = othersOf(p);
  if (!os.length) return '';
  const since = o => { const l = lastTrain(o); return l ? daysBetween(l, todayStr()) : 99; };
  const sorted = [...os].sort((x, y) => since(y) - since(x));
  const left = cheersLeft(p);
  return `<div class="cheer-row"><small>📣 Anfeuern (+25 % aufs nächste Training) · noch ${left}× diese Woche</small>
    <div class="health">${sorted.map(o => { const id = idOf(o), done = p.cheerSent[id] === todayStr(), d = since(o), off = done || left <= 0;
      const hint = awayNow(o) ? AWAY[awayNow(o).why].icon : d === 0 ? 'heute ✓' : d >= 99 ? 'noch nie' : d === 1 ? 'gestern' : `seit ${d} T.`;
      return `<button class="chip-btn ${done ? 'done' : ''}" data-act="cheer" data-arg="${id}" ${off ? 'disabled' : ''}>${esc(o.name)} <small>${done ? '✓' : hint}</small></button>`; }).join('')}</div></div>`;
}

/* ---------- Team-Aufgabe der Woche ---------- */
const TEAM_TASK_BONUS = 150;   // Bonus-Schaden für jeden, wenn die Aufgabe geschafft ist
const TEAM_TASKS = [
  { icon: '🫀', text: 'Jeder macht mindestens 1× Ausdauer', each: (q, wk) => weekSessions(q, 'puls', wk) + weekSessions(q, 'sport', wk) >= 1 },
  { icon: '⏱️', text: n => `Zusammen ${75 * n} Minuten trainieren`, total: (qs, wk) => [sum(qs.map(q => weekMinutesAll(q, wk))), 75 * qs.length] },
  { icon: '📅', text: 'Jeder trainiert an mindestens 2 Tagen', each: (q, wk) => weekDays(q, wk) >= 2 },
  { icon: '🧘', text: n => `Zusammen ${n}× Ausgleich (Yoga, Dehnen …)`, total: (qs, wk) => [sum(qs.map(q => weekSessions(q, 'ausgleich', wk))), qs.length] },
  { icon: '🔥', text: 'An 5 verschiedenen Tagen trainiert jemand', total: (qs, wk) => { const ds = new Set(); for (const q of qs) for (let k = 0; k < 7; k++) if (trainedDay(q, addDays(wk, k))) ds.add(k); return [ds.size, 5]; } },
  { icon: '💪', text: 'Jeder macht mindestens 1× Kraft', each: (q, wk) => weekSessions(q, 'kraft', wk) >= 1 },
];
function weekMinutesAll(q, wk) { return sum(q.log.filter(e => e.kind === 'train' && e.day >= wk && e.day < addDays(wk, 7)).flatMap(partsOf).map(x => x.min || 0)); }
function weekDays(q, wk) { let n = 0; for (let k = 0; k < 7; k++) if (trainedDay(q, addDays(wk, k))) n++; return n; }
function teamTask(wk = weekKey()) {
  const i = Math.abs(Math.round(new Date(wk + 'T12:00') / (7 * DAY_MS))) % TEAM_TASKS.length;
  const t = TEAM_TASKS[i];
  // wer die ganze Woche krank/im Urlaub ist oder ruht, muss nicht mitmachen
  const qs = team().filter(q => !awayNow(q) && activeOn(q, wk < todayStr() ? wk : todayStr()));
  const n = Math.max(1, qs.length);
  let have, need, who = [];
  if (t.each) { who = qs.map(q => ({ q, ok: t.each(q, wk) })); have = who.filter(x => x.ok).length; need = qs.length; }
  else [have, need] = t.total(qs, wk);
  return { ...t, text: typeof t.text === 'function' ? t.text(n) : t.text, have, need, who, done: need > 0 && have >= need, wk };
}
function claimTeamTask(p) {
  const tt = teamTask();
  const k = 't' + tt.wk;
  if (!tt.done || p.claimed[k] || !team().includes(p)) return false;
  p.claimed[k] = true;
  p.dmg[todayStr()] = (p.dmg[todayStr()] || 0) + TEAM_TASK_BONUS;
  if (p === me()) toast(`🤝 Team-Aufgabe geschafft! +${TEAM_TASK_BONUS} Bonus-Schaden`, true);
  return true;
}
function teamTaskCard() {
  const tt = teamTask();
  return `<section class="card task ${tt.done ? 'done' : ''}">
    <div class="goal-top"><b>🤝 Team-Aufgabe der Woche</b><small>${tt.done ? `✓ +${TEAM_TASK_BONUS} für jeden` : `+${TEAM_TASK_BONUS} für jeden`}</small></div>
    <div class="task-text">${tt.icon} ${tt.text}</div>
    <div class="hpbar small"><i style="width:${Math.min(100, tt.need ? tt.have / tt.need * 100 : 0)}%"></i></div>
    <small class="hint">${tt.who.length ? tt.who.map(x => `${x.ok ? '✓' : '·'} ${esc(x.q === me() ? 'Du' : x.q.name)}`).join('  ') : `${num(tt.have)} von ${num(tt.need)}`}</small>
  </section>`;
}

/* ---------- Gemeinsam trainiert: beide bestätigen → +10 % auf das Training des Tages ---------- */
const TOGETHER_BONUS = 0.1;
const myTrainDmg = (p, d) => sum(p.log.filter(e => e.kind === 'train' && e.day === d).map(e => e.dmg || 0));
function toggleTogether(key) {
  const p = me(), [pid, d] = key.split('|');
  const k = pid + ':' + d;
  if (p.together[k]) delete p.together[k]; else p.together[k] = true;
  const old = addDays(todayStr(), -14);
  for (const x of Object.keys(p.together)) if (x.split(':')[1] < old) delete p.together[x];
  save();
  toast(p.together[k] ? `🤝 Vermerkt – sobald ${state.players[pid].name} es auch bestätigt, gibt es +10 % für euch beide` : 'Zurückgenommen');
  render();
}
function claimTogether(p) {
  let changed = false;
  const me_ = idOf(p);
  for (const k of Object.keys(p.together)) {
    const [pid, d] = k.split(':'), o = state.players[pid];
    if (!o || !o.together || !o.together[me_ + ':' + d] || p.claimed['z' + d + pid]) continue;
    const bonus = Math.round(myTrainDmg(p, d) * TOGETHER_BONUS);
    if (!bonus) continue;
    p.claimed['z' + d + pid] = true;
    p.dmg[d] = (p.dmg[d] || 0) + bonus;
    if (p === me()) toast(`🤝 Gemeinsam mit ${o.name} trainiert: +${num(bonus)} Bonus-Schaden`, true);
    changed = true;
  }
  return changed;
}

/* ---------- Team-Feed mit Reaktionen ---------- */
const REACTS = ['👍', '🔥', '💪'];
function feedItems() {
  const from = addDays(todayStr(), -4), items = [];
  for (const q of team()) {
    const pid = idOf(q);
    for (const e of q.log) if (e.kind === 'train' && e.day >= from) items.push({ q, pid, e, key: pid + ':' + e.t });
  }
  return items.sort((x, y) => y.e.t - x.e.t).slice(0, 5);
}
function reactionsOf(key) {
  const out = [];
  for (const q of team()) if (q.reacts && q.reacts[key]) out.push({ who: q, r: q.reacts[key] });
  return out;
}
function react(arg) {
  const [key, r] = arg.split('|');
  const p = me();
  if (key.startsWith(state.current + ':')) return;
  if (p.reacts[key] === r) delete p.reacts[key]; else p.reacts[key] = r;
  const old = Date.now() - 14 * DAY_MS;
  for (const k of Object.keys(p.reacts)) if (Number(k.split(':')[1]) < old) delete p.reacts[k];
  save();
  render();
}
function feedCard() {
  const items = feedItems();
  if (!items.length) return '';
  const p = me(), when = d => d === todayStr() ? 'heute' : d === addDays(todayStr(), -1) ? 'gestern' : new Date(d + 'T12:00').toLocaleDateString('de-DE', { weekday: 'short' });
  return `<h2>Was im Team los ist</h2><section class="card feed">${items.map(({ q, pid, e, key }) => {
    const parts = {};
    for (const x of partsOf(e)) parts[x.id] = (parts[x.id] || 0) + x.min;
    const what = Object.entries(parts).map(([a, m]) => `${actOf(a).icon} ${m} Min.`).join(' · ');
    const rs = reactionsOf(key), mine = q === p, myR = p.reacts[key];
    return `<div class="feed-row"><div class="feed-top"><i style="background:${PCOLOR[pid]}"></i><b>${mine ? 'Du' : esc(q.name)}</b>
        <span>${what}</span><small>${when(e.day)}${e.added ? ' · nachgetragen' : ''}</small></div>
      ${!mine && myTrainDmg(p, e.day) > 0 && e.day >= addDays(todayStr(), -3) ? (() => {
        const k = pid + ':' + e.day, mineOk = p.together[k], theirs = q.together && q.together[state.current + ':' + e.day];
        const lbl = mineOk && theirs ? '🤝 zusammen trainiert ✓ +10 %' : mineOk ? `🤝 wartet auf ${esc(q.name)}` : theirs ? `🤝 ${esc(q.name)} sagt: zusammen trainiert – bestätigen?` : '🤝 zusammen trainiert?';
        return `<button class="together ${mineOk ? 'on' : ''}" data-act="together" data-arg="${pid}|${e.day}">${lbl}</button>`;
      })() : ''}
      <div class="feed-reacts">${mine ? (rs.length ? rs.map(x => `<span title="${esc(x.who.name)}">${x.r} ${esc(x.who.name)}</span>`).join('') : '<small>noch keine Reaktion</small>')
        : REACTS.map(r => { const n = rs.filter(x => x.r === r).length; return `<button class="react ${myR === r ? 'on' : ''}" data-act="react" data-arg="${key}|${r}">${r}${n ? ` ${n}` : ''}</button>`; }).join('')}</div></div>`;
  }).join('')}</section>`;
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
  if (!e || !['train', 'health'].includes(e.kind) || (e.day !== todayStr() && e.added !== todayStr()) || !confirm('Letzten Eintrag rückgängig machen?')) return;
  revertEntry(p, e);
  p.log.shift();
  save();
  render();
}

// Eigene Einträge der letzten Tage löschen (Kalender → Tag). Danach kann man neu eintragen.
const canEditDay = d => !state.season.result && d <= todayStr() && d >= state.season.start && d >= addDays(todayStr(), -BACKFILL_DAYS);
function deleteEntry(t) {
  const p = me(), e = p.log.find(x => String(x.t) === String(t));
  if (!e || !['train', 'health'].includes(e.kind) || !canEditDay(e.day)) return;
  if (!confirm(e.kind === 'train' ? 'Diesen Trainings-Eintrag löschen? Schaden und Werte werden abgezogen – danach kannst du ihn richtig neu eintragen.' : 'Diesen Haken löschen?')) return;
  // War es das erste Training des Tages und es gibt noch weitere? Dann übernimmt das nächste die Tages-Belohnung (Spind, Energie, Trainingstag).
  if (e.kind === 'train' && e.firstToday) {
    const next = p.log.filter(x => x !== e && x.kind === 'train' && x.day === e.day).sort((x, y) => x.t - y.t)[0];
    if (next) {
      next.firstToday = true; next.energy = (next.energy || 0) + (e.energy || 0); e.energy = 0;
      if (e.item && !next.item) { next.item = e.item; e.item = null; }
      e.firstToday = false;
    }
  }
  revertEntry(p, e);
  p.log = p.log.filter(x => x !== e);
  save();
  toast('🗑️ Eintrag gelöscht');
  render();
}

function revertEntry(p, e) {
  if (e.kind === 'train') {
    const L = p.life;
    p.dmg[e.day] = Math.max(0, (p.dmg[e.day] || 0) - e.dmg - (e.goalBonus || 0));
    if (e.goalBonus) delete p.claimed['g' + weekKey(new Date(e.day + 'T12:00'))];
    if (!p.dmg[e.day]) delete p.dmg[e.day];
    for (const s in e.got) p.stats[s] = Math.max(BASE_STAT, p.stats[s] - e.got[s]);
    p.xp = Math.max(0, p.xp - sum(e.got));
    p.energy = Math.max(0, p.energy - e.energy);
    for (const x of partsOf(e)) p.counts[x.id] = Math.max(0, (p.counts[x.id] || 0) - 1);
    L.sessions = Math.max(0, L.sessions - 1);
    if (e.firstToday) L.days = Math.max(0, L.days - 1);
    if (e.pr) L.prs = Math.max(0, L.prs - 1);
    const it = p.inv.find(i => i.uid === e.item);
    if (it) {
      if (it.r === 'legendary') L.legendaries = Math.max(0, L.legendaries - 1);
      for (const s in p.equip) if (p.equip[s] === it.uid) p.equip[s] = null;
      p.inv = p.inv.filter(i => i !== it);
      autoEquip(p);
    }
  }
}

function setPact() {
  const v = prompt('Was gönnt ihr euch in echt, wenn der Schweinehund fällt? (z. B. Saunatag, Steak-Essen, neue Laufschuhe)', state.pact || '');
  if (v === null) return;
  state.pact = v.trim().slice(0, 80);
  metaSet({ pact: state.pact });
  save();
  render();
}

function seasonSummary() {
  const start = state.season.start, end = state.season.result ? addDays(state.season.result.day, 1) : seasonEnd();
  return team().map(p => {
    let days = 0, min = 0;
    for (let d = start; d < end && d <= todayStr(); d = addDays(d, 1)) if (trainedDay(p, d)) days++;
    for (const e of p.log) if (e.kind === 'train' && e.day >= start && e.day < end) min += sum(partsOf(e).map(x => x.min || 0));
    const rate = goalRate(p);
    return { name: p.name, days, min, dmg: Math.round(seasonDamage(p)), rate: rate === null ? null : Math.round(rate * 100) };
  }).sort((x, y) => y.dmg - x.dmg);
}
function newSeason(auto = false) {
  const r = state.season.result;
  if (!r) return;
  const ch = state.season.chapter;
  const sl = !r.won && state.stake ? stakeLoser() : null;
  state.hall.unshift({ no: state.season.no, chapter: ch, won: r.won, day: r.day, pact: state.pact,
    paid: sl ? `${sl.payer.name} → ${sl.winner.name}: ${state.stake}` : '',
    mvp: [...team()].sort((x, y) => seasonDamage(y) - seasonDamage(x))[0].name,
    start: state.season.start, end: r.day, max: bossState().max, stats: seasonSummary() });
  // automatisch: neue Jagd beginnt am 1. (auch wenn erst später jemand die App öffnet)
  const start = auto ? seasonEnd() : todayStr();
  const carry = {};
  if (start === r.day) for (const [id, p] of Object.entries(state.players)) carry[id] = p.dmg[start] || 0;
  state.season = { no: state.season.no + 1, chapter: r.won ? ch + 1 : ch, start, end: monthEnd(start), result: null, carry };
  state.pact = '';
  metaSet({ hall: state.hall, season: state.season, pact: '' });
  save();
  toast(r.won ? `🐷 Kapitel ${state.season.chapter}: Der Schweinehund ist zurück – und stärker!` : '🐷 Revanche! Diesmal kriegt ihr ihn.', true);
  render();
  if (!auto) setTimeout(setPact, 400);
}

function reset() {
  if (!confirm('Wirklich ALLES zurücksetzen? Alle Helden starten neu – auf allen Handys.')) return;
  const fresh = freshState();
  for (const k of ['season', 'hall', 'pact', 'resetId']) state[k] = fresh[k];
  metaSet({ season: state.season, hall: null, pact: '', resetId: state.resetId });
  reconcileOwn();
  save();
  toast('🔄 Neues Spiel – alles auf Anfang!', true);
  render();
}
// einen Helden auf null setzen (Name und Wochenziel bleiben) – auch für Mitspieler
function resetHero(id = state.current) {
  const p = state.players[id], mineOne = ownIds().includes(id);
  if (!mineOne && !(sync && connected)) { toast('Dafür musst du online sein'); return; }
  if (!confirm(`Daten von ${p.name} zurücksetzen?\n\n${p.name} startet bei null: Training, Schaden, Ausrüstung, Werte. Alle anderen behalten alles.`)) return;
  const fresh = normalizeHero({ name: p.name, goal: p.goal, goalNext: p.goalNext, joined: p.joined, resetId: state.resetId });
  state.players[id] = fresh;
  statsOf = null;
  if (mineOne) save();
  else { fresh.updatedAt = Date.now(); sync.setPlayer(game.id, id, clean(fresh)); }
  toast(`🔄 ${p.name} startet bei null`, true);
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
    const g = gearOf(it), pw = powerOf(it) / 2;
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
    if (p.energy < 1) { toast('⚡ Keine Energie – das erste Training des Tages lädt 1 ⚡'); return; }
    const other = sparOpp(p);
    if (!other) return;
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
  create: createGame, deletegame: deleteGame, join: joinGame, local: playLocal, share: shareInvite, leave: leaveGame,
  setupdone: () => { setupStep = null; render(); },
  intro: () => { introPage = 0; render(); window.scrollTo(0, 0); },
  intronext: () => { introPage = Math.min(INTRO.length - 1, introPage + 1); render(); window.scrollTo(0, 0); },
  introprev: () => { introPage = Math.max(0, introPage - 1); render(); window.scrollTo(0, 0); },
  introdone: () => { introPage = null; try { localStorage.setItem(INTRO_KEY, '1'); } catch (e) { /* ignorieren */ } render(); window.scrollTo(0, 0); },
  tab: t => { tab = t; if (t === 'held') markHeldSeen(); render(); window.scrollTo(0, 0); },
  sheet: id => { backfillDay = null; menu = {}; if (id && unitsLeft(me(), byId(ACTIVITIES, id)) > 0) menu[id] = 1; sheetOpen = true; render(); },
  menustep: menuStep,
  goaledit: () => { goalDraft = { ...(me().goal || { kraft: 2, puls: 1, ausgleich: 1 }) }; goalOpen = true; render(); },
  goalstep: arg => { const [id, d] = arg.split(':'); goalDraft[id] = Math.max(0, Math.min(7, (goalDraft[id] || 0) + Number(d))); render(); },
  goalcancel: () => { goalOpen = false; render(); },
  goalsave: () => { const p = me(); const msg = setGoal(p, goalDraft); goalOpen = false; save(); toast(msg, true); render(); },
  goalfold: () => { goalFold = !goalFold; render(); },
  calfold: () => { calFold = !calFold; render(); },
  calday: d => { dayOpen = d; render(); },
  closeday: () => { dayOpen = null; render(); },
  delentry: deleteEntry,
  backfill: d => { if (!canBackfill(d)) return; backfillDay = d; dayOpen = null; menu = {}; sheetOpen = true; render(); },
  bossfold: () => { bossFold = !bossFold; render(); },
  fold: k => { openFolds.has(k) ? openFolds.delete(k) : openFolds.add(k); render(); },
  sparwith: id => { sparTarget = id; render(); },
  away: why => setAway(why),
  restorebackup: () => restoreFromBackup(),
  restorejoin: () => restoreFromBackup(joinId),
  together: arg => toggleTogether(arg),
  react,
  recapshare: () => shareRecap(),
  recaphide: () => { try { localStorage.setItem(RECAP_KEY, String(state.hall[0] && state.hall[0].no)); } catch (e) { /* ignorieren */ } render(); },
  endaway: () => endAway(),
  closesheet: () => { sheetOpen = false; backfillDay = null; render(); },
  stats: id => { statsOf = id; render(); },
  closestats: () => { statsOf = null; render(); },
  resetmine: () => resetHero(),
  resethero: id => resetHero(id),
  bet: () => { if (!state.pact) setPact(); else if (!state.stake) setStake(); else { tab = 'mehr'; render(); window.scrollTo(0, 0); } },
  player: id => { if (online() || id === state.current) { statsOf = id; render(); return; } state.current = id; duelOpen = false; save(); render(); },
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act],[data-stop]');
  if (el && !el.dataset.stop && !el.disabled && actions[el.dataset.act]) actions[el.dataset.act](el.dataset.arg);
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
  const lead = Math.max(...team().map(p => weekDamage(p, wk)));
  document.getElementById('players').innerHTML = team().map(p => [idOf(p), p]).map(([id, p]) => `
    <button class="pchip ${id === state.current ? 'on' : ''} ${online() && id !== game.me ? 'other' : ''}" data-act="player" data-arg="${id}">
      <b>${lead > 0 && weekDamage(p, wk) === lead ? '👑 ' : ''}${awayNow(p) ? AWAY[awayNow(p).why].icon + ' ' : resting(p) ? '💤 ' : ''}${esc(p.name)}</b><small>${num(weekDamage(p, wk))} ⚡</small>
    </button>`).join('');
  renderSyncDot();
  const p = me();
  const shown = tab === 'sparring' || tab === 'held' ? 'team' : tab;
  for (const btn of document.querySelectorAll('#tabs button')) btn.classList.toggle('on', btn.dataset.arg === shown);
  const badge = document.getElementById('spar-badge');
  if (badge) badge.textContent = '';
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
  const p = me(), others = othersOf(p);
  const b = bossState(), mon = monsterOfWeek();
  const pct = b.hp / b.max;
  const res = state.season.result;
  const sl = stakeLoser();
  const aw = awayNow(p);
  return `
    ${aw ? `<section class="banner away">${AWAY[aw.why].icon} <b>Du bist ${AWAY[aw.why].name} gemeldet.</b> Du zählst gerade nicht mit – weder für den Schweinehund noch fürs Wochenziel. <button class="btn small" data-act="endaway">Wieder da 💪</button></section>` : ''}
    ${recapCard()}
    <section class="card bosscard ${res ? (res.won ? 'won' : 'lost') : ''}">
      <div class="boss-head">
        <div><div class="eyebrow">Kapitel ${state.season.chapter} · ${res ? 'Jagd beendet' : `noch ${daysLeft()} Tage`}</div>
          <b class="boss-name">Der innere Schweinehund</b></div>
        <span class="boss-hp-num">${num(b.hp)}<small> / ${num(b.max)}</small></span>
      </div>
      ${bossSvg(pct, state.season.chapter)}
      <div class="hpbar"><i style="width:${pct * 100}%"></i></div>
      ${res ? `<small class="boss-info">${res.won ? '🎉 Besiegt! Unter „Mehr“ startet die nächste Jagd.' : '😤 Er hat überlebt … Unter „Mehr“ startet die Revanche.'}</small>` : ''}
      <div class="monline ${mon.hp <= 0 ? 'down' : ''}">${mon.icon} <b>${mon.name}</b>
        <span>${mon.hp <= 0 ? '✓ besiegt' : `Wochenmonster · noch ${num(mon.hp)}`}</span>
        <button class="more-btn" data-act="bossfold">${bossFold ? 'Einsatz & Regeln ▾' : 'weniger ▴'}</button></div>
      ${bossFold ? '' : `
      <div class="bet" data-act="bet">
        <span>🏆 <b>Sieg:</b> ${state.pact ? esc(state.pact) : '<i>festlegen …</i>'}</span>
        <span>😬 <b>Niederlage:</b> ${state.stake ? `${sl ? esc(sl.payer.name) : 'größter Ziel-Rückstand'} zahlt ${esc(state.stake)}` : '<i>festlegen …</i>'}</span>
      </div>
      <small class="boss-info">💤 Er heilt sich um ${num(b.regen)} an jedem Tag, an dem keiner trainiert. Wer ${REST_DAYS} Tage nicht trainiert, ruht und zählt nicht für seine Lebenspunkte.</small>`}
    </section>

    ${(() => { const ng = newGear(p); return ng.length ? `<button class="banner gear-new" data-act="tab" data-arg="held">🎁 <span><b>Neue Ausrüstung angelegt:</b> ${ng.map(it => gearOf(it).icon + ' ' + esc(gearOf(it).name)).join(', ')}</span><span class="chev">›</span></button>` : ''; })()}
    ${p.cheer ? `<section class="banner cheer">📣 <b>${esc(p.cheer.from)} feuert dich an!</b> Dein nächstes Training macht +25 % Schaden.</section>` : ''}
    ${goalCard(p, res)}`;
}

// Team: alles Gemeinsame an einem Ort
function viewTeam() {
  const p = me(), tt = teamTask();
  return `
    ${teamTaskCard()}
    <h2>Diese Woche</h2>
    <div class="card list">${team().map(x => { const id = idOf(x), aw = awayNow(x);
      return `<div class="row who-link" ${x === p ? 'data-act="tab" data-arg="held"' : `data-act="stats" data-arg="${id}"`}><span class="cal-legend"><span><i style="background:${PCOLOR[id]}"></i>${x === p ? 'Du <small class="held-link">🦸 mein Held ›</small>' : esc(x.name)}</span></span>
        <small>${aw ? AWAY[aw.why].icon + ' ' + AWAY[aw.why].name : resting(x) ? '💤 ruht' : ''}</small>
        <b>${goalTotal(x) ? `🎯 ${goalDone(x)}/${goalTotal(x)}${goalReached(x) ? ' ✓' : ''}` : '–'}</b></div>`; }).join('')}</div>
    ${cheerRow(p)}
    ${feedCard()}`;
}

/* ---------- Monatsrückblick ---------- */
function recapData() {
  const res = state.season.result;
  if (res) return { no: state.season.no, chapter: state.season.chapter, won: res.won, start: state.season.start, end: res.day,
    stats: seasonSummary(), live: true, payer: !res.won && state.stake && stakeLoser() ? stakeLoser().payer.name : '', stake: state.stake, pact: state.pact };
  const h = state.hall[0];
  let hidden = null;
  try { hidden = localStorage.getItem(RECAP_KEY); } catch (e) { /* ignorieren */ }
  if (!h || !h.stats || hidden === String(h.no) || todayStr() > addDays(state.season.start, 6)) return null;
  return { no: h.no, chapter: h.chapter, won: h.won, start: h.start, end: h.end, stats: asList(h.stats), live: false,
    payer: h.paid ? h.paid.split(' → ')[0] : '', stake: h.paid ? h.paid.split(': ').slice(1).join(': ') : '', pact: h.pact };
}
function recapCard() {
  const r = recapData();
  if (!r) return '';
  const fmt = d => new Date(d + 'T12:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' });
  return `<section class="card recap ${r.won ? 'won' : 'lost'}">
    <div class="goal-top"><b>${r.won ? '🏆' : '😤'} Rückblick Jagd ${r.no} · ${fmt(r.start)}–${fmt(r.end)}</b>${r.live ? '' : '<button class="btn small ghost" data-act="recaphide">✕</button>'}</div>
    <p class="hint">${r.won ? `Schweinehund besiegt – Kapitel ${r.chapter} geschafft!${r.pact ? ` Pakt: ${esc(r.pact)} 🎉` : ''}` : `Er hat überlebt.${r.payer ? ` <b>${esc(r.payer)}</b> zahlt ${esc(r.stake)}.` : ''}`}</p>
    <div class="list">${r.stats.map((x, i) => `<div class="row"><span>${['🥇', '🥈', '🥉'][i] || '·'} <b>${esc(x.name)}</b> <small>${x.days} Tage · ${x.min} Min.${x.rate !== null ? ` · Ziel ${x.rate} %` : ''}</small></span><b>${num(x.dmg)}</b></div>`).join('')}</div>
    <button class="btn" data-act="recapshare">📤 Als Bild teilen</button>
  </section>`;
}
async function shareRecap() {
  const r = recapData();
  if (!r) return;
  const c = document.createElement('canvas'), W = 1080, H = 1350;
  c.width = W; c.height = H;
  const g = c.getContext('2d'), F = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  g.fillStyle = '#14161b'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#ff6a33'; g.font = `900 54px ${F}`; g.fillText('HANTELHELDEN', 80, 130);
  g.fillStyle = '#f4f5f7'; g.font = `800 64px ${F}`;
  g.fillText(`${r.won ? '🏆 Geschafft!' : '😤 Knapp vorbei'}`, 80, 250);
  const fmt = d => new Date(d + 'T12:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });
  g.fillStyle = '#9aa1ab'; g.font = `500 38px ${F}`;
  g.fillText(`Jagd ${r.no} · ${fmt(r.start)} – ${fmt(r.end)}`, 80, 320);
  let y = 440;
  r.stats.forEach((x, i) => {
    g.fillStyle = i === 0 ? '#f2b233' : '#f4f5f7'; g.font = `800 48px ${F}`;
    g.fillText(`${['🥇', '🥈', '🥉'][i] || '  '} ${x.name}`, 80, y);
    g.textAlign = 'right'; g.fillText(num(x.dmg), W - 80, y); g.textAlign = 'left';
    g.fillStyle = '#9aa1ab'; g.font = `500 34px ${F}`;
    g.fillText(`${x.days} Trainingstage · ${x.min} Minuten${x.rate !== null ? ` · Ziel ${x.rate} %` : ''}`, 140, y + 50);
    y += 150;
  });
  g.fillStyle = '#f4f5f7'; g.font = `700 40px ${F}`;
  if (r.won && r.pact) g.fillText(`🎉 Jetzt fällig: ${r.pact}`, 80, H - 160);
  if (!r.won && r.payer) g.fillText(`😬 ${r.payer} zahlt ${r.stake}`, 80, H - 160);
  g.fillStyle = '#9aa1ab'; g.font = `500 32px ${F}`; g.fillText('Jagd auf den inneren Schweinehund 🐷', 80, H - 80);
  const blob = await new Promise(ok => c.toBlob(ok, 'image/png'));
  const file = new File([blob], `hantelhelden-jagd-${r.no}.png`, { type: 'image/png' });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Hantelhelden' }); return; } } catch (e) { return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
}

/* ---------- Kalender: wer hat wann trainiert ---------- */
const PCOLOR = { a: '#2f6fed', b: '#8e6bd8', c: '#0fa3a3', d: '#e0559b' };
const fmtDay = d => new Date(d + 'T12:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' });
const trainedOn = (p, d) => p.log.some(e => e.kind === 'train' && e.day === d) || (p.dmg[d] || 0) > 0;
const isHealDay = d => d >= state.season.start && d < todayStr() && d < seasonEnd() && !Object.values(state.players).some(p => dayDmg(p, d) > 0);
const healOn = d => Math.round(BOSS_REGEN * chapterF() * teamOn(d));
const fmtWeekday = d => new Date(d + 'T12:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'numeric' });
function myEntries(p, d) {
  const es = p.log.filter(e => (e.kind === 'train' || e.kind === 'health') && e.day === d).sort((x, y) => x.t - y.t);
  if (!es.length) return '';
  const what = e => e.kind === 'train'
    ? partsOf(e).map(x => `${actOf(x.id).icon} ${actOf(x.id).name} ${x.min} Min.`).join(' + ') + ` <small>−${num(e.dmg || 0)}</small>`
    : `${(byId(HEALTH, e.id) || {}).icon || '✓'} ${(byId(HEALTH, e.id) || {}).name || 'Haken'}`;
  return `<details class="my-entries"><summary>✏️ Falsch eingetragen? Einträge löschen</summary>
    ${es.map(e => `<div class="entry-row"><span>${what(e)}</span><button class="btn small ghost" data-act="delentry" data-arg="${e.t}">🗑️</button></div>`).join('')}
    <small class="hint">Löschen zieht Schaden und Werte wieder ab. Danach einfach richtig neu eintragen.</small></details>`;
}
function daySheet() {
  const d = dayOpen, p0 = me();
  const rows = team().map(p => {
    const id = idOf(p);
    const trains = p.log.filter(e => e.kind === 'train' && e.day === d);
    const parts = {};
    for (const x of trains.flatMap(partsOf)) parts[x.id] = (parts[x.id] || 0) + x.min;
    const hs = p.log.filter(e => e.kind === 'health' && e.day === d).map(e => (byId(HEALTH, e.id) || {}).icon).join('');
    const dmg = (p.dmg[d] || 0);
    const body = Object.keys(parts).length
      ? Object.entries(parts).map(([a, m]) => `<span>${actOf(a).icon} ${actOf(a).name} · ${m} Min.</span>`).join('')
      : dmg ? '<span>trainiert</span>' : awayOn(p, d) ? `<span>${AWAY[awayOn(p, d).why].icon} ${AWAY[awayOn(p, d).why].name}</span>` : '<span class="muted">kein Training</span>';
    return `<div class="day-row"><div class="day-who"><i style="background:${PCOLOR[id]}"></i><b>${esc(p.name)}${p === p0 ? ' (du)' : ''}</b>
        ${dmg ? `<small>−${num(dmg)} Schaden</small>` : ''}</div>
      <div class="day-what">${body}${hs ? `<span>${hs}</span>` : ''}${trains.some(e => e.added) ? '<small>📅 nachgetragen</small>' : ''}</div>
      ${p === p0 && canEditDay(d) ? myEntries(p, d) : ''}</div>`;
  }).join('');
  const bf = canBackfill(d);
  return `
    <div class="overlay sheet-wrap" data-act="closeday">
      <div class="ov-card sheet" data-stop="1">
        <div class="sheet-head"><h2>${fmtWeekday(d)}</h2><button class="btn small" data-act="closeday">✕</button></div>
        ${isHealDay(d) ? `<div class="banner heal-banner">💤 <b>Keiner hat trainiert</b> – der Schweinehund hat sich um ${num(healOn(d))} Lebenspunkte geheilt.</div>` : ''}
        ${rows}
        ${bf ? `<button class="btn primary big" data-act="backfill" data-arg="${d}">➕ Training nachtragen</button>
          <small class="hint">Vergessen einzutragen? Das geht bis zu ${BACKFILL_DAYS} Tage zurück – ohne Minispiel.</small>`
          : d < todayStr() ? `<small class="hint">Nachtragen geht nur für die letzten ${BACKFILL_DAYS} Tage der laufenden Jagd.</small>` : ''}
      </div>
    </div>`;
}
function calDayText(d) {
  const wd = new Date(d + 'T12:00').toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' });
  return wd + ': ' + team().map(p => {
    const icons = p.log.filter(e => e.kind === 'train' && e.day === d).flatMap(partsOf).map(x => actOf(x.id).icon);
    return `${p.name} ${icons.length ? [...new Set(icons)].join('') : (trainedOn(p, d) ? '✓' : '–')}`;
  }).join(' · ');
}
function calendarCard() {
  const start = state.season.start, end = seasonEnd(), last = addDays(end, -1), today = todayStr();
  const ps = team().map(p => [idOf(p), p]);
  const days = [];
  for (let d = weekKey(new Date(start + 'T12:00')); d < end || new Date(d + 'T12:00').getDay() !== 1; d = addDays(d, 1)) days.push(d);
  const head = `<div class="goal-top"><b>📅 Jagd ${state.season.no} · ${fmtDay(start)}–${fmtDay(last)}</b><small>noch ${daysLeft()} Tage</small></div>`;
  const inSeasonDays = p => { let n = 0; for (let d = start; d < end && d <= today; d = addDays(d, 1)) if (trainedOn(p, d)) n++; return n; };
  const passed = Math.max(1, Math.min(daysBetween(start, today) + 1, daysBetween(start, end)));
  return `<h2>Kalender</h2><section class="card cal">${head}
    <div class="cal-legend">${ps.map(([id, p]) => `<span><i style="background:${PCOLOR[id]}"></i>${esc(p.name)}</span>`).join('')}</div>
    <div class="cal-grid">${['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(w => `<b>${w}</b>`).join('')}
      ${days.map(d => {
        const out = d < start || d >= end;
        if (out) return '<span class="cal-day out"></span>';
        const dots = ps.filter(([, p]) => trainedOn(p, d)).map(([id]) => `<i style="background:${PCOLOR[id]}"></i>`).join('');
        const heal = isHealDay(d);
        return `<button class="cal-day ${d === today ? 'today' : ''} ${d > today ? 'future' : ''} ${d === last ? 'goal' : ''} ${heal ? 'heal' : ''}" ${d <= today ? `data-act="calday" data-arg="${d}"` : ''}>
          <small>${Number(d.slice(8))}</small><span class="dots">${heal ? `<em>+${num(healOn(d))}</em>` : d === last && !dots ? '🏁' : dots}</span></button>`;
      }).join('')}</div>
    <small class="hint">Ein Punkt = an dem Tag trainiert. <span class="heal-key">Rot</span> = keiner hat trainiert, der Schweinehund hat sich geheilt. Tag antippen zeigt Details. 🏁 = letzter Tag der Jagd.</small>
  </section>
  <h2>Trainingstage in dieser Jagd <small>von ${passed} Tagen</small></h2>
  <div class="card list">${ps.map(([id, p]) => `<div class="row who-link" data-act="stats" data-arg="${id}"><span class="cal-legend"><span><i style="background:${PCOLOR[id]}"></i>${esc(p.name)}</span></span><b>${inSeasonDays(p)}</b></div>`).join('')}</div>`;
}

// Wochenziel-Karte: Kästchen pro Training, Antippen trägt ein
function goalCard(p, res) {
  const total = goalTotal(p), done = goalDone(p);
  if (!total) {
    return `<section class="card goalcard"><div class="goal-top"><b>🎯 Dein Wochenziel</b></div>
      <p class="hint">Wie oft willst du pro Woche trainieren? Wer sein Ziel schafft, bekommt Bonus-Schaden und Top-Beute.</p>
      <button class="btn primary" data-act="goaledit">🎯 Wochenziel festlegen</button>
      <button class="btn small ghost" data-act="sheet" ${res ? 'disabled' : ''}>oder einfach Training eintragen</button></section>`;
  }
  const next = p.goalNext ? sum(Object.values(p.goalNext.goal)) : null;
  return `<section class="card goalcard ${goalReached(p) ? 'reached' : ''} ${goalFold ? 'folded' : ''}">
      <button class="goal-top goal-toggle" data-act="goalfold">
        <b>🎯 Wochenziel ${done}/${total}${goalReached(p) ? ' ✓ geschafft!' : ''}</b>
        <span class="goal-mini">${Array.from({ length: total }, (_, i) => `<i class="${i < done ? 'on' : ''}"></i>`).join('')}</span>
        <span class="chev">${goalFold ? '▾' : '▴'}</span></button>
      ${goalFold ? '' : `
      ${ACTIVITIES.map(a => {
        const g = goalOf(p, a.id), s = weekSessions(p, a.id);
        const boxes = Array.from({ length: Math.max(g, s) }, (_, i) => `<i class="${i < s ? 'on' : ''} ${i >= g ? 'extra' : ''}">${i < s ? '✓' : ''}</i>`).join('');
        return `<button class="goalrow" data-act="sheet" data-arg="${a.id}" ${res ? 'disabled' : ''}>
          <span class="act-icon">${a.icon}</span><span class="goal-name">${a.name}</span>
          <span class="boxes">${boxes || '<small>kein Ziel</small>'}</span><span class="go">＋</span></button>`;
      }).join('')}
      <div class="goal-foot"><small class="hint">Pro Tag zählt jede Art einmal fürs Ziel${goalReached(p) ? ' · alles darüber gibt weiter vollen Schaden' : ` · geschafft = +${num(GOAL_BONUS * total)} Bonus-Schaden`}${next !== null ? ` · 🔒 ab nächster Woche: ${next}×` : ''}</small>
        <button class="btn small ghost" data-act="goaledit">✏️ ändern</button></div>`}
      <button class="btn primary big train-btn" data-act="sheet" ${res ? 'disabled' : ''}>💪 Training eintragen</button>
    </section>`;
}

// Menü: Einheiten zusammenstellen, dann einmal bestätigen
function trainSheet() {
  const p = me();
  const total = sum(ACTIVITIES.map(a => (menu[a.id] || 0) * a.step));
  const hasPr = ACTIVITIES.some(a => a.pr && menu[a.id] > 0);
  return `
    <div class="overlay sheet-wrap" data-act="closesheet">
      <div class="ov-card sheet" data-stop="1">
        <div class="sheet-head"><h2>${backfillDay ? `Nachtragen: ${fmtWeekday(backfillDay)}` : 'Was hast du gemacht?'}</h2><button class="btn small" data-act="closesheet">✕</button></div>
        ${ACTIVITIES.map(a => actRow(p, a)).join('')}
        <div class="health-row"><small>Heute gut geschlafen, gesund gegessen, genug getrunken? Je +2 % Schaden</small>
          <div class="health">${HEALTH_NOW.map(h => { const done = healthToday(p).includes(h.id);
            return `<button class="chip-btn ${done ? 'done' : ''}" data-act="health" data-arg="${h.id}" ${done ? 'disabled' : ''}>${h.icon} ${h.short}${done ? ' ✓' : ''}</button>`; }).join('')}</div></div>
        <div class="prtoggle ${hasPr && prOn && !prToday(p) ? 'on' : ''} ${prToday(p) || !hasPr ? 'used' : ''}" ${hasPr && !prToday(p) ? 'data-act="pr"' : ''}>
          <span class="pr-box">${hasPr && prOn && !prToday(p) ? '✓' : ''}</span>
          <span class="bld-title"><b>🏆 Neuer Rekord / Gewicht erhöht</b><small>${prToday(p) ? 'Heute schon eingetragen – stark!' : hasPr ? 'Eine Kraft-Einheit zählt ×2,5 – 1× am Tag' : 'Nur mit Kraft – eine Einheit zählt dann ×2,5'}</small></span>
        </div>
        <button class="btn primary big" data-act="train" ${total ? '' : 'disabled'}>${total ? `✓ Eintragen · ${total} Min.` : 'Einheiten wählen'}</button>
      </div>
    </div>`;
}
function actRow(p, a) {
  const n = menu[a.id] || 0, left = unitsLeft(p, a);
  return `<div class="actrow menurow ${n ? 'picked' : ''} ${left < 1 ? 'is-done' : ''}">
    <span class="act-icon">${a.icon}</span>
    <span class="bld-title"><b>${a.name}</b><small>${left < 1 ? 'für heute geschafft ✓' : `je ${a.unit}`}</small></span>
    <span class="stepper"><button class="chip-btn" data-act="menustep" data-arg="${a.id}:-1" ${n ? '' : 'disabled'}>−</button>
      <b>${n}×</b><button class="chip-btn" data-act="menustep" data-arg="${a.id}:1" ${n < left ? '' : 'disabled'}>+</button></span>
  </div>`;
}

// Statistik eines Spielers (Tipp auf den Namen)
function weekMinutes(p, id, wk = weekKey()) {
  return sum(p.log.filter(e => e.kind === 'train' && e.day >= wk && e.day < addDays(wk, 7)).flatMap(partsOf).filter(x => x.id === id).map(x => x.min));
}
function statsSheet() {
  const p = state.players[statsOf], L = p.life, r = rankOf(L);
  const row = (k, v) => `<div class="row"><span>${k}</span><b>${v}</b></div>`;
  return `
    <div class="overlay sheet-wrap" data-act="closestats">
      <div class="ov-card sheet stats-sheet" data-stop="1">
        <div class="sheet-head"><h2>${esc(p.name)}${p === me() ? ' (du)' : ''}</h2><button class="btn small" data-act="closestats">✕</button></div>
        <p class="hint">${r.icon} ${r.name} · Level ${levelOf(p)} · 👑 ${L.crowns}× MVP</p>
        ${resting(p) ? `<div class="banner">💤 <b>Ruht gerade</b> – seit ${REST_DAYS} Tagen kein Training, zählt deshalb nicht für den Schweinehund. Ein Training, und ${p === me() ? 'du bist' : esc(p.name) + ' ist'} wieder dabei.</div>` : ''}
        <h3>Diese Woche</h3>
        <div class="list">${ACTIVITIES.map(a => row(`${a.icon} ${a.name}`, `${weekSessions(p, a.id)}× · ${weekMinutes(p, a.id)} Min.${goalOf(p, a.id) ? ` <small>(Ziel ${goalOf(p, a.id)}×)</small>` : ''}`)).join('')}
          ${row('⚔️ Schaden', num(weekDamage(p)))}</div>
        <h3>Diese Jagd</h3>
        <div class="list">${row('⚔️ Schaden', num(seasonDamage(p)))}${row('🎯 Wochenziel erfüllt', goalRate(p) === null ? '– <small>(noch keine Woche gewertet)</small>' : Math.round(goalRate(p) * 100) + ' %')}${row('🔥 Trainingstage (letzte 7 Tage)', comboDays(p))}</div>
        <h3>Insgesamt</h3>
        <div class="list">
          ${row('🏋️ Trainings', L.sessions)}${row('📅 Trainingstage', L.days)}${row('🏆 Rekorde', L.prs)}
          ${row('👹 Monster erledigt', L.monsters)}${row('📣 Angefeuert', L.cheers)}
          ${Object.entries(STATS).map(([k, st]) => row(`${st.icon} ${st.name}`, p.stats[k])).join('')}
        </div>
        <button class="btn small ghost reset-hero" data-act="resethero" data-arg="${statsOf}">♻️ Daten von ${esc(p.name)} zurücksetzen</button>
      </div>
    </div>`;
}

// Wochenziel bearbeiten
function goalEditor() {
  return `
    <div class="overlay sheet-wrap" data-act="goalcancel">
      <div class="ov-card sheet" data-stop="1">
        <div class="sheet-head"><h2>🎯 Dein Wochenziel</h2><button class="btn small" data-act="goalcancel">✕</button></div>
        <p class="hint">Wie oft pro Woche? Realistisch ist besser als zu viel – fürs geschaffte Ziel gibt's den Bonus. Erhöhen geht immer; Senken gilt erst ab nächster Woche, sobald du diese Woche trainiert hast.</p>
        ${ACTIVITIES.map(a => `<div class="actrow goaledit">
          <span class="act-icon">${a.icon}</span><span class="bld-title"><b>${a.name}</b><small>Tage pro Woche</small></span>
          <span class="stepper"><button class="chip-btn" data-act="goalstep" data-arg="${a.id}:-1">−</button>
            <b>${goalDraft[a.id] || 0}×</b><button class="chip-btn" data-act="goalstep" data-arg="${a.id}:1">+</button></span></div>`).join('')}
        <button class="btn primary big" data-act="goalsave">Ziel speichern (${sum(Object.values(goalDraft))}× pro Woche)</button>
      </div>
    </div>`;
}
// Minispiel: der Balken pendelt, Mitte treffen = perfekter Schlag
function swingOverlay() {
  return `
    <div class="overlay">
      <div class="ov-card swing">
        <div class="eyebrow">${pending.parts.map(x => `${x.a.icon} ${x.n}× ${x.a.name}`).join(' · ')}${pending.pr ? ' · 🏆 Rekord!' : ''}</div>
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
      <div class="loot"><span class="loot-icon">${g.icon}</span><b>${g.name}</b><small class="rar">${r.name} · Stufe ${it.lv || 1}</small><small>${itemBonusText(it)}</small>${it.upgrade ? '<small class="up">✓ angelegt</small>' : ''}</div>
    </div>`;
}

// kleine Symbole für die Erklärung im Treffer-Fenster
const MULT_ICON = { 'Ausrüstung': '🦾', 'Wuchtschlag': '🔨', 'Marathon': '🏁', 'Combo': '🔥', 'Neuer Rekord': '🏆', 'Kritisch': '💥', 'Schlag': '👊',
  'Angefeuert': '📣', 'Comeback': '💫', 'Gesund gelebt': '🥗', 'Erholung nötig': '😮‍💨' };
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
        ${h.mults && h.mults.length ? `<div class="why"><small>Das hat gezählt:</small><div class="mults">${h.mults.map(m => `<span class="mult ${m.f < 1 ? 'down' : ''}">${MULT_ICON[m.label] || ''} ${m.label} ${fmtMult(m.f)}</span>`).join('')}</div></div>` : ''}
        ${h.item ? lootCard(h.item) : '<p class="hint">🔐 Dein Spind war heute schon offen – morgen gibt es neue Beute.</p>'}
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
  const p = me(), lvl = levelOf(p), others = othersOf(p);
  return `
    <button class="btn small ghost back-btn" data-act="tab" data-arg="team">← zurück zum Team</button>
    <section class="card hero-card">
      ${heroSvg(p, 'big')}
      <div class="hero-side">
        <b class="hero-name">${esc(p.name)}</b>
        <small>${rankOf(p.life).icon} ${rankOf(p.life).name} · Level ${lvl}</small>
        <div class="meter"><i style="width:${(p.xp - xpFor(lvl)) / (xpFor(lvl + 1) - xpFor(lvl)) * 100}%"></i></div>
        ${Object.entries(STATS).map(([s, info]) => `<div class="stat"><span>${info.icon} ${info.name}</span><b>${num(p.stats[s])}</b></div>`).join('')}
      </div>
    </section>

    <h2>Ausrüstung <small>bessere Teile legt dein Held selbst an</small></h2>
    <div class="gear-slots">${Object.entries(SLOTS).map(([slot, label]) => {
      const it = p.inv.find(i => i.uid === p.equip[slot]);
      if (!it) return `<div class="card gslot empty"><span class="item-icon">❔</span><b>${label}</b><small>noch leer</small></div>`;
      const g = gearOf(it), r = rarityOf(it);
      return `<div class="card gslot" style="--rar:${r.color}"><span class="item-icon">${g.icon}</span><b>${g.name}</b><small class="rar">${r.name} · St. ${it.lv || 1}</small><small>${itemBonusText(it)}</small></div>`;
    }).join('')}</div>
`;
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
  const p = me(), other = sparOpp(p), others = othersOf(p);
  if (!other) return `<button class="btn small ghost back-btn" data-act="tab" data-arg="held">← zurück zum Helden</button><p class="hint">Noch niemand zum Sparren da – teile den Einladungslink unter „Mehr“.</p>`;
  if (duelOpen) return duelSetup(p, other);
  const fresh = freshReport && p.reports.find(r => r.id === freshReport);
  const L = p.life;
  return `
    <button class="btn small ghost back-btn" data-act="tab" data-arg="held">← zurück zum Helden</button>
    ${fresh ? reportCard(fresh, true) : ''}
    ${incomingBanner(p)}
    ${others.length > 1 ? `<div class="course-chips opp-pick"><small>Gegner:</small>${others.map(o => `<button class="chip-btn ${o === other ? 'on' : ''}" data-act="sparwith" data-arg="${idOf(o)}">${esc(o.name)}</button>`).join('')}</div>` : ''}
    <section class="card versus">
      <div class="vs-side">${heroSvg(p, 'mini')}<b>Du</b><small>Level ${levelOf(p)}</small></div>
      <div class="vs-mid">VS</div>
      <div class="vs-side">${heroSvg(other, 'mini')}<b>${esc(other.name)}</b><small>Level ${levelOf(other)}</small></div>
    </section>
    ${p.outgoing.length ? p.outgoing.map(o => `<section class="card waiting"><b>⏳ Warte auf ${esc(o.toName)}</b><br><small>wird spätestens in <b data-eta="${o.deadline}">${fmtDur(o.deadline - Date.now())}</b> automatisch ausgetragen</small></section>`).join('')
      : `<button class="btn primary big" data-act="duel" ${p.energy < 1 ? 'disabled' : ''}>🥊 ${esc(other.name)} herausfordern (1 ⚡)</button>`}
    <p class="hint">${p.energy ? `⚡ ${p.energy} Energie – ` : '⚡ Keine Energie – '}das erste Training des Tages lädt 1 ⚡. 3 Runden, jede Taktik schlägt eine andere. Wer gewinnt, bekommt seltene Beute.</p>
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
  return `<div class="stake">${esc(state.stake)} <b>Einsatz:</b> Überlebt er, zahlt, wer sein Wochenziel am deutlichsten verfehlt.
    ${sl ? `<small>Stand jetzt zahlt: <b>${esc(sl.payer.name)}</b> 😬</small>` : ''}</div>`;
}

/* ---------- Saison ---------- */

function viewSaison() {
  const players = team();
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
      <div class="row who-link ${x === me() ? 'me' : ''}" data-act="stats" data-arg="${idOf(x)}"><span class="rank">${['🥇', '🥈', '🥉'][i] || ''}</span>
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
      const c = e.course && byId(COURSES, e.course);
      const what = c ? `${c.icon} Kurs: ${c.name}` : e.parts ? partsOf(e).map(x => `${actOf(x.id).icon} ${x.n}× ${actOf(x.id).name}`).join(' · ') : `${actOf(e.id).icon} ${actOf(e.id).name}`;
      return `${what}${e.min ? ` · ${e.min} Min.` : ''} <span class="muted">−${num(e.dmg)}${e.pr ? ' 🏆' : ''}${e.crit ? ' 🎯' : ''}${e.added ? ` · 📅 nachgetragen für ${fmtDay(e.day)}` : ''}</span>`;
    }
    const h = byId(HEALTH, e.id) || { icon: '✓', name: 'Eintrag' };
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
    ${p.log.length && (p.log[0].day === todayStr() || p.log[0].added === todayStr()) ? '<button class="btn" data-act="undo">↩️ Letzten Eintrag rückgängig</button>' : ''}

    <h2>Einstellungen</h2>
    <div class="card list">
      <div class="row"><span>📖 So funktioniert's</span><button class="btn small" data-act="intro">Anleitung</button></div>
      ${ownIds().map(id => `<div class="row"><span>🧑 ${esc(state.players[id].name)}</span><button class="btn small" data-act="rename" data-arg="${id}">Umbenennen</button></div>`).join('')}
      ${online() ? `
        <div class="row"><span>${connected ? '🟢 Online verbunden' : '🟠 Gerade offline – wird nachgeholt'}</span></div>
        ${awayNow(me()) ? `<div class="row"><span>${AWAY[awayNow(me()).why].icon} Du bist ${AWAY[awayNow(me()).why].name} gemeldet</span><button class="btn small" data-act="endaway">Wieder da</button></div>`
          : '<div class="row"><span>🤒 Krank oder 🏖️ Urlaub?</span><span><button class="btn small" data-act="away" data-arg="krank">🤒 Krank</button> <button class="btn small" data-act="away" data-arg="urlaub">🏖️ Urlaub</button></span></div>'}
        <div class="row"><span>🔗 Einladungslink</span><button class="btn small" data-act="share">Teilen</button></div>
        <div class="row"><span>📱 Dieses Gerät abmelden</span><button class="btn small" data-act="leave">Abmelden</button></div>
        <div class="row"><span>♻️ Meine Daten zurücksetzen</span><button class="btn small" data-act="resetmine">Zurücksetzen</button></div>
        ${game.me === 'a' ? '<div class="row"><span>🗄️ Sicherung zurückholen <small>(tägliche Kopie, 7 Tage)</small></span><button class="btn small" data-act="restorebackup">Öffnen</button></div>' : ''}
        ${game.me === 'a' ? '<div class="row"><span>🗑️ Spiel für alle löschen <small>(nur Spiel-Ersteller)</small></span><button class="btn small danger" data-act="deletegame">Löschen</button></div>' : ''}`
      : '<div class="row"><span>📴 Nur auf diesem Gerät</span><button class="btn small" data-act="leave">Online spielen</button></div>'}
    </div>
    <button class="btn danger" data-act="reset">Spiel zurücksetzen</button>`;
}

/* ---------- Startbildschirm ---------- */

function viewSetup() {
  const nameField = '<input id="setup-name" class="field" maxlength="20" placeholder="Dein Name" autocomplete="nickname">';
  if (setupStep === 'invite') {
    return `<section class="card setup"><div class="setup-icon">🐷</div><h2>Die Jagd beginnt!</h2>
      <p>Schick deinen Trainingspartnern (bis zu 2) diesen Link – zusammen jagt ihr den inneren Schweinehund.</p>
      <div class="linkbox">${esc(inviteLink())}</div>
      <button class="btn primary" data-act="share">🔗 Link teilen</button>
      <button class="btn" data-act="setupdone">Los geht's 💪</button></section>`;
  }
  if (joinId) {
    if (!joinInfo) { loadJoinInfo(); return '<section class="card setup"><p>⏳ Lade Einladung …</p></section>'; }
    if (joinInfo.missing || joinInfo.error || !joinInfo.meta) {
      return `<section class="card setup"><div class="setup-icon">🤔</div><h2>Einladung nicht gefunden</h2>
        <p>${joinInfo.error ? 'Keine Verbindung – bitte mit Internet nochmal öffnen.' : 'Der Link ist ungültig oder das Spiel wurde gelöscht.'}</p>
        ${joinInfo.error ? '' : '<button class="btn" data-act="restorejoin">🗄️ Aus Sicherung zurückholen</button>'}</section>`;
    }
    const players = joinInfo.players || {};
    const taken = PIDS.filter(pid => players[pid] && players[pid].updatedAt);
    const free = PIDS.find(pid => !taken.includes(pid));
    return `<section class="card setup">${bossSvg(1, 1)}<h2>Hilf bei der Jagd!</h2>
      <p>${taken.map(pid => esc(players[pid].name)).join(' und ')} ${taken.length > 1 ? 'jagen den inneren Schweinehund – und brauchen dich.' : 'jagt den inneren Schweinehund – und braucht dich.'}</p>
      ${joinInfo.meta.stake ? `<div class="stake">${esc(joinInfo.meta.stake)} <b>Einsatz:</b> Überlebt er, zahlt, wer sein Wochenziel am deutlichsten verfehlt.</div>` : ''}
      <div class="slots">${PIDS.map((pid, i) => `<span class="${taken.includes(pid) ? 'on' : ''}">Platz ${i + 1}: <b>${taken.includes(pid) ? esc(players[pid].name) : 'frei'}</b></span>`).join('')}</div>
      ${free ? `${nameField}<button class="btn primary big" data-act="join" data-arg="${free}">Neu mitmachen</button>` : '<p class="hint">Das Team ist voll (3 Leute).</p>'}
      ${taken.length ? `<p class="hint">Du spielst schon mit und wechselst nur das Gerät?</p>
        ${taken.map(pid => `<button class="btn small ghost" data-act="join" data-arg="${pid}">Ich bin ${esc(players[pid].name)}</button>`).join('')}` : ''}</section>`;
  }
  return `<section class="card setup">
      ${bossSvg(1, 1)}
      <h2>Jagt den inneren Schweinehund!</h2>
      <p>Er liegt auf dem Sofa und lacht euch aus. Jedes Training ist ein Treffer – und an jedem faulen Tag heilt er sich. Schafft ihr ihn in einem Monat?</p>
      <div class="stake-pick"><b>😬 Euer Einsatz</b>
        <small>Überlebt der Schweinehund, zahlt, wer sein eigenes Wochenziel am deutlichsten verfehlt:</small>
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
  { pic: () => bossSvg(1, 1), title: 'In 30 Sekunden erklärt',
    body: `<ul class="intro-list">
        <li>🐷 <b>Gemeinsam</b> jagt ihr den inneren Schweinehund. In <b>einem Monat</b> muss er fallen.</li>
        <li>💪 Nach dem Gym: <b>Training eintragen</b> – das ist dein Treffer. An faulen Tagen heilt er sich.</li>
        <li>🎯 Leg dein <b>Wochenziel</b> fest. Wer es schafft, bekommt Bonus-Schaden und Top-Beute.</li>
        <li>😬 Überlebt er, zahlt den <b>Einsatz</b>, wer sein eigenes Ziel am deutlichsten verfehlt hat.</li>
      </ul>` },
  { pic: () => bossSvg(1, 1), title: 'Euer Gegner: der innere Schweinehund',
    body: `<p>Er liegt auf dem Sofa, futtert Chips und lacht euch aus. Ihr seid ein Team aus zwei bis vier Leuten – und ihr jagt ihn <b>gemeinsam</b>.</p>
      <ul class="intro-list">
        <li>🎯 <b>Ziel:</b> ${BOSS_HP.toLocaleString('de-DE')} Lebenspunkte zu zweit (je weitere Person +${(BOSS_HP / 2).toLocaleString('de-DE')}) in <b>einem Monat</b> runterprügeln. Das schafft, wer 3× pro Woche Kraft trainiert.</li>
        <li>💤 Wer ${REST_DAYS} Tage nicht trainiert, <b>ruht</b> und zählt nicht mehr – der Schweinehund schrumpft. Ein Training, und man ist wieder dabei.</li>
        <li>😴 An jedem Tag, an dem <b>keiner</b> trainiert, heilt er sich.</li>
        <li>🏆 Geschafft? Dann kommt Kapitel 2 – mit einem stärkeren Schweinehund.</li>
        <li>😬 Nicht geschafft? Dann zahlt, wer sein <b>eigenes Wochenziel</b> am deutlichsten verfehlt hat, den <b>Einsatz</b> – z. B. einen 🥙 Döner. So zählt Verlässlichkeit, nicht wer am stärksten ist.</li>
      </ul>` },
  { pic: () => '<div class="intro-icon">👊</div>', title: 'Jedes Training ist ein Treffer',
    body: `<ol class="intro-steps">
        <li>Leg dein <b>🎯 Wochenziel</b> fest, z. B. 3× Kraft und 2× Ausdauer. Schaffst du es, gibt es Bonus-Schaden.</li>
        <li>Nach dem Gym: <b>💪 Training eintragen</b>, Einheiten zusammenstellen (z. B. 6× Kraft à 5 Min. + 2× Ausdauer à 10 Min.) und einmal bestätigen.</li>
        <li><b>Zuschlagen:</b> Ein Balken pendelt – triff die Mitte für bis zu +30 % Schaden. Oder ohne Minispiel eintragen.</li>
        <li>Der Schweinehund steckt ein, seine Lebensleiste sinkt.</li>
      </ol>
      <p class="hint">Mehr Schaden gibt es für: 🏆 neuen Rekord (Gewicht gesteigert, 1× am Tag), 🔥 regelmäßiges Training (Combo), 🥗 gesund gelebt (Schlaf, Essen, Trinken), 📣 Anfeuern vom Partner.</p>` },
  { pic: () => '<div class="intro-icon">🎁</div>', title: 'Beute & dein Held',
    body: `<ul class="intro-list">
        <li>🔐 Beim ersten Training des Tages öffnet sich dein <b>Spind</b> mit zufälliger Ausrüstung – von gewöhnlich bis <b style="color:#f5b81c">legendär</b>. Je länger du dabei bist, desto höher die <b>Stufe</b> – und desto stärker die Teile.</li>
        <li>🦾 Bessere Teile legt dein Held automatisch an – sie machen dich stärker.</li>
        <li>💪 Training steigert Kraft, Ausdauer und Geist – das macht dich stärker.</li>
        <li>👹 Jede Woche taucht ein <b>Ausreden-Monster</b> auf – wer es erledigt, bekommt epische Beute.</li>
      </ul>` },
  { pic: () => '<div class="intro-icon">🤝</div>', title: 'Team & Monat',
    body: `<ul class="intro-list">
        <li>📣 <b>Anfeuern:</b> 3× pro Woche kannst du einem Mitspieler +25 % auf sein nächstes Training geben – am besten dem, der länger nicht da war.</li>
        <li>🤝 Jede Woche gibt es eine <b>Team-Aufgabe</b> – geschafft = Bonus für alle.</li>
        <li>🔥 Reagiere auf die Trainings der anderen. Wart ihr zusammen im Gym? Bestätigt es beide – <b>+10 %</b> für euch.</li>
        <li>🤒 Krank oder 🏖️ im Urlaub? Melde dich unter ☰ Mehr ab – dann zählst du nicht mit.</li>
        <li>📅 Am 1. jedes Monats startet automatisch die neue Jagd, mit Rückblick zum Teilen.</li>
        <li>👑 Wer pro Woche mehr Schaden macht, bekommt die <b>MVP-Krone</b>.</li>
        <li>🎁 Optional: Legt einen <b>Pakt</b> fest – eure echte Belohnung, wenn er fällt.</li>
      </ul>
      <p class="hint">Diese Anleitung findest du jederzeit wieder unter ☰ Mehr.</p>` },
];

function viewIntro() {
  const i = introPage, pg = INTRO[i], last = i === INTRO.length - 1;
  return `<section class="card setup intro">
      <div class="intro-pic">${pg.pic()}</div>
      <div class="eyebrow">${i === 0 ? "So funktioniert's" : `Details · ${i} / ${INTRO.length - 1}`}</div>
      <h2>${pg.title}</h2>
      <div class="intro-body">${pg.body}</div>
      ${i > 0 ? `<div class="intro-dots">${INTRO.slice(1).map((_, k) => `<i class="${k === i - 1 ? 'on' : ''}"></i>`).join('')}</div>` : ''}
      <div class="intro-nav">
        ${i > 0 ? '<button class="btn" data-act="introprev">← Zurück</button>' : '<button class="btn ghost" data-act="intronext">Alle Details</button>'}
        <button class="btn primary" data-act="${last || i === 0 ? 'introdone' : 'intronext'}">${last || i === 0 ? "Los geht's 💪" : 'Weiter →'}</button>
      </div>
    </section>`;
}

function viewMehr() {
  return `<button class="card held-entry" data-act="tab" data-arg="held"><span>🦸</span><b>Mein Held</b><small>Werte & Ausrüstung</small><span class="chev">›</span></button>` + (viewSaison() + viewProfil()).split(/(?=<h2>)/).map((part, i) => {
    const m = part.match(/^<h2>([\s\S]*?)<\/h2>([\s\S]*)$/);
    if (!m) return part;
    const key = 'f' + i, open = openFolds.has(key);
    return `<section class="fold ${open ? 'open' : ''}"><button class="fold-head" data-act="fold" data-arg="${key}"><h2>${m[1]}</h2><span class="chev">${open ? '▴' : '▾'}</span></button>${open ? `<div class="fold-body">${m[2]}</div>` : ''}</section>`;
  }).join('');
}
const VIEWS = { jagd: viewJagd, team: viewTeam, kalender: () => calendarCard(), held: viewHeld, sparring: viewSparring, mehr: viewMehr };

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
  const ov = document.getElementById('overlay');
  if (statsOf && !state.players[statsOf]) statsOf = null;
  const kind = pending ? 'swing' : hitShow ? 'hit' : reveal ? 'reveal' : sheetOpen ? 'menu' : goalOpen ? 'goal' : statsOf ? 'stats' : dayOpen ? 'day' : '';
  const html = pending ? swingOverlay() : hitShow ? hitOverlay() : reveal ? revealOverlay() : sheetOpen ? (backfillDay ? withDay(backfillDay, trainSheet) : trainSheet()) : goalOpen ? goalEditor() : statsOf ? statsSheet() : dayOpen ? daySheet() : '';
  const card = ov.querySelector('.ov-card');
  if ((kind === 'menu' || kind === 'goal' || kind === 'stats') && ov.dataset.kind === kind && card) {
    // Menü bleibt offen: nur den Inhalt austauschen, damit nichts flackert oder neu aufgeht
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    card.innerHTML = tmp.querySelector('.ov-card').innerHTML;
  } else ov.innerHTML = html;
  ov.dataset.kind = kind;
  document.body.classList.toggle('ov-open', !!(pending || hitShow || reveal || sheetOpen || goalOpen || statsOf || dayOpen));
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
