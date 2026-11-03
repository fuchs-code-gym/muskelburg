'use strict';

/* =========================================================
   Spielregeln – hier lässt sich alles bequem anpassen
   ========================================================= */

const RES = {
  holz:  { name: 'Holz',  icon: '🪵' },
  lehm:  { name: 'Lehm',  icon: '🧱' },
  eisen: { name: 'Eisen', icon: '⛓️' },
};

// Was ein Training im Gym im Spiel einbringt.
// Start: nur Milon-Zirkel (ca. 10 Geräte, ~10 Min., Gewicht an eigene Maximalleistung angepasst).
// Weitere Übungen später einfach hier ergänzen.
// light = Aufwärmen: kleiner Ertrag, zählt nicht als Durchgang, höchstens perDay-mal am Tag
const ACTIVITIES = [
  { id: 'warmup', name: 'Aufwärmen', unit: '10 Min. Crosstrainer, Rad oder Joggen', icon: '🚴',
    gives: { holz: 40, lehm: 30, eisen: 15 }, light: true, perDay: 2 },
  { id: 'milon', name: 'Milon-Zirkel', unit: '1 Durchgang · ca. 10 Min.', icon: '🔁',
    gives: { holz: 100, lehm: 70, eisen: 35 } },
];

// Hauptquelle je Rohstoff (für „Was fehlt noch?“)
const MAIN_SOURCE = { holz: 'milon', lehm: 'milon', eisen: 'milon' };

const START_RES = 50;      // Startvorrat je Rohstoff
const DAY_BONUS = 0.5;     // erster Eintrag des Tages: +50 %
const COST_FACTOR = 1.3;   // jede Stufe kostet 30 % mehr als die vorige
const BOOST_PER_LEVEL = 0.1;

// Kosten = base × 1,3^(aktuelle Stufe) → die ersten Stufen kosten nur ein Training
const BUILDINGS = [
  { id: 'haupthaus',   name: 'Haupthaus',  icon: '🏰', max: 20, base: { holz: 50, lehm: 30, eisen: 15 },
    desc: 'Herz des Dorfes. Kein Gebäude kann höher sein als das Haupthaus · jede Stufe baut 4 % schneller' },
  { id: 'holzfaeller', name: 'Holzfäller', icon: '🪓', max: 20, base: { holz: 30, lehm: 25, eisen: 10 },
    desc: '+10 % Holz pro Stufe' },
  { id: 'lehmgrube',   name: 'Lehmgrube',  icon: '⛏️', max: 20, base: { holz: 35, lehm: 15, eisen: 10 },
    desc: '+10 % Lehm pro Stufe' },
  { id: 'schmiede',    name: 'Schmiede',   icon: '⚒️', max: 20, base: { holz: 40, lehm: 25, eisen: 5 },
    desc: '+10 % Eisen pro Stufe' },
  { id: 'speicher',    name: 'Speicher',   icon: '🛖', max: 20, base: { holz: 40, lehm: 35, eisen: 10 },
    desc: 'Mehr Platz für Rohstoffe' },
  { id: 'wall',        name: 'Wall',       icon: '🛡️', max: 20, base: { holz: 20, lehm: 45, eisen: 15 },
    desc: '+8 % Verteidigung pro Stufe' },
  { id: 'kaserne',     name: 'Kaserne',    icon: '⚔️', max: 20, base: { holz: 60, lehm: 50, eisen: 40 },
    req: { haupthaus: 3 }, desc: 'Bildet Fußtruppen aus · jede Stufe macht sie 5 % billiger' },
  { id: 'stall',       name: 'Stall',      icon: '🐴', max: 20, base: { holz: 90, lehm: 70, eisen: 80 },
    req: { haupthaus: 5, kaserne: 3 }, desc: 'Bildet Reiter aus · jede Stufe macht sie 5 % billiger' },
  { id: 'zelt',        name: 'Feldherrenzelt', icon: '⛺', max: 1, base: { holz: 400, lehm: 300, eisen: 250 }, time: 30,
    req: { haupthaus: 6, kaserne: 4 }, desc: 'Schaltet Daueraufträge frei: Truppen plündern Ruinen und Bots automatisch immer wieder' },
  { id: 'statue',      name: 'Stahlstatue', icon: '🗿', max: 1, base: { holz: 2000, lehm: 1500, eisen: 1000 }, time: 240,
    req: { haupthaus: 10, speicher: 6 }, goal: true,
    desc: 'Saisonziel! Wer sie zuerst errichtet, gewinnt die Saison.' },
];
const BOOSTED_BY = { holz: 'holzfaeller', lehm: 'lehmgrube', eisen: 'schmiede' };

// Truppen: att = Angriff, def = Verteidigung, carry = Beute pro Einheit, speed = Minuten pro Kartenfeld
const UNITS = [
  { id: 'kaempfer', name: 'Kämpfer',      icon: '🗡️', at: 'kaserne', att: 10, def: 4,  carry: 40, speed: 6,
    cost: { holz: 30, lehm: 20, eisen: 25 }, desc: 'stark im Angriff' },
  { id: 'bogen',    name: 'Bogenschütze', icon: '🏹', at: 'kaserne', att: 4,  def: 11, carry: 15, speed: 6,
    cost: { holz: 40, lehm: 25, eisen: 15 }, desc: 'stark in der Verteidigung' },
  { id: 'reiter',   name: 'Reiter',       icon: '🏇', at: 'stall',   att: 18, def: 6,  carry: 80, speed: 3,
    cost: { holz: 70, lehm: 40, eisen: 60 }, desc: 'schnell, trägt viel Beute' },
  { id: 'ramme',    name: 'Rammbock',     icon: '🐏', at: 'kaserne', req: 5, att: 2, def: 1, carry: 0, speed: 10,
    cost: { holz: 150, lehm: 60, eisen: 80 }, desc: 'jeder senkt den Wall im Kampf um 1 Stufe, 2 überlebende reißen danach 1 Stufe ein' },
];
const MILITIA = 10;             // Grundverteidigung je Haupthaus-Stufe (Dorfbewohner)
const WALL_BONUS = 0.08;        // +8 % Verteidigung je Wall-Stufe
const BOT_DEF = 20;             // Bot-Verteidigung ≈ 20 × Haupthaus^1,3
const PLAYER_LOOT_SHARE = 0.3;  // höchstens 30 % des Vorrats können geplündert werden
const LOOT_REGEN_H = 12;        // nach so vielen Stunden ist ein geplündertes Dorf wieder voll

// Bauzeit in Minuten = 1 × 1,35^Stufe (Stufe 5: 4 Min., Stufe 10: 20 Min., Stufe 15: 1,5 Std., Stufe 20: 5 Std.)
const BUILD_BASE_MIN = 1;
const BUILD_TIME_FACTOR = 1.35;
const HQ_SPEEDUP = 0.96;        // jede Haupthaus-Stufe: Bauzeit × 0,96
// Training ist der Turbo: jeder Durchgang halbiert die Restbauzeit (mindestens −10 Min.)
const TRAIN_SPEEDUP_SHARE = 0.5;
const TRAIN_SPEEDUP_MIN = 10;

// Saison: Ziel ist die Stahlstatue, sonst gewinnt am Ende die meisten Punkte
const SEASON_WEEKS = 8;

// Wochenziel: so viele Trainingstage pro Woche öffnen die Wochentruhe
const WEEK_GOAL_DAYS = 2;
const WEEK_CHEST = { holz: 150, lehm: 110, eisen: 60 }; // + 25 % je Woche Serie, höchstens doppelt

// Ränge nach Durchgängen insgesamt – bleiben über alle Saisons, Bonus gilt für immer
const RANKS = [
  { min: 0,   icon: '🪵', name: 'Rekrut',            bonus: 0 },
  { min: 10,  icon: '🧱', name: 'Knappe',            bonus: 0.02 },
  { min: 25,  icon: '🪨', name: 'Krieger',           bonus: 0.04 },
  { min: 50,  icon: '⛓️', name: 'Eisenkrieger',      bonus: 0.06 },
  { min: 100, icon: '🛡️', name: 'Ritter',            bonus: 0.08 },
  { min: 200, icon: '⚔️', name: 'Stählerner Ritter', bonus: 0.10 },
  { min: 350, icon: '👑', name: 'Legende aus Stahl', bonus: 0.15 },
];

// Abzeichen – bleiben über alle Saisons
const BADGES = [
  { icon: '🌱', name: 'Erster Schritt',  desc: '1 Durchgang',            test: l => l.rounds >= 1 },
  { icon: '🔟', name: 'Zweistellig',     desc: '10 Durchgänge',          test: l => l.rounds >= 10 },
  { icon: '💪', name: 'Dranbleiber',     desc: '50 Durchgänge',          test: l => l.rounds >= 50 },
  { icon: '🦾', name: 'Hundert',         desc: '100 Durchgänge',         test: l => l.rounds >= 100 },
  { icon: '🏋️', name: 'Maschine',        desc: '250 Durchgänge',         test: l => l.rounds >= 250 },
  { icon: '📅', name: 'Stammgast',       desc: '30 Trainingstage',       test: l => l.days >= 30 },
  { icon: '🔥', name: 'Feuer',           desc: '4 Wochenziele in Folge', test: l => l.bestStreak >= 4 },
  { icon: '☄️', name: 'Unaufhaltsam',    desc: '12 Wochenziele in Folge', test: l => l.bestStreak >= 12 },
  { icon: '⚔️', name: 'Eroberer',        desc: 'ersten Kampf gewonnen',  test: l => l.raidsWon >= 1 },
  { icon: '🗿', name: 'Baumeister',      desc: 'Stahlstatue errichtet',  test: l => l.monuments >= 1 },
  { icon: '🏆', name: 'Champion',        desc: 'eine Saison gewonnen',   test: l => l.seasonsWon >= 1 },
];

// Bot-Dörfer wachsen jeden Tag von allein (gleiche Regeln wie ihr).
// aggr = Chance je 12-Stunden-Fenster, dass der Bot von sich aus angreift. Zurückschlagen tun alle.
// am/dm = Stärke im Angriff/in der Verteidigung, prefer = Lieblingsgebäude
const BOTS = [
  { id: 'mia',    name: 'Mini-Mia',          icon: '🐭', perDay: 50,  rest: 0.5,  aggr: 0,    am: 0.6, dm: 0.7, info: 'winzig, leichte Beute' },
  { id: 'fritz',  name: 'Faulpelz Fritz',    icon: '🦥', perDay: 75,  rest: 0.45, aggr: 0,    am: 0.8, dm: 0.9, info: 'gemütlich, greift nie von sich aus an' },
  { id: 'hanno',  name: 'Angsthase Hanno',   icon: '🐰', perDay: 90,  rest: 0.3,  aggr: 0,    am: 0.5, dm: 1.5, prefer: 'wall', info: 'versteckt sich hinter seinem Wall' },
  { id: 'trude',  name: 'Träumerin Trude',   icon: '🦄', perDay: 100, rest: 0.4,  aggr: 0.02, am: 0.9, dm: 1,   info: 'meist friedlich' },
  { id: 'gisela', name: 'Weise Gisela',      icon: '🦉', perDay: 120, rest: 0.2,  aggr: 0.03, am: 1,   dm: 1.2, prefer: 'speicher', info: 'plant langfristig' },
  { id: 'berta',  name: 'Festungs-Berta',    icon: '🐢', perDay: 140, rest: 0.2,  aggr: 0.02, am: 0.7, dm: 1.8, prefer: 'wall', info: 'fast uneinnehmbar' },
  { id: 'frieda', name: 'Fleißige Frieda',   icon: '🐝', perDay: 150, rest: 0.3,  aggr: 0.04, am: 1,   dm: 1,   info: 'trainiert fast jeden zweiten Tag' },
  { id: 'lotte',  name: 'Lotte Langarm',     icon: '🐙', perDay: 160, rest: 0.25, aggr: 0.07, am: 1.1, dm: 0.9, info: 'greift gern aus der Ferne an' },
  { id: 'rudi',   name: 'Raubritter Rudi',   icon: '🦊', perDay: 170, rest: 0.25, aggr: 0.16, am: 1.3, dm: 0.7, info: 'plündert, wo er kann' },
  { id: 'kuno',   name: 'Kuno Keiler',       icon: '🐗', perDay: 190, rest: 0.3,  aggr: 0.1,  am: 1.2, dm: 1,   info: 'stürmt los ohne nachzudenken' },
  { id: 'olaf',   name: 'Olaf der Bär',      icon: '🐻', perDay: 220, rest: 0.25, aggr: 0.06, am: 1.1, dm: 1.2, info: 'stark, aber träge' },
  { id: 'bruno',  name: 'Bruno Bulle',       icon: '🐂', perDay: 250, rest: 0.2,  aggr: 0.1,  am: 1.2, dm: 1.1, info: 'rennt alles über den Haufen' },
  { id: 'egon',   name: 'Eiserner Egon',     icon: '🦍', perDay: 280, rest: 0.15, aggr: 0.07, am: 1.1, dm: 1.3, info: 'lebt praktisch im Gym' },
  { id: 'horst',  name: 'Wolfs-Horst',       icon: '🐺', perDay: 300, rest: 0.1,  aggr: 0.13, am: 1.4, dm: 1,   info: 'der gefährlichste Bot der Welt' },
];
const BOT_SPLIT = { holz: 0.45, lehm: 0.35, eisen: 0.2 };
const BOT_ATT = 14;            // Bot-Angriff ≈ 14 × Haupthaus^1,3 × am
const BOT_CARRY = 3;           // Beute je Angriffspunkt
const BOT_SLOT_H = 12;         // alle 12 Std. entscheidet jeder Bot, ob er angreift
const NEWBIE_DAYS = 2;         // die ersten 2 Tage einer Saison greifen Bots nicht von sich aus an
const REVENGE_COOLDOWN_H = 12; // ein Bot schlägt höchstens alle 12 Std. zurück

