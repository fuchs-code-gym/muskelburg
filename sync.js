// Verbindung zur Online-Datenbank (Firebase Realtime Database).
// Aufbau:  g/<Spiel-ID>/meta            gemeinsame Werte (Saison, Ruinen, Teamziel)
//          g/<Spiel-ID>/players/<a|b>   je ein Dorf – schreibt nur das Handy dieses Spielers
//          g/<Spiel-ID>/events/<a|b>    Nachrichten an ein Dorf (z. B. „du wurdest angegriffen“)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getDatabase, ref, onValue, set, update, push, remove, get, onChildAdded,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

const firebaseConfig = {
  apiKey: 'AIzaSyC3PEtwB2Jj4tjlXrOufiot8HvZvjIPF9Q',
  authDomain: 'muskelburg.firebaseapp.com',
  databaseURL: 'https://muskelburg-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'muskelburg',
  storageBucket: 'muskelburg.firebasestorage.app',
  messagingSenderId: '92065015390',
  appId: '1:92065015390:web:3e1638713d866dd40436cf',
};

// App Check: nur unsere App darf die Datenbank nutzen (Prüfung über Google reCAPTCHA v3).
// Öffentlicher Website-Schlüssel – der geheime Schlüssel liegt nur in der Firebase-Konsole.
const RECAPTCHA_SITE_KEY = '';

const app = initializeApp(firebaseConfig);
if (RECAPTCHA_SITE_KEY) {
  // beim Entwickeln am PC: Debug-Token statt reCAPTCHA (erscheint einmalig in der Konsole)
  if (['localhost', '127.0.0.1'].includes(location.hostname)) self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  const { initializeAppCheck, ReCaptchaV3Provider } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js');
  initializeAppCheck(app, { provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY), isTokenAutoRefreshEnabled: true });
}
const db = getDatabase(app);
const path = (game, ...parts) => ref(db, ['g', game, ...parts].join('/'));

window.MB_SYNC = {
  async createGame(game, meta) {
    await set(path(game, 'meta'), meta);
  },

  async getGame(game) {
    const snap = await get(path(game));
    return snap.val();
  },

  setPlayer(game, pid, data) {
    set(path(game, 'players', pid), data).catch(e => console.warn('Speichern fehlgeschlagen', e));
  },

  updateMeta(game, patch) {
    update(path(game, 'meta'), patch).catch(e => console.warn('Speichern fehlgeschlagen', e));
  },

  sendEvent(game, pid, ev) {
    push(path(game, 'events', pid), ev).catch(e => console.warn('Senden fehlgeschlagen', e));
  },

  removeEvent(game, pid, key) {
    remove(path(game, 'events', pid, key));
  },

  // ganzes Spiel endgültig löschen (für alle Mitspieler)
  removeGame(game) {
    return remove(path(game));
  },

  // Sicherung: eigener Pfad neben dem Spiel – bleibt erhalten, wenn das Spiel gelöscht wird
  saveBackup(game, slot, data) {
    return set(ref(db, ['g', game + '-sicherung', slot].join('/')), data);
  },
  async getBackups(game) {
    const snap = await get(ref(db, ['g', game + '-sicherung'].join('/')));
    return snap.val();
  },
  async restoreGame(game, meta, players) {
    await set(path(game, 'meta'), meta);
    for (const [pid, data] of Object.entries(players || {})) await set(path(game, 'players', pid), data);
  },

  watch(game, me, h) {
    onValue(ref(db, '.info/connected'), s => h.connection(!!s.val()));
    onValue(path(game, 'meta'), s => h.meta(s.val()));
    for (const pid of ['a', 'b', 'c', 'd']) {
      let first = true;
      onValue(path(game, 'players', pid), s => { h.player(pid, s.val(), first); first = false; });
    }
    onChildAdded(path(game, 'events', me), s => h.event(s.key, s.val()));
  },
};

window.dispatchEvent(new Event('mb-sync-ready'));
