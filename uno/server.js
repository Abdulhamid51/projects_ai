const http = require('http'), fs = require('fs'), path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const crypto = require('crypto');
const DATA = process.env.DATA_FILE || path.join(__dirname, 'data', 'users.json');
let db = { secret: crypto.randomBytes(32).toString('hex'), users: {} };
try { db = JSON.parse(fs.readFileSync(DATA)); } catch (e) {}
const save = () => { fs.mkdirSync(path.dirname(DATA), { recursive: true }); fs.writeFileSync(DATA, JSON.stringify(db)); };
const mac = b => crypto.createHmac('sha256', db.secret).update(b).digest('hex');
const same = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const sign = k => { const b = k + '.' + (Date.now() + 30 * 864e5); return b + '.' + mac(b); };
const verify = t => { const [k, e, h] = String(t).split('.'); return h && +e > Date.now() && same(h, mac(k + '.' + e)) ? k : null; };
const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 32).toString('hex');
const hits = new Map();
const limited = ip => { const n = (hits.get(ip) || 0) + 1; hits.set(ip, n); return n > 20; };
setInterval(() => hits.clear(), 60000);

function api(req, res) {
  let b = '';
  req.on('data', d => { b += d; if (b.length > 4096) req.destroy(); });
  req.on('end', () => {
    const out = (c, o) => { res.writeHead(c, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
    let m; try { m = JSON.parse(b); } catch (e) { return out(400, { err: "Noto'g'ri so'rov" }); }
    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress).split(',')[0];
    if (limited(ip)) return out(429, { err: "Juda ko'p urinish, 1 daqiqa kuting" });
    if (req.url === '/api/tg') {
      const u = tgBot.verifyInit(m.initData);
      if (!u) return out(401, { err: "Telegram orqali kirib bo'lmadi" });
      const k = 'tg:' + u.id, name = ([u.first_name, u.last_name].filter(Boolean).join(' ').replace(/[<>&"'`]/g, '').trim().slice(0, 20)) || 'Player';
      if (!db.users[k] || db.users[k].name !== name) { db.users[k] = { name, tg: u.id, un: u.username || '' }; save(); }
      return out(200, { token: sign(k), name });
    }
    const name = String(m.username || '').trim(), pw = String(m.password || ''), k = name.toLowerCase();
    if (!/^[A-Za-z0-9_]{3,14}$/.test(name)) return out(400, { err: "Nom 3-14 ta harf/raqam/_ bo'lsin" });
    if (pw.length < 6 || pw.length > 100) return out(400, { err: "Parol kamida 6 ta belgi" });
    if (req.url === '/api/register') {
      if (db.users[k]) return out(409, { err: 'Bu nom band' });
      const salt = crypto.randomBytes(16).toString('hex');
      db.users[k] = { name, salt, hash: hashPw(pw, salt) }; save();
      return out(200, { token: sign(k), name });
    }
    const u = db.users[k];
    if (!u || !same(hashPw(pw, u.salt), u.hash)) return out(401, { err: 'Login yoki parol xato' });
    out(200, { token: sign(k), name: u.name });
  });
}
const COLORS = ['red', 'yellow', 'green', 'blue'];
const rooms = new Map();
let uid = 0;
const tgBot = require('./telegram')({ rooms, mac, same });
const DEF = { hand: 7, stack: false, until: false, strict: false, timer: 0 };
const cleanCfg = (s, o) => ({
  hand: [5, 7, 10].includes(+s.hand) ? +s.hand : o.hand, stack: !!s.stack, until: !!s.until, strict: !!s.strict,
  timer: [0, 15, 30, 60].includes(+s.timer) ? +s.timer : o.timer,
});

const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
function makeDeck() {
  const d = [], add = (c, v) => d.push({ id: ++uid, c, v });
  for (const c of COLORS) {
    add(c, '0');
    for (let i = 0; i < 2; i++) { for (let n = 1; n <= 9; n++) add(c, String(n)); ['skip', 'rev', '+2'].forEach(v => add(c, v)); }
  }
  for (let i = 0; i < 4; i++) { add(null, 'wild'); add(null, '+4'); }
  return shuffle(d);
}

const top = r => r.discard[r.discard.length - 1];
const ok = (r, c, p) => {
  if (r.pen) return c.v === r.pen.v; // to'plash: faqat shu turdagi karta
  if (c.v === '+4' && r.cfg.strict && p && p.hand.some(h => h.c === r.color)) return false;
  return !c.c || c.c === r.color || c.v === top(r).v;
};
const nextIdx = (r, k = 1) => { const n = r.players.length; return (((r.turn + r.dir * k) % n) + n) % n; };
const log = (r, m) => { r.log.push(m); if (r.log.length > 8) r.log.shift(); };

function draw(r, n) {
  const out = [];
  while (n-- > 0) {
    if (!r.deck.length) { const t = r.discard.pop(); r.deck = shuffle(r.discard); r.discard = [t]; }
    if (!r.deck.length) break;
    out.push(r.deck.pop());
  }
  return out;
}

// o'yinchi uzilgan bo'lsa navbatini o'tkazib yuboramiz
function settle(r) {
  if (r.state !== 'play') return;
  for (let i = 0; i < r.players.length && !r.players[r.turn].ws; i++) r.turn = nextIdx(r);
}

const persist = r => {
  db.sched = db.sched || {};
  if (r.at && r.state === 'lobby') db.sched[r.code] = { code: r.code, host: r.host, at: r.at, tz: r.tz, group: r.group, gmsg: r.gmsg, cfg: r.cfg, notified: r.notified, players: r.players.map(p => ({ id: p.id, name: p.name })) };
  else if (db.sched[r.code]) delete db.sched[r.code];
  else return;
  save();
};
function dropRoom(r) { clearTimeout(r.tm); clearTimeout(r.st); rooms.delete(r.code); r.state = 'gone'; persist(r); }
function deleteRoom(r, by) {
  r.players.forEach(q => { if (q.ws) { send(q.ws, { t: 'deleted', code: r.code }); q.ws.room = q.ws.player = null; } });
  if (by && !r.players.some(q => q.ws === by)) send(by, { t: 'deleted', code: r.code });
  tgBot.closeRoom(r); dropRoom(r);
}
function scheduleRoom(r) {
  clearTimeout(r.st);
  if (!r.at || r.notified) return;
  r.st = setTimeout(() => fireSchedule(r), Math.min(Math.max(0, r.at - Date.now()), 2 ** 31 - 1));
}
function fireSchedule(r) {
  if (rooms.get(r.code) !== r || r.state !== 'lobby' || r.notified) return;
  if (r.at - Date.now() > 1000) return scheduleRoom(r);
  r.notified = true;
  tgBot.notifyStart(r);
  r.players.forEach(p => send(p.ws, { t: 'toast', msg: "⏰ O'yin vaqti keldi!" }));
  sync(r);
}
const mySched = id => [...rooms.values()].filter(r => r.at && r.state === 'lobby' && r.players.some(p => p.id === id))
  .map(r => ({ code: r.code, at: r.at, n: r.players.length, host: r.players.find(p => p.id === r.host).name, mine: r.host === id }))
  .sort((a, b) => a.at - b.at);
function restore() {
  for (const d of Object.values(db.sched || {})) {
    if (rooms.has(d.code)) continue;
    if (d.at + 6 * 3600e3 < Date.now()) { delete db.sched[d.code]; continue; }
    const r = { ...d, players: d.players.map(p => ({ ...p, hand: [], ws: null })), state: 'lobby', deck: [], discard: [], turn: 0, dir: 1, log: [], evs: [], seen: Date.now() };
    rooms.set(r.code, r); scheduleRoom(r);
  }
}

function startGame(r) {
  clearTimeout(r.st);
  r.deck = makeDeck(); r.discard = []; r.dir = 1; r.drawn = null; r.winner = null; r.log = [];
  r.pen = null; r.players.forEach(p => (p.hand = draw(r, r.cfg.hand)));
  let c;
  while ((c = r.deck.pop()) && !/^\d$/.test(c.v)) r.deck.unshift(c);
  r.discard.push(c); r.color = c.c;
  r.turn = Math.random() * r.players.length | 0; r.state = 'play'; r.evs = [{ t: 'deal' }];
  settle(r);
  log(r, "O'yin boshlandi!");
}

function play(r, p, cid, color) {
  if (r.state !== 'play' || r.players[r.turn] !== p) return 'Sizning navbatingiz emas';
  const card = p.hand.find(c => c.id === cid);
  if (!card) return 'Karta topilmadi';
  if (r.drawn && r.drawn !== cid) return "Faqat olingan kartani tashlash mumkin";
  if (!ok(r, card, p)) return "Bu kartani tashlab bo'lmaydi";
  if (!card.c && !COLORS.includes(color)) return 'Rang tanlang';
  p.hand = p.hand.filter(c => c !== card);
  r.discard.push(card); r.color = card.c || color; r.drawn = null;
  r.evs.push({ t: 'play', by: p.id, card });
  if (!p.hand.length) { r.state = 'over'; r.winner = p.name; log(r, `${p.name} yutdi! 🎉`); return; }
  let step = 1;
  const victim = r.players[nextIdx(r)];
  if (card.v === 'rev') { if (r.players.length === 2) step = 2; else r.dir *= -1; }
  else if (card.v === 'skip') step = 2;
  else if (card.v === '+2' || card.v === '+4') {
    const n = card.v === '+2' ? 2 : 4;
    if (r.cfg.stack) { r.pen = { v: card.v, n: (r.pen ? r.pen.n : 0) + n }; log(r, `${p.name}: +${r.pen.n} kutmoqda`); }
    else { victim.hand.push(...draw(r, n)); step = 2; r.evs.push({ t: 'draw', by: victim.id, n }); log(r, `${victim.name} ${n} ta karta oldi`); }
  }
  log(r, `${p.name}: ${card.v}${card.c ? '' : ' → ' + r.color}`);
  if (p.hand.length === 1) { log(r, `${p.name}: UNO! 🔥`); r.evs.push({ t: 'uno', by: p.id, name: p.name }); }
  r.turn = nextIdx(r, step);
  settle(r);
}

function drawAction(r, p) {
  if (r.pen) {
    const n = r.pen.n; p.hand.push(...draw(r, n)); r.pen = null;
    r.evs.push({ t: 'draw', by: p.id, n }); log(r, `${p.name} ${n} ta karta oldi`);
    r.turn = nextIdx(r); return settle(r);
  }
  let got = 0, c;
  do { c = draw(r, 1)[0]; if (c) { p.hand.push(c); got++; } } while (c && r.cfg.until && !ok(r, c, p));
  if (got) { r.evs.push({ t: 'draw', by: p.id, n: got }); log(r, `${p.name} karta oldi`); }
  if (c && ok(r, c, p)) r.drawn = c.id;
  else { r.turn = nextIdx(r); settle(r); }
}
function onTimeout(r) {
  if (r.state !== 'play') return;
  const p = r.players[r.turn];
  log(r, `${p.name}: vaqt tugadi ⏱`);
  if (!r.drawn) drawAction(r, p);
  if (r.drawn) { r.drawn = null; r.turn = nextIdx(r); settle(r); }
  sync(r);
}

function view(r, p) {
  const cur = r.players[r.turn];
  const mine = r.state === 'play' && cur === p;
  return {
    t: 'state', code: r.code, state: r.state, you: p.id, host: r.host, winner: r.winner,
    players: r.players.map(q => ({ id: q.id, name: q.name, n: q.hand.length, on: !!q.ws })),
    turn: r.state === 'play' ? cur.id : null, dir: r.dir, color: r.color, top: r.discard[r.discard.length - 1], deck: r.deck.length,
    hand: p.hand.map(c => ({ ...c, ok: mine && ok(r, c, p) && (!r.drawn || r.drawn === c.id) })),
    drawn: mine ? r.drawn : null, log: r.log, ev: r.evs,
    cfg: r.cfg, at: r.at, pen: r.pen, left: r.deadline ? Math.max(0, Math.ceil((r.deadline - Date.now()) / 1000)) : 0,
  };
}
const send = (ws, m) => ws && ws.readyState === 1 && ws.send(JSON.stringify(m));
const sync = r => {
  const sig = `${r.state}|${r.turn}|${r.discard.length}|${r.drawn}|${r.players.length}`;
  if (sig !== r.tsig) {
    r.tsig = sig; clearTimeout(r.tm); r.deadline = 0;
    if (r.state === 'play' && r.cfg.timer) { r.deadline = Date.now() + r.cfg.timer * 1000; r.tm = setTimeout(() => onTimeout(r), r.cfg.timer * 1000); }
  }
  r.players.forEach(p => send(p.ws, view(r, p))); r.evs = [];
  persist(r);
};

function genCode() { let c; do c = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.random() * 24 | 0]).join(''); while (rooms.has(c)); return c; }
const newPlayer = ws => ({ id: ws.user, name: ws.uname, hand: [], ws });

function handle(ws, m) {
  if (m.t === 'auth') {
    const k = verify(m.token), u = k && db.users[k];
    if (!u) return send(ws, { t: 'err', msg: 'Qaytadan kiring', auth: true });
    ws.user = k; ws.uname = u.name; send(ws, { t: 'authed', bot: tgBot.name }); return send(ws, { t: 'sched', list: mySched(k) });
  }
  if (!ws.user) return;
  if (m.t === 'mine') return send(ws, { t: 'sched', list: mySched(ws.user) });
  if (m.t === 'detach') return leave(ws, false);
  if (m.t === 'delete') {
    const dr = rooms.get(String(m.code || '').toUpperCase()) || ws.room;
    if (!dr || dr.host !== ws.user || dr.state === 'play') return send(ws, { t: 'err', msg: "Xonani o'chirib bo'lmaydi" });
    return deleteRoom(dr, ws);
  }
  let r = ws.room, p = ws.player;
  if ((m.t === 'create' || m.t === 'join') && ws.room) { leave(ws, !(ws.room.at && ws.room.state === 'lobby')); r = p = null; }
  if (m.t === 'create') {
    let at = 0;
    if (m.at) { at = +m.at; if (!(at > Date.now() + 5000 && at < Date.now() + 14 * 864e5)) return send(ws, { t: 'err', msg: "Vaqt noto'g'ri (14 kungacha)" }); }
    p = newPlayer(ws);
    r = { code: genCode(), players: [p], host: p.id, state: 'lobby', deck: [], discard: [], turn: 0, dir: 1, log: [], evs: [], cfg: { ...DEF }, seen: Date.now() };
    rooms.set(r.code, r);
    r.at = at; r.tz = Math.max(-720, Math.min(840, +m.tz || 0)); r.notified = false;
    if (ws.user.startsWith('tg:')) {
      r.group = m.group && m.sig === tgBot.groupSig(String(m.group)) ? String(m.group) : null;
      tgBot.notifyRoom(r, ws.user.slice(3), r.group);
    }
    scheduleRoom(r);
  } else if (m.t === 'join' || m.t === 'rejoin') {
    r = rooms.get(String(m.code || '').toUpperCase());
    if (!r) return send(ws, { t: 'err', msg: 'Xona topilmadi', fatal: m.t === 'rejoin' });
    p = r.players.find(q => q.id === ws.user);
    if (p) {
      const old = p.ws; p.ws = ws;
      if (old && old !== ws) { old.room = old.player = null; send(old, { t: 'kicked' }); old.close(); }
    } else if (m.t === 'rejoin') return send(ws, { t: 'err', msg: 'Siz bu xonada emassiz', fatal: true });
    else {
      if (r.state !== 'lobby') return send(ws, { t: 'err', msg: "O'yin boshlangan" });
      if (r.players.length >= 8) return send(ws, { t: 'err', msg: "Xona to'la" });
      p = newPlayer(ws); r.players.push(p);
    }
  } else if (!r || !p) return;
  else if (m.t === 'settings') { if (r.host !== p.id || r.state === 'play') return; r.cfg = cleanCfg(m.s || {}, r.cfg); }
  else if (m.t === 'start') { if (r.host !== p.id || r.players.length < 2 || r.state === 'play') return; startGame(r); }
  else if (m.t === 'play') { const e = play(r, p, m.card, m.color); if (e) return send(ws, { t: 'err', msg: e }); }
  else if (m.t === 'draw') {
    if (r.state !== 'play' || r.players[r.turn] !== p || r.drawn) return;
    drawAction(r, p);
  } else if (m.t === 'pass') {
    if (r.state !== 'play' || r.players[r.turn] !== p || !r.drawn) return;
    r.drawn = null; r.turn = nextIdx(r); settle(r);
  } else if (m.t === 'leave') { leave(ws, true); return; }
  ws.room = r; ws.player = p; r.seen = Date.now();
  if (m.t === 'create' || m.t === 'join') send(ws, { t: 'joined', id: p.id, code: r.code });
  sync(r);
}

function leave(ws, hard) {
  const { room: r, player: p } = ws;
  if (!r || !p) return;
  if (p.ws === ws) p.ws = null;
  if (hard || (r.state === 'lobby' && !r.at)) {
    r.players = r.players.filter(q => q !== p);
    if (r.host === p.id && r.players[0]) r.host = r.players[0].id;
    if (r.state === 'play' && r.players.length < 2) r.state = 'over', r.winner = r.players[0] && r.players[0].name;
    r.turn %= Math.max(r.players.length, 1);
  }
  ws.room = ws.player = null;
  if (!r.players.length) return dropRoom(r);
  settle(r); sync(r);
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') return res.end('ok');
  if (req.method === 'POST' && req.url === '/tg') {
    let b = ''; req.on('data', d => { b += d; if (b.length > 1e5) req.destroy(); });
    return req.on('end', () => {
      res.end('ok');
      if (req.headers['x-telegram-bot-api-secret-token'] !== tgBot.secret()) return;
      try { tgBot.onUpdate(JSON.parse(b)).catch(console.error); } catch (e) {}
    });
  }
  if (req.method === 'POST' && req.url.startsWith('/api/')) return api(req, res);
  fs.readFile(path.join(__dirname, 'public', 'index.html'), (e, d) => {
    res.writeHead(e ? 500 : 200, { 'content-type': 'text/html; charset=utf-8' }); res.end(d);
  });
});
const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', ws => {
  ws.alive = true; ws.on('pong', () => (ws.alive = true));
  ws.on('message', d => { try { handle(ws, JSON.parse(d)); } catch (e) { console.error(e); } });
  ws.on('close', () => leave(ws, false));
});
setInterval(() => {
  wss.clients.forEach(ws => { if (!ws.alive) return ws.terminate(); ws.alive = false; ws.ping(); });
  for (const [c, r] of rooms) if (Date.now() - r.seen > 3600e3 && r.players.every(p => !p.ws) && !(r.at && r.state === 'lobby' && Date.now() < r.at + 6 * 3600e3)) dropRoom(r);
}, 30000);

restore();
if (require.main === module) server.listen(PORT, () => { console.log('UNO http://localhost:' + PORT); tgBot.start(); });
module.exports = { server, tgBot, rooms, restore };