// Fair bleiben, auch wenn einer viel mehr trainiert
const CATCHUP_PER_STEP = 0.1;  // +10 % je 10 % Punkte-Rückstand auf den anderen Spieler …
const CATCHUP_MAX = 0.6;       // … höchstens +60 %
const TIRED_FROM = 3;          // ab dem 3. Durchgang am Tag …
const TIRED_MALUS = 0.25;      // … 25 % weniger (Regeneration ist auch Training!)
const SHIELD_H = 12;           // nach einem verlorenen Kampf 12 Std. Schutzschild
const TEAM_GOAL_DAYS = 5;      // gemeinsam 5 Trainingstage pro Woche …
const TEAM_CHEST = { holz: 200, lehm: 150, eisen: 80 }; // … öffnen die Teamtruhe für beide
const RANK_RAMP_ROUNDS = 20;   // Rang-Bonus startet jede Saison bei 50 % und ist nach 20 Durchgängen voll

// Automatisierungen
const PASSIVE_SHARE = 0.02;    // jede Stufe Holzfäller/Lehmgrube/Schmiede: pro Tag 2 % eines Durchgangs von allein
const SECOND_SLOT_HQ = 10;     // ab Haupthaus 10: zweite Baustelle
const AUTO_RECRUIT_RANK = 25;  // ab Rang Krieger: überschüssige Rohstoffe werden zu Truppen
const AUTO_RECRUIT_FULL = 0.9; // sobald alles zu 90 % voll ist …
const AUTO_RECRUIT_KEEP = 0.7; // … wird alles über 70 % ausgebildet

// Weltkarte: 25 × 25 Felder, feste Plätze für alle Dörfer
const MAP_SIZE = 25;
const MAP_POS = {
  a: [12, 13], b: [14, 11],
  fritz: [9, 9], mia: [16, 15], hanno: [10, 16], frieda: [17, 8], gisela: [7, 13], trude: [18, 12],
  rudi: [5, 6], berta: [20, 18], olaf: [12, 4], kuno: [4, 19], bruno: [21, 6], lotte: [13, 21],
  egon: [2, 2], horst: [23, 23],
};
// Ruinen: Ziele zum Plündern, füllen sich von allein wieder auf. loot = Beute, wenn sie ganz voll sind
const RUINS = [
  { id: 'ruin1', name: 'Verlassener Hof', pos: [11, 10], pts: 12,  def: 10,  loot: { holz: 150, lehm: 100, eisen: 50 } },
  { id: 'ruin2', name: 'Morsche Scheune', pos: [8, 11],  pts: 16,  def: 25,  loot: { holz: 220, lehm: 160, eisen: 90 } },
  { id: 'ruin3', name: 'Alte Mühle',      pos: [15, 17], pts: 20,  def: 45,  loot: { holz: 300, lehm: 220, eisen: 130 } },
  { id: 'ruin4', name: 'Köhlerhütte',     pos: [19, 10], pts: 28,  def: 80,  loot: { holz: 450, lehm: 320, eisen: 200 } },
  { id: 'ruin5', name: 'Räuberlager',     pos: [6, 4],   pts: 35,  def: 130, loot: { holz: 600, lehm: 450, eisen: 300 } },
  { id: 'ruin6', name: 'Zerfallene Burg', pos: [23, 2],  pts: 60,  def: 250, loot: { holz: 1000, lehm: 750, eisen: 500 } },
  { id: 'ruin7', name: 'Drachenhöhle',    pos: [2, 23],  pts: 120, def: 500, loot: { holz: 1800, lehm: 1400, eisen: 1000 } },
];

// Position der Gebäude in der Dorfansicht (Zeichenfläche 360 × 240)
const SCENE_POS = {
  haupthaus: [180, 108], kaserne: [112, 46], stall: [248, 46],
  holzfaeller: [52, 100], lehmgrube: [308, 100],
  schmiede: [92, 168], speicher: [268, 168], wall: [180, 188], statue: [136, 132], zelt: [226, 136],
};

/* =========================================================
   Zustand & Speichern
   ========================================================= */

// ?geraet=2 in der Adresse = zweites, getrenntes Gerät im selben Browser (zum Testen)
const DEVICE = new URLSearchParams(location.search).get('geraet') || '';
const KEY = 'muskelburg-v1' + DEVICE;
const DAY_MS = 86400000;

function todayStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function daysBetween(a, b) {
  return Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / DAY_MS);
}

function newVillage(name) {
  const lv = {};
  for (const b of BUILDINGS) lv[b.id] = b.id === 'haupthaus' ? 1 : 0;
  const res = {};
  for (const r in RES) res[r] = START_RES;
  const units = {};
  for (const u of UNITS) units[u.id] = 0;
  return { name, res, lv, units, spent: 0, lastDay: null, log: [], missions: [], reports: [], queue: [], life: newLife(),
    rounds: 0, shieldUntil: 0, passiveAt: Date.now(), pacc: {}, autoRecruit: null,
    incoming: [],   // Angriffe von Bots auf dieses Dorf
    botSlot: null,  // zuletzt ausgewertetes 12-Stunden-Fenster
    revenge: {},    // Bot → letzter Gegenschlag
    teamClaimed: {}, credited: false, season: null, resetId: null, updatedAt: 0 };
}

// Lebenslange Werte – überstehen jeden Saison-Neustart
function newLife() {
  return { rounds: 0, days: 0, weeks: {}, streak: 0, bestStreak: 0, lastGoalWeek: null,
    raidsWon: 0, monuments: 0, seasonsWon: 0 };
}

function freshState() {
  return {
    v: 1,
    startDay: todayStr(), // Beginn der aktuellen Saison
    current: 'a',
    players: { a: newVillage('Spieler 1'), b: newVillage('Spieler 2') },
    raids: {}, // Ziel-ID → Zeitpunkt der letzten Plünderung
    season: { no: 1, weeks: SEASON_WEEKS, winner: null },
    hall: [],  // Ruhmeshalle: Sieger vergangener Saisons
    team: {},  // Wochen, in denen die Teamtruhe geöffnet wurde
    resetId: rid(), // ändert sich bei „Spiel zurücksetzen“
  };
}
function rid() { return Math.random().toString(36).slice(2, 12); }

