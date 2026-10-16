// Bot'lar bilan to'liq o'yin simulyatsiyasi
const WebSocket = require('ws'), { server } = require('./server');
server.listen(0, async () => {
  const port = server.address().port, mk = () => new Promise(r => { const w = new WebSocket(`ws://localhost:${port}/ws`); w.on('open', () => r(w)); });
  const N = 4, ws = await Promise.all(Array.from({ length: N }, mk)), st = new Array(N);
  let code, moves = 0, done = false;
  const ok = (s, c) => !c.c || c.c === s.color || c.v === s.top.v;
  ws.forEach((w, i) => w.on('message', d => {
    const m = JSON.parse(d); if (m.t === 'err') { console.error('ERR', m.msg); process.exit(1); }
    if (m.t === 'joined') { code = m.code; if (i === 0) for (let k = 1; k < N; k++) ws[k].send(JSON.stringify({ t: 'join', code, name: 'B' + k })); }
    if (m.t !== 'state') return; st[i] = m;
    if (m.state === 'lobby' && i === 0 && m.players.length === N) w.send(JSON.stringify({ t: 'start' }));
    if (m.state === 'over' && !done) { done = true; console.log('OK: g\'olib', m.winner, 'yurishlar:', moves); process.exit(0); }
    if (m.state === 'play' && m.turn === m.you) {
      if (++moves > 5000) { console.error('too many moves'); process.exit(1); }
      const c = m.hand.find(c => c.ok);
      w.send(JSON.stringify(c ? { t: 'play', card: c.id, color: 'red' } : m.drawn ? { t: 'pass' } : { t: 'draw' }));
    }
  }));
  ws[0].send(JSON.stringify({ t: 'create', name: 'B0' }));
  setTimeout(() => { console.error('timeout'); process.exit(1); }, 20000);
});