// Fehlende Felder ergänzen – für alte Spielstände und für Daten aus der Online-Datenbank,
// die leere Listen und Objekte einfach weglässt
const asList = x => Array.isArray(x) ? x.filter(Boolean) : x ? Object.values(x) : [];
function normalizePlayer(p, name = '') {
  const fresh = newVillage(name);
  p = { ...fresh, ...p };
  for (const k of ['lv', 'res', 'units', 'life']) p[k] = { ...fresh[k], ...p[k] };
  p.life.weeks = p.life.weeks || {};
  for (const k of ['pacc', 'revenge', 'teamClaimed']) p[k] = p[k] || {};
  for (const k of ['log', 'missions', 'reports', 'incoming']) p[k] = asList(p[k]);
  p.queue = asList(p.queue);
  for (const e of p.log) { e.got = e.got || {}; e.cost = e.cost || {}; e.units = e.units || {}; }
  for (const r of p.reports) for (const k of ['lost', 'loot', 'sent', 'bonus']) r[k] = r[k] || {};
  for (const m of p.missions) for (const k of ['units', 'survivors', 'loot']) m[k] = m[k] || {};
  for (const q of p.queue) q.cost = q.cost || {};
  return p;
}
function normalizeMeta(s) {
  s.raids = s.raids || {};
  s.season = { no: 1, weeks: SEASON_WEEKS, winner: null, ...s.season };
  s.hall = asList(s.hall);
  s.team = s.team || {};
  s.resetId = s.resetId || rid();
  return s;
}

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.v === 1) {
      for (const id in s.players) s.players[id] = normalizePlayer(s.players[id]);
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
let mapSel = null;
const me = () => state.players[state.current];

/* =========================================================
   Online-Spiel: jedes Handy schreibt nur sein eigenes Dorf.
   Was den anderen betrifft (Angriffe), geht als Nachricht an dessen Handy.
   ========================================================= */

const GAME_KEY = 'muskelburg-game' + DEVICE; // { id, me } online oder { local: true }
let game = null;
try { game = JSON.parse(localStorage.getItem(GAME_KEY)); } catch (e) { /* kein Spiel */ }
let sync = null;          // Firebase-Anbindung (sync.js), sobald geladen
let connected = false;
const online = () => !!(game && game.id);
const ownIds = () => online() ? [game.me] : Object.keys(state.players);
const mine = () => ownIds().map(id => state.players[id]);
if (online()) state.current = game.me;
state.outbox = state.outbox || []; // Nachrichten, die noch ins Netz müssen

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

// gemeinsame Werte (Saison, Ruinen, Teamziel) ändern
function metaSet(patch) {
  if (!online()) return;
  state.outbox.push({ meta: patch });
  flushOutbox();
}

// Ereignis für ein anderes Dorf: lokal sofort anwenden oder ans andere Handy schicken
function sendEvent(pid, ev) {
  if (ownIds().includes(pid)) { applyEvent(state.players[pid], ev); return; }
  state.outbox.push({ to: pid, ev });
  flushOutbox();
}

function applyEvent(p, ev) {
  if (ev.kind !== 'hit') return;
  const lost = hitDefender(p, ev.defLoss);
  const loot = {};
  for (const r in ev.loot || {}) { loot[r] = Math.min(p.res[r], ev.loot[r]); p.res[r] -= loot[r]; }
  p.lv.wall = Math.max(0, p.lv.wall - (ev.wallDown || 0));
  p.shieldUntil = Math.max(p.shieldUntil, ev.shieldUntil || 0);
  p.reports.unshift({ t: ev.t, incoming: true, name: ev.name, win: !ev.attWin, lost, loot, wallDown: ev.wallDown || 0, shieldOn: ev.attWin });
  trimReports(p);
  if (p === me()) toast(ev.attWin ? `🔥 ${ev.name} hat dich überfallen!` : `🛡️ Angriff von ${ev.name} abgewehrt!`, true);
}

// Saisonwechsel oder Zurücksetzen auf das eigene Dorf anwenden
function reconcileOwn() {
  let changed = false;
  for (const id of ownIds()) {
    const p = state.players[id];
    if (p.resetId && p.resetId !== state.resetId) {
      state.players[id] = normalizePlayer({ name: p.name });
      changed = true;
    } else if (p.season && p.season !== state.season.no) {
      state.players[id] = normalizePlayer({ name: p.name, life: p.life, teamClaimed: p.teamClaimed });
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

// So sieht man das Dorf des anderen (aus einer alten Saison → frisches Dorf)
function otherFromRemote(data, name) {
  if (!data) return normalizePlayer({ name });
  const p = normalizePlayer(data);
  if (p.resetId && p.resetId !== state.resetId) return normalizePlayer({ name: p.name });
  if (p.season && p.season !== state.season.no) return normalizePlayer({ name: p.name, life: p.life });
  return p;
}

const syncHandlers = {
  connection(ok) { connected = ok; renderSyncDot(); },
  meta(m) {
    if (!m) return;
    Object.assign(state, normalizeMeta({ startDay: m.startDay, season: m.season, hall: m.hall, raids: m.raids, team: m.team, resetId: m.resetId }));
    botCache.clear();
    resolveAll();
    render();
  },
  player(pid, data, first) {
    if (pid === game.me) {
      // Dasselbe Dorf auf PC und Handy: der neuere Stand aus dem Netz gewinnt – auch während die App offen ist
      if (data && data.updatedAt > (state.players[pid].updatedAt || 0)) {
        state.players[pid] = normalizePlayer(data);
        try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignorieren */ }
        if (!first) toast('🔄 Dein Dorf wurde von deinem anderen Gerät aktualisiert');
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

function inviteLink() { return `${location.origin}${location.pathname}#spiel=${game.id}`; }

async function createGame() {
  const name = (document.getElementById('setup-name').value || '').trim().slice(0, 20);
  if (!name) { toast('Gib zuerst deinen Namen ein'); return; }
  if (!window.MB_SYNC) { toast('Keine Verbindung – bitte mit Internet versuchen'); return; }
  state = freshState();
  state.players.a.name = name;
  const id = rid() + rid();
  saveGame({ id, me: 'a' });
  state.current = 'a';
  state.outbox = [];
  reconcileOwn();
  await window.MB_SYNC.createGame(id, clean({ startDay: state.startDay, season: state.season, hall: [], raids: {}, team: {}, resetId: state.resetId }));
  save();
  startSync();
  setupStep = 'invite';
  render();
}

async function joinGame(pid) {
  const snap = joinInfo;
  const existing = snap && snap.players && snap.players[pid] && snap.players[pid].updatedAt ? snap.players[pid] : null;
  const name = (document.getElementById('setup-name').value || '').trim().slice(0, 20);
  if (!name && !existing) { toast('Gib zuerst deinen Namen ein'); return; }
  const id = joinId;
  saveGame({ id, me: pid });
  joinId = null;
  history.replaceState(null, '', location.pathname + location.search);
  state = freshState();
  state.current = pid;
  state.outbox = [];
  if (snap && snap.meta) Object.assign(state, normalizeMeta(snap.meta));
  // Gerät gewechselt → eigenes Dorf aus dem Netz übernehmen, sonst neues Dorf
  state.players[pid] = existing ? normalizePlayer(existing) : normalizePlayer({ name });
  for (const other of Object.keys(state.players)) {
    if (other !== pid) state.players[other] = otherFromRemote(snap && snap.players && snap.players[other], other === 'a' ? 'Spieler 1' : 'Spieler 2');
  }
  reconcileOwn();
  save();
  startSync();
  setupStep = null;
  toast(`⚔️ Willkommen in Muskelburg, ${me().name}!`, true);
  render();
}

function playLocal() {
  saveGame({ local: true });
  setupStep = null;
  render();
}

async function shareInvite() {
  const url = inviteLink();
  try {
    if (navigator.share) { await navigator.share({ title: 'Muskelburg', text: 'Spiel mit mir Muskelburg! 💪🏰', url }); return; }
  } catch (e) { /* abgebrochen */ }
  try { await navigator.clipboard.writeText(url); toast('🔗 Link kopiert'); } catch (e) { prompt('Diesen Link schicken:', url); }
}

function leaveGame() {
  if (!confirm('Dieses Handy vom Spiel abmelden? Dein Dorf bleibt online gespeichert – mit dem Einladungslink kommst du wieder rein.')) return;
  try { localStorage.removeItem(GAME_KEY); localStorage.removeItem(KEY); } catch (e) { /* ignorieren */ }
  location.reload();
}

let setupStep = null; // 'invite' nach dem Erstellen
let joinId = (location.hash.match(/spiel=([a-z0-9]+)/) || [])[1] || null;
if (joinId && game && game.id === joinId) { joinId = null; history.replaceState(null, '', location.pathname + location.search); }

/* =========================================================
   Regeln
   ========================================================= */

const sum = o => Object.values(o).reduce((a, b) => a + b, 0);
const byId = (list, id) => list.find(x => x.id === id);
const num = n => n.toLocaleString('de-DE');

function costOf(b, level) {
  const c = {};
  for (const r in b.base) c[r] = Math.max(5, Math.round(b.base[r] * COST_FACTOR ** level / 5) * 5);
  return c;
}
function capacity(v) { return Math.round(400 * 1.35 ** v.lv.speicher / 10) * 10; }
function mult(v, r) { return 1 + BOOST_PER_LEVEL * (v.lv[BOOSTED_BY[r]] || 0); }
function points(v) { return Math.floor(v.spent / 10); }

function check(v, b) {
  const level = v.lv[b.id];
  if (level >= b.max) return { ok: false, blocked: 'Maximalstufe erreicht' };
  for (const [id, n] of Object.entries(b.req || {})) {
    if (v.lv[id] < n) return { ok: false, blocked: `Benötigt ${byId(BUILDINGS, id).name} Stufe ${n}` };
  }
  if (b.id !== 'haupthaus' && level >= v.lv.haupthaus) {
    return { ok: false, blocked: `Erst Haupthaus auf Stufe ${level + 1} ausbauen` };
  }
  const cost = costOf(b, level);
  if (Object.values(cost).some(x => x > capacity(v))) {
    return { ok: false, cost, blocked: 'Speicher zu klein – erst Speicher ausbauen' };
  }
  const missing = {};
  for (const r in cost) if (v.res[r] < cost[r]) missing[r] = cost[r] - v.res[r];
  const busy = v.queue.length >= slots(v) || v.queue.some(q => q.id === b.id);
  return { ok: !Object.keys(missing).length && !busy, cost, missing, busy };
}

// Baustellen: eine, ab Haupthaus 10 zwei gleichzeitig
function slots(v) { return v.lv.haupthaus >= SECOND_SLOT_HQ ? 2 : 1; }
const inBuild = (v, id) => v.queue.find(q => q.id === id);

function buildMinutes(v, b) {
  if (b.time) return b.time;
  return BUILD_BASE_MIN * BUILD_TIME_FACTOR ** v.lv[b.id] * HQ_SPEEDUP ** (v.lv.haupthaus - 1);
}

/* ---------- Ränge, Wochenziel, Abzeichen ---------- */

function rankOf(life) { return [...RANKS].reverse().find(r => life.rounds >= r.min); }
function nextRank(life) { return RANKS.find(r => r.min > life.rounds); }
function earnedBadges(life) { return BADGES.filter(b => b.test(life)); }

function weekKey(d = new Date()) {
  const x = new Date(d);
  x.setDate(x.getDate() - (x.getDay() + 6) % 7); // Montag dieser Woche
  return todayStr(x);
}
function prevWeekKey() { const d = new Date(); d.setDate(d.getDate() - 7); return weekKey(d); }
function currentStreak(life) {
  return life.lastGoalWeek === weekKey() || life.lastGoalWeek === prevWeekKey() ? life.streak : 0;
}
function chestFor(streak) {
  const f = 1 + 0.25 * Math.min(4, Math.max(0, streak - 1));
  const c = {};
  for (const r in WEEK_CHEST) c[r] = Math.round(WEEK_CHEST[r] * f);
  return c;
}

// gemeinsame Trainingstage beider Spieler in einer Woche
function teamDays(wk = weekKey()) { return sum(Object.values(state.players).map(p => p.life.weeks[wk] || 0)); }

/* ---------- Saison ---------- */

function seasonEndDay() {
  const d = new Date(state.startDay + 'T12:00');
  d.setDate(d.getDate() + state.season.weeks * 7);
  return todayStr(d);
}
function daysLeft() { return daysBetween(todayStr(), seasonEndDay()); }
function idOf(v) { return Object.keys(state.players).find(id => state.players[id] === v); }

function standings() {
  return [
    ...Object.entries(state.players).map(([id, p]) => ({ icon: rankOf(p.life).icon, name: p.name, v: p, pid: id })),
    ...BOTS.map(bot => ({ icon: bot.icon, name: bot.name, v: simulateBot(bot, gameDay()), bot })),
  ].sort((x, y) => points(y.v) - points(x.v));
}

function declareWinner(name, how, pid) {
  state.season.winner = { name, how, pid: pid || null };
  metaSet({ 'season/winner': state.season.winner });
}

// Saisonsieg und Teamtruhe abholen (jedes Handy für sein eigenes Dorf)
function claimRewards(p) {
  let changed = false;
  const w = state.season.winner;
  if (w && w.pid === idOf(p) && !p.credited) { p.credited = true; p.life.seasonsWon++; changed = true; }
  const wk = weekKey();
  if (state.team[wk] && !p.teamClaimed[wk]) {
    p.teamClaimed[wk] = true;
    const got = addRes(p, TEAM_CHEST).got;
    if (p === me()) toast(`🤝 Teamziel geschafft! Teamtruhe: ${fmtRes(got, '+')}`, true);
    changed = true;
  }
  return changed;
}

function checkSeasonEnd() {
  if (state.season.winner || daysLeft() > 0) return false;
  const best = standings()[0];
  declareWinner(best.name, `hatte am Saisonende die meisten Punkte (${num(points(best.v))})`, best.pid);
  return true;
}

function applyBuild(v, b, cost) {
  for (const r in cost) v.res[r] -= cost[r];
  v.lv[b.id]++;
  v.spent += sum(cost);
}

// Fehlende Rohstoffe in Trainings umrechnen, z. B. „2× Milon-Zirkel“
function missingAsWorkouts(v, missing) {
  const need = {};
  for (const [r, m] of Object.entries(missing)) {
    const a = byId(ACTIVITIES, MAIN_SOURCE[r]);
    need[a.id] = Math.max(need[a.id] || 0, Math.ceil(m / (a.gives[r] * mult(v, r))));
  }
  return Object.entries(need).map(([id, n]) => `${n}× ${byId(ACTIVITIES, id).name}`);
}

function nextGoal(v) {
  return BUILDINGS
    .map(b => ({ b, c: check(v, b) }))
    .filter(o => !o.c.blocked)
    .sort((x, y) => sum(x.c.cost) - sum(y.c.cost))[0];
}

/* ---------- Bots: deterministisch aus Spieltag berechnet ---------- */

function hash01(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  h ^= h >>> 15; h = Math.imul(h, 2246822507); h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

const botCache = new Map();
function simulateBot(bot, days) {
  const key = `${state.startDay}:${state.season.no}:${bot.id}:${days}`;
  if (botCache.has(key)) return botCache.get(key);
  const v = newVillage(bot.name);
  const seed = bot.id + (state.season.no > 1 ? state.season.no : ''); // jede Saison etwas anders
  for (let d = 0; d < days; d++) {
    if (hash01(seed + ':' + d) < bot.rest) continue; // Ruhetag
    const amount = bot.perDay * (0.6 + 0.8 * hash01(seed + '#' + d));
    const cap = capacity(v);
    for (const r in RES) v.res[r] = Math.min(cap, v.res[r] + Math.round(amount * BOT_SPLIT[r] * mult(v, r)));
    for (let guard = 0; guard < 30; guard++) {
      const best = BUILDINGS.map(b => ({ b, c: check(v, b) }))
        .filter(o => o.c.ok && !o.b.goal && o.b.max > 1)
        .sort((x, y) => sum(x.c.cost) * (x.b.id === bot.prefer ? 0.5 : 1) - sum(y.c.cost) * (y.b.id === bot.prefer ? 0.5 : 1))[0];
      if (!best) break;
      applyBuild(v, best.b, best.c.cost);
    }
  }
  botCache.set(key, v);
  return v;
}
// Bot-Dorf zu einem bestimmten Zeitpunkt
const botAt = (bot, t = Date.now()) => simulateBot(bot, Math.max(0, daysBetween(state.startDay, todayStr(new Date(t)))));

/* ---------- Truppen & Kampf ---------- */

function unitCost(v, u) {
  const discount = 1 - 0.05 * Math.min(10, Math.max(0, v.lv[u.at] - 1));
  const c = {};
  for (const r in u.cost) c[r] = Math.round(u.cost[r] * discount);
  return c;
}
function wallMult(v, rams = 0) { return 1 + WALL_BONUS * Math.max(0, (v.lv.wall || 0) - rams); }
function posOf(id) { return MAP_POS[id] || byId(RUINS, id).pos; }
function distance(a, b) { const [p, q] = [posOf(a), posOf(b)]; return Math.hypot(p[0] - q[0], p[1] - q[1]); }
function gameDay() { return daysBetween(state.startDay, todayStr()); }
const H_MS = 3600e3;

// Kampfgeist: wer einen viel Schwächeren angreift, kämpft schwächer (bis −50 %)
function morale(attPts, defPts) {
  return Math.min(1, Math.max(0.5, 0.4 + 0.6 * (defPts + 50) / (attPts + 50)));
}
const shielded = (p, t = Date.now()) => p.shieldUntil > t;
function humanDef(p) { return MILITIA * p.lv.haupthaus + UNITS.reduce((s, u) => s + p.units[u.id] * u.def, 0); }
function trimReports(v) { v.reports.length = Math.min(v.reports.length, 30); }

// Verteidigung und mögliche Beute eines Ziels (Rammböcke senken den Wall-Bonus)
function targetOf(id, rams = 0, at = Date.now()) {
  const regen = Math.min(1, (at - (state.raids[id] || 0)) / (LOOT_REGEN_H * H_MS));
  const pool = {};
  const p = state.players[id];
  if (p) {
    for (const r in RES) pool[r] = Math.floor(p.res[r] * PLAYER_LOOT_SHARE);
    return { name: p.name, def: Math.round(humanDef(p) * wallMult(p, rams)), pool };
  }
  const bot = byId(BOTS, id);
  if (bot) {
    const v = botAt(bot, at);
    for (const r in RES) pool[r] = Math.floor(v.res[r] * 0.4 * regen);
    return { name: bot.name, def: Math.round(BOT_DEF * v.lv.haupthaus ** 1.3 * bot.dm * wallMult(v, rams)), pool };
  }
  const ruin = byId(RUINS, id);
  for (const r in ruin.loot) pool[r] = Math.floor(ruin.loot[r] * regen);
  return { name: ruin.name, def: ruin.def, pool };
}

function lootFrom(pool, carry) {
  const total = sum(pool);
  const ratio = total ? Math.min(1, carry / total) : 0;
  const loot = {};
  for (const r in pool) loot[r] = Math.floor(pool[r] * ratio);
  return loot;
}

// Verluste der Verteidiger; wer verliert, behält bei knappen Kämpfen noch einen Teil
function hitDefender(p, defLoss) {
  const lost = {};
  for (const u of UNITS) {
    const n = p.units[u.id];
    p.units[u.id] = Math.round(n * (1 - Math.min(1, defLoss)));
    if (n - p.units[u.id]) lost[u.id] = n - p.units[u.id];
  }
  return lost;
}

function battle(v, m) {
  const defender = state.players[m.target];
  m.done = true;
  if (defender && shielded(defender, m.arrive)) { // Schutzschild: Truppen kehren um
    m.survivors = { ...m.units };
    m.loot = {};
    v.reports.unshift({ t: m.arrive, name: defender.name, shield: true, sent: m.units, lost: {}, loot: {} });
    trimReports(v);
    if (v === me()) toast(`🛡️ ${defender.name} steht unter Schutzschild – Truppen kehren um`, true);
    return;
  }
  const t = targetOf(m.target, m.units.ramme || 0, m.arrive);
  const mor = defender ? morale(points(v), points(defender)) : 1;
  const att = Math.max(1, Math.round(UNITS.reduce((s, u) => s + (m.units[u.id] || 0) * u.att, 0) * mor));
  const win = att > t.def;
  // klare Überlegenheit = wenig Verluste (doppelt so stark → ca. 15 % Verlust)
  const attLoss = win ? 0.6 * (t.def / att) ** 2 : 1;
  const defLoss = win ? 1 - 0.5 * t.def / att : 0.6 * (att / t.def) ** 2;

  const survivors = {}, lost = {};
  for (const [id, n] of Object.entries(m.units)) {
    survivors[id] = Math.round(n * (1 - attLoss));
    lost[id] = n - survivors[id];
  }
  const loot = win ? lootFrom(t.pool, UNITS.reduce((s, u) => s + (survivors[u.id] || 0) * u.carry, 0)) : {};

  let wallDown = 0;
  if (win) v.life.raidsWon++;
  if (defender) {
    if (win) wallDown = Math.min(defender.lv.wall, Math.floor((survivors.ramme || 0) / 2));
    sendEvent(m.target, { kind: 'hit', t: m.arrive, name: v.name, attWin: win, defLoss, loot, wallDown,
      shieldUntil: win ? m.arrive + SHIELD_H * H_MS : 0 });
  } else {
    if (win) { state.raids[m.target] = m.arrive; metaSet({ ['raids/' + m.target]: m.arrive }); }
    const bot = byId(BOTS, m.target);
    if (bot) revenge(bot, idOf(v), m.arrive); // Bots schlagen zurück
  }

  m.survivors = survivors;
  m.loot = loot;
  if (!sum(survivors)) m.back = m.arrive; // niemand kehrt zurück
  v.reports.unshift({ t: m.arrive, name: t.name, win, att, def: t.def, sent: m.units, lost, loot, wallDown, morale: mor < 1 ? mor : 0 });
  trimReports(v);
  if (v === me()) toast(win ? `⚔️ Sieg gegen ${t.name}!` : `💀 Niederlage gegen ${t.name}`, true);
}

function launchMission(v, targetId, units, start, auto) {
  const travel = travelTime(units, distance(idOf(v), targetId));
  for (const id in units) v.units[id] -= units[id];
  const name = targetOf(targetId).name;
  v.missions.push({ target: targetId, name, units, start, arrive: start + travel, back: start + 2 * travel, auto: !!auto });
  return name;
}

// Ankünfte und Rückkehr abarbeiten; true, wenn sich etwas geändert hat
function resolveMissions() {
  const now = Date.now();
  let changed = false;
  // mehrere Durchläufe, damit Daueraufträge auch nach langer Pause korrekt weiterlaufen
  for (let pass = 0; pass < 100; pass++) {
    let any = false;
    for (const v of mine()) {
      for (const m of v.missions.filter(m => !m.done && now >= m.arrive).sort((a, b) => a.arrive - b.arrive)) {
        battle(v, m);
        any = true;
      }
      const back = v.missions.filter(m => m.done && now >= m.back);
      v.missions = v.missions.filter(m => !back.includes(m));
      for (const m of back) {
        for (const id in m.survivors) v.units[id] += m.survivors[id];
        const cap = capacity(v);
        for (const r in m.loot) v.res[r] = Math.min(cap, v.res[r] + m.loot[r]);
        any = true;
        // Dauerauftrag: gleich wieder losschicken
        if (m.auto && !m.stop && v.lv.zelt) {
          const units = {};
          for (const id in m.units) { const n = Math.min(m.units[id], v.units[id]); if (n) units[id] = n; }
          if (sum(units)) { launchMission(v, m.target, units, m.back, true); continue; }
        }
        if (v === me() && sum(m.survivors) && now - m.back < 60e3) toast(`🏇 Truppen zurück ${fmtRes(m.loot, '+')}`, true);
      }
    }
    if (!any) break;
    changed = true;
  }
  return changed;
}

// Fertige Baustellen abschließen
function finishBuilds() {
  const now = Date.now();
  let changed = false;
  for (const v of mine()) {
    for (const q of v.queue.filter(q => now >= q.end)) {
      const b = byId(BUILDINGS, q.id);
      v.lv[q.id] = q.level;
      v.spent += sum(q.cost);
      v.queue = v.queue.filter(x => x !== q);
      changed = true;
      if (v === me()) toast(`🎉 ${b.name} ist jetzt Stufe ${q.level}!`, true);
      if (b.goal) {
        v.life.monuments++;
        if (!state.season.winner) declareWinner(v.name, 'hat als Erste/r die Stahlstatue errichtet', idOf(v));
      }
    }
  }
  return changed;
}

/* ---------- Bots greifen an ---------- */

function slotStart(k) { return new Date(state.startDay + 'T00:00').getTime() + k * BOT_SLOT_H * H_MS; }
function currentSlot(t = Date.now()) { return Math.floor((t - slotStart(0)) / (BOT_SLOT_H * H_MS)); }
function botTravel(bot, pid) { return Math.round(distance(bot.id, pid) * 5 * 60e3); } // 5 Min. je Feld

// Jedes 12-Stunden-Fenster: angriffslustige Bots suchen sich ein Ziel – am liebsten den Führenden
function scheduleBotAttacks(p) {
  const cur = currentSlot();
  if (p.botSlot === null) { p.botSlot = cur; return true; }
  if (cur <= p.botSlot) return false;
  const pid = idOf(p);
  // Anteil an den Angriffen: wer mehr Punkte hat, wird öfter angegriffen
  const weight = x => (points(x) + 20) ** 1.5;
  const share = weight(p) / sum(Object.values(state.players).map(weight));
  for (let k = p.botSlot + 1; k <= cur; k++) {
    const t0 = slotStart(k);
    if (daysBetween(state.startDay, todayStr(new Date(t0))) < NEWBIE_DAYS || points(p) < 30) continue;
    for (const bot of BOTS) {
      if (hash01(`atk:${state.season.no}:${bot.id}:${k}:${pid}`) >= bot.aggr * share) continue;
      if (p.incoming.length >= 2 || p.incoming.some(a => a.bot === bot.id)) continue;
      const launch = t0 + hash01(`when:${bot.id}:${k}:${pid}`) * BOT_SLOT_H * H_MS;
      p.incoming.push({ bot: bot.id, target: pid, kind: 'raid', launch, arrive: launch + botTravel(bot, pid) });
    }
  }
  p.botSlot = cur;
  return true;
}

// Gegenschlag, wenn jemand ein Bot-Dorf angreift
function revenge(bot, pid, at) {
  const p = state.players[pid];
  if (at - (p.revenge[bot.id] || 0) < REVENGE_COOLDOWN_H * H_MS) return;
  p.revenge[bot.id] = at;
  const launch = at + (30 + 90 * Math.random()) * 60e3;
  p.incoming.push({ bot: bot.id, target: pid, kind: 'revenge', launch, arrive: launch + botTravel(bot, pid) });
}

function botPower(bot, p, at) {
  const bv = botAt(bot, at);
  const mor = morale(points(bv), points(p));
  return { att: Math.round(BOT_ATT * bv.lv.haupthaus ** 1.3 * bot.am * mor), mor };
}

function botBattle(a) {
  const bot = byId(BOTS, a.bot);
  const p = state.players[a.target];
  const base = { t: a.arrive, incoming: true, name: bot.name, revenge: a.kind === 'revenge', lost: {}, loot: {} };
  if (shielded(p, a.arrive)) {
    p.reports.unshift({ ...base, win: true, shield: true });
  } else {
    const { att } = botPower(bot, p, a.arrive);
    const def = Math.round(humanDef(p) * wallMult(p));
    const botWins = att > def;
    const lost = hitDefender(p, botWins ? 1 - 0.5 * def / att : 0.6 * (att / def) ** 2);
    let loot = {}, bonus = {};
    if (botWins) {
      const pool = {};
      for (const r in RES) pool[r] = Math.floor(p.res[r] * PLAYER_LOOT_SHARE);
      loot = lootFrom(pool, att * BOT_CARRY);
      for (const r in loot) p.res[r] -= loot[r];
      p.shieldUntil = a.arrive + SHIELD_H * H_MS;
    } else {
      // abgewehrt: die Angreifer lassen Beute zurück
      for (const r in RES) bonus[r] = Math.round(att * 1.5 * BOT_SPLIT[r]);
      bonus = addRes(p, bonus).got;
      p.life.raidsWon++;
    }
    p.reports.unshift({ ...base, win: !botWins, att, def, lost, loot, bonus, shieldOn: botWins });
    if (p === me()) toast(botWins ? `🔥 ${bot.name} hat dich überfallen!` : `🛡️ Angriff von ${bot.name} abgewehrt!`, true);
  }
  trimReports(p);
}

function resolveIncoming(p) {
  const now = Date.now();
  const due = p.incoming.filter(a => now >= a.arrive).sort((x, y) => x.arrive - y.arrive);
  if (!due.length) return false;
  p.incoming = p.incoming.filter(a => !due.includes(a));
  due.forEach(botBattle);
  return true;
}
// Angriffe, die schon unterwegs (und damit sichtbar) sind
const incomingFor = pid => state.players[pid].incoming.filter(a => a.launch <= Date.now()).sort((x, y) => x.arrive - y.arrive);

/* ---------- Automatisierungen ---------- */

// Rohstoffgebäude liefern ein wenig von allein – Training bleibt der Turbo
function passivePerDay(v, r) { return byId(ACTIVITIES, 'milon').gives[r] * PASSIVE_SHARE * (v.lv[BOOSTED_BY[r]] || 0); }
function passive(v, now = Date.now()) {
  const dt = (now - v.passiveAt) / DAY_MS;
  v.passiveAt = now;
  if (dt <= 0) return false;
  const cap = capacity(v);
  let changed = false;
  for (const r in RES) {
    const x = (v.pacc[r] || 0) + passivePerDay(v, r) * dt;
    const whole = Math.floor(x);
    v.pacc[r] = x - whole;
    if (whole && v.res[r] < cap) { v.res[r] = Math.min(cap, v.res[r] + whole); changed = true; }
  }
  return changed;
}

// Überschüssige Rohstoffe automatisch zu Truppen machen
function autoRecruit(v) {
  const u = v.autoRecruit && byId(UNITS, v.autoRecruit);
  if (!u || v.life.rounds < AUTO_RECRUIT_RANK || v.lv[u.at] < (u.req || 1)) return false;
  const cap = capacity(v);
  if (Object.keys(RES).some(r => v.res[r] < cap * AUTO_RECRUIT_FULL)) return false;
  const c = unitCost(v, u);
  const n = Math.min(...Object.keys(c).map(r => Math.floor((v.res[r] - cap * AUTO_RECRUIT_KEEP) / c[r])));
  if (n < 1) return false;
  const total = {};
  for (const r in c) { total[r] = c[r] * n; v.res[r] -= total[r]; }
  v.units[u.id] += n;
  v.log.unshift({ t: Date.now(), kind: 'autorecruit', id: u.id, n, cost: total });
  v.log.length = Math.min(v.log.length, 200);
  if (v === me()) toast(`⚙️ Speicher voll – automatisch ${n}× ${u.name} ausgebildet`);
  return true;
}

// Alles abarbeiten, was inzwischen passiert ist
function resolveAll() {
  if (!game) return false; // noch kein Spiel gewählt
  let changed = reconcileOwn();
  for (const v of mine()) {
    changed = passive(v) || changed;
    changed = claimRewards(v) || changed;
  }
  changed = finishBuilds() || changed;
  changed = resolveMissions() || changed;
  for (const v of mine()) {
    changed = scheduleBotAttacks(v) || changed;
    changed = resolveIncoming(v) || changed;
    changed = autoRecruit(v) || changed;
  }
  changed = checkSeasonEnd() || changed;
  if (changed) save();
  return changed;
}

/* =========================================================
   Aktionen
   ========================================================= */

// Rang-Bonus wächst jede Saison mit den Durchgängen von 50 % auf 100 %
function rankBonus(v) { return rankOf(v.life).bonus * Math.min(1, 0.5 + 0.5 * v.rounds / RANK_RAMP_ROUNDS); }
// Aufhol-Bonus: wer hinter dem anderen Spieler liegt, bekommt mehr
function catchUp(v) {
  const mine = points(v);
  const lead = Math.max(...Object.values(state.players).filter(p => p !== v).map(points));
  if (lead < 30 || mine >= lead) return 0;
  return Math.min(CATCHUP_MAX, Math.floor((lead - mine) / lead * 10 + 1e-9) * CATCHUP_PER_STEP);
}
function doneToday(v, id) { return v.log.filter(e => e.kind === 'train' && e.id === id && todayStr(new Date(e.t)) === todayStr()).length; }
function roundsToday(v) { return doneToday(v, 'milon'); }
const tired = v => roundsToday(v) + 1 >= TIRED_FROM;

// Ertrag eines Trainings: Gebäude × Tagesbonus × Rang × Aufholen × Müdigkeit
// (Aufwärmen: kein Tagesbonus, keine Müdigkeit)
function gainOf(v, a, bonus) {
  const g = {};
  const f = (bonus && !a.light ? 1 + DAY_BONUS : 1) * (1 + rankBonus(v)) * (1 + catchUp(v)) * (tired(v) && !a.light ? 1 - TIRED_MALUS : 1);
  for (const r in a.gives) g[r] = Math.round(a.gives[r] * mult(v, r) * f);
  return g;
}

function addRes(v, amounts) {
  const cap = capacity(v);
  const got = {};
  let capped = false;
  for (const r in amounts) {
    got[r] = Math.max(0, Math.min(amounts[r], cap - v.res[r]));
    if (got[r] < amounts[r]) capped = true;
    v.res[r] += got[r];
  }
  return { got, capped };
}

function train(actId) {
  const v = me();
  const L = v.life;
  const a = byId(ACTIVITIES, actId);
  if (a.perDay && doneToday(v, a.id) >= a.perDay) return;
  const bonus = !a.light && v.lastDay !== todayStr(); // Tagesbonus gibt's auf den ersten Durchgang
  const rankBefore = rankOf(L);
  const badgesBefore = earnedBadges(L).length;
  const { got, capped } = addRes(v, gainOf(v, a, bonus));
  const entry = { t: Date.now(), kind: 'train', id: actId, got, bonus, prevDay: v.lastDay, wk: weekKey() };

  // Training ist der Turbo für alle Baustellen (Aufwärmen: −10 Min.)
  if (v.queue.length) {
    entry.sped = {};
    for (const q of v.queue) {
      const left = q.end - Date.now();
      const want = a.light ? TRAIN_SPEEDUP_MIN * 60e3 : Math.max(left * TRAIN_SPEEDUP_SHARE, TRAIN_SPEEDUP_MIN * 60e3);
      const ms = Math.max(0, Math.min(left, want));
      entry.sped[q.id] = ms;
      q.end -= ms;
    }
  }

  // Lebenslange Werte & Wochenziel (nur Milon-Durchgänge zählen für Rang und Trainingstage)
  if (!a.light) { L.rounds++; v.rounds++; }
  if (bonus) {
    L.days++;
    L.weeks[entry.wk] = (L.weeks[entry.wk] || 0) + 1;
    if (L.weeks[entry.wk] === WEEK_GOAL_DAYS) {
      const prev = { streak: L.streak, bestStreak: L.bestStreak, lastGoalWeek: L.lastGoalWeek };
      L.streak = L.lastGoalWeek === prevWeekKey() ? L.streak + 1 : 1;
      L.bestStreak = Math.max(L.bestStreak, L.streak);
      L.lastGoalWeek = entry.wk;
      entry.chest = { prev, loot: addRes(v, chestFor(L.streak)).got };
    }
    // Teamtruhe: gemeinsam genug Trainingstage → beide holen sie sich ab (claimRewards)
    if (!state.team[entry.wk] && teamDays(entry.wk) >= TEAM_GOAL_DAYS) {
      state.team[entry.wk] = true;
      metaSet({ ['team/' + entry.wk]: true });
    }
  }

  v.log.unshift(entry);
  v.log.length = Math.min(v.log.length, 200);
  if (!a.light) v.lastDay = todayStr();
  resolveAll();
  save();

  toast(`${a.icon} ${fmtRes(got, '+')}${bonus ? ' · Tagesbonus!' : ''}${capped ? ' · Speicher voll!' : ''}`);
  if (entry.sped) toast(`⚡ Baustelle ${fmtDur(Math.max(...Object.values(entry.sped)))} schneller!`);
  if (entry.chest) toast(`🎁 Wochenziel geschafft! Truhe: ${fmtRes(entry.chest.loot, '+')}`, true);
  const rank = rankOf(L);
  if (rank !== rankBefore) toast(`${rank.icon} Neuer Rang: ${rank.name} – für immer +${Math.round(rank.bonus * 100)} % Rohstoffe!`, true);
  const badges = earnedBadges(L);
  if (badges.length > badgesBefore) { const b = badges[badges.length - 1]; toast(`${b.icon} Abzeichen: ${b.name}!`, true); }
  render();
}

function build(bid) {
  const v = me();
  const b = byId(BUILDINGS, bid);
  const c = check(v, b);
  if (!c.ok) return;
  const now = Date.now();
  for (const r in c.cost) v.res[r] -= c.cost[r];
  const level = v.lv[bid] + 1;
  const q = { id: bid, level, cost: c.cost, start: now, end: now + buildMinutes(v, b) * 60e3 };
  v.queue.push(q);
  v.log.unshift({ t: now, kind: 'build', id: bid, cost: c.cost, level });
  v.log.length = Math.min(v.log.length, 200);
  save();
  toast(`🔨 ${b.name} Stufe ${level} im Bau – fertig in ${fmtDur(q.end - now)}`);
  render();
}

function newSeason() {
  if (!state.season.winner) return;
  if (!confirm('Neue Saison starten? Alle Dörfer beginnen wieder bei null. Ränge, Abzeichen und Ruhmeshalle bleiben.')) return;
  const w = state.season.winner;
  state.hall.unshift({ no: state.season.no, name: w.name, how: w.how, day: todayStr() });
  state.season = { no: state.season.no + 1, weeks: SEASON_WEEKS, winner: null };
  state.startDay = todayStr();
  state.raids = {};
  metaSet({ hall: state.hall, season: state.season, startDay: state.startDay, raids: null });
  reconcileOwn(); // das andere Handy zieht nach, sobald es die neue Saison sieht
  if (!online()) for (const id in state.players) state.players[id].season = state.season.no;
  save();
  toast(`⚔️ Saison ${state.season.no} beginnt – viel Erfolg!`, true);
  render();
}

function recruit(arg) {
  const [uid, count] = arg.split(':');
  const n = Number(count);
  const v = me();
  const u = byId(UNITS, uid);
  const c = unitCost(v, u);
  if (v.lv[u.at] < (u.req || 1) || Object.keys(c).some(r => v.res[r] < c[r] * n)) return;
  const total = {};
  for (const r in c) { total[r] = c[r] * n; v.res[r] -= total[r]; }
  v.units[uid] += n;
  v.log.unshift({ t: Date.now(), kind: 'recruit', id: uid, n, cost: total });
  v.log.length = Math.min(v.log.length, 200);
  save();
  toast(`${u.icon} ${n}× ${u.name} ausgebildet`);
  render();
}

function sendAll(uid) {
  const el = document.getElementById('send-' + uid);
  if (el) { el.value = me().units[uid]; updateAttackPreview(); }
}

function readSendInputs() {
  const v = me();
  const units = {};
  for (const u of UNITS) {
    const el = document.getElementById('send-' + u.id);
    const n = el ? Math.max(0, Math.min(v.units[u.id], parseInt(el.value, 10) || 0)) : 0;
    if (n) units[u.id] = n;
  }
  return units;
}

function travelTime(units, dist) {
  const speed = Math.max(...Object.keys(units).map(id => byId(UNITS, id).speed));
  return Math.round(dist * speed * 60e3);
}

function attack(targetId) {
  const v = me();
  const units = readSendInputs();
  if (!sum(units)) { toast('Wähle zuerst Truppen aus'); return; }
  const human = state.players[targetId];
  if (human && shielded(human)) { toast(`🛡️ ${human.name} steht noch unter Schutzschild`); return; }
  if (human) v.shieldUntil = 0; // wer selbst angreift, verliert seinen Schild
  const autoEl = document.getElementById('send-auto');
  const auto = !human && !!v.lv.zelt && !!(autoEl && autoEl.checked);
  const now = Date.now();
  const name = launchMission(v, targetId, units, now, auto);
  v.log.unshift({ t: now, kind: 'attack', name, units, auto });
  v.log.length = Math.min(v.log.length, 200);
  save();
  toast(auto ? `🔁 Dauerauftrag: Truppen plündern ${name} immer wieder` : `⚔️ Truppen marschieren nach ${name}`);
  render();
}

// Dauerauftrag beenden: Truppen kommen nach dieser Runde heim
function stopAuto(i) {
  const m = me().missions[Number(i)];
  if (m) { m.stop = true; save(); toast('🔁 Dauerauftrag beendet – die Truppen kommen heim'); render(); }
}

function setAutoRecruit(uid) {
  me().autoRecruit = uid || null;
  save();
  render();
}

function undo() {
  const v = me();
  const e = v.log[0];
  if (!e || !UNDOABLE.includes(e.kind) || !confirm('Letzten Eintrag rückgängig machen?')) return;
  if (e.kind === 'train') {
    const L = v.life;
    for (const r in e.got) v.res[r] = Math.max(0, v.res[r] - e.got[r]);
    v.lastDay = e.prevDay;
    if (typeof e.sped === 'number' && v.queue[0]) v.queue[0].end += e.sped; // alte Einträge
    else for (const id in e.sped || {}) { const q = inBuild(v, id); if (q) q.end += e.sped[id]; }
    if (!byId(ACTIVITIES, e.id).light) {
      L.rounds = Math.max(0, L.rounds - 1);
      v.rounds = Math.max(0, v.rounds - 1);
    }
    if (e.bonus && e.wk) { L.days = Math.max(0, L.days - 1); L.weeks[e.wk] = Math.max(0, (L.weeks[e.wk] || 1) - 1); }
    if (e.chest) {
      for (const r in e.chest.loot) v.res[r] = Math.max(0, v.res[r] - e.chest.loot[r]);
      Object.assign(L, e.chest.prev);
    }
  } else if (e.kind === 'recruit') {
    v.units[e.id] = Math.max(0, v.units[e.id] - e.n);
    const cap = capacity(v);
    for (const r in e.cost) v.res[r] = Math.min(cap, v.res[r] + e.cost[r]);
  } else {
    const q = v.queue.find(q => q.id === e.id && q.level === e.level);
    if (q) {
      v.queue = v.queue.filter(x => x !== q); // Baustelle abbrechen
    } else {
      v.lv[e.id]--;
      v.spent -= sum(e.cost);
    }
    const cap = capacity(v);
    for (const r in e.cost) v.res[r] = Math.min(cap, v.res[r] + e.cost[r]);
  }
  v.log.shift();
  save();
  render();
}

function rename(id) {
  const p = state.players[id];
  const name = prompt('Neuer Name:', p.name);
  if (name && name.trim()) { p.name = name.trim().slice(0, 20); save(); render(); }
}

function reset() {
  if (!confirm('Wirklich ALLES zurücksetzen? Beide Dörfer starten neu – auch Ränge, Abzeichen und Ruhmeshalle. Das gilt für beide Handys.')) return;
  const fresh = freshState();
  for (const k of ['startDay', 'season', 'hall', 'raids', 'team', 'resetId']) state[k] = fresh[k];
  metaSet({ startDay: state.startDay, season: state.season, hall: null, raids: null, team: null, resetId: state.resetId });
  reconcileOwn();
  botCache.clear();
  save();
  toast('🔄 Neues Spiel – alles auf Anfang!', true);
  render();
}

const UNDOABLE = ['train', 'build', 'recruit'];

const actions = {
  train, build, undo, rename, reset, recruit, attack, newSeason, sendall: sendAll, stopauto: stopAuto,
  create: createGame, join: joinGame, local: playLocal, share: shareInvite, leave: leaveGame,
  setupdone: () => { setupStep = null; render(); },
  tab: t => { tab = t; render(); window.scrollTo(0, 0); },
  player: id => { if (online()) return; state.current = id; mapSel = null; lastTab = null; save(); render(); },
  mapsel: id => { mapSel = id; render(); },
  focus: id => {
    const el = document.getElementById('b-' + id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  },
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (el && actions[el.dataset.act]) actions[el.dataset.act](el.dataset.arg);
});
document.addEventListener('change', e => {
  if (e.target.id === 'auto-recruit') setAutoRecruit(e.target.value);
});

/* =========================================================
   Anzeige
   ========================================================= */

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function fmtRes(o, sign = '') {
  return Object.entries(o).filter(([, n]) => n > 0).map(([r, n]) => `${sign}${num(n)} ${RES[r].icon}`).join('  ');
}

function costChips(v, cost) {
  return `<div class="chips">${Object.entries(cost).map(([r, n]) =>
    `<span class="chip ${v.res[r] < n ? 'short' : ''}">${RES[r].icon} ${num(n)}</span>`).join('')}</div>`;
}

function renderHeader() {
  document.getElementById('players').innerHTML = Object.entries(state.players).map(([id, p]) => `
    <button class="pchip ${id === state.current ? 'on' : ''} ${online() && id !== game.me ? 'other' : ''}" data-act="player" data-arg="${id}">
      <b>${rankOf(p.life).icon} ${esc(p.name)}</b><small>${num(points(p))} P.</small>
    </button>`).join('');
  renderSyncDot();

  const v = me();
  const cap = capacity(v);
  document.getElementById('resbar').innerHTML = Object.entries(RES).map(([r, info]) => `
    <div class="res">
      <div class="res-top"><span>${info.icon} ${info.name}</span><b>${num(v.res[r])}</b></div>
      <div class="meter"><i style="width:${Math.min(100, v.res[r] / cap * 100)}%"></i></div>
    </div>`).join('') + `<div class="cap">Speicher: ${num(cap)} je Rohstoff</div>`;

  for (const btn of document.querySelectorAll('#tabs button')) btn.classList.toggle('on', btn.dataset.arg === tab);
}

function viewTraining() {
  const v = me();
  const L = v.life;
  const bonus = v.lastDay !== todayStr();
  const goal = nextGoal(v);
  const rank = rankOf(L), next = nextRank(L);
  const weekDays = L.weeks[weekKey()] || 0;
  const streak = currentStreak(L);
  const cu = catchUp(v);
  const team = teamDays();
  return `
    ${incomingBanner(v)}
    <section class="banner ${bonus ? 'sun' : 'done'}">
      ${bonus ? '☀️ <b>Erstes Training heute:</b> +50 % auf den nächsten Eintrag!' : '✅ Heute schon trainiert – stark!'}
    </section>
    ${cu ? `<section class="banner catchup">🚀 <b>Aufhol-Bonus +${Math.round(cu * 100)} %</b> – du liegst hinten, jeder Durchgang bringt dir mehr.</section>` : ''}
    ${tired(v) ? `<section class="banner tired">😮‍💨 <b>${roundsToday(v) + 1}. Durchgang heute:</b> −${TIRED_MALUS * 100} % – Erholung zählt auch! Morgen gibt's wieder den vollen Ertrag.</section>` : ''}
    ${v.queue.map(q => queueCard(v, q)).join('')}
    <div class="minis">
      <div class="mini" data-act="tab" data-arg="profil">
        <b>${rank.icon} ${rank.name}</b>
        <small>${next ? `noch ${next.min - L.rounds} Durchg. bis ${next.name}` : 'Höchster Rang!'}</small>
      </div>
      <div class="mini" data-act="tab" data-arg="profil">
        <b>🎁 Woche ${Math.min(weekDays, WEEK_GOAL_DAYS)}/${WEEK_GOAL_DAYS}</b>
        <small>${weekDays >= WEEK_GOAL_DAYS ? 'Truhe geöffnet ✓' : 'Trainingstage bis zur Truhe'}${streak ? ` · 🔥 ${streak}` : ''}</small>
      </div>
      <div class="mini wide" data-act="tab" data-arg="profil">
        <b>🤝 Team ${Math.min(team, TEAM_GOAL_DAYS)}/${TEAM_GOAL_DAYS}</b>
        <small>${state.team[weekKey()] ? 'Teamtruhe geöffnet ✓' : 'gemeinsame Trainingstage diese Woche – dann gibt’s die Teamtruhe für beide'}</small>
      </div>
    </div>
    ${goal ? goalCard(v, goal) : ''}
    <h2>Training eintragen</h2>
    <div class="acts">${ACTIVITIES.map(a => {
      const done = doneToday(v, a.id);
      const full = a.perDay && done >= a.perDay;
      return `
      <button class="act ${a.light ? 'light' : 'main'}" data-act="train" data-arg="${a.id}" ${full ? 'disabled' : ''}>
        <span class="act-icon">${a.icon}</span>
        <span class="act-name">${a.name}${a.perDay ? ` <small>${done}/${a.perDay} heute</small>` : ''}</span>
        <span class="act-unit">${a.unit}</span>
        <span class="act-gain">${full ? 'für heute geschafft ✓' : fmtRes(gainOf(v, a, bonus), '+')}</span>
        ${v.queue.length && !full ? `<span class="act-boost">⚡ ${a.light ? `Baustelle −${TRAIN_SPEEDUP_MIN} Min.` : 'halbiert die Restbauzeit'}</span>` : ''}
      </button>`;
    }).join('')}</div>
    <p class="hint">Nach jedem Durchgang einmal tippen. Aufwärmen zählt bis zu 2× am Tag, aber nicht als Milon-Durchgang. Vertippt? Unter „Profil“ lässt sich der letzte Eintrag zurücknehmen.</p>`;
}

// Laufende Baustelle mit Countdown und Fortschrittsbalken
function queueCard(v, q) {
  const b = byId(BUILDINGS, q.id);
  const pct = Math.min(100, (Date.now() - q.start) / (q.end - q.start) * 100);
  return `
    <section class="card building-now">
      <div class="goal-head">
        <span class="big-icon">${bIcon(b)}</span>
        <div class="bld-title">
          <b>🔨 ${b.name} → Stufe ${q.level}</b>
          <small>fertig in <b data-eta="${q.end}">${fmtDur(q.end - Date.now())}</b> · jeder Durchgang halbiert die Zeit</small>
        </div>
      </div>
      <div class="meter big"><i data-prog="${q.start},${q.end}" style="width:${pct}%"></i></div>
    </section>`;
}

function goalCard(v, { b, c }) {
  let action;
  if (c.ok) action = `<button class="btn primary" data-act="build" data-arg="${b.id}">Jetzt ausbauen · ⏱ ${fmtDur(buildMinutes(v, b) * 60e3)}</button>`;
  else if (Object.keys(c.missing).length) action = `<div class="todo">Noch: <b>${missingAsWorkouts(v, c.missing).join(' + ')}</b></div>`;
  else action = '<div class="todo">✓ Rohstoffe da – startklar, sobald eine Baustelle frei ist</div>';
  return `
    <section class="card goal">
      <div class="goal-head">
        <span class="big-icon">${bIcon(b)}</span>
        <div>
          <div class="eyebrow">Nächstes Ziel</div>
          <div class="goal-title">${b.name} → Stufe ${v.lv[b.id] + 1}</div>
        </div>
      </div>
      ${costChips(v, c.cost)}
      ${action}
    </section>`;
}

function buildingCard(v, b) {
  const level = v.lv[b.id];
  const c = check(v, b);
  let extra = '';
  const boostRes = Object.keys(BOOSTED_BY).find(r => BOOSTED_BY[r] === b.id);
  if (boostRes) extra = level ? ` · aktuell +${Math.round(level * BOOST_PER_LEVEL * 100)} %, dazu ${num(Math.round(passivePerDay(v, boostRes)))} ${RES[boostRes].icon} pro Tag von allein`
    : ' · liefert pro Stufe auch ein wenig von allein';
  if (b.id === 'speicher') extra = ` · aktuell ${num(capacity(v))} je Rohstoff`;
  if (b.id === 'haupthaus') extra = v.lv.haupthaus >= SECOND_SLOT_HQ ? ' · 2 Baustellen gleichzeitig ✓' : ` · ab Stufe ${SECOND_SLOT_HQ}: 2 Baustellen gleichzeitig`;
  const inBau = inBuild(v, b.id);

  let action;
  if (inBau) action = `<div class="todo">🔨 Im Bau → Stufe ${inBau.level} · fertig in <b data-eta="${inBau.end}">${fmtDur(inBau.end - Date.now())}</b></div>`;
  else if (c.ok) action = `<button class="btn primary" data-act="build" data-arg="${b.id}">Auf Stufe ${level + 1} ausbauen · ⏱ ${fmtDur(buildMinutes(v, b) * 60e3)}</button>`;
  else if (c.blocked) action = `<div class="blocked">🔒 ${c.blocked}</div>`;
  else if (Object.keys(c.missing).length) action = `<div class="todo">Noch: <b>${missingAsWorkouts(v, c.missing).join(' + ')}</b></div>`;
  else action = '<div class="blocked">⏳ Rohstoffe da – erst, wenn eine Baustelle frei ist</div>';

  return `
    <article class="card bld ${c.ok ? 'ready' : ''} ${b.goal ? 'goal' : ''}" id="b-${b.id}">
      <div class="bld-head">
        <span class="big-icon">${bIcon(b)}</span>
        <div class="bld-title"><b>${b.name}</b><small>${b.desc}${extra}</small></div>
        <span class="lvl">${level}</span>
      </div>
      ${c.cost && !inBau ? costChips(v, c.cost) : ''}
      ${action}
      ${level ? UNITS.filter(u => u.at === b.id).map(u => unitRow(v, u)).join('') : ''}
    </article>`;
}

function unitRow(v, u) {
  if (v.lv[u.at] < (u.req || 1)) {
    return `
      <div class="unit locked">
        <span class="big-icon">${u.icon}</span>
        <div class="bld-title"><b>${u.name}</b><small>🔒 ab ${byId(BUILDINGS, u.at).name} Stufe ${u.req} · ${u.desc}</small></div>
      </div>`;
  }
  const c = unitCost(v, u);
  const can = n => Object.keys(c).every(r => v.res[r] >= c[r] * n);
  return `
    <div class="unit">
      <span class="big-icon">${u.icon}</span>
      <div class="bld-title">
        <b>${u.name} <span class="muted">· ${v.units[u.id]} im Dorf</span></b>
        <small>${u.desc} · ⚔️ ${u.att} 🛡️ ${u.def} 🎒 ${u.carry}</small>
        ${costChips(v, c)}
      </div>
      <div class="unit-btns">
        <button class="btn small" data-act="recruit" data-arg="${u.id}:1" ${can(1) ? '' : 'disabled'}>+1</button>
        <button class="btn small" data-act="recruit" data-arg="${u.id}:5" ${can(5) ? '' : 'disabled'}>+5</button>
      </div>
    </div>`;
}

function fmtUnits(units) {
  return UNITS.filter(u => units[u.id]).map(u => `${units[u.id]} ${u.icon}`).join('  ') || '–';
}

function fmtDur(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, sec = s % 60;
  return (h ? `${h}:${String(m).padStart(2, '0')}` : `${m}`) + `:${String(sec).padStart(2, '0')}`;
}

function viewDorf() {
  const v = me();
  return `
    <h2>Dorf von ${esc(v.name)} <small>${num(points(v))} Punkte</small></h2>
    ${villageScene(v)}
    <p class="hint center">Tippe auf ein Gebäude, um es auszubauen.</p>
    ${BUILDINGS.map(b => buildingCard(v, b)).join('')}`;
}

function villageScene(v) {
  const trees = [[18, 26], [42, 16], [318, 16], [342, 30], [16, 222], [40, 234], [344, 218], [320, 234], [180, 22]];
  const wall = v.lv.wall;
  return `
    <svg class="scene" viewBox="0 0 360 240" role="img" aria-label="Dorfansicht">
      <rect width="360" height="240" rx="16" class="s-grass"/>
      ${trees.map(([x, y]) => `<text x="${x}" y="${y}" class="s-tree">🌲</text>`).join('')}
      <ellipse cx="180" cy="118" rx="138" ry="80" class="s-path"/>
      ${wall ? `<ellipse cx="180" cy="118" rx="162" ry="100" class="s-wall" style="stroke-width:${2 + wall * 0.7}px"/>` : ''}
      ${BUILDINGS.map(b => sceneBuilding(v, b)).join('')}
    </svg>`;
}

// Gezeichnete Häuser statt Werkzeug-Symbolen: Wandfarbe, Dachfarbe, Schild
const HOUSES = {
  holzfaeller: { wall: '#b07a45', roof: '#3f6e3a', sign: '🪓', logs: true },
  lehmgrube:   { wall: '#d9a46c', roof: '#b4532a', sign: '⛏️' },
  schmiede:    { wall: '#9a9a96', roof: '#4b4f57', sign: '⚒️', chimney: true },
  speicher:    { wall: '#c8a26b', roof: '#8c3b2e', sign: '📦', wide: true },
  kaserne:     { wall: '#c9b79a', roof: '#3d5f8f', sign: '⚔️', flag: true },
  stall:       { wall: '#a86b3c', roof: '#7a3324', sign: '🐴', wide: true, barn: true },
};

// Haus mit Fußpunkt bei (0,0), ca. 40 breit und 38 hoch
function houseShape(id) {
  const h = HOUSES[id];
  const w = h.wide ? 34 : 28;
  return `
    ${h.chimney ? '<rect x="6" y="-36" width="6" height="12" fill="#5d5d5d"/><circle cx="11" cy="-40" r="3" fill="#bbb" opacity=".7"/>' : ''}
    ${h.flag ? '<line x1="0" y1="-34" x2="0" y2="-44" stroke="#5a4632" stroke-width="1.5"/><path d="M0 -44 L9 -41 L0 -38 Z" fill="#c0392b"/>' : ''}
    <rect x="${-w / 2}" y="-20" width="${w}" height="20" rx="1.5" fill="${h.wall}" stroke="rgba(0,0,0,.35)" stroke-width="1"/>
    <path d="M${-w / 2 - 4} -19 L0 -35 L${w / 2 + 4} -19 Z" fill="${h.roof}" stroke="rgba(0,0,0,.35)" stroke-width="1" stroke-linejoin="round"/>
    ${h.barn
      ? '<path d="M-6 0 V-12 Q0 -16 6 -12 V0 Z" fill="#5a3418"/><path d="M-6 -12 L6 0 M6 -12 L-6 0" stroke="#e8d3b0" stroke-width="1"/>'
      : `<rect x="-4" y="-11" width="8" height="11" rx="1" fill="#5a3a22"/>
         <rect x="${-w / 2 + 3}" y="-15" width="6" height="6" fill="#ffe9a8" stroke="rgba(0,0,0,.3)" stroke-width=".8"/>`}
    ${h.logs ? '<g fill="#8a5a2b" stroke="#5a3a1a" stroke-width=".8"><circle cx="20" cy="-3" r="3"/><circle cx="26" cy="-3" r="3"/><circle cx="23" cy="-8" r="3"/></g>' : ''}
    <circle cx="${w / 2 - 6}" cy="-11" r="6" fill="#f6efe1" stroke="rgba(0,0,0,.35)" stroke-width=".8"/>
    <text x="${w / 2 - 6}" y="-7.6" font-size="8.5" text-anchor="middle">${h.sign}</text>`;
}

// Symbol für Karten und Listen: gezeichnetes Haus, sonst das Emoji
function bIcon(b) {
  return HOUSES[b.id] ? `<svg class="house-icon" viewBox="-22 -46 46 48" aria-hidden="true">${houseShape(b.id)}</svg>` : b.icon;
}

function sceneBuilding(v, b) {
  const [x, y] = SCENE_POS[b.id];
  const lvl = v.lv[b.id];
  const inBau = inBuild(v, b.id);
  if (b.max === 1) { // Statue und Zelt erscheinen erst, wenn sie stehen (oder gebaut werden)
    if (!lvl && !inBau) return '';
    return `<g class="s-bld" data-act="focus" data-arg="${b.id}">
      <text x="${x}" y="${y + 14}" font-size="40" text-anchor="middle" opacity="${lvl ? 1 : 0.4}">${b.icon}</text>
      ${inBau ? `<text x="${x + 18}" y="${y - 10}" font-size="16" text-anchor="middle">🚧</text>` : ''}</g>`;
  }
  const size = Math.min(46, 24 + lvl * 1.6); // Gebäude wachsen mit der Stufe
  return `
    <g class="s-bld" data-act="focus" data-arg="${b.id}">
      <ellipse cx="${x}" cy="${y + 14}" rx="28" ry="9" class="s-plot ${lvl ? '' : 'empty'}"/>
      ${lvl ? `
        ${HOUSES[b.id] ? `<g transform="translate(${x} ${y + 12}) scale(${(size / 32).toFixed(2)})">${houseShape(b.id)}</g>`
          : `<text x="${x}" y="${y + 13}" font-size="${size}" text-anchor="middle">${b.icon}</text>`}
        <circle cx="${x + 22}" cy="${y - 14}" r="9" class="s-badge"/>
        <text x="${x + 22}" y="${y - 10.5}" class="s-badge-t">${lvl}</text>`
      : `<text x="${x}" y="${y + 20}" class="s-empty">+</text>`}
      ${inBau ? `<text x="${x - 22}" y="${y - 8}" font-size="16" text-anchor="middle">🚧</text>` : ''}
      <text x="${x}" y="${y + 36}" class="s-name">${b.name}</text>
    </g>`;
}

/* ---------- Weltkarte ---------- */

function terrain(x, y) {
  if (Math.hypot(x - 1.5, y - 11.5) < 2.2 || Math.hypot(x - 22, y - 14.5) < 1.7 || Math.hypot(x - 16.5, y - 2) < 1.6
    || Math.hypot(x - 8, y - 22) < 1.4) return 'water';
  const h = hash01(`t:${x},${y}`);
  if (h < 0.2) return 'forest';
  if (h > 0.93) return 'hill';
  return (x + y) % 2 ? 'grass' : 'grass2';
}

function villageIcon(pts) {
  return pts < 50 ? '🛖' : pts < 300 ? '🏠' : pts < 1000 ? '🏘️' : '🏰';
}

function aggrLabel(bot) {
  return bot.aggr >= 0.12 ? '🔥 sehr angriffslustig' : bot.aggr >= 0.06 ? '⚔️ greift ab und zu an' : bot.aggr > 0 ? '🙂 greift selten an' : '😴 friedlich';
}

function mapVillages() {
  return [
    ...Object.entries(state.players).map(([id, p]) => ({
      id, name: p.name, kind: id === state.current ? 'me' : 'player', pts: points(p), hh: p.lv.haupthaus,
      info: shielded(p) ? `🛡️ Schutzschild noch ${fmtDur(p.shieldUntil - Date.now())}` : '',
    })),
    ...BOTS.map(bot => {
      const v = botAt(bot);
      return { id: bot.id, name: bot.name, kind: 'bot', pts: points(v), hh: v.lv.haupthaus,
        info: `${bot.info} · ${aggrLabel(bot)} · schlägt zurück`, face: bot.icon };
    }),
    ...RUINS.map(r => ({ id: r.id, name: r.name, kind: 'ruin', pts: r.pts, hh: 1 })),
  ].map(v => ({ ...v, pos: MAP_POS[v.id] || byId(RUINS, v.id).pos, icon: v.kind === 'ruin' ? '🏚️' : villageIcon(v.pts) }));
}

const KIND_LABEL = { me: 'Dein Dorf', player: 'Mitspieler', bot: 'Bot-Dorf', ruin: 'Verlassenes Dorf' };

function viewKarte() {
  const vs = mapVillages();
  const home = vs.find(v => v.kind === 'me');
  const sel = vs.find(v => v.id === mapSel) || home;
  const S = 28;
  const taken = new Set(vs.map(v => v.pos.join(',')));

  let cells = '';
  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      const t = taken.has(`${x},${y}`) ? 'grass' : terrain(x, y);
      cells += `<rect x="${x * S}" y="${y * S}" width="${S}" height="${S}" class="t-${t}"/>`;
      if (t === 'forest') cells += `<text x="${x * S + S / 2}" y="${y * S + 20}" class="m-deco">🌲</text>`;
    }
  }
  const markers = vs.map(v => {
    const cx = v.pos[0] * S + S / 2, cy = v.pos[1] * S + S / 2;
    return `
      <g class="vill ${v.kind} ${v === sel ? 'sel' : ''}" data-act="mapsel" data-arg="${v.id}">
        <circle cx="${cx}" cy="${cy}" r="${v === sel ? 15 : 13}"/>
        <text x="${cx}" y="${cy + 6}" class="m-icon">${v.icon}</text>
        ${v.face ? `<text x="${cx + 11}" y="${cy - 7}" class="m-face">${v.face}</text>` : ''}
      </g>`;
  }).join('');

  // Bot-Angriffe auf mich als Linie zeigen
  const lines = incomingFor(state.current).map(a => {
    const [p, q] = [posOf(a.bot), posOf(a.target)];
    return `<line x1="${p[0] * S + S / 2}" y1="${p[1] * S + S / 2}" x2="${q[0] * S + S / 2}" y2="${q[1] * S + S / 2}" class="m-threat"/>`;
  }).join('');

  const dist = Math.hypot(sel.pos[0] - home.pos[0], sel.pos[1] - home.pos[1]);
  const v = me();
  return `
    <h2>Weltkarte <small>Tag ${daysBetween(state.startDay, todayStr()) + 1} · ${BOTS.length} Bots</small></h2>
    ${incomingBanner(v)}
    ${shielded(v) ? `<p class="hint">🛡️ Dein Schutzschild hält noch <b data-eta="${v.shieldUntil}">${fmtDur(v.shieldUntil - Date.now())}</b>. Greifst du einen Mitspieler an, fällt er weg.</p>` : ''}
    ${missionList(v)}
    <div class="map-wrap" id="map-wrap">
      <svg class="map" viewBox="0 0 ${MAP_SIZE * S} ${MAP_SIZE * S}" width="${MAP_SIZE * S}" height="${MAP_SIZE * S}" role="img" aria-label="Weltkarte">
        ${cells}${lines}${markers}
      </svg>
    </div>
    <div class="legend">
      <span><i class="dot me"></i>Du</span><span><i class="dot player"></i>Mitspieler</span>
      <span><i class="dot bot"></i>Bot</span><span><i class="dot ruin"></i>Ruine</span>
    </div>
    <section class="card">
      <div class="goal-head">
        <span class="big-icon">${sel.face || sel.icon}</span>
        <div class="bld-title"><b>${esc(sel.name)}</b><small>${KIND_LABEL[sel.kind]}${sel.info ? ' · ' + sel.info : ''}</small></div>
      </div>
      <div class="stats">
        <div><b>${num(sel.pts)}</b><small>Punkte</small></div>
        <div><b>${sel.hh}</b><small>Haupthaus</small></div>
        <div><b>${sel === home ? '–' : dist.toLocaleString('de-DE', { maximumFractionDigits: 1 })}</b><small>Felder entfernt</small></div>
      </div>
      ${sel === home
        ? `<p class="hint">Truppen im Dorf: ${fmtUnits(v.units)}<br>Wähle ein anderes Dorf auf der Karte, um es anzugreifen.</p>`
        : attackPanel(v, sel)}
    </section>
    ${reportList(v)}`;
}

function attackPanel(v, sel) {
  const available = UNITS.filter(u => v.units[u.id] > 0);
  if (!available.length) {
    return `<p class="hint">⚔️ Du hast keine Truppen im Dorf. ${v.lv.kaserne
      ? 'Bilde in der Kaserne welche aus.' : 'Baue zuerst eine Kaserne (ab Haupthaus Stufe 3).'}</p>`;
  }
  return `
    <div class="attack" data-target="${sel.id}">
      <h3>⚔️ Angriff</h3>
      ${available.map(u => `
        <label class="send">
          <span>${u.icon} ${u.name}</span>
          <input type="number" id="send-${u.id}" min="0" max="${v.units[u.id]}" value="0" inputmode="numeric">
          <button type="button" class="btn small" data-act="sendall" data-arg="${u.id}">alle ${v.units[u.id]}</button>
        </label>`).join('')}
      ${sel.kind === 'player' && shielded(state.players[sel.id]) ? `<p class="hint">🛡️ ${esc(sel.name)} steht noch ${fmtDur(state.players[sel.id].shieldUntil - Date.now())} unter Schutzschild.</p>` : ''}
      ${sel.kind === 'player' ? '' : v.lv.zelt
        ? `<label class="check"><input type="checkbox" id="send-auto"> 🔁 Dauerauftrag – immer wieder plündern</label>`
        : '<p class="hint">🔒 Daueraufträge gibt es mit dem Feldherrenzelt (Haupthaus 6, Kaserne 4).</p>'}
      ${sel.kind === 'bot' ? '<p class="hint">⚠️ Bots schlagen zurück – lass ein paar Verteidiger im Dorf.</p>' : ''}
      <div class="preview hint">Wähle Truppen aus.</div>
      <button class="btn primary" data-act="attack" data-arg="${sel.id}">Angriff starten</button>
    </div>`;
}

// Warnung vor heranrückenden Bot-Angriffen
function incomingBanner(v) {
  const list = incomingFor(idOf(v));
  if (!list.length) return '';
  const def = Math.round(humanDef(v) * wallMult(v));
  return `
    <section class="card incoming">${list.map(a => {
      const bot = byId(BOTS, a.bot);
      const { att } = botPower(bot, v, a.arrive);
      const odds = def > att * 1.2 ? '🟢 deine Verteidigung sollte halten' : def > att ? '🟠 wird knapp' : '🔴 deine Verteidigung reicht wohl nicht';
      return `
        <div class="row">
          <span><b>${a.kind === 'revenge' ? '😠 Gegenschlag' : '🔥 Angriff'} von ${bot.icon} ${esc(bot.name)}</b>
          <small>Stärke ca. ${att} gegen deine ${def} 🛡️ · ${odds}</small></span>
          <small>in <b data-eta="${a.arrive}">${fmtDur(a.arrive - Date.now())}</b></small>
        </div>`;
    }).join('')}
      <small class="muted">Tipp: Bogenschützen und Wall verteidigen am besten – oder schnell noch trainieren und ausbauen.</small>
    </section>`;
}

function updateAttackPreview() {
  const box = document.querySelector('.attack');
  if (!box) return;
  const units = readSendInputs();
  const out = box.querySelector('.preview');
  if (!sum(units)) { out.textContent = 'Wähle Truppen aus.'; return; }
  const human = state.players[box.dataset.target];
  const mor = human ? morale(points(me()), points(human)) : 1;
  const att = Math.round(UNITS.reduce((s, u) => s + (units[u.id] || 0) * u.att, 0) * mor);
  const carry = UNITS.reduce((s, u) => s + (units[u.id] || 0) * u.carry, 0);
  const ratio = att / targetOf(box.dataset.target, units.ramme || 0).def;
  const chance = ratio >= 1.4 ? '🟢 Gute Chancen' : ratio > 1 ? '🟠 Knapp' : '🔴 Sehr riskant';
  const travel = travelTime(units, distance(state.current, box.dataset.target));
  out.innerHTML = `<b>${chance}</b> · Angriffskraft ${att} · tragen bis ${num(carry)} Beute<br>
    ${mor < 1 ? `💢 Kampfgeist ${Math.round(mor * 100)} % – ${esc(human.name)} ist viel kleiner als du<br>` : ''}
    Weg: ${fmtDur(travel)} hin, genauso lange zurück`;
}

function missionList(v) {
  if (!v.missions.length) return '';
  const now = Date.now();
  return `
    <div class="card list missions">${v.missions.map((m, i) => {
      const out = !m.done;
      const auto = m.auto && !m.stop;
      return `
        <div class="row">
          <span>${auto ? '🔁' : out ? '⚔️' : '↩️'} ${esc(m.name)} <small>${fmtUnits(out ? m.units : m.survivors)}${auto ? ' · Dauerauftrag' : ''}</small></span>
          <small>${out ? 'Ankunft' : 'zurück'} in <b data-eta="${out ? m.arrive : m.back}">${fmtDur((out ? m.arrive : m.back) - now)}</b>
          ${auto ? `<button class="btn small" data-act="stopauto" data-arg="${i}">Stopp</button>` : ''}</small>
        </div>`;
    }).join('')}</div>`;
}

function reportList(v) {
  if (!v.reports.length) return '';
  const fmtTime = t => new Date(t).toLocaleString('de-DE', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  return `
    <h2>Berichte</h2>
    <div class="card list">${v.reports.slice(0, 10).map(r => {
      let head, body;
      if (r.shield) {
        head = r.incoming ? `🛡️ ${esc(r.name)} prallt an deinem Schutzschild ab` : `🛡️ ${esc(r.name)} hatte Schutzschild`;
        body = r.incoming ? 'Kein Kampf.' : 'Deine Truppen sind umgekehrt.';
      } else if (r.incoming) {
        const from = r.revenge ? 'Gegenschlag' : 'Angriff';
        head = r.win ? `🛡️ ${from} von ${esc(r.name)} abgewehrt` : `🔥 ${esc(r.name)} hat dich überfallen`;
        body = `Verluste: ${fmtUnits(r.lost)}${sum(r.loot) ? ` · geraubt: ${fmtRes(r.loot)}` : ''}`;
        if (r.bonus && sum(r.bonus)) body += ` · zurückgelassene Beute: ${fmtRes(r.bonus, '+')}`;
        if (r.att) body += ` · ⚔️ ${r.att} gegen 🛡️ ${r.def}`;
        if (r.shieldOn) body += ` · 🛡️ ${SHIELD_H} Std. Schutzschild`;
      } else {
        head = r.win ? `⚔️ Sieg gegen ${esc(r.name)}` : `💀 Niederlage gegen ${esc(r.name)}`;
        body = `Gesendet: ${fmtUnits(r.sent)} · Verluste: ${fmtUnits(r.lost)}${r.win ? ` · Beute: ${fmtRes(r.loot, '+') || 'nichts'}` : ''}`;
        if (r.morale) body += ` · 💢 Kampfgeist ${Math.round(r.morale * 100)} %`;
      }
      if (r.wallDown) body += ` · 🐏 Wall −${r.wallDown}`;
      return `<div class="row report ${r.win ? 'won' : 'lost'}"><span><b>${head}</b><small>${body}</small></span><small>${fmtTime(r.t)}</small></div>`;
    }).join('')}</div>`;
}

function viewRang() {
  const rows = standings();
  const medal = i => ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;
  const left = daysLeft();
  const statue = byId(BUILDINGS, 'statue');

  return `
    <h2>Saison ${state.season.no} <small>${state.season.winner ? 'beendet' : `noch ${left} ${left === 1 ? 'Tag' : 'Tage'}`}</small></h2>
    <section class="card goal">
      <div class="goal-head">
        <span class="big-icon">${statue.icon}</span>
        <div class="bld-title">
          <b>Saisonziel: die Stahlstatue</b>
          <small>Wer sie zuerst errichtet, gewinnt sofort (braucht Haupthaus ${statue.req.haupthaus} und Speicher ${statue.req.speicher}).
          Schafft es niemand, gewinnt nach ${state.season.weeks} Wochen, wer die meisten Punkte hat – auch ein Bot.</small>
        </div>
      </div>
    </section>
    <div class="card list">${rows.map((row, i) => `
      <div class="row ${row.pid === state.current ? 'me' : ''}">
        <span class="rank">${medal(i)}</span>
        <span class="big-icon who-icon">${row.icon}</span>
        <span class="who"><b>${esc(row.name)}</b>${row.bot ? `<small>Bot · ${row.bot.info}</small>` : `<small>${rankOf(row.v.life).name}</small>`}</span>
        <span class="pts"><b>${num(points(row.v))}</b><small>Haupthaus ${row.v.lv.haupthaus}</small></span>
      </div>`).join('')}</div>
    <p class="hint">Punkte gibt es für alles, was gebaut wird. Die ${BOTS.length} Bots wachsen jeden Tag von allein – Mia und Fritz sind leicht zu schlagen, Egon und Horst nur mit viel Fleiß.</p>

    <h2>🏛️ Ruhmeshalle</h2>
    <div class="card list">${state.hall.length ? state.hall.map(h => `
      <div class="row"><span><b>🏆 Saison ${h.no}: ${esc(h.name)}</b><small>${esc(h.how)}</small></span><small>${new Date(h.day + 'T12:00').toLocaleDateString('de-DE')}</small></div>`).join('')
      : '<div class="row muted">Noch leer – wer wird der erste Champion?</div>'}</div>`;
}

function viewProfil() {
  const v = me();
  const L = v.life;
  const rank = rankOf(L), next = nextRank(L);
  const pct = next ? (L.rounds - rank.min) / (next.min - rank.min) * 100 : 100;
  const weekDays = L.weeks[weekKey()] || 0;
  const streak = currentStreak(L);
  const earned = new Set(earnedBadges(L));
  const dots = Array.from({ length: WEEK_GOAL_DAYS }, (_, i) => `<i class="${i < weekDays ? 'on' : ''}"></i>`).join('');
  return `
    <h2>Profil von ${esc(v.name)}</h2>
    <section class="card rankcard">
      <div class="goal-head">
        <span class="big-icon">${rank.icon}</span>
        <div class="bld-title">
          <b>${rank.name}</b>
          <small>${rank.bonus ? `für immer +${Math.round(rank.bonus * 100)} % auf alle Rohstoffe` : 'dein Weg zum Stahl beginnt'}</small>
        </div>
      </div>
      <div class="meter big"><i style="width:${pct}%"></i></div>
      <small>${next ? `${L.rounds} / ${next.min} Durchgänge → ${next.icon} ${next.name} (+${Math.round(next.bonus * 100)} %)` : `${L.rounds} Durchgänge – höchster Rang erreicht!`}</small>
    </section>

    <section class="card">
      <div class="goal-head">
        <span class="big-icon">🎁</span>
        <div class="bld-title">
          <b>Wochenziel: ${WEEK_GOAL_DAYS} Trainingstage</b>
          <small>${weekDays >= WEEK_GOAL_DAYS ? 'Geschafft – Truhe geöffnet!' : `Truhe diese Woche: ${fmtRes(chestFor(streak + 1))}`}</small>
        </div>
        <span class="dots">${dots}</span>
      </div>
      <small>${streak ? `🔥 ${streak} ${streak === 1 ? 'Woche' : 'Wochen'} in Folge – jede weitere macht die Truhe 25 % größer (bis doppelt)` : 'Schaffe das Ziel mehrere Wochen hintereinander, dann wächst die Truhe.'}</small>
    </section>

    <section class="card">
      <div class="goal-head">
        <span class="big-icon">🤝</span>
        <div class="bld-title">
          <b>Teamziel: zusammen ${TEAM_GOAL_DAYS} Trainingstage</b>
          <small>${state.team[weekKey()] ? 'Geschafft – Teamtruhe für euch beide geöffnet!' : `Diese Woche ${teamDays()} / ${TEAM_GOAL_DAYS} · Teamtruhe für beide: ${fmtRes(TEAM_CHEST)}`}</small>
        </div>
      </div>
    </section>

    <div class="stats">
      <div><b>${num(L.rounds)}</b><small>Durchgänge</small></div>
      <div><b>${num(L.days)}</b><small>Trainingstage</small></div>
      <div><b>${L.bestStreak}</b><small>beste Serie</small></div>
    </div>

    <h2>⚙️ Automatisierungen</h2>
    <div class="card list autos">
      ${autoRow(v.lv.holzfaeller || v.lv.lehmgrube || v.lv.schmiede, '🌲', 'Passive Produktion',
        `${fmtRes(Object.fromEntries(Object.keys(RES).map(r => [r, Math.round(passivePerDay(v, r))])), '+') || 'nichts'} pro Tag von allein`,
        'Holzfäller, Lehmgrube oder Schmiede bauen')}
      ${autoRow(v.lv.haupthaus >= SECOND_SLOT_HQ, '🏗️', 'Zweite Baustelle', 'zwei Gebäude gleichzeitig bauen', `Haupthaus Stufe ${SECOND_SLOT_HQ}`)}
      ${autoRow(v.lv.zelt, '🔁', 'Daueraufträge', 'Truppen plündern Ruinen und Bots immer wieder – auf der Karte einschalten', 'Feldherrenzelt bauen')}
      ${autoRow(L.rounds >= AUTO_RECRUIT_RANK, '⚙️', 'Auto-Ausbildung',
        `Ist der Speicher zu ${AUTO_RECRUIT_FULL * 100} % voll, wird alles über ${AUTO_RECRUIT_KEEP * 100} % zu Truppen:
        <select id="auto-recruit"><option value="">aus</option>${UNITS.filter(u => v.lv[u.at] >= (u.req || 1)).map(u =>
          `<option value="${u.id}" ${v.autoRecruit === u.id ? 'selected' : ''}>${u.icon} ${u.name}</option>`).join('')}</select>`,
        `Rang Krieger (${AUTO_RECRUIT_RANK} Durchgänge, noch ${Math.max(0, AUTO_RECRUIT_RANK - L.rounds)})`)}
    </div>

    <h2>⚖️ Fair bleiben</h2>
    <div class="card list rules">
      <div class="row"><span>🚀 <b>Aufhol-Bonus:</b> Wer hinten liegt, bekommt +10 % je 10 % Rückstand (bis +${CATCHUP_MAX * 100} %). Bei dir gerade: ${catchUp(v) ? `+${Math.round(catchUp(v) * 100)} %` : 'keiner'}.</span></div>
      <div class="row"><span>😮‍💨 <b>Erholung:</b> Ab dem ${TIRED_FROM}. Durchgang am Tag gibt es ${TIRED_MALUS * 100} % weniger. Regelmäßig schlägt viel auf einmal.</span></div>
      <div class="row"><span>💢 <b>Kampfgeist:</b> Wer einen viel Kleineren angreift, kämpft schwächer (bis −50 %).</span></div>
      <div class="row"><span>🛡️ <b>Schutzschild:</b> Nach einem verlorenen Kampf ${SHIELD_H} Std. Ruhe vor allen Angriffen.</span></div>
      <div class="row"><span>🎖️ <b>Rang-Bonus:</b> startet jede Saison bei 50 % und ist nach ${RANK_RAMP_ROUNDS} Durchgängen wieder voll. Bei dir gerade +${Math.round(rankBonus(v) * 1000) / 10} %.</span></div>
      <div class="row"><span>🎯 <b>Bots</b> greifen am liebsten den an, der vorne liegt.</span></div>
    </div>

    <h2>Abzeichen <small>${earned.size} / ${BADGES.length}</small></h2>
    <div class="badges">${BADGES.map(b => `
      <div class="badge ${earned.has(b) ? 'on' : ''}"><span>${b.icon}</span><b>${b.name}</b><small>${b.desc}</small></div>`).join('')}</div>
    <p class="hint">Rang, Abzeichen und Statistik bleiben für immer – auch wenn eine neue Saison beginnt.</p>
    ${viewVerlauf(v)}`;
}

function autoRow(on, icon, name, desc, need) {
  return `
    <div class="row auto ${on ? 'on' : 'off'}">
      <span class="big-icon who-icon">${icon}</span>
      <span class="who"><b>${name} ${on ? '✓' : '🔒'}</b><small>${on ? desc : 'Freischalten: ' + need}</small></span>
    </div>`;
}

function viewVerlauf(v) {
  const fmtTime = t => new Date(t).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const line = e => {
    if (e.kind === 'train') {
      const a = byId(ACTIVITIES, e.id);
      return `${a.icon} ${a.name} <span class="muted">${fmtRes(e.got, '+')}${e.bonus ? ' ☀️' : ''}</span>`;
    }
    if (e.kind === 'recruit') { const u = byId(UNITS, e.id); return `${u.icon} ${e.n}× ${u.name} ausgebildet`; }
    if (e.kind === 'autorecruit') { const u = byId(UNITS, e.id); return `⚙️ ${e.n}× ${u.name} automatisch ausgebildet`; }
    if (e.kind === 'attack') return `${e.auto ? '🔁 Dauerauftrag' : '⚔️ Angriff'} auf ${esc(e.name)} <span class="muted">${fmtUnits(e.units)}</span>`;
    const b = byId(BUILDINGS, e.id);
    return `🔨 ${b.name} → Stufe ${e.level}`;
  };
  return `
    <h2>Verlauf von ${esc(v.name)}</h2>
    <div class="card list">
      ${v.log.length ? v.log.slice(0, 40).map(e => `
        <div class="row log"><span>${line(e)}</span><small>${fmtTime(e.t)}</small></div>`).join('')
        : '<div class="row muted">Noch nichts eingetragen – ab ins Gym! 💪</div>'}
    </div>
    ${v.log.length && UNDOABLE.includes(v.log[0].kind) ? '<button class="btn" data-act="undo">↩️ Letzten Eintrag rückgängig</button>' : ''}

    <h2>Einstellungen</h2>
    <div class="card list">
      ${ownIds().map(id => `
        <div class="row"><span>🧑 ${esc(state.players[id].name)}</span><button class="btn small" data-act="rename" data-arg="${id}">Umbenennen</button></div>`).join('')}
      ${online() ? `
        <div class="row"><span>${connected ? '🟢 Online verbunden' : '🟠 Gerade offline – wird nachgeholt, sobald wieder Netz da ist'}</span></div>
        <div class="row"><span>🔗 Einladungslink für Mitspieler</span><button class="btn small" data-act="share">Teilen</button></div>
        <div class="row"><span>📱 Dieses Handy abmelden</span><button class="btn small" data-act="leave">Abmelden</button></div>`
      : '<div class="row"><span>📴 Nur auf diesem Gerät</span><button class="btn small" data-act="leave">Online spielen</button></div>'}
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
  const nameField = `<input id="setup-name" class="field" maxlength="20" placeholder="Dein Name" autocomplete="nickname">`;
  if (setupStep === 'invite') {
    return `
      <section class="card setup">
        <div class="setup-icon">🎉</div>
        <h2>Dein Dorf steht!</h2>
        <p>Schick jetzt deinem Mitspieler diesen Link. Wer ihn öffnet, bekommt das zweite Dorf in eurer Welt.</p>
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
        <h2>Einladung nach Muskelburg</h2>
        <p>Wie heißt du, und welches Dorf übernimmst du?</p>
        ${nameField}
        ${['a', 'b'].map(pid => {
          const taken = players[pid] && players[pid].updatedAt;
          return `<button class="btn ${taken ? '' : 'primary'}" data-act="join" data-arg="${pid}">
            ${taken ? `Ich bin ${esc(players[pid].name)} (anderes Handy)` : `Neues Dorf übernehmen`}</button>`;
        }).join('')}
        <p class="hint">„Anderes Handy“ nur wählen, wenn du schon mitspielst und das Gerät wechselst.</p>
      </section>`;
  }
  return `
    <section class="card setup">
      <div class="setup-icon">🏰</div>
      <h2>Willkommen in Muskelburg</h2>
      <p>Jeder Milon-Durchgang lässt dein Dorf wachsen. Starte eine neue Welt und lade deinen Trainingspartner ein.</p>
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

const VIEWS = { training: viewTraining, dorf: viewDorf, karte: viewKarte, rang: viewRang, profil: viewProfil };

function seasonBanner() {
  const w = state.season.winner;
  if (!w) return '';
  return `
    <section class="card season-over">
      <div class="goal-head">
        <span class="big-icon">🏆</span>
        <div class="bld-title"><b>Saison ${state.season.no} ist vorbei!</b><small>${esc(w.name)} ${esc(w.how)}.</small></div>
      </div>
      <button class="btn primary" data-act="newSeason">Neue Saison starten</button>
    </section>`;
}

let lastTab = null;
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
  // Kartenausschnitt und eingegebene Truppen beim Neuzeichnen behalten
  const wrap = document.getElementById('map-wrap');
  const scroll = wrap && lastTab === tab ? [wrap.scrollLeft, wrap.scrollTop] : null;
  const box = document.querySelector('.attack');
  const inputs = {};
  if (box) for (const el of box.querySelectorAll('input')) inputs[el.id] = el.type === 'checkbox' ? el.checked : el.value;
  const oldTarget = box && box.dataset.target;

  document.getElementById('view').innerHTML = seasonBanner() + VIEWS[tab]();

  const newWrap = document.getElementById('map-wrap');
  if (newWrap) {
    if (scroll) [newWrap.scrollLeft, newWrap.scrollTop] = scroll;
    else { // auf das eigene Dorf zentrieren
      const [x, y] = posOf(state.current);
      newWrap.scrollLeft = x * 28 + 14 - newWrap.clientWidth / 2;
      newWrap.scrollTop = y * 28 + 14 - newWrap.clientHeight / 2;
    }
  }
  const newBox = document.querySelector('.attack');
  if (newBox && newBox.dataset.target === oldTarget) {
    for (const [id, val] of Object.entries(inputs)) {
      const el = document.getElementById(id);
      if (el) el.type === 'checkbox' ? (el.checked = val) : (el.value = val);
    }
  }
  lastTab = tab;
  updateAttackPreview();
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

// Tageswechsel berücksichtigen, wenn die App wieder geöffnet wird
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
document.addEventListener('input', e => { if (e.target.closest('.attack')) updateAttackPreview(); });

// Countdowns (Truppen, Baustelle) jede Sekunde aktualisieren
setInterval(() => {
  if (resolveAll()) { render(); return; }
  const now = Date.now();
  for (const el of document.querySelectorAll('[data-eta]')) el.textContent = fmtDur(Number(el.dataset.eta) - now);
  for (const el of document.querySelectorAll('[data-prog]')) {
    const [s, e] = el.dataset.prog.split(',').map(Number);
    el.style.width = Math.min(100, (now - s) / (e - s) * 100) + '%';
  }
}, 1000);

render();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
